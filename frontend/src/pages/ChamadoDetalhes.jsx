import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useChamados } from '../contexts/ChamadosContext';
import { 
  ArrowLeft, MapPin, Calendar, Clock, 
  Save, Truck, Check, Settings, 
  Info, Briefcase, Users, History, Building2, 
  Trash2, Plus, AlertTriangle, Monitor
} from 'lucide-react';

import chamadoService from '../services/chamadoService';
import equipeService from '../services/equipeService';
// import clienteService from '../services/clienteService'; // Não usado diretamente se o chamado já traz o cliente
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
  const { carregarDados: recarregarLista } = useChamados();
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  const [chamado, setChamado] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [relacionados, setRelacionados] = useState([]);
  
  // Listas para seleção
  const [todosTecnicos, setTodosTecnicos] = useState([]); // Lista completa para o select
  const [tecnicosSelecionados, setTecnicosSelecionados] = useState([]); // Objetos dos técnicos do chamado

  const [isFinalizarOpen, setIsFinalizarOpen] = useState(false);

  const [editData, setEditData] = useState({
    status: '', 
    prioridade: '', 
    data_agendamento: '',
    custo_ida: 0, 
    custo_volta: 0,
    tecnico: '', // ID do técnico responsável
    tecnicos: [] // Array de IDs da equipe
  });

  const custoTotal = useMemo(() => {
    const ida = parseFloat(editData.custo_ida) || 0;
    const volta = parseFloat(editData.custo_volta) || 0;
    return ida + volta;
  }, [editData.custo_ida, editData.custo_volta]);

  const carregarDados = useCallback(async () => {
    try {
      setLoading(true);
      // Busca o chamado
      const dados = await chamadoService.buscarPorId(id);

      // Busca relacionados
      const dadosRelacionados = await chamadoService.listarRelacionados(id);
      setRelacionados(dadosRelacionados);
      
      // Busca lista completa de técnicos daquela empresa para permitir adição
      const listaEquipe = await equipeService.listar(dados.empresa || null);

      setChamado(dados);
      setCliente(dados.cliente); 
      setTodosTecnicos(listaEquipe);

      // Mapeia os técnicos atuais (que vêm como objeto) para estado local
      setTecnicosSelecionados(dados.tecnicos || []);

      setEditData({
        status: dados.status,
        prioridade: dados.prioridade,
        custo_ida: dados.custo_ida || 0,
        custo_volta: dados.custo_volta || 0,
        data_agendamento: dados.data_agendamento ? dados.data_agendamento.slice(0, 16) : '',
        tecnico: dados.tecnico ? dados.tecnico.id : '', // Popula o ID do técnico principal
        tecnicos: dados.tecnicos ? dados.tecnicos.map(t => t.id) : [] // Inicializa IDs da equipe M2M
      });

    } catch (error) { 
      console.error("Erro ao carregar detalhes:", error);
      alert("Chamado não encontrado ou erro de conexão.");
      navigate('/chamados');
    } finally { 
      setLoading(false); 
    }
  }, [id, navigate]);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  // --- GERENCIAMENTO DE TÉCNICOS ---
  const handleAddTecnico = (tecnicoId) => {
      if (!tecnicoId) return;
      const id = parseInt(tecnicoId);
      
      // Verifica se já está na lista
      if (editData.tecnicos.includes(id)) return;

      // Adiciona ao array de IDs
      const novosIds = [...editData.tecnicos, id];
      setEditData(prev => ({ ...prev, tecnicos: novosIds }));

      // Adiciona ao array de Objetos (para visualização imediata)
      const tecnicoObj = todosTecnicos.find(t => t.id === id);
      if (tecnicoObj) {
          setTecnicosSelecionados(prev => [...prev, tecnicoObj]);
      }
  };

  const handleRemoveTecnico = (tecnicoId) => {
      const novosIds = editData.tecnicos.filter(id => id !== tecnicoId);
      setEditData(prev => ({ ...prev, tecnicos: novosIds }));
      setTecnicosSelecionados(prev => prev.filter(t => t.id !== tecnicoId));
  };

  // --- SALVAR ---
  const handleSalvar = async () => {
    try {
      const payload = { ...editData };
      if (!payload.data_agendamento) payload.data_agendamento = null;
      
      // Envia os dados atualizados
      await chamadoService.atualizar(id, payload);
      alert("Chamado atualizado com sucesso!");
      recarregarLista(); // Recarrega a lista no contexto
      carregarDados(); // Recarrega para garantir sincronia
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
      recarregarLista(); // Recarrega a lista no contexto
      carregarDados();
    } catch (error) {
      console.error(error);
      alert("Erro ao finalizar chamado.");
    }
  };

  if (loading) return <div className="p-20 text-center animate-pulse font-black text-[#7C69AF]">Carregando chamado...</div>;
  if (!chamado) return null;

  const isVisita = chamado.tipo_atendimento === 'VISITA';
  const isLocked = chamado.status === 'FINALIZADO' || chamado.status === 'CANCELADO';

  return (
    <div className="max-w-6xl mx-auto pb-10 sm:pb-20 animate-in fade-in duration-500 px-2 sm:px-0">
      
      {/* HEADER RESPONSIVO */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 sm:mb-8 px-2 sm:px-0">
        <div className="flex flex-col gap-1">
            <button 
            onClick={() => navigate('/chamados')} 
            className="flex items-center gap-2 text-slate-400 hover:text-[#302464] font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] transition-all p-2 -ml-2 w-fit"
            >
            <ArrowLeft size={18} /> Voltar
            </button>
            {/* BADGE DA EMPRESA */}
            {chamado.empresa_nome && (
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg w-fit mt-1">
                    <Building2 size={12} /> {chamado.empresa_nome}
                </div>
            )}
        </div>
        
        <div className="flex flex-row gap-2 sm:gap-3 w-full md:w-auto">
            {!isLocked && (
              <button 
                onClick={() => setIsFinalizarOpen(true)} 
                className="flex-1 bg-emerald-500 text-white px-4 py-3.5 rounded-2xl font-black text-xs sm:text-sm shadow-lg active:scale-95 flex items-center justify-center gap-2 hover:bg-emerald-600 transition-colors"
              >
                <Check size={18} /> Finalizar
              </button>
            )}
            {!isLocked && (
                <button 
                onClick={handleSalvar} 
                className="flex-1 bg-[#302464] text-white px-4 py-3.5 rounded-2xl font-black text-xs sm:text-sm shadow-xl active:scale-95 flex items-center justify-center gap-2 hover:bg-[#4B3C8A] transition-colors"
                >
                <Save size={18} /> Salvar
                </button>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        
        {/* COLUNA PRINCIPAL (Detalhes) */}
        <div className="lg:col-span-8 space-y-6">
          
          <div className="bg-white p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden">
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

            {/* RESOLUÇÃO (Se finalizado) */}
            {chamado.status === 'FINALIZADO' && chamado.resolucao && (
               <div className="mt-6 bg-emerald-50 p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-emerald-100">
                  <h3 className="text-emerald-700 font-black text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Check size={14}/> Resolução Técnica
                  </h3>
                  <p className="text-emerald-800 text-sm font-medium whitespace-pre-wrap">{chamado.resolucao}</p>
               </div>
            )}

            {/* GRID DE DATAS E INFO */}
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

          {/* HISTÓRICO DE RESOLUÇÕES */}
          {(relacionados && relacionados.length > 0) ? (
            <div className="bg-white p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-sm border border-slate-100">
              <h3 className="text-base sm:text-lg font-black text-slate-800 mb-4">Histórico de Resoluções para este Assunto</h3>
              <div className="space-y-4">
                {relacionados.map(rel => (
                  <div key={rel.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <div className="flex justify-between items-center mb-2">
                      <Link to={`/chamados/${rel.id}`} className="text-sm font-bold text-indigo-600 hover:underline">
                        #{rel.protocolo}
                      </Link>
                      <span className="text-xs font-semibold text-slate-500">{rel.cliente_nome}</span>
                    </div>
                    <p className="text-sm text-slate-700 truncate">
                      {rel.resolucao || 'Resolução não detalhada.'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-sm border border-slate-100">
                 <h3 className="text-base sm:text-lg font-black text-slate-800 mb-4">Histórico de Resoluções para este Assunto</h3>
                <p className="text-sm text-slate-500">Nenhum histórico encontrado para este assunto.</p>
            </div>
          )}

          {/* CARD DE CUSTOS (Apenas Visita) */}
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
                        disabled={isLocked}
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
                            disabled={isLocked}
                            className="w-full bg-transparent border-b border-white/30 text-left sm:text-center font-bold outline-none focus:border-white transition-colors disabled:opacity-50" 
                            value={editData.custo_ida} 
                            onChange={e => setEditData({...editData, custo_ida: e.target.value})} 
                          />
                        </div>
                        <div className="flex flex-col">
                          <label className="text-[8px] font-black uppercase text-[#A696D1] mb-1">Volta (R$)</label>
                          <input 
                            type="number" step="0.01" min="0"
                            disabled={isLocked}
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

        {/* COLUNA LATERAL - CONTROLES */}
        <div className="lg:col-span-4 space-y-6">
          
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Settings size={14} /> Painel de Controle
            </h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 ml-1 mb-1 block uppercase tracking-tighter">Status</label>
                <select 
                  value={editData.status} 
                  onChange={e => setEditData({...editData, status: e.target.value})} 
                  disabled={isLocked}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#7C69AF]/20 disabled:opacity-50 text-sm"
                >
                  {Object.entries(STATUS_MAP).map(([key, val]) => (
                    <option key={key} value={key}>{val.label.replace(/^[^\s]+\s/, '')}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 ml-1 mb-1 block uppercase tracking-tighter">Prioridade</label>
                <select 
                  value={editData.prioridade} 
                  onChange={e => setEditData({...editData, prioridade: e.target.value})} 
                  disabled={isLocked}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#7C69AF]/20 disabled:opacity-50 text-sm"
                >
                  {Object.entries(PRIORIDADE_MAP).map(([key, val]) => (
                    <option key={key} value={key}>{val.label.replace(/^[^\s]+\s/, '')}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 ml-1 mb-1 block uppercase tracking-tighter">Técnico Responsável</label>
                <select 
                  value={editData.tecnico}
                  onChange={e => setEditData({...editData, tecnico: e.target.value})} 
                  disabled={isLocked}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#7C69AF]/20 disabled:opacity-50 text-sm"
                >
                  <option value="">Ninguém</option>
                  {todosTecnicos.map(t => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {cliente && (
            <div className={`bg-white p-6 rounded-3xl shadow-sm border ${!cliente.ativo ? 'border-red-200 bg-red-50' : 'border-slate-100'}`}>
              <h3 className={`text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${!cliente.ativo ? 'text-red-400' : 'text-slate-400'}`}>
                {cliente.ativo ? <><Briefcase size={14} /> Cliente</> : <><AlertTriangle size={14} /> Cliente Inativo</>}
              </h3>
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shrink-0 ${!cliente.ativo ? 'bg-red-200 text-red-700' : 'bg-purple-100 text-[#302464]'}`}>
                  {(cliente.nome_exibicao || cliente.razao_social).charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className={`font-black text-sm leading-tight truncate ${!cliente.ativo ? 'text-red-700' : 'text-slate-800'}`}>
                      {cliente.nome_exibicao || cliente.razao_social}
                  </p>
                  
                  {cliente.nome_fantasia && (
                        <p className="text-[10px] text-slate-400 font-bold uppercase truncate">{cliente.razao_social}</p>
                  )}
                  
                  <p className="text-[9px] text-slate-400 font-bold uppercase truncate">{cliente.cnpj_cpf}</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 font-medium flex items-start gap-2 bg-slate-50/50 p-4 rounded-2xl leading-relaxed">
                <MapPin size={16} className="shrink-0 mt-0.5 text-[#7C69AF]"/> 
                {cliente.endereco}
              </p>
            </div>
          )}

          {chamado.ativo && (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Monitor size={14} /> Ativo Vinculado
              </h3>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shrink-0 bg-blue-100 text-blue-600">
                  <Monitor size={24} />
                </div>
                <div className="min-w-0">
                  <p className="font-black text-sm leading-tight truncate text-slate-800">
                      {chamado.ativo.nome}
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase truncate">{chamado.ativo.tipo}</p>
                </div>
              </div>
              <button 
                onClick={() => navigate(`/ativos/${chamado.ativo.codigo_identificacao || chamado.ativo.id}`)}
                className="w-full text-center bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors py-3 rounded-xl text-xs font-bold"
              >
                Ver Ficha do Ativo
              </button>
            </div>
          )}

          {/* CARD DE EQUIPE TÉCNICA (Com edição) */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Users size={14} /> Equipe Técnica
              </h3>
              
              <div className="space-y-3">
                  {tecnicosSelecionados.map(tec => (
                    <div key={tec.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 group">
                      <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#302464] flex items-center justify-center text-white font-bold text-xs shrink-0">
                            {tec.nome.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-700 truncate">{tec.nome}</p>
                            <p className="text-[9px] text-slate-400 uppercase font-black">{tec.cargo}</p>
                          </div>
                      </div>
                      {!isLocked && (
                          <button onClick={() => handleRemoveTecnico(tec.id)} className="text-slate-300 hover:text-red-500 p-1">
                              <Trash2 size={14} />
                          </button>
                      )}
                    </div>
                  ))}
                  
                  {tecnicosSelecionados.length === 0 && (
                     <div className="text-center py-4 text-xs text-slate-400 font-bold bg-slate-50 rounded-xl border border-dashed border-slate-200">
                         Nenhum técnico atribuído
                     </div>
                  )}

                  {!isLocked && (
                      <div className="mt-4 pt-4 border-t border-slate-100">
                          <label className="text-[9px] font-bold text-slate-400 mb-2 block uppercase">Adicionar Técnico</label>
                          <div className="flex gap-2">
                              <select 
                                  className="flex-1 bg-slate-50 text-xs font-bold text-slate-600 rounded-xl p-2 border border-slate-200 outline-none"
                                  onChange={(e) => handleAddTecnico(e.target.value)}
                                  value=""
                              >
                                  <option value="">Selecione...</option>
                                  {todosTecnicos.map(t => (
                                      <option key={t.id} value={t.id}>{t.nome}</option>
                                  ))}
                              </select>
                              <div className="bg-[#302464] text-white p-2 rounded-xl flex items-center justify-center">
                                  <Plus size={14} />
                              </div>
                          </div>
                      </div>
                  )}
              </div>
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
