import { useState } from 'react';
import { CheckCircle, DollarSign, AlertTriangle, X, UploadCloud, FileText, Trash2, Loader2 } from 'lucide-react';

export default function ModalFinalizar({ isOpen, onClose, onConfirm, chamado }) {
  const [resolucao, setResolucao] = useState('');
  const [valor, setValor] = useState('');
  const [arquivo, setArquivo] = useState(null);
  const [enviando, setEnviando] = useState(false); // Melhoria 2: Estado de loading

  const isAvulso = chamado?.cliente_detalhes?.tipo_cliente === 'AVULSO';

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Melhoria 1: Validação de Segurança
    if (isAvulso) {
      if (!valor || parseFloat(valor) <= 0) return alert("Para clientes avulsos, informe o valor do serviço.");
      if (!arquivo) return alert("Obrigatório anexar o comprovante/OS para clientes avulsos.");
    }

    try {
      setEnviando(true);
      await onConfirm({
        resolucao,
        valor_servico: isAvulso ? parseFloat(valor) : 0,
        arquivo: arquivo 
      });
    } catch (err) {
      alert("Erro ao finalizar chamado. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#302464]/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg p-8 relative max-h-[90vh] overflow-y-auto border border-white/20">
        
        {/* Botão Fechar */}
        <button 
          onClick={onClose} 
          disabled={enviando}
          className="absolute top-6 right-6 text-slate-300 hover:text-red-500 transition-colors disabled:opacity-0"
        >
          <X size={24} />
        </button>

        <div className="flex items-center gap-4 mb-8">
          <div className="bg-emerald-100 p-4 rounded-3xl text-emerald-600 shadow-sm">
            <CheckCircle size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-[#302464] tracking-tight">Finalizar Atendimento</h2>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Protocolo #{chamado.protocolo}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* RESOLUÇÃO */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
              Relatório de Solução Técnica
            </label>
            <textarea
              required
              disabled={enviando}
              rows="3"
              value={resolucao}
              onChange={(e) => setResolucao(e.target.value)}
              className="w-full bg-slate-50 border-2 border-transparent rounded-3xl p-5 font-medium text-slate-700 focus:border-emerald-500/20 focus:bg-white outline-none resize-none transition-all"
              placeholder="O que foi realizado para resolver o problema?"
            />
          </div>

          {/* UPLOAD - Melhoria Visual */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
              Comprovante / Ordem de Serviço {isAvulso && <span className="text-red-500">*</span>}
            </label>
            
            {!arquivo ? (
              <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-200 rounded-[2rem] cursor-pointer hover:bg-slate-50 hover:border-[#7C69AF] transition-all group bg-slate-50/50">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <div className="p-3 bg-white rounded-2xl shadow-sm mb-3 group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-6 h-6 text-[#7C69AF]" />
                  </div>
                  <p className="text-xs text-slate-500 font-bold">Arraste ou clique para anexar</p>
                  <p className="text-[9px] text-slate-300 font-black uppercase mt-1 tracking-tighter">PDF, PNG ou JPG (Máx 5MB)</p>
                </div>
                <input 
                  type="file" className="hidden" 
                  accept=".pdf, .png, .jpg, .jpeg"
                  onChange={(e) => setArquivo(e.target.files[0])}
                />
              </label>
            ) : (
              <div className="flex items-center justify-between p-5 bg-emerald-50 border-2 border-emerald-100 rounded-[2rem] animate-in zoom-in-95">
                <div className="flex items-center gap-4">
                  <div className="bg-white p-2 rounded-xl shadow-sm"><FileText className="text-emerald-600" size={24} /></div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-black text-emerald-900 truncate max-w-[180px]">{arquivo.name}</p>
                    <p className="text-[9px] text-emerald-600 uppercase font-black tracking-widest">Anexo verificado</p>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => setArquivo(null)}
                  className="p-3 hover:bg-red-100 text-red-500 rounded-2xl transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            )}
          </div>

          {/* FINANCEIRO AVULSO */}
          {isAvulso ? (
            <div className="bg-[#302464] p-6 rounded-[2rem] shadow-xl shadow-purple-900/20 animate-in slide-in-from-bottom-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white/10 rounded-lg text-white"><DollarSign size={18} /></div>
                <h3 className="font-black text-white text-xs uppercase tracking-widest">Valor do Atendimento</h3>
              </div>
              
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-[#A696D1] text-xl">R$</span>
                <input
                  type="number" step="0.01" required disabled={enviando}
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  className="w-full pl-14 pr-6 py-5 bg-white/10 rounded-2xl font-black text-2xl text-white outline-none border-2 border-white/10 focus:border-white/30 transition-all placeholder:text-white/20"
                  placeholder="0.00"
                />
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-3 border border-slate-100">
              <AlertTriangle size={18} className="text-amber-500" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight">
                Cliente de Contrato: Cobrança automática desativada.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={enviando}
            className={`w-full py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-sm shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3
              ${enviando 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-500/20 hover:shadow-emerald-500/40'}`}
          >
            {enviando ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Sincronizando...
              </>
            ) : (
              'Finalizar Agora'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}