// Rota de upload de arquivos
import express from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth.js';
import { extractFileContent, validateFile, formatFilesForAI } from '../services/fileService.js';
import { pool } from '../db/pool.js';
import { chatWithAI } from '../services/chatService.js';
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

export default router;
