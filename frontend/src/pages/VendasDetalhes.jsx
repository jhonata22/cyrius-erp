import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Package, DollarSign, Trash2, CheckCircle, FileText, Upload, PlusCircle, AlertCircle } from 'lucide-react';
import vendaService from '../services/vendaService';
import estoqueService from '../services/estoqueService';

// Helper Components
const StatusBadge = ({ status }) => {
  const statusMap = { 
    ORCAMENTO: { text: 'Orçamento', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' }, 
    CONCLUIDA: { text: 'Concluída', color: 'bg-green-100 text-green-800 border-green-200' }, 
    REVOGADA: { text: 'Revogada', color: 'bg-red-100 text-red-800 border-red-200' } 
  };
  const { text, color } = statusMap[status] || { text: status, color: 'bg-gray-100 text-gray-800' };
  return <span className={`px-3 py-1 text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-full border ${color}`}>{text}</span>;
};

const DetailCard = ({ icon: Icon, title, children }) => (
  <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
    {Icon && (
      <div className="flex items-center gap-3 mb-4">
        <Icon className="text-[#7C69AF] shrink-0" size={20} />
        <h2 className="text-xs sm:text-sm font-black text-slate-600 uppercase tracking-wider">{title}</h2>
      </div>
    )}
    <div className="space-y-2 text-sm text-slate-800">{children}</div>
  </div>
);

const InfoRow = ({ label, value, children, isHighlight = false }) => (
  <div className={`flex flex-col sm:flex-row justify-between sm:items-center py-3 sm:py-2 border-b border-slate-50 last:border-0 gap-2 sm:gap-4 ${isHighlight ? 'font-black text-base mt-2 pt-4 border-t border-slate-100' : 'font-medium'}`}>
    <span className="text-slate-500 text-xs sm:text-sm shrink-0">{label}</span>
    {children ? (
      <div className="w-full sm:w-auto sm:max-w-[60%] text-right flex sm:justify-end">{children}</div>
    ) : (
      <span className="text-left sm:text-right text-xs sm:text-sm text-slate-800 break-words w-full sm:max-w-[60%]">{value}</span>
    )}
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
      .then(() => fetchVenda())
      .catch(err => setError("Erro ao atualizar o campo."));
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    setError(null);
    vendaService.addItem(id, newItem)
      .then(() => {
        fetchVenda();
        setNewItem({ produto: '', quantidade: 1, preco_unitario: '' });
      })
      .catch(err => setError('Erro ao adicionar item.'));
  };

  const handleRemoveItem = (itemId) => {
    setError(null);
    if (window.confirm('Remover este item?')) {
      vendaService.removeItem(id, itemId)
        .then(() => fetchVenda())
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
        .then(() => { alert("Comprovante enviado!"); fetchVenda(); setComprovanteFile(null); })
        .catch(() => setError("Erro ao enviar."));
  };

  if (loading) return <div className="text-center py-20 font-bold text-slate-400">Carregando detalhes...</div>;
  if (!venda) return <div className="text-center py-20 text-red-500 font-bold">Venda não encontrada.</div>;

  const isOrcamento = venda.status === 'ORCAMENTO';

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      {/* Error Banner */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-xl flex items-start sm:items-center gap-3 shadow-sm" role="alert">
          <AlertCircle size={20} className="shrink-0 mt-0.5 sm:mt-0"/>
          <div>
            <p className="font-bold text-sm">Ocorreu um Erro</p>
            <p className="text-xs sm:text-sm mt-1 sm:mt-0">{error}</p>
          </div>
        </div>
      )}

      {/* Header Responsivo */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-start gap-3 sm:gap-4 w-full md:w-auto">
              <button onClick={() => navigate('/vendas')} className="p-2 sm:p-2.5 shrink-0 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
                <ArrowLeft size={20} className="text-slate-600" />
              </button>
              <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Venda #{venda.id}</h1>
                    <StatusBadge status={venda.status} />
                  </div>
                  <p className="text-[11px] sm:text-sm text-slate-500 mt-1 font-medium">
                    Data: <span className="font-bold">{new Date(venda.data_venda).toLocaleDateString('pt-BR')}</span> <span className="mx-1 opacity-50">|</span> 
                    Validade: <span className="font-bold">{new Date(venda.validade_orcamento + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                  </p>
              </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
              <button onClick={handleGerarPdf} className="w-full sm:w-auto justify-center bg-white border border-slate-200 text-slate-700 px-6 py-3 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm hover:bg-slate-50 transition-all active:scale-95">
                <FileText size={18}/> PDF
              </button>
              {isOrcamento && (
                <button onClick={handleAprovar} className="w-full sm:w-auto justify-center bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95">
                  <CheckCircle size={18}/> Aprovar
                </button>
              )}
          </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6 overflow-hidden">
            
            <DetailCard icon={Package} title="Itens do Orçamento">
                <div className="overflow-x-auto w-full -mx-4 sm:mx-0 px-4 sm:px-0">
                  <table className="w-full text-xs min-w-[500px]">
                    <thead className="text-slate-400 border-b border-slate-100">
                      <tr>
                        <th className="pb-3 font-bold text-left">Produto</th>
                        <th className="pb-3 font-bold text-left">Qtd x Preço</th>
                        <th className="pb-3 font-bold text-right">Total</th>
                        <th className="pb-3 font-bold"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                    {venda.itens?.map(item => (
                        <tr key={item.id} className="group">
                            <td className="py-3 pr-2 font-bold text-slate-700 whitespace-nowrap">{item.produto_nome}</td>
                            <td className="py-3 px-2 text-slate-500 whitespace-nowrap">{item.quantidade} <span className="text-[10px] mx-1">x</span> R$ {parseFloat(item.preco_unitario).toFixed(2)}</td>
                            <td className="py-3 pl-2 font-black text-slate-800 text-right whitespace-nowrap">R$ {parseFloat(item.valor_total_item).toFixed(2)}</td>
                            <td className="py-3 pl-4 text-right">
                              {isOrcamento && (
                                <button onClick={() => handleRemoveItem(item.id)} className="text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors">
                                  <Trash2 size={16}/>
                                </button>
                              )}
                            </td>
                        </tr>
                    ))}
                    </tbody>
                  </table>
                </div>

                {isOrcamento && (
                    <form onSubmit={handleAddItem} className="flex flex-col gap-3 pt-4 mt-2 border-t border-slate-100 bg-slate-50 sm:bg-transparent p-4 sm:p-0 rounded-xl sm:rounded-none">
                        
                        {/* Produto selection - Full width on mobile */}
                        <div className="w-full">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Produto</label>
                          <select value={newItem.produto} onChange={e => setNewItem({...newItem, produto: e.target.value, preco_unitario: produtos.find(p => p.id == e.target.value)?.preco_venda_sugerido || ''})} required className="w-full bg-white sm:bg-slate-100 p-3 sm:p-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-700 border border-slate-200 sm:border-none outline-none focus:ring-2 focus:ring-[#7C69AF]/50">
                            <option value="">Selecione um produto</option>
                            {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                          </select>
                        </div>
                        
                        {/* Qtd, Price and Button row - Flex on sm screens, column on mobile */}
                        <div className="flex flex-col sm:flex-row gap-3 items-end">
                            <div className="flex gap-3 w-full sm:w-auto flex-1">
                              <div className="w-1/3 sm:w-20">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Qtd</label>
                                <input type="number" min="1" value={newItem.quantidade} onChange={e => setNewItem({...newItem, quantidade: e.target.value})} placeholder="Qtd" required className="w-full bg-white sm:bg-slate-100 p-3 sm:p-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-700 text-center border border-slate-200 sm:border-none outline-none"/>
                              </div>
                              <div className="w-2/3 sm:w-32 flex-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Preço Un.</label>
                                <input type="number" step="0.01" value={newItem.preco_unitario} onChange={e => setNewItem({...newItem, preco_unitario: e.target.value})} placeholder="R$" required className="w-full bg-white sm:bg-slate-100 p-3 sm:p-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-700 border border-slate-200 sm:border-none outline-none"/>
                              </div>
                            </div>
                            
                            <button type="submit" className="w-full sm:w-auto justify-center bg-[#302464] hover:bg-[#7C69AF] text-white p-3 sm:p-2.5 rounded-xl transition-colors shadow-sm flex items-center gap-2 mt-2 sm:mt-0">
                              <PlusCircle size={18} className="sm:hidden"/>
                              <PlusCircle size={20} className="hidden sm:block"/>
                              <span className="sm:hidden font-bold text-sm">Adicionar Item</span>
                            </button>
                        </div>
                    </form>
                )}
            </DetailCard>

            <div className="grid sm:grid-cols-2 gap-6">
              <DetailCard icon={User} title="Cliente">
                  <InfoRow label="Nome / Razão" value={venda.cliente.razao_social} />
                  <InfoRow label="A/C (Solicitante)" value={venda.solicitante?.nome || '--'} />
                  <InfoRow label="Tel. Solicitante" value={venda.solicitante?.telefone || '--'} />
                  <InfoRow label="Contato" value={venda.cliente.telefone || 'Não informado'} />
              </DetailCard>

              <DetailCard icon={Upload} title="Documentos">
                  {venda.comprovante_pagamento ? (
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-800 truncate pr-2">Comprovante.pdf</span>
                      <a href={venda.comprovante_pagamento} target="_blank" rel="noopener noreferrer" className="shrink-0 text-blue-600 bg-white px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-blue-100 transition-colors shadow-sm">Abrir</a>
                    </div>
                  ) : (
                    <div className="flex flex-col items-stretch gap-3">
                      <div className="w-full border border-slate-200 border-dashed rounded-xl p-2 bg-slate-50">
                          <input 
                            type="file" 
                            onChange={e => setComprovanteFile(e.target.files[0])} 
                            className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-widest file:bg-[#7C69AF]/10 file:text-[#302464] hover:file:bg-[#7C69AF]/20 cursor-pointer"
                          />
                      </div>
                      <button onClick={handleUploadComprovante} disabled={!comprovanteFile} className="bg-[#302464] text-white px-5 py-3 rounded-xl text-xs font-bold disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400 w-full shadow-sm transition-all active:scale-95">
                        Enviar Arquivo
                      </button>
                    </div>
                  )}
              </DetailCard>
            </div>
        </div>

        {/* Resumo Financeiro */}
        <div className="lg:col-span-1">
            <DetailCard icon={DollarSign} title="Resumo Financeiro">
                <InfoRow label="Subtotal" value={`R$ ${(venda.itens || []).reduce((acc, item) => acc + parseFloat(item.valor_total_item), 0).toFixed(2)}`} />
                <InfoRow label="Desconto">
                  <input type="number" step="0.01" value={venda.desconto} onChange={e => setVenda({...venda, desconto: parseFloat(e.target.value) || 0})} onBlur={e => handleUpdateField('desconto', e.target.value)} disabled={!isOrcamento} className="w-full sm:w-28 bg-slate-50 border border-slate-200 sm:border-none sm:bg-slate-100 p-2 sm:p-1.5 rounded-lg text-left sm:text-right font-bold text-red-500 text-sm outline-none focus:ring-2 focus:ring-red-500/20"/>
                </InfoRow>
                <InfoRow label="Entrada">
                  <input type="number" step="0.01" value={venda.valor_entrada} onChange={e => setVenda({...venda, valor_entrada: parseFloat(e.target.value) || 0})} onBlur={e => handleUpdateField('valor_entrada', e.target.value)} disabled={!isOrcamento} className="w-full sm:w-28 bg-slate-50 border border-slate-200 sm:border-none sm:bg-slate-100 p-2 sm:p-1.5 rounded-lg text-left sm:text-right font-bold text-emerald-600 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"/>
                </InfoRow>
                <InfoRow label="Total" value={`R$ ${(venda.valor_total - venda.desconto).toFixed(2)}`} isHighlight/>
                
                <div className="pt-6 mt-6 border-t border-slate-100 space-y-2">
                    <InfoRow label="Forma de Pag.">
                        <select value={venda.forma_pagamento} onChange={e => handleUpdateField('forma_pagamento', e.target.value)} disabled={!isOrcamento} className="w-full sm:w-auto bg-slate-50 border border-slate-200 sm:border-none sm:bg-slate-100 p-2.5 sm:p-1.5 rounded-lg text-xs sm:text-sm font-bold text-slate-700 outline-none">
                          <option value="DINHEIRO">Dinheiro</option>
                          <option value="PIX">PIX</option>
                          <option value="CARTAO_CREDITO">Cartão de Créd.</option>
                          <option value="BOLETO">Boleto</option>
                        </select>
                    </InfoRow>
                    <InfoRow label="Qtd. Parcelas">
                        <input type="number" min="1" value={venda.parcelas} onChange={e => setVenda({...venda, parcelas: parseInt(e.target.value, 10) || 1})} onBlur={e => handleUpdateField('parcelas', e.target.value)} disabled={!isOrcamento} className="w-full sm:w-20 bg-slate-50 border border-slate-200 sm:border-none sm:bg-slate-100 p-2 sm:p-1.5 rounded-lg text-left sm:text-right font-bold text-slate-700 text-sm outline-none"/>
                    </InfoRow>
                </div>
            </DetailCard>
        </div>
      </div>
    </div>
  );
}