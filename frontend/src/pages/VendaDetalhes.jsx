import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import vendaService from '../services/vendaService';
import { ArrowLeft, X, Edit, Save, ShieldCheck, RefreshCw, FileText } from 'lucide-react';

const StatusBadge = ({ status }) => {
  const statusMap = {
    ORCAMENTO: { text: 'Orçamento', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    CONCLUIDA: { text: 'Concluída', color: 'bg-green-100 text-green-800 border-green-200' },
    VENCIDO: { text: 'Vencido', color: 'bg-red-100 text-red-800 border-red-200' },
    CANCELADO: { text: 'Cancelado', color: 'bg-slate-200 text-slate-700 border-slate-300' },
  };
  const { text, color } = statusMap[status] || { text: status, color: 'bg-gray-100 text-gray-800' };
  return <span className={`px-3 py-1 text-xs font-black uppercase tracking-wider rounded-full border ${color}`}>{text}</span>;
};

const getFutureDate = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

export default function VendaDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [venda, setVenda] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditingValidade, setIsEditingValidade] = useState(false);
  const [novaValidade, setNovaValidade] = useState('');

  const carregarVenda = useCallback(async () => {
    try {
      setLoading(true);
      const data = await vendaService.getVenda(id);
      setVenda(data);
      setNovaValidade(data.validade_orcamento);
    } catch (error) {
      console.error("Erro ao carregar venda", error);
      alert('Não foi possível carregar os dados da venda.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    carregarVenda();
  }, [carregarVenda]);

  const handleAprovar = async () => {
    if (window.confirm('Tem certeza que deseja aprovar este orçamento? O estoque será debitado.')) {
        try {
            const vendaAtualizada = await vendaService.aprovarVenda(id);
            setVenda(vendaAtualizada);
        } catch (error) {
            alert(error.response?.data?.detail || 'Erro ao aprovar orçamento.');
        }
    }
  };

  const handleCancelar = async () => {
    if (window.confirm('Tem certeza que deseja cancelar este orçamento?')) {
      try {
        const vendaCancelada = await vendaService.cancelarVenda(id);
        setVenda(vendaCancelada);
      } catch (error) {
        alert(error.response?.data?.error || 'Erro ao cancelar orçamento.');
      }
    }
  };

  const handleRenovar = async () => {
    const diasInput = prompt("Renovar por quantos dias a partir de hoje?", "7");
    if (diasInput) {
        const dias = parseInt(diasInput, 10);
        if (!isNaN(dias) && dias > 0) {
            const novaData = getFutureDate(dias);
            try {
                const vendaRenovada = await vendaService.alterarValidade(id, novaData);
                setVenda(vendaRenovada);
                alert('Orçamento reativado com sucesso!');
            } catch (error) {
                alert(error.response?.data?.error || 'Erro ao renovar orçamento.');
            }
        }
    }
  };

  const handleUpdateValidade = async () => {
    try {
      const vendaAtualizada = await vendaService.alterarValidade(id, novaValidade);
      setVenda(vendaAtualizada);
      setIsEditingValidade(false);
    } catch (error) {
      alert(error.response?.data?.error || 'Erro ao alterar validade.');
    }
  };

  const handleGerarPdf = async () => {
    try {
      await vendaService.gerarPdf(id);
    } catch (error) {
      console.error("Erro ao gerar PDF", error);
      alert("Não foi possível gerar o PDF.");
    }
  };
  
  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700"></div></div>;
  if (!venda) return <div className="text-center py-10">Venda não encontrada.</div>;

  // Action Buttons Logic
  const renderActionButtons = () => {
      if (venda.status === 'ORCAMENTO') {
          return (
              <div className="flex items-center gap-2">
                  <button onClick={handleCancelar} className="bg-white hover:bg-red-50 text-red-600 px-4 py-2 rounded-lg flex items-center gap-2 font-bold text-sm border-2 border-red-200 transition-all active:scale-95">
                      <X size={16}/> Cancelar Orçamento
                  </button>
                  <button onClick={handleAprovar} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold text-sm shadow-lg shadow-emerald-500/30 transition-all active:scale-95">
                      <ShieldCheck size={16}/> Aprovar
                  </button>
              </div>
          )
      }
      if (venda.status === 'VENCIDO') {
          return (
              <button onClick={handleRenovar} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold text-sm shadow-lg shadow-purple-500/30 transition-all active:scale-95">
                  <RefreshCw size={16}/> Renovar Orçamento
              </button>
          )
      }
      return null;
  }

  return (
    <div className="animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
            <div>
                <button onClick={() => navigate('/vendas')} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 mb-4">
                    <ArrowLeft size={18}/> Voltar para Vendas
                </button>
                <h1 className="text-3xl font-black text-slate-800">Orçamento #{venda.id}</h1>
                <div className="mt-2"><StatusBadge status={venda.status} /></div>
            </div>
            <div className="w-full sm:w-auto flex items-center gap-2">
                <button onClick={handleGerarPdf} className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold text-sm transition-all active:scale-95 shadow-lg shadow-slate-200">
                    <FileText size={16}/> Gerar PDF
                </button>
                {renderActionButtons()}
            </div>
        </div>

        {/* Details Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Client Info */}
                <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Cliente</h3>
                    <p className="font-bold text-slate-700">{venda.cliente.razao_social || venda.cliente.nome}</p>
                    <p className="text-sm text-slate-500">{venda.cliente.cnpj || venda.cliente.cpf}</p>
                </div>
                
                {/* Dates Info */}
                <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Datas</h3>
                    <p className="text-sm text-slate-600"><strong className="font-bold">Emissão:</strong> {new Date(venda.data_venda).toLocaleDateString()}</p>
                    <div className="flex items-center gap-2">
                        <p className="text-sm text-slate-600"><strong className="font-bold">Validade:</strong></p>
                        {isEditingValidade ? (
                            <div className="flex items-center gap-1">
                                <input 
                                    type="date" 
                                    value={novaValidade} 
                                    onChange={e => setNovaValidade(e.target.value)} 
                                    className="bg-slate-100 p-1 rounded-md text-sm font-bold text-slate-700 border border-slate-300 outline-none focus:ring-2 focus:ring-purple-500"
                                />
                                <button onClick={handleUpdateValidade} className="p-1 text-emerald-600 hover:bg-emerald-100 rounded-md"><Save size={16}/></button>
                                <button onClick={() => setIsEditingValidade(false)} className="p-1 text-slate-500 hover:bg-slate-100 rounded-md"><X size={16}/></button>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-600">
                                {new Date(venda.validade_orcamento + 'T00:00:00').toLocaleDateString()}
                                {venda.status === 'ORCAMENTO' && (
                                    <button onClick={() => setIsEditingValidade(true)} className="ml-2 text-purple-600 hover:text-purple-800"><Edit size={14}/></button>
                                )}
                            </p>
                        )}
                    </div>
                </div>

                {/* Values Info */}
                <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Valores</h3>
                    <p className="text-2xl font-black text-emerald-600">R$ {venda.valor_total.toFixed(2)}</p>
                </div>
            </div>

            {/* Items Table */}
            <div className="mt-8">
                 <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Itens do Orçamento</h3>
                <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500">
                            <tr>
                                <th className="p-3">Produto/Serviço</th>
                                <th className="p-3 text-center">Qtd.</th>
                                <th className="p-3 text-right">Preço Unit.</th>
                                <th className="p-3 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {venda.itens.map(item => (
                                <tr key={item.id} className="border-t">
                                    <td className="p-3 font-bold">{item.produto_nome}</td>
                                    <td className="p-3 text-center">{item.quantidade}</td>
                                    <td className="p-3 text-right">R$ {item.preco_unitario.toFixed(2)}</td>
                                    <td className="p-3 text-right font-bold">R$ {item.valor_total_item.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
  );
}