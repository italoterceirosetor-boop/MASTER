import React, { useState } from 'react';
import Logo from './components/Logo';
import { api } from './lib/api';

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body = mode === 'login'
        ? { email, password }
        : { email, password, name };

      const data = await api(endpoint, {
        method: 'POST',
        body: JSON.stringify(body)
      });

      localStorage.setItem('master_token', data.token);
      localStorage.setItem('master_user', JSON.stringify(data.user));
      onLogin(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <Logo size={80} />
          <h1>Master IA</h1>
          <p className="subtitle">Master Contabilidade & Consultoria</p>
        </div>

        <div className="login-tabs">
          <button
            className={mode === 'login' ? 'tab active' : 'tab'}
            onClick={() => setMode('login')}
          >
            Entrar
          </button>
          <button
            className={mode === 'register' ? 'tab active' : 'tab'}
            onClick={() => setMode('register')}
          >
            Criar conta
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <input
              type="text"
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <input
            type="password"
            placeholder="Senha (mínimo 6 caracteres)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            minLength={6}
          />

          {error && <div className="error">{error}</div>}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Aguarde...' : (mode === 'login' ? 'Entrar' : 'Criar conta')}
          </button>
        </form>

        <p className="hint">
          {mode === 'login' ? 'Faça login para acessar o Master IA' : 'Crie sua conta para começar'}
        </p>
      </div>
    </div>
  );
}
