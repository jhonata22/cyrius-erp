import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scanner } from '@yudiel/react-qr-scanner';
import { X, Camera, Keyboard, Loader2 } from 'lucide-react';
import ativoService from '../services/ativoService';

export default function AtivoScanner({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('camera');
  const [manualCode, setManualCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const isProcessing = useRef(false);

  const handleSearch = async (code) => {
    if (!code || isProcessing.current) return;

    setIsLoading(true);
    setError('');
    isProcessing.current = true;

    try {
      const asset = await ativoService.buscarPorCodigo(code);
      onClose();
      navigate(`/ativos/${asset.codigo_identificacao}`);
    } catch (err) {
      setError('Ativo não encontrado. Verifique o código e tente novamente.');
      setTimeout(() => setError(''), 3000); // Clear error after 3 seconds
    } finally {
      setIsLoading(false);
      // Allow a new scan after a short delay
      setTimeout(() => { isProcessing.current = false; }, 1000);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    handleSearch(manualCode.toUpperCase());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-6 sm:p-8 relative border border-slate-200">
        <button 
          onClick={onClose} 
          className="absolute top-5 right-5 text-slate-400 hover:text-red-500 bg-slate-100/80 hover:bg-red-50 p-2 rounded-full transition-colors"
        >
          <X size={20} />
        </button>

        <div className="mb-6 flex p-1 bg-slate-100 rounded-2xl">
          <button 
            onClick={() => setActiveTab('camera')} 
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[1.2rem] text-sm font-bold transition-all ${activeTab === 'camera' ? 'bg-white text-[#302464] shadow-md' : 'text-slate-500'}`}>
            <Camera size={16} /> Câmera
          </button>
          <button 
            onClick={() => setActiveTab('manual')} 
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[1.2rem] text-sm font-bold transition-all ${activeTab === 'manual' ? 'bg-white text-[#302464] shadow-md' : 'text-slate-500'}`}>
            <Keyboard size={16} /> Manual
          </button>
        </div>

        <div className="aspect-square w-full rounded-2xl overflow-hidden bg-slate-200 relative flex items-center justify-center">
          {activeTab === 'camera' ? (
            <div className="w-full h-full animate-in fade-in">
              <Scanner
                onScan={(result) => handleSearch(result[0].rawValue)}
                scanDelay={500}
                components={{ corner: false, torch: true }}
                styles={{ container: { width: '100%', height: '100%', paddingTop: 0 } }}
              />
               <div className="absolute inset-0 border-8 border-white/20 rounded-2xl pointer-events-none"></div>
            </div>
          ) : (
            <div className="p-8 w-full animate-in fade-in">
              <form onSubmit={handleManualSubmit}>
                <label className="text-center block text-sm font-bold text-slate-500 mb-2">Digite o Código do Ativo</label>
                <input 
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="w-full text-center font-mono text-4xl font-black tracking-[0.3em] bg-slate-100 p-4 rounded-xl outline-none focus:ring-4 ring-[#7C69AF]/50 transition-all"
                />
                <button type="submit" className="w-full mt-4 bg-[#302464] text-white py-4 rounded-xl font-bold uppercase tracking-wider hover:opacity-90 transition-opacity">
                  Buscar
                </button>
              </form>
            </div>
          )}
          
          {isLoading && (
             <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center gap-2 text-[#302464] font-bold">
                <Loader2 className="animate-spin" />
                Buscando...
             </div>
          )}
        </div>
        {error && <p className="text-center text-red-500 font-bold text-sm mt-4 animate-in fade-in">{error}</p>}
      </div>
    </div>
  );
}