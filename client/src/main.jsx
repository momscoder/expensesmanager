import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import App from './App';
import Dashboard from './pages/Dashboard';
import Stats from './pages/Stats';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';
import PrivateRoute from './components/PrivateRoute';

import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Главная открыта для всех, с авторизацией внутри */}
        <Route path="/" element={<App />} />

        {/* Приватные маршруты — только после входа */}
        <Route path="/stats" element={<PrivateRoute><Stats /></PrivateRoute>} />
    <Route path="/chart" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
    <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />

    {/* fallback — ВСЕ несуществующие маршруты сюда */}
    <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
