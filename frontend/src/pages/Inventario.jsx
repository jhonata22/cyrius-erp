import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, Plus, Search, Truck, ArrowUpCircle, ArrowDownCircle, 
  Edit, Trash2, X, Paperclip, ChevronRight, Building2, AlertTriangle
} from 'lucide-react';
import estoqueService from '../services/estoqueService';
import clienteService from '../services/clienteService';

// 1. IMPORTAR O HOOK
import { useEmpresas } from '../hooks/useEmpresas';

export default function Inventario() {
  const navigate = useNavigate();
  
  // 2. CONFIGURAR HOOK DE EMPRESAS
  const { empresas } = useEmpresas();
  const [filtroEmpresa, setFiltroEmpresa] = useState('');

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

  // 3. CARREGAMENTO COM FILTRO
  const carregarDados = useCallback(async () => {
    try {
      setLoading(true);
      const empresaId = filtroEmpresa || null;

      // Note que passamos o empresaId para filtrar Fornecedores e Histórico
      const [p, f, cli, h] = await Promise.all([
        estoqueService.listarProdutos(), // Produtos são globais (catálogo)
        estoqueService.listarFornecedores(empresaId), // Fornecedores filtrados
        clienteService.listar(), // Clientes geralmente globais
        estoqueService.listarHistorico(empresaId) // Histórico filtrado
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
  }, [filtroEmpresa]);

  useEffect(() => { carregarDados(); }, [carregarDados]);

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
      setFormData({ 
          tipo_movimento: 'ENTRADA', 
          produto: '', 
          quantidade: 1, 
          preco_unitario: '', 
          fornecedor: '', 
          numero_serial: '', 
          arquivo_1: null, 
          arquivo_2: null
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

  const handleSalvarFornecedor = async (e) => {
      e.preventDefault();
      try {
          // Vincula à empresa se estiver selecionada
          const payload = { ...formData };
          if (filtroEmpresa) payload.empresa = filtroEmpresa;

          await estoqueService.criarFornecedor(payload);
          carregarDados();
          setModalType(null);
      } catch (error) {
          alert("Erro ao salvar fornecedor.");
      }
  };

  const handleSalvarMovimento = async (e) => {
    e.preventDefault();
    
    // VALIDAÇÃO FINANCEIRA
    if (!formData.preco_unitario || parseFloat(formData.preco_unitario) <= 0) {
        if(!window.confirm("O valor unitário está zerado. Isso não gerará lançamento no financeiro. Deseja continuar?")) return;
    }

    // VALIDAÇÃO DE VÍNCULO
    if (formData.tipo_movimento === 'ENTRADA' && !formData.fornecedor) {
        if(!window.confirm("Sem fornecedor selecionado. O financeiro de compra não será gerado detalhadamente. Continuar?")) return;
    }

    const data = new FormData();
    data.append('produto', formData.produto);
    data.append('tipo_movimento', formData.tipo_movimento);
    data.append('quantidade', formData.quantidade);
    data.append('preco_unitario', formData.preco_unitario);
    if (formData.fornecedor) data.append('fornecedor', formData.fornecedor);
    if (formData.numero_serial) data.append('numero_serial', formData.numero_serial);
    
    // 4. VÍNCULO DA MOVIMENTAÇÃO COM A EMPRESA
    // Se tiver filtro selecionado, usa ele. Se não, o backend provavelmente usará a empresa do usuário ou ficará null (global)
    if (filtroEmpresa) {
        data.append('empresa', filtroEmpresa);
    } else {
        // Se a regra de negócio exigir empresa, você pode bloquear aqui:
        // return alert("Selecione uma empresa no filtro superior antes de movimentar o estoque.");
    }

    // ANEXOS
    if (formData.arquivo_1) data.append('arquivo_1', formData.arquivo_1);
    if (formData.arquivo_2) data.append('arquivo_2', formData.arquivo_2);
    
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

  const empresaSelecionadaObj = empresas.find(e => String(e.id) === String(filtroEmpresa));

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Estoque</h1>
            <div className="h-1 w-12 bg-[#7C69AF] mt-2 rounded-full"></div>

            {/* SELETOR DE EMPRESA */}
            <div className="mt-4 flex items-center gap-2 bg-white p-1 pr-4 rounded-xl border border-slate-200 w-fit shadow-sm">
                 <div className="bg-slate-100 p-2 rounded-lg text-slate-500">
                    <Building2 size={16} />
                 </div>
                 <select 
                    value={filtroEmpresa}
                    onChange={(e) => setFiltroEmpresa(e.target.value)}
                    className="bg-transparent font-bold text-slate-700 text-sm outline-none cursor-pointer min-w-[200px]"
                 >
                    <option value="">🏢 Estoque Geral (Todas)</option>
                    <option disabled>──────────</option>
                    {empresas.map(emp => (
                        <option key={emp.id} value={emp.id}>
                            {emp.nome_fantasia}
                        </option>
                    ))}
                 </select>
            </div>
        </div>

        <button onClick={() => openModal('MOVIMENTO')} className="bg-[#302464] hover:bg-[#7C69AF] text-white px-6 py-2.5 rounded-2xl flex items-center gap-2 font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95"><ArrowUpCircle size={18} /> Movimentar</button>
      </div>

      {/* TABS */}
      <div className="flex p-1.5 bg-slate-200/50 rounded-2xl mb-8 w-full md:w-fit overflow-x-auto">
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
        {/* TAB PRODUTOS */}
        {activeTab === 'PRODUTOS' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            <div onClick={() => openModal('PRODUTO')} className="border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center p-6 hover:border-[#7C69AF] hover:bg-purple-50/30 cursor-pointer transition-all group min-h-[160px]">
              <Plus className="text-slate-300 group-hover:text-[#7C69AF]" size={32} />
              <span className="mt-2 font-black text-slate-400 group-hover:text-[#302464] uppercase tracking-widest text-[9px]">Novo Item</span>
            </div>
            {filteredData.map(prod => (
              <div key={prod.id} className="group bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all relative overflow-hidden">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-2xl ${prod.estoque_atual <= prod.estoque_minimo ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-[#302464]'}`}>
                    <Package size={24} />
                  </div>
                  <div className="text-right">
                    <span className={`text-2xl font-black ${prod.estoque_atual <= prod.estoque_minimo ? 'text-red-500' : 'text-slate-900'}`}>{prod.estoque_atual}</span>
                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-tighter">Saldo Global</p>
                  </div>
                </div>
                <h3 className="font-black text-slate-800 text-sm leading-tight line-clamp-2 h-10">{prod.nome}</h3>
                <div className="mt-2 flex items-center gap-1.5">
                    <p className="text-[12px] font-black text-slate-400 uppercase tracking-tighter">Preço sugerido:</p>
                    <p className="text-xs font-black text-emerald-600">{prod.preco_venda_sugerido ? `R$ ${parseFloat(prod.preco_venda_sugerido).toFixed(2)}` : 'R$ 0,00'}</p>
                </div>
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

        {/* TAB HISTÓRICO */}
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
                        <td className="p-6">
                            <p className="font-bold text-slate-700">{hist.nome_produto}</p>
                            <p className="text-[9px] font-mono text-slate-400">{hist.numero_serial || 'S/N'}</p>
                            
                            <div className="flex gap-2 mt-1">
                                {hist.arquivo_1 && <a href={hist.arquivo_1} target="_blank" rel="noopener noreferrer" className="text-[#302464] hover:scale-110 transition-transform bg-purple-50 px-1.5 py-0.5 rounded flex items-center gap-1 text-[8px] font-bold"><Paperclip size={8}/> Anexo 1</a>}
                                {hist.arquivo_2 && <a href={hist.arquivo_2} target="_blank" rel="noopener noreferrer" className="text-[#302464] hover:scale-110 transition-transform bg-purple-50 px-1.5 py-0.5 rounded flex items-center gap-1 text-[8px] font-bold"><Paperclip size={8}/> Anexo 2</a>}
                            </div>
                        </td>
                        <td className="p-6 text-slate-500 font-bold">{hist.nome_cliente || hist.nome_fornecedor || 'Interno'}</td>
                        <td className="p-6 text-center font-black text-slate-700">{hist.quantidade}</td>
                        <td className="p-6 text-center text-slate-400 font-mono text-[10px]">{new Date(hist.data_movimento).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {filteredData.length === 0 && (
                        <tr><td colSpan="5" className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Nenhum histórico encontrado para este filtro.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
        )}

        {/* TAB FORNECEDORES */}
        {activeTab === 'FORNECEDORES' && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div onClick={() => openModal('FORNECEDOR')} className="border-2 border-dashed border-slate-200 rounded-[2rem] p-6 flex items-center justify-center hover:border-[#7C69AF] cursor-pointer text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] gap-2 transition-all"><Plus size={20}/> Novo Fornecedor</div>
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
                
                {/* INFO DA EMPRESA */}
                {empresaSelecionadaObj ? (
                    <div className="mb-4 p-3 bg-purple-50 rounded-xl text-center border border-purple-100">
                        <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Estoque de:</p>
                        <p className="text-sm font-bold text-[#302464]">{empresaSelecionadaObj.nome_fantasia}</p>
                    </div>
                ) : (
                    <div className="mb-4 p-3 bg-yellow-50 rounded-xl text-center border border-yellow-100 flex flex-col items-center">
                        <AlertTriangle className="text-yellow-500 mb-1" size={20} />
                        <p className="text-[10px] font-black text-yellow-600 uppercase tracking-widest">Atenção</p>
                        <p className="text-xs font-bold text-yellow-700">Nenhuma empresa selecionada. O movimento será registrado sem vínculo específico?</p>
                    </div>
                )}

                <div className="flex p-1 bg-slate-100 rounded-2xl mb-8 font-black text-[10px] uppercase tracking-widest">
                  <button onClick={() => setFormData({...formData, tipo_movimento: 'ENTRADA', cliente: '', fornecedor: ''})} className={`flex-1 py-3 rounded-xl transition-all ${formData.tipo_movimento === 'ENTRADA' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Entrada</button>
                </div>

                <form onSubmit={handleSalvarMovimento} className="space-y-5">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Produto</label>
                    <select required className="w-full bg-slate-50 p-4 rounded-2xl border-none font-bold text-slate-700 outline-none focus:ring-4 focus:ring-purple-500/5"
                      value={formData.produto} onChange={e => setFormData({...formData, produto: e.target.value})}>
                      <option value="">Selecione um item...</option>
                      {produtos.map(p => <option key={p.id} value={p.id}>{p.nome} (Saldo Global: {p.estoque_atual})</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantidade</label>
                      <input type="number" required min="1" className="w-full bg-slate-50 p-4 rounded-2xl border-none outline-none font-bold" 
                        value={formData.quantidade} onChange={e => setFormData({...formData, quantidade: e.target.value})}/>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Custo Un.</label>
                      <input type="number" step="0.01" required className="w-full bg-slate-50 p-4 rounded-2xl border-none outline-none font-bold text-[#302464]"
                        value={formData.preco_unitario} onChange={e => setFormData({...formData, preco_unitario: e.target.value})}/>
                    </div>
                  </div>

                  <div className="animate-in slide-in-from-left-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fornecedor Origem</label>
                      <select className="w-full bg-slate-50 p-4 rounded-2xl border-none font-bold text-slate-700 outline-none" value={formData.fornecedor} onChange={e => setFormData({...formData, fornecedor: e.target.value})}>
                        <option value="">Selecione o fornecedor...</option>
                        {fornecedores.map(f => <option key={f.id} value={f.id}>{f.razao_social}</option>)}
                      </select>
                  </div>

                  {/* BLOCO DE ANEXOS */}
                  <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-3 rounded-2xl">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                              <Paperclip size={10} className="inline mr-1"/> Anexo 1 (PDF)
                          </label>
                          <input type="file" accept="application/pdf" className="text-xs w-full text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[9px] file:bg-[#302464] file:text-white file:font-bold hover:file:bg-[#7C69AF]"
                              onChange={e => setFormData({...formData, arquivo_1: e.target.files[0]})} 
                          />
                      </div>
                      <div className="bg-slate-50 p-3 rounded-2xl">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                              <Paperclip size={10} className="inline mr-1"/> Anexo 2 (PDF)
                          </label>
                          <input type="file" accept="application/pdf" className="text-xs w-full text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[9px] file:bg-[#302464] file:text-white file:font-bold hover:file:bg-[#7C69AF]"
                              onChange={e => setFormData({...formData, arquivo_2: e.target.files[0]})} 
                          />
                      </div>
                  </div>

                  <div className="pt-4 border-t border-slate-50 flex justify-between items-center text-xs font-bold text-slate-500">
                      <span>Total Financeiro:</span>
                      <div className="text-right">
                          <div className='text-red-500'>
                             R$ {((formData.quantidade || 0) * (formData.preco_unitario || 0)).toFixed(2)}
                          </div>
                      </div>
                  </div>

                  <button type="submit" className="w-full py-5 bg-gradient-to-r from-[#302464] to-[#7C69AF] text-white rounded-3xl font-black uppercase tracking-widest text-[10px] shadow-xl active:scale-95 transition-all mt-4">
                    Confirmar Lançamento
                  </button>
                </form>
            </div>
        </div>
      )}

      {/* MODAL PRODUTO / FORNECEDOR */}
      {(modalType === 'PRODUTO' || modalType === 'FORNECEDOR') && (
        <div className="fixed inset-0 bg-[#302464]/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-8 relative">
                <button onClick={() => setModalType(null)} className="absolute top-6 right-6 text-slate-400 hover:text-[#302464]"><X size={24}/></button>
                <h3 className="font-black text-[#302464] text-xl mb-6">
                    {modalType === 'PRODUTO' ? (editId ? 'Editar Produto' : 'Novo Produto') : 'Novo Fornecedor'}
                </h3>
                
                {/* Altera o submit handler dependendo do tipo */}
                <form onSubmit={modalType === 'PRODUTO' ? handleSalvarProduto : handleSalvarFornecedor} className="space-y-4">
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
                        {filtroEmpresa && (
                            <div className="p-3 bg-purple-50 rounded-xl mb-2 text-center text-xs text-[#302464] font-bold border border-purple-100">
                                Fornecedor vinculado a: {empresaSelecionadaObj?.nome_fantasia}
                            </div>
                        )}
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