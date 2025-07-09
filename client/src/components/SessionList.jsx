import { useState, useEffect } from 'react';
import { fetchWithToken } from '../utils/fetchWithToken';

const SessionList = () => {
  const [sessions, setSessions] = useState([]);
  const [currentJTI, setCurrentJTI] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setCurrentJTI(payload.jti); 
    } catch {
      localStorage.removeItem('token');
      window.location.href = '/';
      return;
    }

    fetchWithToken('http://localhost:3000/api/sessions')
      .then(res => res?.json())
      .then(data => data && setSessions(data))
      .catch(() => alert('Ошибка загрузки сессий'));
  }, []);

  const handleRevoke = async (jti) => {
    if (!window.confirm('Завершить эту сессию?')) return;
    setLoading(true);

    try {
      const res = await fetchWithToken(`http://localhost:3000/api/sessions/${jti}`, {
        method: 'DELETE'
      });
      if (res) setSessions(prev => prev.filter(s => s.jti !== jti));
    } catch {
      alert('Ошибка при завершении');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: '2rem' }}>
      <h3 style={{ color: '#eee' }}>Активные сессии</h3>

      {sessions.length === 0 ? (
        <p style={{ color: '#ccc' }}>Нет активных устройств</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', color: '#eee' }}>
          <thead>
            <tr style={{ background: '#222', borderBottom: '1px solid #444' }}>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>IP</th>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Устройство</th>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}>Вход</th>
              <th style={{ padding: '0.5rem', textAlign: 'left' }}></th>
            </tr>
          </thead>
          <tbody>
            {sessions.map(({ jti, ip, user_agent, issued_at }) => (
              <tr key={jti} style={{ borderBottom: '1px solid #333' }}>
                <td style={{ padding: '0.5rem' }}>{ip}</td>
                <td style={{ padding: '0.5rem' }}>{user_agent}</td>
                <td style={{ padding: '0.5rem' }}>{new Date(issued_at).toLocaleString()}</td>
                <td style={{ padding: '0.5rem' }}>
                  {jti === currentJTI ? (
                    <span style={{ color: '#66ccff' }}>Вы</span>
                  ) : (
                    <button
                      onClick={() => handleRevoke(jti)}
                      disabled={loading}
                      style={{ padding: '0.3rem 0.6rem' }}
                    >
                      Завершить
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default SessionList;
