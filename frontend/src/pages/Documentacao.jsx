import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Save, Building2, Wifi, Lock, Monitor, 
  Server, TrendingUp, Phone, Mail, User, Globe, Shield, 
  Search, BookOpen, X, ChevronRight, CheckCircle2, 
  AlertTriangle, Info, MapPin, Plus, Trash2, Eye, EyeOff,
  FileText, Download, UploadCloud, Pencil, 
  History, Calendar, ChevronLeft, Camera, Power, MailCheck // <--- Adicionado Power
} from 'lucide-react';

// SERVIÇOS
import clienteService from '../services/clienteService';
import documentacaoService from '../services/documentacaoService';
import equipeService from '../services/equipeService';
import chamadoService from '../services/chamadoService';
import ativoService from '../services/ativoService';

export default function Documentacao() {
  const { id } = useParams();
  const navigate = useNavigate();
    
  const [listaClientes, setListaClientes] = useState([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);

  const [cliente, setCliente] = useState(null);
  const [ativos, setAtivos] = useState([]);
  const [activeTab, setActiveTab] = useState('geral');
  
  // HISTÓRICO
  const [historicoChamados, setHistoricoChamados] = useState([]);
  const [paginaHistorico, setPaginaHistorico] = useState(1);
  const [totalHistorico, setTotalHistorico] = useState(0);
  const [loadingHistorico, setLoadingHistorico] = useState(false);

  const [currentUser, setCurrentUser] = useState(null);
  const [visiblePasswords, setVisiblePasswords] = useState({});
    
  const [docId, setDocId] = useState(null); 
  const [modalAberto, setModalAberto] = useState(null); 
  const [formTemp, setFormTemp] = useState({}); 

  const [emailGestaoForm, setEmailGestaoForm] = useState({ id: null, email: '', receber_alertas: true });

  const [textos, setTextos] = useState({
    configuracao_mikrotik: '',
    topologia_rede: '',
    estrutura_servidores: '',
    rotina_backup: '',
    pontos_fracos_melhorias: ''
  });

  // PERMISSÃO DE EDIÇÃO
  const canEdit = currentUser && ['SOCIO', 'GESTOR'].includes(currentUser.cargo);

  const togglePassword = (type, itemId) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [`${type}-${itemId}`]: !prev[`${type}-${itemId}`]
    }));
  };

  const carregarDados = useCallback(async () => {
    // Limpa o estado anterior para evitar "piscar" de dados antigos
    setLoading(true);
    setCliente(null);
    setActiveTab('geral');
    setTextos({
      configuracao_mikrotik: '',
      topologia_rede: '',
      estrutura_servidores: '',
      rotina_backup: '',
      pontos_fracos_melhorias: ''
    });
    setDocId(null);
    setAtivos([]);
    
    try {
      const usuarioLogado = await equipeService.getMe();
      setCurrentUser(usuarioLogado);

      if (!id) {
        const dadosClientes = await clienteService.listar();
        setListaClientes(dadosClientes);
      } else {
        const [dadosCliente, dadosAtivos] = await Promise.all([
          clienteService.buscarPorId(id),
          documentacaoService.listarAtivos(id) // Corrigido para usar o service correto com filtro
        ]);
        
        setCliente(dadosCliente);
        setAtivos(dadosAtivos || []);

        if (dadosCliente?.email_gestao) {
          setEmailGestaoForm(dadosCliente.email_gestao);
        } else {
          setEmailGestaoForm({ id: null, email: '', receber_alertas: true });
        }

        if (dadosCliente.documentacao_tecnica) {
          const doc = dadosCliente.documentacao_tecnica;
          setDocId(doc.id);
          setTextos({
            configuracao_mikrotik: doc.configuracao_mikrotik || '',
            topologia_rede: doc.topologia_rede || '', 
            estrutura_servidores: doc.estrutura_servidores || '',
            rotina_backup: doc.rotina_backup || '',
            pontos_fracos_melhorias: doc.pontos_fracos_melhorias || ''
          });
        }
      }
    } catch (error) {
      console.error("Falha ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  // Carregar Histórico
  useEffect(() => {
    if (activeTab === 'historico' && id) {
        const fetchHistorico = async () => {
            setLoadingHistorico(true);
            try {
                const response = await chamadoService.listarPorCliente(id, paginaHistorico);
                setHistoricoChamados(response.results || []); 
                setTotalHistorico(response.count || 0);
            } catch (error) {
                console.error("Erro ao carregar histórico", error);
            } finally {
                setLoadingHistorico(false);
            }
        };
        fetchHistorico();
    }
  }, [activeTab, id, paginaHistorico]);
  
  // ATUALIZAR STATUS (ATIVO/INATIVO)
  const handleToggleAtivo = async () => {
    if (!canEdit) return;
    try {
        const novoStatus = !cliente.ativo;
        // Atualiza no backend
        await clienteService.atualizar(id, { ativo: novoStatus });
        // Atualiza no estado local visualmente
        setCliente(prev => ({ ...prev, ativo: novoStatus }));
    } catch (error) {
        alert("Erro ao alterar status do cliente.");
        console.error(error);
    }
  };

  // ATUALIZAR FOTO
  const handleUpdateFoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('foto', file);
      const clienteAtualizado = await clienteService.atualizar(id, formData);
      setCliente(prev => ({ ...prev, foto: clienteAtualizado.foto }));
      alert("Foto do perfil atualizada!");
    } catch (error) {
      console.error(error);
      alert("Erro ao atualizar foto.");
    }
  };

  const handlePreparaEdicaoCliente = () => {
      setFormTemp({
          nome: cliente.nome || '',
          razao_social: cliente.razao_social || '',
          endereco: cliente.endereco || ''
      });
      setModalAberto('editar_cliente');
  };

  const handleSalvarEdicaoCliente = async (e) => {
      e.preventDefault();
      try {
          const payload = {
              nome: formTemp.nome,
              razao_social: formTemp.razao_social,
              endereco: formTemp.endereco
          };
          
          const clienteAtualizado = await clienteService.atualizar(id, payload);
          setCliente(prev => ({ ...prev, ...clienteAtualizado }));
          setModalAberto(null);
          alert("Dados do cliente atualizados!");
      } catch (error) {
          console.error(error);
          alert("Erro ao atualizar dados do cliente.");
      }
  };

  const handleSalvarEmailGestao = async (e) => {
    e.preventDefault();
    if (!emailGestaoForm.email) return alert("O campo de e-mail não pode estar vazio.");

    try {
      const payload = { 
        ...emailGestaoForm, 
        cliente: id 
      };

      if (emailGestaoForm.id) {
        await clienteService.atualizarEmailGestao(emailGestaoForm.id, payload);
      } else {
        await clienteService.criarEmailGestao(payload);
      }
      alert("E-mail de gestão salvo com sucesso!");
      refreshCurrentClientData(); // Recarrega os dados para garantir consistência

    } catch (error) {
      console.error("Erro ao salvar e-mail de gestão", error);
      alert("Ocorreu um erro ao salvar o e-mail.");
    }
  };

  // Função para recarregar os dados do cliente ATUAL sem resetar a UI
  const refreshCurrentClientData = async () => {
    if (!id) return;
    try {
      // setLoading(true); // Opcional: pode causar um "piscar" do loading.
      const [dadosCliente, dadosAtivos] = await Promise.all([
        clienteService.buscarPorId(id),
        documentacaoService.listarAtivos(id)
      ]);
      
      setCliente(dadosCliente);
      setAtivos(dadosAtivos || []);

      if (dadosCliente.documentacao_tecnica) {
        const doc = dadosCliente.documentacao_tecnica;
        setDocId(doc.id);
        setTextos({
          configuracao_mikrotik: doc.configuracao_mikrotik || '',
          topologia_rede: doc.topologia_rede || '', 
          estrutura_servidores: doc.estrutura_servidores || '',
          rotina_backup: doc.rotina_backup || '',
          pontos_fracos_melhorias: doc.pontos_fracos_melhorias || ''
        });
      } else {
        setDocId(null);
        setTextos({
          configuracao_mikrotik: '',
          topologia_rede: '',
          estrutura_servidores: '',
          rotina_backup: '',
          pontos_fracos_melhorias: ''
        });
      }
    } catch (e) {
      console.error("Falha ao atualizar dados do cliente:", e);
      alert("Não foi possível recarregar os dados. Por favor, atualize a página.");
    } finally {
      // setLoading(false);
    }
  };

  const handleSalvarTextos = async () => {
    try {
      const payload = { cliente: parseInt(id), ...textos };
      if (docId) {
        await documentacaoService.atualizar(docId, payload);
      } else {
        await documentacaoService.criar(payload);
      }
      alert("Dossiê Cyrius Atualizado!");
      await refreshCurrentClientData();
    } catch (error) {
      alert("Erro ao salvar textos.");
    }
  };

  const handleSalvarModal = async (e) => {
    e.preventDefault();
    try {
      let payload;
      let url = '';

      if (modalAberto === 'ativo') {
        payload = { ...formTemp, cliente: parseInt(id) };
        await ativoService.criar(payload);
      } 
      else if (modalAberto === 'contrato') {
        url = '/contratos/';
        const formData = new FormData();
        formData.append('cliente', id);
        formData.append('arquivo', formTemp.arquivo);
        formData.append('descricao', formTemp.descricao);
        payload = formData;
        await documentacaoService.salvarItem(url, payload);
      } 
      else {
        payload = { ...formTemp, cliente: parseInt(id) };
        if (modalAberto === 'contato') url = '/contatos/';
        if (modalAberto === 'provedor') url = '/provedores/';
        if (modalAberto === 'email') url = '/emails/';
        await documentacaoService.salvarItem(url, payload);
      }
      alert("Registro adicionado!");
      setModalAberto(null);
      setFormTemp({});
      await refreshCurrentClientData();
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar. Verifique os campos.");
    }
  };

  const handleExcluirItem = async (url, itemId) => {
    if (!window.confirm("Deseja remover permanentemente?")) return;
    try {
      await documentacaoService.excluirItem(url, itemId);
      await refreshCurrentClientData();
    } catch (error) {
      alert("Erro ao excluir.");
    }
  };

  const tabs = [
    { id: 'geral', label: 'Cadastro', icon: Building2 },
    { id: 'historico', label: 'Histórico', icon: History },
    { id: 'rede', label: 'Rede', icon: Globe },
    { id: 'senhas', label: 'Emails', icon: Mail },
    { id: 'inventario', label: 'Ativos', icon: Monitor },
    { id: 'servidores', label: 'Infra', icon: Server },
    { id: 'consultoria', label: 'Consultoria', icon: TrendingUp },
  ];

  if (currentUser && currentUser.cargo === 'SOCIO') {
    tabs.push({ id: 'contrato', label: 'Contratos', icon: FileText });
  }

  const STATUS_MAP = {
    ABERTO: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    EM_ANDAMENTO: 'bg-blue-50 text-blue-600 border-blue-100',
    PENDENTE: 'bg-amber-50 text-amber-600 border-amber-100',
    FINALIZADO: 'bg-slate-50 text-slate-500 border-slate-100',
    CANCELADO: 'bg-red-50 text-red-500 border-red-100',
  };

  // LISTAGEM DE CLIENTES
  if (!id) {
    const filtrados = listaClientes.filter(c => 
        (c.nome && c.nome.toLowerCase().includes(busca.toLowerCase())) ||
        c.razao_social.toLowerCase().includes(busca.toLowerCase())
    );
    return (
        <div className="animate-in fade-in duration-500">
          <header className="mb-10">
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Documentação</h1>
            <div className="h-1.5 w-12 bg-[#7C69AF] mt-2 rounded-full"></div>
          </header>
          <div className="relative mb-8 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#7C69AF]" size={20} />
            <input type="text" placeholder="Buscar cliente..." className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-purple-500/5 transition-all shadow-sm" value={busca} onChange={e => setBusca(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtrados.map(cli => (
              <div key={cli.id} onClick={() => navigate(`/documentacao/${cli.id}`)} className="group bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all cursor-pointer">
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden transition-all shadow-sm
                        ${cli.foto ? 'bg-white' : 'bg-slate-50 text-[#302464] group-hover:bg-[#302464] group-hover:text-white'}`}>
                      {cli.foto ? (
                          <img src={cli.foto} alt={cli.nome_exibicao} className="w-full h-full object-cover" />
                      ) : (
                          (cli.nome_exibicao || cli.razao_social).charAt(0).toUpperCase()
                      )}
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 line-clamp-1">{cli.nome_exibicao || cli.razao_social}</h3>
                    {cli.nome && <p className="text-[9px] text-slate-400 font-bold truncate">{cli.razao_social}</p>}
                    
                    {/* Badge de Status na Listagem */}
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-black uppercase text-slate-400">{cli.tipo_cliente}</span>
                        {!cli.ativo && (
                            <span className="text-[8px] font-black uppercase bg-red-100 text-red-500 px-1.5 py-0.5 rounded">Inativo</span>
                        )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-slate-300 group-hover:text-[#7C69AF] transition-colors mt-4 pt-4 border-t border-slate-50">
                    <span className="text-[10px] font-black uppercase tracking-widest">Abrir Dossiê</span><ChevronRight size={18} />
                </div>
              </div>
            ))}
          </div>
        </div>
    );
  }

  if (loading || !cliente) return <div className="p-20 text-center text-[#7C69AF] font-black animate-pulse">Sincronizando...</div>;

  return (
    <div className="animate-in fade-in duration-500 max-w-6xl mx-auto pb-20">
        
      {/* HEADER CLIENTE DETALHE */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-5">
            
            <div className="relative group">
                <label className="cursor-pointer">
                    <div className={`w-20 h-20 rounded-[1.5rem] shadow-xl flex items-center justify-center text-white overflow-hidden border-4 border-white relative transition-transform hover:scale-105
                        ${!cliente.ativo ? 'bg-slate-400 grayscale' : cliente?.tipo_cliente === 'CONTRATO' ? 'bg-emerald-500' : 'bg-[#302464]'}`}>
                        
                        {cliente?.foto ? (
                            <img src={cliente.foto} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-3xl font-black">{(cliente.nome || cliente.razao_social).charAt(0)}</span>
                        )}

                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                            <Camera size={24} className="text-white" />
                        </div>
                    </div>
                    <input 
                        type="file" accept="image/*" className="hidden" 
                        onChange={handleUpdateFoto} 
                    />
                </label>
            </div>

            <div>
                {/* Exibe Nome Fantasia como principal, se houver */}
                <h1 className={`text-3xl font-black ${!cliente.ativo ? 'text-slate-400' : 'text-slate-800'}`}>
                    {cliente?.nome || cliente?.razao_social}
                    {!cliente.ativo && <span className="text-red-400 text-sm ml-2 font-bold">(Inativo)</span>}
                </h1>
                
                {cliente?.nome && (
                    <p className="text-sm font-bold text-slate-400">{cliente?.razao_social}</p>
                )}

                <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase border border-emerald-100 mt-2 inline-block">
                    {cliente?.tipo_cliente}
                </span>
            </div>
        </div>
        <button onClick={() => navigate('/documentacao')} className="flex items-center gap-2 text-slate-400 hover:text-[#302464] font-black text-[10px] uppercase tracking-widest transition-all">
            <ArrowLeft size={16} /> Trocar Cliente
        </button>
      </div>

      {/* TABS - MENU RESPONSIVO MELHORADO */}
      <div className="flex md:justify-center justify-start overflow-x-auto gap-3 p-2 bg-slate-200/50 rounded-2xl mb-8 snap-x">
        {tabs.map((tab) => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id)} 
            className={`
                flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap snap-center shrink-0 
                ${activeTab === tab.id ? 'bg-white text-[#302464] shadow-sm scale-105' : 'text-slate-500 hover:bg-white/50'}
            `}
          >
            <tab.icon size={14} /> {tab.label}
          </button>
        ))}
      </div>

      <div className="animate-in slide-in-from-bottom-2 duration-300">
        
        {/* ABA GERAL */}
        {activeTab === 'geral' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="font-black text-[#302464] text-xs uppercase">Informações Base</h3>
                            
                            {/* --- BOTÕES DE AÇÃO (EDITAR + ATIVAR/DESATIVAR) --- */}
                            <div className="flex items-center gap-2">
                                {canEdit && (
                                    <>
                                        {/* Botão de Status (Ativo/Inativo) */}
                                        <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-100 mr-2">
                                            <button
                                                onClick={handleToggleAtivo}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all
                                                    ${cliente.ativo 
                                                        ? 'bg-emerald-100 text-emerald-700 shadow-sm' 
                                                        : 'bg-transparent text-slate-400 hover:bg-slate-200'
                                                    }`}
                                            >
                                                ON
                                            </button>
                                            <button
                                                onClick={handleToggleAtivo}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all
                                                    ${!cliente.ativo 
                                                        ? 'bg-red-100 text-red-600 shadow-sm' 
                                                        : 'bg-transparent text-slate-400 hover:bg-slate-200'
                                                    }`}
                                            >
                                                OFF
                                            </button>
                                        </div>

                                        <button 
                                            onClick={handlePreparaEdicaoCliente}
                                            className="p-2 bg-slate-50 text-[#7C69AF] rounded-xl hover:bg-[#302464] hover:text-white transition-all shadow-sm"
                                            title="Editar Dados do Cliente"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm text-slate-700">
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Nome Fantasia / Apelido</p>
                                <p className="font-bold text-lg text-[#302464]">{cliente?.nome || '---'}</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Razão Social</p>
                                <p className="font-bold">{cliente?.razao_social}</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Documento</p>
                                <p className="font-mono">{cliente?.cnpj || cliente?.cpf}</p>
                            </div>
                            <div className="md:col-span-2">
                                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Endereço</p>
                                <p className="font-bold flex items-center gap-2"><MapPin size={14} className="text-[#A696D1]"/> {cliente?.endereco}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-center mb-8"><h3 className="font-black text-[#302464] text-xs uppercase">E-mail de Gestão</h3></div>
                    <form onSubmit={handleSalvarEmailGestao} className="space-y-4">
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase">Email para Faturas e Relatórios</label>
                            <input 
                                type="email"
                                placeholder="financeiro@cliente.com"
                                value={emailGestaoForm.email}
                                onChange={e => setEmailGestaoForm({...emailGestaoForm, email: e.target.value})}
                                className="w-full mt-1 px-4 py-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#7C69AF]"
                            />
                        </div>
                        <div className="flex items-center gap-3 pt-2">
                            <input 
                                type="checkbox" 
                                id="receber_alertas" 
                                checked={emailGestaoForm.receber_alertas}
                                onChange={e => setEmailGestaoForm({...emailGestaoForm, receber_alertas: e.target.checked})}
                                className="h-5 w-5 rounded text-[#302464] focus:ring-[#7C69AF]"
                            />
                            <label htmlFor="receber_alertas" className="text-sm font-medium text-slate-600">Receber relatórios automáticos neste e-mail</label>
                        </div>
                        <button type="submit" className="w-full bg-emerald-500 text-white font-bold text-sm py-3 rounded-xl hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2">
                            <MailCheck size={16} /> Salvar E-mail de Gestão
                        </button>
                    </form>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-center mb-8"><h3 className="font-black text-[#302464] text-xs uppercase">Contatos</h3><button onClick={() => setModalAberto('contato')} className="p-2 bg-slate-50 text-[#7C69AF] rounded-xl hover:bg-purple-100 transition-all"><Plus size={18}/></button></div>
                    <div className="space-y-4">
                        {(cliente?.contatos || []).map(c => (
                            <div key={c.id} className="group p-4 bg-slate-50 rounded-2xl relative transition-all">
                                <button onClick={() => handleExcluirItem('/contatos/', c.id)} className="absolute top-2 right-2 text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14}/></button>
                                <p className="font-black text-slate-800 text-sm">{c.nome}</p>
                                <p className="text-[10px] font-black text-[#7C69AF] uppercase mb-1">{c.cargo}</p>
                                <p className="text-xs text-slate-500 font-bold">{c.telefone}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* ABA HISTÓRICO */}
        {activeTab === 'historico' && (
            <div className="space-y-6">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm min-h-[400px]">
                    <h3 className="font-black text-[#302464] text-xs uppercase mb-8 flex items-center gap-2">
                        <History size={16} /> Últimos Atendimentos
                    </h3>

                    {loadingHistorico ? (
                        <div className="text-center py-20 text-slate-300 font-bold text-xs animate-pulse">Carregando histórico...</div>
                    ) : historicoChamados.length === 0 ? (
                        <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 font-bold text-xs">
                            Nenhum chamado registrado para este cliente.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {historicoChamados.map(chamado => (
                                <div key={chamado.id} onClick={() => navigate(`/chamados/${chamado.id}`)} className="group flex flex-col md:flex-row items-start md:items-center justify-between p-5 bg-white border border-slate-100 rounded-3xl hover:border-purple-200 hover:shadow-lg cursor-pointer transition-all gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-2xl ${STATUS_MAP[chamado.status] || 'bg-slate-100 text-slate-500'}`}>
                                            <FileText size={20} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] font-black text-slate-300 uppercase">#{chamado.id}</span>
                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase border ${STATUS_MAP[chamado.status]}`}>
                                                    {chamado.status.replace('_', ' ')}
                                                </span>
                                            </div>
                                            <h4 className="font-bold text-slate-700 group-hover:text-[#302464] transition-colors line-clamp-1">{chamado.titulo}</h4>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end pl-14 md:pl-0">
                                            <div className="text-right">
                                                <p className="text-[9px] font-black text-slate-300 uppercase">Data</p>
                                                <p className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                                    <Calendar size={12} className="text-[#A696D1]"/>
                                                    {new Date(chamado.created_at || chamado.data_abertura).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <ChevronRight size={18} className="text-slate-200 group-hover:text-[#7C69AF] group-hover:translate-x-1 transition-all" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* PAGINAÇÃO */}
                    {totalHistorico > 10 && (
                        <div className="flex justify-center items-center gap-6 mt-8 pt-6 border-t border-slate-50">
                            <button 
                                disabled={paginaHistorico === 1}
                                onClick={() => setPaginaHistorico(p => Math.max(1, p - 1))}
                                className="p-3 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            
                            <div className="flex flex-col items-center">
                                <span className="text-xs font-black text-[#302464]">Página {paginaHistorico}</span>
                                <span className="text-[9px] font-bold text-slate-400">de {Math.ceil(totalHistorico / 10)}</span>
                            </div>

                            <button 
                                disabled={paginaHistorico * 10 >= totalHistorico}
                                onClick={() => setPaginaHistorico(p => p + 1)}
                                className="p-3 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        )}

        {activeTab === 'rede' && (
             <div className="space-y-6">
             <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                 <div className="flex justify-between items-center mb-8"><h3 className="font-black text-[#302464] text-xs uppercase flex items-center gap-2"><Globe size={16}/> Provedores</h3><button onClick={() => setModalAberto('provedor')} className="bg-[#302464] text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-purple-900/20">+ Novo Link</button></div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {(cliente?.provedores || []).map(p => (
                         <div key={p.id} className="group p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:bg-white hover:shadow-xl transition-all duration-300 relative">
                             <button onClick={() => handleExcluirItem('/provedores/', p.id)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                             <div className="flex justify-between mb-4">
                                 <div><p className="font-black text-slate-800 leading-tight">{p.nome_operadora}</p><p className="text-xs font-bold text-[#7C69AF]">{p.plano_contratado}</p></div>
                                 <span className="text-[9px] font-mono text-slate-400 bg-white px-2 py-1 rounded border">IP: {p.ip_fixo || 'Dinâmico'}</span>
                             </div>
                             <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs">
                                 <div><p className="text-[8px] font-black text-slate-300 uppercase">Usuário</p><p className="font-bold text-slate-700 truncate">{p.usuario_pppoe || '---'}</p></div>
                                 <div>
                                   <p className="text-[8px] font-black text-slate-300 uppercase">Senha</p>
                                   <div className="flex items-center gap-2">
                                     <p className="font-mono font-black text-[#7C69AF] truncate">
                                       {visiblePasswords[`rede-${p.id}`] ? p.senha_pppoe : '••••••••'}
                                     </p>
                                     <button onClick={() => togglePassword('rede', p.id)} className="text-slate-400 hover:text-[#7C69AF] transition-colors">
                                       {visiblePasswords[`rede-${p.id}`] ? <EyeOff size={14} /> : <Eye size={14} />}
                                     </button>
                                   </div>
                                 </div>
                             </div>
                         </div>
                     ))}
                 </div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <textarea className="w-full h-64 bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm font-mono text-xs focus:ring-4 focus:ring-purple-100 outline-none" value={textos.configuracao_mikrotik} onChange={e => setTextos({...textos, configuracao_mikrotik: e.target.value})} placeholder="Scripts Mikrotik..."/>
                 <textarea className="w-full h-64 bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm text-sm focus:ring-4 focus:ring-purple-100 outline-none" value={textos.topologia_rede} onChange={e => setTextos({...textos, topologia_rede: e.target.value})} placeholder="Topologia de Rede..."/>
             </div>
             <div className="flex justify-end"><button onClick={handleSalvarTextos} className="bg-[#302464] text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-[#7C69AF] transition-all">Salvar Dossiê de Rede</button></div>
         </div>
        )}

        {activeTab === 'senhas' && (
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-8"><h3 className="font-black text-[#302464] text-xs uppercase flex items-center gap-2"><Mail size={16}/> Contas de Email</h3><button onClick={() => setModalAberto('email')} className="bg-[#302464] text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase">+ Nova Conta</button></div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead><tr className="text-[10px] font-black text-slate-400 uppercase border-b border-slate-50"><th className="pb-4">Email</th><th className="pb-4 text-center">Senha</th><th className="pb-4 text-right">Ação</th></tr></thead>
                        <tbody className="divide-y divide-slate-50">
                            {(cliente?.contas_email || []).map(e => (
                                <tr key={e.id} className="hover:bg-slate-50 transition-colors font-bold text-slate-700">
                                    <td className="py-4">{e.email}</td>
                                    <td className="py-4 text-center font-mono text-[#7C69AF]">
                                      <div className="flex items-center justify-center gap-3">
                                        <span>{visiblePasswords[`email-${e.id}`] ? e.senha : '••••••••'}</span>
                                        <button onClick={() => togglePassword('email', e.id)} className="text-slate-400 hover:text-[#7C69AF] transition-colors">
                                          {visiblePasswords[`email-${e.id}`] ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>
                                      </div>
                                    </td>
                                    <td className="py-4 text-right"><button onClick={() => handleExcluirItem('/emails/', e.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {activeTab === 'inventario' && (
            <div className="space-y-6">
                <div className="flex justify-between items-center mb-4 px-2">
                    <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest flex items-center gap-2"><Monitor size={16} className="text-[#7C69AF]"/> Parque Tecnológico ({ativos.length})</h3>
                    <button onClick={() => setModalAberto('ativo')} className="bg-[#302464] text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-[#7C69AF] transition-all active:scale-95">+ Adicionar Dispositivo</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {(ativos || []).map(a => (
                        <div key={a.id} onClick={() => navigate(`/ativos/${a.codigo_identificacao}`)} className="group bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-slate-50 text-[#7C69AF] rounded-xl group-hover:bg-[#302464] group-hover:text-white transition-all shadow-inner"><Monitor size={20}/></div>
                                <span className="text-[8px] font-black bg-slate-50 px-2.5 py-1 rounded-lg uppercase tracking-widest text-slate-400 border border-slate-50">{a.tipo}</span>
                            </div>
                            <h4 className="font-black text-slate-800 leading-tight line-clamp-1 group-hover:text-[#302464] transition-colors">{a.nome}</h4>
                            <p className="text-[10px] font-bold text-[#A696D1] mt-1 truncate uppercase tracking-tighter">{a.marca_modelo || 'Modelo não informado'}</p>
                            <div className="mt-5 pt-4 border-t border-slate-50 space-y-2">
                                <div className="flex justify-between items-center text-[9px] font-black uppercase"><span className="text-slate-300 tracking-widest">AnyDesk</span><span className="text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded-md border border-red-50">{a.anydesk_id || '---'}</span></div>
                                <div className="flex justify-end pt-1"><span className="text-[8px] font-black text-slate-200 group-hover:text-[#7C69AF] uppercase tracking-widest flex items-center gap-1 transition-colors">Ver Ficha <ChevronRight size={10} /></span></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'servidores' && (
            <div className="space-y-6">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100"><label className="text-[10px] font-black text-slate-400 uppercase mb-4 block flex items-center gap-2"><Server size={14} className="text-[#7C69AF]"/> Infraestrutura</label><textarea className="w-full h-48 bg-slate-50 rounded-3xl p-8 text-sm text-slate-600 font-bold border-none outline-none focus:ring-4 focus:ring-purple-100" value={textos.estrutura_servidores} onChange={e => setTextos({...textos, estrutura_servidores: e.target.value})} /></div>
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100"><label className="text-[10px] font-black text-slate-400 uppercase mb-4 block flex items-center gap-2"><Save size={14} className="text-[#7C69AF]"/> Backup</label><textarea className="w-full h-32 bg-slate-50 rounded-3xl p-8 text-sm text-slate-600 font-bold border-none outline-none focus:ring-4 focus:ring-purple-100" value={textos.rotina_backup} onChange={e => setTextos({...textos, rotina_backup: e.target.value})} /></div>
                <div className="flex justify-end"><button onClick={handleSalvarTextos} className="bg-[#302464] text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-xl active:scale-95 transition-all">Salvar Infraestrutura</button></div>
            </div>
        )}
        
        {activeTab === 'consultoria' && (
            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden border-l-8 border-l-amber-500">
                <h3 className="text-xl font-black text-slate-800 mb-2 flex items-center gap-3"><TrendingUp className="text-amber-500"/> Análise Consultiva</h3>
                <textarea className="w-full h-80 bg-amber-50/50 rounded-[2rem] p-10 text-slate-700 font-bold border-2 border-dashed border-amber-200 outline-none focus:bg-white transition-all" value={textos.pontos_fracos_melhorias} onChange={e => setTextos({...textos, pontos_fracos_melhorias: e.target.value})} />
                <div className="flex justify-end mt-8"><button onClick={handleSalvarTextos} className="bg-amber-500 text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-amber-600 transition-all">Salvar Análise</button></div>
            </div>
        )}

        {activeTab === 'contrato' && (
             <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 mb-2 flex items-center gap-3">
                            <FileText className="text-[#302464]"/> Contratos Vigentes
                        </h3>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest bg-purple-50 inline-block px-3 py-1 rounded-full text-[#7C69AF] font-bold">
                            <Lock size={10} className="inline mr-1"/>
                            Acesso Restrito: Sócios
                        </p>
                    </div>
                    <button onClick={() => setModalAberto('contrato')} className="bg-[#302464] text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-purple-900/20 flex items-center gap-2 hover:bg-[#7C69AF] transition-all">
                        <UploadCloud size={16}/> Anexar PDF
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(cliente?.contratos || []).map(contrato => (
                        <div key={contrato.id} className="group flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] border border-slate-100 hover:bg-white hover:shadow-xl transition-all">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-red-100 text-red-500 rounded-xl">
                                    <FileText size={24} />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-700 text-sm">{contrato.descricao}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">{new Date(contrato.data_upload).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                <a href={contrato.arquivo} target="_blank" rel="noopener noreferrer" className="p-2 bg-white text-[#302464] rounded-lg hover:bg-purple-50 shadow-sm" title="Baixar">
                                    <Download size={16}/>
                                </a>
                                <button onClick={() => handleExcluirItem('/contratos/', contrato.id)} className="p-2 bg-white text-red-400 rounded-lg hover:bg-red-50 shadow-sm" title="Excluir">
                                    <Trash2 size={16}/>
                                </button>
                            </div>
                        </div>
                    ))}
                    {(cliente?.contratos || []).length === 0 && (
                        <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 rounded-[2.5rem] text-slate-300">
                            <p className="font-bold text-sm">Nenhum contrato anexado.</p>
                        </div>
                    )}
                </div>
            </div>
        )}

      </div>

      {/* MODAL */}
      {modalAberto && (
        <div className="fixed inset-0 bg-[#302464]/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-10 relative border border-white/20 max-h-[90vh] overflow-y-auto custom-scrollbar">
                <button onClick={() => { setModalAberto(null); setFormTemp({}); }} className="absolute top-8 right-8 text-slate-400 hover:text-red-500"><X size={24}/></button>
                <h3 className="font-black text-[#302464] text-xl mb-8 uppercase tracking-widest text-[10px]">
                    {modalAberto === 'editar_cliente' ? 'Editar Dados do Cliente' : 'Novo Registro'}
                </h3>
                
                {/* --- MODAL ESPECÍFICO PARA EDITAR CLIENTE --- */}
                {modalAberto === 'editar_cliente' ? (
                    <form onSubmit={handleSalvarEdicaoCliente} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Fantasia / Apelido</label>
                            <input 
                                value={formTemp.nome} 
                                onChange={e => setFormTemp({...formTemp, nome: e.target.value})} 
                                className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl font-bold text-[#302464]"
                                placeholder="Ex: Padaria do João"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Razão Social</label>
                            <input 
                                required
                                value={formTemp.razao_social} 
                                onChange={e => setFormTemp({...formTemp, razao_social: e.target.value})} 
                                className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl font-bold"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Endereço</label>
                            <input 
                                required
                                value={formTemp.endereco} 
                                onChange={e => setFormTemp({...formTemp, endereco: e.target.value})} 
                                className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl font-bold"
                            />
                        </div>
                        <button type="submit" className="w-full py-5 bg-[#302464] text-white rounded-2xl font-black uppercase text-[10px] shadow-xl mt-4 hover:bg-[#7C69AF] transition-all">
                            Salvar Alterações
                        </button>
                    </form>
                ) : (
                    // --- MODAL PADRÃO PARA OUTROS REGISTROS ---
                    <form onSubmit={handleSalvarModal} className="space-y-4">
                        
                        {modalAberto === 'provedor' && (
                            <>
                                <input required placeholder="Operadora" className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl font-bold" onChange={e => setFormTemp({...formTemp, nome_operadora: e.target.value})} />
                                <input placeholder="Plano" className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl font-bold" onChange={e => setFormTemp({...formTemp, plano_contratado: e.target.value})} />
                                <input placeholder="IP Fixo (Opcional)" className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl font-bold font-mono text-slate-600" onChange={e => setFormTemp({...formTemp, ip_fixo: e.target.value})} />
                                
                                <div className="grid grid-cols-2 gap-2">
                                    <input placeholder="Admin / PPPoE" className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl font-bold text-[#7C69AF]" onChange={e => setFormTemp({...formTemp, usuario_pppoe: e.target.value})} />
                                    <input placeholder="Senha Link" className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl font-bold text-[#7C69AF]" onChange={e => setFormTemp({...formTemp, senha_pppoe: e.target.value})} />
                                </div>
                                <input placeholder="Telefone Suporte" className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl font-bold" onChange={e => setFormTemp({...formTemp, telefone_suporte: e.target.value})} />
                            </>
                        )}

                        {modalAberto === 'email' && (
                            <><input required type="email" placeholder="Email" className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl font-bold" onChange={e => setFormTemp({...formTemp, email: e.target.value})} /><input required placeholder="Senha" className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl font-bold" onChange={e => setFormTemp({...formTemp, senha: e.target.value})} /></>
                        )}

                        {modalAberto === 'contato' && (
                            <>
                                <input required placeholder="Nome Completo" className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl font-bold" onChange={e => setFormTemp({...formTemp, nome: e.target.value})} />
                                <input required placeholder="Cargo" className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl font-bold" onChange={e => setFormTemp({...formTemp, cargo: e.target.value})} />
                                <input placeholder="Telefone / Celular" className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl font-bold" onChange={e => setFormTemp({...formTemp, telefone: e.target.value})} />
                            </>
                        )}

                        {modalAberto === 'ativo' && (
                            <>
                                <input required placeholder="Nome do Dispositivo (Hostname)" className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl font-bold" onChange={e => setFormTemp({...formTemp, nome: e.target.value})} />
                                <select required className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl font-bold text-slate-600 outline-none" onChange={e => setFormTemp({...formTemp, tipo: e.target.value})} defaultValue="">
                                    <option value="" disabled>Selecione o Tipo...</option>
                                    <option value="COMPUTADOR">Computador</option>
                                    <option value="SERVIDOR">Servidor</option>
                                    <option value="REDE">Rede / Switch / Roteador</option>
                                    <option value="IMPRESSORA">Impressora</option>
                                    <option value="MONITOR">Monitor</option>
                                    <option value="PERIFERICO">Periférico</option>
                                </select>
                                <input placeholder="Marca / Modelo" className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl font-bold" onChange={e => setFormTemp({...formTemp, marca_modelo: e.target.value})} />
                                <div className="grid grid-cols-2 gap-2"><input placeholder="IP Local" className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl font-bold font-mono" onChange={e => setFormTemp({...formTemp, ip_local: e.target.value})} /><input placeholder="AnyDesk ID" className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl font-bold text-red-500" onChange={e => setFormTemp({...formTemp, anydesk_id: e.target.value})} /></div>
                                <div className="grid grid-cols-2 gap-2"><input placeholder="Usuário Local" className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl font-bold text-xs" onChange={e => setFormTemp({...formTemp, usuario_local: e.target.value})} /><input placeholder="Senha Local" className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl font-bold text-xs" onChange={e => setFormTemp({...formTemp, senha_local: e.target.value})} /></div>
                            </>
                        )}

                        {modalAberto === 'contrato' && (
                            <>
                                <div className="p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-center">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Selecione o PDF</p>
                                    <input required type="file" accept="application/pdf" className="w-full text-xs font-bold text-slate-500" onChange={e => setFormTemp({...formTemp, arquivo: e.target.files[0]})} />
                                </div>
                                <input required placeholder="Descrição (Ex: Contrato 2024)" className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl font-bold" onChange={e => setFormTemp({...formTemp, descricao: e.target.value})} />
                            </>
                        )}

                        <button type="submit" className="w-full py-5 bg-[#302464] text-white rounded-2xl font-black uppercase text-[10px] shadow-xl mt-4 hover:bg-[#7C69AF] transition-all">Confirmar</button>
                    </form>
                )}
            </div>
        </div>
      )}
    </div>
  );
}