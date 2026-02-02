import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Plus, Wallet, ArrowUpRight, TrendingUp, RefreshCw, 
  Truck, PieChart as PieIcon, Check, X, Search, Printer, 
  CheckSquare, Paperclip, Building2, AlertTriangle, Trash2, 
  MoreVertical, FileText, Download 
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend 
} from 'recharts';

import financeiroService from '../services/financeiroService';
import clienteService from '../services/clienteService';

export default function Financeiro() {
  const [activeTab, setActiveTab] = useState('DASHBOARD');
  
  // === ESTADOS DE DADOS ===
  const [todosLancamentos, setTodosLancamentos] = useState([]); 
  const [clientes, setClientes] = useState([]);
  // Inicializa com estrutura padrão para evitar erro de "undefined" no dashboard
  const [dadosDashboard, setDadosDashboard] = useState({
      saldo: 0, resultadoPeriodo: 0, receitaPeriodo: 0, 
      contratosAtivos: 0, custoTransporte: 0,
      graficoReceita: [], rankingVisitas: []
  }); 
  
  // === ESTADOS DE INTERFACE ===
  const [loading, setLoading] = useState(true);
  const [gerandoFaturas, setGerandoFaturas] = useState(false);
  const [buscaExtrato, setBuscaExtrato] = useState(''); 
  const [selectedIds, setSelectedIds] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filtro de Categoria/Tipo
  const [filtroCategoria, setFiltroCategoria] = useState('TODOS');

  // Filtro de Data (Controla o Dashboard)
  const [filtroData, setFiltroData] = useState({
    mes: new Date().getMonth() + 1,
    ano: new Date().getFullYear()
  });

  // Form State
  const [form, setForm] = useState({
    descricao: '', valor: '', tipo_lancamento: 'ENTRADA', 
    categoria: 'DESPESA', data_vencimento: '', cliente: '',
    forma_pagamento: 'DINHEIRO', total_parcelas: 1,
    arquivo_1: null, arquivo_2: null
  });

  // =========================================================================
  // 1. CARREGAMENTO INTELIGENTE
  // =========================================================================

  const carregarDadosGlobais = async () => {
      try {
          const [dadosFin, dadosCli] = await Promise.all([
              financeiroService.listar(),
              clienteService.listar()
          ]);
          setTodosLancamentos(dadosFin || []);
          setClientes(dadosCli || []);
      } catch (error) {
          console.error("Erro ao carregar lista:", error);
      }
  };

  const carregarEstatisticas = useCallback(async () => {
      try {
          setLoading(true);
          const stats = await financeiroService.estatisticasGerais(filtroData.mes, filtroData.ano);
          
          // Garante que o estado receba um objeto válido mesmo se a API falhar
          setDadosDashboard(stats || {
              saldo: 0, resultadoPeriodo: 0, receitaPeriodo: 0, 
              contratosAtivos: 0, custoTransporte: 0,
              graficoReceita: [], rankingVisitas: []
          });
      } catch (error) {
          console.error("Erro ao carregar KPIs:", error);
      } finally {
          setLoading(false);
      }
  }, [filtroData]);

  useEffect(() => {
      financeiroService.processarRecorrencias()
          .catch(() => {}) 
          .finally(() => {
              carregarDadosGlobais();
          });
  }, []);

  useEffect(() => {
      carregarEstatisticas();
      setSelectedIds([]); 
  }, [carregarEstatisticas]);


  // =========================================================================
  // 2. FILTROS E CÁLCULOS
  // =========================================================================

  const lancamentosDoMes = useMemo(() => {
      const mesSel = parseInt(filtroData.mes);
      const anoSel = parseInt(filtroData.ano);

      return todosLancamentos.filter(l => {
          if (!l.data_vencimento) return false;
          const [anoStr, mesStr] = l.data_vencimento.split('-'); 
          return parseInt(mesStr) === mesSel && parseInt(anoStr) === anoSel;
      }).sort((a, b) => new Date(b.data_vencimento) - new Date(a.data_vencimento)); 
  }, [todosLancamentos, filtroData]);

  const extratoExibicao = useMemo(() => {
      let dados = lancamentosDoMes;

      if (buscaExtrato) {
          const termo = buscaExtrato.toLowerCase();
          dados = dados.filter(l => 
              l.descricao.toLowerCase().includes(termo) || 
              (l.nome_cliente && l.nome_cliente.toLowerCase().includes(termo))
          );
      }

      if (filtroCategoria !== 'TODOS') {
        if (filtroCategoria === 'ENTRADA') {
            dados = dados.filter(l => l.tipo_lancamento === 'ENTRADA');
        } else if (filtroCategoria === 'SAIDA') {
            dados = dados.filter(l => l.tipo_lancamento === 'SAIDA');
        } else {
            dados = dados.filter(l => l.categoria === filtroCategoria);
        }
      }

      return dados;
  }, [lancamentosDoMes, buscaExtrato, filtroCategoria]);

  const inadimplentesAgrupados = useMemo(() => {
      const hoje = new Date();
      hoje.setHours(0,0,0,0);
      
      const vencidos = todosLancamentos.filter(l => {
          if (!l.data_vencimento) return false;
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
                      data_mais_antiga: item.data_vencimento,
                      comprovante: null 
                  };
                  listaFinal.push(mapa[item.cliente]);
              }
              const grupo = mapa[item.cliente];
              grupo.valor += parseFloat(item.valor || 0);
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
                  valor: parseFloat(item.valor || 0),
              });
          }
      });

      return listaFinal.sort((a, b) => new Date(a.isGroup ? a.data_mais_antiga : a.data_vencimento) - new Date(b.isGroup ? b.data_mais_antiga : b.data_vencimento));
  }, [todosLancamentos]);

  const servicosMes = useMemo(() => {
      return lancamentosDoMes.filter(l => l.tipo_lancamento === 'ENTRADA' && l.categoria === 'SERVICO');
  }, [lancamentosDoMes]);

  // =========================================================================
  // 3. AÇÕES (HANDLERS)
  // =========================================================================

  const handleToggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(item => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === extratoExibicao.length) {
      setSelectedIds([]); 
    } else {
      setSelectedIds(extratoExibicao.map(l => l.id)); 
    }
  };

  const handleBaixarMultiplo = async () => {
    if (selectedIds.length === 0) return;
    const pendentesSelecionados = extratoExibicao.filter(l => selectedIds.includes(l.id) && (l.status === 'PENDENTE' || l.status === 'ATRASADO'));
    
    if (pendentesSelecionados.length === 0) {
       alert("Os itens selecionados já estão pagos ou não são elegíveis.");
       setSelectedIds([]);
       return;
    }

    const total = pendentesSelecionados.reduce((acc, curr) => acc + parseFloat(curr.valor), 0);
    
    if (!window.confirm(`Confirma a baixa de ${pendentesSelecionados.length} lançamentos?\nValor Total: R$ ${total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`)) return;

    try {
        await financeiroService.baixarEmLote(pendentesSelecionados.map(p => p.id));
        alert("Baixa realizada com sucesso!");
        carregarDadosGlobais(); 
        carregarEstatisticas();
        setSelectedIds([]);
    } catch (error) {
        alert("Erro ao realizar baixa múltipla.");
    }
  };

  const handleConfirmarPagamento = async (item) => {
    const valor = parseFloat(item.valor) || 0;
    const msg = item.isGroup 
        ? `Confirmar recebimento TOTAL de R$ ${valor.toFixed(2)} referente a ${item.qtd} faturas de ${item.nome_cliente}?`
        : `Confirmar recebimento de R$ ${valor.toFixed(2)}?`;

    if (!window.confirm(msg)) return;
    
    try {
      const idsParaBaixar = item.ids_reais ? item.ids_reais : [item.id];
      await financeiroService.baixarEmLote(idsParaBaixar);
      carregarDadosGlobais();
      carregarEstatisticas();
    } catch { alert("Erro ao confirmar."); }
  };

  const handleExcluir = async (id) => {
      if (!window.confirm("Tem certeza que deseja EXCLUIR este lançamento?")) return;
      try {
          await financeiroService.excluir(id); 
          carregarDadosGlobais();
          carregarEstatisticas();
      } catch (error) {
          alert("Erro ao excluir lançamento.");
      }
  };

  const handleImprimir = () => {
    const periodo = `${filtroData.mes}/${filtroData.ano}`;
    const dados = extratoExibicao; 
    let totalEnt = 0;
    let totalSai = 0;

    const printWindow = window.open('', '', 'height=600,width=800');
    
    printWindow.document.write('<html><head><title>Relatório Financeiro</title>');
    printWindow.document.write(`
        <style>
            body { font-family: sans-serif; padding: 20px; color: #333; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { background-color: #f3f4f6; padding: 10px; text-align: left; border-bottom: 2px solid #ddd; }
            td { padding: 10px; border-bottom: 1px solid #ddd; }
            .valor { font-weight: bold; text-align: right; }
            .entrada { color: green; } .saida { color: red; }
        </style>
    `);
    printWindow.document.write('</head><body>');
    printWindow.document.write(`<h1>Relatório Financeiro - ${periodo}</h1>`);
    printWindow.document.write('<table><thead><tr><th>Data</th><th>Descrição</th><th>Status</th><th style="text-align:right">Valor</th></tr></thead><tbody>');
    
    dados.forEach(item => {
        const valor = parseFloat(item.valor);
        if(item.tipo_lancamento === 'ENTRADA') totalEnt += valor; else totalSai += valor;
        printWindow.document.write(`
            <tr>
                <td>${new Date(item.data_vencimento).toLocaleDateString('pt-BR')}</td>
                <td>${item.descricao}</td>
                <td>${item.status}</td>
                <td class="valor ${item.tipo_lancamento === 'ENTRADA' ? 'entrada' : 'saida'}">
                    R$ ${valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                </td>
            </tr>
        `);
    });
    
    printWindow.document.write('</tbody></table>');
    printWindow.document.write(`<h3>Saldo do Período: R$ ${(totalEnt - totalSai).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3></body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  const handleGerarFaturas = async () => {
    if (!window.confirm("Gerar mensalidades para todos os contratos ativos?")) return;
    setGerandoFaturas(true);
    try {
      const res = await financeiroService.gerarFaturasMensais();
      alert(`Sucesso! ${res.faturas_geradas} faturas geradas.`);
      carregarDadosGlobais();
      carregarEstatisticas();
    } catch { alert("Erro no processamento."); } finally { setGerandoFaturas(false); }
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    try {
      const data = new FormData();
      data.append('descricao', form.descricao);
      data.append('valor', form.valor);
      data.append('tipo_lancamento', form.tipo_lancamento);
      data.append('categoria', form.categoria);
      data.append('data_vencimento', form.data_vencimento);
      data.append('forma_pagamento', form.forma_pagamento);
      data.append('total_parcelas', form.total_parcelas);
      if (form.cliente) data.append('cliente', form.cliente);
      
      if (form.arquivo_1) data.append('arquivo_1', form.arquivo_1);
      if (form.arquivo_2) data.append('arquivo_2', form.arquivo_2);

      await financeiroService.criar(data);
      setIsModalOpen(false);
      setForm({ 
          descricao: '', valor: '', tipo_lancamento: 'ENTRADA', 
          categoria: 'DESPESA', data_vencimento: '', cliente: '',
          forma_pagamento: 'DINHEIRO', total_parcelas: 1,
          arquivo_1: null, arquivo_2: null
      });
      carregarDadosGlobais();
      carregarEstatisticas();
    } catch { alert("Erro ao salvar."); }
  };

  const FILTROS_RAPIDOS = [
      { id: 'TODOS', label: 'Tudo' },
      { id: 'ENTRADA', label: 'Receitas (+)' },
      { id: 'SAIDA', label: 'Despesas (-)' },
      { id: 'CONTRATO', label: 'Contratos' },
      { id: 'SERVICO', label: 'Serviços/Transporte' },
      { id: 'IMPOSTO', label: 'Impostos' },
  ];

  const COLORS = ['#7C69AF', '#A696D1', '#302464'];

  // Dados seguros para o Dashboard
  const kpis = dadosDashboard;
  const graficoReceita = dadosDashboard.graficoReceita || [];
  const rankingVisitas = dadosDashboard.rankingVisitas || [];

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      
      {/* HEADER E FILTROS */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Financeiro</h1>
          <div className="h-1.5 w-12 bg-[#7C69AF] mt-2 rounded-full"></div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
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

           <button onClick={handleImprimir} className="bg-white border-2 border-slate-200 text-slate-600 px-4 py-2.5 rounded-2xl flex items-center gap-2 font-black text-xs uppercase tracking-widest hover:bg-slate-50 hover:border-slate-300 transition-all">
             <Printer size={16}/> <span className="hidden sm:inline">Imprimir</span>
           </button>

           <button onClick={handleGerarFaturas} disabled={gerandoFaturas} className="bg-white border-2 border-[#302464] text-[#302464] px-6 py-2.5 rounded-2xl flex items-center gap-2 font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all disabled:opacity-50">
             {gerandoFaturas ? <RefreshCw className="animate-spin" size={16}/> : <RefreshCw size={16}/>} <span className="hidden sm:inline">Faturas</span>
           </button>
           <button onClick={() => setIsModalOpen(true)} className="bg-[#302464] hover:bg-[#7C69AF] text-white px-6 py-2.5 rounded-2xl flex items-center gap-2 font-black text-xs uppercase tracking-widest shadow-xl shadow-purple-900/20 transition-all active:scale-95">
             <Plus size={18} /> Lançar
           </button>
        </div>
      </div>

      <div className="flex p-1.5 bg-slate-200/50 rounded-2xl mb-8 w-full md:w-fit overflow-x-auto">
          <button onClick={() => setActiveTab('DASHBOARD')} className={`px-8 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'DASHBOARD' ? 'bg-white text-[#302464] shadow-sm' : 'text-slate-500'}`}>Dashboard</button>
          <button onClick={() => setActiveTab('LISTA')} className={`px-8 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'LISTA' ? 'bg-white text-[#302464] shadow-sm' : 'text-slate-500'}`}>Extrato ({lancamentosDoMes.length})</button>
      </div>

      {activeTab === 'DASHBOARD' && (
        <div className="space-y-8">
            {/* LINHA 1: KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-[#302464] p-6 rounded-[2rem] border border-[#302464] shadow-xl shadow-purple-900/30">
                    <p className="text-[10px] font-black text-[#A696D1] uppercase tracking-widest mb-3">Caixa Total (Acumulado)</p>
                    <div className="flex items-end justify-between">
                        <h3 className="text-3xl font-black text-white">R$ {(kpis.saldo || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3>
                        <div className="p-2 bg-white/10 text-white rounded-xl"><Wallet size={20}/></div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Resultado do Mês</p>
                    <div className="flex items-end justify-between">
                        <h3 className={`text-2xl font-black ${kpis.resultadoPeriodo >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>R$ {(kpis.resultadoPeriodo || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3>
                        <div className={`p-2 rounded-xl ${kpis.resultadoPeriodo >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                            {kpis.resultadoPeriodo >= 0 ? <ArrowUpRight size={20}/> : <TrendingUp size={20} className="rotate-180"/>}
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Entradas (Mês)</p>
                    <div className="flex items-end justify-between">
                        <h3 className="text-2xl font-black text-[#7C69AF]">R$ {(kpis.receitaPeriodo || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3>
                        <div className="p-2 bg-purple-50 text-[#7C69AF] rounded-xl"><TrendingUp size={20}/></div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Contratos Ativos</p>
                    <div className="flex items-end justify-between">
                        <h3 className="text-2xl font-black text-slate-800">{kpis.contratosAtivos || 0}</h3>
                        <div className="p-2 bg-slate-50 text-slate-600 rounded-xl"><Building2 size={20}/></div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* GRÁFICO */}
                <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-center items-center min-h-[300px]">
                    <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest mb-4 w-full flex items-center gap-2">
                        <PieIcon size={16} className="text-[#7C69AF]"/> Fontes de Receita (Mês)
                    </h3>
                    <div className="h-64 w-full">
                        {graficoReceita.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={graficoReceita} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                        {graficoReceita.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                    </Pie>
                                    <RechartsTooltip formatter={(val) => `R$ ${val.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`} contentStyle={{borderRadius: '10px', border:'none', boxShadow:'0 4px 10px rgba(0,0,0,0.1)'}} />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle"/>
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <PieIcon size={48} className="opacity-20 mb-2"/>
                                <p className="text-xs uppercase font-bold tracking-widest">Sem dados para o gráfico</p>
                            </div>
                        )}
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
                                        <div>
                                            <p className="font-bold text-slate-700 text-sm">{item.nome_cliente || 'Cliente'}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase">{item.qtd} visitas</p>
                                        </div>
                                    </div>
                                    <div className="text-right"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Custo</p><p className="font-black text-red-500">R$ {(item.custo || 0).toFixed(2)}</p></div>
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

            {/* SERVIÇOS E INADIMPLÊNCIA */}
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
                                    
                                    <div className="flex gap-2 mt-1">
                                            {serv.comprovante && (
                                                <a href={serv.comprovante} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:scale-125 transition-transform" title="Ver OS/Comprovante">
                                                    <CheckSquare size={14}/>
                                                </a>
                                            )}
                                            {serv.arquivo_1 && <a href={serv.arquivo_1} target="_blank" rel="noopener noreferrer" className="text-[#302464] hover:scale-110 transition-transform"><Paperclip size={12}/></a>}
                                            {serv.arquivo_2 && <a href={serv.arquivo_2} target="_blank" rel="noopener noreferrer" className="text-[#302464] hover:scale-110 transition-transform"><Paperclip size={12}/></a>}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="font-black text-emerald-600">R$ {parseFloat(serv.valor).toFixed(2)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* INADIMPLENTES */}
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
                                        <>
                                            <p className="text-[10px] font-black text-red-400 uppercase">{divida.descricao}</p>
                                            <div className="flex gap-2 mt-1">
                                                {divida.comprovante && <a href={divida.comprovante} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:scale-110 transition-transform"><CheckSquare size={12}/></a>}
                                                {divida.arquivo_1 && <a href={divida.arquivo_1} target="_blank" rel="noopener noreferrer" className="text-red-500 hover:scale-110 transition-transform"><Paperclip size={12}/></a>}
                                                {divida.arquivo_2 && <a href={divida.arquivo_2} target="_blank" rel="noopener noreferrer" className="text-red-500 hover:scale-110 transition-transform"><Paperclip size={12}/></a>}
                                            </div>
                                        </>
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
             
             {/* BARRA DE BUSCA + AÇÕES */}
             <div className="p-6 border-b border-slate-100">
                 <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3 w-full md:flex-1 bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100">
                        <Search size={20} className="text-slate-300" />
                        <input 
                            type="text" 
                            placeholder="Buscar por descrição, cliente ou valor..." 
                            className="w-full bg-transparent font-bold text-slate-600 outline-none placeholder:text-slate-300"
                            value={buscaExtrato}
                            onChange={(e) => setBuscaExtrato(e.target.value)}
                        />
                    </div>
                    
                    {selectedIds.length > 0 && (
                        <button 
                            onClick={handleBaixarMultiplo}
                            className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 animate-in fade-in slide-in-from-right-5 shadow-lg shadow-emerald-500/20"
                        >
                            <CheckSquare size={16} /> Baixar ({selectedIds.length})
                        </button>
                    )}
                 </div>

                 <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200">
                    {FILTROS_RAPIDOS.map(filtro => (
                        <button
                            key={filtro.id}
                            onClick={() => setFiltroCategoria(filtro.id)}
                            className={`
                                whitespace-nowrap px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border
                                ${filtroCategoria === filtro.id 
                                    ? 'bg-[#302464] text-white border-[#302464] shadow-md shadow-purple-900/20' 
                                    : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50 hover:border-slate-200'}
                            `}
                        >
                            {filtro.label}
                        </button>
                    ))}
                 </div>
             </div>

             {/* ========== VERSÃO DESKTOP (TABELA) ========== */}
             <div className="hidden md:block">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="p-6 w-14">
                                <input 
                                    type="checkbox" 
                                    className="w-5 h-5 accent-[#302464] cursor-pointer rounded-md"
                                    checked={extratoExibicao.length > 0 && selectedIds.length === extratoExibicao.length}
                                    onChange={handleSelectAll}
                                />
                            </th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Lançamento</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Documentos</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Vencimento</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {extratoExibicao.map(lanc => (
                            <tr key={lanc.id} className={`group transition-colors ${selectedIds.includes(lanc.id) ? 'bg-purple-50/50' : 'hover:bg-slate-50/50'}`}>
                                <td className="p-6">
                                    <input 
                                        type="checkbox" 
                                        className="w-5 h-5 accent-[#302464] cursor-pointer rounded-md"
                                        checked={selectedIds.includes(lanc.id)}
                                        onChange={() => handleToggleSelect(lanc.id)}
                                    />
                                </td>
                                <td className="p-6">
                                    <div className="font-black text-slate-800">{lanc.descricao}</div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="text-[10px] text-slate-400 flex items-center gap-1 font-bold uppercase"><Building2 size={10}/> {lanc.nome_cliente || 'Geral'}</div>
                                        <span className="text-[9px] font-bold text-slate-300 uppercase bg-slate-100 px-1.5 py-0.5 rounded">{lanc.categoria}</span>
                                    </div>
                                </td>
                                <td className="p-6 text-center">
                                    <div className="flex justify-center gap-2">
                                        {lanc.comprovante && (
                                            <a href={lanc.comprovante} target="_blank" rel="noopener noreferrer" className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100" title="Ver Comprovante/OS">
                                                <CheckSquare size={14}/>
                                            </a>
                                        )}
                                        {/* EXIBIR PDFS DO ESTOQUE (ORÇAMENTOS) */}
                                        {(lanc.arquivo_1 || lanc.arquivo_2) && (
                                            <div className="flex gap-1">
                                                {lanc.arquivo_1 && (
                                                    <a href={lanc.arquivo_1} target="_blank" rel="noopener noreferrer" className="p-2 bg-purple-50 text-[#302464] rounded-lg hover:bg-purple-100" title="Ver Orçamento/Anexo 1">
                                                        <FileText size={14}/>
                                                    </a>
                                                )}
                                                {lanc.arquivo_2 && (
                                                    <a href={lanc.arquivo_2} target="_blank" rel="noopener noreferrer" className="p-2 bg-purple-50 text-[#302464] rounded-lg hover:bg-purple-100" title="Ver Anexo 2">
                                                        <Paperclip size={14}/>
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                        {!lanc.arquivo_1 && !lanc.arquivo_2 && !lanc.comprovante && (
                                            <span className="text-slate-200">-</span>
                                        )}
                                    </div>
                                </td>
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
                            <tr><td colSpan="6" className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Nenhum lançamento encontrado para este filtro.</td></tr>
                        )}
                    </tbody>
                </table>
             </div>

             {/* ========== VERSÃO MOBILE (CARDS) ========== */}
             <div className="block md:hidden bg-slate-50 p-4 space-y-4">
                 {extratoExibicao.map(lanc => (
                    <div 
                       key={lanc.id} 
                       className={`p-5 rounded-3xl bg-white border shadow-sm transition-all relative overflow-hidden
                                   ${selectedIds.includes(lanc.id) ? 'border-[#302464] ring-2 ring-[#302464]/20' : 'border-slate-100'}`}
                       onClick={() => handleToggleSelect(lanc.id)}
                    >
                        {/* Status Badge Absolute */}
                        <div className={`absolute top-0 right-0 px-4 py-1.5 rounded-bl-2xl text-[9px] font-black uppercase tracking-widest
                            ${lanc.status === 'PAGO' ? 'bg-emerald-100 text-emerald-600' : 
                              lanc.status === 'PENDENTE' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}>
                            {lanc.status}
                        </div>

                        <div className="flex flex-col gap-3">
                           <div>
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${lanc.tipo_lancamento === 'ENTRADA' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                  {lanc.tipo_lancamento}
                              </span>
                              <h3 className="font-black text-slate-800 mt-2 text-lg leading-tight">{lanc.descricao}</h3>
                              <p className="text-[10px] text-slate-400 font-bold mt-1 flex items-center gap-1 uppercase">
                                 <Building2 size={10}/> {lanc.nome_cliente || 'Geral'}
                              </p>
                           </div>

                           <div className="flex items-end justify-between mt-2">
                               <div className="text-[10px] font-bold text-slate-400">
                                  Venc: {new Date(lanc.data_vencimento).toLocaleDateString()}
                               </div>
                               <div className={`font-black text-2xl ${lanc.tipo_lancamento === 'ENTRADA' ? 'text-emerald-600' : 'text-red-500'}`}>
                                  R$ {parseFloat(lanc.valor).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                               </div>
                           </div>
                        </div>

                        {/* Botões de Ação e Arquivos */}
                        <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
                           <div className="flex gap-2">
                              {/* MOSTRAR PDFS NO MOBILE */}
                              {lanc.arquivo_1 && (
                                  <a href={lanc.arquivo_1} target="_blank" rel="noopener noreferrer" className="p-2 bg-purple-50 text-[#302464] rounded-xl" onClick={(e)=>e.stopPropagation()}>
                                      <FileText size={18}/>
                                  </a>
                              )}
                              {lanc.arquivo_2 && (
                                  <a href={lanc.arquivo_2} target="_blank" rel="noopener noreferrer" className="p-2 bg-purple-50 text-[#302464] rounded-xl" onClick={(e)=>e.stopPropagation()}>
                                      <Paperclip size={18}/>
                                  </a>
                              )}
                              {lanc.comprovante && (
                                  <a href={lanc.comprovante} target="_blank" rel="noopener noreferrer" className="p-2 bg-emerald-50 text-emerald-600 rounded-xl" onClick={(e)=>e.stopPropagation()}>
                                      <CheckSquare size={18}/>
                                  </a>
                              )}
                           </div>
                           
                           <div className="flex gap-3">
                              {lanc.status === 'PENDENTE' && (
                                <button 
                                   onClick={(e) => { e.stopPropagation(); handleConfirmarPagamento(lanc); }}
                                   className="bg-[#302464] text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-purple-900/10 active:scale-95 transition-transform"
                                >
                                   Baixar
                                </button>
                              )}
                              <button 
                                 onClick={(e) => { e.stopPropagation(); handleExcluir(lanc.id); }}
                                 className="text-slate-300 hover:text-red-500 p-2"
                              >
                                 <Trash2 size={20}/>
                              </button>
                           </div>
                        </div>
                    </div>
                 ))}
                 
                 {extratoExibicao.length === 0 && (
                    <div className="text-center py-10 text-slate-400 font-bold text-xs uppercase tracking-widest">
                       Nenhum registro encontrado.
                    </div>
                 )}
             </div>

        </div>
      )}

      {/* MODAL LANÇAMENTO MANUAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#302464]/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-8 relative border border-white/20 overflow-y-auto max-h-[90vh]">
                <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 text-slate-400 hover:text-[#302464]"><X size={24}/></button>
                <h3 className="font-black text-[#302464] text-xl mb-6 uppercase tracking-widest text-center">Novo Lançamento</h3>
                <form onSubmit={handleSalvar} className="space-y-5">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição</label>
                        <input required className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl font-bold text-[#302464] outline-none focus:ring-4 focus:ring-purple-500/5" value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor Total (R$)</label>
                            <input required type="number" step="0.01" className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl font-bold text-[#302464] outline-none" value={form.valor} onChange={e => setForm({...form, valor: e.target.value})} />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nº Parcelas</label>
                            <input type="number" min="1" max="60" className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl font-bold text-[#302464] outline-none" value={form.total_parcelas} onChange={e => setForm({...form, total_parcelas: e.target.value})} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Operação</label>
                            <select className="w-full px-4 py-3.5 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 outline-none" value={form.tipo_lancamento} onChange={e => setForm({...form, tipo_lancamento: e.target.value})}>
                                <option value="ENTRADA">Receita (+)</option>
                                <option value="SAIDA">Despesa (-)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pagamento</label>
                            <select className="w-full px-4 py-3.5 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 outline-none" value={form.forma_pagamento} onChange={e => setForm({...form, forma_pagamento: e.target.value})}>
                                <option value="DINHEIRO">Dinheiro</option>
                                <option value="PIX">PIX</option>
                                <option value="BOLETO">Boleto</option>
                                <option value="CREDITO">Cartão Crédito</option>
                                <option value="DEBITO">Cartão Débito</option>
                                <option value="TRANSFERENCIA">Transferência</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoria</label>
                            <select className="w-full px-4 py-3.5 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 outline-none" value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})}>
                                <option value="DESPESA">Geral</option>
                                <option value="SERVICO">Serviço</option>
                                <option value="COMPRA">Estoque</option>
                                <option value="IMPOSTO">Impostos</option>
                                <option value="SALARIO">Pessoal</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vencimento</label>
                            <input required type="date" className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl font-bold text-[#302464] outline-none" value={form.data_vencimento} onChange={e => setForm({...form, data_vencimento: e.target.value})} />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vincular Cliente</label>
                        <select className="w-full px-4 py-3.5 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 outline-none" value={form.cliente} onChange={e => setForm({...form, cliente: e.target.value})}>
                            <option value="">Nenhum (Lançamento Avulso)</option>
                            {clientes.map(c => <option key={c.id} value={c.id}>{c.razao_social}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-3 rounded-2xl">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                                <Paperclip size={10} className="inline mr-1"/> Anexo 1 (PDF)
                            </label>
                            <input type="file" accept="application/pdf" className="text-xs w-full text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[9px] file:bg-[#302464] file:text-white file:font-bold hover:file:bg-[#7C69AF]"
                                onChange={e => setForm({...form, arquivo_1: e.target.files[0]})} 
                            />
                        </div>
                        <div className="bg-slate-50 p-3 rounded-2xl">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                                <Paperclip size={10} className="inline mr-1"/> Anexo 2 (PDF)
                            </label>
                            <input type="file" accept="application/pdf" className="text-xs w-full text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[9px] file:bg-[#302464] file:text-white file:font-bold hover:file:bg-[#7C69AF]"
                                onChange={e => setForm({...form, arquivo_2: e.target.files[0]})} 
                            />
                        </div>
                    </div>

                    <button type="submit" className="w-full py-5 bg-gradient-to-r from-[#302464] to-[#7C69AF] text-white rounded-3xl font-black shadow-xl shadow-purple-900/20 active:scale-95 transition-all mt-4">Confirmar Lançamento</button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}