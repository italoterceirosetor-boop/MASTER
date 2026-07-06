// Rotas de conversas - histórico
import express from 'express';
import { pool } from '../db/pool.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Listar todas as conversas do usuário
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const result = await pool.query(
      'SELECT id, title, created_at, updated_at FROM conversations WHERE user_id = $1 ORDER BY updated_at DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao listar conversas:', err);
    res.status(500).json({ error: 'Erro ao buscar conversas' });
  }
});

// Buscar mensagens de uma conversa específica
router.get('/:id/messages', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const conversationId = req.params.id;

    // Verifica ownership
    const conv = await pool.query(
      'SELECT id FROM conversations WHERE id = $1 AND user_id = $2',
      [conversationId, userId]
    );
    if (conv.rows.length === 0) {
      return res.status(403).json({ error: 'Conversa não encontrada' });
    }

    const messages = await pool.query(
      'SELECT role, content, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
      [conversationId]
    );

    res.json(messages.rows);
  } catch (err) {
    console.error('Erro ao buscar mensagens:', err);
    res.status(500).json({ error: 'Erro ao buscar mensagens' });
  }
});

// Deletar conversa
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const conversationId = req.params.id;

    const result = await pool.query(
      'DELETE FROM conversations WHERE id = $1 AND user_id = $2',
      [conversationId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Conversa não encontrada' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao deletar conversa:', err);
    res.status(500).json({ error: 'Erro ao deletar conversa' });
  }
});

export default router;
