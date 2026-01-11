import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import Layout from './components/Layout'
import Login from './pages/Login'
import Clientes from './pages/Clientes';
import Documentacao from './pages/Documentacao';
import ChamadoDetalhes from './pages/ChamadoDetalhes';
import FornecedorDetalhes from './pages/FornecedorDetalhes';
import AtivoDetalhes from './pages/AtivoDetalhes';
import Configuracoes from './pages/Configuracoes';
import Perfil from './pages/Perfil'; // <--- 1. IMPORTADO AQUI

// Páginas
import Dashboard from './pages/Dashboard'
import Chamados from './pages/Chamados'
import Inventario from './pages/Inventario'
import Financeiro from './pages/Financeiro'
import Equipe from './pages/Equipe'

// --- COMPONENTE DE PROTEÇÃO E LAYOUT ---
const RotaProtegida = ({ children }) => {
  const token = localStorage.getItem('token')
  
  if (!token) {
    return <Navigate to="/login" replace />
  }

  // O Layout (Menu + Header) é renderizado aqui para todas as rotas protegidas
  return <Layout>{children}</Layout>
}

function App() {
  return (
    <Routes>
      {/* Rota PÚBLICA (Sem Menu) */}
      <Route path="/login" element={<Login />} />

      {/* TODAS AS ROTAS ABAIXO AGORA TERÃO O MENU LATERAL */}
      <Route path="/" element={<RotaProtegida><Dashboard /></RotaProtegida>} />
      
      <Route path="/inventario" element={<RotaProtegida><Inventario /></RotaProtegida>} />
      <Route path="/fornecedores/:id" element={<RotaProtegida><FornecedorDetalhes /></RotaProtegida>} />
      <Route path="/ativos/:id" element={<RotaProtegida><AtivoDetalhes /></RotaProtegida>} />
      
      <Route path="/chamados" element={<RotaProtegida><Chamados /></RotaProtegida>} />
      <Route path="/chamados/:id" element={<RotaProtegida><ChamadoDetalhes /></RotaProtegida>} />
      
      <Route path="/clientes" element={<RotaProtegida><Clientes /></RotaProtegida>} />
      <Route path="/documentacao" element={<RotaProtegida><Documentacao /></RotaProtegida>} />
      <Route path="/documentacao/:id" element={<RotaProtegida><Documentacao /></RotaProtegida>} />
      
      <Route path="/financeiro" element={<RotaProtegida><Financeiro /></RotaProtegida>} />
      <Route path="/equipe" element={<RotaProtegida><Equipe /></RotaProtegida>} />
      
      {/* 2. ROTA DE PERFIL ADICIONADA */}
      <Route path="/perfil" element={<RotaProtegida><Perfil /></RotaProtegida>} />
      
      <Route path="/config" element={<RotaProtegida><Configuracoes /></RotaProtegida>} />

      {/* Rota 404 - Redireciona para Dashboard */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App