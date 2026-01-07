import { useState, useEffect } from 'react';
// Deixamos o serviço api importado para quando você for buscar os dados
import api from '../services/api'; 
import { Package, Plus, Search, Filter } from 'lucide-react';

export default function Inventario() {
  // Estado para quando você for listar os equipamentos
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(false);

  /**
   * Exemplo de como será o carregamento futuro:
   * * useEffect(() => {
   * api.get('/inventario/').then(res => setItens(res.data));
   * }, []);
   */

  return (
    <div className="h-full">
      {/* Cabeçalho da Página (Já seguindo o padrão das outras) */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Inventário de TI</h1>
          <p className="text-gray-500 text-sm mt-1">Controle de hardware, periféricos e suprimentos.</p>
        </div>
        
        {/* Botão desabilitado por enquanto */}
        <button 
          disabled
          className="bg-gray-200 text-gray-400 px-5 py-2.5 rounded-lg flex items-center gap-2 cursor-not-allowed text-sm font-bold"
        >
          <Plus size={18} />
          Novo Item
        </button>
      </div>

      {/* Conteúdo Placeholder Centralizado */}
      <div className="flex flex-col items-center justify-center h-[50vh] bg-white rounded-2xl border-2 border-dashed border-gray-100 shadow-sm">
        <div className="bg-blue-50 p-6 rounded-full mb-4 text-blue-500">
          <Package size={48} />
        </div>
        <h2 className="text-xl font-bold text-gray-700">Módulo em Desenvolvimento</h2>
        <p className="text-gray-500 max-w-xs text-center mt-2 text-sm">
          Estamos preparando uma gestão completa de ativos, incluindo números de série, notas fiscais e histórico de manutenção.
        </p>
        
        <div className="mt-8 flex gap-2">
            <span className="px-3 py-1 bg-gray-100 text-gray-400 text-[10px] font-bold rounded-full uppercase tracking-widest">Hardware</span>
            <span className="px-3 py-1 bg-gray-100 text-gray-400 text-[10px] font-bold rounded-full uppercase tracking-widest">Periféricos</span>
            <span className="px-3 py-1 bg-gray-100 text-gray-400 text-[10px] font-bold rounded-full uppercase tracking-widest">Suprimentos</span>
        </div>
      </div>
    </div>
  );
}