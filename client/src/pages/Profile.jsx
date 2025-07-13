import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import SessionList from '../components/SessionList';
import { fetchWithToken } from '../utils/fetchWithToken';

const Profile = () => {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    if (!token) return null;

    let payload = {};
    try {
        const tokenParts = token.split('.');
        if (tokenParts.length !== 3) {
            localStorage.removeItem('token');
            navigate('/');
            return null;
        }
        
        payload = JSON.parse(atob(tokenParts[1]));
        if (!payload.email || !payload.id) {
            localStorage.removeItem('token');
            navigate('/');
            return null;
        }
    } catch (error) {
        console.warn('Error parsing JWT token:', error);
        localStorage.removeItem('token');
        navigate('/');
        return null;
    }

    const [showEditor, setShowEditor] = useState(false);
    const [email, setEmail] = useState(payload.email || '');
    const [newEmail, setNewEmail] = useState(email);
    const [newPass, setNewPass] = useState('');
    const [saving, setSaving] = useState(false);

    const logout = () => {
        localStorage.removeItem('token');
        navigate('/');
        window.location.reload();
    };

    const validateLogin = (login) => {
        const loginRegex = /^[a-zA-Z0-9_-]{3,20}$/;
        return loginRegex.test(login.trim());
    };

    const validatePassword = (password) => {
        return password.length === 0 || password.length >= 5;
    };

    const handleSave = async () => {
        // Validate new login
        if (!validateLogin(newEmail)) {
            alert('Логин должен содержать 3-20 символов (буквы, цифры, _ или -)');
            return;
        }

        // Validate new password if provided
        if (newPass.trim() && !validatePassword(newPass)) {
            alert('Пароль должен содержать минимум 5 символов');
            return;
        }

        setSaving(true);
        try {
            const body = { email: newEmail };
            if (newPass.trim()) body.password = newPass;

            const res = await fetchWithToken(`/api/users/${payload.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!res || !res.ok) {
                throw new Error('Не удалось сохранить изменения');
            }

            const result = await res.json();
            if (result.token) {
                localStorage.setItem('token', result.token);
            }

            alert('✅ Профиль обновлён');
            setEmail(newEmail);
            setNewPass('');
            setShowEditor(false);
        } catch (err) {
            console.error('Error saving profile:', err);
            if (err.message === 'Authentication failed') {
                alert('Сессия истекла. Пожалуйста, войдите снова.');
                window.location.reload();
            } else {
                alert(err.message || 'Ошибка при сохранении');
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="container">
            <div className="card">
                <BackButton />
                <h2 className="text-center">👤 Профиль</h2>
                
                <div className="profile-info">
                    <div className="profile-item">
                        <strong>Логин:</strong> {email}
                    </div>
                    <div className="profile-item">
                        <strong>Токен истекает:</strong> {new Date(payload.exp * 1000).toLocaleString()}
                    </div>
                </div>

                <div className="flex justify-center gap-sm my-lg">
                    <button 
                        onClick={() => setShowEditor(true)}
                        className="form-button"
                    >
                        ✏️ Редактировать
                    </button>
                    <button 
                        onClick={logout}
                        className="form-button"
                        style={{ background: 'var(--color-error)' }}
                    >
                        🚪 Выйти
                    </button>
                </div>
            </div>

            {showEditor && (
                <div className="modal-overlay" onClick={() => setShowEditor(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3>Редактировать профиль</h3>
                        
                        <div className="form-group">
                            <label>Новый логин</label>
                            <input 
                                value={newEmail} 
                                onChange={e => setNewEmail(e.target.value)}
                                type="text"
                                placeholder="Введите новый логин"
                                disabled={saving}
                            />
                        </div>

                        <div className="form-group">
                            <label>Новый пароль (опционально)</label>
                            <input 
                                type="password" 
                                value={newPass} 
                                onChange={e => setNewPass(e.target.value)}
                                placeholder="Введите новый пароль (минимум 5 символов)"
                                disabled={saving}
                            />
                        </div>

                        <div className="flex justify-end gap-sm">
                            <button 
                                onClick={handleSave} 
                                disabled={saving}
                                className="form-button"
                            >
                                {saving ? 'Сохранение...' : 'Сохранить'}
                            </button>
                            <button 
                                onClick={() => setShowEditor(false)}
                                disabled={saving}
                                className="form-button"
                                style={{ background: 'var(--color-border)' }}
                            >
                                Отмена
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="card my-lg">
                <SessionList />
            </div>
        </div>
    );
};

export default Profile;
