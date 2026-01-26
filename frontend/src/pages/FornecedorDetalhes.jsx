import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Truck, Package, Calendar, DollarSign, History, ShoppingBag, TrendingUp } from 'lucide-react';
import estoqueService from '../services/estoqueService';

export default function FornecedorDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [fornecedor, setFornecedor] = useState(null);
  const [compras, setCompras] = useState([]);

  useEffect(() => {
    const carregarDados = async () => {
      try {
        setLoading(true);
        const [dadosForn, historicoGeral] = await Promise.all([
          estoqueService.buscarFornecedorPorId(id),
          estoqueService.listarHistorico()
        ]);
        setFornecedor(dadosForn);
        // Filtra apenas entradas (compras) deste fornecedor específico
        const comprasDesteForn = historicoGeral.filter(h => 
          h.tipo_movimento === 'ENTRADA' && parseInt(h.fornecedor) === parseInt(id)
        );
        setCompras(comprasDesteForn.sort((a,b) => new Date(b.data_movimento) - new Date(a.data_movimento)));
      } catch (err) {
        console.error(err);
      } finally { setLoading(false); }
    };
    carregarDados();
  }, [id]);

  // Calcula estatísticas rápidas
  const stats = useMemo(() => {
    const totalItens = compras.reduce((acc, c) => acc + c.quantidade, 0);
    const totalGasto = compras.reduce((acc, c) => acc + (c.quantidade * c.preco_unitario), 0);
    const produtosUnicos = new Set(compras.map(c => c.nome_produto)).size;
    return { totalItens, totalGasto, produtosUnicos };
  }, [compras]);

  if (loading) return <div className="p-20 text-center animate-pulse font-black text-slate-400 uppercase tracking-widest text-xs">Analisando histórico de compras...</div>;
  if (!fornecedor) return <div className="p-20 text-center text-red-500 font-bold">Fornecedor não encontrado.</div>;

  return (
    <div className="max-w-6xl mx-auto pb-20 animate-in fade-in duration-500">
      <button onClick={() => navigate('/inventario')} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-bold text-sm mb-8 transition-all group">
        <div className="p-2 bg-white rounded-xl shadow-sm group-hover:shadow-md border border-slate-100"><ArrowLeft size={18} /></div>
        Voltar para Estoque
      </button>

      {/* CABEÇALHO DO FORNECEDOR */}
      <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-slate-900/20 mb-8 relative overflow-hidden">
         <Truck className="absolute -right-6 -bottom-6 text-white opacity-5" size={180} />
         <div className="relative z-10">
            <span className="bg-orange-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-[0.2em]">Parceiro Homologado</span>
            <h1 className="text-4xl font-black mt-4 mb-2">{fornecedor.razao_social}</h1>
            <p className="text-slate-400 font-bold flex items-center gap-2"><DollarSign size={16} className="text-orange-500"/> CNPJ: {fornecedor.cnpj || 'Não informado'}</p>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10 relative z-10">
            <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total de Itens Comprados</p>
                <p className="text-2xl font-black">{stats.totalItens} un</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Volume de Negócios</p>
                <p className="text-2xl font-black text-emerald-400">R$ {stats.totalGasto.toLocaleString()}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Mix de Produtos</p>
                <p className="text-2xl font-black">{stats.produtosUnicos} tipos</p>
            </div>
         </div>
      </div>

      {/* HISTÓRICO DE COMPRAS */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8">
        <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-3">
            <History className="text-orange-500" /> Histórico de Preços e Pedidos
        </h3>

        <div className="space-y-4">
            {compras.length === 0 ? (
                <div className="text-center py-20 text-slate-400 font-bold italic">Nenhuma compra registrada para este fornecedor.</div>
            ) : (
                compras.map((c, idx) => (
                    <div key={idx} className="group flex flex-col md:flex-row items-center justify-between p-6 bg-slate-50 rounded-3xl border border-transparent hover:border-orange-200 hover:bg-white hover:shadow-xl transition-all duration-300">
                        <div className="flex items-center gap-6">
                            <div className="p-4 bg-white rounded-2xl shadow-sm text-slate-400 group-hover:text-orange-500 transition-colors">
                                <Package size={24} />
                            </div>
                            <div>
                                <h4 className="font-black text-slate-800 text-lg">{c.nome_produto}</h4>
                                <p className="text-xs text-slate-400 font-bold flex items-center gap-2 mt-1">
                                    <Calendar size={14} /> Comprado em {new Date(c.data_movimento).toLocaleDateString('pt-BR')}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-12 mt-6 md:mt-0">
                            <div className="text-center">
                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Quantidade</p>
                                <p className="font-black text-slate-700">{c.quantidade} un</p>
                            </div>
                            <div className="text-right min-w-[120px]">
                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Preço Pago</p>
                                <p className="text-xl font-black text-emerald-600">R$ {c.preco_unitario}</p>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>
    </div>
  );
}