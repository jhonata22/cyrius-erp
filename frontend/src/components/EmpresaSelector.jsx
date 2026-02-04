import React from 'react';
import { useEmpresa } from '../contexts/EmpresaContext';
import { Building2, ChevronDown, Globe } from 'lucide-react'; // Importei Globe para ícone global

export default function EmpresaSelector() {
  const { empresas, empresaSelecionada, trocarEmpresa, loading } = useEmpresa();

  if (loading) return <div className="text-xs text-slate-400 animate-pulse">Carregando...</div>;
  
  // Se não tiver empresas cadastradas, não mostra nada
  if (!empresas || empresas.length === 0) return null;

  return (
    <div className="relative group">
      {/* --- CAMADA VISUAL --- */}
      <div className="flex items-center gap-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl transition-all cursor-pointer min-w-[200px]">
        
        {/* Ícone: Se for "Todas", mostra um Globo. Se for específica, mostra Prédio */}
        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shadow-sm 
          ${!empresaSelecionada 
            ? 'bg-blue-50 border-blue-100 text-blue-600' // Estilo para "Todas"
            : 'bg-white border-slate-100 text-[#7C69AF]' // Estilo para Específica
          }`}>
          {!empresaSelecionada ? <Globe size={18} /> : <Building2 size={18} />}
        </div>

        <div className="flex flex-col flex-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-0.5">
            Visualização
          </span>
          <span className="text-sm font-bold text-slate-700 truncate max-w-[140px]">
            {/* Se for null, escreve Todas as Empresas */}
            {empresaSelecionada?.nome_fantasia || empresaSelecionada?.razao_social || "Todas as Empresas"}
          </span>
        </div>

        <ChevronDown size={16} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
      </div>

      {/* --- CAMADA FUNCIONAL --- */}
      <select 
        value={empresaSelecionada?.id || 'todas'} // Valor 'todas' quando for null
        onChange={(e) => {
          const valor = e.target.value;
          if (valor === 'todas') {
            trocarEmpresa(null);
          } else {
            const id = parseInt(valor);
            const emp = empresas.find(ep => ep.id === id);
            trocarEmpresa(emp);
          }
        }}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer appearance-none z-10"
      >
        {/* Opção Padrão Global */}
        <option value="todas">Todas as Empresas (Visão Global)</option>
        
        {/* Separador visual (opcional, nem todo browser renderiza) */}
        <option disabled>──────────</option>

        {/* Lista de Empresas */}
        {empresas.map(emp => (
          <option key={emp.id} value={emp.id}>
            {emp.nome_fantasia || emp.razao_social}
          </option>
        ))}
      </select>
    </div>
  );
}