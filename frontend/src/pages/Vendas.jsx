import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, Plus, Search, DollarSign, CheckCircle, Clock, Building2, 
  ChevronLeft, ChevronRight, Filter
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
  return <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${color}`}>{text}</span>;
};

const KpiCard = ({ icon: Icon, title, value, color }) => (
    <div className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4`}>
        <div className={`p-3 rounded-full ${color}`}>
            <Icon size={20} className="text-white"/>
        </div>
        <div>
            <p className="text-2xl font-black text-slate-800">{value}</p>
            <p className="text-xs font-bold text-slate-500">{title}</p>
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
          clienteService.getContatos(formData.cliente)
              .then(data => setContatos(data))
              .catch(err => console.error("Erro ao buscar contatos", err));
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
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
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
      solicitante: formData.solicitante || null, // Add solicitante here
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
    setFormData({ cliente: '', solicitante: '' }); // Reset form data
    setIsCreatingContato(false); // Hide new contact form
    setContatos([]); // Clear contacts
  };

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight">Vendas</h1>
              <div className="h-1 w-12 bg-[#7C69AF] mt-2 rounded-full"></div>

              {/* SELETOR DE EMPRESA AQUI */}
              <div className="mt-4 flex items-center gap-2 bg-white p-1 pr-4 rounded-xl border border-slate-200 w-fit shadow-sm">
                  <select
                      value={filtroEmpresa}
                      onChange={e => setFiltroEmpresa(e.target.value)}
                      className="bg-white text-xs font-bold p-1 rounded-lg"
                  >
                      {empresas.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.nome_empresa}</option>
                      ))}
                  </select>
                  <Building2 size={16} className="text-slate-400" />
              </div>
          </div>

          <button onClick={openModal} className="bg-[#302464] hover:bg-[#7C69AF] text-white px-6 py-2.5 rounded-2xl flex items-center gap-2 font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95">
              <ShoppingCart size={18} /> Nova Venda
          </button>
      </div>

      {/* KPI Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <KpiCard icon={Clock} title="Orçamentos Pendentes" value={kpis.orcamentosPendentes} color="bg-yellow-400" />
          <KpiCard icon={CheckCircle} title="Vendas Concluídas" value={kpis.vendasConcluidas} color="bg-green-500" />
          <KpiCard icon={DollarSign} title="Receita Total (Concluído)" value={`R$ ${kpis.receitaTotal.toFixed(2)}`} color="bg-blue-500" />
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm mb-8 space-y-4 md:space-y-0 md:flex md:items-center md:gap-4">
        <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Pesquisar por cliente ou produto..." value={busca} onChange={e => setBusca(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
        </div>
        <div className="flex items-center gap-4">
            <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="bg-slate-50 border-slate-200 rounded-lg text-sm p-2"><option value="">Todos Status</option><option value="ORCAMENTO">Orçamento</option><option value="CONCLUIDA">Concluída</option><option value="REVOGADA">Revogada</option></select>
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="bg-slate-50 border-slate-200 rounded-lg text-sm p-2"/>
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="bg-slate-50 border-slate-200 rounded-lg text-sm p-2"/>
        </div>
      </div>

      {/* Table */}
      {loading ? <div className="py-20 text-center">...</div> : (
        <>
          <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 font-black text-slate-400 uppercase tracking-widest">
                <tr><th className="p-4">Cliente</th><th className="p-4">Itens</th><th className="p-4 text-center">Status</th><th className="p-4 text-right">Valor Total</th><th className="p-4 text-center">Data</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedData.map(venda => (
                  <tr key={venda.id} onClick={() => navigate(`/vendas/${venda.id}`)} className="hover:bg-slate-50/50 transition-colors cursor-pointer">
                    <td className="p-4 font-bold text-slate-700">{venda.cliente_nome}</td>
                    <td className="p-4 text-slate-600">{venda.produtos_resumo}</td>
                    <td className="p-4 text-center"><StatusBadge status={venda.status} /></td>
                    <td className="p-4 text-right font-black text-emerald-600">R$ {parseFloat(venda.valor_total).toFixed(2)}</td>
                    <td className="p-4 text-center text-slate-400 font-mono">{new Date(venda.data_venda).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex justify-between items-center mt-6 text-xs font-bold text-slate-500">
            <button onClick={handlePrevPage} disabled={currentPage === 1} className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-slate-200 disabled:opacity-50"><ChevronLeft size={14}/> Anterior</button>
            <span>Página {currentPage} de {totalPages}</span>
            <button onClick={handleNextPage} disabled={currentPage === totalPages} className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-slate-200 disabled:opacity-50">Próxima <ChevronRight size={14}/></button>
          </div>
        </>
      )}

      {/* Modal - Simplified */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                <h3 className="text-lg font-black text-slate-800 mb-4">Novo Orçamento</h3>
                <form onSubmit={handleCriarOrcamento}>
                  {/* Cliente Selection */}
                  <select required value={formData.cliente} onChange={e => setFormData({...formData, cliente: e.target.value, solicitante: ''})} className="w-full bg-slate-50 p-4 rounded-2xl border-none font-bold text-slate-700 outline-none focus:ring-4 focus:ring-purple-500/5 mb-4">
                    <option value="">Selecione o cliente...</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.razao_social}</option>)}
                  </select>

                  {formData.cliente && (
                      <div className="mt-4 border-t border-slate-100 pt-4 animate-in fade-in">
                          <div className="flex justify-between items-center mb-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">A/C (Solicitante)</label>
                              {!isCreatingContato && (
                                  <button type="button" onClick={() => setIsCreatingContato(true)} className="text-[10px] font-bold text-[#7C69AF] hover:text-[#302464]">
                                      + Novo Contato
                                  </button>
                              )}
                          </div>

                          {!isCreatingContato ? (
                              <select className="w-full bg-slate-50 p-4 rounded-2xl border-none font-bold text-slate-700 outline-none focus:ring-4 focus:ring-purple-500/5"
                                  value={formData.solicitante || ''} onChange={e => setFormData({...formData, solicitante: e.target.value})}>
                                  <option value="">Nenhum específico...</option>
                                  {contatos.map(c => <option key={c.id} value={c.id}>{c.nome} {c.telefone ? `- ${c.telefone}` : ''}</option>)}
                              </select>
                          ) : (
                              <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 space-y-3">
                                  <input type="text" placeholder="Nome do Contato" required value={novoContato.nome} onChange={e => setNovoContato({...novoContato, nome: e.target.value})} className="w-full bg-white p-3 rounded-xl border-none font-bold text-sm outline-none" />
                                  <input type="text" placeholder="Telefone (Opcional)" value={novoContato.telefone} onChange={e => setNovoContato({...novoContato, telefone: e.target.value})} className="w-full bg-white p-3 rounded-xl border-none font-bold text-sm outline-none" />
                                  <div className="flex gap-2">
                                      <button type="button" onClick={handleCriarContato} className="flex-1 bg-[#302464] text-white py-2 rounded-xl text-xs font-bold">Salvar Contato</button>
                                      <button type="button" onClick={() => setIsCreatingContato(false)} className="flex-1 bg-white text-slate-500 py-2 rounded-xl text-xs font-bold border border-slate-200">Cancelar</button>
                                  </div>
                              </div>
                          )}
                      </div>
                  )}

                  <div className="flex gap-2 mt-4">
                    <button type="button" onClick={() => setModalOpen(false)} className="flex-1 bg-slate-200 text-slate-800 py-3 rounded-lg font-bold">Cancelar</button>
                    <button type="submit" className="flex-1 bg-[#302464] text-white py-3 rounded-lg font-bold">Criar e Abrir</button>
                  </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}