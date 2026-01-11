import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, User, MapPin, Calendar, Clock, 
  AlertCircle, Save, Truck, DollarSign, Users, 
  ChevronRight, Check, X, Settings, Info, Briefcase, AlertTriangle
} from 'lucide-react';

import chamadoService from '../services/chamadoService';
import equipeService from '../services/equipeService';
import clienteService from '../services/clienteService';

const STATUS_MAP = {
  ABERTO: { label: '🔓 Aberto', color: 'bg-emerald-50 text-emerald-600' },
  AGENDADO: { label: '📅 Agendado', color: 'bg-purple-50 text-[#7C69AF]' },
  EM_ANDAMENTO: { label: '🔨 Em Andamento', color: 'bg-blue-50 text-blue-600' },
  FINALIZADO: { label: '✅ Finalizado', color: 'bg-slate-100 text-slate-500' },
  CANCELADO: { label: '🚫 Cancelado', color: 'bg-red-50 text-red-600' },
};

export default function ChamadoDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [chamado, setChamado] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [tecnicos, setTecnicos] = useState([]);

  const [editData, setEditData] = useState({
    status: '', prioridade: '', data_agendamento: '',
    custo_ida: 0, custo_volta: 0
  });

  // Cálculo visual do total
  const custoTotal = useMemo(() => {
    return (parseFloat(editData.custo_ida || 0) + parseFloat(editData.custo_volta || 0));
  }, [editData.custo_ida, editData.custo_volta]);

  const carregarDados = useCallback(async () => {
    try {
      setLoading(true);
      const dados = await chamadoService.buscarPorId(id);
      setChamado(dados);
      
      setEditData({
        status: dados.status,
        prioridade: dados.prioridade,
        custo_ida: dados.custo_ida || 0,
        custo_volta: dados.custo_volta || 0,
        data_agendamento: dados.data_agendamento ? dados.data_agendamento.slice(0, 16) : ''
      });

      const promessas = [];
      if (dados.cliente) promessas.push(clienteService.buscarPorId(dados.cliente));
      if (dados.tecnicos?.length > 0) dados.tecnicos.forEach(tId => promessas.push(equipeService.buscarPorId(tId)));
      const resultados = await Promise.all(promessas);
      if (dados.cliente) { setCliente(resultados[0]); setTecnicos(resultados.slice(1).filter(t => t)); } 
      else { setTecnicos(resultados.filter(t => t)); }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  const handleSalvar = async () => {
    try {
      // Envia os campos individuais. O backend vai somar e salvar o total.
      await chamadoService.atualizar(id, editData);
      alert("Atualizado!");
      carregarDados();
    } catch (error) { alert("Erro ao salvar."); }
  };

  const handleFinalizar = async () => {
    if (window.confirm("Finalizar chamado e lançar custos?")) {
      await chamadoService.finalizar(id);
      carregarDados();
    }
  };

  if (loading) return <div className="p-20 text-center animate-pulse font-black text-[#7C69AF]">Sincronizando...</div>;
  const isVisita = chamado.tipo_atendimento === 'VISITA';

  return (
    <div className="max-w-6xl mx-auto pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <button onClick={() => navigate('/chamados')} className="flex items-center gap-2 text-slate-400 hover:text-[#302464] font-black text-xs uppercase tracking-widest transition-all"><ArrowLeft size={18} /> Voltar</button>
        <div className="flex items-center gap-3 w-full sm:w-auto">
            {chamado.status !== 'FINALIZADO' && <button onClick={handleFinalizar} className="flex-1 sm:flex-none bg-emerald-500 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-lg hover:bg-emerald-600 transition-all"><Check size={18} className="inline mr-2"/> Finalizar</button>}
            <button onClick={handleSalvar} className="flex-1 sm:flex-none bg-[#302464] text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl hover:bg-[#7C69AF] transition-all"><Save size={18} className="inline mr-2"/> Salvar</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 relative">
            <div className={`absolute top-0 right-0 px-6 py-2 rounded-bl-3xl text-[10px] font-black uppercase tracking-widest ${STATUS_MAP[chamado.status]?.color}`}>{chamado.status.replace('_', ' ')}</div>
            <div className="flex items-center gap-3 mb-4"><span className="text-slate-300 font-black text-xl">#{chamado.protocolo}</span><span className="text-[10px] font-black text-[#7C69AF] uppercase tracking-widest">{isVisita ? 'Field Service' : 'Remoto'}</span></div>
            <h1 className="text-3xl font-black text-slate-800 mb-6">{chamado.titulo}</h1>
            <div className="bg-slate-50 p-6 rounded-3xl text-slate-600 text-sm font-medium whitespace-pre-wrap">{chamado.descricao_detalhada}</div>
            <div className="flex flex-wrap gap-8 mt-8 pt-8 border-t border-slate-50">
                <div className="flex items-center gap-3"><div className="p-2.5 bg-purple-50 rounded-xl text-[#7C69AF]"><Clock size={18} /></div><div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Abertura</p><p className="text-sm font-bold text-slate-700">{new Date(chamado.created_at).toLocaleString('pt-BR')}</p></div></div>
                <div className="flex items-center gap-3"><div className="p-2.5 bg-purple-50 rounded-xl text-[#7C69AF]"><Info size={18} /></div><div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Origem</p><p className="text-sm font-bold text-slate-700">{chamado.origem}</p></div></div>
            </div>
          </div>

          {isVisita && (
              <div className="bg-gradient-to-br from-[#302464] to-[#7C69AF] p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
                  <Truck className="absolute -right-4 -bottom-4 text-white opacity-10" size={120} />
                  <h3 className="text-lg font-black mb-6 uppercase tracking-widest text-[#A696D1] flex items-center gap-2"><Calendar size={20} /> Agendamento e Deslocamento</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                    <div><label className="text-[10px] font-black text-[#A696D1] uppercase tracking-widest">Data</label><input type="datetime-local" className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3 font-bold focus:bg-white focus:text-[#302464]" value={editData.data_agendamento} onChange={e => setEditData({...editData, data_agendamento: e.target.value})} /></div>
                    
                    <div className="grid grid-cols-3 gap-2 bg-white/10 p-3 rounded-2xl border border-white/20">
                        <div><label className="text-[8px] font-black uppercase text-[#A696D1]">Ida (R$)</label><input type="number" className="w-full bg-transparent border-b border-white/30 text-center font-bold outline-none" value={editData.custo_ida} onChange={e => setEditData({...editData, custo_ida: e.target.value})} /></div>
                        <div><label className="text-[8px] font-black uppercase text-[#A696D1]">Volta (R$)</label><input type="number" className="w-full bg-transparent border-b border-white/30 text-center font-bold outline-none" value={editData.custo_volta} onChange={e => setEditData({...editData, custo_volta: e.target.value})} /></div>
                        <div className="text-right"><p className="text-[8px] font-black uppercase text-[#A696D1]">Total R$</p><p className="text-lg font-black text-white">{custoTotal.toFixed(2)}</p></div>
                    </div>
                  </div>
              </div>
          )}
        </div>

        {/* COLUNA LATERAL (MANTIDA) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100"><h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Settings size={14} /> Status</h3><select value={editData.status} onChange={e => setEditData({...editData, status: e.target.value})} className="w-full bg-slate-50 rounded-2xl p-3 font-bold text-slate-700 outline-none mb-3">{Object.entries(STATUS_MAP).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}</select></div>
          {cliente && <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100"><h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Briefcase size={14} /> Cliente</h3><p className="font-black text-slate-800">{cliente.razao_social}</p><p className="text-xs text-slate-500 mt-2 font-bold flex items-center gap-1"><MapPin size={12}/> {cliente.endereco}</p></div>}
        </div>
      </div>
    </div>
  );
}