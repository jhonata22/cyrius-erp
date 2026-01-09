import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Package, Plus, Search, Truck, ArrowUpCircle, ArrowDownCircle, 
  DollarSign, Edit, Trash2, X, User, Paperclip, FileText 
} from 'lucide-react';

export default function Inventario() {
  const [activeTab, setActiveTab] = useState('PRODUTOS');
  const [produtos, setProdutos] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [clientes, setClientes] = useState([]); // <--- NOVO: Lista de Clientes
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');

  // Modais
  const [modalProduto, setModalProduto] = useState(false);
  const [modalMovimento, setModalMovimento] = useState(false);
  const [modalFornecedor, setModalFornecedor] = useState(false);

  // States Formulários
  const [produtoEmEdicao, setProdutoEmEdicao] = useState(null);
  const [novoProduto, setNovoProduto] = useState({ nome: '', categoria: 'HARDWARE', estoque_minimo: 2, preco_venda_sugerido: '' });
  const [novoFornecedor, setNovoFornecedor] = useState({ razao_social: '', telefone: '' });
  
  // State Movimentação
  const [movimento, setMovimento] = useState({
    tipo: 'ENTRADA',
    produto_id: '',
    quantidade: 1,
    preco_unitario: '',
    fornecedor_id: '',
    cliente_id: '', // <--- NOVO
    numero_serial: '',
    arquivo: null // <--- NOVO (Para o PDF)
  });

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      // Agora buscamos CLIENTES também
      const [resProd, resForn, resCli, resHist] = await Promise.all([
        axios.get('http://localhost:8000/api/produtos/'),
        axios.get('http://localhost:8000/api/fornecedores/'),
        axios.get('http://localhost:8000/api/clientes/'),
        axios.get('http://localhost:8000/api/estoque/')
      ]);
      setProdutos(resProd.data);
      setFornecedores(resForn.data);
      setClientes(resCli.data);
      setHistorico(resHist.data);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filtros
  const produtosFiltrados = produtos.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase()));
  const fornecedoresFiltrados = fornecedores.filter(f => f.razao_social.toLowerCase().includes(busca.toLowerCase()));

  // --- AÇÕES ---

  const abrirModalNovoProduto = () => {
      setProdutoEmEdicao(null);
      setNovoProduto({ nome: '', categoria: 'HARDWARE', estoque_minimo: 2, preco_venda_sugerido: '' });
      setModalProduto(true);
  };

  const abrirModalEditarProduto = (produto) => {
      setProdutoEmEdicao(produto.id);
      setNovoProduto({ 
          nome: produto.nome, 
          categoria: produto.categoria, 
          estoque_minimo: produto.estoque_minimo, 
          preco_venda_sugerido: produto.preco_venda_sugerido 
      });
      setModalProduto(true);
  };

  const handleSalvarProduto = async (e) => {
    e.preventDefault();
    try {
      if (produtoEmEdicao) {
          await axios.put(`http://localhost:8000/api/produtos/${produtoEmEdicao}/`, novoProduto);
          alert("Produto atualizado!");
      } else {
          await axios.post('http://localhost:8000/api/produtos/', novoProduto);
          alert("Produto criado!");
      }
      setModalProduto(false);
      setProdutoEmEdicao(null);
      carregarDados();
    } catch (error) { alert("Erro ao salvar produto."); }
  };

  const handleExcluirProduto = async (id, nome) => {
      if (window.confirm(`Excluir "${nome}"?`)) {
          try {
              await axios.delete(`http://localhost:8000/api/produtos/${id}/`);
              carregarDados();
          } catch (error) { alert("Erro ao excluir."); }
      }
  };

  const handleSalvarFornecedor = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:8000/api/fornecedores/', novoFornecedor);
      setModalFornecedor(false);
      setNovoFornecedor({ razao_social: '', telefone: '' });
      carregarDados();
    } catch (error) { alert("Erro ao salvar fornecedor."); }
  };

  // --- NOVA LÓGICA DE MOVIMENTAÇÃO (COM ARQUIVO E CLIENTE) ---
  const handleSalvarMovimento = async (e) => {
    e.preventDefault();
    
    // Validação de Estoque na Saída
    if (movimento.tipo === 'SAIDA') {
       const prod = produtos.find(p => p.id == movimento.produto_id);
       if (prod && prod.estoque_atual < movimento.quantidade) {
           return alert(`Estoque insuficiente! Saldo: ${prod.estoque_atual}`);
       }
    }

    // PREPARAÇÃO PARA ENVIO DE ARQUIVO (FormData)
    const formData = new FormData();
    formData.append('produto', movimento.produto_id);
    formData.append('tipo_movimento', movimento.tipo);
    formData.append('quantidade', movimento.quantidade);
    formData.append('preco_unitario', movimento.preco_unitario || 0); // Evita erro se vazio
    formData.append('numero_serial', movimento.numero_serial);

    if (movimento.tipo === 'ENTRADA' && movimento.fornecedor_id) {
        formData.append('fornecedor', movimento.fornecedor_id);
    }
    if (movimento.tipo === 'SAIDA' && movimento.cliente_id) {
        formData.append('cliente', movimento.cliente_id);
    }
    // Só anexa se o usuário selecionou um arquivo
    if (movimento.arquivo) {
        formData.append('arquivo', movimento.arquivo);
    }

    try {
      // Importante: Não precisamos definir headers manuais, o axios + FormData lida com isso
      await axios.post('http://localhost:8000/api/estoque/', formData);
      
      alert("Movimentação registrada com sucesso!");
      setModalMovimento(false);
      // Reseta o form
      setMovimento({ 
          tipo: 'ENTRADA', produto_id: '', quantidade: 1, 
          preco_unitario: '', fornecedor_id: '', cliente_id: '', 
          numero_serial: '', arquivo: null 
      });
      carregarDados();
    } catch (error) { 
        console.error(error);
        alert("Erro ao registrar. Verifique os dados."); 
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando estoque...</div>;

  return (
    <div>
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Controle de Estoque</h1>
          <p className="text-gray-500 text-sm">Gerencie peças, compras e movimentações.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
            <button onClick={() => setModalMovimento(true)} className="bg-primary-dark hover:bg-[#1a1b4b] text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium shadow-lg transition-all w-full md:w-auto justify-center">
                <ArrowUpCircle size={18} /> Registrar Entrada/Saída
            </button>
        </div>
      </div>

      {/* ABAS */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-6 border-b border-gray-100 pb-4">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-full md:w-auto">
            {['PRODUTOS', 'HISTORICO', 'FORNECEDORES'].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-xs font-bold rounded-md transition-all flex-1 md:flex-none ${activeTab === tab ? 'bg-white text-primary-dark shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    {tab === 'PRODUTOS' && '📦 Produtos'}
                    {tab === 'HISTORICO' && '📜 Extrato'}
                    {tab === 'FORNECEDORES' && '🚚 Fornecedores'}
                </button>
            ))}
          </div>
          {activeTab !== 'HISTORICO' && (
              <div className="relative w-full md:w-64">
                <input type="text" placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-light/50" />
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
          )}
      </div>

      {/* --- ABA 1: PRODUTOS --- */}
      {activeTab === 'PRODUTOS' && (
        <>
            <div className="flex justify-end mb-4">
                <button onClick={abrirModalNovoProduto} className="text-primary-dark text-sm font-bold hover:underline flex items-center gap-1">
                    <Plus size={16} /> Novo Produto
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {produtosFiltrados.map(prod => (
                    <div key={prod.id} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${prod.estoque_atual <= prod.estoque_minimo ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => abrirModalEditarProduto(prod)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit size={16} /></button>
                            <button onClick={() => handleExcluirProduto(prod.id, prod.nome)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                        </div>
                        <div className="flex justify-between items-start mb-4 pl-2">
                            <div className="p-3 rounded-lg bg-gray-50 text-gray-600"><Package size={24} /></div>
                            <div className="text-right">
                                <span className={`text-2xl font-bold ${prod.estoque_atual <= prod.estoque_minimo ? 'text-red-500' : 'text-blue-600'}`}>{prod.estoque_atual}</span>
                                <p className="text-[10px] text-gray-400 uppercase font-bold">Saldo</p>
                            </div>
                        </div>
                        <div className="pl-2">
                            <h3 className="font-bold text-gray-800 text-lg group-hover:text-primary-dark transition-colors">{prod.nome}</h3>
                            <span className="text-[10px] uppercase font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200 inline-block mb-3">{prod.categoria}</span>
                            <div className="space-y-2 border-t border-gray-50 pt-3">
                                <div className="flex justify-between items-center text-sm text-gray-500">
                                    <span className="flex items-center gap-2"><DollarSign size={14} /> Sugerido:</span>
                                    <span className="font-bold text-gray-700">R$ {prod.preco_venda_sugerido}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </>
      )}

      {/* --- ABA 2: HISTÓRICO (Com Clientes e Download) --- */}
      {activeTab === 'HISTORICO' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
             <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-xs uppercase font-bold text-gray-400 border-b border-gray-200">
                      <tr>
                          <th className="p-4">Data</th>
                          <th className="p-4">Tipo</th>
                          <th className="p-4">Produto</th>
                          <th className="p-4">Destino / Origem</th>
                          <th className="p-4 text-center">Qtd</th>
                          <th className="p-4 text-center">Anexo</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                      {historico.map(hist => (
                          <tr key={hist.id} className="hover:bg-gray-50 transition-colors">
                              <td className="p-4 font-mono text-xs text-gray-500">
                                  {new Date(hist.data_movimento).toLocaleDateString()}
                              </td>
                              <td className="p-4">
                                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${hist.tipo_movimento === 'ENTRADA' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                      {hist.tipo_movimento}
                                  </span>
                              </td>
                              <td className="p-4 font-bold text-gray-800">{hist.nome_produto}</td>
                              <td className="p-4 text-xs">
                                  {/* Mostra Fornecedor na Entrada e Cliente na Saída */}
                                  {hist.tipo_movimento === 'ENTRADA' ? (
                                      <span className="flex items-center gap-1 text-gray-500"><Truck size={12}/> {hist.nome_fornecedor || '-'}</span>
                                  ) : (
                                      <span className="flex items-center gap-1 text-blue-600 font-bold"><User size={12}/> {hist.nome_cliente || 'Avulso'}</span>
                                  )}
                              </td>
                              <td className="p-4 text-center font-bold">{hist.quantidade}</td>
                              <td className="p-4 text-center">
                                  {hist.arquivo ? (
                                      <a href={hist.arquivo} target="_blank" rel="noopener noreferrer" className="text-primary-dark hover:text-blue-600 inline-block p-1 bg-gray-100 rounded-full" title="Ver documento">
                                          <Paperclip size={16} />
                                      </a>
                                  ) : <span className="text-gray-300">-</span>}
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
             </div>
          </div>
      )}

      {/* --- ABA 3: FORNECEDORES --- */}
      {activeTab === 'FORNECEDORES' && (
           <>
           <div className="flex justify-end mb-4">
                <button onClick={() => setModalFornecedor(true)} className="text-primary-dark text-sm font-bold hover:underline flex items-center gap-1">
                    <Plus size={16} /> Novo Fornecedor
                </button>
            </div>
           <div className="grid gap-3 md:grid-cols-2">
               {fornecedoresFiltrados.map(forn => (
                   <div key={forn.id} className="bg-white p-5 rounded-xl border border-gray-100 flex items-center justify-between shadow-sm hover:shadow-md transition-all">
                       <div>
                           <h3 className="font-bold text-gray-800">{forn.razao_social}</h3>
                           <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Truck size={14} className="text-primary-light"/> {forn.telefone || 'Sem contato'}</p>
                       </div>
                   </div>
               ))}
           </div>
           </>
      )}

      {/* --- MODAL PRODUTO --- */}
      {modalProduto && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 relative">
                <button onClick={() => setModalProduto(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20}/></button>
                <h3 className="font-bold text-gray-800 text-lg mb-6">{produtoEmEdicao ? 'Editar Produto' : 'Novo Produto'}</h3>
                <form onSubmit={handleSalvarProduto} className="space-y-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Nome</label><input required className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" value={novoProduto.nome} onChange={e => setNovoProduto({...novoProduto, nome: e.target.value})} /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                        <select className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none bg-white" value={novoProduto.categoria} onChange={e => setNovoProduto({...novoProduto, categoria: e.target.value})}>
                            <option value="HARDWARE">Hardware</option><option value="REDES">Redes</option><option value="PERIFERICO">Periféricos</option><option value="SOFTWARE">Software</option><option value="OUTROS">Outros</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Minimo</label><input type="number" className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" value={novoProduto.estoque_minimo} onChange={e => setNovoProduto({...novoProduto, estoque_minimo: e.target.value})} /></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Preço Venda</label><input type="number" step="0.01" className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" value={novoProduto.preco_venda_sugerido} onChange={e => setNovoProduto({...novoProduto, preco_venda_sugerido: e.target.value})} /></div>
                    </div>
                    <div className="flex gap-3 justify-end mt-6"><button type="button" onClick={() => setModalProduto(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button><button type="submit" className="px-6 py-2 bg-primary-dark text-white rounded-lg hover:bg-[#1a1b4b]">Salvar</button></div>
                </form>
            </div>
        </div>
      )}

      {/* --- MODAL FORNECEDOR --- */}
      {modalFornecedor && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 relative">
                <button onClick={() => setModalFornecedor(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20}/></button>
                <h3 className="font-bold text-gray-800 text-lg mb-6">Novo Fornecedor</h3>
                <form onSubmit={handleSalvarFornecedor} className="space-y-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Razão Social</label><input required className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" value={novoFornecedor.razao_social} onChange={e => setNovoFornecedor({...novoFornecedor, razao_social: e.target.value})} /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label><input className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" value={novoFornecedor.telefone} onChange={e => setNovoFornecedor({...novoFornecedor, telefone: e.target.value})} /></div>
                    <div className="flex gap-3 justify-end mt-6"><button type="button" onClick={() => setModalFornecedor(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button><button type="submit" className="px-6 py-2 bg-primary-dark text-white rounded-lg hover:bg-[#1a1b4b]">Salvar</button></div>
                </form>
            </div>
        </div>
      )}

      {/* --- MODAL MOVIMENTAÇÃO (ATUALIZADO COM CLIENTE E ARQUIVO) --- */}
      {modalMovimento && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 relative">
                <button onClick={() => setModalMovimento(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20}/></button>
                
                <h3 className="font-bold text-gray-800 text-lg mb-6 flex items-center gap-2">
                    {movimento.tipo === 'ENTRADA' ? <ArrowDownCircle className="text-green-600"/> : <ArrowUpCircle className="text-red-600"/>}
                    Registrar Movimentação
                </h3>
                
                <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
                    <button onClick={() => setMovimento({...movimento, tipo: 'ENTRADA'})} className={`flex-1 py-2 text-xs font-bold rounded transition-all ${movimento.tipo === 'ENTRADA' ? 'bg-white shadow text-green-700' : 'text-gray-500'}`}>ENTRADA (COMPRA)</button>
                    <button onClick={() => setMovimento({...movimento, tipo: 'SAIDA'})} className={`flex-1 py-2 text-xs font-bold rounded transition-all ${movimento.tipo === 'SAIDA' ? 'bg-white shadow text-red-700' : 'text-gray-500'}`}>SAÍDA (VENDA/USO)</button>
                </div>

                <form onSubmit={handleSalvarMovimento} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Produto</label>
                        <select required className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none bg-white" 
                            value={movimento.produto_id} onChange={e => setMovimento({...movimento, produto_id: e.target.value})}>
                            <option value="">Selecione...</option>
                            {produtos.map(p => <option key={p.id} value={p.id}>{p.nome} (Saldo: {p.estoque_atual})</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade</label>
                            <input required type="number" min="1" className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" 
                                value={movimento.quantidade} onChange={e => setMovimento({...movimento, quantidade: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{movimento.tipo === 'ENTRADA' ? 'Custo (R$)' : 'Venda (R$)'}</label>
                            <input required type="number" step="0.01" className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" 
                                value={movimento.preco_unitario} onChange={e => setMovimento({...movimento, preco_unitario: e.target.value})} />
                        </div>
                    </div>

                    {/* SE FOR ENTRADA -> MOSTRA FORNECEDOR */}
                    {movimento.tipo === 'ENTRADA' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fornecedor</label>
                            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none bg-white" 
                                value={movimento.fornecedor_id} onChange={e => setMovimento({...movimento, fornecedor_id: e.target.value})}>
                                <option value="">Opcional...</option>
                                {fornecedores.map(f => <option key={f.id} value={f.id}>{f.razao_social}</option>)}
                            </select>
                        </div>
                    )}

                    {/* SE FOR SAIDA -> MOSTRA CLIENTE */}
                    {movimento.tipo === 'SAIDA' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Destino (Cliente)</label>
                            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none bg-white" 
                                value={movimento.cliente_id} onChange={e => setMovimento({...movimento, cliente_id: e.target.value})}>
                                <option value="">Interno / Avulso</option>
                                {clientes.map(c => <option key={c.id} value={c.id}>{c.razao_social} ({c.tipo_cliente})</option>)}
                            </select>
                        </div>
                    )}

                    {/* CAMPO DE ARQUIVO (PDF/IMAGEM) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                            <FileText size={14}/> Anexar Documento (PDF/Foto)
                        </label>
                        <input 
                            type="file" 
                            accept="application/pdf,image/*"
                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary-light/10 file:text-primary-dark hover:file:bg-primary-light/20"
                            onChange={e => setMovimento({...movimento, arquivo: e.target.files[0]})}
                        />
                        <p className="text-[10px] text-gray-400 mt-1">Ex: Nota fiscal, Orçamento assinado, Recibo.</p>
                    </div>
                    
                    <div className="flex gap-3 justify-end mt-6">
                        <button type="button" onClick={() => setModalMovimento(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                        <button type="submit" className={`px-6 py-2 text-white rounded-lg font-bold ${movimento.tipo === 'ENTRADA' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                            Confirmar
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}