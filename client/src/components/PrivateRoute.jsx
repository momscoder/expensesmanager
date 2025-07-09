import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/" replace />;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Date.now() / 1000;
    if (payload.exp < now) {
      localStorage.removeItem('token'); // удалить истёкший токен
      return <Navigate to="/" replace />;
    }
    return children;
  } catch {
    localStorage.removeItem('token'); // если токен битый
    return <Navigate to="/" replace />;
  }
};

export default PrivateRoute;
