import { useState, useEffect } from 'react';
import { X, Sparkles, Wrench } from 'lucide-react';
import { SYSTEM_UPDATE } from '../constants/changelog';

export default function ReleaseNotesModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const lastSeenVersion = localStorage.getItem('last_seen_version');
    if (lastSeenVersion !== SYSTEM_UPDATE.version) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem('last_seen_version', SYSTEM_UPDATE.version);
    setIsOpen(false);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg mx-auto border-t-4 border-purple-500">
        <div className="p-8 relative">
            <div className="text-center mb-6">
                <span className="text-xs font-bold text-white bg-purple-500 px-3 py-1 rounded-full">NOVA VERSÃO</span>
                <h2 className="text-3xl font-black text-slate-800 mt-3">{SYSTEM_UPDATE.title}</h2>
                <p className="text-sm text-slate-500 mt-1">Lançada em: {SYSTEM_UPDATE.date}</p>
            </div>
          
            <p className="text-center text-slate-600 mb-8">{SYSTEM_UPDATE.description}</p>

            <div className="space-y-6">
                {SYSTEM_UPDATE.features && SYSTEM_UPDATE.features.length > 0 && (
                    <div>
                        <h3 className="text-lg font-bold text-slate-700 mb-3 flex items-center gap-2">
                            <Sparkles className="text-yellow-500" size={20} />
                            ✨ Novidades
                        </h3>
                        <ul className="space-y-2 list-inside text-slate-600">
                            {SYSTEM_UPDATE.features.map((feature, index) => (
                                <li key={index} className="flex items-start gap-2">
                                    <span className="text-purple-500 font-bold">✓</span>
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {SYSTEM_UPDATE.fixes && SYSTEM_UPDATE.fixes.length > 0 && (
                    <div>
                        <h3 className="text-lg font-bold text-slate-700 mb-3 flex items-center gap-2">
                            <Wrench className="text-blue-500" size={20} />
                            🔧 Correções
                        </h3>
                        <ul className="space-y-2 list-inside text-slate-600">
                            {SYSTEM_UPDATE.fixes.map((fix, index) => (
                                <li key={index} className="flex items-start gap-2">
                                    <span className="text-purple-500 font-bold">✓</span>
                                    <span>{fix}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            <div className="mt-10 text-center">
                <button 
                    onClick={handleClose} 
                    className="bg-purple-600 text-white font-bold py-3 px-8 rounded-full hover:bg-purple-700 transition-all w-full sm:w-auto shadow-lg"
                >
                    Entendi, fechar
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}
