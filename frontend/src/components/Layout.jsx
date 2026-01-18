import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Ticket, Users, Settings, LogOut, 
  Package, DollarSign, Briefcase, BookOpen, Search,
  Wrench, Menu, X
} from 'lucide-react';
import authService from '../services/authService';
import NotificationBell from './NotificationBell';

const SidebarItem = ({ icon: Icon, text, to, isExpanded, onClick }) => {
  const location = useLocation();
  const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));

  return (
    <Link to={to} onClick={onClick}>
      <li className={`flex items-center p-3 mb-2 rounded-xl cursor-pointer transition-all duration-300 
        ${active 
          ? 'bg-gradient-to-r from-[#7C69AF] to-[#A696D1] text-white shadow-lg shadow-purple-500/20' 
          : 'text-slate-400 hover:bg-white/5 hover:text-white'
        }`}>
        <div className="min-w-[20px]">
          <Icon size={20} strokeWidth={active ? 2.5 : 2} />
        </div>
        <span className={`ml-3 font-semibold text-sm transition-all duration-300 overflow-hidden whitespace-nowrap ${
          isExpanded ? 'opacity-100 max-w-xs' : 'opacity-0 max-w-0 md:hidden'
        }`}>
          {text}
        </span>
      </li>
    </Link>
  );
};

export default function Layout({ children }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  
  const userName = authService.getLoggedUser() || 'Usuário';
  const userPhoto = localStorage.getItem('user_photo');
  const userCargo = localStorage.getItem('cargo');

  // Fecha o menu mobile ao trocar de rota
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location]);

  const temPermissao = (cargosPermitidos) => {
    if (!userCargo) return false;
    return cargosPermitidos.includes(userCargo.toUpperCase());
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden">
      
      {/* OVERLAY PARA MOBILE */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden animate-in fade-in duration-300"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside 
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        className={`bg-[#302464] flex flex-col shadow-2xl z-50 transition-all duration-500 ease-in-out fixed md:relative h-full
          ${isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'}
          ${isExpanded ? 'md:w-64' : 'md:w-20'}
        `}
      >
        {/* LOGO E BOTÃO FECHAR (MOBILE) */}
        <div className="h-20 flex items-center justify-between px-6">
          <div className="text-2xl font-black text-white tracking-tighter flex items-center">
            <span className="text-[#A696D1]">C</span>
            <span className={`transition-all duration-500 ${(isExpanded || isMobileOpen) ? 'opacity-100 ml-0.5' : 'opacity-0 w-0'}`}>
              YRIUS
            </span>
          </div>
          <button onClick={() => setIsMobileOpen(false)} className="md:hidden text-white/50 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* MENU */}
        <nav className="flex-1 px-4 py-4 overflow-y-auto overflow-x-hidden no-scrollbar">
          <p className={`px-2 text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-4 transition-opacity duration-300 ${(isExpanded || isMobileOpen) ? 'opacity-100' : 'opacity-0'}`}>
            Menu
          </p>
          <ul>
            <SidebarItem icon={LayoutDashboard} text="Dashboard" to="/" isExpanded={isExpanded || isMobileOpen} />
            <SidebarItem icon={Ticket} text="Chamados" to="/chamados" isExpanded={isExpanded || isMobileOpen} />
            
            {temPermissao(['SOCIO', 'TECNICO', 'GESTOR']) && (
                <SidebarItem icon={Wrench} text="Serviços & Lab" to="/servicos" isExpanded={isExpanded || isMobileOpen} />
            )}

            {temPermissao(['SOCIO']) && (
              <>
                <SidebarItem icon={Briefcase} text="Clientes" to="/clientes" isExpanded={isExpanded || isMobileOpen} />
                <SidebarItem icon={DollarSign} text="Financeiro" to="/financeiro" isExpanded={isExpanded || isMobileOpen} />
              </>
            )}

            <SidebarItem icon={BookOpen} text="Documentação" to="/documentacao" isExpanded={isExpanded || isMobileOpen} />
            <SidebarItem icon={Package} text="Estoque" to="/inventario" isExpanded={isExpanded || isMobileOpen} />
            
            <div className="my-6 border-t border-white/5"></div>
            
            {temPermissao(['SOCIO', 'GESTOR']) && (
                <SidebarItem icon={Users} text="Equipe" to="/equipe" isExpanded={isExpanded || isMobileOpen} />
            )}
            
            <SidebarItem icon={Settings} text="Configurações" to="/config" isExpanded={isExpanded || isMobileOpen} />
          </ul>
        </nav>

        {/* LOGOUT */}
        <div className="p-4 border-t border-white/5">
          <button onClick={() => authService.logout()} className="flex items-center w-full px-4 py-3 text-sm font-bold text-white/40 hover:text-white hover:bg-red-500/20 rounded-xl transition-all overflow-hidden group">
            <LogOut size={18} className="min-w-[18px]" />
            <span className={`ml-3 transition-all duration-500 ${(isExpanded || isMobileOpen) ? 'opacity-100' : 'opacity-0 w-0'}`}>Sair</span>
          </button>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        
        {/* HEADER */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 z-30">
            {/* BOTÃO MENU MOBILE */}
            <button 
              onClick={() => setIsMobileOpen(true)}
              className="p-2 mr-2 text-slate-600 hover:bg-slate-100 rounded-lg md:hidden"
            >
              <Menu size={24} />
            </button>

            <div className="relative w-96 group hidden lg:block">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#7C69AF] transition-colors" size={18} />
                <input type="text" placeholder="Pesquisar..." className="w-full pl-12 pr-4 py-2.5 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-purple-500/5 transition-all text-sm" />
            </div>
            
            <div className="flex items-center gap-3 md:gap-5 ml-auto">
                <NotificationBell />
                <div className="h-8 w-px bg-slate-200/50 hidden sm:block"></div>

                <Link to="/perfil" className="flex items-center gap-2 md:gap-4 hover:opacity-80 transition-opacity cursor-pointer">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-slate-800 leading-tight">{userName}</p>
                        <p className="text-[10px] font-black text-[#7C69AF] uppercase tracking-widest">{userCargo || 'Colaborador'}</p>
                    </div>
                    
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-[#302464] text-white flex items-center justify-center font-black text-xs md:text-sm shadow-lg border-2 border-white overflow-hidden shrink-0">
                        {userPhoto ? (
                          <img src={userPhoto} alt="Perfil" className="w-full h-full object-cover" />
                        ) : (
                          userName.substring(0, 2).toUpperCase()
                        )}
                    </div>
                </Link>
            </div>
        </header>
        
        {/* CONTEÚDO DAS PÁGINAS */}
        <main className="flex-1 overflow-y-auto bg-[#F8FAFC]">
          <div className="max-w-7xl mx-auto p-4 md:p-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}