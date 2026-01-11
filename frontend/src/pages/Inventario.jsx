import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
    return [...historico].sort((a, b) => new Date(b.data_movimento) - new Date(a.data_movimento));
  }, [busca, activeTab, produtos, fornecedores, historico]);  

  const openModal = (type, data = null) => {
    setModalType(type);
    if (type === 'PRODUTO') {
      setEditId(data?.id || null);
      setFormData(data || { nome: '', categoria: 'HARDWARE', estoque_minimo: 2, preco_venda_sugerido: '' });
    } else if (type === 'MOVIMENTO') {
      // Inicia com valores padrão para evitar erro de uncontrolled component
      setFormData({ 
          tipo_movimento: 'ENTRADA', 
          produto: '', 
          quantidade: 1, 
          preco_unitario: '', 
          fornecedor: '', 
          cliente: '', 
          numero_serial: '', 
          arquivo: null 
      });
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
    
    // VALIDAÇÃO FINANCEIRA
    if (!formData.preco_unitario || parseFloat(formData.preco_unitario) <= 0) {
        if(!window.confirm("O valor unitário está zerado. Isso não gerará lançamento no financeiro. Deseja continuar?")) return;
    }

    // VALIDAÇÃO DE VÍNCULO
    if (formData.tipo_movimento === 'SAIDA' && !formData.cliente) {
        return alert("Erro: Selecione o CLIENTE para gerar o financeiro da venda.");
    }
    if (formData.tipo_movimento === 'ENTRADA' && !formData.fornecedor) {
        // Apenas aviso, pois pode ser ajuste de estoque sem fornecedor
        if(!window.confirm("Sem fornecedor selecionado. O financeiro de compra não será gerado detalhadamente. Continuar?")) return;
    }

    const data = new FormData();
    // Garante que todos os campos vão para o FormData
    data.append('produto', formData.produto);
    data.append('tipo_movimento', formData.tipo_movimento);
    data.append('quantidade', formData.quantidade);
    data.append('preco_unitario', formData.preco_unitario);
    if (formData.cliente) data.append('cliente', formData.cliente);
    if (formData.fornecedor) data.append('fornecedor', formData.fornecedor);
    if (formData.numero_serial) data.append('numero_serial', formData.numero_serial);
    if (formData.arquivo) data.append('arquivo', formData.arquivo);

    try {
      await estoqueService.registrarMovimento(data);
      setModalType(null);
      carregarDados();
      alert("Movimentação registrada e Financeiro atualizado!");
    } catch (err) { 
        console.error(err);
        alert(err.response?.data?.detail || "Erro ao registrar movimentação."); 
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
        <div><h1 className="text-3xl font-black text-slate-800 tracking-tight">Estoque</h1><div className="h-1 w-12 bg-[#7C69AF] mt-2 rounded-full"></div></div>
        <button onClick={() => openModal('MOVIMENTO')} className="bg-[#302464] hover:bg-[#7C69AF] text-white px-6 py-2.5 rounded-2xl flex items-center gap-2 font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95"><ArrowUpCircle size={18} /> Movimentar</button>
      </div>

      {/* TABS */}
      <div className="flex p-1.5 bg-slate-200/50 rounded-2xl mb-8 w-full md:w-fit">
          {['PRODUTOS', 'HISTORICO', 'FORNECEDORES'].map(tab => (
            <button key={tab} onClick={() => { setActiveTab(tab); setBusca(''); }} className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === tab ? 'bg-white text-[#302464] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{tab}</button>
          ))}
      </div>
      
      {/* BUSCA */}
      <div className="relative mb-8 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#7C69AF] transition-colors" size={20} />
          <input type="text" placeholder="Pesquisar..." value={busca} onChange={e => setBusca(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-purple-500/5 transition-all text-sm" />
      </div>

      {loading ? <div className="py-20 text-center text-[#7C69AF] font-black uppercase tracking-widest text-[10px] animate-pulse">Sincronizando Estoque...</div> : (
        <>
          {activeTab === 'PRODUTOS' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              <div onClick={() => openModal('PRODUTO')} className="border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center p-6 hover:border-[#7C69AF] hover:bg-purple-50/30 cursor-pointer transition-all group min-h-[160px]">
                <Plus className="text-slate-300 group-hover:text-[#7C69AF]" size={32} />
                <span className="mt-2 font-black text-slate-400 group-hover:text-[#302464] uppercase tracking-widest text-[9px]">Novo Item</span>
              </div>
              {filteredData.map(prod => (
                <div key={prod.id} className="group bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all relative overflow-hidden">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-2xl ${prod.estoque_atual <= prod.estoque_minimo ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-[#302464]'}`}><Package size={24} /></div>
                    <div className="text-right"><span className={`text-2xl font-black ${prod.estoque_atual <= prod.estoque_minimo ? 'text-red-500' : 'text-slate-900'}`}>{prod.estoque_atual}</span><p className="text-[8px] font-black text-slate-300 uppercase tracking-tighter">Saldo</p></div>
                  </div>
                  <h3 className="font-black text-slate-800 text-sm leading-tight line-clamp-2 h-10">{prod.nome}</h3>
                  <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">{prod.categoria}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); openModal('PRODUTO', prod); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl"><Edit size={14} /></button>
                      <button onClick={(e) => { e.stopPropagation(); if(window.confirm("Excluir?")) estoqueService.excluirProduto(prod.id).then(carregarDados)}} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'HISTORICO' && (
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden animate-in slide-in-from-bottom-2">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 font-black text-slate-400 uppercase tracking-widest">
                  <tr><th className="p-6 text-center">Tipo</th><th className="p-6">Produto</th><th className="p-6">Origem/Destino</th><th className="p-6 text-center">Qtd</th><th className="p-6 text-center">Data</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredData.map(hist => (
                    <tr key={hist.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-6 text-center"><span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${hist.tipo_movimento === 'ENTRADA' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>{hist.tipo_movimento}</span></td>
                      <td className="p-6"><p className="font-bold text-slate-700">{hist.nome_produto}</p><p className="text-[9px] font-mono text-slate-400">{hist.numero_serial || 'S/N'}</p></td>
                      <td className="p-6 text-slate-500 font-bold">{hist.nome_cliente || hist.nome_fornecedor || 'Interno'}</td>
                      <td className="p-6 text-center font-black text-slate-700">{hist.quantidade}</td>
                      <td className="p-6 text-center text-slate-400 font-mono text-[10px]">{new Date(hist.data_movimento).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'FORNECEDORES' && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div onClick={() => openModal('FORNECEDOR')} className="border-2 border-dashed border-slate-200 rounded-[2rem] p-6 flex items-center justify-center hover:border-[#7C69AF] cursor-pointer text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] gap-2 transition-all">
                   <Plus size={20}/> Novo Fornecedor
                </div>
                {filteredData.map(forn => (
                    <div key={forn.id} onClick={() => navigate(`/fornecedores/${forn.id}`)} className="group bg-white p-6 rounded-[2rem] border border-slate-100 flex items-center justify-between shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer relative">
                        <div className="relative z-10">
                            <h3 className="font-black text-slate-800 text-sm group-hover:text-[#7C69AF] transition-colors">{forn.razao_social}</h3>
                            <p className="text-[10px] text-slate-500 mt-1 font-bold flex items-center gap-1"><Truck size={12} className="text-[#A696D1]"/> {forn.telefone || 'Sem contato'}</p>
                        </div>
                        <ChevronRight className="text-slate-200 group-hover:text-[#7C69AF] transition-all" size={20} />
                    </div>
                ))}
            </div>
          )}
        </>
      )}

      {/* MODAL MOVIMENTAÇÃO */}
      {modalType === 'MOVIMENTO' && (
        <div className="fixed inset-0 bg-[#302464]/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg p-8 relative border border-white/20">
                <button onClick={() => setModalType(null)} className="absolute top-8 right-8 text-slate-400 hover:text-[#302464]"><X size={24}/></button>
                <h3 className="text-2xl font-black text-[#302464] mb-6 flex items-center gap-3">
                  {formData.tipo_movimento === 'ENTRADA' ? <ArrowDownCircle className="text-emerald-500"/> : <ArrowUpCircle className="text-red-500"/>}
                  Lançar Movimento
                </h3>

                <div className="flex p-1 bg-slate-100 rounded-2xl mb-8 font-black text-[10px] uppercase tracking-widest">
                  <button onClick={() => setFormData({...formData, tipo_movimento: 'ENTRADA', cliente: '', fornecedor: ''})} className={`flex-1 py-3 rounded-xl transition-all ${formData.tipo_movimento === 'ENTRADA' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Entrada</button>
                  <button onClick={() => setFormData({...formData, tipo_movimento: 'SAIDA', cliente: '', fornecedor: ''})} className={`flex-1 py-3 rounded-xl transition-all ${formData.tipo_movimento === 'SAIDA' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400'}`}>Saída (Venda)</button>
                </div>

                <form onSubmit={handleSalvarMovimento} className="space-y-5">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Produto</label>
                    <select required className="w-full bg-slate-50 p-4 rounded-2xl border-none font-bold text-slate-700 outline-none focus:ring-4 focus:ring-purple-500/5"
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
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{formData.tipo_movimento === 'ENTRADA' ? 'Custo Un.' : 'Venda Un.'}</label>
                      <input type="number" step="0.01" required className="w-full bg-slate-50 p-4 rounded-2xl border-none outline-none font-bold text-[#302464]"
                        value={formData.preco_unitario} onChange={e => setFormData({...formData, preco_unitario: e.target.value})}/>
                    </div>
                  </div>

                  {formData.tipo_movimento === 'ENTRADA' ? (
                    <div className="animate-in slide-in-from-left-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fornecedor Origem</label>
                        <select className="w-full bg-slate-50 p-4 rounded-2xl border-none font-bold text-slate-700 outline-none" value={formData.fornecedor} onChange={e => setFormData({...formData, fornecedor: e.target.value})}>
                          <option value="">Selecione o fornecedor...</option>
                          {fornecedores.map(f => <option key={f.id} value={f.id}>{f.razao_social}</option>)}
                        </select>
                    </div>
                  ) : (
                    <div className="animate-in slide-in-from-right-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cliente Destino (Venda)</label>
                        <select required className="w-full bg-orange-50 p-4 rounded-2xl border-none font-bold text-orange-700 outline-none focus:ring-4 focus:ring-orange-200" value={formData.cliente} onChange={e => setFormData({...formData, cliente: e.target.value})}>
                          <option value="">Selecione o cliente...</option>
                          {clientes.map(c => <option key={c.id} value={c.id}>{c.razao_social}</option>)}
                        </select>
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-50 flex justify-between items-center text-xs font-bold text-slate-500">
                      <span>Total Financeiro:</span>
                      <span className={formData.tipo_movimento === 'ENTRADA' ? 'text-red-500' : 'text-emerald-600'}>
                         R$ {((formData.quantidade || 0) * (formData.preco_unitario || 0)).toFixed(2)}
                      </span>
                  </div>

                  <button type="submit" className="w-full py-5 bg-gradient-to-r from-[#302464] to-[#7C69AF] text-white rounded-3xl font-black uppercase tracking-widest text-[10px] shadow-xl active:scale-95 transition-all mt-4">
                    Confirmar Lançamento
                  </button>
                </form>
            </div>
        </div>
      )}

      {/* MODAL PRODUTO / FORNECEDOR (MANTIDO IGUAL) */}
      {(modalType === 'PRODUTO' || modalType === 'FORNECEDOR') && (
        <div className="fixed inset-0 bg-[#302464]/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-8 relative">
                <button onClick={() => setModalType(null)} className="absolute top-6 right-6 text-slate-400 hover:text-[#302464]"><X size={24}/></button>
                <h3 className="font-black text-[#302464] text-xl mb-6">
                    {modalType === 'PRODUTO' ? (editId ? 'Editar Produto' : 'Novo Produto') : 'Novo Fornecedor'}
                </h3>
                
                <form onSubmit={modalType === 'PRODUTO' ? handleSalvarProduto : (e) => { e.preventDefault(); estoqueService.criarFornecedor(formData).then(carregarDados); setModalType(null); }} className="space-y-4">
                    {/* ... (INPUTS DO PRODUTO E FORNECEDOR - MANTIDOS PARA ECONOMIZAR ESPAÇO NA RESPOSTA) ... */}
                    {/* ... (COPIAR DO ARQUIVO ANTERIOR OS INPUTS DE PRODUTO/FORNECEDOR) ... */}
                    {modalType === 'PRODUTO' ? (
                      <>
                        <input required placeholder="Nome do Item" className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl font-bold" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} />
                        <div className="grid grid-cols-2 gap-4">
                          <input type="number" placeholder="Estoque Min." className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl font-bold" value={formData.estoque_minimo} onChange={e => setFormData({...formData, estoque_minimo: e.target.value})} />
                          <input type="number" step="0.01" placeholder="Preço Venda" className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl font-bold text-emerald-600" value={formData.preco_venda_sugerido} onChange={e => setFormData({...formData, preco_venda_sugerido: e.target.value})} />
                        </div>
                      </>
                    ) : (
                      <>
                        <input required placeholder="Razão Social" className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl font-bold" value={formData.razao_social} onChange={e => setFormData({...formData, razao_social: e.target.value})} />
                        <input placeholder="Telefone" className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl font-bold" value={formData.telefone} onChange={e => setFormData({...formData, telefone: e.target.value})} />
                      </>
                    )}
                    <button type="submit" className="w-full py-5 bg-[#302464] text-white rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-xl mt-4">Confirmar</button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}