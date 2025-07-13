import { Link } from 'react-router-dom';
import { fetchWithToken } from '../utils/fetchWithToken';
import './UserInfoBar.css';

const UserInfoBar = () => {
    const token = localStorage.getItem('token');
    if (!token) return null;

    let email = '';
    let exp = '';
    try {
        const tokenParts = token.split('.');
        if (tokenParts.length !== 3) {
            console.warn('Invalid JWT token format');
            return null;
        }
        
        const payload = JSON.parse(atob(tokenParts[1]));
        email = payload.email || '';
        exp = payload.exp ? new Date(payload.exp * 1000).toLocaleString() : '';
        
        if (!email || !exp) {
            console.warn('Invalid JWT payload');
            return null;
        }
    } catch (error) {
        console.warn('Error parsing JWT token:', error);
        return null;
    }

    const logout = async () => {
        try {
            await fetchWithToken('/api/logout', {
                method: 'POST'
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
            <button type="button" onClick={logout} className="logout-button-inline">Выйти</button>
        </span>
    );
};

export default UserInfoBar;
