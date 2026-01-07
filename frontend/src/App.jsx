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
import Inventario from './pages/Inventario'
import Financeiro from './pages/Financeiro'
import Equipe from './pages/Equipe'

// --- COMPONENTE GUARDA-COSTAS (RotaProtegida) ---
// Ele verifica se tem token. Se tiver, mostra o Layout (Menu). Se não, chuta pro Login.
const RotaProtegida = ({ children }) => {
  const token = localStorage.getItem('token')
  
  if (!token) {
    return <Navigate to="/login" replace />
  }

  // Garante que o token esteja no cabeçalho das requisições
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
  
  // Aqui está o pulo do gato: O Layout só é renderizado se estiver logado
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
      {/* 1. Rota PÚBLICA (Login) - Note que NÃO tem o <Layout> em volta dela */}
      <Route path="/login" element={<Login />} />

      {/* 2. Rotas PROTEGIDAS - O <RotaProtegida> encarrega de colocar o Layout */}
      <Route path="/" element={<RotaProtegida><Dashboard /></RotaProtegida>} />
      <Route path="/chamados" element={<RotaProtegida><Chamados /></RotaProtegida>} />
      <Route path="/inventario" element={<RotaProtegida><Inventario /></RotaProtegida>} />
      <Route path="/financeiro" element={<RotaProtegida><Financeiro /></RotaProtegida>} />
      <Route path="/equipe" element={<RotaProtegida><Equipe /></RotaProtegida>} />
      <Route path="/clientes" element={<RotaProtegida><Clientes /></RotaProtegida>} />
      <Route path="/documentacao" element={<RotaProtegida><Documentacao /></RotaProtegida>} /> {/* Geral */}
      <Route path="/documentacao/:id" element={<RotaProtegida><Documentacao /></RotaProtegida>} /> {/* Específica */}
      <Route path="/chamados/:id" element={<RotaProtegida><ChamadoDetalhes /></RotaProtegida>} />

      {/* Rota 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App