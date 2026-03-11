import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useChamados } from '../contexts/ChamadosContext';
import { 
  ArrowLeft, MapPin, Calendar, Clock, Save, Truck, Check, Settings, 
  Info, Briefcase, Users, History, Building2, Trash2, Plus, AlertTriangle, 
  Monitor, MessageSquare, User, ExternalLink, DollarSign, Box, Paperclip,
  Download, Edit, FileText,
} from 'lucide-react';

import chamadoService from '../services/chamadoService';
import equipeService from '../services/equipeService';
import estoqueService from '../services/estoqueService';
import ModalFinalizar from '../components/ModalFinalizar';
import ExpandableText from '../components/ExpandableText';

const STATUS_MAP = {
  ABERTO: { label: '🔓 Aberto', color: 'bg-emerald-50 text-emerald-600' },
  AGENDADO: { label: '📅 Agendado', color: 'bg-purple-50 text-[#7C69AF]' },
  EM_ANDAMENTO: { label: '🔨 Em Andamento', color: 'bg-blue-50 text-blue-600' },
  FINALIZADO: { label: '✅ Finalizado', color: 'bg-slate-100 text-slate-500' },
  CANCELADO: { label: '🚫 Cancelado', color: 'bg-red-50 text-red-600' },
  ORCAMENTO: { label: '💰 Orçamento', color: 'bg-amber-50 text-amber-600' },
  APROVADO: { label: '👍 Aprovado', color: 'bg-green-50 text-green-600' },
  AGUARDANDO_PECA: { label: '📦 Aguardando Peça', color: 'bg-orange-50 text-orange-600' },
};

const PRIORIDADE_MAP = {
  BAIXA: { label: '🟢 Baixa', color: 'text-emerald-600' },
  MEDIA: { label: '🟡 Média', color: 'text-amber-600' },
  ALTA: { label: '🔴 Alta', color: 'text-red-600' },
  CRITICA: { label: '🔥 Crítica', color: 'text-rose-700 font-bold' }
};

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

export default function ChamadoDetalhes() {
  const { carregarDados: recarregarLista } = useChamados();
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [chamado, setChamado] = useState(null);
  const [relacionados, setRelacionados] = useState([]);
  const [comentarios, setComentarios] = useState([]);
  
  // Listas para seleção
  const [todosTecnicos, setTodosTecnicos] = useState([]);
  const [tecnicosSelecionados, setTecnicosSelecionados] = useState([]);
  const [todosAssuntos, setTodosAssuntos] = useState([]);
  const [assuntosSelecionados, setAssuntosSelecionados] = useState([]);
  const [produtos, setProdutos] = useState([]);

  // Modais e Forms
  const [isFinalizarOpen, setIsFinalizarOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [modalItemOpen, setModalItemOpen] = useState(false);
  const [modalAnexoOpen, setModalAnexoOpen] = useState(false);
  const [itemForm, setItemForm] = useState({ id: null, produto: '', quantidade: 1, preco_venda: 0 });
  const [anexoForm, setAnexoForm] = useState({ arquivo: null, tipo: 'FOTO', descricao: '' });
  const [novoComentario, setNovoComentario] = useState('');

  const [editData, setEditData] = useState({
    titulo: '',
    status: '', 
    prioridade: '', 
    data_agendamento: '',
    tecnico: '',
    tecnicos: [],
    assuntos: [],
    relatorio_tecnico: '',
    // Financeiro
    custo_ida: 0, 
    custo_volta: 0,
    valor_mao_de_obra: 0,
    custo_terceiros: 0,
    desconto: 0,
  });

  const carregarDados = useCallback(async () => {
    try {
      setLoading(true);
      const [dados, dadosRelacionados, dadosComentarios, listaAssuntos] = await Promise.all([
        chamadoService.buscarPorId(id),
        chamadoService.listarRelacionados(id),
        chamadoService.listarComentarios(id),
        chamadoService.listarAssuntos()
      ]);

      const empresaId = dados.empresa || null;
      const [listaEquipe, listaProdutos] = await Promise.all([
        equipeService.listar(empresaId),
        estoqueService.listarProdutos(empresaId)
      ]);

      setChamado(dados);
      setRelacionados(dadosRelacionados);
      setComentarios(dadosComentarios);
      setTodosTecnicos(listaEquipe);
      setTodosAssuntos(listaAssuntos);
      setProdutos(listaProdutos);

      setTecnicosSelecionados(dados.tecnicos || []);
      setAssuntosSelecionados(dados.assuntos_detalhes || []);

      setEditData({
        titulo: dados.titulo || '',
        status: dados.status,
        prioridade: dados.prioridade,
        data_agendamento: dados.data_agendamento ? dados.data_agendamento.slice(0, 16) : '',
        tecnico: dados.tecnico ? dados.tecnico.id : '',
        tecnicos: dados.tecnicos ? dados.tecnicos.map(t => t.id) : [],
        assuntos: dados.assuntos_detalhes ? dados.assuntos_detalhes.map(a => a.id) : [],
        relatorio_tecnico: dados.relatorio_tecnico || '',
        custo_ida: dados.custo_ida || 0,
        custo_volta: dados.custo_volta || 0,
        valor_mao_de_obra: dados.valor_mao_de_obra || 0,
        custo_terceiros: dados.custo_terceiros || 0,
        desconto: dados.desconto || 0,
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

  // --- HANDLERS ---
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
  };

  const handleSalvar = async () => {
    try {
      const payload = { ...editData };
      if (!payload.data_agendamento) payload.data_agendamento = null;
      
      await chamadoService.atualizar(id, payload);
      alert("Chamado atualizado com sucesso!");
      recarregarLista();
      carregarDados();
    } catch (error) { 
      console.error(error);
      alert("Erro ao salvar alterações."); 
    }
  };

  const handleConfirmarFinalizacao = async (dadosFinalizacao) => {
    try {
      // Garante que os dados financeiros editados sejam enviados na finalização
      const payloadFinal = {
        ...dadosFinalizacao,
        ...editData
      };
      await chamadoService.finalizar(id, payloadFinal);
      alert("Chamado finalizado com sucesso!");
      setIsFinalizarOpen(false);
      recarregarLista();
      carregarDados();
    } catch (error) {
      console.error(error);
      const errorMsg = error.response?.data?.erro || "Erro ao finalizar chamado.";
      alert(errorMsg);
    }
  };

  const handleAdicionarComentario = async (e) => {
    e.preventDefault();
    if (!novoComentario.trim()) return;
    try {
      await chamadoService.adicionarComentario(id, novoComentario);
      setNovoComentario('');
      carregarDados(); 
    } catch (error) {
      alert("Não foi possível adicionar o comentário.");
    }
  };
  
  const handleGerarOrcamento = async () => {
    setIsGeneratingPdf(true);
    try {
      await chamadoService.gerarOrcamentoPdf(id);
      alert("Orçamento gerado e anexado com sucesso!");
      carregarDados(); // Recarrega para mostrar o novo anexo
    } catch (error) {
      alert("Falha ao gerar orçamento em PDF.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // --- ITENS E ANEXOS ---
  const handleAdicionarItem = async (e) => {
    e.preventDefault();
    if (!itemForm.produto) return;
    try {
      const payload = {
        produto: itemForm.produto,
        quantidade: itemForm.quantidade,
        preco_venda: itemForm.preco_venda
      };
      await chamadoService.adicionarItem(id, payload);
      setModalItemOpen(false);
      carregarDados();
    } catch (error) {
      alert("Erro ao adicionar item: " + (error.response?.data?.erro || "Verifique o estoque."));
    }
  };

  const handleRemoverItem = async (itemId) => {
    if (!window.confirm("Remover este item do chamado?")) return;
    try {
      await chamadoService.removerItem(itemId);
      carregarDados();
    } catch (error) {
      alert("Erro ao remover item.");
    }
  };
  
  const handleAnexar = async (e) => {
    e.preventDefault();
    if (!anexoForm.arquivo) return;
    const formData = new FormData();
    formData.append('arquivo', anexoForm.arquivo);
    formData.append('tipo', anexoForm.tipo);
    formData.append('descricao', anexoForm.descricao);
    try {
      await chamadoService.anexarArquivo(id, formData);
      setModalAnexoOpen(false);
      setAnexoForm({ arquivo: null, tipo: 'FOTO', descricao: '' });
      carregarDados();
    } catch (error) {
      alert("Erro ao enviar arquivo.");
    }
  };
  
  const handleExcluirAnexo = async (anexoId) => {
    if (!window.confirm("Remover este anexo?")) return;
    try {
      await chamadoService.removerAnexo(anexoId);
      carregarDados();
    } catch (error) {
      alert("Erro ao remover anexo.");
    }
  };

  if (loading) return <div className="p-20 text-center animate-pulse font-black text-[#7C69AF]">Carregando chamado...</div>;
  if (!chamado) return null;

  const isLocked = chamado.status === 'FINALIZADO' || chamado.status === 'CANCELADO';
  const { cliente } = chamado;

  return (
    <div className="max-w-7xl mx-auto pb-20 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div className="flex items-center gap-4">
            <button onClick={() => navigate('/chamados')} className="p-3 bg-white rounded-xl shadow-sm text-slate-400 hover:text-[#302464] transition-all">
                <ArrowLeft size={20} />
            </button>
            <div>
                <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Chamado #{chamado.protocolo}</h1>
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${STATUS_MAP[chamado.status]?.color || 'bg-slate-100 text-slate-500'}`}>
                        {chamado.status.replace('_', ' ')}
                    </span>
                    {chamado.empresa_nome && (
                        <span className="bg-purple-100 text-[#302464] text-[9px] font-black px-2 py-0.5 rounded border border-purple-200 uppercase">
                            {chamado.empresa_nome}
                        </span>
                    )}
                </div>
                <p className="text-slate-400 font-bold text-sm mt-1">{chamado.titulo}</p>
            </div>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
            <button onClick={handleGerarOrcamento} disabled={isGeneratingPdf} className="px-4 py-3 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-wait" title="Gerar Orçamento em PDF">
                {isGeneratingPdf ? 'Gerando...' : '📄'} <span className="hidden sm:inline">Orçamento</span>
            </button>
            {!isLocked && (
                <>
                    <button onClick={handleSalvar} className="px-6 py-3 bg-white text-[#302464] border border-slate-200 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2">
                        <Save size={16} /> Salvar
                    </button>
                    <button onClick={() => setIsFinalizarOpen(true)} className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2">
                        <Check size={16} /> Finalizar
                    </button>
                </>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* --- COLUNA ESQUERDA (PRINCIPAL) --- */}
        <div className="lg:col-span-2 space-y-8">
          
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><FileText size={16}/> Descrição do Problema</h3>
            <p className="text-slate-700 font-medium mb-8 bg-slate-50 p-4 rounded-2xl">{chamado.descricao_detalhada}</p>

            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Check size={16}/> Laudo Técnico / Solução</h3>
            <textarea 
                className="w-full bg-slate-50 p-4 rounded-2xl border-none font-medium text-slate-700 outline-none focus:ring-2 focus:ring-[#7C69AF] resize-none h-32"
                placeholder="Descreva o que foi feito..."
                value={editData.relatorio_tecnico}
                onChange={e => setEditData({...editData, relatorio_tecnico: e.target.value})}
                disabled={isLocked}
            />
          </div>

          {/* PEÇAS E PRODUTOS */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Box size={16}/> Peças & Produtos</h3>
                  {!isLocked && (
                      <button onClick={() => { setItemForm({ id: null, produto: '', quantidade: 1, preco_venda: 0 }); setModalItemOpen(true); }} className="text-xs font-black text-[#7C69AF] hover:bg-purple-50 px-3 py-2 rounded-lg transition-colors flex items-center gap-1"><Plus size={14}/> Adicionar</button>
                  )}
              </div>
              {chamado.itens.length === 0 ? (
                  <div className="text-center py-8 text-slate-300 font-bold text-sm bg-slate-50 rounded-2xl border border-dashed border-slate-200">Nenhuma peça utilizada.</div>
              ) : (
                  <div className="space-y-3">
                      {chamado.itens.map(item => (
                          <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                              <div>
                                  <p className="font-bold text-slate-700 text-sm">{item.nome_produto}</p>
                                  <p className="text-xs text-slate-400 font-bold">{item.quantidade}x {formatMoney(item.preco_venda)}</p>
                              </div>
                              <div className="flex items-center gap-4">
                                <p className="font-bold text-slate-700 text-sm">{formatMoney(item.valor_total)}</p>
                                {!isLocked && (
                                    <button onClick={() => handleRemoverItem(item.id)} className="p-2 text-red-400 bg-white rounded-lg shadow-sm hover:bg-red-50 transition-colors" title="Remover Item"><Trash2 size={14} /></button>
                                )}
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>

          {/* ANEXOS */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Paperclip size={16}/> Documentos & Fotos</h3>
                  {!isLocked && (
                      <button onClick={() => setModalAnexoOpen(true)} className="text-xs font-black text-[#7C69AF] hover:bg-purple-50 px-3 py-2 rounded-lg transition-colors flex items-center gap-1"><Plus size={14}/> Anexar</button>
                  )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {chamado.anexos_os && chamado.anexos_os.length > 0 ? (
                      chamado.anexos_os.map(anexo => (
                          <div key={anexo.id} className="group relative bg-slate-50 rounded-2xl p-3 border border-slate-100 hover:shadow-lg transition-all flex flex-col aspect-square">
                              {anexo.tipo === 'FOTO' ? (
                                  <img src={anexo.arquivo} alt={anexo.descricao || 'Foto'} className="w-full h-full object-cover rounded-lg bg-slate-200" />
                              ) : (
                                  <div className="flex-grow flex flex-col items-center justify-center text-center p-2">
                                      <FileText size={32} className="text-[#7C69AF] mb-2"/>
                                      <p className="font-bold text-slate-600 text-xs truncate mb-1" title={anexo.descricao}>{anexo.tipo}</p>
                                  </div>
                              )}
                              <a href={anexo.arquivo} target="_blank" rel="noopener noreferrer" className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur-sm rounded-lg text-slate-500 hover:text-[#302464] shadow-md opacity-0 group-hover:opacity-100 transition-all" title="Baixar"><Download size={14} /></a>
                              {!isLocked && (
                                  <button onClick={() => handleExcluirAnexo(anexo.id)} className="absolute bottom-2 right-2 p-1.5 bg-white/80 backdrop-blur-sm rounded-lg text-red-500 hover:bg-red-100 shadow-md opacity-0 group-hover:opacity-100 transition-all" title="Excluir"><Trash2 size={14} /></button>
                              )}
                          </div>
                      ))
                  ) : (
                      <p className="col-span-full text-center text-slate-400 text-xs py-4">Nenhum anexo.</p>
                  )}
              </div>
          </div>
          
           {/* COMENTÁRIOS */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><MessageSquare size={14} /> Comentários</h3>
            <div className="space-y-4 max-h-72 overflow-y-auto pr-2">
              {comentarios.map(com => (
                <div key={com.id} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs shrink-0">{com.autor_nome ? com.autor_nome.charAt(0) : '-'}</div>
                    <div className="flex-1 bg-slate-50 rounded-2xl p-3 border border-slate-100">
                      <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-bold text-slate-700">{com.autor_nome || 'Sistema'}</p>
                          <p className="text-[9px] text-slate-400 font-medium">{new Date(com.created_at).toLocaleString('pt-BR')}</p>
                      </div>
                      <p className="text-sm text-slate-600 whitespace-pre-wrap">{com.texto}</p>
                    </div>
                </div>
              ))}
              {comentarios.length === 0 && <p className="text-xs text-center text-slate-400 py-8">Nenhum comentário ainda.</p>}
            </div>
            {!isLocked && (
              <form onSubmit={handleAdicionarComentario} className="mt-4 pt-4 border-t border-slate-100">
                  <textarea value={novoComentario} onChange={e => setNovoComentario(e.target.value)} placeholder="Deixe uma nota para a equipe..." className="w-full bg-slate-50 border-slate-200 border rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-[#7C69AF]/50" rows={3}/>
                  <button type="submit" className="mt-2 w-full bg-[#302464] text-white py-2.5 rounded-lg text-xs font-bold hover:bg-[#4B3C8A] transition-colors">Publicar</button>
              </form>
            )}
          </div>
        </div>

        {/* --- COLUNA DIREITA (SIDEBAR) --- */}
        <div className="lg:col-span-1 space-y-6">

          {/* PAINEL FINANCEIRO */}
          <div className="bg-[#302464] p-6 rounded-3xl text-white shadow-xl shadow-purple-900/20 relative overflow-hidden">
              <h3 className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-6 flex items-center gap-2 relative z-10"><DollarSign size={14}/> Financeiro</h3>
              <div className="space-y-4 relative z-10">
                  <div className="flex justify-between items-center text-sm"><span className="opacity-70">Serviço</span><input type="number" name="valor_servico" disabled={isLocked} className="w-24 bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-right font-bold outline-none focus:border-white/50" value={editData.valor_servico} onChange={handleInputChange} /></div>
                  <div className="flex justify-between items-center text-sm"><span className="opacity-70">Mão de Obra</span><input type="number" name="valor_mao_de_obra" disabled={isLocked} className="w-24 bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-right font-bold outline-none focus:border-white/50" value={editData.valor_mao_de_obra} onChange={handleInputChange} /></div>
                  <div className="flex justify-between items-center text-sm"><span className="opacity-70">Peças ({chamado.itens.length})</span><span className="font-bold">{formatMoney(chamado.total_pecas)}</span></div>
                  <div className="flex justify-between items-center text-sm"><span className="opacity-70 text-red-300">Desconto</span><input type="number" name="desconto" disabled={isLocked} className="w-24 bg-red-500/20 border border-red-500/30 text-red-200 rounded-lg px-2 py-1 text-right font-bold outline-none focus:border-red-400" value={editData.desconto} onChange={handleInputChange} /></div>
                  <div className="h-px bg-white/10 my-2"></div>
                  <div className="flex justify-between items-end">
                      <span className="font-black text-lg">TOTAL</span>
                      <span className="block text-3xl font-black tracking-tighter">{formatMoney(chamado.valor_total_geral)}</span>
                  </div>
              </div>
          </div>
          
          {/* CUSTOS OPERACIONAIS */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Truck size={14}/> Custos Operacionais</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm"><span className="font-bold text-slate-500">Transporte (Ida)</span><input type="number" name="custo_ida" disabled={isLocked} className="w-24 bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 text-right font-bold outline-none focus:border-slate-300" value={editData.custo_ida} onChange={handleInputChange} /></div>
              <div className="flex justify-between items-center text-sm"><span className="font-bold text-slate-500">Transporte (Volta)</span><input type="number" name="custo_volta" disabled={isLocked} className="w-24 bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 text-right font-bold outline-none focus:border-slate-300" value={editData.custo_volta} onChange={handleInputChange} /></div>
              <div className="flex justify-between items-center text-sm"><span className="font-bold text-slate-500">Custo Terceiros</span><input type="number" name="custo_terceiros" disabled={isLocked} className="w-24 bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 text-right font-bold outline-none focus:border-slate-300" value={editData.custo_terceiros} onChange={handleInputChange} /></div>
            </div>
          </div>

          {/* PAINEL DE CONTROLE */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Settings size={14} /> Controle</h3>
            <div className="grid grid-cols-1 gap-4">
              <div><label className="text-[10px] font-bold text-slate-400 ml-1 mb-1 block uppercase tracking-tighter">Status</label><select name="status" value={editData.status} onChange={handleInputChange} disabled={isLocked} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 font-bold text-slate-700 outline-none disabled:opacity-50 text-sm">{Object.entries(STATUS_MAP).map(([key, val]) => (<option key={key} value={key}>{val.label.replace(/^[^\s]+\s/, '')}</option>))}</select></div>
              <div><label className="text-[10px] font-bold text-slate-400 ml-1 mb-1 block uppercase tracking-tighter">Prioridade</label><select name="prioridade" value={editData.prioridade} onChange={handleInputChange} disabled={isLocked} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 font-bold text-slate-700 outline-none disabled:opacity-50 text-sm">{Object.entries(PRIORIDADE_MAP).map(([key, val]) => (<option key={key} value={key}>{val.label.replace(/^[^\s]+\s/, '')}</option>))}</select></div>
              <div><label className="text-[10px] font-bold text-slate-400 ml-1 mb-1 block uppercase tracking-tighter">Técnico Responsável</label><select name="tecnico" value={editData.tecnico} onChange={handleInputChange} disabled={isLocked} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 font-bold text-slate-700 outline-none disabled:opacity-50 text-sm"><option value="">Ninguém</option>{todosTecnicos.map(t => (<option key={t.id} value={t.id}>{t.nome}</option>))}</select></div>
            </div>
          </div>

          {/* CLIENTE */}
          {cliente && (
            <div className={`bg-white p-6 rounded-3xl shadow-sm border ${!cliente.ativo ? 'border-red-200 bg-red-50' : 'border-slate-100'}`}>
              <h3 className={`text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${!cliente.ativo ? 'text-red-400' : 'text-slate-400'}`}>{cliente.ativo ? <><Briefcase size={14} /> Cliente</> : <><AlertTriangle size={14} /> Cliente Inativo</>}</h3>
              <p className="font-black text-sm leading-tight truncate text-slate-800">{cliente.nome_exibicao || cliente.razao_social}</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAIS */}
      {chamado && <ModalFinalizar isOpen={isFinalizarOpen} onClose={() => setIsFinalizarOpen(false)} onConfirm={handleConfirmarFinalizacao} chamado={{...chamado, cliente_detalhes: cliente}} />}
      
      {/* MODAL ITEM */}
      {modalItemOpen && (
        <div className="fixed inset-0 bg-[#302464]/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
             <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-8 relative">
                <button onClick={() => setModalItemOpen(false)} className="absolute top-6 right-6 text-slate-300 hover:text-[#302464]"><ArrowLeft size={20} /></button>
                <h3 className="font-black text-[#302464] text-xl mb-6">Adicionar Peça</h3>
                <form onSubmit={handleAdicionarItem} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Produto do Estoque</label>
                        <select className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-slate-700 outline-none" value={itemForm.produto} onChange={e => { const pId = e.target.value; const prod = produtos.find(p => p.id == pId); setItemForm({...itemForm, produto: pId, preco_venda: prod ? prod.preco_venda : 0}); }} required>
                            <option value="">Selecione...</option>
                            {produtos.map(p => (<option key={p.id} value={p.id}>{p.nome} (Est: {p.estoque_atual})</option>))}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantidade</label>
                          <input type="number" min="1" className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-slate-700 outline-none" value={itemForm.quantidade} onChange={e => setItemForm({...itemForm, quantidade: parseInt(e.target.value)})} required/>
                      </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Preço Venda (UN)</label>
                          <input type="number" step="0.01" className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-slate-700 outline-none" value={itemForm.preco_venda} onChange={e => setItemForm({...itemForm, preco_venda: e.target.value})} required/>
                      </div>
                    </div>
                    <button className="w-full py-4 bg-[#302464] text-white rounded-2xl font-black text-sm uppercase tracking-widest mt-4">Confirmar</button>
                </form>
             </div>
        </div>
      )}

      {/* MODAL ANEXO */}
      {modalAnexoOpen && (
        <div className="fixed inset-0 bg-[#302464]/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
             <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-8 relative">
                <button onClick={() => setModalAnexoOpen(false)} className="absolute top-6 right-6 text-slate-300 hover:text-[#302464]"><ArrowLeft size={20} /></button>
                <h3 className="font-black text-[#302464] text-xl mb-6">Novo Anexo</h3>
                <form onSubmit={handleAnexar} className="space-y-4">
                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Arquivo (PDF/Img)</label><input type="file" className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-slate-500 text-xs" onChange={e => setAnexoForm({...anexoForm, arquivo: e.target.files[0]})} required /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <select className="bg-slate-50 p-4 rounded-2xl font-bold text-slate-700 outline-none text-xs" value={anexoForm.tipo} onChange={e => setAnexoForm({...anexoForm, tipo: e.target.value})}>
                            <option value="FOTO">Foto</option><option value="NOTA_FISCAL">Nota Fiscal</option><option value="ORCAMENTO">Orçamento</option><option value="LAUDO">Laudo</option>
                        </select>
                        <input className="bg-slate-50 p-4 rounded-2xl font-bold text-slate-700 outline-none text-xs" placeholder="Descrição curta" value={anexoForm.descricao} onChange={e => setAnexoForm({...anexoForm, descricao: e.target.value})} />
                    </div>
                    <button className="w-full py-4 bg-[#302464] text-white rounded-2xl font-black text-sm uppercase tracking-widest mt-4">Enviar Arquivo</button>
                </form>
             </div>
        </div>
      )}
    </div>
  );
}
