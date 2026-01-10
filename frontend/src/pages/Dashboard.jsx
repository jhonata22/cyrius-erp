import { useState, useEffect } from 'react';
// REMOVIDO: import axios from 'axios';
import { Ticket, CheckCircle, Clock, AlertCircle, Calendar, Building2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// IMPORTAÇÃO DO SERVIÇO
import chamadoService from '../services/chamadoService';

export default function Dashboard() {
  const [estatisticas, setEstatisticas] = useState({
    total: 0,
    abertos: 0,
    emAndamento: 0,
    finalizados: 0
  });

  const [resumoHoje, setResumoHoje] = useState({
    quantidade: 0,
    empresas: []
  });

  const [dadosGrafico, setDadosGrafico] = useState([]);

  useEffect(() => {
    // REFATORADO: Usando o serviço centralizado
    chamadoService.listar()
      .then(chamados => {
        // 1. Cálculos Gerais
        const total = chamados.length;
        const abertos = chamados.filter(c => c.status === 'ABERTO').length;
        const emAndamento = chamados.filter(c => c.status === 'EM_ANDAMENTO').length;
        const finalizados = chamados.filter(c => c.status === 'FINALIZADO').length;

        setEstatisticas({ total, abertos, emAndamento, finalizados });

        // 2. Cálculos do Dia (HOJE)
        const dataHoje = new Date().toISOString().split('T')[0];
        const chamadosDoDia = chamados.filter(c => c.data_abertura && c.data_abertura.startsWith(dataHoje));
        const empresasUnicas = [...new Set(chamadosDoDia.map(c => c.nome_cliente))];

        setResumoHoje({
          quantidade: chamadosDoDia.length,
          empresas: empresasUnicas
        });

        // 3. Monta o gráfico
        setDadosGrafico([
          { name: 'Abertos', quantidade: abertos, color: '#F6993F' },
          { name: 'Em Andamento', quantidade: emAndamento, color: '#3b82f6' },
          { name: 'Finalizados', quantidade: finalizados, color: '#2ecc71' },
        ]);
      })
      .catch(error => console.error("Erro ao carregar dashboard:", error));
  }, []);

  // Componente interno StatCard (Mantido)
  const StatCard = ({ title, value, icon: Icon, colorClass, bgClass }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
      <div>
        <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">{title}</p>
        <h3 className="text-3xl font-bold text-gray-800 mt-1">{value}</h3>
      </div>
      <div className={`p-4 rounded-full ${bgClass} ${colorClass}`}>
        <Icon size={24} strokeWidth={2.5} />
      </div>
    </div>
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Visão Geral</h1>
        <p className="text-gray-500 text-sm mt-1">Acompanhe as métricas do suporte em tempo real.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Geral" value={estatisticas.total} icon={Ticket} colorClass="text-purple-600" bgClass="bg-purple-50" />
        <StatCard title="Em Aberto" value={estatisticas.abertos} icon={AlertCircle} colorClass="text-orange-500" bgClass="bg-orange-50" />
        <StatCard title="Em Andamento" value={estatisticas.emAndamento} icon={Clock} colorClass="text-blue-500" bgClass="bg-blue-50" />
        <StatCard title="Finalizados" value={estatisticas.finalizados} icon={CheckCircle} colorClass="text-green-500" bgClass="bg-green-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* GRÁFICO */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-6">Volume por Status</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosGrafico}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <Tooltip cursor={{fill: '#f4f6f9'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="quantidade" radius={[4, 4, 0, 0]} barSize={60}>
                  {dadosGrafico.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CARD DO DIA */}
        <div className="bg-gradient-to-br from-primary-dark to-[#1a1b4b] rounded-xl p-6 text-white flex flex-col shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-5 rounded-full blur-3xl -mr-10 -mt-10"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2 text-primary-light">
                <Calendar size={20} />
                <span className="text-sm font-bold uppercase tracking-wider">Resumo de Hoje</span>
              </div>
              
              <div className="mt-4">
                <span className="text-5xl font-bold">{resumoHoje.quantidade}</span>
                <span className="text-gray-300 ml-2 text-lg">novos chamados</span>
              </div>

              <div className="mt-8 border-t border-white/10 pt-4">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Building2 size={16} />
                  Empresas Solicitantes:
                </h4>
                
                {resumoHoje.empresas.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">Nenhuma atividade hoje.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {resumoHoje.empresas.map((empresa, index) => (
                      <span key={index} className="bg-white/10 text-xs px-2 py-1 rounded border border-white/20">
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