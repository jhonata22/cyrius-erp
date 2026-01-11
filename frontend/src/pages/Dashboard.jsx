import { useState, useEffect } from 'react';
import { Ticket, CheckCircle, Clock, AlertCircle, Calendar, Building2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import chamadoService from '../services/chamadoService';

// Sub-componente StatCard refatorado para as cores Cyrius
const StatCard = ({ title, value, icon: Icon, colorClass, bgClass }) => (
  <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
    <div>
      <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{title}</p>
      <h3 className="text-3xl font-black text-slate-800 tracking-tight">{value}</h3>
    </div>
    <div className={`p-4 rounded-2xl transition-colors duration-300 ${bgClass} ${colorClass}`}>
      <Icon size={24} strokeWidth={2.5} />
    </div>
  </div>
);

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chamadoService.getDashboardStats()
      .then(setData)
      .catch(err => console.error("Falha ao carregar dashboard", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex flex-col h-64 items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-[#7C69AF] rounded-full animate-spin"></div>
        <p className="text-[#7C69AF] font-black uppercase tracking-widest text-[10px] animate-pulse">Sincronizando Cyrius...</p>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-500">
      <header className="mb-10">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Dashboard</h1>
        <div className="h-1.5 w-12 bg-[#7C69AF] mt-2 rounded-full"></div>
      </header>

      {/* CARDS PRINCIPAIS */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard title="Total Geral" value={data.total} icon={Ticket} colorClass="text-[#302464]" bgClass="bg-slate-50" />
        <StatCard title="Em Aberto" value={data.abertos} icon={AlertCircle} colorClass="text-amber-500" bgClass="bg-amber-50" />
        <StatCard title="Em Curso" value={data.emAndamento} icon={Clock} colorClass="text-[#7C69AF]" bgClass="bg-purple-50" />
        <StatCard title="Finalizados" value={data.finalizados} icon={CheckCircle} colorClass="text-emerald-500" bgClass="bg-emerald-50" />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* GRÁFICO OTIMIZADO */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <h3 className="font-black text-slate-400 text-[10px] uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
            Distribuição por Status
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.grafico}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
                <Tooltip 
                    cursor={{fill: '#f8fafc'}} 
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} 
                />
                <Bar dataKey="quantidade" radius={[10, 10, 0, 0]} barSize={45}>
                  {data.grafico.map((entry, index) => (
                    <Cell 
                        key={`cell-${index}`} 
                        fill={index === 2 ? '#7C69AF' : index === 0 ? '#302464' : '#A696D1'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CARD DO DIA: ESTILO CYRIUS PREMIUM */}
        <div className="bg-[#302464] rounded-[2.5rem] p-8 text-white shadow-2xl shadow-purple-900/30 relative overflow-hidden group">
            {/* Efeito de onda sutil baseado na sua imagem */}
            <div className="absolute -top-10 -right-10 w-64 h-64 bg-[#7C69AF] opacity-20 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700"></div>
            
            <div className="relative z-10 h-full flex flex-col">
              <div className="flex items-center gap-2 mb-2 text-[#A696D1]">
                <Calendar size={18} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Fluxo: Hoje</span>
              </div>
              
              <div className="mt-6">
                <span className="text-7xl font-black text-white">{data.hoje.quantidade}</span>
                <p className="text-[#A696D1] mt-2 font-bold uppercase tracking-widest text-[10px]">Interações registradas</p>
              </div>

              <div className="mt-auto pt-10">
                <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <Building2 size={14} /> Solicitantes
                </h4>
                
                {data.hoje.empresas.length === 0 ? (
                  <div className="py-4 px-4 rounded-2xl bg-white/5 border border-white/10 text-white/30 text-[10px] font-bold uppercase tracking-widest text-center">
                    Nenhuma atividade
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {data.hoje.empresas.map((empresa, index) => (
                      <span key={index} className="bg-white/10 text-[#A696D1] text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border border-white/10 hover:bg-[#7C69AF] hover:text-white transition-all cursor-default">
                        {empresa}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}