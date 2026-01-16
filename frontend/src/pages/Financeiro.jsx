import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, DollarSign, AlertTriangle, Building2, TrendingUp, RefreshCw, 
  Truck, PieChart as PieIcon, Check, X, Wallet, ArrowUpRight, Search, Calendar, Trash2, Printer
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
  const [lancamentosFiltrados, setLancamentosFiltrados] = useState([]); // Extrato (Mês + Pendências Passadas)
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
      
      setTodosLancamentos(dadosFin); 

      // --- NOVA LÓGICA DE FILTRO DO EXTRATO ---
      const mesSelecionado = parseInt(filtroData.mes);
      const anoSelecionado = parseInt(filtroData.ano);

      const listaParaExtrato = dadosFin.filter(l => {
         const [anoStr, mesStr] = l.data_vencimento.split('-');
         const anoItem = parseInt(anoStr);
         const mesItem = parseInt(mesStr);

         // 1. É do mês/ano selecionado?
         const ehDoMes = mesItem === mesSelecionado && anoItem === anoSelecionado;

         // 2. É pendente antigo? (Arrasta para o mês atual)
         const ehPendenteAntigo = (l.status === 'PENDENTE' || l.status === 'ATRASADO') && 
                                  ((anoItem < anoSelecionado) || (anoItem === anoSelecionado && mesItem < mesSelecionado));

         return ehDoMes || ehPendenteAntigo;
      });

      // ORDENAÇÃO: Vencimento
      listaParaExtrato.sort((a, b) => new Date(b.data_vencimento) - new Date(a.data_vencimento));

      setLancamentosFiltrados(listaParaExtrato);
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
  
  // 1. INADIMPLENTES AGRUPADOS
  const inadimplentesAgrupados = useMemo(() => {
      const hoje = new Date();
      hoje.setHours(0,0,0,0);
      
      const vencidos = todosLancamentos.filter(l => {
          const vencimento = new Date(l.data_vencimento + 'T12:00:00');
          return (l.status === 'PENDENTE' || l.status === 'ATRASADO') && 
                 l.tipo_lancamento === 'ENTRADA' && 
                 vencimento < hoje;
      });

      const mapa = {};
      const listaFinal = [];

      vencidos.forEach(item => {
          if (item.cliente) {
              if (!mapa[item.cliente]) {
                  mapa[item.cliente] = {
                      id: `grupo-${item.cliente}`,
                      isGroup: true,
                      clienteId: item.cliente,
                      nome_cliente: item.nome_cliente,
                      ids_reais: [], 
                      valor: 0,
                      qtd: 0,
                      data_mais_antiga: item.data_vencimento
                  };
                  listaFinal.push(mapa[item.cliente]);
              }
              const grupo = mapa[item.cliente];
              grupo.valor += parseFloat(item.valor);
              grupo.ids_reais.push(item.id);
              grupo.qtd += 1;
              if (item.data_vencimento < grupo.data_mais_antiga) {
                  grupo.data_mais_antiga = item.data_vencimento;
              }
          } else {
              listaFinal.push({
                  ...item,
                  isGroup: false,
                  ids_reais: [item.id],
                  valor: parseFloat(item.valor)
              });
          }
      });

      return listaFinal.sort((a, b) => new Date(a.isGroup ? a.data_mais_antiga : a.data_vencimento) - new Date(b.isGroup ? b.data_mais_antiga : b.data_vencimento));
  }, [todosLancamentos]);

  // 2. Serviços do Mês
  const servicosMes = useMemo(() => {
      return todosLancamentos.filter(l => {
          const [ano, mes] = l.data_vencimento.split('-');
          return parseInt(mes) === parseInt(filtroData.mes) && 
                 parseInt(ano) === parseInt(filtroData.ano) &&
                 l.tipo_lancamento === 'ENTRADA' && 
                 l.categoria === 'SERVICO';
      });
  }, [todosLancamentos, filtroData]);

  // 3. Extrato Filtrado pela Busca
  const extratoExibicao = useMemo(() => {
      if (!buscaExtrato) return lancamentosFiltrados;
      const termo = buscaExtrato.toLowerCase();
      return lancamentosFiltrados.filter(l => 
          l.descricao.toLowerCase().includes(termo) || 
          (l.nome_cliente && l.nome_cliente.toLowerCase().includes(termo))
      );
  }, [lancamentosFiltrados, buscaExtrato]);


  // --- AÇÕES ---
  const handleConfirmarPagamento = async (item) => {
    const valor = parseFloat(item.valor) || 0;
    const msg = item.isGroup 
        ? `Confirmar recebimento TOTAL de R$ ${valor.toFixed(2)} referente a ${item.qtd} faturas de ${item.nome_cliente}?`
        : `Confirmar recebimento de R$ ${valor.toFixed(2)}?`;

    if (!window.confirm(msg)) return;
    
    try {
      const idsParaBaixar = item.ids_reais ? item.ids_reais : [item.id];
      await financeiroService.baixarEmLote(idsParaBaixar);
      carregarDados();
    } catch { alert("Erro ao confirmar."); }
  };

  const handleExcluir = async (id) => {
      if (!window.confirm("Tem certeza que deseja EXCLUIR este lançamento? Essa ação não pode ser desfeita.")) return;
      try {
          await financeiroService.excluir(id); 
          carregarDados();
      } catch (error) {
          console.error(error);
          alert("Erro ao excluir lançamento.");
      }
  };

  // --- NOVA FUNÇÃO: IMPRIMIR ---
  const handleImprimir = () => {
    const periodo = `${filtroData.mes}/${filtroData.ano}`;
    const dados = extratoExibicao.sort((a,b) => new Date(a.data_vencimento) - new Date(b.data_vencimento)); // Ordena cronológico para relatório
    
    // Calcula totais para o rodapé do PDF
    let totalEnt = 0;
    let totalSai = 0;

    const printWindow = window.open('', '', 'height=600,width=800');
    
    // HTML do Relatório
    printWindow.document.write('<html><head><title>Relatório Financeiro</title>');
    printWindow.document.write(`
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; }
            h1 { text-align: center; color: #302464; font-size: 24px; margin-bottom: 5px; }
            p.sub { text-align: center; color: #666; font-size: 14px; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { background-color: #f3f4f6; color: #302464; padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
            td { padding: 10px; border-bottom: 1px solid #e5e7eb; vertical-align: middle; }
            tr:nth-child(even) { background-color: #f9fafb; }
            .valor { font-weight: bold; text-align: right; }
            .entrada { color: #059669; }
            .saida { color: #dc2626; }
            .status-tag { padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; text-transform: uppercase; }
            .PAGO { background: #ecfdf5; color: #059669; }
            .PENDENTE { background: #fffbeb; color: #d97706; }
            .ATRASADO { background: #fef2f2; color: #dc2626; }
            .resumo-box { margin-top: 30px; display: flex; justify-content: flex-end; }
            .resumo-table { width: 300px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
            .resumo-row { display: flex; justify-content: space-between; padding: 10px 15px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
            .resumo-total { background: #302464; color: white; font-weight: bold; border: none; }
        </style>
    `);
    printWindow.document.write('</head><body>');
    
    printWindow.document.write(`<h1>Relatório Financeiro</h1><p class="sub">Período: ${periodo}</p>`);
    
    printWindow.document.write('<table><thead><tr><th>Data</th><th>Descrição</th><th>Cliente</th><th>Status</th><th style="text-align:right">Valor</th></tr></thead><tbody>');
    
    dados.forEach(item => {
        const valor = parseFloat(item.valor);
        if(item.tipo_lancamento === 'ENTRADA') totalEnt += valor; else totalSai += valor;
        
        printWindow.document.write(`
            <tr>
                <td>${new Date(item.data_vencimento).toLocaleDateString('pt-BR')}</td>
                <td>${item.descricao}</td>
                <td>${item.nome_cliente || '-'}</td>
                <td><span class="status-tag ${item.status}">${item.status}</span></td>
                <td class="valor ${item.tipo_lancamento === 'ENTRADA' ? 'entrada' : 'saida'}">
                    ${item.tipo_lancamento === 'SAIDA' ? '-' : ''}R$ ${valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                </td>
            </tr>
        `);
    });
    
    printWindow.document.write('</tbody></table>');
    
    const saldo = totalEnt - totalSai;
    printWindow.document.write(`
        <div class="resumo-box">
            <div class="resumo-table">
                <div class="resumo-row"><span>Total Receitas</span><span class="entrada">R$ ${totalEnt.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></div>
                <div class="resumo-row"><span>Total Despesas</span><span class="saida">R$ ${totalSai.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></div>
                <div class="resumo-row resumo-total"><span>Saldo Líquido</span><span>R$ ${saldo.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></div>
            </div>
        </div>
    `);

    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    // Pequeno timeout para garantir carregamento de estilos
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 250);
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

           {/* --- BOTÃO IMPRIMIR NOVO --- */}
           <button onClick={handleImprimir} className="bg-white border-2 border-slate-200 text-slate-600 px-4 py-2.5 rounded-2xl flex items-center gap-2 font-black text-xs uppercase tracking-widest hover:bg-slate-50 hover:border-slate-300 transition-all">
             <Printer size={16}/> Imprimir
           </button>

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
                {/* SALDO ACUMULADO */}
                <div className="bg-[#302464] p-6 rounded-[2rem] border border-[#302464] shadow-xl shadow-purple-900/30">
                    <p className="text-[10px] font-black text-[#A696D1] uppercase tracking-widest mb-3">Caixa Total (Acumulado)</p>
                    <div className="flex items-end justify-between">
                        <h3 className="text-3xl font-black text-white">R$ {kpis.saldoAcumulado.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3>
                        <div className="p-2 bg-white/10 text-white rounded-xl"><Wallet size={20}/></div>
                    </div>
                </div>
                {/* RESULTADO DO MÊS */}
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Resultado do Mês</p>
                    <div className="flex items-end justify-between">
                        <h3 className={`text-2xl font-black ${kpis.resultadoPeriodo >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>R$ {kpis.resultadoPeriodo.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3>
                        <div className={`p-2 rounded-xl ${kpis.resultadoPeriodo >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                            {kpis.resultadoPeriodo >= 0 ? <ArrowUpRight size={20}/> : <TrendingUp size={20} className="rotate-180"/>}
                        </div>
                    </div>
                </div>
                {/* RECEITA DO MÊS */}
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Entradas (Mês)</p>
                    <div className="flex items-end justify-between">
                        <h3 className="text-2xl font-black text-[#7C69AF]">R$ {kpis.receitaPeriodo.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3>
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

            {/* NOVA SEÇÃO: SERVIÇOS E INADIMPLÊNCIA (AGRUPADO) */}
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

                {/* INADIMPLENTES (AGRUPADO POR CLIENTE) */}
                <div className="bg-red-50/50 p-8 rounded-[2.5rem] border border-red-100 shadow-sm">
                     <h3 className="font-black text-red-600 text-xs uppercase tracking-widest mb-6 flex items-center gap-2">
                        <AlertTriangle size={16} className="text-red-500"/> Inadimplentes (Acumulado)
                    </h3>
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                        {inadimplentesAgrupados.length === 0 ? (
                             <div className="flex flex-col items-center justify-center py-6 text-emerald-600/60">
                                <Check size={40} className="mb-2"/>
                                <p className="text-xs font-bold uppercase tracking-widest">Tudo em dia!</p>
                             </div>
                        ) : inadimplentesAgrupados.map(divida => (
                            <div key={divida.id} className="p-4 bg-white rounded-2xl border border-red-100 shadow-sm flex justify-between items-center group hover:border-red-300 transition-colors">
                                <div>
                                    <p className="font-bold text-slate-800 text-sm">{divida.nome_cliente || 'Cliente Avulso'}</p>
                                    {divida.isGroup ? (
                                        <p className="text-[10px] font-black text-red-500 bg-red-100 px-2 py-0.5 rounded-md w-fit mt-1 uppercase">{divida.qtd} Faturas em Aberto</p>
                                    ) : (
                                        <p className="text-[10px] font-black text-red-400 uppercase">{divida.descricao}</p>
                                    )}
                                    <p className="text-[10px] text-slate-400 font-bold mt-1">Desde: {new Date(divida.isGroup ? divida.data_mais_antiga : divida.data_vencimento).toLocaleDateString()}</p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <span className="font-black text-red-600 text-lg">R$ {divida.valor.toFixed(2)}</span>
                                    <button onClick={() => handleConfirmarPagamento(divida)} className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1">
                                        <Check size={12}/> Baixar Tudo
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
             
             {/* BARRA DE BUSCA */}
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
                            <td className="p-6 text-right">
                                <div className="flex items-center justify-end gap-4">
                                    <div className={`font-black text-lg ${lanc.tipo_lancamento === 'ENTRADA' ? 'text-emerald-600' : 'text-red-500'}`}>{lanc.tipo_lancamento === 'SAIDA' && '- '}R$ {parseFloat(lanc.valor).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
                                    <div className="flex flex-col gap-2">
                                        {lanc.status === 'PENDENTE' && <button onClick={() => handleConfirmarPagamento(lanc)} className="text-[9px] font-black text-[#7C69AF] uppercase tracking-widest hover:underline">Baixar</button>}
                                        <button onClick={() => handleExcluir(lanc.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {extratoExibicao.length === 0 && (
                        <tr><td colSpan="4" className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Nenhum lançamento encontrado.</td></tr>
                    )}
                </tbody>
             </table>
        </div>
      )}

      {/* MODAL MANTIDO */}
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