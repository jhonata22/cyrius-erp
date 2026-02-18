import { useState, useEffect, useRef } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import equipeService from '../services/equipeService';

export default function NotificationBell() {
  const [notificacoes, setNotificacoes] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userId, setUserId] = useState(null);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    equipeService.me()
      .then(user => {
        // A MÁGICA ESTÁ AQUI: Prioridade total para o usuario_id
        const idParaConectar = user.usuario_id || user.id; 
        
        console.log("🔌 Tentando conectar ao canal do usuário:", idParaConectar);
        setUserId(idParaConectar); // Certifique-se que o estado userId mude para 8
      })
      .catch(err => console.error("Erro ao buscar perfil:", err));
  }, []);

  // 2. Busca o histórico de notificações antigas via API
  const carregarNotificacoes = async () => {
    try {
      const res = await api.get('/notificacoes/');
      setNotificacoes(res.data);
      setUnreadCount(res.data.filter(n => !n.lida).length);
    } catch (error) {
      console.error("Erro ao buscar histórico de notificações", error);
    }
  };

  useEffect(() => {
    carregarNotificacoes();
  }, []);

  // 3. Conexão WebSocket para receber notificações EM TEMPO REAL
  useEffect(() => {
    // Só tenta conectar se já souber quem é o usuário
    if (!userId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/notificacoes/${userId}/`);

    ws.onopen = () => {
      console.log('🔌 WebSocket conectado com sucesso!');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("🔔 Nova notificação recebida via WebSocket:", data);
      
      // Dependendo de como o backend envia, pode estar dentro de 'message'
      const novaNotificacao = data.message || data; 

      // Adiciona a nova notificação no topo da lista e aumenta o contador
      setNotificacoes(prev => [novaNotificacao, ...prev]);
      setUnreadCount(prev => prev + 1);
    };

    ws.onclose = () => {
      console.log('🔌 WebSocket desconectado');
    };

    ws.onerror = (error) => {
      console.error('🔌 Erro no WebSocket:', error);
    };

    // Limpa a conexão quando o usuário sai do sistema
    return () => {
      ws.close();
    };
  }, [userId]);

  // Fecha o dropdown ao clicar em qualquer lugar fora dele
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuRef]);

  // Marca a notificação como lida no Banco de Dados e na Tela
  const handleMarcarLida = async (id, e) => {
    e.stopPropagation(); // Evita que o clique abra o link da notificação
    try {
      await api.patch(`/notificacoes/${id}/marcar_como_lida/`);
      // Atualiza a tela instantaneamente
      setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) { 
      console.error("Erro ao marcar como lida", err); 
    }
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
        className="relative p-2 text-slate-400 hover:text-[#302464] transition-colors focus:outline-none"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex min-w-[16px] h-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white px-1 shadow-sm border border-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
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
              <p className="p-8 text-center text-slate-400 text-xs font-bold">Sem notificações.</p>
            ) : (
              notificacoes.map(notif => (
                <div 
                  key={notif.id || Math.random()} // Fallback caso o websocket não mande ID
                  onClick={() => handleClickNotificacao(notif)}
                  className={`p-4 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors flex gap-3 ${notif.lida ? 'opacity-60' : 'bg-purple-50/30'}`}
                >
                  <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${notif.tipo === 'CHURN' ? 'bg-red-500' : 'bg-[#7C69AF]'}`}></div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-700">{notif.titulo}</p>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{notif.mensagem}</p>
                    <p className="text-[9px] text-slate-300 mt-2 font-bold uppercase">
                      {notif.data_criacao ? new Date(notif.data_criacao).toLocaleString() : 'Agora mesmo'}
                    </p>
                  </div>
                  {!notif.lida && (
                     <button onClick={(e) => handleMarcarLida(notif.id, e)} className="text-slate-300 hover:text-[#302464] transition-colors" title="Marcar como lida">
                        <Check size={16}/>
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