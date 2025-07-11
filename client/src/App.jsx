import React, { useEffect, useState } from 'react';
import AuthModal from './components/AuthModal'; // 👈 импорт
import reactLogo from './assets/react.svg';
import './App.css';

import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import DateInput from './components/DateInput';
import { fetchWithToken } from './utils/fetchWithToken';

import UserInfoBar from './components/UserInfoBar';

function App() {
  const [loading, setLoading] = useState(false);
  const [inputUi, setInputUi] = useState('');
  const [inputDate, setInputDate] = useState('');
  const [showAuth, setShowAuth] = useState(false);

  const navigate = useNavigate();

  // 👇 Принудительная проверка токена
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setShowAuth(true);
    }
  }, []);

  const goToStats = () => navigate('/stats');
  const goToChart = () => navigate('/chart');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetchWithToken('http://localhost:3000/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: inputUi, date: inputDate })
      });
      const data = await response.json();
      if (response.status === 200) toast.success(data.message);
      else toast.error(data.message);

    } catch (error) {
      console.error('Ошибка при отправке данных:', error);
      toast.error('Ошибка при выполнении запроса');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {showAuth && <AuthModal onSuccess={() => setShowAuth(false)} />}

      <div className="form-wrapper">
        <form onSubmit={handleSubmit} className="form-content">
          <img src={reactLogo} className="logo react" alt="React logo" />
          <input
            type="text"
            value={inputUi}
            onChange={(e) => setInputUi(e.target.value)}
            autoComplete="off"
            placeholder="Введите УИ"
            required
          />

          <DateInput value={inputDate} onChange={setInputDate} />

          <button className='form-button' type="submit" disabled={loading}>
            {loading ? 'Загрузка...' : 'Загрузить чек'}
          </button>

          <button className='form-button' type="button" onClick={goToStats}>
            База данных
          </button>

          <button className='form-button' type="button" onClick={goToChart}>
            Графики
          </button>

          {!showAuth && <UserInfoBar />}
        </form>
      </div>
    </>
  );
}

export default App;
