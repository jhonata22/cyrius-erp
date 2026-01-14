import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';

// Importação das Páginas
import Dashboard from './pages/Dashboard';
import Clientes from './pages/Clientes';
import Documentacao from './pages/Documentacao';
import Chamados from './pages/Chamados';
import ChamadoDetalhes from './pages/ChamadoDetalhes';
import Inventario from './pages/Inventario';
import FornecedorDetalhes from './pages/FornecedorDetalhes';
import AtivoDetalhes from './pages/AtivoDetalhes';
import Financeiro from './pages/Financeiro';
import Equipe from './pages/Equipe';
import Configuracoes from './pages/Configuracoes';
import Perfil from './pages/Perfil';
import Servicos from './pages/Servicos';
import ServicoDetalhes from './pages/ServicoDetalhes';

// --- COMPONENTE GUARDA-COSTAS (Rota Protegida) ---
const RotaProtegida = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');
  const userCargo = localStorage.getItem('cargo');
  
  // 1. Se não tiver token, manda pro Login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // 2. Se a rota exige cargos específicos
  if (allowedRoles) {
    // Normaliza para maiúsculo para evitar erros (gestor vs GESTOR)
    const cargoAtual = userCargo ? userCargo.toUpperCase() : '';
    const cargosPermitidos = allowedRoles.map(r => r.toUpperCase());

    // Se o cargo do usuário NÃO estiver na lista permitida, chuta pro Dashboard
    if (!cargosPermitidos.includes(cargoAtual)) {
      return <Navigate to="/" replace />;
    }
  }

  // 3. Se passou nos testes, renderiza a página com o Layout
  return <Layout>{children}</Layout>;
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* --- ACESSO GERAL (TODOS OS FUNCIONÁRIOS) --- */}
      <Route path="/" element={<RotaProtegida><Dashboard /></RotaProtegida>} />
      <Route path="/inventario" element={<RotaProtegida><Inventario /></RotaProtegida>} />
      <Route path="/fornecedores/:id" element={<RotaProtegida><FornecedorDetalhes /></RotaProtegida>} />
      <Route path="/ativos/:id" element={<RotaProtegida><AtivoDetalhes /></RotaProtegida>} />
      <Route path="/chamados" element={<RotaProtegida><Chamados /></RotaProtegida>} />
      <Route path="/chamados/:id" element={<RotaProtegida><ChamadoDetalhes /></RotaProtegida>} />
      <Route path="/clientes" element={<RotaProtegida><Clientes /></RotaProtegida>} />
      
      {/* A documentação é aberta a todos, mas a aba CONTRATOS é protegida internamente */}
      <Route path="/documentacao" element={<RotaProtegida><Documentacao /></RotaProtegida>} />
      <Route path="/documentacao/:id" element={<RotaProtegida><Documentacao /></RotaProtegida>} />
      
      <Route path="/perfil" element={<RotaProtegida><Perfil /></RotaProtegida>} />
      <Route path="/perfil/:id" element={<RotaProtegida><Perfil /></RotaProtegida>} />
      <Route path="/config" element={<RotaProtegida><Configuracoes /></RotaProtegida>} />

      {/* --- MÓDULO DE SERVIÇOS (Técnicos e Gestores) --- */}
      <Route path="/servicos" element={
        <RotaProtegida allowedRoles={['TECNICO', 'GESTOR', 'SOCIO']}>
            <Servicos />
        </RotaProtegida>
      } />

      <Route path="/servicos/:id" element={
        <RotaProtegida allowedRoles={['TECNICO', 'GESTOR', 'SOCIO']}>
            <ServicoDetalhes />
        </RotaProtegida>
      } />

      {/* --- ACESSO GERENCIAL (GESTOR E SÓCIO) --- */}
      <Route path="/equipe" element={
        <RotaProtegida allowedRoles={['SOCIO', 'GESTOR']}>
            <Equipe />
        </RotaProtegida>
      } />

      {/* --- ACESSO EXCLUSIVO (APENAS SÓCIO) --- */}
      <Route path="/financeiro" element={
        <RotaProtegida allowedRoles={['SOCIO']}>
            <Financeiro />
        </RotaProtegida>
      } />

      {/* Rota Padrão para 404 - Redireciona para home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>   
  );
}

export default App;