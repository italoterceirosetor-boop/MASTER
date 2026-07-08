import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import conversationsRoutes from './routes/conversations.js';
import uploadRoutes from './routes/upload.js';
import { detectTheme, detectOptions } from './services/generatorService.js';
import { initDatabase } from './db/init.js';

dotenv.config();

const app = express();
// Railway passa PORT via env, mas queremos garantir que bate com o configurado
const PORT = process.env.PORT || 3001;
console.log(`🔧 Iniciando na porta ${PORT}`);

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/upload', uploadRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Master IA Backend', timestamp: new Date().toISOString() });
});

// Debug: detecta tema/opções de uma mensagem (sem precisar auth)
app.get('/api/debug/detect', (req, res) => {
  const message = req.query.q || '';
  res.json({
    message,
    theme: detectTheme(message),
    options: detectOptions(message)
  });
});

// Debug: gera um PDF de teste pra verificar se tá funcionando
app.get('/api/debug/test-pdf', async (req, res) => {
  try {
    const { generatePDF } = await import('./services/generatorService.js');
    const buffer = await generatePDF({
      title: 'Teste de PDF',
      content: `# Teste de Renderização

## Subtítulo teste

Este é um parágrafo de teste com **negrito** e *itálico*.

### Lista de teste:

- Item 1
- Item 2
- Item 3

### Tabela teste:

| Coluna A | Coluna B |
|----------|----------|
| Dado 1 | Dado 2 |
| Dado 3 | Dado 4 |

> Citação de teste aqui.

---

Mais texto após o separador.

Final do documento.`,
      theme: 'verde',
      options: { semCapa: true, semCabecalho: true, umaPagina: true }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="teste.pdf"');
    res.send(buffer);
  } catch (err) {
    console.error('Erro ao gerar PDF de teste:', err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// Inicializa banco e sobe servidor
initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Master IA Backend rodando na porta ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Erro ao inicializar banco:', err);
    process.exit(1);
  });
