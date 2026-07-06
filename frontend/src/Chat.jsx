import React, { useState, useEffect, useRef } from 'react';
import Logo from './components/Logo';
import { api } from './lib/api';

export default function Chat({ user, onLogout }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadConversations() {
    try {
      const data = await api('/api/conversations');
      setConversations(data);
    } catch (err) {
      console.error('Erro ao carregar conversas:', err);
    }
  }

  async function loadConversation(id) {
    try {
      const data = await api(`/api/conversations/${id}/messages`);
      setMessages(data.map(m => ({ role: m.role, content: m.content })));
      setConversationId(id);
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err);
    }
  }

  function newConversation() {
    setMessages([]);
    setConversationId(null);
  }

  async function deleteConversation(id, e) {
    e.stopPropagation();
    if (!confirm('Deletar esta conversa?')) return;
    try {
      await api(`/api/conversations/${id}`, { method: 'DELETE' });
      setConversations(conversations.filter(c => c.id !== id));
      if (conversationId === id) {
        newConversation();
      }
    } catch (err) {
      alert('Erro ao deletar: ' + err.message);
    }
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');

    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const data = await api('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ conversationId, message: userMessage })
      });

      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);

      if (!conversationId) {
        setConversationId(data.conversationId);
        loadConversations();
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ Erro: ${err.message}`
      }]);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    if (confirm('Sair da conta?')) {
      localStorage.removeItem('master_token');
      localStorage.removeItem('master_user');
      onLogout();
    }
  }

  return (
    <div className="chat-app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <Logo size={40} />
          <div>
            <h3>Master IA</h3>
            <small>{user.name || user.email}</small>
          </div>
        </div>

        <button className="new-chat-btn" onClick={newConversation}>
          + Nova conversa
        </button>

        <div className="conversations-list">
          {conversations.length === 0 && (
            <p className="empty">Nenhuma conversa ainda</p>
          )}
          {conversations.map(c => (
            <div
              key={c.id}
              className={`conversation-item ${conversationId === c.id ? 'active' : ''}`}
              onClick={() => loadConversation(c.id)}
            >
              <span>{c.title}</span>
              <button
                className="delete-conv"
                onClick={(e) => deleteConversation(c.id, e)}
                title="Deletar"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </aside>

      {/* Chat principal */}
      <main className="chat-main">
        <div className="chat-header">
          <div>
            <h2>Master IA</h2>
            <small>Assistente inteligente da Master Contabilidade</small>
          </div>
        </div>

        <div className="messages">
          {messages.length === 0 && (
            <div className="welcome">
              <Logo size={100} />
              <h2>Olá! Como posso ajudar?</h2>
              <p>Pergunte sobre contabilidade, fiscal, tributário, folha ou qualquer assunto.</p>
              <div className="suggestions">
                <button onClick={() => setInput('O que é Lucro Real?')}>
                  O que é Lucro Real?
                </button>
                <button onClick={() => setInput('Cotação do dólar hoje')}>
                  Cotação do dólar hoje
                </button>
                <button onClick={() => setInput('Como calcular INSS?')}>
                  Como calcular INSS?
                </button>
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`message ${m.role}`}>
              <div className="bubble">
                {m.content.split('\n').map((line, j) => (
                  <p key={j}>{line}</p>
                ))}
              </div>
            </div>
          ))}

          {loading && (
            <div className="message assistant">
              <div className="bubble typing">
                <span></span><span></span><span></span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={sendMessage} className="input-form">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte algo ao Master IA..."
            disabled={loading}
          />
          <button type="submit" disabled={loading || !input.trim()}>
            {loading ? '...' : '➤'}
          </button>
        </form>
      </main>
    </div>
  );
}
