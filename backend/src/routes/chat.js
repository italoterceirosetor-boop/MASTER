// Rotas de chat - envio de mensagens com IA
import express from 'express';
import { pool } from '../db/pool.js';
import { authMiddleware } from '../middleware/auth.js';
import { chatWithAI } from '../services/chatService.js';
import { parseGenerationMarkers, generatePDF, generateDOCX, generateXLSX, generateTXT } from '../services/generatorService.js';

const router = express.Router();

// Enviar mensagem e receber resposta
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { conversationId, message } = req.body;
    const userId = req.userId;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Mensagem vazia' });
    }

    // Busca ou cria conversa
    let convId = conversationId;
    if (!convId) {
      const newConv = await pool.query(
        'INSERT INTO conversations (user_id, title) VALUES ($1, $2) RETURNING id',
        [userId, message.substring(0, 80)]
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

    // Salva mensagem do usuário
    await pool.query(
      'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)',
      [convId, 'user', message]
    );

    // Busca histórico
    const history = await pool.query(
      'SELECT role, content FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
      [convId]
    );

    const messages = history.rows.map(r => ({ role: r.role, content: r.content }));

    // Chama IA
    const aiResponse = await chatWithAI(messages, message);

    // Detecta marcadores de geração de arquivos
    const { cleanText, markers } = parseGenerationMarkers(aiResponse);

    // Gera os arquivos (se houver)
    const generatedFiles = [];
    for (const marker of markers) {
      try {
        let buffer;
        const filename = `${marker.filename}.${marker.type}`;
        let mimeType;

        if (marker.type === 'pdf') {
          buffer = await generatePDF({ title: marker.filename, content: marker.content });
          mimeType = 'application/pdf';
        } else if (marker.type === 'docx') {
          buffer = await generateDOCX({ title: marker.filename, content: marker.content });
          mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        } else if (marker.type === 'xlsx') {
          buffer = await generateXLSX({ title: marker.filename, content: marker.content });
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        } else if (marker.type === 'txt') {
          buffer = generateTXT({ title: marker.filename, content: marker.content });
          mimeType = 'text/plain';
        }

        if (buffer) {
          // Salva no banco
          const fileResult = await pool.query(
            `INSERT INTO generated_files (conversation_id, filename, mime_type, content)
             VALUES ($1, $2, $3, $4) RETURNING id`,
            [convId, filename, mimeType, buffer]
          );

          generatedFiles.push({
            id: fileResult.rows[0].id,
            filename,
            mimeType,
            size: buffer.length
          });
        }
      } catch (err) {
        console.error('Erro ao gerar arquivo:', err);
      }
    }

    // Salva resposta (sem os marcadores)
    await pool.query(
      'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)',
      [convId, 'assistant', cleanText]
    );

    await pool.query('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [convId]);

    res.json({
      conversationId: convId,
      message: cleanText,
      files: generatedFiles
    });
  } catch (err) {
    console.error('Erro no chat:', err);
    res.status(500).json({ error: 'Erro ao processar mensagem', details: err.message });
  }
});

export default router;
