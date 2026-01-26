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
import ModalFinalizar from '../components/ModalFinalizar'; // <--- 1. IMPORTAÇÃO DO MODAL

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
  
  // Dados Principais
  const [chamado, setChamado] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [tecnicos, setTecnicos] = useState([]);

  // Estado do Modal de Finalização
  const [isFinalizarOpen, setIsFinalizarOpen] = useState(false); // <--- 2. ESTADO DO MODAL

  // Estado de Edição (Painel Lateral e Custos)
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
    
    // Como usamos depth=1, 'dados' já contém o objeto cliente e a lista de objetos técnicos
    setChamado(dados);
    setCliente(dados.cliente); // Já é o objeto completo
    setTecnicos(dados.tecnicos || []); // Já são os objetos completos [{nome, cargo...}]

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

  // Salvar edições parciais (Custos, Prioridade, Status manual)
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

  // 3. NOVA FUNÇÃO DE FINALIZAÇÃO (Chamada pelo Modal)
  const handleConfirmarFinalizacao = async (dadosFinalizacao) => {
    try {
      // O service.finalizar agora aceita o objeto com { resolucao, valor_servico }
      await chamadoService.finalizar(id, dadosFinalizacao);
      
      alert("Chamado finalizado com sucesso!");
      setIsFinalizarOpen(false); // Fecha modal
      carregarDados(); // Recarrega tela
    } catch (error) {
      console.error(error);
      alert("Erro ao finalizar chamado.");
    }
  };

  if (loading) return <div className="p-20 text-center animate-pulse font-black text-[#7C69AF]">Carregando chamado...</div>;
  if (!chamado) return <div className="p-20 text-center text-slate-400">Chamado não encontrado.</div>;

  const isVisita = chamado.tipo_atendimento === 'VISITA';

  return (
    <div className="max-w-6xl mx-auto pb-20 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <button onClick={() => navigate('/chamados')} className="flex items-center gap-2 text-slate-400 hover:text-[#302464] font-black text-xs uppercase tracking-widest transition-all">
          <ArrowLeft size={18} /> Voltar
        </button>
        <div className="flex items-center gap-3 w-full sm:w-auto">
            {chamado.status !== 'FINALIZADO' && (
              // 4. BOTÃO AGORA ABRE O MODAL
              <button 
                onClick={() => setIsFinalizarOpen(true)} 
                className="flex-1 sm:flex-none bg-emerald-500 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-lg hover:bg-emerald-600 transition-all active:scale-95"
              >
                <Check size={18} className="inline mr-2"/> Finalizar
              </button>
            )}
            <button onClick={handleSalvar} className="flex-1 sm:flex-none bg-[#302464] text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl hover:bg-[#7C69AF] transition-all active:scale-95">
              <Save size={18} className="inline mr-2"/> Salvar
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* COLUNA PRINCIPAL */}
        <div className="lg:col-span-8 space-y-6">
          
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 relative">
            <div className={`absolute top-0 right-0 px-6 py-2 rounded-bl-3xl text-[10px] font-black uppercase tracking-widest ${STATUS_MAP[chamado.status]?.color || 'bg-slate-100'}`}>
              {chamado.status.replace('_', ' ')}
            </div>
            
            <div className="flex items-center gap-3 mb-4">
              <span className="text-slate-300 font-black text-xl">#{chamado.protocolo}</span>
              <span className="text-[10px] font-black text-[#7C69AF] uppercase tracking-widest border border-purple-100 px-2 py-1 rounded-lg">
                {isVisita ? 'Field Service' : 'Remoto'}
              </span>
            </div>
            
            <h1 className="text-3xl font-black text-slate-800 mb-6 leading-tight">{chamado.titulo}</h1>
            
            <div className="bg-slate-50 p-6 rounded-3xl text-slate-600 text-sm font-medium whitespace-pre-wrap border border-slate-100">
              {chamado.descricao_detalhada || "Sem descrição detalhada."}
            </div>

            {/* SE FINALIZADO: MOSTRAR A RESOLUÇÃO */}
            {chamado.status === 'FINALIZADO' && chamado.resolucao && (
               <div className="mt-6 bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                  <h3 className="text-emerald-700 font-black text-xs uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Check size={14}/> Resolução Técnica
                  </h3>
                  <p className="text-emerald-800 text-sm font-medium whitespace-pre-wrap">{chamado.resolucao}</p>
               </div>
            )}

            {/* BARRA DE DATAS */}
            <div className="flex flex-wrap gap-8 mt-8 pt-8 border-t border-slate-50">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-purple-50 rounded-xl text-[#7C69AF]"><Clock size={18} /></div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Abertura</p>
                    <p className="text-sm font-bold text-slate-700">{new Date(chamado.created_at).toLocaleString('pt-BR')}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-50 rounded-xl text-blue-500"><History size={18} /></div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Última Atualização</p>
                    <p className="text-sm font-bold text-slate-700">{new Date(chamado.updated_at).toLocaleString('pt-BR')}</p>
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

          {/* CARD DE CUSTOS (VISITA) */}
          {isVisita && (
              <div className="bg-gradient-to-br from-[#302464] to-[#7C69AF] p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden group">
                  <Truck className="absolute -right-4 -bottom-4 text-white opacity-10 group-hover:opacity-20 transition-opacity duration-500" size={120} />
                  
                  <h3 className="text-lg font-black mb-6 uppercase tracking-widest text-[#A696D1] flex items-center gap-2">
                    <Calendar size={20} /> Agendamento e Custos
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                    <div>
                      <label className="text-[10px] font-black text-[#A696D1] uppercase tracking-widest mb-1 block">Data da Visita</label>
                      <input 
                        type="datetime-local" 
                        disabled={chamado.status === 'FINALIZADO'}
                        className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3 font-bold focus:bg-white focus:text-[#302464] transition-all outline-none disabled:opacity-50" 
                        value={editData.data_agendamento} 
                        onChange={e => setEditData({...editData, data_agendamento: e.target.value})} 
                      />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 bg-white/10 p-4 rounded-2xl border border-white/20 backdrop-blur-sm">
                        <div>
                          <label className="text-[8px] font-black uppercase text-[#A696D1] block mb-1">Ida (R$)</label>
                          <input 
                            type="number" step="0.01" min="0"
                            disabled={chamado.status === 'FINALIZADO'}
                            className="w-full bg-transparent border-b border-white/30 text-center font-bold outline-none focus:border-white transition-colors disabled:opacity-50" 
                            value={editData.custo_ida} 
                            onChange={e => setEditData({...editData, custo_ida: e.target.value})} 
                          />
                        </div>
                        <div>
                          <label className="text-[8px] font-black uppercase text-[#A696D1] block mb-1">Volta (R$)</label>
                          <input 
                            type="number" step="0.01" min="0"
                            disabled={chamado.status === 'FINALIZADO'}
                            className="w-full bg-transparent border-b border-white/30 text-center font-bold outline-none focus:border-white transition-colors disabled:opacity-50" 
                            value={editData.custo_volta} 
                            onChange={e => setEditData({...editData, custo_volta: e.target.value})} 
                          />
                        </div>
                        <div className="text-right pl-2 border-l border-white/10">
                          <p className="text-[8px] font-black uppercase text-[#A696D1]">Total</p>
                          <p className="text-lg font-black text-white">R$ {custoTotal.toFixed(2)}</p>
                        </div>
                    </div>
                  </div>
              </div>
          )}
        </div>

        {/* COLUNA LATERAL */}
        <div className="lg:col-span-4 space-y-6">
          
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Settings size={14} /> Controle
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 ml-1 mb-1 block">Status Atual</label>
                <select 
                  value={editData.status} 
                  onChange={e => setEditData({...editData, status: e.target.value})} 
                  disabled={chamado.status === 'FINALIZADO'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#7C69AF]/20 disabled:opacity-50"
                >
                  {Object.entries(STATUS_MAP).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 ml-1 mb-1 block">Prioridade</label>
                <select 
                  value={editData.prioridade} 
                  onChange={e => setEditData({...editData, prioridade: e.target.value})} 
                  disabled={chamado.status === 'FINALIZADO'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#7C69AF]/20 disabled:opacity-50"
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
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-[#302464] font-black text-lg">
                  {cliente.razao_social.charAt(0)}
                </div>
                <div>
                  <p className="font-black text-slate-800 text-sm leading-tight">{cliente.razao_social}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{cliente.cnpj_cpf}</p>
                  {/* Badge de Contrato/Avulso */}
                  <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase mt-1 inline-block ${cliente.tipo_cliente === 'AVULSO' ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    {cliente.tipo_cliente || 'CONTRATO'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-500 font-medium flex items-start gap-2 bg-slate-50 p-3 rounded-xl">
                <MapPin size={14} className="shrink-0 mt-0.5 text-[#7C69AF]"/> 
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
                   <div key={tec.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl transition-colors">
                     <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs">
                       {tec.nome.charAt(0)}
                     </div>
                     <div className="flex-1">
                       <p className="text-sm font-bold text-slate-700">{tec.nome}</p>
                       <p className="text-[10px] text-slate-400 uppercase font-bold">{tec.cargo}</p>
                     </div>
                   </div>
                 ))}
               </div>
             ) : (
               <div className="text-center py-4 bg-slate-50 rounded-2xl border-dashed border border-slate-200">
                 <p className="text-xs text-slate-400 font-medium">Nenhum técnico atribuído</p>
               </div>
             )}
          </div>

        </div>
      </div>

      {/* 5. RENDERIZAÇÃO DO MODAL */}
      {/* Passamos o cliente dentro do prop chamado para o modal conseguir detectar se é AVULSO */}
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