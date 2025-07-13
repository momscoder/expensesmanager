import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/" replace />;

  try {
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      localStorage.removeItem('token');
      return <Navigate to="/" replace />;
    }
    
    const payload = JSON.parse(atob(tokenParts[1]));
    const now = Date.now() / 1000;
    
    if (!payload.exp || payload.exp < now) {
      localStorage.removeItem('token'); // удалить истёкший токен
      return <Navigate to="/" replace />;
    }
    return children;
  } catch (error) {
    console.warn('Error parsing JWT token:', error);
    localStorage.removeItem('token'); // если токен битый
    return <Navigate to="/" replace />;
  }
};

export default PrivateRoute;
