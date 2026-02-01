import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, MapPin, Calendar, Clock, 
  Save, Truck, Check, Settings, 
  Info, Briefcase, Users, History 
} from 'lucide-react';

import chamadoService from '../services/chamadoService';
import equipeService from '../services/equipeService';
import clienteService from '../services/clienteService';
import ModalFinalizar from '../components/ModalFinalizar';

const STATUS_MAP = {
  ABERTO: { label: '🔓 Aberto', color: 'bg-emerald-50 text-emerald-600' },
  AGENDADO: { label: '📅 Agendado', color: 'bg-purple-50 text-[#7C69AF]' },
  EM_ANDAMENTO: { label: '🔨 Em Andamento', color: 'bg-blue-50 text-blue-600' },
  FINALIZADO: { label: '✅ Finalizado', color: 'bg-slate-100 text-slate-500' },
  CANCELADO: { label: '🚫 Cancelado', color: 'bg-red-50 text-red-600' },
};

const PRIORIDADE_MAP = {
  BAIXA: { label: '🟢 Baixa', color: 'text-emerald-600' },
  MEDIA: { label: '🟡 Média', color: 'text-amber-600' },
  ALTA: { label: '🔴 Alta', color: 'text-red-600' },
  CRITICA: { label: '🔥 Crítica', color: 'text-rose-700 font-bold' }
};

export default function ChamadoDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  const [chamado, setChamado] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [tecnicos, setTecnicos] = useState([]);
  const [isFinalizarOpen, setIsFinalizarOpen] = useState(false);

  const [editData, setEditData] = useState({
    status: '', 
    prioridade: '', 
    data_agendamento: '',
    custo_ida: 0, 
    custo_volta: 0
  });

  const custoTotal = useMemo(() => {
    const ida = parseFloat(editData.custo_ida) || 0;
    const volta = parseFloat(editData.custo_volta) || 0;
    return ida + volta;
  }, [editData.custo_ida, editData.custo_volta]);

  const carregarDados = useCallback(async () => {
    try {
      setLoading(true);
      const dados = await chamadoService.buscarPorId(id);
      setChamado(dados);
      setCliente(dados.cliente); // O serializer já manda 'nome_exibicao' aqui dentro
      setTecnicos(dados.tecnicos || []);

      setEditData({
        status: dados.status,
        prioridade: dados.prioridade,
        custo_ida: dados.custo_ida || 0,
        custo_volta: dados.custo_volta || 0,
        data_agendamento: dados.data_agendamento ? dados.data_agendamento.slice(0, 16) : ''
      });
    } catch (error) { 
      console.error("Erro ao carregar detalhes:", error);
    } finally { 
      setLoading(false); 
    }
  }, [id]);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  const handleSalvar = async () => {
    try {
      const payload = { ...editData };
      if (!payload.data_agendamento) payload.data_agendamento = null;
      await chamadoService.atualizar(id, payload);
      alert("Atualizado com sucesso!");
      carregarDados();
    } catch (error) { 
      console.error(error);
      alert("Erro ao salvar alterações."); 
    }
  };

  const handleConfirmarFinalizacao = async (dadosFinalizacao) => {
    try {
      await chamadoService.finalizar(id, dadosFinalizacao);
      alert("Chamado finalizado com sucesso!");
      setIsFinalizarOpen(false);
      carregarDados();
    } catch (error) {
      console.error(error);
      alert("Erro ao finalizar chamado.");
    }
  };

  if (loading) return <div className="p-20 text-center animate-pulse font-black text-[#7C69AF]">Carregando chamado...</div>;
  if (!chamado) return <div className="p-20 text-center text-slate-400">Chamado não encontrado.</div>;

  const isVisita = chamado.tipo_atendimento === 'VISITA';

  return (
    <div className="max-w-6xl mx-auto pb-10 sm:pb-20 animate-in fade-in duration-500 px-2 sm:px-0">
      
      {/* HEADER RESPONSIVO */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 sm:mb-8 px-2 sm:px-0">
        <button 
          onClick={() => navigate('/chamados')} 
          className="flex items-center gap-2 text-slate-400 hover:text-[#302464] font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] transition-all p-2 -ml-2"
        >
          <ArrowLeft size={18} /> Voltar
        </button>
        
        <div className="flex flex-row gap-2 sm:gap-3 w-full md:w-auto">
            {chamado.status !== 'FINALIZADO' && (
              <button 
                onClick={() => setIsFinalizarOpen(true)} 
                className="flex-1 bg-emerald-500 text-white px-4 py-3.5 rounded-2xl font-black text-xs sm:text-sm shadow-lg active:scale-95 flex items-center justify-center gap-2"
              >
                <Check size={18} /> Finalizar
              </button>
            )}
            <button 
              onClick={handleSalvar} 
              className="flex-1 bg-[#302464] text-white px-4 py-3.5 rounded-2xl font-black text-xs sm:text-sm shadow-xl active:scale-95 flex items-center justify-center gap-2"
            >
              <Save size={18} /> Salvar
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        
        {/* COLUNA PRINCIPAL */}
        <div className="lg:col-span-8 space-y-6">
          
          <div className="bg-white p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-sm border border-slate-100 relative">
            <div className={`absolute top-0 right-0 px-4 sm:px-6 py-2 rounded-bl-2xl sm:rounded-bl-3xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest ${STATUS_MAP[chamado.status]?.color || 'bg-slate-100'}`}>
              {chamado.status.replace('_', ' ')}
            </div>
            
            <div className="flex items-center gap-3 mb-4 mt-4 sm:mt-0">
              <span className="text-slate-300 font-black text-lg sm:text-xl">#{chamado.protocolo}</span>
              <span className="text-[9px] font-black text-[#7C69AF] uppercase tracking-widest border border-purple-100 px-2 py-1 rounded-lg">
                {isVisita ? 'Field Service' : 'Remoto'}
              </span>
            </div>
            
            <h1 className="text-xl sm:text-3xl font-black text-slate-800 mb-6 leading-tight">
              {chamado.titulo}
            </h1>
            
            <div className="bg-slate-50 p-5 sm:p-6 rounded-2xl sm:rounded-3xl text-slate-600 text-sm font-medium whitespace-pre-wrap border border-slate-100 leading-relaxed">
              {chamado.descricao_detalhada || "Sem descrição detalhada."}
            </div>

            {chamado.status === 'FINALIZADO' && chamado.resolucao && (
               <div className="mt-6 bg-emerald-50 p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-emerald-100">
                  <h3 className="text-emerald-700 font-black text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Check size={14}/> Resolução Técnica
                  </h3>
                  <p className="text-emerald-800 text-sm font-medium whitespace-pre-wrap">{chamado.resolucao}</p>
               </div>
            )}

            {/* GRID DE DATAS RESPONSIVO */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8 pt-8 border-t border-slate-50">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-purple-50 rounded-xl text-[#7C69AF]"><Clock size={18} /></div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Abertura</p>
                    <p className="text-xs sm:text-sm font-bold text-slate-700">{new Date(chamado.created_at).toLocaleString('pt-BR')}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-50 rounded-xl text-blue-500"><History size={18} /></div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Atualização</p>
                    <p className="text-xs sm:text-sm font-bold text-slate-700">{new Date(chamado.updated_at).toLocaleString('pt-BR')}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-purple-50 rounded-xl text-[#7C69AF]"><Info size={18} /></div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Origem</p>
                    <p className="text-xs sm:text-sm font-bold text-slate-700">{chamado.origem}</p>
                  </div>
                </div>
            </div>
          </div>

          {/* CARD DE CUSTOS RESPONSIVO */}
          {isVisita && (
              <div className="bg-gradient-to-br from-[#302464] to-[#7C69AF] p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
                  <Truck className="absolute -right-4 -bottom-4 text-white opacity-10 hidden sm:block" size={120} />
                  
                  <h3 className="text-base sm:text-lg font-black mb-6 uppercase tracking-widest text-[#A696D1] flex items-center gap-2">
                    <Calendar size={20} /> Agendamento e Custos
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-6 relative z-10">
                    <div>
                      <label className="text-[9px] font-black text-[#A696D1] uppercase tracking-widest mb-2 block">Data da Visita</label>
                      <input 
                        type="datetime-local" 
                        disabled={chamado.status === 'FINALIZADO'}
                        className="w-full bg-white/10 border border-white/20 rounded-xl sm:rounded-2xl px-4 py-3.5 font-bold focus:bg-white focus:text-[#302464] transition-all outline-none disabled:opacity-50 text-sm" 
                        value={editData.data_agendamento} 
                        onChange={e => setEditData({...editData, data_agendamento: e.target.value})} 
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-2 bg-white/10 p-4 rounded-2xl border border-white/20 backdrop-blur-sm">
                        <div className="flex flex-col">
                          <label className="text-[8px] font-black uppercase text-[#A696D1] mb-1">Ida (R$)</label>
                          <input 
                            type="number" step="0.01" min="0"
                            disabled={chamado.status === 'FINALIZADO'}
                            className="w-full bg-transparent border-b border-white/30 text-left sm:text-center font-bold outline-none focus:border-white transition-colors disabled:opacity-50" 
                            value={editData.custo_ida} 
                            onChange={e => setEditData({...editData, custo_ida: e.target.value})} 
                          />
                        </div>
                        <div className="flex flex-col">
                          <label className="text-[8px] font-black uppercase text-[#A696D1] mb-1">Volta (R$)</label>
                          <input 
                            type="number" step="0.01" min="0"
                            disabled={chamado.status === 'FINALIZADO'}
                            className="w-full bg-transparent border-b border-white/30 text-left sm:text-center font-bold outline-none focus:border-white transition-colors disabled:opacity-50" 
                            value={editData.custo_volta} 
                            onChange={e => setEditData({...editData, custo_volta: e.target.value})} 
                          />
                        </div>
                        <div className="col-span-2 sm:col-span-1 text-right pt-3 sm:pt-0 border-t sm:border-t-0 sm:border-l border-white/10">
                          <p className="text-[8px] font-black uppercase text-[#A696D1]">Total Visita</p>
                          <p className="text-base sm:text-lg font-black text-white">R$ {custoTotal.toFixed(2)}</p>
                        </div>
                    </div>
                  </div>
              </div>
          )}
        </div>

        {/* COLUNA LATERAL - EMPILHA NO MOBILE */}
        <div className="lg:col-span-4 space-y-6">
          
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Settings size={14} /> Painel de Controle
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 ml-1 mb-1 block uppercase tracking-tighter">Status</label>
                <select 
                  value={editData.status} 
                  onChange={e => setEditData({...editData, status: e.target.value})} 
                  disabled={chamado.status === 'FINALIZADO'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#7C69AF]/20 disabled:opacity-50 text-sm"
                >
                  {Object.entries(STATUS_MAP).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 ml-1 mb-1 block uppercase tracking-tighter">Prioridade</label>
                <select 
                  value={editData.prioridade} 
                  onChange={e => setEditData({...editData, prioridade: e.target.value})} 
                  disabled={chamado.status === 'FINALIZADO'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#7C69AF]/20 disabled:opacity-50 text-sm"
                >
                  {Object.entries(PRIORIDADE_MAP).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {cliente && (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Briefcase size={14} /> Cliente
              </h3>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center text-[#302464] font-black text-xl shrink-0">
                  {/* Pega a inicial do nome correto */}
                  {(cliente.nome_exibicao || cliente.razao_social).charAt(0)}
                </div>
                <div className="min-w-0">
                  {/* AQUI ESTÁ A ALTERAÇÃO: Usa nome_exibicao (Fantasia) se existir, senão Razão */}
                  <p className="font-black text-slate-800 text-sm leading-tight truncate">
                      {cliente.nome_exibicao || cliente.razao_social}
                  </p>
                  
                  {/* Se for fantasia, mostra a razão social embaixo em cinza */}
                  {cliente.nome_fantasia && (
                       <p className="text-[10px] text-slate-400 font-bold uppercase truncate">{cliente.razao_social}</p>
                  )}
                  
                  <p className="text-[9px] text-slate-400 font-bold uppercase truncate">{cliente.cnpj_cpf}</p>
                  <span className={`text-[8px] px-2 py-0.5 rounded font-black uppercase mt-1 inline-block ${cliente.tipo_cliente === 'AVULSO' ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    {cliente.tipo_cliente || 'CONTRATO'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-500 font-medium flex items-start gap-2 bg-slate-50 p-4 rounded-2xl leading-relaxed">
                <MapPin size={16} className="shrink-0 mt-0.5 text-[#7C69AF]"/> 
                {cliente.endereco}
              </p>
            </div>
          )}

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Users size={14} /> Equipe Técnica
              </h3>
              {tecnicos.length > 0 ? (
                <div className="space-y-3">
                  {tecnicos.map(tec => (
                    <div key={tec.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 group">
                      <div className="w-8 h-8 rounded-full bg-[#302464] flex items-center justify-center text-white font-bold text-xs shrink-0 group-hover:scale-110 transition-transform">
                        {tec.nome.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-700 truncate">{tec.nome}</p>
                        <p className="text-[9px] text-slate-400 uppercase font-black">{tec.cargo}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 bg-slate-50 rounded-2xl border-dashed border border-slate-200">
                  <p className="text-[10px] text-slate-400 font-black uppercase">Sem técnicos</p>
                </div>
              )}
          </div>

        </div>
      </div>

      {/* MODAL DE FINALIZAÇÃO */}
      {chamado && (
          <ModalFinalizar 
            isOpen={isFinalizarOpen}
            onClose={() => setIsFinalizarOpen(false)}
            onConfirm={handleConfirmarFinalizacao}
            chamado={{...chamado, cliente_detalhes: cliente}} 
          />
      )}

    </div>
  );
}