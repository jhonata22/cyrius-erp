import { useState, useEffect } from 'react';
import { Ticket, CheckCircle, Clock, Shield, Award, Calendar } from 'lucide-react';
import equipeService from '../services/equipeService';

export default function Perfil() {
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    equipeService.getMe()
      .then(setDados)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex flex-col h-screen items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-[#7C69AF] rounded-full animate-spin"></div>
        <p className="text-[#7C69AF] font-black uppercase tracking-widest text-[10px]">Carregando Perfil...</p>
    </div>
  );

  // Garante que stats exista mesmo se vier nulo do backend
  const stats = dados?.estatisticas_mes || { total_mes: 0, finalizados: 0, em_aberto: 0 };
  
  // Cálculo seguro da eficiência (evita divisão por zero)
  const eficiencia = stats.total_mes > 0 
    ? Math.round((stats.finalizados / stats.total_mes) * 100) 
    : 0;

  // Nome do mês atual
  const mesAtual = new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in duration-500 pb-20">
      
      {/* CAPA / HEADER PERFIL */}
      <div className="bg-[#302464] rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden mb-10">
        {/* Efeitos de Fundo */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#7C69AF] opacity-20 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-[#A696D1] opacity-10 rounded-full blur-3xl -ml-10 -mb-10"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          {/* FOTO OU INICIAL */}
          <div className="shrink-0">
            {dados.foto ? (
                <img 
                    src={dados.foto} 
                    alt={dados.nome} 
                    className="w-32 h-32 rounded-[2.5rem] object-cover border-4 border-white/20 shadow-xl"
                />
            ) : (
                <div className="w-32 h-32 bg-white/10 backdrop-blur-md rounded-[2.5rem] border-4 border-white/10 flex items-center justify-center text-5xl font-black shadow-inner text-white">
                    {dados.nome.charAt(0)}
                </div>
            )}
          </div>

          <div className="text-center md:text-left flex-1">
            <h1 className="text-4xl font-black tracking-tight">{dados.nome}</h1>
            <p className="text-[#A696D1] font-bold text-sm mt-1 mb-4 flex items-center justify-center md:justify-start gap-2">
                <span className="opacity-60">@{dados.username}</span>
            </p>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              <span className="bg-[#7C69AF] text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                {dados.cargo}
              </span>
              <span className="bg-white/10 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 flex items-center gap-2">
                <Shield size={12} /> Acesso {dados.cargo === 'GESTOR' || dados.cargo === 'SOCIO' ? 'Total' : 'Restrito'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* TÍTULO DA SEÇÃO */}
      <div className="flex items-center gap-2 mb-6 px-4">
        <Calendar size={18} className="text-[#7C69AF]" />
        <h3 className="font-black text-slate-700 text-sm uppercase tracking-widest">
            Performance em <span className="text-[#302464] capitalize">{mesAtual}</span>
        </h3>
      </div>

      {/* METRICAS MENSAIS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm text-center group hover:border-[#7C69AF]/30 transition-all">
            <div className="mb-4 inline-flex p-3 bg-slate-50 text-[#302464] rounded-2xl group-hover:bg-[#302464] group-hover:text-white transition-colors">
                <Ticket size={24} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Atendimentos</p>
            <p className="text-4xl font-black text-slate-800">{stats.total_mes}</p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm text-center group hover:border-emerald-200 transition-all">
            <div className="mb-4 inline-flex p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                <CheckCircle size={24} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Resolvidos</p>
            <p className="text-4xl font-black text-emerald-600">{stats.finalizados}</p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm text-center group hover:border-amber-200 transition-all">
            <div className="mb-4 inline-flex p-3 bg-amber-50 text-amber-600 rounded-2xl group-hover:bg-amber-500 group-hover:text-white transition-colors">
                <Clock size={24} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Pendentes</p>
            <p className="text-4xl font-black text-amber-500">{stats.em_aberto}</p>
        </div>
      </div>

      {/* CARD DE EFICIÊNCIA */}
      <div className="bg-gradient-to-r from-[#F1F0FB] to-white p-8 rounded-[2.5rem] border border-[#A696D1]/20 flex items-center gap-6 shadow-sm">
        <div className="p-5 bg-white rounded-3xl text-[#7C69AF] shadow-lg shadow-purple-900/5">
            <Award size={36} />
        </div>
        <div>
            <h3 className="font-black text-[#302464] text-lg mb-1">Índice de Eficiência</h3>
            <p className="text-slate-600 text-sm font-medium leading-relaxed">
                Você concluiu <strong className="text-[#7C69AF]">{eficiencia}%</strong> dos chamados atribuídos a você neste mês. 
                {eficiencia === 100 ? " Trabalho impecável! 🚀" : " Continue avançando!"}
            </p>
            
            {/* Barra de Progresso Visual */}
            <div className="w-full bg-white h-3 rounded-full mt-4 overflow-hidden border border-slate-100">
                <div 
                    className="h-full bg-gradient-to-r from-[#302464] to-[#7C69AF] rounded-full transition-all duration-1000 ease-out" 
                    style={{ width: `${eficiencia}%` }}
                ></div>
            </div>
        </div>
      </div>
    </div>
  );
}