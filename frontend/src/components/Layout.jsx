import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Ticket, 
  Users, 
  Settings, 
  LogOut, 
  Package, 
  DollarSign, 
  Briefcase,
  BookOpen,
  ChevronRight
} from 'lucide-react';

const SidebarItem = ({ icon: Icon, text, to, isExpanded }) => {
  const location = useLocation();
  const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));

  return (
    <Link to={to}>
      <li className={`flex items-center p-3 mb-2 rounded-lg cursor-pointer transition-all duration-300 
        ${active 
          ? 'bg-primary-light text-white shadow-lg shadow-orange-500/30' 
          : 'text-gray-400 hover:bg-white/5 hover:text-white'
        }`}>
        <Icon size={20} strokeWidth={2} className="min-w-[20px]" />
        {/* O texto só aparece se o menu estiver expandido */}
        <span className={`ml-3 font-medium text-sm transition-opacity duration-300 whitespace-nowrap ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
          {text}
        </span>
      </li>
    </Link>
  );
};

export default function Layout({ children }) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false); // Estado do menu

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-[#F4F6F9] font-sans">
      
      {/* SIDEBAR DINÂMICA */}
      <aside 
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        className={`bg-primary-dark flex flex-col shadow-2xl z-20 transition-all duration-300 ease-in-out border-r border-white/5
          ${isExpanded ? 'w-64' : 'w-20'}`}
      >
        {/* LOGO */}
        <div className="h-20 flex items-center px-6 border-b border-white/10 overflow-hidden">
          <div className="text-2xl font-bold text-white tracking-tight flex items-center">
            <span className="text-primary-light">C</span>
            <span className={`transition-all duration-300 ${isExpanded ? 'opacity-100 ml-1' : 'opacity-0 w-0'}`}>
              YRIUS
            </span>
          </div>
        </div>

        {/* NAVEGAÇÃO */}
        <nav className="flex-1 px-4 py-6 overflow-y-auto overflow-x-hidden custom-scrollbar">
          <p className={`px-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
            {isExpanded ? 'Menu Principal' : '...'}
          </p>
          <ul>
            <SidebarItem icon={LayoutDashboard} text="Dashboard" to="/" isExpanded={isExpanded} />
            <SidebarItem icon={Ticket} text="Chamados" to="/chamados" isExpanded={isExpanded} />
            <SidebarItem icon={Briefcase} text="Clientes" to="/clientes" isExpanded={isExpanded} />
            <SidebarItem icon={BookOpen} text="Documentação" to="/documentacao" isExpanded={isExpanded} />
            <SidebarItem icon={Package} text="Estoque" to="/inventario" isExpanded={isExpanded} />
            <SidebarItem icon={DollarSign} text="Financeiro" to="/financeiro" isExpanded={isExpanded} />
            
            <div className="my-4 border-t border-white/10"></div>
            
            <SidebarItem icon={Users} text="Equipe" to="/equipe" isExpanded={isExpanded} />
            <SidebarItem icon={Settings} text="Configurações" to="/config" isExpanded={isExpanded} />
          </ul>
        </nav>

        {/* LOGOUT */}
        <div className="p-4 border-t border-white/10">
          <button 
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 text-sm text-gray-400 hover:text-white hover:bg-red-500/10 rounded-lg transition-colors overflow-hidden"
          >
            <LogOut size={18} className="min-w-[18px]" />
            <span className={`ml-3 transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 w-0'}`}>
              Sair
            </span>
          </button>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300">
        <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8">
            <div className="relative w-96">
                <input type="text" placeholder="Buscar no sistema..." className="w-full pl-4 py-2 bg-gray-50 rounded-full border border-transparent focus:border-primary-light/30 outline-none focus:ring-4 focus:ring-primary-light/10 transition-all" />
            </div>
            <div className="flex items-center gap-3">
                <div className="text-right mr-2 hidden md:block">
                    <p className="text-sm font-bold text-gray-700">Admin</p>
                    <p className="text-[10px] font-bold text-primary-light uppercase tracking-wider">Gestor</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary-dark text-white flex items-center justify-center font-bold shadow-md cursor-pointer hover:bg-primary-light transition-colors border-2 border-white">
                    AD
                </div>
            </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-8 bg-[#F4F6F9]">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}