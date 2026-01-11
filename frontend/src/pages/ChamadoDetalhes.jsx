import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, User, MapPin, Calendar, Clock, 
  AlertCircle, Save, Truck, DollarSign, Users, 
  ChevronRight, Check, X, Settings, Info, Briefcase, AlertTriangle
} from 'lucide-react';

// SERVIÇOS
import chamadoService from '../services/chamadoService';
import equipeService from '../services/equipeService';
import clienteService from '../services/clienteService';

const STATUS_MAP = {
  ABERTO: { label: '🔓 Aberto', color: 'bg-emerald-50 text-emerald-600' },
  AGENDADO: { label: '📅 Agendado', color: 'bg-purple-50 text-[#7C69AF]' },
  EM_ANDAMENTO: { label: '🔨 Em Andamento', color: 'bg-blue-50 text-blue-600' },
  FINALIZADO: { label: '✅ Finalizado', color: 'bg-slate-100 text-slate-500' },
  CANCELADO: { label: '🚫 Cancelado', color: 'bg-red-50 text-red-600' },
};

export default function ChamadoDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [chamado, setChamado] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [tecnicos, setTecnicos] = useState([]);

  const [editData, setEditData] = useState({
    status: '',
    prioridade: '',
    data_agendamento: '',
    custo_transporte: 0
  });

  const carregarDados = useCallback(async () => {
    try {
      setLoading(true);
      const dadosChamado = await chamadoService.buscarPorId(id);
      setChamado(dadosChamado);
      
      setEditData({
        status: dadosChamado.status,
        prioridade: dadosChamado.prioridade,
        custo_transporte: dadosChamado.custo_transporte || 0,
        data_agendamento: dadosChamado.data_agendamento ? dadosChamado.data_agendamento.slice(0, 16) : ''
      });

      const promessas = [];
      if (dadosChamado.cliente) promessas.push(clienteService.buscarPorId(dadosChamado.cliente));
      if (dadosChamado.tecnicos?.length > 0) {
        dadosChamado.tecnicos.forEach(tId => promessas.push(equipeService.buscarPorId(tId)));
      }

      const resultados = await Promise.all(promessas);
      
      if (dadosChamado.cliente) {
        setCliente(resultados[0]);
        setTecnicos(resultados.slice(1).filter(t => t !== null));
      } else {
        setTecnicos(resultados.filter(t => t !== null));
      }
      
    } catch (error) {
      console.error("Erro ao carregar:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  const handleSalvar = async () => {
    try {
      await chamadoService.atualizar(id, editData);
      alert("Alterações salvas com sucesso!");
      carregarDados();
    } catch (error) {
      alert("Erro ao salvar.");
    }
  };

  const handleFinalizar = async () => {
    if (window.confirm("Deseja finalizar este chamado? Isso processará os custos técnicos no financeiro.")) {
      try {
        await chamadoService.finalizar(id);
        alert("Chamado Finalizado!");
        carregarDados();
      } catch (error) {
        alert("Erro ao finalizar.");
      }
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-[#7C69AF] rounded-full animate-spin"></div>
        <p className="text-[#7C69AF] font-black text-[10px] uppercase tracking-[0.2em]">Sincronizando Cyrius...</p>
    </div>
  );

  if (!chamado) return <div className="p-20 text-center text-red-500 font-bold">Chamado não encontrado.</div>;

  const isVisita = chamado.tipo_atendimento === 'VISITA';

  return (
    <div className="max-w-6xl mx-auto pb-20 animate-in fade-in duration-500">
      
      {/* HEADER / AÇÕES */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <button onClick={() => navigate('/chamados')} className="flex items-center gap-2 text-slate-400 hover:text-[#302464] font-black text-xs uppercase tracking-widest transition-all group">
          <div className="p-2 bg-white rounded-xl shadow-sm group-hover:shadow-md border border-slate-100"><ArrowLeft size={18} /></div>
          Voltar para Lista
        </button>

        <div className="flex items-center gap-3 w-full sm:w-auto">
            {chamado.status !== 'FINALIZADO' && (
                <button 
                  onClick={handleFinalizar}
                  className="flex-1 sm:flex-none bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-black shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                >
                  <Check size={18} /> Finalizar
                </button>
            )}
            <button 
              onClick={handleSalvar}
              className="flex-1 sm:flex-none bg-[#302464] hover:bg-[#7C69AF] text-white px-6 py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-black shadow-xl shadow-purple-900/20 transition-all"
            >
              <Save size={18} /> Salvar Alterações
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* COLUNA CENTRAL */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden">
            <div className={`absolute top-0 right-0 px-6 py-2 rounded-bl-3xl text-[10px] font-black uppercase tracking-widest
                ${STATUS_MAP[chamado.status]?.color || 'bg-slate-100 text-slate-500'}`}>
                {chamado.status.replace('_', ' ')}
            </div>

            <div className="flex items-center gap-3 mb-4">
              <span className="text-slate-300 font-black tracking-tighter text-xl">#{chamado.protocolo}</span>
              <div className="h-1 w-1 rounded-full bg-slate-200"></div>
              <span className="text-[10px] font-black text-[#7C69AF] uppercase tracking-widest">
                {isVisita ? 'Atendimento Field Service' : 'Suporte Remoto'}
              </span>
            </div>

            <h1 className="text-3xl font-black text-slate-800 mb-6 leading-tight">{chamado.titulo}</h1>
            
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-slate-600 text-sm leading-relaxed whitespace-pre-wrap font-medium">
              {chamado.descricao_detalhada}
            </div>

            <div className="flex flex-wrap gap-8 mt-8 pt-8 border-t border-slate-50">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-purple-50 rounded-xl text-[#7C69AF]"><Clock size={18} /></div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Abertura</p>
                        <p className="text-sm font-bold text-slate-700">{new Date(chamado.created_at).toLocaleString('pt-BR')}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-purple-50 rounded-xl text-[#7C69AF]"><Info size={18} /></div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Origem</p>
                        <p className="text-sm font-bold text-slate-700">{chamado.origem}</p>
                    </div>
                </div>
            </div>
          </div>

          {/* ÁREA DE VISITA TÉCNICA - Usando Gradiente Cyrius */}
          {isVisita && (
              <div className="bg-gradient-to-br from-[#302464] to-[#7C69AF] p-8 rounded-[2.5rem] text-white shadow-xl shadow-purple-900/20 relative overflow-hidden">
                  <Truck className="absolute -right-4 -bottom-4 text-white opacity-10" size={120} />
                  <h3 className="text-lg font-black mb-6 flex items-center gap-2 uppercase tracking-widest text-[#A696D1]">
                    <Calendar size={20} /> Agendamento da Visita
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-[#A696D1] uppercase tracking-[0.2em] ml-1">Data e Hora Programada</label>
                        <input 
                          type="datetime-local" 
                          className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3 outline-none focus:bg-white focus:text-[#302464] transition-all font-bold"
                          value={editData.data_agendamento}
                          onChange={e => setEditData({...editData, data_agendamento: e.target.value})}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-[#A696D1] uppercase tracking-[0.2em] ml-1">Deslocamento (R$)</label>
                        <input 
                          type="number"
                          className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3 outline-none focus:bg-white focus:text-[#302464] transition-all font-bold"
                          value={editData.custo_transporte}
                          onChange={e => setEditData({...editData, custo_transporte: e.target.value})}
                        />
                    </div>
                  </div>
              </div>
          )}
        </div>

        {/* COLUNA LATERAL */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* CONTROLE DE STATUS */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Settings size={14} className="text-[#7C69AF]" /> Gestão do Status
              </h3>
              <div className="space-y-4">
                  <select 
                    value={editData.status} 
                    onChange={e => setEditData({...editData, status: e.target.value})}
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 text-sm font-black text-slate-700 outline-none focus:ring-4 focus:ring-purple-500/5 cursor-pointer"
                  >
                    {Object.entries(STATUS_MAP).map(([key, value]) => (
                      <option key={key} value={key}>{value.label}</option>
                    ))}
                  </select>

                  <select 
                    value={editData.prioridade} 
                    onChange={e => setEditData({...editData, prioridade: e.target.value})}
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 text-sm font-black text-slate-700 outline-none focus:ring-4 focus:ring-purple-500/5 cursor-pointer"
                  >
                    <option value="BAIXA">🔵 Baixa</option>
                    <option value="MEDIA">🟡 Média</option>
                    <option value="ALTA">🟠 Alta</option>
                    <option value="CRITICA">🔴 CRÍTICA</option>
                  </select>
              </div>
          </div>

          {/* INFO CLIENTE */}
          {cliente && (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Briefcase size={14} className="text-[#7C69AF]" /> Solicitante
              </h3>
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#302464] rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg shadow-purple-900/10">
                        {cliente.razao_social.charAt(0)}
                    </div>
                    <div>
                        <p className="text-sm font-black text-slate-800 leading-tight">{cliente.razao_social}</p>
                        <p className="text-[10px] font-bold text-slate-400">{cliente.cnpj || 'Sem Documento'}</p>
                    </div>
                </div>
                
                <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <MapPin size={18} className="text-[#7C69AF] shrink-0" />
                  <p className="text-[11px] text-slate-600 font-bold leading-relaxed">{cliente.endereco}</p>
                </div>

                <button 
                    onClick={() => navigate(`/clientes/${cliente.id}`)}
                    className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#7C69AF] border border-slate-100 hover:border-[#A696D1] rounded-2xl transition-all"
                >
                    Acessar Ficha Técnica <ChevronRight size={12} className="inline ml-1" />
                </button>
              </div>
            </div>
          )}

          {/* EQUIPE */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Users size={14} className="text-[#7C69AF]" /> Equipe Designada
              </h3>
              <div className="space-y-3">
                 {tecnicos.length > 0 ? tecnicos.map(tec => (
                     <div key={tec.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-transparent hover:border-purple-100 transition-all group">
                        <div className="w-8 h-8 bg-[#302464] rounded-lg flex items-center justify-center text-white text-[10px] font-black group-hover:bg-[#7C69AF] transition-colors">
                            {tec.nome.charAt(0)}
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-800">{tec.nome}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{tec.cargo}</p>
                        </div>
                     </div>
                 )) : (
                     <div className="text-center py-6 border-2 border-dashed border-slate-50 rounded-3xl text-slate-300 text-[10px] font-black uppercase tracking-widest">
                        Sem técnicos
                     </div>
                 )}
              </div>
          </div>
        </div>
      </div>
    </div>
  );
}