// Rota de upload de arquivos
import express from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth.js';
import { extractFileContent, validateFile, formatFilesForAI } from '../services/fileService.js';
import { pool } from '../db/pool.js';
import { chatWithAI } from '../services/chatService.js';
import { parseGenerationMarkers, generatePDF, generateDOCX, generateXLSX, generateTXT } from '../services/generatorService.js';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();

// Configuração do multer (upload em memória + em disco temporário)
const upload = multer({
  dest: '/tmp/uploads/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Upload simples (retorna conteúdo extraído, sem salvar no chat)
router.post('/', authMiddleware, upload.array('files', 5), async (req, res) => {
  const tempFiles = [];

  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const processedFiles = [];

    for (const file of req.files) {
      validateFile(file);
      tempFiles.push(file.path);

      const content = await extractFileContent(file.path, file.mimetype, file.originalname);
      processedFiles.push(content);
    }

    res.json({
      files: processedFiles.map(f => ({
        name: f.name,
        type: f.type,
        textLength: f.text?.length || 0,
        preview: f.text?.substring(0, 500) || ''
      })),
      context: formatFilesForAI(processedFiles)
    });
  } catch (err) {
    console.error('Erro no upload:', err);
    res.status(400).json({ error: err.message });
  } finally {
    // Limpa arquivos temporários
    for (const filePath of tempFiles) {
      try {
        await fs.unlink(filePath);
      } catch (e) {
        // ignora
      }
    }
  }
});

// Chat com arquivos anexados (envia mensagem + analisa arquivos)
router.post('/chat', authMiddleware, upload.array('files', 5), async (req, res) => {
  const tempFiles = [];

  try {
    const { conversationId, message } = req.body;
    const userId = req.userId;

    if (!message && (!req.files || req.files.length === 0)) {
      return res.status(400).json({ error: 'Mensagem ou arquivos são obrigatórios' });
    }

    // Processa arquivos
    const processedFiles = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        validateFile(file);
        tempFiles.push(file.path);
        const content = await extractFileContent(file.path, file.mimetype, file.originalname);
        processedFiles.push(content);
      }
    }

    // Busca ou cria conversa
    let convId = conversationId;
    if (!convId) {
      const newConv = await pool.query(
        'INSERT INTO conversations (user_id, title) VALUES ($1, $2) RETURNING id',
        [userId, (message || 'Arquivo anexado').substring(0, 80)]
      );
      convId = newConv.rows[0].id;
    } else {
      const check = await pool.query(
        'SELECT id FROM conversations WHERE id = $1 AND user_id = $2',
        [convId, userId]
      );
      if (check.rows.length === 0) {
        return res.status(403).json({ error: 'Conversa não encontrada' });
      }
    }

    // Monta mensagem completa (incluindo info dos arquivos)
    let fullMessage = message || 'Analise os arquivos anexados.';
    if (processedFiles.length > 0) {
      fullMessage += '\n\n' + formatFilesForAI(processedFiles);
    }

    // Salva mensagem do usuário
    await pool.query(
      'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)',
      [convId, 'user', fullMessage]
    );

    // Busca histórico
    const history = await pool.query(
      'SELECT role, content FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
      [convId]
    );

    const messages = history.rows.map(r => ({ role: r.role, content: r.content }));

    // Chama IA
    const aiResponse = await chatWithAI(messages, fullMessage);

    // Salva resposta
    await pool.query(
      'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)',
      [convId, 'assistant', aiResponse]
    );

    await pool.query('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [convId]);

    res.json({
      conversationId: convId,
      message: aiResponse,
      filesProcessed: processedFiles.map(f => f.name)
    });
  } catch (err) {
    console.error('Erro no chat com arquivos:', err);
    res.status(500).json({ error: err.message });
  } finally {
    for (const filePath of tempFiles) {
      try { await fs.unlink(filePath); } catch (e) {}
    }
  }
});

// Regenera arquivo a partir de texto editado
router.post('/regenerate', authMiddleware, async (req, res) => {
  try {
    const { conversationId, text, fileType, filename } = req.body;
    const userId = req.userId;

    if (!text) {
      return res.status(400).json({ error: 'Texto é obrigatório' });
    }

    // Verifica ownership da conversa
    const check = await pool.query(
      'SELECT id FROM conversations WHERE id = $1 AND user_id = $2',
      [conversationId, userId]
    );
    if (check.rows.length === 0) {
      return res.status(403).json({ error: 'Conversa não encontrada' });
    }

    // Detecta tipo se não veio
    const type = fileType || 'pdf';
    const name = filename || `documento-${Date.now()}`;

    let buffer, mimeType;
    if (type === 'pdf') {
      buffer = await generatePDF({ title: name, content: text });
      mimeType = 'application/pdf';
    } else if (type === 'docx') {
      buffer = await generateDOCX({ title: name, content: text });
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else if (type === 'xlsx') {
      buffer = await generateXLSX({ title: name, content: text });
      mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else if (type === 'txt') {
      buffer = generateTXT({ title: name, content: text });
      mimeType = 'text/plain';
    } else {
      return res.status(400).json({ error: 'Tipo de arquivo inválido' });
    }

    // Salva no banco
    const fileResult = await pool.query(
      `INSERT INTO generated_files (conversation_id, filename, mime_type, content, size)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [conversationId, `${name}.${type}`, mimeType, buffer, buffer.length]
    );

    res.json({
      id: fileResult.rows[0].id,
      filename: `${name}.${type}`,
      mimeType,
      size: buffer.length
    });
  } catch (err) {
    console.error('Erro ao regenerar:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;

// Download de arquivo gerado pela IA
router.get('/file/:id', authMiddleware, async (req, res) => {
  try {
    const fileId = req.params.id;
    const userId = req.userId;

    // Busca arquivo e verifica ownership
    const result = await pool.query(
      `SELECT gf.* FROM generated_files gf
       JOIN conversations c ON gf.conversation_id = c.id
       WHERE gf.id = $1 AND c.user_id = $2`,
      [fileId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }

    const file = result.rows[0];

    res.setHeader('Content-Type', file.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.setHeader('Content-Length', file.size);

    // Converte o buffer do banco pra enviar
    res.send(Buffer.from(file.content));
  } catch (err) {
    console.error('Erro no download:', err);
    res.status(500).json({ error: 'Erro ao baixar arquivo' });
  }
});
