# Master IA Backend - Railway

Production-ready Node.js backend for the Master IA chat application.

## Setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and fill in values
3. Start: `npm start`

## Environment Variables

- `IACONTA_API_KEY` - API key from iacontaai (starts with sk-)
- `IACONTA_API_URL` - API endpoint (https://api.iacontaai.com.br)
- `IACONTA_MODEL` - Model to use (opus-4.8)
- `BRAVE_API_KEY` - Brave Search API key
- `DATABASE_URL` - PostgreSQL connection string (auto-provided by Railway)
- `JWT_SECRET` - Random secret for JWT signing
- `FRONTEND_URL` - URL of frontend (for CORS)

## Endpoints

- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `POST /api/chat` - Send message
- `GET /api/conversations` - List conversations
- `GET /api/conversations/:id/messages` - Get messages
- `DELETE /api/conversations/:id` - Delete conversation
- `GET /api/health` - Health check