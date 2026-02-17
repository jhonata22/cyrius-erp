import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Package, DollarSign, Trash2, CheckCircle, FileText, Upload, PlusCircle, AlertCircle } from 'lucide-react';
import vendaService from '../services/vendaService';
import estoqueService from '../services/estoqueService';

// Helper Components
const StatusBadge = ({ status }) => {
  const statusMap = { ORCAMENTO: { text: 'Orçamento', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' }, CONCLUIDA: { text: 'Concluída', color: 'bg-green-100 text-green-800 border-green-200' }, REVOGADA: { text: 'Revogada', color: 'bg-red-100 text-red-800 border-red-200' } };
  const { text, color } = statusMap[status] || { text: status, color: 'bg-gray-100 text-gray-800' };
  return <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${color}`}>{text}</span>;
};
const DetailCard = ({ icon: Icon, title, children }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">{Icon && <div className="flex items-center gap-3 mb-4"><Icon className="text-[#7C69AF]" size={20} /><h2 className="text-sm font-bold text-slate-600 uppercase tracking-wider">{title}</h2></div>}<div className="space-y-2 text-sm text-slate-800">{children}</div></div>
);
const InfoRow = ({ label, value, children, isHighlight = false }) => (
  <div className={`flex justify-between items-center py-2 ${isHighlight ? 'font-black text-base' : 'font-medium'}`}>
    <span className="text-slate-500">{label}</span>
    {children || <span className="text-right">{value}</span>}
  </div>
);

export default function VendaDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [venda, setVenda] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comprovanteFile, setComprovanteFile] = useState(null);
  const [newItem, setNewItem] = useState({ produto: '', quantidade: 1, preco_unitario: '' });
  const [error, setError] = useState(null);

  const fetchVenda = useCallback(() => {
    vendaService.getVenda(id)
      .then(data => setVenda(data))
      .catch(err => {
        console.error("Erro ao carregar venda", err);
        setError("Não foi possível carregar os dados da venda.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchVenda();
    estoqueService.listarProdutos().then(setProdutos);
  }, [fetchVenda]);

  const handleUpdateField = (field, value) => {
    setError(null);
    vendaService.updateVenda(id, { [field]: value })
      .then(() => fetchVenda()) // CRITICAL: Re-fetch the full object
      .catch(err => setError("Erro ao atualizar o campo."));
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    setError(null);
    vendaService.addItem(id, newItem)
      .then(() => {
        fetchVenda(); // CRITICAL: Re-fetch the full object
        setNewItem({ produto: '', quantidade: 1, preco_unitario: '' });
      })
      .catch(err => setError('Erro ao adicionar item.'));
  };

  const handleRemoveItem = (itemId) => {
    setError(null);
    if (window.confirm('Remover este item?')) {
      vendaService.removeItem(id, itemId)
        .then(() => fetchVenda()) // CRITICAL: Re-fetch the full object
        .catch(err => setError('Erro ao remover item.'));
    }
  };
  
  const handleAprovar = async () => {
    setError(null);
    if (!window.confirm("Deseja realmente aprovar este orçamento? Esta ação não pode ser desfeita.")) return;
    try {
      await vendaService.aprovarVenda(id);
      alert("Venda aprovada com sucesso!");
      fetchVenda();
    } catch (err) {
      const errorMsg = err.response?.data?.detail || "Ocorreu um erro ao aprovar a venda. Verifique o estoque.";
      setError(errorMsg);
    }
  };

  const handleGerarPdf = () => vendaService.gerarPdf(id).catch(() => setError("Erro ao gerar PDF."));

  const handleUploadComprovante = async () => {
    if (!comprovanteFile) return setError("Selecione um arquivo.");
    setError(null);
    vendaService.uploadComprovante(id, comprovanteFile)
        .then(() => { alert("Comprovante enviado!"); fetchVenda(); })
        .catch(() => setError("Erro ao enviar."));
  };

  if (loading) return <div className="text-center py-20">Carregando...</div>;
  if (!venda) return <div className="text-center py-20 text-red-500">Venda não encontrada.</div>;

  const isOrcamento = venda.status === 'ORCAMENTO';

  return (
    <div className="animate-in fade-in duration-500">
      {/* Error Banner */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-lg flex items-center gap-3" role="alert">
          <AlertCircle size={20}/>
          <div>
            <p className="font-bold">Ocorreu um Erro</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
          <div className="flex items-center gap-4">
              <button onClick={() => navigate('/vendas')} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"><ArrowLeft size={20} /></button>
              <div>
                  <div className="flex items-center gap-3"><h1 className="text-2xl font-black text-slate-800">Venda #{venda.id}</h1><StatusBadge status={venda.status} /></div>
                  <p className="text-sm text-slate-500">Data: {new Date(venda.data_venda).toLocaleDateString('pt-BR')} | Validade: {new Date(venda.validade_orcamento + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
              </div>
          </div>
          <div className="flex items-center gap-2">
              <button onClick={handleGerarPdf} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2"><FileText size={16}/>Gerar PDF</button>
              {isOrcamento && <button onClick={handleAprovar} className="bg-green-500 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2"><CheckCircle size={16}/>Aprovar Orçamento</button>}
          </div>
      </div>

      {/* Main Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
            {/* Itens da Venda */}
            <DetailCard icon={Package} title="Itens do Orçamento">
                <table className="w-full text-xs"><tbody>
                    {venda.itens?.map(item => (
                        <tr key={item.id} className="border-b border-slate-100">
                            <td className="p-2 font-bold">{item.produto_nome}</td>
                            <td className="p-2">{item.quantidade} x R$ {parseFloat(item.preco_unitario).toFixed(2)}</td>
                            <td className="p-2 font-bold text-right">R$ {parseFloat(item.valor_total_item).toFixed(2)}</td>
                            <td className="p-2 text-right">{isOrcamento && <button onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:text-red-700"><Trash2 size={14}/></button>}</td>
                        </tr>
                    ))}
                </tbody></table>
                {isOrcamento && (
                    <form onSubmit={handleAddItem} className="flex items-end gap-2 pt-4 mt-4 border-t border-slate-100">
                        <select value={newItem.produto} onChange={e => setNewItem({...newItem, produto: e.target.value, preco_unitario: produtos.find(p => p.id == e.target.value)?.preco_venda_sugerido || ''})} required className="flex-grow bg-slate-100 p-2 rounded-lg text-xs"><option value="">Selecione um produto</option>{produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select>
                        <input type="number" value={newItem.quantidade} onChange={e => setNewItem({...newItem, quantidade: e.target.value})} placeholder="Qtd" required className="w-16 bg-slate-100 p-2 rounded-lg text-xs"/>
                        <input type="number" step="0.01" value={newItem.preco_unitario} onChange={e => setNewItem({...newItem, preco_unitario: e.target.value})} placeholder="Preço Un." required className="w-24 bg-slate-100 p-2 rounded-lg text-xs"/>
                        <button type="submit" className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600"><PlusCircle size={16}/></button>
                    </form>
                )}
            </DetailCard>

            <DetailCard icon={User} title="Cliente">
                 <InfoRow label="Nome / Razão Social" value={venda.cliente.razao_social} />
                 <InfoRow label="Contato" value={venda.cliente.telefone || 'Não informado'} />
            </DetailCard>
             <DetailCard icon={Upload} title="Documentos">
                {venda.comprovante_pagamento ? <a href={venda.comprovante_pagamento} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-bold text-sm hover:underline">Ver Comprovante</a> : <div className="flex items-center gap-2"><input type="file" onChange={e => setComprovanteFile(e.target.files[0])} className="text-xs"/><button onClick={handleUploadComprovante} disabled={!comprovanteFile} className="bg-blue-500 text-white px-3 py-1 rounded text-xs font-bold disabled:opacity-50">Enviar</button></div>}
             </DetailCard>
        </div>

        {/* Resumo Financeiro */}
        <div className="md:col-span-1">
            <DetailCard icon={DollarSign} title="Resumo Financeiro">
                <InfoRow label="Subtotal" value={`R$ ${(venda.itens || []).reduce((acc, item) => acc + parseFloat(item.valor_total_item), 0).toFixed(2)}`} />
                <InfoRow label="Desconto"><input type="number" step="0.01" value={venda.desconto} onChange={e => setVenda({...venda, desconto: parseFloat(e.target.value) || 0})} onBlur={e => handleUpdateField('desconto', e.target.value)} disabled={!isOrcamento} className="w-24 bg-slate-100 p-1 rounded-md text-right font-bold text-red-500"/></InfoRow>
                <InfoRow label="Entrada"><input type="number" step="0.01" value={venda.valor_entrada} onChange={e => setVenda({...venda, valor_entrada: parseFloat(e.target.value) || 0})} onBlur={e => handleUpdateField('valor_entrada', e.target.value)} disabled={!isOrcamento} className="w-24 bg-slate-100 p-1 rounded-md text-right font-bold"/></InfoRow>
                <InfoRow label="Total" value={`R$ ${(venda.valor_total - venda.desconto).toFixed(2)}`} isHighlight/>
                <div className="pt-4 mt-4 border-t border-slate-100 space-y-2">
                    <InfoRow label="Forma Pagamento">
                        <select value={venda.forma_pagamento} onChange={e => handleUpdateField('forma_pagamento', e.target.value)} disabled={!isOrcamento} className="bg-slate-100 p-1 rounded-md text-xs"><option value="DINHEIRO">Dinheiro</option><option value="PIX">PIX</option><option value="CARTAO_CREDITO">Cartão de Crédito</option><option value="BOLETO">Boleto</option></select>
                    </InfoRow>
                    <InfoRow label="Parcelas">
                        <input type="number" min="1" value={venda.parcelas} onChange={e => setVenda({...venda, parcelas: parseInt(e.target.value, 10) || 1})} onBlur={e => handleUpdateField('parcelas', e.target.value)} disabled={!isOrcamento} className="w-16 bg-slate-100 p-1 rounded-md text-right"/>
                    </InfoRow>
                </div>
            </DetailCard>
        </div>
      </div>
    </div>
  );
}