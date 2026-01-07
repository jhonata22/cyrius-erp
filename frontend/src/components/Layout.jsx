import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom'; // 1. Adicionado useNavigate
import { 
  LayoutDashboard, 
  Ticket, 
  Users, 
  Settings, 
  LogOut, 
  Package, 
  DollarSign, 
  Briefcase,
  BookOpen
} from 'lucide-react';

const SidebarItem = ({ icon: Icon, text, to }) => {
  const location = useLocation();
  // Verifica se a rota atual começa com o link do botão (para manter ativo em sub-rotas)
  const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));

  return (
    <Link to={to}>
      <li className={`flex items-center p-3 mb-2 rounded-lg cursor-pointer transition-all duration-200 
        ${active 
          ? 'bg-primary-light text-white shadow-lg shadow-orange-500/30' 
          : 'text-gray-400 hover:bg-white/5 hover:text-white'
        }`}>
        <Icon size={20} strokeWidth={2} />
        <span className="ml-3 font-medium text-sm">{text}</span>
      </li>
    </Link>
  );
};

export default function Layout({ children }) {
  const navigate = useNavigate(); // 3. Hook para navegação

  // 4. Função Real de Logout
  const handleLogout = () => {
    localStorage.removeItem('token'); // Apaga a chave
    navigate('/login'); // Chuta para fora
  };

  return (
    <div className="flex h-screen bg-[#F4F6F9] font-sans">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-primary-dark flex flex-col shadow-2xl z-10">
        <div className="h-20 flex items-center px-8 border-b border-white/10">
          <div className="text-2xl font-bold text-white tracking-tight">
            CYRI<span className="text-primary-light">US</span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 overflow-y-auto">
          <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Menu Principal</p>
          <ul>
            <SidebarItem icon={LayoutDashboard} text="Dashboard" to="/" />
            <SidebarItem icon={Ticket} text="Chamados" to="/chamados" />
            
            {/* Mudei o ícone de Clientes para Briefcase para diferenciar da Equipe */}
            <SidebarItem icon={Briefcase} text="Clientes" to="/clientes" />
            <SidebarItem icon={BookOpen} text="Documentação" to="/documentacao" />
            
            <SidebarItem icon={Package} text="Inventário" to="/inventario" />
            <SidebarItem icon={DollarSign} text="Financeiro" to="/financeiro" />
            
            <div className="my-4 border-t border-white/10"></div>
            
            <SidebarItem icon={Users} text="Equipe" to="/equipe" />
            <SidebarItem icon={Settings} text="Configurações" to="/config" />
          </ul>
        </nav>

        <div className="p-4 border-t border-white/10">
          {/* Adicionei o onClick aqui */}
          <button 
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <LogOut size={18} className="mr-3" />
            Sair do Sistema
          </button>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8">
            <div className="relative w-96">
                <input type="text" placeholder="Buscar..." className="w-full pl-4 py-2 bg-gray-50 rounded-full outline-none focus:ring-2 focus:ring-primary-light/50" />
            </div>
            <div className="flex items-center gap-3">
                <div className="text-right mr-2 hidden md:block">
                    <p className="text-sm font-bold text-gray-700">Admin</p>
                    <p className="text-xs text-gray-500">Gestor</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary-dark text-white flex items-center justify-center font-bold shadow-md cursor-pointer hover:bg-primary-light transition-colors">
                    AD
                </div>
            </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-8 bg-[#F4F6F9]">
          {children}
        </main>
      </div>
    </div>
  );
}