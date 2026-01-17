import { useState, useEffect, useRef } from 'react';
import { Bell, Check, ExternalLink, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api'; // Seu axios configurado

export default function NotificationBell() {
  const [notificacoes, setNotificacoes] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  const carregarNotificacoes = async () => {
    try {
      const res = await api.get('/notificacoes/');
      setNotificacoes(res.data);
      setUnreadCount(res.data.filter(n => !n.lida).length);
    } catch (error) {
      console.error("Erro ao buscar notificações");
    }
  };

  // Polling: Verifica a cada 60 segundos
  useEffect(() => {
    carregarNotificacoes();
    const interval = setInterval(carregarNotificacoes, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fecha ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuRef]);

  const handleMarcarLida = async (id, e) => {
    e.stopPropagation();
    try {
      await api.patch(`/notificacoes/${id}/marcar_como_lida/`);
      carregarNotificacoes();
    } catch (err) { console.error(err); }
  };

  const handleClickNotificacao = (n) => {
    if (!n.lida) handleMarcarLida(n.id, { stopPropagation: () => {} });
    if (n.link) {
      setIsOpen(false);
      navigate(n.link);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-[#302464] transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
          <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-[#302464] text-white">
            <h4 className="font-bold text-xs uppercase tracking-widest">Notificações</h4>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">{unreadCount} novas</span>
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {notificacoes.length === 0 ? (
              <p className="p-8 text-center text-slate-400 text-xs">Sem notificações.</p>
            ) : (
              notificacoes.map(notif => (
                <div 
                  key={notif.id}
                  onClick={() => handleClickNotificacao(notif)}
                  className={`p-4 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors flex gap-3 ${notif.lida ? 'opacity-60' : 'bg-purple-50/30'}`}
                >
                  <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${notif.tipo === 'CHURN' ? 'bg-red-500' : 'bg-[#7C69AF]'}`}></div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-700">{notif.titulo}</p>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{notif.mensagem}</p>
                    <p className="text-[9px] text-slate-300 mt-2 font-bold uppercase">{new Date(notif.data_criacao).toLocaleString()}</p>
                  </div>
                  {!notif.lida && (
                     <button onClick={(e) => handleMarcarLida(notif.id, e)} className="text-slate-300 hover:text-[#302464]" title="Marcar como lida">
                        <Check size={14}/>
                     </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}