import React, { useState } from 'react';
import { fetchWithToken } from '../utils/fetchWithToken';
import './AuthModal.css';

const AuthModal = ({ onSuccess }) => {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Пожалуйста, заполните все поля');
      return;
    }

    // Login validation (username format)
    const loginRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    if (!loginRegex.test(email.trim())) {
      setError('Логин должен содержать 3-20 символов (буквы, цифры, _ или -)');
      return;
    }

    // Password validation
    if (password.length < 5) {
      setError('Пароль должен содержать минимум 5 символов');
      return;
    }

    setLoading(true);
    setError('');

    const endpoint = mode === 'login' ? '/api/login' : '/api/register';
    try {
      const res = await fetchWithToken(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!res) {
        setError('Ошибка соединения с сервером');
        return;
      }

      const data = await res.json();
      if (data.token) {
        localStorage.setItem('token', data.token);
        onSuccess();
      } else {
        setError(data.error || 'Ошибка аутентификации');
      }
    } catch (err) {
      console.error('Auth error:', err);
      if (err.message === 'Authentication failed') {
        setError('Ошибка аутентификации');
      } else if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError('Ошибка соединения с сервером');
      } else {
        setError('Ошибка сервера');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAuth();
    }
  };

  return (
    <div className="auth-modal-overlay">
      <div className="auth-modal">
        <h3 className="auth-title">
          {mode === 'login' ? '🔐 Вход' : '📝 Регистрация'}
        </h3>
        
        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="email">Логин</label>
          <input
            id="email"
            type="text"
            placeholder="Введите логин"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Пароль</label>
          <input
            id="password"
            type="password"
            placeholder="Введите пароль"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
            required
          />
        </div>

        <button 
          onClick={handleAuth}
          disabled={loading}
          className="auth-button"
        >
          {loading ? (
            <>
              <span className="loading-spinner"></span>
              {mode === 'login' ? 'Вход...' : 'Регистрация...'}
            </>
          ) : (
            mode === 'login' ? 'Войти' : 'Зарегистрироваться'
          )}
        </button>

        <div className="auth-toggle-container">
          <p>
            {mode === 'login' ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}{' '}
            <button 
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError('');
              }}
              className="auth-toggle-button"
              disabled={loading}
            >
              {mode === 'login' ? 'Зарегистрироваться' : 'Войти'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
