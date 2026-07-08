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
