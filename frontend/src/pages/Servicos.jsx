import { useState, useEffect, useMemo } from 'react'; // <--- useMemo ADICIONADO
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Wrench, Truck, Monitor, Calendar, 
  User, Search, Clock, CheckCircle, XCircle, AlertCircle 
} from 'lucide-react';
import servicoService from '../services/servicoService';
import clienteService from '../services/clienteService';
import equipeService from '../services/equipeService';
import ativoService from '../services/ativoService'; // <--- 1. IMPORTADO

export default function Servicos() {
  const navigate = useNavigate();
  const [servicos, setServicos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [ativos, setAtivos] = useState([]); // <--- 2. ESTADO DOS ATIVOS
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState('TODOS');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form para Nova OS
  const [formData, setFormData] = useState({
    cliente: '',
    ativo: '', // <--- 3. CAMPO NO STATE
    titulo: '',
    tipo: 'LABORATORIO',
    descricao_problema: '',
    tecnico_responsavel: ''
  });

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      // Carrega Serviços, Clientes, Equipe e ATIVOS
      const [listaServicos, listaClientes, listaEquipe, listaAtivos] = await Promise.all([
        servicoService.listar(),
        clienteService.listar(),
        equipeService.listar(),
        ativoService.listar() // <--- 4. CARREGA ATIVOS
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
  };

  // --- FILTRO INTELIGENTE DE ATIVOS ---
  const ativosDoCliente = useMemo(() => {
    if (!formData.cliente) return [];
    // Filtra onde o ID do cliente bate com o selecionado
    return ativos.filter(a => a.cliente === parseInt(formData.cliente) || a.cliente?.id === parseInt(formData.cliente));
  }, [formData.cliente, ativos]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      // Prepara o payload
      const payload = {
        ...formData,
        cliente: parseInt(formData.cliente),
        ativo: formData.ativo ? parseInt(formData.ativo) : null // <--- 5. ENVIA O ATIVO
      };

      if (formData.tecnico_responsavel) {
          payload.tecnico_responsavel = parseInt(formData.tecnico_responsavel);
      } else {
          delete payload.tecnico_responsavel;
      }

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
      if (filtroStatus === 'ABERTOS') return ['ORCAMENTO', 'APROVADO', 'EM_EXECUCAO', 'AGUARDANDO_PECA'].includes(os.status);
      if (filtroStatus === 'FINALIZADOS') return ['CONCLUIDO', 'CANCELADO'].includes(os.status);
      return true;
  });

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      
      {/* HEADER & FILTROS */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <Wrench className="text-[#7C69AF]" /> Gestão de Serviços
          </h1>
          <p className="text-slate-400 font-medium mt-1">Laboratório, Projetos e Manutenções Externas</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
            <div className="bg-white p-1 rounded-xl flex shadow-sm border border-slate-100">
                {['TODOS', 'ABERTOS', 'FINALIZADOS'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setFiltroStatus(tab)}
                        className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all
                            ${filtroStatus === tab 
                                ? 'bg-[#302464] text-white shadow-md' 
                                : 'text-slate-400 hover:text-[#302464] hover:bg-slate-50'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <button 
                onClick={() => setIsModalOpen(true)}
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
                        {/* Exibe o nome do ativo se existir */}
                        {os.nome_ativo && (
                           <p className="text-[#7C69AF] text-[10px] font-black uppercase tracking-widest mt-1 flex items-center gap-1">
                              <Monitor size={10} /> {os.nome_ativo}
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
                             {os.nome_tecnico && (
                                <p className="text-[9px] font-bold mb-1 text-[#302464]">
                                    Resp: {os.nome_tecnico.split(' ')[0]}
                                </p>
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
                    <p className="text-slate-400 font-bold">Nenhuma ordem de serviço encontrada.</p>
                </div>
            )}
        </div>
      )}

      {/* MODAL NOVA OS */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#302464]/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
             <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg p-8 relative">
                <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-slate-300 hover:text-red-500 transition-colors">
                    <XCircle size={24} />
                </button>

                <h2 className="text-2xl font-black text-[#302464] mb-1">Abrir Nova OS</h2>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-8">Iniciando atendimento</p>

                <form onSubmit={handleCreate} className="space-y-4">
                    
                    {/* CAMPO CLIENTE */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cliente</label>
                        <select 
                            className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#7C69AF]"
                            value={formData.cliente}
                            onChange={e => setFormData({...formData, cliente: e.target.value, ativo: ''})} // Limpa o ativo ao mudar cliente
                            required
                        >
                            <option value="">Selecione o Cliente...</option>
                            {clientes.map(c => (
                                <option key={c.id} value={c.id}>{c.razao_social}</option>
                            ))}
                        </select>
                    </div>

                    {/* 6. CAMPO NOVO: ATIVO / EQUIPAMENTO */}
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

                    {/* GRID: TÉCNICO E TIPO */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Técnico Resp.</label>
                            <select 
                                className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#7C69AF]"
                                value={formData.tecnico_responsavel}
                                onChange={e => setFormData({...formData, tecnico_responsavel: e.target.value})}
                            >
                                <option value="">Eu mesmo (Automático)</option>
                                {tecnicos.map(t => (
                                    <option key={t.id} value={t.id}>{t.nome}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo</label>
                            <select 
                                className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-slate-700 outline-none"
                                value={formData.tipo}
                                onChange={e => setFormData({...formData, tipo: e.target.value})}
                            >
                                <option value="LABORATORIO">Laboratório</option>
                                <option value="EXTERNO">Externo / Projeto</option>
                                <option value="REMOTO">Remoto</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Título do Serviço</label>
                        <input 
                            className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#7C69AF]"
                            placeholder="Ex: Formatação Notebook Dell"
                            value={formData.titulo}
                            onChange={e => setFormData({...formData, titulo: e.target.value})}
                            required
                        />
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

                    <button className="w-full py-4 bg-[#302464] hover:bg-[#7C69AF] text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-purple-900/20 transition-all mt-4">
                        Iniciar Ordem de Serviço
                    </button>
                </form>
             </div>
        </div>
      )}

    </div>
  );
}