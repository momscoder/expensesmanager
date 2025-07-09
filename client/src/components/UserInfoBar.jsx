import { Link } from 'react-router-dom';
import './UserInfoBar.css';

const UserInfoBar = () => {
    const token = localStorage.getItem('token');
    if (!token) return null;

    let email = '';
    let exp = '';
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        email = payload.email;
        exp = new Date(payload.exp * 1000).toLocaleString();
    } catch {
        return null;
    }

    const logout = async () => {
        try {
            await fetch('http://localhost:3000/api/logout', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });
        } catch (e) {
            console.warn('Logout error:', e.message);
        } finally {
            localStorage.removeItem('token');
            window.location.reload();
        }
    };


    return (
        <span className="user-info-inline">
            👤 <Link to="/profile" className="user-link">{email}</Link> | истекает: <strong>{exp}</strong>
            <button onClick={logout} className="logout-button-inline">Выйти</button>
        </span>
    );
};

export default UserInfoBar;
