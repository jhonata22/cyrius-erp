import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Monitor, Cpu, Layers, HardDrive, 
  User, Shield, Globe, Save, Trash2, Smartphone, 
  QrCode, Info, ChevronRight, Settings
} from 'lucide-react';
import ativoService from '../services/ativoService';

export default function AtivoDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [ativo, setAtivo] = useState(null);
  const [editData, setEditData] = useState({});

  const carregarAtivo = useCallback(async () => {
    try {
      setLoading(true);
      const dados = await ativoService.buscarPorId(id);
      setAtivo(dados);
      setEditData(dados);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { carregarAtivo(); }, [carregarAtivo]);

  const handleSalvar = async () => {
    try {
      await ativoService.atualizar(id, editData);
      alert("Ficha técnica atualizada!");
      carregarAtivo();
    } catch (error) {
      alert("Erro ao salvar alterações.");
    }
  };

  if (loading) return <div className="p-20 text-center text-[#7C69AF] font-black animate-pulse uppercase tracking-widest text-[10px]">Lendo Hardware...</div>;
  if (!ativo) return <div className="p-20 text-center text-red-500 font-bold">Ativo não localizado.</div>;

  return (
    <div className="max-w-6xl mx-auto pb-20 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-10">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-[#302464] font-black text-[10px] uppercase tracking-widest transition-all group">
          <div className="p-2 bg-white rounded-xl shadow-sm group-hover:shadow-md border border-slate-100"><ArrowLeft size={16} /></div>
          Voltar para Dossiê
        </button>
        <div className="flex gap-3">
            <button onClick={() => {if(window.confirm("Remover este ativo?")) ativoService.excluir(id).then(() => navigate(-1))}} className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-all">
                <Trash2 size={20} />
            </button>
            <button onClick={handleSalvar} className="bg-[#302464] hover:bg-[#7C69AF] text-white px-8 py-3 rounded-2xl flex items-center gap-2 font-black text-sm shadow-xl shadow-purple-900/20 transition-all active:scale-95">
              <Save size={18} /> Atualizar Ficha
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* COLUNA ESQUERDA: QR CODE E IDENTIFICAÇÃO */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[#302464] p-8 rounded-[2.5rem] text-white shadow-2xl shadow-purple-900/30 text-center relative overflow-hidden">
             <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#7C69AF] opacity-20 rounded-full blur-3xl"></div>
             
             {/* Futura Área do QR CODE */}
             <div className="w-48 h-48 bg-white/10 backdrop-blur-md rounded-[2rem] mx-auto mb-6 flex items-center justify-center border-2 border-dashed border-white/20 group hover:border-[#A696D1] transition-all cursor-help">
                <QrCode size={80} className="text-[#A696D1] opacity-50 group-hover:opacity-100 transition-opacity" />
                <span className="absolute bottom-4 text-[8px] font-black uppercase tracking-widest text-white/40">QR Code (Em Breve)</span>
             </div>

             <h2 className="text-xl font-black">{editData.nome}</h2>
             <p className="text-[#A696D1] text-[10px] font-black uppercase tracking-[0.2em] mt-1">{editData.tipo}</p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><Smartphone size={14} className="text-[#7C69AF]"/> Modelo & Marca</h3>
              <input 
                className="w-full bg-slate-50 p-4 rounded-2xl border-none font-bold text-slate-700 outline-none focus:ring-4 focus:ring-purple-100 transition-all"
                value={editData.marca_modelo} onChange={e => setEditData({...editData, marca_modelo: e.target.value})}
                placeholder="Ex: Dell Optiplex 3020"
              />
          </div>
        </div>

        {/* COLUNA DIREITA: HARDWARE E ACESSO */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* HARDWARE INFO */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2"><Cpu size={16} className="text-[#7C69AF]"/> Configuração de Hardware</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-1">Processador</label>
                    <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl">
                        <Cpu size={18} className="text-[#A696D1]"/>
                        <input className="bg-transparent border-none w-full font-bold text-slate-700 outline-none" value={editData.processador} onChange={e => setEditData({...editData, processador: e.target.value})} placeholder="Ex: Core i5 4ª Ger"/>
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-1">Memória RAM</label>
                    <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl">
                        <Layers size={18} className="text-[#A696D1]"/>
                        <input className="bg-transparent border-none w-full font-bold text-slate-700 outline-none" value={editData.memoria_ram} onChange={e => setEditData({...editData, memoria_ram: e.target.value})} placeholder="Ex: 8GB DDR3"/>
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-1">Armazenamento</label>
                    <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl">
                        <HardDrive size={18} className="text-[#A696D1]"/>
                        <input className="bg-transparent border-none w-full font-bold text-slate-700 outline-none" value={editData.armazenamento} onChange={e => setEditData({...editData, armazenamento: e.target.value})} placeholder="Ex: SSD 240GB"/>
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-1">Sist. Operacional</label>
                    <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl">
                        <Monitor size={18} className="text-[#A696D1]"/>
                        <input className="bg-transparent border-none w-full font-bold text-slate-700 outline-none" value={editData.sistema_operacional} onChange={e => setEditData({...editData, sistema_operacional: e.target.value})} placeholder="Ex: Windows 10 Pro"/>
                    </div>
                </div>
            </div>
          </div>

          {/* ACESSO REMOTO E LOCAL */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2"><Globe size={16} className="text-[#7C69AF]"/> Acesso & Credenciais</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-6 bg-red-50 rounded-3xl border border-red-100">
                    <label className="text-[9px] font-black text-red-400 uppercase tracking-widest block mb-2">ID AnyDesk (Principal)</label>
                    <input className="w-full bg-white px-4 py-3 rounded-xl border-none outline-none font-black text-xl text-red-600 shadow-sm" value={editData.anydesk_id} onChange={e => setEditData({...editData, anydesk_id: e.target.value})} placeholder="000 000 000"/>
                </div>

                <div className="p-6 bg-slate-900 rounded-3xl text-white">
                    <label className="text-[9px] font-black text-white/30 uppercase tracking-widest block mb-2">Usuário / Senha Local</label>
                    <div className="space-y-3">
                        <input className="w-full bg-white/10 px-4 py-2 rounded-xl border-none outline-none font-bold text-xs" value={editData.usuario_local} onChange={e => setEditData({...editData, usuario_local: e.target.value})} placeholder="User"/>
                        <input className="w-full bg-white/10 px-4 py-2 rounded-xl border-none outline-none font-bold text-xs" value={editData.senha_local} onChange={e => setEditData({...editData, senha_local: e.target.value})} placeholder="Pass"/>
                    </div>
                </div>

                <div className="md:col-span-2 flex items-center gap-4 bg-slate-50 p-4 rounded-2xl">
                    <Info size={20} className="text-[#7C69AF]"/>
                    <p className="text-[10px] text-slate-500 font-bold leading-relaxed uppercase tracking-widest">
                        IP LOCAL: <input className="bg-transparent border-none font-black text-[#302464] outline-none w-32" value={editData.ip_local} onChange={e => setEditData({...editData, ip_local: e.target.value})} placeholder="192.168..."/>
                    </p>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}