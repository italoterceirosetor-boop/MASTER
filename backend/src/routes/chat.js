// Rotas de chat - envio de mensagens com IA
import express from 'express';
import { pool } from '../db/pool.js';
import { authMiddleware } from '../middleware/auth.js';
import { chatWithAI } from '../services/chatService.js';

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
      // Verifica se a conversa é do usuário
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

    // Busca histórico da conversa
    const history = await pool.query(
      'SELECT role, content FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
      [convId]
    );

    const messages = history.rows.map(r => ({ role: r.role, content: r.content }));

    // Chama IA
    const aiResponse = await chatWithAI(messages, message);

    // Salva resposta da IA
    await pool.query(
      'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)',
      [convId, 'assistant', aiResponse]
    );

    // Atualiza timestamp da conversa
    await pool.query('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [convId]);

    res.json({
      conversationId: convId,
      message: aiResponse
    });
  } catch (err) {
    console.error('Erro no chat:', err);
    res.status(500).json({ error: 'Erro ao processar mensagem', details: err.message });
  }
});

export default router;
