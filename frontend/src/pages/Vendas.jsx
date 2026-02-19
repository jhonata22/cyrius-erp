import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, Plus, Search, DollarSign, CheckCircle, Clock, Building2, 
  ChevronLeft, ChevronRight, Filter, X
} from 'lucide-react';
import clienteService from '../services/clienteService';
import vendaService from '../services/vendaService';
import equipeService from '../services/equipeService';
import { useEmpresas } from '../hooks/useEmpresas';

const StatusBadge = ({ status }) => {
  const statusMap = {
    ORCAMENTO: { text: 'Orçamento', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    CONCLUIDA: { text: 'Concluída', color: 'bg-green-100 text-green-800 border-green-200' },
    REVOGADA: { text: 'Revogada', color: 'bg-red-100 text-red-800 border-red-200' },
  };
  const { text, color } = statusMap[status] || { text: status, color: 'bg-gray-100 text-gray-800' };
  return <span className={`px-3 py-1 text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-full border ${color}`}>{text}</span>;
};

const KpiCard = ({ icon: Icon, title, value, color }) => (
    <div className={`bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4`}>
        <div className={`p-3 rounded-full ${color} shrink-0`}>
            <Icon size={20} className="text-white"/>
        </div>
        <div>
            <p className="text-xl sm:text-2xl font-black text-slate-800 truncate">{value}</p>
            <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">{title}</p>
        </div>
    </div>
);

export default function Vendas() {
  const navigate = useNavigate();
  const { empresas } = useEmpresas();

  // State
  const [historico, setHistorico] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ cliente: '', solicitante: '' });
  const [contatos, setContatos] = useState([]);
  const [isCreatingContato, setIsCreatingContato] = useState(false);
  const [novoContato, setNovoContato] = useState({ nome: '', telefone: '' });
  
  // Filters State
  const [filtroEmpresa, setFiltroEmpresa] = useState(empresas[0]?.id || '');
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Data Loading
  const carregarDados = useCallback(async () => {
    try {
      setLoading(true);
      const [cli, h, user] = await Promise.all([
        clienteService.listar(),
        vendaService.listarVendas(filtroEmpresa || null),
        equipeService.me()
      ]);
      setClientes(cli);
      setHistorico(h);
      setCurrentUser(user);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filtroEmpresa]);

  useEffect(() => {
    if (empresas.length > 0 && !filtroEmpresa) {
        setFiltroEmpresa(empresas[0].id);
    }
    carregarDados();
  }, [empresas, carregarDados]);

  // Fetch contacts when formData.cliente changes
  useEffect(() => {
    if (formData.cliente) {
      clienteService.listarContatosLista(formData.cliente) // Use the same function as the working 'Chamados' module
        .then(data => {
          const contatosData = Array.isArray(data) ? data : [];
          setContatos(contatosData);
          if (contatosData.length > 0) {
            // Auto-select the main contact, or the first one, like in 'Chamados'
            const principal = contatosData.find(c => c.is_principal);
            setFormData(prev => ({
              ...prev,
              solicitante: principal ? principal.id : contatosData[0].id,
            }));
          } else {
            setFormData(prev => ({ ...prev, solicitante: '' }));
          }
        })
        .catch(err => {
            console.error("Erro ao buscar contatos", err);
            setContatos([]);
        });
    } else {
      setContatos([]);
    }
  }, [formData.cliente]);

  // Filtering and Sorting
  const filteredData = useMemo(() => {
    const b = busca.toLowerCase();
    return [...historico]
      .filter(v => {
        const searchMatch = b === '' || v.cliente_nome.toLowerCase().includes(b) || (v.produtos_resumo && v.produtos_resumo.toLowerCase().includes(b));
        const statusMatch = filtroStatus === '' || v.status === filtroStatus;
        const startDateMatch = dataInicio === '' || new Date(v.data_venda) >= new Date(dataInicio + 'T00:00:00');
        const endDateMatch = dataFim === '' || new Date(v.data_venda) <= new Date(dataFim + 'T23:59:59');
        return searchMatch && statusMatch && startDateMatch && endDateMatch;
      })
      .sort((a, b) => new Date(b.data_venda) - new Date(a.data_venda));
  }, [busca, historico, filtroStatus, dataInicio, dataFim]);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [busca, filtroStatus, dataInicio, dataFim]);

  // Pagination Logic
  const totalPages = Math.max(1, Math.ceil(filteredData.length / ITEMS_PER_PAGE));
  const paginatedData = filteredData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const handlePrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  // KPI Calculations
  const kpis = useMemo(() => {
    const concluidas = historico.filter(v => v.status === 'CONCLUIDA');
    return {
        orcamentosPendentes: historico.filter(v => v.status === 'ORCAMENTO').length,
        vendasConcluidas: concluidas.length,
        receitaTotal: concluidas.reduce((acc, v) => acc + parseFloat(v.valor_total), 0)
    }
  }, [historico]);

  const handleCriarOrcamento = async (e) => {
    e.preventDefault();
    if (!formData.cliente) return alert("Selecione um cliente.");
    const data = { 
      cliente: formData.cliente, 
      empresa: filtroEmpresa, 
      vendedor: currentUser?.id,
      solicitante: formData.solicitante || null,
      itens: [] 
    };
    try {
      const novaVenda = await vendaService.criarVenda(data);
      setModalOpen(false);
      navigate(`/vendas/${novaVenda.id}`);
    } catch (err) { 
        console.error(err);
        alert(err.response?.data ? JSON.stringify(err.response.data) : "Erro ao criar orçamento.");
    }
  };

  const handleCriarContato = async () => {
      if (!novoContato.nome) return alert("O nome do contato é obrigatório.");
      try {
          const contatoCriado = await clienteService.criarContato(formData.cliente, novoContato);
          setContatos([...contatos, contatoCriado]);
          setFormData({ ...formData, solicitante: contatoCriado.id });
          setIsCreatingContato(false);
          setNovoContato({ nome: '', telefone: '' });
      } catch (error) {
          alert("Erro ao criar contato.");
      }
  };

  const openModal = () => {
    setModalOpen(true);
    setFormData({ cliente: '', solicitante: '' });
    setIsCreatingContato(false);
    setContatos([]);
  };

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      
      {/* Header Responsivo */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">Vendas</h1>
              <div className="h-1 w-12 bg-[#7C69AF] mt-2 rounded-full mb-4 sm:mb-0"></div>

              {/* SELETOR DE EMPRESA */}
              <div className="mt-2 sm:mt-4 flex items-center gap-2 bg-white p-1.5 pr-4 rounded-xl border border-slate-200 w-fit shadow-sm">
                  <select
                      value={filtroEmpresa}
                      onChange={e => setFiltroEmpresa(e.target.value)}
                      className="bg-white text-xs font-bold p-1 rounded-lg outline-none cursor-pointer"
                  >
                      {empresas.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.nome_fantasia || emp.nome_empresa}</option>
                      ))}
                  </select>
                  <Building2 size={16} className="text-slate-400" />
              </div>
          </div>

          <button onClick={openModal} className="w-full sm:w-auto bg-[#302464] hover:bg-[#7C69AF] text-white px-6 py-3.5 sm:py-2.5 rounded-2xl flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95">
              <ShoppingCart size={18} /> Nova Venda
          </button>
      </div>

      {/* KPI Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <KpiCard icon={Clock} title="Orçamentos Pendentes" value={kpis.orcamentosPendentes} color="bg-yellow-400" />
          <KpiCard icon={CheckCircle} title="Vendas Concluídas" value={kpis.vendasConcluidas} color="bg-emerald-500" />
          <KpiCard icon={DollarSign} title="Receita (Concluída)" value={`R$ ${kpis.receitaTotal.toFixed(2)}`} color="bg-blue-500" />
      </div>

      {/* Filters Responsivos */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm mb-6 flex flex-col md:flex-row gap-3 sm:gap-4">
        <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Pesquisar por cliente ou produto..." value={busca} onChange={e => setBusca(e.target.value)} className="w-full pl-10 pr-4 py-3 sm:py-2 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-[#7C69AF]/50" />
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="w-full sm:w-36 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-lg text-xs font-bold p-3 sm:p-2.5 outline-none">
              <option value="">Status: Todos</option>
              <option value="ORCAMENTO">Orçamento</option>
              <option value="CONCLUIDA">Concluída</option>
              <option value="REVOGADA">Revogada</option>
            </select>
            
            <div className="flex items-center gap-2">
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-1/2 sm:w-auto bg-slate-50 border border-slate-200 rounded-xl sm:rounded-lg text-xs font-bold p-3 sm:p-2.5 outline-none"/>
              <span className="text-slate-400 text-xs font-bold shrink-0">até</span>
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-1/2 sm:w-auto bg-slate-50 border border-slate-200 rounded-xl sm:rounded-lg text-xs font-bold p-3 sm:p-2.5 outline-none"/>
            </div>
        </div>
      </div>

      {/* Table & Pagination */}
      {loading ? <div className="py-20 text-center font-bold text-slate-400">Carregando histórico...</div> : (
        <>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead className="bg-slate-50 border-b border-slate-100 font-black text-slate-400 uppercase tracking-widest">
                  <tr>
                    <th className="p-4 pl-6">Cliente</th>
                    <th className="p-4">Itens</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Valor Total</th>
                    <th className="p-4 pr-6 text-center">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginatedData.map(venda => (
                    <tr key={venda.id} onClick={() => navigate(`/vendas/${venda.id}`)} className="hover:bg-slate-50/80 transition-colors cursor-pointer group">
                      <td className="p-4 pl-6 font-bold text-slate-700">{venda.cliente_nome}</td>
                      <td className="p-4 text-slate-500 font-medium">{venda.produtos_resumo}</td>
                      <td className="p-4 text-center"><StatusBadge status={venda.status} /></td>
                      <td className="p-4 text-right font-black text-emerald-600">R$ {parseFloat(venda.valor_total).toFixed(2)}</td>
                      <td className="p-4 pr-6 text-center text-slate-400 font-mono text-[10px]">{new Date(venda.data_venda).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {paginatedData.length === 0 && (
                    <tr>
                      <td colSpan="5" className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                        Nenhuma venda encontrada
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-between items-center mt-6 text-xs font-bold text-slate-500">
            <button onClick={handlePrevPage} disabled={currentPage === 1} className="flex items-center gap-2 bg-white px-4 py-2 sm:py-1.5 rounded-lg border border-slate-200 disabled:opacity-50 hover:bg-slate-50 transition-colors">
              <ChevronLeft size={16}/> <span className="hidden sm:inline">Anterior</span>
            </button>
            <span>Página {currentPage} de {totalPages}</span>
            <button onClick={handleNextPage} disabled={currentPage === totalPages} className="flex items-center gap-2 bg-white px-4 py-2 sm:py-1.5 rounded-lg border border-slate-200 disabled:opacity-50 hover:bg-slate-50 transition-colors">
              <span className="hidden sm:inline">Próxima</span> <ChevronRight size={16}/>
            </button>
          </div>
        </>
      )}

      {/* Modal - Novo Orçamento Responsivo */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:w-[95%] max-w-md p-6 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black text-[#302464]">Novo Orçamento</h3>
                  <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 sm:hidden"><X size={24}/></button>
                </div>
                
                <form onSubmit={handleCriarOrcamento} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Selecione o Cliente</label>
                    <select required value={formData.cliente} onChange={e => setFormData({...formData, cliente: e.target.value, solicitante: ''})} className="w-full bg-slate-50 p-4 rounded-xl sm:rounded-2xl border border-slate-200 sm:border-none font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#7C69AF]/50">
                      <option value="">Pesquisar cliente...</option>
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.razao_social}</option>)}
                    </select>
                  </div>

                  {formData.cliente && (
                      <div className="pt-2 animate-in fade-in slide-in-from-top-2">
                          <div className="flex justify-between items-center mb-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">A/C (Solicitante)</label>
                              {!isCreatingContato && (
                                  <button type="button" onClick={() => setIsCreatingContato(true)} className="text-[10px] font-bold text-[#7C69AF] hover:text-[#302464]">
                                      + Novo Contato
                                  </button>
                              )}
                          </div>

                          {!isCreatingContato ? (
                              <select className="w-full bg-slate-50 p-4 rounded-xl sm:rounded-2xl border border-slate-200 sm:border-none font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#7C69AF]/50"
                                  value={formData.solicitante || ''} onChange={e => setFormData({...formData, solicitante: e.target.value})}>
                                  <option value="">Nenhum contato específico</option>
                                  {contatos.map(c => <option key={c.id} value={c.id}>{c.nome} {c.telefone ? `- ${c.telefone}` : ''}</option>)}
                              </select>
                          ) : (
                              <div className="bg-[#7C69AF]/5 p-4 rounded-2xl border border-[#7C69AF]/20 space-y-3">
                                  <input type="text" placeholder="Nome do Contato" required value={novoContato.nome} onChange={e => setNovoContato({...novoContato, nome: e.target.value})} className="w-full bg-white p-3 rounded-xl border border-slate-200 font-bold text-sm outline-none focus:border-[#7C69AF]" />
                                  <input type="text" placeholder="Telefone (Opcional)" value={novoContato.telefone} onChange={e => setNovoContato({...novoContato, telefone: e.target.value})} className="w-full bg-white p-3 rounded-xl border border-slate-200 font-bold text-sm outline-none focus:border-[#7C69AF]" />
                                  <div className="flex gap-2 pt-1">
                                      <button type="button" onClick={() => setIsCreatingContato(false)} className="flex-1 bg-white text-slate-500 py-3 sm:py-2.5 rounded-xl text-xs font-bold border border-slate-200 shadow-sm">Cancelar</button>
                                      <button type="button" onClick={handleCriarContato} className="flex-1 bg-[#7C69AF] text-white py-3 sm:py-2.5 rounded-xl text-xs font-bold shadow-sm">Salvar</button>
                                  </div>
                              </div>
                          )}
                      </div>
                  )}

                  <div className="flex gap-3 pt-6 sm:pt-4 border-t border-slate-100 mt-6 sm:mt-4">
                    <button type="button" onClick={() => setModalOpen(false)} className="hidden sm:block flex-1 bg-slate-100 text-slate-600 py-3 sm:py-3.5 rounded-xl font-bold hover:bg-slate-200 transition-colors">Cancelar</button>
                    <button type="submit" className="flex-1 bg-gradient-to-r from-[#302464] to-[#7C69AF] text-white py-4 sm:py-3.5 rounded-xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-purple-500/20 active:scale-95 transition-all">
                      Iniciar Orçamento
                    </button>
                  </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}