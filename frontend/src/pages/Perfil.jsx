import { useState, useEffect } from 'react';
import { User, Ticket, CheckCircle, Clock, Calendar, Shield, Award } from 'lucide-react';
import equipeService from '../services/equipeService';

export default function Perfil() {
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    equipeService.getMe().then(setDados).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-20 text-center animate-pulse text-[#7C69AF] font-bold">Carregando seu Perfil...</div>;

  const stats = dados.estatisticas_mes;

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in duration-500">
      {/* CAPA / HEADER PERFIL */}
      <div className="bg-[#302464] rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#7C69AF] opacity-20 rounded-full blur-3xl -mr-20 -mt-20"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="w-32 h-32 bg-white/10 backdrop-blur-md rounded-[2.5rem] border-4 border-white/10 flex items-center justify-center text-5xl font-black shadow-inner">
            {dados.nome.charAt(0)}
          </div>
          <div className="text-center md:text-left">
            <h1 className="text-4xl font-black tracking-tight">{dados.nome}</h1>
            <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-3">
              <span className="bg-orange-500 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{dados.cargo}</span>
              <span className="bg-white/10 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 flex items-center gap-2">
                <Shield size={12} /> Nível {dados.cargo === 'GESTOR' ? 'Avançado' : 'Operacional'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* METRICAS MENSAIS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Chamados no Mês</p>
            <p className="text-4xl font-black text-[#302464]">{stats.total_mes}</p>
        </div>
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Resolvidos por Você</p>
            <p className="text-4xl font-black text-emerald-500">{stats.finalizados}</p>
        </div>
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Em Aberto</p>
            <p className="text-4xl font-black text-amber-500">{stats.em_aberto}</p>
        </div>
      </div>

      <div className="bg-emerald-50 p-8 rounded-[2.5rem] border border-emerald-100 flex items-center gap-6">
        <div className="p-4 bg-white rounded-2xl text-emerald-600 shadow-sm"><Award size={32} /></div>
        <div>
            <h3 className="font-black text-emerald-900 text-xl">Desempenho Excelente!</h3>
            <p className="text-emerald-700 text-sm font-medium">Você concluiu {((stats.finalizados / stats.total_mes) * 100 || 0).toFixed(0)}% dos seus atendimentos este mês.</p>
        </div>
      </div>
    </div>
  );
}