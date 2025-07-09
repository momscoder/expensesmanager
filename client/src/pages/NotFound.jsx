import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div style={{ padding: '2rem', textAlign: 'center', color: '#eee' }}>
      <h1>404 — Страница не найдена</h1>
      <p>Такой страницы больше не существует или она ещё не создана.</p>
      <Link to="/" style={{ color: '#66ccff', textDecoration: 'underline' }}>
        Вернуться на главную
      </Link>
    </div>
  );
};

export default NotFound;
