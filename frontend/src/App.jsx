import React, { useState, useEffect } from 'react';
import Login from './Login';
import Chat from './Chat';

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('master_token');
    const savedUser = localStorage.getItem('master_user');
    if (savedToken && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
      } catch (e) {
        localStorage.clear();
      }
    }
  }, []);

  function handleLogin(userData, userToken) {
    setUser(userData);
    setToken(userToken);
  }

  function handleLogout() {
    setUser(null);
    setToken(null);
  }

  if (!user || !token) {
    return <Login onLogin={handleLogin} />;
  }

  return <Chat user={user} onLogout={handleLogout} />;
}
