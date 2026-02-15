import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Wrench, Truck, Monitor, 
  Search, Clock, CheckCircle, XCircle, AlertCircle, Building2, User, AlertTriangle, UserPlus 
} from 'lucide-react';

import servicoService from '../services/servicoService';
import clienteService from '../services/clienteService';
import equipeService from '../services/equipeService';
import ativoService from '../services/ativoService'; 

// 1. IMPORTAR O HOOK DE EMPRESAS
import { useEmpresas } from '../hooks/useEmpresas';

export default function Servicos() {
  const navigate = useNavigate();
  
  // 2. CONFIGURAR HOOK E SELETOR LOCAL
  const { empresas } = useEmpresas();
  const [filtroEmpresa, setFiltroEmpresa] = useState('');

  const [servicos, setServicos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [ativos, setAtivos] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  // NOVOS FILTROS
  const [filtroStatus, setFiltroStatus] = useState('TODOS');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // State para Solicitante
  const [contatosCliente, setContatosCliente] = useState([]);
  const [isCreatingSolicitante, setIsCreatingSolicitante] = useState(false);

  // Form para Nova OS
  const [formData, setFormData] = useState({
    cliente: '',
    ativo: '', 
    titulo: '',
    tipo: 'LABORATORIO',
    descricao_problema: '',
    tecnicos: [],
    empresa: '', // Adicionado campo empresa ao formulário
    solicitante: '',
    novo_solicitante_nome: '',
    novo_solicitante_telefone: '',
    novo_solicitante_cargo: ''
  });

  // 3. CARREGAR DADOS COM FILTRO DE EMPRESA
  const carregarDados = useCallback(async () => {
    try {
      setLoading(true);
      
      const empresaId = filtroEmpresa || null; 

      const [listaServicos, listaClientes, listaEquipe, listaAtivos] = await Promise.all([
        servicoService.listar({}, empresaId), 
        clienteService.listar(empresaId), 
        equipeService.listar(empresaId), 
        ativoService.listar(empresaId) 
      ]);

      setServicos(listaServicos);
      setClientes(listaClientes);
      setAtivos(listaAtivos);
      
      const tecnicosElegiveis = listaEquipe.filter(m => ['TECNICO', 'GESTOR', 'SOCIO', 'ESTAGIARIO'].includes(m.cargo));
      setTecnicos(tecnicosElegiveis);

    } catch (error) {
      console.error("Erro ao carregar dados", error);
    } finally {
      setLoading(false);
    }
  }, [filtroEmpresa]); 

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  useEffect(() => {
    if (formData.cliente) {
      setIsCreatingSolicitante(false); // Reseta para modo de seleção
      setFormData(prev => ({ ...prev, solicitante: '', novo_solicitante_nome: '' })); // Limpa seleção anterior
      const fetchContatos = async () => {
        const contatos = await clienteService.listarContatosLista(formData.cliente);
        setContatosCliente(contatos);
        if (contatos.length > 0) {
          const principal = contatos.find(c => c.is_principal);
          setFormData(prev => ({ ...prev, solicitante: principal ? principal.id : contatos[0].id }));
        }
      };
      fetchContatos();
    } else {
      setContatosCliente([]);
    }
  }, [formData.cliente]);

  // --- FILTRO INTELIGENTE DE ATIVOS ---
  const ativosDoCliente = useMemo(() => {
    if (!formData.cliente) return [];
    return ativos.filter(a => a.cliente === parseInt(formData.cliente) || a.cliente?.id === parseInt(formData.cliente));
  }, [formData.cliente, ativos]);

  // --- LÓGICA DE MULTI-SELEÇÃO DE TÉCNICOS ---
  const toggleTecnico = (tecnicoId) => {
      setFormData(prev => {
          const jaSelecionado = prev.tecnicos.includes(tecnicoId);
          if (jaSelecionado) {
              return { ...prev, tecnicos: prev.tecnicos.filter(id => id !== tecnicoId) };
          } else {
              return { ...prev, tecnicos: [...prev.tecnicos, tecnicoId] };
          }
      });
  };

  // --- LÓGICA DE ABERTURA DO MODAL (CORRIGIDA) ---
  const handleOpenModal = () => {
    // Se o filtro global já estiver selecionado, usa ele.
    // Se estiver em "TODAS", pega a primeira empresa da lista como padrão.
    const empresaPadrao = filtroEmpresa || (empresas.length > 0 ? empresas[0].id : '');

    setFormData({
        cliente: '', 
        ativo: '', 
        titulo: '', 
        tipo: 'LABORATORIO',
        descricao_problema: '', 
        tecnicos: [],
        empresa: empresaPadrao, // Preenche com o padrão inteligente
        solicitante: '', novo_solicitante_nome: '', novo_solicitante_telefone: '', novo_solicitante_cargo: ''
    });
    setIsCreatingSolicitante(false);
    setIsModalOpen(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();

    if (!formData.empresa) return alert("Erro: Selecione a empresa responsável pela O.S.");
    if (!formData.cliente) return alert("Erro: Selecione um cliente.");

    try {
      // Prepara o payload
      const payload = {
        ...formData,
        cliente: parseInt(formData.cliente),
        ativo: formData.ativo ? parseInt(formData.ativo) : null,
        
        // VINCULA À EMPRESA SELECIONADA NO FORMULÁRIO (Ignora o filtro visual)
        empresa: formData.empresa, 
        solicitante: formData.solicitante || null,
        novo_solicitante_nome: formData.novo_solicitante_nome || '',
        novo_solicitante_telefone: formData.novo_solicitante_telefone || '',
        novo_solicitante_cargo: formData.novo_solicitante_cargo || ''
      };

      const novaOs = await servicoService.criar(payload);
      
      setIsModalOpen(false);
      navigate(`/servicos/${novaOs.id}`);
    } catch (error) {
      alert("Erro ao criar OS. Verifique os campos.");
    }
  };

  // --- HELPERS VISUAIS ---
  const getStatusStyle = (status) => {
    switch (status) {
        case 'ORCAMENTO': return 'bg-amber-50 text-amber-600 border-amber-100';
        case 'APROVADO': return 'bg-blue-50 text-blue-600 border-blue-100';
        case 'EM_EXECUCAO': return 'bg-purple-50 text-purple-600 border-purple-100';
        case 'AGUARDANDO_PECA': return 'bg-red-50 text-red-500 border-red-100 animate-pulse';
        case 'CONCLUIDO': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
        case 'CANCELADO': return 'bg-slate-100 text-slate-500 border-slate-200';
        default: return 'bg-slate-50 text-slate-500 border-slate-100';
    }
  };

  const getTypeIcon = (tipo) => {
      switch (tipo) {
          case 'EXTERNO': return <Truck size={16} />;
          case 'REMOTO': return <Monitor size={16} />;
          default: return <Wrench size={16} />;
      }
  };

  const servicosFiltrados = servicos.filter(os => {
      if (filtroStatus === 'TODOS') return true;
      if (filtroStatus === 'ORCAMENTO') return os.status === 'ORCAMENTO';
      if (filtroStatus === 'ANDAMENTO') return ['APROVADO', 'EM_EXECUCAO', 'AGUARDANDO_PECA'].includes(os.status);
      if (filtroStatus === 'FINALIZADOS') return ['CONCLUIDO', 'CANCELADO'].includes(os.status);
      return true;
  });

  // Identifica a empresa selecionada no form para exibir o nome no aviso
  const empresaNoFormulario = empresas.find(e => String(e.id) === String(formData.empresa));

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      
      {/* HEADER & FILTROS */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <Wrench className="text-[#7C69AF]" /> Gestão de Serviços
          </h1>
          
          {/* SELETOR DE EMPRESA NO HEADER (FILTRO VISUAL) */}
          <div className="mt-4 flex items-center gap-2 bg-white p-1 pr-4 rounded-xl border border-slate-200 w-fit shadow-sm">
             <div className="bg-slate-100 p-2 rounded-lg text-slate-500">
                <Building2 size={16} />
             </div>
             <select 
                value={filtroEmpresa}
                onChange={(e) => setFiltroEmpresa(e.target.value)}
                className="bg-transparent font-bold text-slate-700 text-sm outline-none cursor-pointer min-w-[200px]"
             >
                <option value="">🏢 Todas as Empresas</option>
                <option disabled>──────────</option>
                {empresas.map(emp => (
                    <option key={emp.id} value={emp.id}>
                        {emp.nome_fantasia}
                    </option>
                ))}
             </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto mt-4 xl:mt-0">
            {/* TABS DE STATUS */}
            <div className="bg-white p-1 rounded-xl flex shadow-sm border border-slate-100 overflow-x-auto">
                {[
                    { id: 'TODOS', label: 'Todos' },
                    { id: 'ORCAMENTO', label: 'Orçamentos' },
                    { id: 'ANDAMENTO', label: 'Em Andamento' },
                    { id: 'FINALIZADOS', label: 'Finalizados' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setFiltroStatus(tab.id)}
                        className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap
                            ${filtroStatus === tab.id 
                                ? 'bg-[#302464] text-white shadow-md' 
                                : 'text-slate-400 hover:text-[#302464] hover:bg-slate-50'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <button 
                onClick={handleOpenModal}
                className="bg-[#302464] hover:bg-[#7C69AF] text-white px-6 py-3 rounded-xl flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest shadow-xl shadow-purple-900/20 transition-all active:scale-95"
            >
                <Plus size={18} /> Nova O.S.
            </button>
        </div>
      </div>

      {/* GRID DE CARDS */}
      {loading ? (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3].map(i => <div key={i} className="h-64 bg-white rounded-[2rem] animate-pulse"></div>)}
         </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
            {servicosFiltrados.map(os => (
                <div 
                    key={os.id}
                    onClick={() => navigate(`/servicos/${os.id}`)}
                    className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer relative overflow-hidden"
                >
                    <div className={`absolute left-0 top-0 bottom-0 w-2 ${getStatusStyle(os.status).split(' ')[0]}`}></div>

                    <div className="flex justify-between items-start mb-4 pl-4">
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                            OS #{String(os.id).padStart(4, '0')}
                        </span>
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${getStatusStyle(os.status)}`}>
                            {os.status.replace('_', ' ')}
                        </span>
                    </div>

                    <div className="pl-4 mb-6">
                        <h3 className="font-black text-slate-800 text-lg leading-tight mb-1 group-hover:text-[#7C69AF] transition-colors line-clamp-2">
                            {os.titulo}
                        </h3>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wide truncate">
                            {os.nome_cliente}
                        </p>
                        {os.nome_ativo && (
                           <p className="text-[#7C69AF] text-[10px] font-black uppercase tracking-widest mt-1 flex items-center gap-1">
                              <Monitor size={10} /> {os.nome_ativo}
                           </p>
                        )}
                        {/* Exibe o nome da empresa se estiver vendo todas */}
                        {os.empresa_nome && !filtroEmpresa && (
                            <p className="mt-2 text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded w-fit uppercase font-bold">
                                {os.empresa_nome}
                            </p>
                        )}
                    </div>

                    <div className="pl-4 pt-4 border-t border-slate-50 flex items-center justify-between text-slate-400">
                        <div className="flex items-center gap-2" title={os.tipo}>
                            <div className="p-2 bg-slate-50 rounded-lg text-[#7C69AF]">
                                {getTypeIcon(os.tipo)}
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest">{os.tipo}</span>
                        </div>
                        
                        <div className="text-right">
                             {(os.tecnicos && os.tecnicos.length > 0) ? (
                                <p className="text-[9px] font-bold mb-1 text-[#302464]">
                                    {os.tecnicos.length} Técnicos
                                </p>
                             ) : os.nome_tecnico ? (
                                <p className="text-[9px] font-bold mb-1 text-[#302464]">
                                    {os.nome_tecnico.split(' ')[0]}
                                </p>
                             ) : (
                                <p className="text-[9px] font-bold mb-1 text-slate-300">Sem Técnico</p>
                             )}

                             <p className="text-[9px] font-bold mt-1 text-slate-300">
                                {new Date(os.created_at || os.data_entrada).toLocaleDateString()}
                             </p>
                        </div>
                    </div>
                </div>
            ))}
            
            {servicosFiltrados.length === 0 && (
                <div className="col-span-full py-20 text-center">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                        <Wrench size={32} />
                    </div>
                    <p className="text-slate-400 font-bold">Nenhuma ordem de serviço encontrada neste filtro.</p>
                </div>
            )}
        </div>
      )}

      {/* MODAL NOVA OS */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#302464]/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
             <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg p-8 relative overflow-y-auto max-h-[90vh]">
                <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-slate-300 hover:text-red-500 transition-colors">
                    <XCircle size={24} />
                </button>

                <h2 className="text-2xl font-black text-[#302464] mb-6">Abrir Nova OS</h2>
                
                {/* AVISO DE EMPRESA SELECIONADA */}
                {empresaNoFormulario ? (
                    <div className="mb-6 p-3 bg-purple-50 rounded-xl border border-purple-100 flex items-center gap-3">
                        <Building2 className="text-[#302464]" size={18} />
                        <p className="text-xs font-bold text-[#302464]">
                            Vinculado à filial: <span className="uppercase">{empresaNoFormulario.nome_fantasia}</span>
                        </p>
                    </div>
                ) : (
                    <div className="mb-6 p-3 bg-red-50 rounded-xl border border-red-100 flex items-center gap-3">
                        <AlertTriangle className="text-red-600" size={18} />
                        <p className="text-xs font-bold text-red-700">
                            Atenção: Selecione uma filial abaixo.
                        </p>
                    </div>
                )}

                <form onSubmit={handleCreate} className="space-y-4">
                    
                    {/* CAMPO DE SELEÇÃO DE EMPRESA (NOVO) */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Filial Responsável</label>
                        <select 
                            className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#7C69AF]"
                            value={formData.empresa}
                            onChange={e => setFormData({...formData, empresa: e.target.value})}
                            required
                        >
                            {empresas.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.nome_fantasia}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cliente</label>
                        <select 
                            className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#7C69AF]"
                            value={formData.cliente}
                            onChange={e => setFormData({...formData, cliente: e.target.value, ativo: ''})} 
                            required
                        >
                            <option value="">Selecione o Cliente...</option>
                            {clientes.map(c => (
                                <option key={c.id} value={c.id}>{c.nome_fantasia || c.nome || c.razao_social}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Solicitante</label>
                            {formData.cliente && (
                            <button type="button" onClick={() => setIsCreatingSolicitante(!isCreatingSolicitante)} className="text-xs font-bold text-[#7C69AF] flex items-center gap-1">
                                <UserPlus size={14}/> {isCreatingSolicitante ? 'Selecionar Existente' : '+ Novo Contato'}
                            </button>
                            )}
                        </div>

                        {isCreatingSolicitante ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-purple-50 p-4 rounded-2xl border border-purple-100">
                            <input type="text" name="novo_solicitante_nome" placeholder="Nome Completo" required value={formData.novo_solicitante_nome} onChange={(e) => setFormData({...formData, novo_solicitante_nome: e.target.value})} className="sm:col-span-2 w-full px-4 py-2.5 bg-white border-none rounded-lg outline-none font-bold text-slate-700" />
                            <input type="text" name="novo_solicitante_telefone" placeholder="Telefone" value={formData.novo_solicitante_telefone} onChange={(e) => setFormData({...formData, novo_solicitante_telefone: e.target.value})} className="w-full px-4 py-2.5 bg-white border-none rounded-lg outline-none font-bold text-slate-700" />
                            <input type="text" name="novo_solicitante_cargo" placeholder="Cargo" value={formData.novo_solicitante_cargo} onChange={(e) => setFormData({...formData, novo_solicitante_cargo: e.target.value})} className="w-full px-4 py-2.5 bg-white border-none rounded-lg outline-none font-bold text-slate-700" />
                            </div>
                        ) : (
                            <select name="solicitante" value={formData.solicitante} onChange={(e) => setFormData({...formData, solicitante: e.target.value})} className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-slate-700 outline-none" disabled={!formData.cliente || contatosCliente.length === 0}>
                            <option value="">{formData.cliente ? (contatosCliente.length > 0 ? 'Selecione o solicitante...' : 'Nenhum contato, crie um novo.') : 'Selecione um cliente primeiro'}</option>
                            {contatosCliente.map(c => <option key={c.id} value={c.id}>{c.nome}{c.cargo ? ` (${c.cargo})` : ''}</option>)} 
                            </select>
                        )}
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                            <Monitor size={10} /> Equipamento / Ativo (Opcional)
                        </label>
                        <select 
                            className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#7C69AF] disabled:opacity-50 disabled:cursor-not-allowed"
                            value={formData.ativo}
                            onChange={e => setFormData({...formData, ativo: e.target.value})}
                            disabled={!formData.cliente}
                        >
                            <option value="">{formData.cliente ? 'Selecione ou deixe vazio...' : 'Selecione um cliente antes...'}</option>
                            {ativosDoCliente.map(a => (
                                <option key={a.id} value={a.id}>{a.nome} ({a.tipo})</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Técnicos Responsáveis</label>
                        <div className="flex flex-wrap gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 max-h-32 overflow-y-auto custom-scrollbar">
                            {tecnicos.length === 0 && <span className="text-xs text-slate-400 italic">Nenhum técnico disponível na empresa selecionada.</span>}
                            {tecnicos.map(t => {
                                const isSelected = formData.tecnicos.includes(t.id);
                                return (
                                    <button
                                        type="button"
                                        key={t.id}
                                        onClick={() => toggleTecnico(t.id)}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border
                                            ${isSelected 
                                                ? 'bg-[#302464] text-white border-[#302464]' 
                                                : 'bg-white text-slate-500 border-slate-200 hover:border-[#302464]'
                                            }`}
                                    >
                                        <User size={12} />
                                        {t.nome}
                                        {isSelected && <CheckCircle size={10} className="text-emerald-400"/>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-1 space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo</label>
                            <select 
                                className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-slate-700 outline-none"
                                value={formData.tipo}
                                onChange={e => setFormData({...formData, tipo: e.target.value})}
                            >
                                <option value="LABORATORIO">Lab</option>
                                <option value="EXTERNO">Externo</option>
                                <option value="REMOTO">Remoto</option>
                            </select>
                        </div>
                        <div className="col-span-2 space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Título do Serviço</label>
                            <input 
                                className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#7C69AF]"
                                placeholder="Ex: Formatação"
                                value={formData.titulo}
                                onChange={e => setFormData({...formData, titulo: e.target.value})}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição do Problema</label>
                        <textarea 
                            className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#7C69AF] resize-none h-24"
                            placeholder="Descreva o que precisa ser feito..."
                            value={formData.descricao_problema}
                            onChange={e => setFormData({...formData, descricao_problema: e.target.value})}
                            required
                        />
                    </div>

                    <button 
                        type="submit"
                        disabled={!formData.empresa}
                        className="w-full py-4 bg-[#302464] hover:bg-[#7C69AF] text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-purple-900/20 transition-all mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Iniciar Ordem de Serviço
                    </button>
                </form>
             </div>
        </div>
      )}

    </div>
  );
}