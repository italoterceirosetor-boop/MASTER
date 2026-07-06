// Inicialização das tabelas do banco
import { pool } from './pool.js';

export async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Tabela de usuários
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de conversas
    await client.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(500) DEFAULT 'Nova conversa',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de mensagens
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de arquivos gerados pela IA
    await client.query(`
      CREATE TABLE IF NOT EXISTS generated_files (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
        filename VARCHAR(500) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        content BYTEA NOT NULL,
        size INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Índices pra performance
    await client.query(`CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id, updated_at DESC)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at)`);

    await client.query('COMMIT');
    console.log('✅ Banco de dados inicializado');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
