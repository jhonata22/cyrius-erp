import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, ArrowUpCircle, ArrowDownCircle, DollarSign, 
  AlertTriangle, Building2, TrendingUp, RefreshCw, Filter, 
  Calendar, CheckCircle, Package, X, ChevronRight, Lock, Check
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';

import financeiroService from '../services/financeiroService';
import clienteService from '../services/clienteService';

export default function Financeiro() {
  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const [lancamentos, setLancamentos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gerandoFaturas, setGerandoFaturas] = useState(false);

  const [kpis, setKpis] = useState({
    receitaTotal: 0, despesaTotal: 0, saldo: 0, 
    inadimplencia: 0, vendasHardware: 0, contratosAtivos: 0
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
        financeiroService.estatisticasGerais()
      ]);
      setLancamentos(dadosFin);
      setClientes(dadosCli);
      setKpis(stats);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarDados(); }, []);

  const handleConfirmarPagamento = async (lancamento) => {
    if (!window.confirm(`Confirmar recebimento de R$ ${parseFloat(lancamento.valor).toFixed(2)}?`)) return;
    try {
      await financeiroService.atualizar(lancamento.id, {
        status: 'PAGO',
        data_pagamento: new Date().toISOString().split('T')[0],
        cliente: lancamento.cliente
      });
      carregarDados();
    } catch (error) {
      alert("Erro ao confirmar pagamento.");
    }
  };

  const handleGerarFaturas = async () => {
    if (!window.confirm("Gerar mensalidades para todos os contratos ativos?")) return;
    setGerandoFaturas(true);
    try {
      const res = await financeiroService.gerarFaturasMensais();
      alert(`Sucesso! ${res.faturas_geradas} faturas geradas.`);
      carregarDados();
    } catch (error) {
      alert("Erro no processamento.");
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
    } catch (error) { alert("Erro ao salvar lançamento."); }
  };

  const dadosGrafico = [
    { name: 'Contratos', valor: kpis.receitaTotal - kpis.vendasHardware, color: '#7C69AF' },
    { name: 'Hardware', valor: kpis.vendasHardware, color: '#A696D1' },
    { name: 'Despesas', valor: kpis.despesaTotal, color: '#302464' },
  ];

  if (loading) return <div className="p-20 text-center font-black text-[#7C69AF] animate-pulse uppercase tracking-widest text-xs">Sincronizando Financeiro...</div>;

  return (
    <div className="animate-in fade-in duration-500">
      
      {/* HEADER COMPACTO */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Financeiro</h1>
          <div className="h-1.5 w-12 bg-[#7C69AF] mt-2 rounded-full"></div>
        </div>
        
        <div className="flex flex-wrap gap-3">
           <button 
            onClick={handleGerarFaturas}
            disabled={gerandoFaturas}
            className="bg-white border-2 border-[#302464] text-[#302464] px-6 py-2.5 rounded-2xl flex items-center gap-2 font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            {gerandoFaturas ? <RefreshCw className="animate-spin" size={16}/> : <RefreshCw size={16}/>}
            Mensalidades
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-[#302464] hover:bg-[#7C69AF] text-white px-6 py-2.5 rounded-2xl flex items-center gap-2 font-black text-xs uppercase tracking-widest shadow-xl shadow-purple-900/20 transition-all active:scale-95"
          >
            <Plus size={18} /> Novo Lançamento
          </button>
        </div>
      </div>

      {/* TABS SEGMENTED CONTROL */}
      <div className="flex p-1.5 bg-slate-200/50 rounded-2xl mb-8 w-full md:w-fit">
          <button onClick={() => setActiveTab('DASHBOARD')} className={`px-8 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'DASHBOARD' ? 'bg-white text-[#302464] shadow-sm' : 'text-slate-500'}`}>
              Dashboard
          </button>
          <button onClick={() => setActiveTab('LISTA')} className={`px-8 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'LISTA' ? 'bg-white text-[#302464] shadow-sm' : 'text-slate-500'}`}>
              Extrato
          </button>
      </div>

      {activeTab === 'DASHBOARD' && (
        <div className="space-y-8">
            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Saldo Disponível</p>
                    <div className="flex items-end justify-between">
                        <h3 className={`text-2xl font-black ${kpis.saldo >= 0 ? 'text-slate-800' : 'text-red-500'}`}>
                            R$ {kpis.saldo.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                        </h3>
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><DollarSign size={20}/></div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Vendas Peças</p>
                    <div className="flex items-end justify-between">
                        <h3 className="text-2xl font-black text-[#7C69AF]">
                            R$ {kpis.vendasHardware.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                        </h3>
                        <div className="p-2 bg-purple-50 text-[#7C69AF] rounded-xl"><Package size={20}/></div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm border-t-4 border-t-red-500">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Inadimplência</p>
                    <div className="flex items-end justify-between">
                        <h3 className="text-2xl font-black text-red-500">
                            R$ {kpis.inadimplencia.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                        </h3>
                        <div className="p-2 bg-red-50 text-red-500 rounded-xl"><AlertTriangle size={20}/></div>
                    </div>
                </div>

                <div className="bg-[#302464] p-6 rounded-[2rem] shadow-xl shadow-purple-900/20">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-3">Contratos Ativos</p>
                    <div className="flex items-end justify-between">
                        <h3 className="text-2xl font-black text-white">{kpis.contratosAtivos}</h3>
                        <div className="p-2 bg-white/10 text-[#A696D1] rounded-xl"><Building2 size={20}/></div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* GRÁFICO */}
                <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-8">Performance por Categoria</h3>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dadosGrafico} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11, fontWeight: 800, fill: '#64748b'}} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                <Bar dataKey="valor" radius={[0, 8, 8, 0]} barSize={35}>
                                    {dadosGrafico.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* PENDÊNCIAS URGENTES */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-6 flex items-center gap-2">
                        <AlertTriangle size={20} className="text-red-500"/> Urgente
                    </h3>
                    <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 no-scrollbar">
                        {lancamentos
                            .filter(l => l.status === 'PENDENTE' && new Date(l.data_vencimento) < new Date())
                            .map(l => (
                                <div key={l.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:bg-red-50 hover:border-red-100 transition-all">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <p className="font-black text-slate-800 text-sm line-clamp-1">{l.descricao}</p>
                                            <p className="text-[9px] text-[#7C69AF] font-black uppercase mt-1">{l.nome_cliente || 'Despesa Geral'}</p>
                                        </div>
                                        <span className="font-black text-red-500 text-sm">R${parseFloat(l.valor).toFixed(0)}</span>
                                    </div>
                                    <button 
                                        onClick={() => handleConfirmarPagamento(l)}
                                        className="w-full mt-3 py-2 bg-white text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-emerald-600 border border-slate-200 rounded-xl transition-all flex items-center justify-center gap-2"
                                    >
                                        <Check size={12}/> Dar Baixa
                                    </button>
                                </div>
                            ))
                        }
                    </div>
                </div>
            </div>
        </div>
      )}

      {activeTab === 'LISTA' && (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden animate-in slide-in-from-bottom-2">
             <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Lançamento / Cliente</th>
                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Categoria</th>
                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Vencimento</th>
                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {lancamentos.map(lanc => (
                        <tr key={lanc.id} className="group hover:bg-slate-50/50 transition-colors">
                            <td className="p-6">
                                <div className="font-black text-slate-800">{lanc.descricao}</div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-1 font-bold uppercase">
                                  <Building2 size={10}/> {lanc.nome_cliente || 'Geral'}
                                </div>
                            </td>
                            <td className="p-6 text-center">
                                <span className="text-[9px] font-black bg-slate-100 px-2.5 py-1 rounded-lg text-slate-500 uppercase border border-slate-200">
                                    {lanc.categoria}
                                </span>
                            </td>
                            <td className="p-6 text-center text-xs font-bold text-slate-500">{new Date(lanc.data_vencimento).toLocaleDateString()}</td>
                            <td className="p-6 text-center">
                                <span className={`text-[9px] font-black px-3 py-1 rounded-lg uppercase tracking-widest border
                                    ${lanc.status === 'PAGO' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                      lanc.status === 'PENDENTE' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                    {lanc.status}
                                </span>
                            </td>
                            <td className="p-6 text-right">
                                <div className={`font-black text-lg ${lanc.tipo_lancamento === 'ENTRADA' ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {lanc.tipo_lancamento === 'SAIDA' && '- '}
                                    R$ {parseFloat(lanc.valor).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                </div>
                                {lanc.status === 'PENDENTE' && (
                                  <button onClick={() => handleConfirmarPagamento(lanc)} className="text-[9px] font-black text-[#7C69AF] uppercase tracking-widest hover:underline mt-1">
                                    Confirmar Recebimento
                                  </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
             </table>
        </div>
      )}

      {/* MODAL NOVO LANÇAMENTO (ESTILO CYRIUS) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#302464]/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-8 relative border border-white/20">
                <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 text-slate-400 hover:text-[#302464]"><X size={24}/></button>
                <h3 className="font-black text-[#302464] text-xl mb-6 uppercase tracking-widest text-center">Novo Lançamento Manual</h3>
                <form onSubmit={handleSalvar} className="space-y-5">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição</label>
                        <input required className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl font-bold text-[#302464] outline-none focus:ring-4 focus:ring-purple-500/5" value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor (R$)</label>
                            <input required type="number" step="0.01" className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl font-bold text-[#302464] outline-none" value={form.valor} onChange={e => setForm({...form, valor: e.target.value})} />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Operação</label>
                            <select className="w-full px-4 py-3.5 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 outline-none" value={form.tipo_lancamento} onChange={e => setForm({...form, tipo_lancamento: e.target.value})}>
                                <option value="ENTRADA">Receita (+)</option>
                                <option value="SAIDA">Despesa (-)</option>
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
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data Vencimento</label>
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

                    <button type="submit" className="w-full py-5 bg-gradient-to-r from-[#302464] to-[#7C69AF] text-white rounded-3xl font-black shadow-xl shadow-purple-900/20 active:scale-95 transition-all mt-4">
                        Confirmar Lançamento
                    </button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}