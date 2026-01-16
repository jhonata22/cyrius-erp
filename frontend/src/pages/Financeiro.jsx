import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, DollarSign, AlertTriangle, Building2, TrendingUp, RefreshCw, 
  Truck, PieChart as PieIcon, Check, X, Wallet, ArrowUpRight, Search, Calendar
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend 
} from 'recharts';

import financeiroService from '../services/financeiroService';
import clienteService from '../services/clienteService';

export default function Financeiro() {
  const [activeTab, setActiveTab] = useState('DASHBOARD');
  
  // Dados
  const [todosLancamentos, setTodosLancamentos] = useState([]); // Todos (para inadimplencia)
  const [lancamentosMes, setLancamentosMes] = useState([]); // Filtrados do mês (para extrato)
  const [clientes, setClientes] = useState([]);
  
  // Estados de Interface
  const [loading, setLoading] = useState(true);
  const [gerandoFaturas, setGerandoFaturas] = useState(false);
  const [buscaExtrato, setBuscaExtrato] = useState(''); // Campo de busca

  const [filtroData, setFiltroData] = useState({
    mes: new Date().getMonth() + 1,
    ano: new Date().getFullYear()
  });

  const [dadosDashboard, setDadosDashboard] = useState({
    kpis: { 
        saldoAcumulado: 0, resultadoPeriodo: 0, 
        receitaPeriodo: 0, despesaPeriodo: 0,
        inadimplencia: 0, contratosAtivos: 0, custoTransporte: 0 
    },
    graficoReceita: [],
    rankingVisitas: []
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    descricao: '', valor: '', tipo_lancamento: 'ENTRADA', 
    categoria: 'DESPESA', data_vencimento: '', cliente: ''
  });

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [dadosFin, dadosCli, stats] = await Promise.all([
        financeiroService.listar(),
        clienteService.listar(),
        financeiroService.estatisticasGerais(filtroData.mes, filtroData.ano)
      ]);
      
      setTodosLancamentos(dadosFin); // Guarda tudo para calcular inadimplentes globais

      // Filtra apenas o mês selecionado
      const listaFiltrada = dadosFin.filter(l => {
         // Ajuste simples de data string YYYY-MM-DD
         const [ano, mes] = l.data_vencimento.split('-');
         return parseInt(mes) === parseInt(filtroData.mes) && 
                parseInt(ano) === parseInt(filtroData.ano);
      });

      // ORDENAÇÃO: Do último para o primeiro (Mais recente no topo)
      listaFiltrada.sort((a, b) => new Date(b.data_vencimento) - new Date(a.data_vencimento));

      setLancamentosMes(listaFiltrada);
      setClientes(dadosCli);
      
      if (stats) setDadosDashboard(stats);

    } catch (error) {
      console.error("Erro ao carregar:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarDados(); }, [filtroData]);

  // --- LÓGICA DE DADOS COMPUTADOS (MEMO) ---
  
  // 1. Inadimplentes (Olha TODO o histórico, não só o mês atual)
  const inadimplentes = useMemo(() => {
      const hoje = new Date();
      hoje.setHours(0,0,0,0);
      
      return todosLancamentos.filter(l => {
          const vencimento = new Date(l.data_vencimento + 'T12:00:00'); // Compensar fuso
          return (l.status === 'PENDENTE' || l.status === 'ATRASADO') && 
                 l.tipo_lancamento === 'ENTRADA' && 
                 vencimento < hoje;
      }).sort((a,b) => new Date(a.data_vencimento) - new Date(b.data_vencimento)); // Mais antigos primeiro (urgência)
  }, [todosLancamentos]);

  // 2. Serviços do Mês (Apenas mês atual)
  const servicosMes = useMemo(() => {
      return lancamentosMes.filter(l => l.tipo_lancamento === 'ENTRADA' && l.categoria === 'SERVICO');
  }, [lancamentosMes]);

  // 3. Extrato Filtrado pela Busca
  const extratoExibicao = useMemo(() => {
      if (!buscaExtrato) return lancamentosMes;
      const termo = buscaExtrato.toLowerCase();
      return lancamentosMes.filter(l => 
          l.descricao.toLowerCase().includes(termo) || 
          (l.nome_cliente && l.nome_cliente.toLowerCase().includes(termo))
      );
  }, [lancamentosMes, buscaExtrato]);


  const handleConfirmarPagamento = async (lancamento) => {
    if (!window.confirm(`Confirmar recebimento de R$ ${parseFloat(lancamento.valor).toFixed(2)}?`)) return;
    try {
      await financeiroService.atualizar(lancamento.id, {
        status: 'PAGO',
        data_pagamento: new Date().toISOString().split('T')[0],
        cliente: lancamento.cliente
      });
      carregarDados();
    } catch { alert("Erro ao confirmar."); }
  };

  const handleGerarFaturas = async () => {
    if (!window.confirm("Gerar mensalidades para todos os contratos ativos?")) return;
    setGerandoFaturas(true);
    try {
      const res = await financeiroService.gerarFaturasMensais();
      alert(`Sucesso! ${res.faturas_geradas} faturas geradas.`);
      carregarDados();
    } catch { alert("Erro no processamento."); } finally { setGerandoFaturas(false); }
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    try {
      await financeiroService.criar(form);
      setIsModalOpen(false);
      setForm({ descricao: '', valor: '', tipo_lancamento: 'ENTRADA', categoria: 'DESPESA', data_vencimento: '', cliente: '' });
      carregarDados();
    } catch { alert("Erro ao salvar."); }
  };

  const COLORS = ['#7C69AF', '#A696D1', '#302464'];
  const { kpis, graficoReceita, rankingVisitas } = dadosDashboard;

  if (loading && todosLancamentos.length === 0) return <div className="p-20 text-center font-black text-[#7C69AF] animate-pulse uppercase tracking-widest text-xs">Calculando Faturamento...</div>;

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      
      {/* HEADER E FILTROS */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Financeiro</h1>
          <div className="h-1.5 w-12 bg-[#7C69AF] mt-2 rounded-full"></div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
           {/* SELETOR DE DATA */}
           <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
              <select 
                value={filtroData.mes} 
                onChange={(e) => setFiltroData({...filtroData, mes: e.target.value})}
                className="bg-transparent px-4 py-2 font-bold text-slate-700 outline-none cursor-pointer text-sm"
              >
                {Array.from({length: 12}, (_, i) => (
                    <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('pt-BR', {month: 'long'})}</option>
                ))}
              </select>
              <div className="w-px bg-slate-200 my-2"></div>
              <input 
                type="number" 
                value={filtroData.ano}
                onChange={(e) => setFiltroData({...filtroData, ano: e.target.value})}
                className="w-20 bg-transparent px-4 py-2 font-bold text-slate-700 outline-none text-sm"
              />
           </div>

           <button onClick={handleGerarFaturas} disabled={gerandoFaturas} className="bg-white border-2 border-[#302464] text-[#302464] px-6 py-2.5 rounded-2xl flex items-center gap-2 font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all disabled:opacity-50">
             {gerandoFaturas ? <RefreshCw className="animate-spin" size={16}/> : <RefreshCw size={16}/>} Faturas
           </button>
           <button onClick={() => setIsModalOpen(true)} className="bg-[#302464] hover:bg-[#7C69AF] text-white px-6 py-2.5 rounded-2xl flex items-center gap-2 font-black text-xs uppercase tracking-widest shadow-xl shadow-purple-900/20 transition-all active:scale-95">
             <Plus size={18} /> Lançar
           </button>
        </div>
      </div>

      <div className="flex p-1.5 bg-slate-200/50 rounded-2xl mb-8 w-full md:w-fit">
          <button onClick={() => setActiveTab('DASHBOARD')} className={`px-8 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'DASHBOARD' ? 'bg-white text-[#302464] shadow-sm' : 'text-slate-500'}`}>Dashboard</button>
          <button onClick={() => setActiveTab('LISTA')} className={`px-8 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'LISTA' ? 'bg-white text-[#302464] shadow-sm' : 'text-slate-500'}`}>Extrato</button>
      </div>

      {activeTab === 'DASHBOARD' && (
        <div className="space-y-8">
            {/* LINHA 1: KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* SALDO ACUMULADO (GLOBAL) */}
                <div className="bg-[#302464] p-6 rounded-[2rem] border border-[#302464] shadow-xl shadow-purple-900/30">
                    <p className="text-[10px] font-black text-[#A696D1] uppercase tracking-widest mb-3">Caixa Total (Acumulado)</p>
                    <div className="flex items-end justify-between">
                        <h3 className="text-3xl font-black text-white">
                            R$ {kpis.saldoAcumulado.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                        </h3>
                        <div className="p-2 bg-white/10 text-white rounded-xl"><Wallet size={20}/></div>
                    </div>
                </div>

                {/* RESULTADO DO MÊS */}
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Resultado do Mês</p>
                    <div className="flex items-end justify-between">
                        <h3 className={`text-2xl font-black ${kpis.resultadoPeriodo >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            R$ {kpis.resultadoPeriodo.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                        </h3>
                        <div className={`p-2 rounded-xl ${kpis.resultadoPeriodo >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                            {kpis.resultadoPeriodo >= 0 ? <ArrowUpRight size={20}/> : <TrendingUp size={20} className="rotate-180"/>}
                        </div>
                    </div>
                </div>

                {/* RECEITA DO MÊS */}
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Entradas (Mês)</p>
                    <div className="flex items-end justify-between">
                        <h3 className="text-2xl font-black text-[#7C69AF]">
                            R$ {kpis.receitaPeriodo.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                        </h3>
                        <div className="p-2 bg-purple-50 text-[#7C69AF] rounded-xl"><TrendingUp size={20}/></div>
                    </div>
                </div>

                {/* CONTRATOS ATIVOS */}
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Contratos Ativos</p>
                    <div className="flex items-end justify-between">
                        <h3 className="text-2xl font-black text-slate-800">{kpis.contratosAtivos}</h3>
                        <div className="p-2 bg-slate-50 text-slate-600 rounded-xl"><Building2 size={20}/></div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* GRÁFICO */}
                <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-center items-center">
                    <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest mb-4 w-full flex items-center gap-2">
                        <PieIcon size={16} className="text-[#7C69AF]"/> Fontes de Receita (Mês)
                    </h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={graficoReceita} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {graficoReceita.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <RechartsTooltip formatter={(val) => `R$ ${val.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`} contentStyle={{borderRadius: '10px', border:'none', boxShadow:'0 4px 10px rgba(0,0,0,0.1)'}} />
                                <Legend verticalAlign="bottom" height={36} iconType="circle"/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* RANKING DE VISITAS */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Truck size={16} className="text-[#7C69AF]"/> Top Visitas (Mês)
                    </h3>
                    <div className="space-y-4">
                        {rankingVisitas.length === 0 ? (
                            <p className="text-center text-slate-400 font-medium py-10 text-xs uppercase tracking-widest">Sem visitas no período.</p>
                        ) : (
                            rankingVisitas.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-black text-[#302464] text-xs shadow-sm border border-slate-100">{idx + 1}</div>
                                        <div><p className="font-bold text-slate-700 text-sm">{item.cliente__razao_social}</p><p className="text-[10px] text-slate-400 font-bold uppercase">{item.qtd} visitas</p></div>
                                    </div>
                                    <div className="text-right"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Custo</p><p className="font-black text-red-500">R$ {item.custo?.toFixed(2)}</p></div>
                                </div>
                            ))
                        )}
                    </div>
                    {kpis.custoTransporte > 0 && (
                        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Gasto Transporte</span>
                            <span className="text-lg font-black text-red-500">R$ {kpis.custoTransporte.toFixed(2)}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* NOVA SEÇÃO: SERVIÇOS E INADIMPLÊNCIA */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* SERVIÇOS DO MÊS */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                     <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Check size={16} className="text-emerald-500"/> Serviços Realizados ({filtroData.mes}/{filtroData.ano})
                    </h3>
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                        {servicosMes.length === 0 ? (
                            <p className="text-slate-400 text-xs text-center py-4">Nenhum serviço este mês.</p>
                        ) : servicosMes.map(serv => (
                            <div key={serv.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-slate-700 text-sm">{serv.descricao}</p>
                                    <p className="text-[10px] font-black text-slate-400 uppercase">{new Date(serv.data_vencimento).toLocaleDateString()} • {serv.nome_cliente || 'Avulso'}</p>
                                </div>
                                <div className="text-right">
                                    <span className="font-black text-emerald-600">R$ {parseFloat(serv.valor).toFixed(2)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* INADIMPLENTES (GERAL - NÃO SÓ DO MÊS) */}
                <div className="bg-red-50/50 p-8 rounded-[2.5rem] border border-red-100 shadow-sm">
                     <h3 className="font-black text-red-600 text-xs uppercase tracking-widest mb-6 flex items-center gap-2">
                        <AlertTriangle size={16} className="text-red-500"/> Inadimplentes (Geral)
                    </h3>
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                        {inadimplentes.length === 0 ? (
                             <div className="flex flex-col items-center justify-center py-6 text-emerald-600/60">
                                <Check size={40} className="mb-2"/>
                                <p className="text-xs font-bold uppercase tracking-widest">Tudo em dia!</p>
                             </div>
                        ) : inadimplentes.map(divida => (
                            <div key={divida.id} className="p-4 bg-white rounded-2xl border border-red-100 shadow-sm flex justify-between items-center group hover:border-red-300 transition-colors">
                                <div>
                                    <p className="font-bold text-slate-800 text-sm">{divida.nome_cliente || 'Cliente Avulso'}</p>
                                    <p className="text-[10px] font-black text-red-400 uppercase">{divida.descricao}</p>
                                    <p className="text-[10px] text-slate-400 font-bold mt-1">Venceu: {new Date(divida.data_vencimento).toLocaleDateString()}</p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <span className="font-black text-red-600 text-lg">R$ {parseFloat(divida.valor).toFixed(2)}</span>
                                    <button 
                                        onClick={() => handleConfirmarPagamento(divida)}
                                        className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1"
                                    >
                                        <Check size={12}/> Baixar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
      )}

      {/* ABA LISTA (EXTRATO) */}
      {activeTab === 'LISTA' && (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden animate-in slide-in-from-bottom-2">
             
             {/* BARRA DE BUSCA NO EXTRATO */}
             <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                <Search size={20} className="text-slate-300" />
                <input 
                    type="text" 
                    placeholder="Buscar por descrição, cliente ou valor..." 
                    className="w-full font-bold text-slate-600 outline-none placeholder:text-slate-300"
                    value={buscaExtrato}
                    onChange={(e) => setBuscaExtrato(e.target.value)}
                />
             </div>

             <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                    <tr><th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Lançamento</th><th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Vencimento</th><th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th><th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {extratoExibicao.map(lanc => (
                        <tr key={lanc.id} className="group hover:bg-slate-50/50 transition-colors">
                            <td className="p-6"><div className="font-black text-slate-800">{lanc.descricao}</div><div className="text-[10px] text-slate-400 flex items-center gap-1 mt-1 font-bold uppercase"><Building2 size={10}/> {lanc.nome_cliente || 'Geral'}</div></td>
                            <td className="p-6 text-center text-xs font-bold text-slate-500">{new Date(lanc.data_vencimento).toLocaleDateString()}</td>
                            <td className="p-6 text-center"><span className={`text-[9px] font-black px-3 py-1 rounded-lg uppercase tracking-widest border ${lanc.status === 'PAGO' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : lanc.status === 'PENDENTE' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-red-50 text-red-600 border-red-100'}`}>{lanc.status}</span></td>
                            <td className="p-6 text-right"><div className={`font-black text-lg ${lanc.tipo_lancamento === 'ENTRADA' ? 'text-emerald-600' : 'text-red-500'}`}>{lanc.tipo_lancamento === 'SAIDA' && '- '}R$ {parseFloat(lanc.valor).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>{lanc.status === 'PENDENTE' && <button onClick={() => handleConfirmarPagamento(lanc)} className="text-[9px] font-black text-[#7C69AF] uppercase tracking-widest hover:underline mt-1">Baixar</button>}</td>
                        </tr>
                    ))}
                    {extratoExibicao.length === 0 && (
                        <tr><td colSpan="4" className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Nenhum lançamento encontrado.</td></tr>
                    )}
                </tbody>
             </table>
        </div>
      )}

      {/* MODAL (MANTIDO) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#302464]/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-8 relative border border-white/20">
                <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 text-slate-400 hover:text-[#302464]"><X size={24}/></button>
                <h3 className="font-black text-[#302464] text-xl mb-6 uppercase tracking-widest text-center">Novo Lançamento</h3>
                <form onSubmit={handleSalvar} className="space-y-5">
                    <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição</label><input required className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl font-bold text-[#302464] outline-none focus:ring-4 focus:ring-purple-500/5" value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} /></div>
                    <div className="grid grid-cols-2 gap-4"><div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor (R$)</label><input required type="number" step="0.01" className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl font-bold text-[#302464] outline-none" value={form.valor} onChange={e => setForm({...form, valor: e.target.value})} /></div><div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Operação</label><select className="w-full px-4 py-3.5 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 outline-none" value={form.tipo_lancamento} onChange={e => setForm({...form, tipo_lancamento: e.target.value})}><option value="ENTRADA">Receita (+)</option><option value="SAIDA">Despesa (-)</option></select></div></div>
                    <div className="grid grid-cols-2 gap-4"><div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoria</label><select className="w-full px-4 py-3.5 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 outline-none" value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})}><option value="DESPESA">Geral</option><option value="SERVICO">Serviço</option><option value="COMPRA">Estoque</option></select></div><div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vencimento</label><input required type="date" className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl font-bold text-[#302464] outline-none" value={form.data_vencimento} onChange={e => setForm({...form, data_vencimento: e.target.value})} /></div></div>
                    <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vincular Cliente</label><select className="w-full px-4 py-3.5 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 outline-none" value={form.cliente} onChange={e => setForm({...form, cliente: e.target.value})}><option value="">Nenhum (Lançamento Avulso)</option>{clientes.map(c => <option key={c.id} value={c.id}>{c.razao_social}</option>)}</select></div>
                    <button type="submit" className="w-full py-5 bg-gradient-to-r from-[#302464] to-[#7C69AF] text-white rounded-3xl font-black shadow-xl shadow-purple-900/20 active:scale-95 transition-all mt-4">Confirmar Lançamento</button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}