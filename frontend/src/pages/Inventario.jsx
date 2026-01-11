import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom'; // IMPORTAÇÃO ESSENCIAL
import { 
  Package, Plus, Search, Truck, ArrowUpCircle, ArrowDownCircle, 
  DollarSign, Edit, Trash2, X, User, Paperclip, FileText, ChevronRight, AlertTriangle, Filter, Building2
} from 'lucide-react';
import estoqueService from '../services/estoqueService';
import clienteService from '../services/clienteService';

export default function Inventario() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('PRODUTOS');
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');

  const [produtos, setProdutos] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [historico, setHistorico] = useState([]);

  const [modalType, setModalType] = useState(null); 
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({});

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [p, f, cli, h] = await Promise.all([
        estoqueService.listarProdutos(),
        estoqueService.listarFornecedores(),
        clienteService.listar(),
        estoqueService.listarHistorico()
      ]);
      setProdutos(p);
      setFornecedores(f);
      setClientes(cli);
      setHistorico(h);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarDados(); }, []);

  const filteredData = useMemo(() => {
    const b = busca.toLowerCase();
    if (activeTab === 'PRODUTOS') return produtos.filter(p => p.nome.toLowerCase().includes(b));
    if (activeTab === 'FORNECEDORES') return fornecedores.filter(f => f.razao_social.toLowerCase().includes(b));
    
    // Ordena o histórico: Recentes primeiro
    return [...historico].sort((a, b) => new Date(b.data_movimento) - new Date(a.data_movimento));
  }, [busca, activeTab, produtos, fornecedores, historico]);  

  const openModal = (type, data = null) => {
    setModalType(type);
    if (type === 'PRODUTO') {
      setEditId(data?.id || null);
      setFormData(data || { nome: '', categoria: 'HARDWARE', estoque_minimo: 2, preco_venda_sugerido: '' });
    } else if (type === 'MOVIMENTO') {
      setFormData({ tipo_movimento: 'ENTRADA', produto: '', quantidade: 1, preco_unitario: '', fornecedor: '', cliente: '', numero_serial: '', arquivo: null });
    } else if (type === 'FORNECEDOR') {
      setFormData({ razao_social: '', telefone: '' });
    }
  };

  const handleSalvarProduto = async (e) => {
    e.preventDefault();
    try {
      if (editId) await estoqueService.atualizarProduto(editId, formData);
      else await estoqueService.criarProduto(formData);
      setModalType(null);
      carregarDados();
    } catch (error) { alert("Erro ao salvar produto."); }
  };

  const handleSalvarMovimento = async (e) => {
    e.preventDefault();
    
    // Validação de segurança para Saída (Exige Cliente)
    if (formData.tipo_movimento === 'SAIDA' && !formData.cliente) {
        return alert("Erro: Selecione o cliente que está recebendo este produto.");
    }

    const data = new FormData();
    Object.keys(formData).forEach(key => {
        if (formData[key]) data.append(key, formData[key]);
    });

    try {
      await estoqueService.registrarMovimento(data);
      setModalType(null);
      carregarDados();
      alert("Lançamento realizado com sucesso!");
    } catch (err) { 
        console.error(err);
        alert("Falha no registro. Verifique se há saldo suficiente para esta saída."); 
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      {/* HEADER COMPACTO */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Estoque</h1>
          <p className="text-slate-500 text-sm font-medium">Controle de ativos e suprimentos.</p>
        </div>
        <button 
          onClick={() => openModal('MOVIMENTO')}
          className="bg-slate-900 hover:bg-orange-500 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-lg transition-all active:scale-95 text-sm"
        >
          <ArrowUpCircle size={18} /> Lançar Movimento
        </button>
      </div>

      {/* TABS E BUSCA */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <div className="flex p-1 bg-slate-200/50 rounded-xl w-full md:w-auto">
          {['PRODUTOS', 'HISTORICO', 'FORNECEDORES'].map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setBusca(''); }}
              className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {tab}
            </button>
          ))}
        </div>
        
        <div className="relative w-full md:w-64 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" placeholder="Pesquisar..." value={busca} onChange={e => setBusca(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-orange-500/5 text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-300 font-bold uppercase tracking-widest text-[10px] animate-pulse">Sincronizando...</div>
      ) : (
        <>
          {activeTab === 'PRODUTOS' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              <div onClick={() => openModal('PRODUTO')} className="border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-6 hover:border-orange-500 hover:bg-orange-50/30 cursor-pointer transition-all group min-h-[150px]">
                <Plus className="text-slate-300 group-hover:text-orange-500" size={24} />
                <span className="mt-2 font-black text-slate-400 group-hover:text-orange-600 uppercase tracking-widest text-[9px]">Novo Item</span>
              </div>

              {filteredData.map(prod => (
                <div key={prod.id} className="group bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all relative">
                  <div className="flex justify-between items-start mb-3">
                    <div className={`p-2.5 rounded-xl ${prod.estoque_atual <= prod.estoque_minimo ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-600'}`}>
                      <Package size={20} />
                    </div>
                    <div className="text-right">
                      <span className={`text-xl font-black ${prod.estoque_atual <= prod.estoque_minimo ? 'text-red-500' : 'text-slate-900'}`}>{prod.estoque_atual}</span>
                      <p className="text-[8px] font-black text-slate-300 uppercase tracking-tighter">Saldo</p>
                    </div>
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm leading-tight line-clamp-2 h-10">{prod.nome}</h3>
                  <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
                    <span className="text-[9px] font-bold text-slate-400 uppercase bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{prod.categoria}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); openModal('PRODUTO', prod); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={14} /></button>
                      <button onClick={(e) => { e.stopPropagation(); if(window.confirm("Excluir?")) estoqueService.excluirProduto(prod.id).then(carregarDados)}} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'HISTORICO' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-2 duration-300">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 font-black text-slate-400 uppercase tracking-widest">
                  <tr>
                    <th className="p-4 text-center">Tipo</th>
                    <th className="p-4">Produto</th>
                    <th className="p-4">Origem/Destino</th>
                    <th className="p-4 text-center">Qtd</th>
                    <th className="p-4 text-center">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredData.map(hist => (
                    <tr key={hist.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${hist.tipo_movimento === 'ENTRADA' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                          {hist.tipo_movimento}
                        </span>
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-slate-700">{hist.nome_produto}</p>
                        <p className="text-[9px] text-slate-400">{hist.numero_serial || 'Sem Serial'}</p>
                      </td>
                      <td className="p-4 text-slate-500 font-medium italic">
                        {hist.nome_cliente || hist.nome_fornecedor || 'Interno / Reposição'}
                      </td>
                      <td className="p-4 text-center font-black text-slate-700">{hist.quantidade}</td>
                      <td className="p-4 text-center text-slate-400 font-mono text-[10px]">
                        {new Date(hist.data_movimento).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'FORNECEDORES' && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div onClick={() => openModal('FORNECEDOR')} className="border-2 border-dashed border-slate-200 rounded-2xl p-4 flex items-center justify-center hover:border-orange-500 cursor-pointer text-slate-400 font-bold text-xs uppercase tracking-widest gap-2 transition-all">
                   <Plus size={16}/> Novo Fornecedor
                </div>
                {filteredData.map(forn => (
                    <div 
                        key={forn.id} 
                        onClick={() => navigate(`/fornecedores/${forn.id}`)}
                        className="group bg-white p-5 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden"
                    >
                        <div className="relative z-10">
                            <h3 className="font-black text-slate-800 text-sm group-hover:text-orange-500 transition-colors">{forn.razao_social}</h3>
                            <p className="text-[10px] text-slate-500 mt-1 font-bold flex items-center gap-1">
                                <Truck size={12} className="text-orange-400"/> {forn.telefone || forn.contato_nome || 'Sem contato'}
                            </p>
                        </div>
                        <ChevronRight className="text-slate-200 group-hover:text-orange-500 transition-all" size={20} />
                        <Truck className="absolute -right-2 -bottom-2 text-slate-50 opacity-0 group-hover:opacity-100 transition-opacity" size={60} />
                    </div>
                ))}
            </div>
          )}
        </>
      )}

      {/* MODAL LANÇAMENTO (CORRIGIDO) */}
      {modalType === 'MOVIMENTO' && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg p-8 relative">
                <button onClick={() => setModalType(null)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600"><X size={24}/></button>
                <h3 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-3">
                  {formData.tipo_movimento === 'ENTRADA' ? <ArrowDownCircle className="text-emerald-500"/> : <ArrowUpCircle className="text-red-500"/>}
                  Movimentar Estoque
                </h3>

                <div className="flex p-1 bg-slate-100 rounded-2xl mb-8 font-black text-[10px] uppercase tracking-widest">
                  <button onClick={() => setFormData({...formData, tipo_movimento: 'ENTRADA', cliente: '', fornecedor: ''})} className={`flex-1 py-3 rounded-xl transition-all ${formData.tipo_movimento === 'ENTRADA' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Entrada</button>
                  <button onClick={() => setFormData({...formData, tipo_movimento: 'SAIDA', cliente: '', fornecedor: ''})} className={`flex-1 py-3 rounded-xl transition-all ${formData.tipo_movimento === 'SAIDA' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400'}`}>Saída (Venda)</button>
                </div>

                <form onSubmit={handleSalvarMovimento} className="space-y-5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Produto</label>
                    <select required className="w-full bg-slate-50 p-4 rounded-2xl border-none font-bold text-slate-700 outline-none focus:ring-4 focus:ring-orange-500/5"
                      value={formData.produto} onChange={e => setFormData({...formData, produto: e.target.value})}>
                      <option value="">Selecione um item...</option>
                      {produtos.map(p => <option key={p.id} value={p.id}>{p.nome} (Saldo: {p.estoque_atual})</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantidade</label>
                      <input type="number" required min="1" className="w-full bg-slate-50 p-4 rounded-2xl border-none outline-none font-bold" 
                        value={formData.quantidade} onChange={e => setFormData({...formData, quantidade: e.target.value})}/>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{formData.tipo_movimento === 'ENTRADA' ? 'Custo (R$)' : 'Venda (R$)'}</label>
                      <input type="number" step="0.01" required className="w-full bg-slate-50 p-4 rounded-2xl border-none outline-none font-bold"
                        value={formData.preco_unitario} onChange={e => setFormData({...formData, preco_unitario: e.target.value})}/>
                    </div>
                  </div>

                  {formData.tipo_movimento === 'ENTRADA' ? (
                    <div className="animate-in slide-in-from-left-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fornecedor Origem</label>
                        <select className="w-full bg-slate-50 p-4 rounded-2xl border-none font-bold text-slate-700" value={formData.fornecedor} onChange={e => setFormData({...formData, fornecedor: e.target.value})}>
                          <option value="">Selecione o fornecedor...</option>
                          {fornecedores.map(f => <option key={f.id} value={f.id}>{f.razao_social}</option>)}
                        </select>
                    </div>
                  ) : (
                    <div className="animate-in slide-in-from-right-2">
                        <label className="text-[10px] font-black text-orange-600 uppercase tracking-widest ml-1 flex items-center gap-1"><User size={10}/> Cliente Destino (Venda)</label>
                        <select required className="w-full bg-orange-50 p-4 rounded-2xl border-none font-bold text-orange-700 outline-none focus:ring-4 focus:ring-orange-200" value={formData.cliente} onChange={e => setFormData({...formData, cliente: e.target.value})}>
                          <option value="">Selecione o cliente...</option>
                          {clientes.map(c => <option key={c.id} value={c.id}>{c.razao_social}</option>)}
                        </select>
                    </div>
                  )}

                  <button type="submit" className={`w-full py-5 rounded-3xl font-black text-white shadow-xl transition-all active:scale-95 ${formData.tipo_movimento === 'ENTRADA' ? 'bg-emerald-500 shadow-emerald-500/20 hover:bg-emerald-600' : 'bg-red-500 shadow-red-500/20 hover:bg-red-600'}`}>
                    Confirmar Lançamento
                  </button>
                </form>
            </div>
        </div>
      )}

      {/* MODAL PRODUTO / FORNECEDOR */}
      {(modalType === 'PRODUTO' || modalType === 'FORNECEDOR') && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-8 relative">
                <button onClick={() => setModalType(null)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600"><X size={24}/></button>
                <h3 className="font-black text-slate-800 text-xl mb-6">
                    {modalType === 'PRODUTO' ? (editId ? 'Editar Item' : 'Novo Produto') : 'Novo Fornecedor'}
                </h3>
                
                <form onSubmit={modalType === 'PRODUTO' ? handleSalvarProduto : (e) => { e.preventDefault(); estoqueService.criarFornecedor(formData).then(carregarDados); setModalType(null); }} className="space-y-4">
                    {modalType === 'PRODUTO' ? (
                      <>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome</label>
                            <input required className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl outline-none focus:ring-4 focus:ring-orange-500/5 font-bold" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Estoque Mín.</label>
                              <input type="number" className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl outline-none" value={formData.estoque_minimo} onChange={e => setFormData({...formData, estoque_minimo: e.target.value})} />
                          </div>
                          <div>
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Preço Sugerido</label>
                              <input type="number" step="0.01" className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl outline-none font-bold text-emerald-600" value={formData.preco_venda_sugerido} onChange={e => setFormData({...formData, preco_venda_sugerido: e.target.value})} />
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Razão Social</label>
                            <input required className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl outline-none font-bold text-slate-700" value={formData.razao_social} onChange={e => setFormData({...formData, razao_social: e.target.value})} />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefone</label>
                            <input className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl outline-none font-bold" value={formData.telefone} onChange={e => setFormData({...formData, telefone: e.target.value})} placeholder="(00) 00000-0000" />
                        </div>
                      </>
                    )}
                    <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-orange-500 transition-all active:scale-95 shadow-xl mt-4">
                        Confirmar Cadastro
                    </button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}