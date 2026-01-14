import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Clock, Briefcase, Building2, Calendar, MapPin, Truck, X, AlertTriangle, ChevronRight, Search, Info, Monitor 
} from 'lucide-react';

import chamadoService from '../services/chamadoService';
import equipeService from '../services/equipeService';
import clienteService from '../services/clienteService';
import ativoService from '../services/ativoService'; // <--- IMPORT NOVO

// MAPAS VISUAIS
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
  const [loading, setLoading] = useState(true);
  
  // Dados
  const [chamados, setChamados] = useState([]);
  const [equipe, setEquipe] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [ativos, setAtivos] = useState([]); // <--- ESTADO NOVO
  
  // UI
  const [busca, setBusca] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('REMOTO'); 
  
  // Formulário
  const [formData, setFormData] = useState({
    cliente: '',
    ativo: '', // <--- CAMPO NOVO
    titulo: '',
    descricao_detalhada: '',
    prioridade: 'MEDIA',
    origem: 'TELEFONE',
    data_agendamento: '',
    custo_ida: '',   
    custo_volta: '', 
    tecnicos: []
  });

  // Cálculo visual em tempo real
  const custoEstimado = useMemo(() => {
    return (parseFloat(formData.custo_ida || 0) + parseFloat(formData.custo_volta || 0));
  }, [formData.custo_ida, formData.custo_volta]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      // Carregamos também os ativos agora
      const [c, e, cli, atv] = await Promise.all([
        chamadoService.listar(),
        equipeService.listar(),
        clienteService.listar(),
        ativoService.listar() // <--- CARREGA ATIVOS
      ]);
      setChamados(c);
      setEquipe(e);
      setClientes(cli);
      setAtivos(atv);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarDados(); }, []);

  // Filtra ativos baseado no cliente selecionado no formulário
  const ativosDoCliente = useMemo(() => {
    if (!formData.cliente) return [];
    // Filtra onde o ID do cliente bate com o selecionado
    return ativos.filter(a => a.cliente === parseInt(formData.cliente) || a.cliente?.id === parseInt(formData.cliente));
  }, [formData.cliente, ativos]);

  const chamadosFiltrados = useMemo(() => {
    return chamados.filter(c => 
      c.titulo.toLowerCase().includes(busca.toLowerCase()) || 
      c.protocolo?.includes(busca) ||
      (c.nome_cliente && c.nome_cliente.toLowerCase().includes(busca.toLowerCase())) ||
      (c.nome_ativo && c.nome_ativo.toLowerCase().includes(busca.toLowerCase())) // Busca também pelo nome do ativo
    );
  }, [busca, chamados]);

  const handleOpenModal = (mode) => {
    setModalMode(mode);
    setFormData({
      cliente: '', ativo: '', titulo: '', descricao_detalhada: '',
      prioridade: 'MEDIA', origem: 'TELEFONE', data_agendamento: '', 
      custo_ida: '', custo_volta: '', tecnicos: []
    });
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Se mudou o cliente, limpamos o ativo selecionado anteriormente
    if (name === 'cliente') {
        setFormData(prev => ({ ...prev, [name]: value, ativo: '' }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const toggleTecnico = (id) => {
    setFormData(prev => ({
      ...prev,
      tecnicos: prev.tecnicos.includes(id) 
        ? prev.tecnicos.filter(t => t !== id) 
        : [...prev.tecnicos, id]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validação Básica
    if (!formData.cliente) return alert("Selecione um cliente.");
    if (modalMode === 'VISITA' && !formData.data_agendamento) return alert("Defina data/hora da visita.");

    try {
      // SANITIZAÇÃO DOS DADOS
      const payload = {
        cliente: formData.cliente,
        ativo: formData.ativo || null, // <--- ENVIA O ATIVO (ou null)
        titulo: formData.titulo,
        descricao_detalhada: formData.descricao_detalhada,
        prioridade: formData.prioridade,
        origem: formData.origem,
        tecnicos: formData.tecnicos,
        
        status: modalMode === 'VISITA' ? 'AGENDADO' : 'ABERTO',
        tipo_atendimento: modalMode,
        
        data_agendamento: formData.data_agendamento ? new Date(formData.data_agendamento).toISOString() : null,
        custo_ida: formData.custo_ida ? parseFloat(formData.custo_ida) : 0,
        custo_volta: formData.custo_volta ? parseFloat(formData.custo_volta) : 0
      };

      await chamadoService.criar(payload);
      
      setIsModalOpen(false);
      carregarDados();
      alert("Chamado criado com sucesso!");
    } catch (err) {
      console.error("Erro no envio:", err.response?.data);
      alert("Erro ao salvar. Verifique se todos os campos obrigatórios estão preenchidos.");
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Atendimentos</h1>
          <div className="h-1 w-12 bg-[#7C69AF] mt-2 rounded-full"></div>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#7C69AF] transition-colors" size={18} />
            <input 
              type="text" placeholder="Buscar..." 
              value={busca} onChange={e => setBusca(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-purple-500/5 text-sm w-64 transition-all"
            />
          </div>
          <button onClick={() => handleOpenModal('VISITA')} className="bg-white border-2 border-[#302464] text-[#302464] hover:bg-slate-50 px-6 py-2.5 rounded-2xl flex items-center gap-2 text-sm font-black transition-all active:scale-95">
            <Calendar size={18} /> Agendar Visita
          </button>
          <button onClick={() => handleOpenModal('REMOTO')} className="bg-[#302464] hover:bg-[#7C69AF] text-white px-6 py-2.5 rounded-2xl flex items-center gap-2 text-sm font-black shadow-xl shadow-purple-900/20 transition-all active:scale-95">
            <Plus size={18} /> Novo Chamado
          </button>
        </div>
      </div>

      {/* LISTA */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-20 text-center text-[#7C69AF] animate-pulse font-black uppercase tracking-widest text-[10px]">Sincronizando Cyrius...</div>
        ) : chamadosFiltrados.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200">
             <Info size={40} className="mx-auto text-slate-200 mb-4" />
             <p className="text-slate-400 font-bold">Nenhum atendimento ativo no momento.</p>
          </div>
        ) : (
          chamadosFiltrados.map((item) => (
            <div 
              key={item.id} 
              onClick={() => navigate(`/chamados/${item.id}`)}
              className="group bg-white p-6 rounded-[2.2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col md:flex-row items-center justify-between gap-6"
            >
              <div className="flex items-center gap-6 flex-1">
                <div className={`p-4 rounded-2xl shadow-inner ${item.tipo_atendimento === 'VISITA' ? 'bg-purple-50 text-[#7C69AF]' : 'bg-slate-50 text-[#302464]'}`}>
                  {item.tipo_atendimento === 'VISITA' ? <Truck size={28} /> : <Briefcase size={28} />}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[10px] font-black text-slate-300 tracking-tighter">#{item.protocolo}</span>
                    <span className={`text-[9px] font-black px-3 py-1 rounded-lg border uppercase tracking-widest ${PRIORIDADE_MAP[item.prioridade]}`}>
                      {item.prioridade}
                    </span>
                    <span className={`text-[9px] font-black px-3 py-1 rounded-lg uppercase tracking-widest ${STATUS_MAP[item.status]}`}>
                      {item.status.replace('_', ' ')}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-800 group-hover:text-[#7C69AF] transition-colors">{item.titulo}</h3>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-[11px] text-slate-500 flex items-center gap-1.5 font-bold uppercase tracking-wide">
                        <Building2 size={13} className="text-slate-300" /> {item.nome_cliente}
                    </span>
                    {/* Exibe o Ativo se existir */}
                    {item.nome_ativo && (
                        <span className="text-[11px] text-slate-500 flex items-center gap-1.5 font-bold uppercase tracking-wide">
                            <Monitor size={13} className="text-slate-300" /> {item.nome_ativo}
                        </span>
                    )}
                    <span className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
                      {item.tipo_atendimento === 'VISITA' ? (
                         <><Calendar size={13} className="text-[#A696D1]" /> {item.data_agendamento ? new Date(item.data_agendamento).toLocaleString('pt-BR') : 'Data Pendente'}</>
                      ) : (
                         <><Clock size={13} className="text-[#A696D1]" /> {new Date(item.created_at).toLocaleDateString('pt-BR')}</>
                      )}
                    </span>
                  </div>
                </div>
              </div>
              <ChevronRight className="text-slate-200 group-hover:text-[#7C69AF] group-hover:translate-x-1 transition-all" />
            </div>
          ))
        )}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#302464]/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto relative border border-white/20">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 text-slate-400 hover:text-[#302464] transition-colors">
              <X size={24} />
            </button>

            <h2 className="text-2xl font-black text-[#302464] mb-8 flex items-center gap-3">
              {modalMode === 'VISITA' ? <Truck className="text-[#7C69AF]" /> : <Plus className="text-[#7C69AF]" />}
              {modalMode === 'VISITA' ? 'Agendar Visita Técnica' : 'Novo Chamado Remoto'}
            </h2>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {modalMode === 'VISITA' && (
                <div className="md:col-span-2 bg-purple-50 p-6 rounded-3xl border border-purple-100 animate-in slide-in-from-top-2">
                  <div className="flex gap-4 items-center mb-6">
                     <AlertTriangle className="text-[#A696D1]" size={24} />
                     <h3 className="font-black text-[#302464] text-sm uppercase tracking-widest">Dados do Deslocamento</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                     <div className="sm:col-span-3">
                        <label className="text-[9px] font-black text-[#302464] uppercase tracking-widest block mb-2">Data da Visita</label>
                        <input 
                          type="datetime-local" name="data_agendamento" required
                          value={formData.data_agendamento} onChange={handleInputChange}
                          className="w-full bg-white px-4 py-3 rounded-2xl border-none outline-none focus:ring-4 focus:ring-purple-200 font-bold text-[#302464]"
                        />
                     </div>
                     <div>
                        <label className="text-[9px] font-black text-[#302464] uppercase tracking-widest block mb-2">Uber/Táxi Ida (R$)</label>
                        <input 
                          type="number" name="custo_ida" step="0.01" placeholder="0.00"
                          value={formData.custo_ida} onChange={handleInputChange}
                          className="w-full bg-white px-4 py-3 rounded-2xl border-none outline-none font-bold text-center text-slate-700"
                        />
                     </div>
                     <div>
                        <label className="text-[9px] font-black text-[#302464] uppercase tracking-widest block mb-2">Uber/Táxi Volta (R$)</label>
                        <input 
                          type="number" name="custo_volta" step="0.01" placeholder="0.00"
                          value={formData.custo_volta} onChange={handleInputChange}
                          className="w-full bg-white px-4 py-3 rounded-2xl border-none outline-none font-bold text-center text-slate-700"
                        />
                     </div>
                     <div className="bg-[#302464] rounded-2xl flex flex-col items-center justify-center text-white">
                        <p className="text-[8px] font-black uppercase tracking-widest opacity-50">Total R$</p>
                        <p className="text-lg font-black">{custoEstimado.toFixed(2)}</p>
                     </div>
                  </div>
                </div>
              )}

              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cliente Solicitante</label>
                    <select 
                    name="cliente" required value={formData.cliente} onChange={handleInputChange}
                    className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl outline-none focus:ring-4 focus:ring-purple-500/5 font-bold text-slate-700"
                    >
                    <option value="">Selecione...</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.razao_social}</option>)}
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                        <Monitor size={10} /> Equipamento / Ativo (Opcional)
                    </label>
                    <select 
                    name="ativo" value={formData.ativo} onChange={handleInputChange}
                    disabled={!formData.cliente}
                    className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl outline-none focus:ring-4 focus:ring-purple-500/5 font-bold text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                    <option value="">{formData.cliente ? 'Selecione ou deixe vazio...' : 'Selecione um cliente antes...'}</option>
                    {ativosDoCliente.map(a => <option key={a.id} value={a.id}>{a.nome} ({a.tipo})</option>)}
                    </select>
                </div>
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assunto do Chamado</label>
                <input 
                  name="titulo" required value={formData.titulo} onChange={handleInputChange}
                  placeholder="Resumo..."
                  className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl outline-none focus:ring-4 focus:ring-purple-500/5 font-bold"
                />
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição</label>
                <textarea 
                  name="descricao_detalhada" required rows="3" value={formData.descricao_detalhada} onChange={handleInputChange}
                  className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl outline-none focus:ring-4 focus:ring-purple-500/5 font-medium"
                  placeholder="Detalhes técnicos..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Urgência</label>
                <select name="prioridade" value={formData.prioridade} onChange={handleInputChange} className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl outline-none font-bold">
                  <option value="BAIXA">Baixa</option>
                  <option value="MEDIA">Média</option>
                  <option value="ALTA">Alta</option>
                  <option value="CRITICA">Crítica</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Canal</label>
                <select name="origem" value={formData.origem} onChange={handleInputChange} className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl outline-none font-bold">
                  <option value="TELEFONE">Telefone</option>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="EMAIL">E-mail</option>
                </select>
              </div>

              <div className="md:col-span-2 space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Técnicos Designados</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {equipe.map(tec => (
                    <button 
                      key={tec.id} type="button"
                      onClick={() => toggleTecnico(tec.id)}
                      className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all 
                        ${formData.tecnicos.includes(tec.id) ? 'bg-[#302464] border-[#302464] text-white' : 'bg-white border-slate-100 text-slate-400 hover:border-purple-200'}`}
                    >
                      {tec.nome}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" className="md:col-span-2 w-full py-5 bg-gradient-to-r from-[#302464] to-[#7C69AF] text-white rounded-3xl font-black text-lg shadow-2xl shadow-purple-900/20 active:scale-95 mt-4 transition-all">
                {modalMode === 'VISITA' ? 'Confirmar Agendamento' : 'Abrir Atendimento'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}