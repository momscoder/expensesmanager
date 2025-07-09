import React, { useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import './App.css'

import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import DateInput from './components/DateInput';

function App() {
  const [loading, setLoading] = useState(false);

  const [inputUi, setInputUi] = useState('');
  const [inputDate, setInputDate] = useState('');
  const navigate = useNavigate();

  const goToStats = () => {
    navigate('/stats');
  };

  const goToChart = () => {
    navigate('/chart');
  };

  const handleSubmit = async (event) => {
    event.preventDefault(); // Prevent default form submission behavior
    setLoading(true);

    try {
      const response = await fetch('http://localhost:3000/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', // Specify content type as JSON
        },
        body: JSON.stringify({ ui: inputUi, date: inputDate }), // Send data as JSON string
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Server response:', data);
      if (response.status == 200) {
        switch (data.message) {
          case 0:
            toast.error('Неизвестная ошибка');
            break;
          case 1:
            toast.error('Чек уже обработан');
            break;
          case 2:
            toast.success('Данные успешно сохранены');
            break;
          default:
            toast.error('Ошибка при выполнении запроса');
            break;
        }
        //goToStats();
      }
    } catch (error) {
      console.error('Error sending data:', error);
      toast.error('Ошибка при выполнении запроса');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="form-wrapper">
        <form onSubmit={handleSubmit} className="form-content">
          <img src={reactLogo} className="logo react" alt="React logo" />
          <input
            type="text"
            value={inputUi}
            onChange={(e) => setInputUi(e.target.value)}
            autocomplete="off"
            placeholder="Введите УИ"
            required
          />

          <DateInput value={inputDate} onChange={setInputDate} />

          <button type="submit" disabled={loading}>
            {loading ? 'Загрузка...' : 'Загрузить чек'}
          </button>

          <button type="button" onClick={goToStats}>
            База данных
          </button>

          <button type="button" onClick={goToChart}>
            Графики
          </button>
        </form>
      </div>
    </>

  )
}

export default App
