import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Ticket, CheckCircle, Clock, AlertCircle, 
  Filter, Wrench, Briefcase, Truck, ChevronRight, User, Trophy 
} from 'lucide-react';
import { BarChart, Bar, XAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

import chamadoService from '../services/chamadoService';
import servicoService from '../services/servicoService'; 

const ListItem = ({ title, subtitle, status, date, type, onClick, priority }) => (
  <div onClick={onClick} className="group flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl cursor-pointer transition-all border-b border-slate-50 last:border-0">
    <div className="flex items-center gap-4">
      <div className={`p-3 rounded-xl shrink-0 ${type === 'SERVICE' ? 'bg-indigo-50 text-indigo-600' : 'bg-purple-50 text-[#7C69AF]'}`}>
        {status === 'AGENDADO' ? <Truck size={20} /> : type === 'SERVICE' ? <Wrench size={20} /> : <Ticket size={20} />}
      </div>
      <div>
        <h4 className="text-sm font-black text-slate-700 group-hover:text-[#302464] transition-colors line-clamp-1">{title}</h4>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-2">
            {subtitle}
            {priority && <span className={`px-1.5 py-0.5 rounded text-[8px] ${priority === 'CRITICA' ? 'bg-red-100 text-red-600' : 'bg-slate-100'}`}>{priority}</span>}
        </p>
      </div>
    </div>
    <div className="text-right">
       <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{date}</span>
       <span className={`text-[9px] px-2 py-1 rounded-lg font-black uppercase tracking-widest ${
          status === 'ABERTO' || status === 'ORCAMENTO' ? 'bg-amber-50 text-amber-600' : 
          status === 'AGENDADO' || status === 'APROVADO' ? 'bg-blue-50 text-blue-600' : 
          status === 'EM_EXECUCAO' ? 'bg-purple-50 text-purple-600' :
          'bg-emerald-50 text-emerald-600'
       }`}>
          {status ? status.replace('_', ' ') : 'N/A'}
       </span>
    </div>
  </div>
);

const StatCard = ({ title, value, icon: Icon, colorClass, bgClass }) => (
  <div className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-all">
    <div>
      <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.1em] mb-1">{title}</p>
      <h3 className="text-2xl font-black text-slate-800 tracking-tight">{value}</h3>
    </div>
    <div className={`p-3 rounded-xl ${bgClass} ${colorClass}`}>
      <Icon size={20} strokeWidth={2.5} />
    </div>
  </div>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [pendentes, setPendentes] = useState([]); 
  const [emAndamento, setEmAndamento] = useState([]); 
  const [servicosAtivos, setServicosAtivos] = useState([]); 
  const [ultimoResolvido, setUltimoResolvido] = useState(null);
  const [rankingTecnicos, setRankingTecnicos] = useState([]);

  const [mesFiltro, setMesFiltro] = useState(() => {
    const agora = new Date();
    return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    const fetchDados = async () => {
        setLoading(true);
        try {
            const [stats, resServicos] = await Promise.all([
                chamadoService.getDashboardStats(mesFiltro),
                servicoService.listar(),
            ]);
            
            setData(stats);

            setPendentes(stats.ultimos_pendentes || []);
            setEmAndamento(stats.em_andamento || []);
            setUltimoResolvido(stats.ultimos_resolvidos?.[0] || null);
            setRankingTecnicos(stats.ranking_tecnicos || []);

            const listaServicos = Array.isArray(resServicos) ? resServicos : (resServicos.results || []);
            const statusServicos = ['ORCAMENTO', 'APROVADO', 'EM_EXECUCAO', 'AGUARDANDO_PECA'];
            setServicosAtivos(listaServicos.filter(s => statusServicos.includes(s.status)).slice(0, 5));

        } catch (err) {
            console.error("Erro dashboard:", err);
            setData({ total: 0, abertos: 0, emAndamento: 0, finalizados: 0, grafico: [], ultimos_pendentes: [], em_andamento: [] });
        } finally {
            setLoading(false);
        }
    };
    fetchDados();
}, [mesFiltro]);

  const maisAntigo = data?.ultimos_pendentes?.[data.ultimos_pendentes.length - 1];

  if (loading || !data) return (
    <div className="flex flex-col h-64 items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-[#7C69AF] rounded-full animate-spin"></div>
        <p className="text-[#7C69AF] font-black uppercase tracking-widest text-[10px] animate-pulse">Sincronizando Operação...</p>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-500 pb-10">
      
      {/* HEADER */}
      <header className="flex flex-col sm:flex-row justify-between items-end sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Dashboard Operacional</h1>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Monitoramento de Desempenho</p>
        </div>

        <div className="flex items-center gap-3 bg-white p-1.5 px-3 rounded-xl border border-slate-100 shadow-sm">
          <Filter size={14} className="text-[#7C69AF]" />
          <input type="month" value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)}
            className="outline-none bg-transparent font-black text-slate-600 text-xs cursor-pointer"/>
        </div>
      </header>

      {/* CARDS KPI */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Atendimentos" value={data.total} icon={Briefcase} colorClass="text-[#302464]" bgClass="bg-slate-50" />
        <StatCard title="Fila (Abertos)" value={data.abertos} icon={AlertCircle} colorClass="text-amber-600" bgClass="bg-amber-50" />
        <StatCard title="Em Execução" value={data.emAndamento} icon={Clock} colorClass="text-[#7C69AF]" bgClass="bg-purple-50" />
        <StatCard title="Concluídos" value={data.finalizados} icon={CheckCircle} colorClass="text-emerald-600" bgClass="bg-emerald-50" />
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* COLUNA 1: FILA E RANKING */}
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                <h3 className="font-black text-[#302464] text-sm uppercase tracking-widest flex items-center gap-2 mb-6">
                    <AlertCircle size={16} className="text-amber-500"/> Fila de Espera
                </h3>
                <div className="space-y-1">
                    {pendentes.length > 0 ? pendentes.map(item => (
                        <ListItem key={item.id} title={item.titulo} subtitle={item.nome_cliente} status={item.status} priority={item.prioridade}
                            date={new Date(item.created_at).toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'})}
                            type="TICKET" onClick={() => navigate(`/chamados/${item.id}`)} />
                    )) : (
                      <p className="text-center py-6 text-slate-400 text-xs font-bold uppercase">Fila vazia</p>
                    )}
                </div>
            </div>

            {/* CARD DE RANKING DE TÉCNICOS */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                <h3 className="font-black text-[#302464] text-sm uppercase tracking-widest flex items-center gap-2 mb-6">
                    <Trophy size={16} className="text-yellow-500"/> Ranking da Equipe
                </h3>
                <div className="space-y-4">
                    {rankingTecnicos.length > 0 ? rankingTecnicos.map((tec, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-colors shadow-sm
                                    ${index === 0 ? 'bg-yellow-400 text-white' : 
                                      index === 1 ? 'bg-slate-300 text-white' : 
                                      index === 2 ? 'bg-amber-600 text-white' : 
                                      'bg-slate-200 text-slate-500'}`}>
                                    {index + 1}º
                                </div>
                                <span className="text-sm font-black text-slate-700">{tec.nome}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-[#7C69AF]">{tec.total}</span>
                                <CheckCircle size={14} className="text-emerald-500" />
                            </div>
                        </div>
                    )) : (
                      <div className="text-center py-6">
                        <User size={32} className="mx-auto text-slate-100 mb-2" />
                        <p className="text-slate-400 text-xs font-bold uppercase">Sem conclusões este mês</p>
                      </div>
                    )}
                </div>
            </div>
        </div>

        {/* COLUNA 2: OPERACIONAL */}
        <div className="space-y-6">
             <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                <h3 className="font-black text-[#7C69AF] text-sm uppercase tracking-widest flex items-center gap-2 mb-6">
                    <Clock size={16}/> Em Andamento / Visitas
                </h3>
                <div className="space-y-1">
                    {emAndamento.length > 0 ? emAndamento.map(c => (
                        <ListItem key={c.id} title={c.titulo} subtitle={c.nome_cliente} status={c.status}
                            date={c.data_agendamento ? new Date(c.data_agendamento).toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'}) : 'Hoje'}
                            type="TICKET" onClick={() => navigate(`/chamados/${c.id}`)} />
                    )) : (
                        <p className="text-center py-10 text-slate-400 text-xs font-bold uppercase">Nenhum chamado em curso</p>
                    )}
                </div>
             </div>

             <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                <h3 className="font-black text-indigo-500 text-sm uppercase tracking-widest flex items-center gap-2 mb-6">
                    <Wrench size={16}/> Serviços Ativos
                </h3>
                <div className="space-y-1">
                    {servicosAtivos.length > 0 ? servicosAtivos.map(os => (
                        <ListItem key={os.id} title={os.titulo} subtitle={os.nome_cliente} status={os.status}
                            date={new Date(os.created_at).toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'})}
                            type="SERVICE" onClick={() => navigate(`/servicos/${os.id}`)} />
                    )) : (
                        <p className="text-center py-10 text-slate-400 text-xs font-bold uppercase">Nenhum serviço em aberto</p>
                    )}
                </div>
             </div>
        </div>

        {/* COLUNA 3: GRÁFICO E ÚLTIMA CONCLUSÃO */}
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                <h3 className="font-black text-slate-400 text-[10px] uppercase tracking-[0.2em] mb-4">Volume Mensal</h3>
                <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.grafico || []}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 9, fontWeight: 700}} dy={10} />
                        <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '11px' }} />
                        <Bar dataKey="quantidade" radius={[6, 6, 0, 0]} barSize={30}>
                        {(data.grafico || []).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#302464' : index === 1 ? '#7C69AF' : '#10b981'} />
                        ))}
                        </Bar>
                    </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-[2rem] shadow-sm">
                 <h3 className="font-black text-emerald-800 text-[10px] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <CheckCircle size={14} className="text-emerald-500"/> Último Resolvido
                 </h3>
                 {ultimoResolvido ? (
                     <div onClick={() => navigate(`/chamados/${ultimoResolvido.id}`)} className="cursor-pointer group">
                        <p className="text-sm font-black text-emerald-900 line-clamp-1 group-hover:underline">{ultimoResolvido.titulo}</p>
                        <p className="text-[10px] font-bold text-emerald-600/70 uppercase mt-1">{ultimoResolvido.nome_cliente}</p>
                        <div className="mt-4 flex items-center justify-between text-[10px] font-black text-emerald-800/40">
                            <span className="flex items-center gap-1 uppercase tracking-widest"><Clock size={10}/> Concluído em {new Date(ultimoResolvido.updated_at || ultimoResolvido.created_at).toLocaleDateString()}</span>
                            <ChevronRight size={14} />
                        </div>
                     </div>
                 ) : (
                     <p className="text-emerald-600/50 text-[10px] font-black uppercase text-center py-4">Nenhum concluído recentemente</p>
                 )}
            </div>

            {/* NOVO CARD: MAIS ANTIGO NA FILA */}
            <div className="bg-amber-50 border border-amber-100 p-6 rounded-[2rem] shadow-sm mt-6">
                 <h3 className="font-black text-amber-800 text-[10px] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <AlertCircle size={14} className="text-amber-500"/> Atenção: Mais Antigo na Fila
                 </h3>
                 {maisAntigo ? (
                     <div onClick={() => navigate(`/chamados/${maisAntigo.id}`)} className="cursor-pointer group">
                        <p className="text-sm font-black text-amber-900 line-clamp-1 group-hover:underline">{maisAntigo.titulo}</p>
                        <p className="text-[10px] font-bold text-amber-700 uppercase mt-1">{maisAntigo.nome_cliente}</p>
                        <div className="mt-4 flex items-center justify-between text-[10px] font-black text-amber-800/40">
                            <span className="flex items-center gap-1 uppercase tracking-widest"><Clock size={10}/> Aberto há {Math.floor((new Date() - new Date(maisAntigo.created_at)) / (1000 * 60 * 60 * 24))} dias</span>
                            <ChevronRight size={14} />
                        </div>
                     </div>
                 ) : (
                     <p className="text-amber-600/50 text-[10px] font-black uppercase text-center py-4">Nenhum chamado pendente</p>
                 )}
            </div>
        </div>

      </div>
    </div>
  );
}