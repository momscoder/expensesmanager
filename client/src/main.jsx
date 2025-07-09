import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css'

import App from './App.jsx'
import Stats from './pages/Stats.jsx'; 
import Dashboard from './pages/Dashboard.jsx';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/chart" element={<Dashboard />} />
      </Routes>
      <ToastContainer position="top-right" autoClose={3000} theme="dark" />
    </BrowserRouter>
  </StrictMode>,
)
