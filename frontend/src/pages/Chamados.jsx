import { useState, useMemo, useLayoutEffect, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Clock, Briefcase, Building2, Calendar, MapPin, Truck, X, 
  ChevronDown, ChevronRight, Search, Info, Monitor, Filter,
  ChevronLeft, ChevronRight as ChevronRightIcon, Lock, ListFilter, UserPlus
} from 'lucide-react';

import { useChamados } from '../contexts/ChamadosContext';
import chamadoService from '../services/chamadoService'; 
import clienteService from '../services/clienteService'; 

const PRIORIDADE_MAP = {
  BAIXA: 'bg-blue-50 text-blue-600 border-blue-100',
  MEDIA: 'bg-indigo-50 text-[#7C69AF] border-indigo-100',
  ALTA: 'bg-purple-50 text-[#302464] border-purple-200',
  CRITICA: 'bg-red-50 text-red-600 border-red-100',
};

const STATUS_MAP = {
  ABERTO: 'bg-emerald-50 text-emerald-600',
  EM_ANDAMENTO: 'bg-blue-50 text-blue-600',
  FINALIZADO: 'bg-slate-100 text-slate-500',
  CANCELADO: 'bg-red-50 text-red-600',
  AGENDADO: 'bg-purple-50 text-[#7C69AF]',
};

export default function Chamados() {
  const navigate = useNavigate();
  
  const {
    loading, chamados, equipe, clientes, ativos, pagina, setPagina, totalItens,
    abaAtiva, setAbaAtiva, contadores, filtroEmpresa, setFiltroEmpresa,
    filtrosData, setFiltrosData, busca, setBusca, empresas, carregarDados,
    scrollPos, setScrollPos, ABAS_FILTRO
  } = useChamados();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('REMOTO');
  
  // Assunto (Subject) State
  const [assuntos, setAssuntos] = useState([]);
  const [subjectSearch, setSubjectSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const subjectInputRef = useRef(null);
  
  // State para Solicitante
  const [contatosCliente, setContatosCliente] = useState([]);
  const [isCreatingSolicitante, setIsCreatingSolicitante] = useState(false);
  
  const [formData, setFormData] = useState({
    cliente: '', ativo: '', assunto: '', novo_assunto: '', descricao_detalhada: '',
    prioridade: 'MEDIA', origem: 'WHATSAPP', data_agendamento: '', 
    custo_ida: '', custo_volta: '', tecnicos: [],
    tecnico: '', 
    empresa: '',
    solicitante: '',
    novo_solicitante_nome: '',
    novo_solicitante_telefone: '',
    novo_solicitante_cargo: ''
  });
  
  console.log("Rendering Chamados component, data:", { chamados, assuntos, loading });

  useEffect(() => {
    if (isModalOpen) {
      const fetchAssuntos = async () => {
        try {
          const data = await chamadoService.listarAssuntos();
          console.log("API RAW DATA:", data);
          setAssuntos(Array.isArray(data) ? data : []);
        } catch (error) {
          console.error("Erro ao buscar assuntos", error);
          setAssuntos([]);
        }
      };
      fetchAssuntos();
    }
  }, [isModalOpen]);

  useEffect(() => {
    if (formData.cliente) {
      setIsCreatingSolicitante(false); // Reseta para modo de seleção
      setFormData(prev => ({ ...prev, solicitante: '', novo_solicitante_nome: '' })); // Limpa seleção anterior
      const fetchContatos = async () => {
        const contatos = await clienteService.listarContatosLista(formData.cliente);
        setContatosCliente(contatos);
        if (contatos.length > 0) {
          // Tenta pré-selecionar o principal, se não, o primeiro
          const principal = contatos.find(c => c.is_principal);
          setFormData(prev => ({ ...prev, solicitante: principal ? principal.id : contatos[0].id }));
        }
      };
      fetchContatos();
    } else {
      setContatosCliente([]);
    }
  }, [formData.cliente]);

  useLayoutEffect(() => {
    if (!loading && scrollPos > 0) window.scrollTo(0, scrollPos);
  }, [loading, scrollPos]);

  const handleNavigate = (id) => {
    setScrollPos(window.scrollY);
    navigate(`/chamados/${id}`);
  };

  const filteredAssuntos = useMemo(() => {
    if (!Array.isArray(assuntos)) return [];
    if (!subjectSearch) return assuntos;
    return assuntos.filter(a => 
      a?.titulo?.toLowerCase().includes(subjectSearch?.toLowerCase() || '')
    );
  }, [subjectSearch, assuntos]);

  const canCreateNew = useMemo(() => {
    if (!subjectSearch || !Array.isArray(assuntos)) return false;
    return !assuntos.some(a => a?.titulo?.toLowerCase() === subjectSearch?.toLowerCase());
  }, [subjectSearch, assuntos]);
  
  const ativosDoCliente = useMemo(() => {
    if (!formData.cliente || !Array.isArray(ativos)) return [];
    const clienteId = parseInt(formData.cliente);
    return ativos.filter(a => (a?.cliente === clienteId || a?.cliente?.id === clienteId));
  }, [formData.cliente, ativos]);

  const clienteSelecionado = useMemo(() => {
    if (!formData.cliente || !Array.isArray(clientes)) return null;
    return clientes.find(c => c?.id === parseInt(formData.cliente));
  }, [formData.cliente, clientes]);

  const handleOpenModal = (mode) => {
    const empresaPadrao = filtroEmpresa || (Array.isArray(empresas) && empresas.length > 0 ? empresas[0].id : '');
    setModalMode(mode);
    setSubjectSearch('');
    setFormData({
      cliente: '', ativo: '', assunto: '', novo_assunto: '', descricao_detalhada: '',
      prioridade: 'MEDIA', origem: 'WHATSAPP', data_agendamento: '', 
      custo_ida: '', custo_volta: '', tecnicos: [],
      tecnico: '',
      empresa: empresaPadrao,
      solicitante: '', novo_solicitante_nome: '', novo_solicitante_telefone: '', novo_solicitante_cargo: ''
    });
    setIsCreatingSolicitante(false);
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'cliente') {
        setFormData(prev => ({ ...prev, [name]: value, ativo: '' }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubjectSearchChange = (e) => {
    const value = e.target.value;
    setSubjectSearch(value);
    setFormData(prev => ({ ...prev, assunto: '', novo_assunto: value }));
    setIsDropdownOpen(true);
  };

  const selectSubject = (subject) => {
    setSubjectSearch(subject?.titulo || '');
    setFormData(prev => ({ ...prev, assunto: subject?.id || '', novo_assunto: '' }));
    setIsDropdownOpen(false);
  };

  const createNewSubject = () => {
    if (!subjectSearch) return;
    setFormData(prev => ({ ...prev, assunto: '', novo_assunto: subjectSearch }));
    setIsDropdownOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validations
    if (!formData.empresa) return alert("Selecione a empresa responsável pelo chamado.");
    if (!formData.cliente) return alert("Selecione um cliente.");
    if (!formData.tecnico) return alert("O técnico responsável é obrigatório.");
    if (!formData.assunto && !formData.novo_assunto) return alert("O assunto é obrigatório.");
    if (clienteSelecionado && !clienteSelecionado.ativo) return alert("Ação bloqueada: Cliente desativado.");

    // Build payload conditionally
    const payload = {
        empresa: formData.empresa,
        cliente: formData.cliente,
        tecnico: formData.tecnico,
        descricao_detalhada: formData.descricao_detalhada,
        prioridade: formData.prioridade,
        origem: formData.origem,
        ativo: formData.ativo || null,
        tecnicos: formData.tecnicos,
        tipo_atendimento: modalMode,
        solicitante: formData.solicitante || null,
        novo_solicitante_nome: formData.novo_solicitante_nome || '',
        novo_solicitante_telefone: formData.novo_solicitante_telefone || '',
        novo_solicitante_cargo: formData.novo_solicitante_cargo || ''
    };

    if (formData.assunto) {
        payload.assunto = formData.assunto;
    } else {
        payload.novo_assunto = formData.novo_assunto;
    }

    if (modalMode === 'VISITA') {
        if (!formData.data_agendamento) return alert("Defina data/hora da visita.");
        payload.status = 'AGENDADO';
        payload.data_agendamento = new Date(formData.data_agendamento).toISOString();
        payload.custo_ida = parseFloat(formData.custo_ida || 0);
        payload.custo_volta = parseFloat(formData.custo_volta || 0);
    } else {
        payload.status = 'EM_ANDAMENTO';
    }

    try {
      const novoChamado = await chamadoService.criar(payload);
      setIsModalOpen(false);
      alert("Chamado criado com sucesso!");
      navigate(`/chamados/${novoChamado.id}`);
    } catch (err) {
      const errorData = err.response?.data;
      let errorMessage = "Erro ao salvar o chamado. Verifique os dados.";
      if (errorData) {
          errorMessage += `\n\nDetalhes:\n${Object.entries(errorData).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`).join("\n")}`;
      }
      alert(errorMessage);
    }
  };

  const totalPaginas = Math.ceil(totalItens / 10);

  return (
    <div className="max-w-7xl mx-auto pb-20 animate-in fade-in duration-500">
      
      <div className="flex flex-col gap-8 mb-10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2"><h1 className="text-3xl font-black text-slate-800 tracking-tight">Atendimentos</h1></div>
            <div className="h-1.5 w-12 bg-[#7C69AF] mt-2 mb-4 rounded-full"></div>
            <div className="flex items-center gap-2 bg-white p-1 pr-4 rounded-xl border border-slate-200 w-fit shadow-sm">
                 <div className="bg-slate-100 p-2 rounded-lg text-slate-500"><Building2 size={16} /></div>
                 <select value={filtroEmpresa} onChange={(e) => { setFiltroEmpresa(e.target.value); setPagina(1); }} className="bg-transparent font-bold text-slate-700 text-sm outline-none cursor-pointer min-w-[200px]">
                    <option value="">🏢 Todas as Empresas</option>
                    <option disabled>──────────</option>
                    {Array.isArray(empresas) && empresas.map(emp => (<option key={emp?.id} value={emp?.id}>{emp?.nome_fantasia}</option>))}
                 </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => handleOpenModal('VISITA')} className="bg-white border-2 border-[#302464] text-[#302464] hover:bg-slate-50 px-6 py-3 rounded-2xl flex items-center gap-2 text-sm font-black transition-all active:scale-95 shadow-sm"><Calendar size={18} /> Agendar Visita</button>
            <button onClick={() => handleOpenModal('REMOTO')} className="bg-[#302464] hover:bg-[#7C69AF] text-white px-6 py-3 rounded-2xl flex items-center gap-2 text-sm font-black shadow-xl shadow-purple-900/20 transition-all active:scale-95"><Plus size={18} /> Novo Chamado</button>
          </div>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            {Array.isArray(ABAS_FILTRO) && ABAS_FILTRO.map(aba => {
                const count = aba.id === 'PENDENTES' ? contadores.PENDENTES : aba.id === 'ANDAMENTO' ? contadores.ANDAMENTO : aba.id === 'VISITAS' ? contadores.VISITAS : 0;
                return (
                    <button key={aba?.id} onClick={() => { setAbaAtiva(aba.id); setPagina(1); }} className={`whitespace-nowrap px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border flex items-center ${abaAtiva === aba.id ? 'bg-[#302464] text-white border-[#302464] shadow-md' : 'bg-white text-slate-400 border-slate-200 hover:border-[#7C69AF] hover:text-[#7C69AF]'}`}>
                        {aba?.label}
                        {count > 0 && (<span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] ${abaAtiva === aba.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>{count}</span>)}
                    </button>
                )
            })}
        </div>
        <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Pesquisar protocolo, cliente ou título..." value={busca} onChange={e => { setBusca(e.target.value); setPagina(1); }} className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl outline-none focus:ring-4 focus:ring-purple-500/5 text-sm font-medium transition-all"/>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
            <Filter size={16} className="text-slate-400" /><input type="date" className="bg-transparent border-none text-xs font-black text-slate-600 outline-none" value={filtrosData.inicio} onChange={e => { setFiltrosData({...filtrosData, inicio: e.target.value}); setPagina(1); }}/>
            <span className="text-slate-300 font-bold">~</span>
            <input type="date" className="bg-transparent border-none text-xs font-black text-slate-600 outline-none" value={filtrosData.fim} onChange={e => { setFiltrosData({...filtrosData, fim: e.target.value}); setPagina(1); }}/>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="py-20 text-center text-[#7C69AF] animate-pulse font-black uppercase tracking-widest text-xs">Sincronizando Atendimentos...</div>
        ) : !Array.isArray(chamados) || chamados.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
             <ListFilter size={48} className="mx-auto text-slate-100 mb-4" /><p className="text-slate-400 font-bold tracking-tight">Nenhum atendimento encontrado.</p>
             <button onClick={() => setAbaAtiva('TODOS')} className="mt-4 text-[#7C69AF] text-xs font-black uppercase hover:underline">Limpar filtros</button>
          </div>
        ) : (
          <>
            {chamados.map((item) => (
              <div key={item?.id} onClick={() => handleNavigate(item.id)} className="group bg-white p-6 rounded-[2.2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6 flex-1 w-full md:w-auto">
                  <div className={`p-4 rounded-2xl shadow-inner shrink-0 ${item?.tipo_atendimento === 'VISITA' ? 'bg-purple-50 text-[#7C69AF]' : 'bg-slate-50 text-[#302464]'}`}>
                    {item?.tipo_atendimento === 'VISITA' ? <Truck size={28} /> : <Briefcase size={28} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-[10px] font-black text-slate-300 tracking-tighter">#{item?.protocolo}</span>
                      <span className={`text-[9px] font-black px-3 py-1 rounded-lg border uppercase tracking-widest ${PRIORIDADE_MAP[item?.prioridade] || ''}`}>{item?.prioridade}</span>
                      <span className={`text-[9px] font-black px-3 py-1 rounded-lg uppercase tracking-widest ${STATUS_MAP[item?.status] || ''}`}>{item?.status?.replace('_', ' ')}</span>
                      {item?.empresa_nome && !filtroEmpresa && (<span className="text-[9px] font-black px-2 py-0.5 rounded border bg-gray-50 text-gray-500 uppercase">{item?.empresa_nome}</span>)}
                    </div>
                    <h3 className="text-lg font-black text-slate-800 group-hover:text-[#7C69AF] transition-colors truncate">{item?.titulo}</h3>
                    <div className="flex flex-wrap items-center gap-4 mt-2">
                      <span className="text-[11px] text-slate-500 flex items-center gap-1.5 font-bold uppercase tracking-wide truncate"><Building2 size={13} className="text-slate-300" /> {item?.nome_cliente}</span>
                      {item?.nome_ativo && (<span className="text-[11px] text-slate-500 flex items-center gap-1.5 font-bold uppercase tracking-wide truncate hidden sm:flex"><Monitor size={13} className="text-slate-300" /> {item?.nome_ativo}</span>)}
                      <span className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium whitespace-nowrap">
                        {item?.tipo_atendimento === 'VISITA' ? (<><Calendar size={13} className="text-[#A696D1]" /> {item?.data_agendamento ? new Date(item.data_agendamento).toLocaleString('pt-BR') : 'Data Pendente'}</>) : (<><Clock size={13} className="text-[#A696D1]" /> {new Date(item?.data_abertura || item?.created_at).toLocaleDateString('pt-BR')}</>)}
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="text-slate-200 group-hover:text-[#7C69AF] group-hover:translate-x-1 transition-all hidden md:block" />
              </div>
            ))}
            {totalPaginas > 1 && (<div className="flex items-center justify-center gap-6 pt-10"><button disabled={pagina === 1} onClick={(e) => { e.stopPropagation(); setPagina(p => Math.max(1, p - 1)); }} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition-all shadow-sm"><ChevronLeft size={20} /></button><div className="flex items-center gap-3"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Página</span><div className="w-10 h-10 bg-[#302464] text-white rounded-xl flex items-center justify-center font-black text-sm">{pagina}</div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">de {totalPaginas}</span></div><button disabled={pagina >= totalPaginas} onClick={(e) => { e.stopPropagation(); setPagina(p => Math.min(totalPaginas, p + 1)); }} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition-all shadow-sm"><ChevronRightIcon size={20} /></button></div>)}
          </>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-[#302464]/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto relative border border-white/20">
             <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 text-slate-400 hover:text-[#302464] transition-colors"><X size={24} /></button>
             <h2 className="text-2xl font-black text-[#302464] mb-8 flex items-center gap-3">
               {modalMode === 'VISITA' ? <Truck className="text-[#7C69AF]" /> : <Plus className="text-[#7C69AF]" />}
               {modalMode === 'VISITA' ? 'Agendar Visita Técnica' : 'Novo Chamado Remoto'}
             </h2>
             <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {modalMode === 'VISITA' && <div className="md:col-span-2 bg-purple-50 p-6 rounded-3xl border border-purple-100 animate-in slide-in-from-top-2 mb-2"><div className="flex gap-4 items-center mb-4"><Truck className="text-[#7C69AF]" size={24} /><h3 className="font-black text-[#302464] text-sm uppercase tracking-widest">Detalhes do Agendamento</h3></div><div className="space-y-1"><label className="text-[10px] font-black text-[#302464] uppercase tracking-widest block mb-1">Data e Hora da Visita</label><input type="datetime-local" name="data_agendamento" required value={formData.data_agendamento} onChange={handleInputChange} className="w-full bg-white px-5 py-4 rounded-2xl border-none outline-none focus:ring-4 focus:ring-purple-200 font-bold text-[#302464] shadow-sm"/></div></div>}
                <div className="md:col-span-2 space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Filial Responsável</label><select name="empresa" required value={formData.empresa} onChange={handleInputChange} className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-xl outline-none font-bold text-slate-700">{Array.isArray(empresas) && empresas.map(emp => <option key={emp?.id} value={emp?.id}>{emp?.nome_fantasia}</option>)}</select></div>
                <div className="md:col-span-2 space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cliente</label><select name="cliente" required value={formData.cliente} onChange={handleInputChange} className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-xl outline-none font-bold text-slate-700"><option value="">Selecione...</option>{Array.isArray(clientes) && clientes.map(c => <option key={c?.id} value={c?.id}>{c?.nome || c?.razao_social}</option>)}</select></div>

                <div className="md:col-span-2 space-y-2">
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
                      <input type="text" name="novo_solicitante_nome" placeholder="Nome Completo" required value={formData.novo_solicitante_nome} onChange={handleInputChange} className="sm:col-span-2 w-full px-4 py-2.5 bg-white border-none rounded-lg outline-none font-bold text-slate-700" />
                      <input type="text" name="novo_solicitante_telefone" placeholder="Telefone" value={formData.novo_solicitante_telefone} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-white border-none rounded-lg outline-none font-bold text-slate-700" />
                      <input type="text" name="novo_solicitante_cargo" placeholder="Cargo" value={formData.novo_solicitante_cargo} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-white border-none rounded-lg outline-none font-bold text-slate-700" />
                    </div>
                  ) : (
                    <select name="solicitante" value={formData.solicitante} onChange={handleInputChange} className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-xl outline-none font-bold text-slate-700" disabled={!formData.cliente || contatosCliente.length === 0}>
                      <option value="">{formData.cliente ? (contatosCliente.length > 0 ? 'Selecione o solicitante...' : 'Nenhum contato, crie um novo.') : 'Selecione um cliente primeiro'}</option>
                      {contatosCliente.map(c => <option key={c.id} value={c.id}>{c.nome}{c.cargo ? ` (${c.cargo})` : ''}</option>)} 
                    </select>
                  )}
                </div>

                <div className="md:col-span-2 space-y-1 relative" ref={subjectInputRef}>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assunto</label>
                  <div className="relative">
                    <input name="subject_search" required value={subjectSearch} onChange={handleSubjectSearchChange} onFocus={() => setIsDropdownOpen(true)} onBlur={() => setTimeout(() => setIsDropdownOpen(false), 150)} className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-xl font-bold outline-none focus:ring-4 focus:ring-purple-200" placeholder="Pesquisar ou criar assunto..." autoComplete="off"/>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                  </div>
                  {isDropdownOpen && (
                    <div className="absolute top-full mt-2 w-full bg-white shadow-2xl border border-slate-100 rounded-2xl overflow-y-auto z-50 max-h-60 p-2 animate-in fade-in slide-in-from-top-2">
                      {canCreateNew && subjectSearch && (<div onMouseDown={createNewSubject} className="px-4 py-3 text-sm font-bold text-white bg-[#302464] rounded-lg cursor-pointer flex items-center gap-2 mb-1"><Plus size={16} /> Criar novo: "{subjectSearch}"</div>)}
                      {Array.isArray(filteredAssuntos) && filteredAssuntos.map(item => (<div key={item?.id} onMouseDown={() => selectSubject(item)} className="px-4 py-3 text-sm font-bold text-slate-700 rounded-lg hover:bg-purple-50 hover:text-[#302464] cursor-pointer">{item?.titulo}</div>))}
                      {!canCreateNew && Array.isArray(filteredAssuntos) && filteredAssuntos.length === 0 && subjectSearch && (<div className="px-4 py-3 text-sm font-medium text-slate-400">Nenhum assunto encontrado.</div>)}
                    </div>
                  )}
                </div>
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Técnico Responsável</label><select name="tecnico" required value={formData.tecnico} onChange={handleInputChange} className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-xl outline-none font-bold text-slate-700"><option value="">Selecione...</option>{Array.isArray(equipe) && equipe.map(t => <option key={t?.id} value={t?.id}>{t?.nome}</option>)}</select></div>
                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Canal de Comunicação</label><select name="origem" value={formData.origem} onChange={handleInputChange} className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-xl outline-none font-bold text-slate-700"><option value="TELEFONE">Telefone</option><option value="WHATSAPP">WhatsApp</option><option value="EMAIL">E-mail</option><option value="SISTEMA">Sistema</option><option value="OUTRO">Outro</option></select></div>
                <div className="md:col-span-2 space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ativo Vinculado (Opcional)</label><select name="ativo" value={formData.ativo} onChange={handleInputChange} className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-xl outline-none font-medium text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed" disabled={!formData.cliente || !Array.isArray(ativosDoCliente) || ativosDoCliente.length === 0}><option value="">{formData.cliente ? 'Nenhum ativo vinculado' : 'Selecione um cliente primeiro'}</option>{Array.isArray(ativosDoCliente) && ativosDoCliente.map(a => <option key={a?.id} value={a?.id}>{a?.nome + (a?.tipo ? ` (${a.tipo})` : '')}</option>)}</select></div>
                <div className="md:col-span-2 space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição</label><textarea name="descricao_detalhada" required value={formData.descricao_detalhada} onChange={handleInputChange} className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-xl font-medium"/></div>
                <button className="md:col-span-2 w-full py-5 bg-[#302464] text-white rounded-3xl font-black text-lg">Confirmar</button>
             </form>
           </div>
        </div>
      )}

    </div>
  );
}
