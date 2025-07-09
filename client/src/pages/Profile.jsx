import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import SessionList from '../components/SessionList';


const Profile = () => {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    if (!token) return null;

    let payload = {};
    try {
        payload = JSON.parse(atob(token.split('.')[1]));
    } catch {
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

    const handleSave = async () => {
        setSaving(true);
        try {
            const body = { email: newEmail };
            if (newPass.trim()) body.password = newPass;

            const res = await fetch(`http://localhost:3000/api/users/${payload.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                const result = await res.json();
                if (result.token) localStorage.setItem('token', result.token);
            }

            if (!res.ok) throw new Error('Не удалось сохранить изменения');
            alert('✅ Профиль обновлён');
            setEmail(newEmail);
            setNewPass('');
            setShowEditor(false);
        } catch (err) {
            alert(err.message || 'Ошибка');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <div style={{ padding: '2rem', maxWidth: '500px', margin: '0 auto', color: '#eee' }}>
                <BackButton />
                <h2>👤 Профиль</h2>
                <p><strong>Email:</strong> {email}</p>
                <p><strong>Токен истекает:</strong> {new Date(payload.exp * 1000).toLocaleString()}</p>

                <div style={{  marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center'}}>
                    <button onClick={() => setShowEditor(true)}>✏️ Редактировать</button>
                    <button onClick={logout}>🚪 Выйти</button>
                </div>

                {showEditor && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 999
                    }}>
                        <div style={{
                            background: '#1f1f1f',
                            padding: '1.5rem',
                            borderRadius: '10px',
                            width: '100%',
                            maxWidth: '400px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.8rem',
                            color: 'white'
                        }}>
                            <h3>Редактировать профиль</h3>
                            <label>Новый email</label>
                            <input value={newEmail} onChange={e => setNewEmail(e.target.value)} />

                            <label>Новый пароль (опционально)</label>
                            <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} />

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                <button onClick={handleSave} disabled={saving}>Сохранить</button>
                                <button onClick={() => setShowEditor(false)}>Отмена</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <div>
                <SessionList />
            </div>
        </div>
    );
};

export default Profile;
