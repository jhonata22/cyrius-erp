import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, Plus, Search, ArrowUpCircle, 
  Edit, Trash2, X, Paperclip, ChevronRight, Building2, AlertTriangle
} from 'lucide-react';
import estoqueService from '../services/estoqueService';
import clienteService from '../services/clienteService';
import vendaService from '../services/vendaService';
import equipeService from '../services/equipeService';

import { useEmpresas } from '../hooks/useEmpresas';

export default function Vendas() {
  const navigate = useNavigate();
  
  const { empresas } = useEmpresas();
  const [filtroEmpresa, setFiltroEmpresa] = useState(empresas[0]?.id || '');

  useEffect(() => {
      if (empresas.length > 0 && !filtroEmpresa) {
          setFiltroEmpresa(empresas[0].id);
      }
  }, [empresas, filtroEmpresa]);

  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');

  const [produtos, setProdutos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({});

  const carregarDados = useCallback(async () => {
    try {
      setLoading(true);
      const empresaId = filtroEmpresa || null;

      const [p, cli, h, user] = await Promise.all([
        estoqueService.listarProdutos(),
        clienteService.listar(),
        vendaService.listarVendas(empresaId),
        equipeService.me()
      ]);
      setProdutos(p);
      setClientes(cli);
      setHistorico(h);
      setCurrentUser(user);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filtroEmpresa]);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  const filteredData = useMemo(() => {
    const b = busca.toLowerCase();
    return [...historico].sort((a, b) => new Date(b.data_venda) - new Date(a.data_venda))
                          .filter(v => v.cliente_nome.toLowerCase().includes(b) || v.produto_nome.toLowerCase().includes(b));
  }, [busca, historico]);   

  const openModal = () => {
    setModalOpen(true);
    setFormData({
        cliente: '',
        produto: '',
        quantidade: 1,
        preco_unitario: '',
        parcelas: 1,
    });
  };

  const handleSalvarVenda = async (e) => {
    e.preventDefault();

    const data = { ...formData };

    if (!filtroEmpresa) {
      return alert("Por favor, selecione uma empresa para registrar a venda.");
    }
    data.empresa = filtroEmpresa;

    if (!currentUser) {
        return alert("Não foi possível identificar o vendedor. Tente recarregar a página.");
    }
    data.vendedor = currentUser.id;

    data.valor_total = (data.quantidade || 0) * (data.preco_unitario || 0);

    try {
      await vendaService.criarVenda(data);
      setModalOpen(false);
      carregarDados();
      alert("Venda registrada com sucesso!");
    } catch (err) { 
        console.error(err);
        const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : "Erro ao registrar venda.";
        alert(errorMsg);
    }
  };

  const empresaSelecionadaObj = empresas.find(e => String(e.id) === String(filtroEmpresa));

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Vendas</h1>
            <div className="h-1 w-12 bg-[#7C69AF] mt-2 rounded-full"></div>

            <div className="mt-4 flex items-center gap-2 bg-white p-1 pr-4 rounded-xl border border-slate-200 w-fit shadow-sm">
                 <div className="bg-slate-100 p-2 rounded-lg text-slate-500">
                    <Building2 size={16} />
                 </div>
                 <select 
                    value={filtroEmpresa}
                    onChange={(e) => setFiltroEmpresa(e.target.value)}
                    className="bg-transparent font-bold text-slate-700 text-sm outline-none cursor-pointer min-w-[200px]"
                 >
                    {empresas.map(emp => (
                        <option key={emp.id} value={emp.id}>
                            {emp.nome_fantasia}
                        </option>
                    ))}
                 </select>
            </div>
        </div>

        <button onClick={openModal} className="bg-[#302464] hover:bg-[#7C69AF] text-white px-6 py-2.5 rounded-2xl flex items-center gap-2 font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95"><ShoppingCart size={18} /> Nova Venda</button>
      </div>

      <div className="flex p-1.5 bg-slate-200/50 rounded-2xl mb-8 w-full md:w-fit overflow-x-auto">
          <button className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl bg-white text-[#302464] shadow-sm`}>HISTÓRICO DE VENDAS</button>
      </div>
      
      <div className="relative mb-8 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#7C69AF] transition-colors" size={20} />
          <input type="text" placeholder="Pesquisar por cliente ou produto..." value={busca} onChange={e => setBusca(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-purple-500/5 transition-all text-sm" />
      </div>

      {loading ? <div className="py-20 text-center text-[#7C69AF] font-black uppercase tracking-widest text-[10px] animate-pulse">Carregando Vendas...</div> : (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden animate-in slide-in-from-bottom-2">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 font-black text-slate-400 uppercase tracking-widest">
              <tr><th className="p-6">Cliente</th><th className="p-6">Produto</th><th className="p-6 text-center">Qtd</th><th className="p-6 text-right">Valor Total</th><th className="p-6 text-center">Data</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredData.map(venda => (
                <tr key={venda.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-6 font-bold text-slate-700">{venda.cliente_nome}</td>
                  <td className="p-6 font-bold text-slate-600">{venda.produto_nome}</td>
                  <td className="p-6 text-center font-black text-slate-700">{venda.quantidade}</td>
                  <td className="p-6 text-right font-black text-emerald-600">R$ {parseFloat(venda.valor_total).toFixed(2)}</td>
                  <td className="p-6 text-center text-slate-400 font-mono text-[10px]">{new Date(venda.data_venda).toLocaleDateString()}</td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                  <tr><td colSpan="5" className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Nenhuma venda encontrada para este filtro.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-[#302464]/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg p-8 relative border border-white/20">
                <button onClick={() => setModalOpen(false)} className="absolute top-8 right-8 text-slate-400 hover:text-[#302464]"><X size={24}/></button>
                <h3 className="text-2xl font-black text-[#302464] mb-6 flex items-center gap-3">
                  <ShoppingCart className="text-[#7C69AF]"/>
                  Nova Venda
                </h3>
                
                {empresaSelecionadaObj && (
                    <div className="mb-4 p-3 bg-purple-50 rounded-xl text-center border border-purple-100">
                        <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Venda por:</p>
                        <p className="text-sm font-bold text-[#302464]">{empresaSelecionadaObj.nome_fantasia}</p>
                    </div>
                )}

                <form onSubmit={handleSalvarVenda} className="space-y-5">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cliente</label>
                    <select required className="w-full bg-slate-50 p-4 rounded-2xl border-none font-bold text-slate-700 outline-none focus:ring-4 focus:ring-purple-500/5"
                      value={formData.cliente} onChange={e => setFormData({...formData, cliente: e.target.value})}>
                      <option value="">Selecione o cliente...</option>
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.razao_social}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Produto</label>
                    <select required className="w-full bg-slate-50 p-4 rounded-2xl border-none font-bold text-slate-700 outline-none focus:ring-4 focus:ring-purple-500/5"
                      value={formData.produto} onChange={e => setFormData({...formData, produto: e.target.value})}>
                      <option value="">Selecione um item...</option>
                      {produtos.map(p => <option key={p.id} value={p.id}>{p.nome} (Saldo: {p.estoque_atual})</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantidade</label>
                      <input type="number" required min="1" className="w-full bg-slate-50 p-4 rounded-2xl border-none outline-none font-bold" 
                        value={formData.quantidade} onChange={e => setFormData({...formData, quantidade: e.target.value})}/>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Preço Venda Un.</label>
                      <input type="number" step="0.01" required className="w-full bg-slate-50 p-4 rounded-2xl border-none outline-none font-bold text-[#302464]"
                        value={formData.preco_unitario} onChange={e => setFormData({...formData, preco_unitario: e.target.value})}/>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Parcelas</label>
                        <input type="number" min="1" max="60" required className="w-full bg-slate-50 p-4 rounded-2xl border-none font-bold text-[#302464]" 
                            value={formData.parcelas} onChange={e => setFormData({...formData, parcelas: e.target.value})}
                        />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-50 flex justify-between items-center text-xs font-bold text-slate-500">
                      <span>Total da Venda:</span>
                      <div className="text-right">
                          <div className="text-emerald-600 font-black text-lg">
                             R$ {((formData.quantidade || 0) * (formData.preco_unitario || 0)).toFixed(2)}
                          </div>
                          {formData.parcelas > 1 && (
                              <div className="text-[9px] text-slate-400 mt-1">
                                  {formData.parcelas}x de R$ {(((formData.quantidade || 0) * (formData.preco_unitario || 0)) / formData.parcelas).toFixed(2)}
                              </div>
                          )}
                      </div>
                  </div>

                  <button type="submit" className="w-full py-5 bg-gradient-to-r from-[#302464] to-[#7C69AF] text-white rounded-3xl font-black uppercase tracking-widest text-[10px] shadow-xl active:scale-95 transition-all mt-4">
                    Confirmar Venda
                  </button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}