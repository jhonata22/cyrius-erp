// frontend\src\components\Layout.jsx
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Ticket, Users, Settings, LogOut, 
  Package, DollarSign, Briefcase, BookOpen, Search,
  Wrench, Menu, X, Building2, ScanLine, ShoppingCart
} from 'lucide-react';
import authService from '../services/authService';
import equipeService from '../services/equipeService'; 
import NotificationBell from './NotificationBell';
import AtivoScanner from './AtivoScanner';

const scrollbarStyle = `
  .sidebar-scroll::-webkit-scrollbar { width: 5px; }
  .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
  .sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
  .sidebar-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.3); }
  .sidebar-scroll { scrollbar-width: thin; scrollbar-color: rgba(255, 255, 255, 0.1) transparent; }
`;

// ✅ FUNÇÃO AUXILIAR PARA CORRIGIR URLS DE IMAGENS
const formatImgUrl = (url) => {
  if (!url) return null;
  // Se a URL contiver http, removemos o domínio para torná-la relativa
  // Isso resolve o conflito entre IP interno e IP público
  if (url.startsWith('http')) {
    return url.replace(/^https?:\/\/[^/]+/, '');
  }
  return url;
};

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
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  
  const [userName, setUserName] = useState(authService.getLoggedUser() || 'Usuário');
  const [userPhoto, setUserPhoto] = useState(localStorage.getItem('user_photo'));
  const [userCargo, setUserCargo] = useState(localStorage.getItem('cargo'));

  useEffect(() => {
    async function fetchUserData() {
        try {
            const data = await equipeService.me();
            if (data.nome) setUserName(data.nome);
            if (data.cargo) setUserCargo(data.cargo);
            if (data.foto) {
                const fotoFormatada = formatImgUrl(data.foto);
                setUserPhoto(fotoFormatada);
                localStorage.setItem('user_photo', fotoFormatada);
            }
            if (data.cargo) localStorage.setItem('cargo', data.cargo);
        } catch (error) {
            console.error("Erro ao carregar perfil", error);
        }
    }
    fetchUserData();
  }, []);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [location]);

  const temPermissao = (cargosPermitidos) => {
    if (!userCargo) return false;
    return cargosPermitidos.includes(userCargo.toUpperCase());
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden">
      <style>{scrollbarStyle}</style>

      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside 
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        className={`
          fixed inset-y-0 left-0 z-50 bg-[#302464] flex flex-col shadow-2xl transition-all duration-500 ease-in-out
          md:relative md:translate-x-0
          ${isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'}
          ${isExpanded ? 'md:w-64' : 'md:w-20'}
        `}
      >
        <div className="h-20 flex items-center justify-between px-6 shrink-0">
          <div className="text-2xl font-black text-white tracking-tighter flex items-center">
            <span className="text-[#A696D1]">C</span>
            <span className={`transition-all duration-500 ${(isExpanded || isMobileOpen) ? 'opacity-100 ml-0.5' : 'opacity-0 w-0'}`}>
              YRIUS v2.1 beta
            </span>
          </div>
          <button className="md:hidden text-white/50 hover:text-white" onClick={() => setIsMobileOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 overflow-y-auto sidebar-scroll">
          <p className={`px-2 text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-4 transition-opacity duration-300 ${(isExpanded || isMobileOpen) ? 'opacity-100' : 'opacity-0'}`}>
            Menu
          </p>
          <ul>
            <SidebarItem icon={LayoutDashboard} text="Dashboard" to="/" isExpanded={isExpanded || isMobileOpen} />
            <SidebarItem icon={Ticket} text="Chamados" to="/chamados" isExpanded={isExpanded || isMobileOpen} />
            
            {temPermissao(['SOCIO', 'TECNICO']) && (
                <SidebarItem icon={Wrench} text="Serviços & Lab" to="/servicos" isExpanded={isExpanded || isMobileOpen} />
            )}

            {temPermissao(['SOCIO']) && (
              <>
                <SidebarItem icon={Briefcase} text="Clientes" to="/clientes" isExpanded={isExpanded || isMobileOpen} />
                <SidebarItem icon={DollarSign} text="Financeiro" to="/financeiro" isExpanded={isExpanded || isMobileOpen} />
                <SidebarItem icon={ShoppingCart} text="Vendas" to="/vendas" isExpanded={isExpanded || isMobileOpen} />
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

        <div className="p-4 border-t border-white/5 shrink-0">
          <button onClick={() => authService.logout()} className="flex items-center w-full px-4 py-3 text-sm font-bold text-white/40 hover:text-white hover:bg-red-500/20 rounded-xl transition-all group">
            <LogOut size={18} className="min-w-[18px]" />
            <span className={`ml-3 transition-all duration-500 ${(isExpanded || isMobileOpen) ? 'opacity-100' : 'opacity-0 w-0'}`}>Sair</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden w-full relative">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 z-10 shrink-0">
            <div className="flex items-center">
                <button 
                  className="p-2 mr-4 text-slate-600 md:hidden hover:bg-slate-100 rounded-lg transition-colors"
                  onClick={() => setIsMobileOpen(true)}
                >
                  <Menu size={24} />
                </button>

                <button
                  onClick={() => setIsScannerOpen(true)}
                  className="flex items-center sm:gap-3 p-3 sm:px-4 sm:py-2.5 bg-white border border-slate-200 rounded-2xl text-slate-500 hover:text-[#302464] hover:border-[#302464]/50 transition-all shadow-sm group"
                >
                  <ScanLine size={20} />
                  <span className="hidden sm:inline font-bold text-sm">Localizar Ativo</span>
                </button>
            </div>
            
            <div className="flex items-center gap-2 md:gap-5 ml-auto">
                <NotificationBell />
                <div className="h-8 w-px bg-slate-200/50 hidden md:block"></div>

                <Link to="/perfil" className="flex items-center gap-2 md:gap-4 hover:opacity-80 transition-opacity">
                    <div className="text-right hidden lg:block">
                        <p className="text-sm font-bold text-slate-800 leading-tight">{userName}</p>
                        <p className="text-[10px] font-black text-[#7C69AF] uppercase tracking-widest">{userCargo || 'Colaborador'}</p>
                    </div>
                    
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-[#302464] text-white flex items-center justify-center font-black text-xs md:text-sm border-2 border-white overflow-hidden shadow-sm relative">
                        {userPhoto ? (
                          <img 
                               src={formatImgUrl(userPhoto)} 
                               alt="Perfil" 
                               className="w-full h-full object-cover absolute inset-0"
                               onError={(e) => { e.target.style.display = 'none'; }} 
                          />
                        ) : null}
                        
                        <span className={userPhoto ? 'hidden' : 'block'}>
                            {userName.substring(0, 2).toUpperCase()}
                        </span>
                    </div>
                </Link>
            </div>
        </header>
        
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-[#F8FAFC]">
          <div className="w-full max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {children}
          </div>
        </main>
      </div>
      <AtivoScanner isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} />
    </div>
  );
}