import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import axios from 'axios'
import Layout from './components/Layout'
import Login from './pages/Login'
import Clientes from './pages/Clientes';
import Documentacao from './pages/Documentacao';
import ChamadoDetalhes from './pages/ChamadoDetalhes';

// Páginas
import Dashboard from './pages/Dashboard'
import Chamados from './pages/Chamados'
import Inventario from './pages/Inventario' // O arquivo chama Inventario
import Financeiro from './pages/Financeiro'
import Equipe from './pages/Equipe'

// --- COMPONENTE GUARDA-COSTAS (RotaProtegida) ---
const RotaProtegida = ({ children }) => {
  const token = localStorage.getItem('token')
  
  if (!token) {
    return <Navigate to="/login" replace />
  }

  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
  
  return <Layout>{children}</Layout>
}

function App() {
  // Mantém o usuário logado se ele der F5 na página
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    }
  }, [])

  return (
    <Routes>
      {/* 1. Rota PÚBLICA */}
      <Route path="/login" element={<Login />} />

      {/* 2. Rotas PROTEGIDAS */}
      <Route path="/" element={<RotaProtegida><Dashboard /></RotaProtegida>} />
      <Route path="/inventario" element={<RotaProtegida><Inventario /></RotaProtegida>} />
      
      {/* AQUI A MUDANÇA: Rota '/estoque' carrega a página Inventario */}
      <Route path="/inventario" element={<RotaProtegida><Inventario /></RotaProtegida>} />
      
      <Route path="/financeiro" element={<RotaProtegida><Financeiro /></RotaProtegida>} />
      <Route path="/equipe" element={<RotaProtegida><Equipe /></RotaProtegida>} />
      <Route path="/clientes" element={<RotaProtegida><Clientes /></RotaProtegida>} />
      
      <Route path="/documentacao" element={<RotaProtegida><Documentacao /></RotaProtegida>} />
      <Route path="/documentacao/:id" element={<RotaProtegida><Documentacao /></RotaProtegida>} />
      <Route path="/chamados/:id" element={<RotaProtegida><ChamadoDetalhes /></RotaProtegida>} />
      <Route path="/chamados" element={<RotaProtegida><Chamados /></RotaProtegida>} />

      {/* Rota 404 - Redireciona para Dashboard */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App