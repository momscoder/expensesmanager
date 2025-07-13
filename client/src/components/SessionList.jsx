import { useEffect, useState } from 'react';
import { fetchWithToken } from '../utils/fetchWithToken';
import './SessionList.css';

const SessionList = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await fetchWithToken('/api/sessions');
        if (response.ok) {
          const data = await response.json();
          setSessions(data);
        }
      } catch (error) {
        console.error('Error fetching sessions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, []);

  const handleTerminateSession = async (jti) => {
    try {
      const res = await fetchWithToken(`/api/sessions/${jti}`, {
        method: 'DELETE'
      });

      if (!res || !res.ok) {
        throw new Error('Ошибка при завершении сессии');
      }

      setSessions(prev => prev.filter(session => session.jti !== jti));
    } catch (error) {
      console.error('Error terminating session:', error);
      if (error.message === 'Authentication failed') {
        alert('Сессия истекла. Пожалуйста, войдите снова.');
        window.location.reload();
      } else {
        alert('Ошибка при завершении сессии');
      }
    }
  };

  const formatUserAgent = (userAgent) => {
    if (!userAgent || userAgent === 'Unknown') return 'Неизвестно';
    
    // Try to extract browser and OS info
    const browserMatch = userAgent.match(/(chrome|firefox|safari|edge|opera|ie)\/?\s*(\d+)/i);
    const osMatch = userAgent.match(/(windows|mac|linux|android|ios|iphone|ipad)/i);
    
    let browser = browserMatch ? `${browserMatch[1]} ${browserMatch[2]}` : 'Браузер';
    let os = osMatch ? osMatch[1] : '';
    
    return `${browser}${os ? ` • ${os}` : ''}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="session-list-container">
        <div className="session-list-loading">
          <div className="loading-spinner"></div>
          <p>Загрузка сессий...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="session-list-container">
      <div className="session-list-header">
        <h3 className="session-list-title">Активные сессии</h3>
        <span className="session-count">Кол-во сессий: {sessions.length}</span>
      </div>

      {sessions.length === 0 ? (
        <div className="session-list-empty">
          <div className="empty-icon">🔒</div>
          <p>Нет активных сессий</p>
          <small>Все сессии будут отображаться здесь</small>
        </div>
      ) : (
        <div className="session-table-wrapper">
          <table className="session-table">
            <thead className="session-table-header">
              <tr>
                <th className="session-table-cell session-table-cell--device">
                  <span className="table-header-text">Устройство</span>
                </th>
                <th className="session-table-cell session-table-cell--ip">
                  <span className="table-header-text">IP адрес</span>
                </th>
                <th className="session-table-cell session-table-cell--date">
                  <span className="table-header-text">Создана</span>
                </th>
                <th className="session-table-cell session-table-cell--actions">
                  <span className="table-header-text">Действия</span>
                </th>
            </tr>
          </thead>
            <tbody className="session-table-body">
              {sessions.map((session, index) => (
                <tr key={session.jti} className="session-table-row">
                  <td className="session-table-cell session-table-cell--device">
                    <div className="device-info">
                      <div className="device-icon">💻</div>
                      <div className="device-details">
                        <div className="device-name">{formatUserAgent(session.user_agent)}</div>
                        <div className="device-user-agent">{session.user_agent || 'Неизвестно'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="session-table-cell session-table-cell--ip">
                    <div className="ip-address">
                      <span className="ip-text">{session.ip || 'Неизвестно'}</span>
                    </div>
                  </td>
                  <td className="session-table-cell session-table-cell--date">
                    <div className="session-date">
                      <div className="date-text">{formatDate(session.issued_at)}</div>
                      <div className="date-relative">
                        {(() => {
                          const now = new Date();
                          const sessionDate = new Date(session.issued_at);
                          const diffMs = now - sessionDate;
                          const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                          const diffDays = Math.floor(diffHours / 24);
                          
                          if (diffDays > 0) {
                            return `${diffDays} дн. назад`;
                          } else if (diffHours > 0) {
                            return `${diffHours} ч. назад`;
                          } else {
                            return 'Только что';
                          }
                        })()}
                      </div>
                    </div>
                  </td>
                  <td className="session-table-cell session-table-cell--actions">
                    <button
                      onClick={() => handleTerminateSession(session.jti)}
                      className="session-terminate-btn"
                      title="Завершить сессию"
                    >
                      <span className="terminate-icon">❌</span>
                      <span className="terminate-text">Завершить</span>
                    </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
};

export default SessionList;
