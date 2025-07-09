import React, { useState } from 'react';
import './AuthModal.css';

const AuthModal = ({ onSuccess }) => {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleAuth = async () => {
    const endpoint = mode === 'login' ? '/api/login' : '/api/register';
    try {
      const res = await fetch(`http://localhost:3000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (data.token) {
        localStorage.setItem('token', data.token);
        onSuccess(); // закрыть модалку
      } else {
        alert(data.error || 'Ошибка аутентификации');
      }
    } catch {
      alert('Ошибка сервера');
    }
  };

  return (
    <div className="auth-modal-overlay">
      <div className="auth-modal">
        <h3>{mode === 'login' ? 'Вход' : 'Регистрация'}</h3>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button onClick={handleAuth}>
          {mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
        </button>
        <p style={{ marginTop: '1rem' }}>
          {mode === 'login' ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}{' '}
          <span onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="auth-toggle">
            {mode === 'login' ? 'Зарегистрироваться' : 'Войти'}
          </span>
        </p>
      </div>
    </div>
  );
};

export default AuthModal;
