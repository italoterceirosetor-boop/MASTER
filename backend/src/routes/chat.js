// Rotas de chat - envio de mensagens com IA
import express from 'express';
import axios from 'axios';
import { pool } from '../db/pool.js';
import { authMiddleware } from '../middleware/auth.js';
import { chatWithAI } from '../services/chatService.js';
import { parseGenerationMarkers, generateDOCX, generateXLSX, generateTXT, detectTheme, detectOptions } from '../services/generatorService.js';

const router = express.Router();

// URL do serviço Python de PDF (configurado via variável de ambiente)
const PDF_SERVICE_URL = process.env.PDF_SERVICE_URL || 'http://localhost:8080';

// Detecta se usuário pediu arquivo e qual tipo
function detectFileRequest(message) {
  const lower = message.toLowerCase();
  if (/\b(pdf|relat[óo]rio)\b/i.test(lower)) return 'pdf';
  if (/\b(word|docx|documento)\b/i.test(lower)) return 'docx';
  if (/\b(excel|planilha|xlsx|spreadsheet)\b/i.test(lower)) return 'xlsx';
  if (/\b(txt|texto|bloco de notas)\b/i.test(lower)) return 'txt';
  return null;
}

// Gera um nome de arquivo baseado no pedido
function generateFilename(message, type) {
  const stopWords = ['me', 'manda', 'envia', 'gere', 'cria', 'faz', 'um', 'uma', 'sobre', 'do', 'da', 'de', 'o', 'a', 'em', 'para', 'com', 'por', 'que', 'qual'];
  const words = message.toLowerCase().replace(/[^\w\sà-ú]/g, '').split(/\s+/).filter(w => w.length > 3 && !stopWords.includes(w));
  const name = words.slice(0, 4).join('-') || 'documento';
  return `${name}-${Date.now()}`;
}

// Envia pro serviço Python gerar PDF bonito
async function generatePDFViaService(title, content, theme, options) {
  try {
    console.log(`[Master IA] Chamando serviço Python: ${PDF_SERVICE_URL}`);
    const response = await axios.post(
      `${PDF_SERVICE_URL}/generate-pdf`,
      { title, content, theme, options },
      { responseType: 'arraybuffer', timeout: 30000 }
    );
    return Buffer.from(response.data);
  } catch (err) {
    console.error(`[Master IA] Erro no serviço Python:`, err.message);
    return null;
  }
}

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

    // Detecta marcadores de geração
    const { cleanText, markers } = parseGenerationMarkers(aiResponse);
    const fileType = detectFileRequest(message);
    const generatedFiles = [];

    // Função para gerar e salvar arquivo
    async function generateAndSave(type, filename, content) {
      try {
        let buffer, mimeType;
        const fullFilename = `${filename}.${type}`;

        // Detecta tema e opções baseado na mensagem do usuário
        const theme = detectTheme(message);
        const options = detectOptions(message);

        if (type === 'pdf') {
          // USA O SERVIÇO PYTHON (WeasyPrint)
          buffer = await generatePDFViaService(filename, content, theme, options);
          if (!buffer) {
            return res.status(500).json({ error: 'Serviço de PDF indisponível' });
          }
          mimeType = 'application/pdf';
        } else if (type === 'docx') {
          buffer = await generateDOCX({ title: filename, content, theme, options });
          mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        } else if (type === 'xlsx') {
          buffer = await generateXLSX({ title: filename, content });
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        } else if (type === 'txt') {
          buffer = generateTXT({ title: filename, content });
          mimeType = 'text/plain';
        }

        if (buffer) {
          const fileResult = await pool.query(
            `INSERT INTO generated_files (conversation_id, filename, mime_type, content, size)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [convId, fullFilename, mimeType, buffer, buffer.length]
          );

          generatedFiles.push({
            id: fileResult.rows[0].id,
            filename: fullFilename,
            mimeType,
            size: buffer.length
          });
        }
      } catch (err) {
        console.error('Erro ao gerar arquivo:', err);
      }
    }

    // 1. Processa marcadores da IA
    for (const marker of markers) {
      await generateAndSave(marker.type, marker.filename, marker.content);
    }

    // 2. Fallback: detecta pedido do usuário
    if (markers.length === 0 && fileType) {
      const filename = generateFilename(message, fileType);
      await generateAndSave(fileType, filename, cleanText);
    }

    // Salva resposta
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
