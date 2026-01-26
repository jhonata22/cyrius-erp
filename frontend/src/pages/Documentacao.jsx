import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Save, Building2, Wifi, Lock, Monitor, 
  Server, TrendingUp, Phone, Mail, User, Globe, Shield, 
  Search, BookOpen, X, ChevronRight, CheckCircle2, 
  AlertTriangle, Info, MapPin, Plus, Trash2, Eye, EyeOff,
  FileText, Download, UploadCloud // <--- NOVOS ÍCONES
} from 'lucide-react';

// SERVIÇOS
import clienteService from '../services/clienteService';
import documentacaoService from '../services/documentacaoService';
import equipeService from '../services/equipeService';

export default function Documentacao() {
  const { id } = useParams();
  const navigate = useNavigate();
    
  const [listaClientes, setListaClientes] = useState([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);

  const [cliente, setCliente] = useState(null);
  const [ativos, setAtivos] = useState([]);
  const [activeTab, setActiveTab] = useState('geral');
  
  const [currentUser, setCurrentUser] = useState(null);
  const [visiblePasswords, setVisiblePasswords] = useState({});
    
  const [docId, setDocId] = useState(null); 
  const [modalAberto, setModalAberto] = useState(null); 
  const [formTemp, setFormTemp] = useState({}); 

  const [textos, setTextos] = useState({
    configuracao_mikrotik: '',
    topologia_rede: '',
    estrutura_servidores: '',
    rotina_backup: '',
    pontos_fracos_melhorias: ''
    // contrato: removido daqui pois agora é uma lista de arquivos
  });

  const togglePassword = (type, itemId) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [`${type}-${itemId}`]: !prev[`${type}-${itemId}`]
    }));
  };

  const carregarDados = useCallback(async () => {
    try {
      setLoading(true);

      const usuarioLogado = await equipeService.getMe();
      setCurrentUser(usuarioLogado);

      if (!id) {
        const dadosClientes = await clienteService.listar();
        setListaClientes(dadosClientes);
      } else {
        const [dadosCliente, dadosAtivos] = await Promise.all([
          clienteService.buscarPorId(id),
          documentacaoService.listarAtivos()
        ]);
        
        setCliente(dadosCliente);
        setAtivos(dadosAtivos.filter(a => a.cliente === parseInt(id)));

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
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  const handleSalvarTextos = async () => {
    try {
      const payload = { cliente: parseInt(id), ...textos };
      if (docId) await documentacaoService.atualizar(docId, payload);
      else await documentacaoService.criar(payload);
      alert("Dossiê Cyrius Atualizado!");
      carregarDados();
    } catch (error) {
      alert("Erro ao salvar textos.");
    }
  };

  const handleSalvarModal = async (e) => {
    e.preventDefault();
    try {
      let url = '';
      let payload;

      // Lógica específica para Contrato (Upload de Arquivo)
      if (modalAberto === 'contrato') {
        url = '/contratos/'; // Endpoint imaginário para contratos
        
        // Para envio de arquivo, usamos FormData
        const formData = new FormData();
        formData.append('cliente', id);
        formData.append('arquivo', formTemp.arquivo); // O arquivo PDF
        formData.append('descricao', formTemp.descricao);
        
        payload = formData;
      } else {
        // Lógica padrão para JSON
        payload = { ...formTemp, cliente: parseInt(id) };
        if (modalAberto === 'contato') url = '/contatos/';
        if (modalAberto === 'provedor') url = '/provedores/';
        if (modalAberto === 'email') url = '/emails/'; 
        if (modalAberto === 'ativo') url = '/ativos/';
      }

      await documentacaoService.salvarItem(url, payload);
      alert("Registro adicionado!");
      setModalAberto(null);
      setFormTemp({});
      carregarDados();
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar. Verifique os campos.");
    }
  };

  const handleExcluirItem = async (url, itemId) => {
    if (!window.confirm("Deseja remover permanentemente?")) return;
    try {
      await documentacaoService.excluirItem(url, itemId);
      carregarDados();
    } catch (error) {
      alert("Erro ao excluir.");
    }
  };

  const tabs = [
    { id: 'geral', label: 'Cadastro', icon: Building2 },
    { id: 'rede', label: 'Rede', icon: Globe },
    { id: 'senhas', label: 'Emails', icon: Mail },
    { id: 'inventario', label: 'Ativos', icon: Monitor },
    { id: 'servidores', label: 'Infra', icon: Server },
    { id: 'consultoria', label: 'Consultoria', icon: TrendingUp },
  ];

  // --- ALTERAÇÃO 1: RESTRIÇÃO APENAS PARA SÓCIO ---
  if (currentUser && currentUser.cargo === 'SOCIO') {
    tabs.push({ id: 'contrato', label: 'Contratos', icon: FileText });
  }

  if (!id) {
    // ... (Código da lista de clientes mantido igual, omitido para brevidade) ...
    const filtrados = listaClientes.filter(c => c.razao_social.toLowerCase().includes(busca.toLowerCase()));
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
                  <div className="p-4 bg-slate-50 text-[#302464] rounded-2xl group-hover:bg-[#302464] group-hover:text-white transition-all"><Building2 size={24} /></div>
                  <div><h3 className="font-black text-slate-800">{cli.razao_social}</h3><span className="text-[9px] font-black uppercase text-slate-400">{cli.tipo_cliente}</span></div>
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
        
      {/* HEADER CLIENTE */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-[#302464] rounded-2xl shadow-xl flex items-center justify-center text-white"><Building2 size={32} /></div>
            <div>
                <h1 className="text-3xl font-black text-slate-800">{cliente?.razao_social}</h1>
                <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase border border-emerald-100 mt-1 inline-block">{cliente?.tipo_cliente}</span>
            </div>
        </div>
        <button onClick={() => navigate('/documentacao')} className="flex items-center gap-2 text-slate-400 hover:text-[#302464] font-black text-[10px] uppercase tracking-widest transition-all">
            <ArrowLeft size={16} /> Trocar Cliente
        </button>
      </div>

      {/* TABS */}
      <div className="flex justify-center overflow-x-auto gap-2 p-1.5 bg-slate-200/50 rounded-2xl mb-8 no-scrollbar">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-[#302464] shadow-sm' : 'text-slate-500'}`}>
            <tab.icon size={14} /> {tab.label}
          </button>
        ))}
      </div>

      <div className="animate-in slide-in-from-bottom-2 duration-300">
        
        {/* ABA GERAL */}
        {activeTab === 'geral' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                        <h3 className="font-black text-[#302464] text-xs uppercase mb-8">Informações Base</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm text-slate-700">
                            <div><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Razão Social</p><p className="font-bold">{cliente?.razao_social}</p></div>
                            <div><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Documento</p><p className="font-mono">{cliente?.cnpj || cliente?.cpf}</p></div>
                            <div className="md:col-span-2"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Endereço</p><p className="font-bold flex items-center gap-2"><MapPin size={14} className="text-[#A696D1]"/> {cliente?.endereco}</p></div>
                        </div>
                    </div>
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

        {/* ... (ABAS REDE, EMAILS, ATIVOS, SERVIDORES e CONSULTORIA mantidas iguais) ... */}
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

        {/* ... (REPETIR O RESTO DAS ABAS EXISTENTES PARA MANTER O CODIGO COMPLETO) ... */}
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
                    {ativos.map(a => (
                        <div key={a.id} onClick={() => navigate(`/ativos/${a.id}`)} className="group bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden">
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


        {/* --- ALTERAÇÃO 2: NOVA ABA DE CONTRATOS (PDFs) --- */}
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
                <h3 className="font-black text-[#302464] text-xl mb-8 uppercase tracking-widest text-[10px]">Novo Registro</h3>
                <form onSubmit={handleSalvarModal} className="space-y-4">
                    
                    {/* ... (MODAIS EXISTENTES MANTIDOS) ... */}
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

                    {/* --- ALTERAÇÃO 3: INPUT DE UPLOAD PARA CONTRATO --- */}
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
            </div>
        </div>
      )}
    </div>
  );
}