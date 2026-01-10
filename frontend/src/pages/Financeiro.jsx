import { useState, useEffect } from 'react';
import { 
  Plus, ArrowUpCircle, ArrowDownCircle, DollarSign, 
  AlertTriangle, Building2, TrendingUp, RefreshCw, Filter, 
  Calendar, CheckCircle, Package
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';

// SERVIÇOS
import financeiroService from '../services/financeiroService';
import clienteService from '../services/clienteService';

export default function Financeiro() {
  const [activeTab, setActiveTab] = useState('DASHBOARD'); // DASHBOARD ou LISTA
  const [lancamentos, setLancamentos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gerandoFaturas, setGerandoFaturas] = useState(false);

  // Métricas do Dashboard
  const [kpis, setKpis] = useState({
    receitaTotal: 0,
    despesaTotal: 0,
    saldo: 0,
    inadimplencia: 0,
    vendasHardware: 0,
    contratosAtivos: 0
  });

  // Modal Novo Lançamento
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    descricao: '', valor: '', tipo_lancamento: 'ENTRADA', 
    categoria: 'DESPESA', data_vencimento: '', cliente: ''
  });

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [dadosFin, dadosCli] = await Promise.all([
        financeiroService.listar(),
        clienteService.listar()
      ]);
      setLancamentos(dadosFin);
      setClientes(dadosCli);
      calcularKPIs(dadosFin);
    } catch (error) {
      console.error("Erro ao carregar:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- LÓGICA DE NEGÓCIO (CÁLCULOS NO FRONT PARA VISUALIZAÇÃO) ---
  const calcularKPIs = (dados) => {
    const hoje = new Date();
    let rec = 0, desp = 0, inad = 0, hard = 0, contratos = 0;

    dados.forEach(l => {
      const valor = parseFloat(l.valor);
      
      // 1. Receitas e Despesas
      if (l.tipo_lancamento === 'ENTRADA') rec += valor;
      else desp += valor;

      // 2. Inadimplência (Pendente e Vencido)
      const vencimento = new Date(l.data_vencimento);
      if (l.status === 'PENDENTE' && vencimento < hoje) {
        inad += valor;
      }

      // 3. Vendas de Hardware
      if (l.categoria === 'VENDA') {
        hard += valor;
      }
      
      // 4. Receita de Contratos
      if (l.categoria === 'CONTRATO') {
          contratos += valor;
      }
    });

    setKpis({
      receitaTotal: rec,
      despesaTotal: desp,
      saldo: rec - desp,
      inadimplencia: inad,
      vendasHardware: hard,
      contratosAtivos: contratos
    });
  };

  // --- AÇÃO: GERAR FATURAS AUTOMÁTICAS ---
  const handleGerarFaturas = async () => {
    if (!window.confirm("Isso irá gerar lançamentos pendentes para todos os contratos ativos do mês atual. Continuar?")) return;
    
    setGerandoFaturas(true);
    try {
      const res = await financeiroService.gerarFaturasMensais();
      alert(`Processo concluído!\nFaturas Geradas: ${res.faturas_geradas}\n${res.erros.length > 0 ? 'Erros: ' + res.erros.join(', ') : ''}`);
      carregarDados();
    } catch (error) {
      alert("Erro ao processar faturas.");
    } finally {
      setGerandoFaturas(false);
    }
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    try {
      await financeiroService.criar(form);
      setIsModalOpen(false);
      setForm({ descricao: '', valor: '', tipo_lancamento: 'ENTRADA', categoria: 'DESPESA', data_vencimento: '', cliente: '' });
      carregarDados();
    } catch (error) {
      alert("Erro ao salvar.");
    }
  };

  // Prepara dados para o Gráfico (Resumo por Categoria)
  const dadosGrafico = [
    { name: 'Contratos', valor: kpis.contratosAtivos, color: '#3B82F6' }, // Azul
    { name: 'Hardware', valor: kpis.vendasHardware, color: '#10B981' },   // Verde
    { name: 'Despesas', valor: kpis.despesaTotal, color: '#EF4444' },     // Vermelho
  ];

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando inteligência financeira...</div>;

  return (
    <div className="max-w-7xl mx-auto pb-10">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestão Financeira</h1>
          <p className="text-gray-500 text-sm">Controle de caixa, contratos e inadimplência.</p>
        </div>
        <div className="flex gap-2">
           <button 
            onClick={handleGerarFaturas}
            disabled={gerandoFaturas}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow transition-all disabled:opacity-50 text-sm"
          >
            {gerandoFaturas ? <RefreshCw className="animate-spin" size={16}/> : <RefreshCw size={16}/>}
            Gerar Mensalidades
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow transition-all text-sm"
          >
            <Plus size={16} /> Novo Lançamento
          </button>
        </div>
      </div>

      {/* TABS DE NAVEGAÇÃO */}
      <div className="flex gap-4 border-b border-gray-200 mb-6">
          <button onClick={() => setActiveTab('DASHBOARD')} className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${activeTab === 'DASHBOARD' ? 'border-primary-dark text-primary-dark' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              Dashboard Gerencial
          </button>
          <button onClick={() => setActiveTab('LISTA')} className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${activeTab === 'LISTA' ? 'border-primary-dark text-primary-dark' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              Lançamentos & Extrato
          </button>
      </div>

      {activeTab === 'DASHBOARD' && (
        <div className="space-y-6">
            {/* LINHA 1: BIG NUMBERS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs text-gray-500 font-bold uppercase">Saldo em Caixa</p>
                            <h3 className={`text-2xl font-bold mt-1 ${kpis.saldo >= 0 ? 'text-gray-800' : 'text-red-600'}`}>
                                R$ {kpis.saldo.toFixed(2)}
                            </h3>
                        </div>
                        <div className={`p-2 rounded-lg ${kpis.saldo >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                            <DollarSign size={20}/>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs text-gray-500 font-bold uppercase">Vendas Hardware (Mês)</p>
                            <h3 className="text-2xl font-bold mt-1 text-blue-600">
                                R$ {kpis.vendasHardware.toFixed(2)}
                            </h3>
                        </div>
                        <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                            <Package size={20}/>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-red-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs text-gray-500 font-bold uppercase">Inadimplência</p>
                            <h3 className="text-2xl font-bold mt-1 text-red-600">
                                R$ {kpis.inadimplencia.toFixed(2)}
                            </h3>
                            <p className="text-[10px] text-red-400 mt-1">Vencido e não pago</p>
                        </div>
                        <div className="p-2 rounded-lg bg-red-50 text-red-600">
                            <AlertTriangle size={20}/>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs text-gray-500 font-bold uppercase">Contratos Ativos</p>
                            <h3 className="text-2xl font-bold mt-1 text-indigo-600">
                                R$ {kpis.contratosAtivos.toFixed(2)}
                            </h3>
                            <p className="text-[10px] text-gray-400 mt-1">Receita Recorrente</p>
                        </div>
                        <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                            <Building2 size={20}/>
                        </div>
                    </div>
                </div>
            </div>

            {/* LINHA 2: GRÁFICO E TABELA DE DEVEDORES */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* GRÁFICO */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-6">Comparativo Financeiro</h3>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dadosGrafico} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                                <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
                                <Bar dataKey="valor" radius={[0, 4, 4, 0]} barSize={30}>
                                    {dadosGrafico.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* LISTA DE INADIMPLENTES */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <AlertTriangle size={18} className="text-red-500"/> Pendências Urgentes
                    </h3>
                    <div className="overflow-y-auto max-h-72 space-y-3">
                        {lancamentos
                            .filter(l => l.status === 'PENDENTE' && new Date(l.data_vencimento) < new Date())
                            .map(l => (
                                <div key={l.id} className="p-3 bg-red-50 rounded-lg border border-red-100">
                                    <div className="flex justify-between">
                                        <span className="font-bold text-gray-800 text-sm">{l.descricao}</span>
                                        <span className="font-bold text-red-600 text-sm">R$ {parseFloat(l.valor).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between mt-1 text-xs text-red-400">
                                        <span>Venceu: {new Date(l.data_vencimento).toLocaleDateString()}</span>
                                        <span className="font-bold uppercase">Atrasado</span>
                                    </div>
                                </div>
                            ))
                        }
                        {lancamentos.filter(l => l.status === 'PENDENTE' && new Date(l.data_vencimento) < new Date()).length === 0 && (
                            <p className="text-center text-gray-400 text-sm py-8">Nenhuma pendência encontrada. 🎉</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}

      {activeTab === 'LISTA' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
             <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold border-b">
                    <tr>
                        <th className="p-4">Descrição</th>
                        <th className="p-4">Categoria</th>
                        <th className="p-4">Vencimento</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Valor</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {lancamentos.map(lanc => (
                        <tr key={lanc.id} className="hover:bg-gray-50">
                            <td className="p-4 font-medium text-gray-800">
                                {lanc.descricao}
                                {lanc.cliente && <div className="text-xs text-gray-400 mt-0.5">{lanc.cliente.razao_social}</div>}
                            </td>
                            <td className="p-4">
                                <span className="text-[10px] font-bold bg-gray-100 px-2 py-1 rounded text-gray-500 uppercase">
                                    {lanc.categoria}
                                </span>
                            </td>
                            <td className="p-4 text-gray-500">{new Date(lanc.data_vencimento).toLocaleDateString()}</td>
                            <td className="p-4">
                                <span className={`text-xs font-bold px-2 py-1 rounded-full 
                                    ${lanc.status === 'PAGO' ? 'bg-green-100 text-green-700' : 
                                      lanc.status === 'PENDENTE' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                    {lanc.status}
                                </span>
                            </td>
                            <td className={`p-4 text-right font-bold ${lanc.tipo_lancamento === 'ENTRADA' ? 'text-green-600' : 'text-red-600'}`}>
                                {lanc.tipo_lancamento === 'SAIDA' && '- '}
                                R$ {parseFloat(lanc.valor).toFixed(2)}
                            </td>
                        </tr>
                    ))}
                </tbody>
             </table>
        </div>
      )}

      {/* MODAL SIMPLIFICADO PARA INSERÇÃO MANUAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                <h3 className="font-bold text-lg mb-4">Novo Lançamento Manual</h3>
                <form onSubmit={handleSalvar} className="space-y-4">
                    <input required placeholder="Descrição" className="w-full p-2 border rounded" value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} />
                    <div className="grid grid-cols-2 gap-4">
                        <input required type="number" step="0.01" placeholder="Valor" className="w-full p-2 border rounded" value={form.valor} onChange={e => setForm({...form, valor: e.target.value})} />
                        <select className="w-full p-2 border rounded bg-white" value={form.tipo_lancamento} onChange={e => setForm({...form, tipo_lancamento: e.target.value})}>
                            <option value="ENTRADA">Entrada (+)</option>
                            <option value="SAIDA">Saída (-)</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <select className="w-full p-2 border rounded bg-white" value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})}>
                            <option value="DESPESA">Despesa Adm</option>
                            <option value="SERVICO">Serviço Avulso</option>
                            <option value="COMPRA">Compra Peça</option>
                        </select>
                        <input required type="date" className="w-full p-2 border rounded" value={form.data_vencimento} onChange={e => setForm({...form, data_vencimento: e.target.value})} />
                    </div>
                    <select className="w-full p-2 border rounded bg-white" value={form.cliente} onChange={e => setForm({...form, cliente: e.target.value})}>
                        <option value="">Cliente (Opcional)</option>
                        {clientes.map(c => <option key={c.id} value={c.id}>{c.razao_social}</option>)}
                    </select>
                    <div className="flex gap-2 justify-end mt-4">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:bg-gray-100 px-4 py-2 rounded">Cancelar</button>
                        <button type="submit" className="bg-primary-dark text-white px-4 py-2 rounded font-bold">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}