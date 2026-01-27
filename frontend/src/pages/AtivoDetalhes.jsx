import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Monitor, Cpu, Layers, HardDrive, 
  Trash2, Smartphone, Save, Globe, 
  Printer, Info, History, Calendar, 
  Wrench, FileText, CheckCircle2, X, Plus, AlertTriangle, Truck
} from 'lucide-react';
import QRCode from "react-qr-code"; 
import ativoService from '../services/ativoService';
import servicoService from '../services/servicoService'; 

export default function AtivoDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [loadingAtivo, setLoadingAtivo] = useState(true);
  const [ativo, setAtivo] = useState(null);
  const [editData, setEditData] = useState({});
  
  const [historicoChamados, setHistoricoChamados] = useState([]);
  const [historicoOS, setHistoricoOS] = useState([]); 
  const [activeTab, setActiveTab] = useState('TICKETS');

  // --- CARREGAMENTO OTIMIZADO ---
  const carregarDados = useCallback(async () => {
    try {
      setLoadingAtivo(true);
      
      const dadosAtivo = await ativoService.buscarPorId(id);
      
      setAtivo(dadosAtivo);
      setEditData({ ...dadosAtivo });

      setHistoricoChamados(dadosAtivo.historico_servicos || []);

      try {
        const osResults = await servicoService.listar({ ativo: id });
        setHistoricoOS(osResults);
      } catch (err) {
        console.warn("Nenhuma OS encontrada ou erro na busca:", err);
      }

    } catch (error) {
      console.error("Erro fatal ao carregar:", error);
      alert("Erro ao carregar dados do ativo. Verifique se ele existe.");
    } finally {
      setLoadingAtivo(false);
    }
  }, [id]);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  // --- AÇÃO: SALVAR (ATUALIZAR) ---
  const handleSalvar = async () => {
    try {
      const payload = { ...editData };

      if (payload.cliente && typeof payload.cliente === 'object') {
          payload.cliente = payload.cliente.id;
      }
      
      delete payload.id;
      delete payload.created_at;
      delete payload.updated_at;
      delete payload.historico_servicos; 
      delete payload.historico_os;
      delete payload.nome_cliente;

      await ativoService.atualizar(id, payload);
      alert("✅ Ficha técnica atualizada com sucesso!");
      
      carregarDados();

    } catch (error) {
      console.error("Erro ao salvar:", error);
      const msg = error.response?.data ? JSON.stringify(error.response.data) : "Erro de conexão.";
      alert(`❌ Erro ao salvar: ${msg}`);
    }
  };

  // --- AÇÃO: EXCLUIR ---
  const handleExcluir = async () => {
      if (!window.confirm("⚠️ Tem certeza absoluta? Essa ação não pode ser desfeita.")) return;
      
      try {
          await ativoService.excluir(id);
          alert("Ativo removido com sucesso.");
          navigate(-1); 
      } catch (error) {
          console.error("Erro ao excluir:", error);
          alert("Erro ao excluir. Verifique se existem chamados vinculados a este ativo.");
      }
  };

  const handleImprimirEtiqueta = () => {
    const svgElement = document.getElementById("qrcode-svg");
    if (!svgElement) return alert("Aguarde o QR Code carregar.");
    const printWindow = window.open('', '', 'width=400,height=400');
    const svgData = new XMLSerializer().serializeToString(svgElement);

    printWindow.document.write(`
        <html>
            <head>
                <title>Etiqueta - ${ativo?.nome}</title>
                <style>
                    body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
                    .etiqueta { border: 2px solid #000; padding: 10px; border-radius: 8px; width: 250px; }
                    h2 { margin: 0 0 10px 0; font-size: 14px; font-weight: bold; }
                    .footer { margin-top: 10px; font-size: 10px; }
                </style>
            </head>
            <body>
                <div class="etiqueta">
                    <h2>${ativo?.nome}</h2>
                    ${svgData}
                    <div class="footer">ID: ${ativo?.id} | ${ativo?.tipo}<br/><strong>CYRIUS ERP - PATRIMÔNIO</strong></div>
                </div>
                <script>window.onload = function() { window.print(); window.close(); }</script>
            </body>
        </html>
    `);
    printWindow.document.close();
  };

  if (loadingAtivo) return <div className="p-20 text-center text-[#7C69AF] font-black animate-pulse uppercase tracking-widest text-[10px]">Lendo Hardware...</div>;
  
  if (!ativo) return <div className="p-20 text-center text-red-500 font-bold">Ativo não localizado.</div>;

  const qrValue = window.location.href; 

  return (
    // AJUSTE: Adicionado px-4 para não colar na borda em mobile
    <div className="max-w-7xl mx-auto pb-20 px-4 md:px-8 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-[#302464] font-black text-[10px] uppercase tracking-widest transition-all group w-full sm:w-auto justify-center sm:justify-start">
          <div className="p-2 bg-white rounded-xl shadow-sm group-hover:shadow-md border border-slate-100 transition-all"><ArrowLeft size={16} /></div>
          Voltar para Lista
        </button>
        <div className="flex gap-3 w-full sm:w-auto justify-center sm:justify-end">
            <button 
                onClick={handleExcluir} 
                className="group flex items-center gap-2 px-4 py-3 bg-white text-red-500 rounded-2xl border border-red-50 hover:bg-red-50 transition-all shadow-sm"
            >
                <Trash2 size={18} className="group-hover:scale-110 transition-transform" /> 
                <span className="hidden sm:inline text-xs font-bold uppercase">Excluir</span>
            </button>
            <button 
                onClick={handleSalvar} 
                className="bg-[#302464] hover:bg-[#7C69AF] text-white px-8 py-3 rounded-2xl flex items-center gap-2 font-black text-xs uppercase tracking-widest shadow-xl shadow-purple-900/20 transition-all active:scale-95 hover:shadow-purple-900/40"
            >
              <Save size={18} /> Salvar Ficha
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* === COLUNA ESQUERDA (IDENTIFICAÇÃO) === */}
        {/* AJUSTE: Mudado 'sticky top-6' para 'lg:sticky lg:top-6'. 
            Isso faz com que o sticky só funcione em telas grandes (Desktop). 
            Em mobile, ele rola normalmente. */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-6">
          
          {/* CARD PRINCIPAL (QR) */}
          <div className="bg-gradient-to-b from-[#302464] to-[#1e1641] p-8 rounded-[2.5rem] text-white shadow-2xl shadow-purple-900/30 text-center relative overflow-hidden group">
             <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#7C69AF] opacity-10 rounded-full blur-3xl"></div>
             
             <div className="bg-white p-4 rounded-[1.5rem] mx-auto mb-6 w-fit shadow-lg transform group-hover:scale-105 transition-transform duration-500 ease-out">
                <div className="w-32 h-32">
                    <QRCode id="qrcode-svg" value={qrValue} size={256} style={{ height: "auto", maxWidth: "100%", width: "100%" }} viewBox={`0 0 256 256`} />
                </div>
             </div>

             <button onClick={handleImprimirEtiqueta} className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white backdrop-blur-sm transition-all shadow-lg" title="Imprimir Etiqueta">
                <Printer size={18} />
             </button>

             <h2 className="text-xl font-black tracking-tight">{editData.nome}</h2>
             <p className="text-[#A696D1] text-[10px] font-black uppercase tracking-[0.2em] mt-2 mb-6 border border-[#A696D1]/30 rounded-full py-1 px-3 inline-block bg-[#302464]/50 backdrop-blur-md">
                {editData.tipo}
             </p>
             
             <button onClick={handleImprimirEtiqueta} className="w-full text-[10px] font-bold bg-[#7C69AF] hover:bg-white hover:text-[#302464] py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg">
                <Printer size={14} /> IMPRIMIR ETIQUETA
             </button>
          </div>

          {/* CARD MODELO */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                 <Smartphone size={14} className="text-[#7C69AF]"/> Modelo & Marca
              </h3>
              <input 
                className="w-full bg-slate-50 hover:bg-white focus:bg-white p-4 rounded-2xl border border-transparent hover:border-slate-200 focus:border-[#7C69AF] font-bold text-slate-700 outline-none transition-all"
                value={editData.marca_modelo || ''} 
                onChange={e => setEditData({...editData, marca_modelo: e.target.value})}
                placeholder="Ex: Dell Optiplex 3020"
              />
          </div>
        </div>

        {/* === COLUNA DIREITA (DADOS & HISTÓRICO) === */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* HARDWARE INFO */}
          <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2">
                <Cpu size={16} className="text-[#7C69AF]"/> Configuração de Hardware
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                   { label: 'Processador', icon: <Cpu size={18} className="text-[#A696D1]"/>, field: 'processador', ph: 'Ex: Core i5' },
                   { label: 'Memória RAM', icon: <Layers size={18} className="text-[#A696D1]"/>, field: 'memoria_ram', ph: 'Ex: 8GB DDR4' },
                   { label: 'Armazenamento', icon: <HardDrive size={18} className="text-[#A696D1]"/>, field: 'armazenamento', ph: 'Ex: SSD 240GB' },
                   { label: 'Sist. Operacional', icon: <Monitor size={18} className="text-[#A696D1]"/>, field: 'sistema_operacional', ph: 'Ex: Windows 11 Pro' },
                ].map((item, idx) => (
                    <div key={idx} className="space-y-1 group">
                        <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-1 group-focus-within:text-[#7C69AF] transition-colors">{item.label}</label>
                        <div className="flex items-center gap-3 bg-slate-50 group-hover:bg-slate-100 group-focus-within:bg-white group-focus-within:ring-2 group-focus-within:ring-[#7C69AF]/20 p-3 rounded-2xl transition-all border border-transparent group-focus-within:border-[#7C69AF]">
                            {item.icon}
                            <input 
                                className="bg-transparent border-none w-full font-bold text-slate-700 outline-none placeholder:font-normal placeholder:text-slate-400" 
                                value={editData[item.field] || ''} 
                                onChange={e => setEditData({...editData, [item.field]: e.target.value})} 
                                placeholder={item.ph}
                            />
                        </div>
                    </div>
                ))}
            </div>
          </div>

          {/* ACESSO REMOTO E LOCAL */}
          <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2">
                <Globe size={16} className="text-[#7C69AF]"/> Acesso & Credenciais
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-6 bg-red-50 rounded-3xl border border-red-100 hover:shadow-lg hover:shadow-red-500/10 transition-all">
                    <label className="text-[9px] font-black text-red-400 uppercase tracking-widest block mb-2">ID AnyDesk (Principal)</label>
                    <input className="w-full bg-white px-4 py-3 rounded-xl border-none outline-none font-black text-xl text-red-600 shadow-sm placeholder:text-red-200" value={editData.anydesk_id || ''} onChange={e => setEditData({...editData, anydesk_id: e.target.value})} placeholder="000 000 000"/>
                </div>

                <div className="p-6 bg-slate-900 rounded-3xl text-white shadow-xl shadow-slate-900/20">
                    <label className="text-[9px] font-black text-white/30 uppercase tracking-widest block mb-4">Credenciais Locais</label>
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl border border-white/5 focus-within:bg-white/20 transition-all">
                           <span className="text-white/40 text-[10px] font-bold">U:</span>
                           <input className="w-full bg-transparent border-none outline-none font-bold text-xs text-white placeholder:text-white/20" value={editData.usuario_local || ''} onChange={e => setEditData({...editData, usuario_local: e.target.value})} placeholder="Usuário"/>
                        </div>
                        <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl border border-white/5 focus-within:bg-white/20 transition-all">
                           <span className="text-white/40 text-[10px] font-bold">P:</span>
                           <input className="w-full bg-transparent border-none outline-none font-bold text-xs text-white placeholder:text-white/20" value={editData.senha_local || ''} onChange={e => setEditData({...editData, senha_local: e.target.value})} placeholder="Senha"/>
                        </div>
                    </div>
                </div>

                <div className="md:col-span-2 flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <Info size={20} className="text-[#7C69AF]"/>
                    <p className="text-[10px] text-slate-500 font-bold leading-relaxed uppercase tracking-widest flex items-center gap-2">
                        IP LOCAL: <input className="bg-transparent border-b border-slate-300 focus:border-[#7C69AF] font-black text-[#302464] outline-none w-32 px-2" value={editData.ip_local || ''} onChange={e => setEditData({...editData, ip_local: e.target.value})} placeholder="192.168..."/>
                    </p>
                </div>
            </div>
          </div>

          {/* === HISTÓRICO UNIFICADO (COM ABAS) === */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
              
             {/* BARRA DE ABAS */}
             <div className="flex border-b border-slate-100 bg-slate-50/50 p-2 gap-2">
                 <button 
                    onClick={() => setActiveTab('TICKETS')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'TICKETS' ? 'bg-white shadow-md text-[#302464]' : 'text-slate-400 hover:bg-white/50'}`}
                 >
                    <History size={16} className={activeTab === 'TICKETS' ? 'text-[#7C69AF]' : 'text-slate-300'} /> 
                    <span className="hidden sm:inline">Tickets / Chamados</span>
                    <span className="sm:hidden">Tickets</span>
                    <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md ml-1">{historicoChamados.length}</span>
                 </button>

                 <button 
                    onClick={() => setActiveTab('OS')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'OS' ? 'bg-white shadow-md text-[#302464]' : 'text-slate-400 hover:bg-white/50'}`}
                 >
                    <Wrench size={16} className={activeTab === 'OS' ? 'text-amber-500' : 'text-slate-300'} /> 
                    <span className="hidden sm:inline">Ordens de Serviço</span>
                    <span className="sm:hidden">O.S.</span>
                    <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md ml-1">{historicoOS.length}</span>
                 </button>
             </div>

             {/* CONTEÚDO DA ABA */}
             <div className="p-4 md:p-8">
                
                {/* LISTA DE CHAMADOS */}
                {activeTab === 'TICKETS' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {historicoChamados.length === 0 ? (
                            <div className="text-center py-10 opacity-50"><History size={48} className="mx-auto text-slate-200 mb-2"/><p className="text-slate-400 font-bold text-xs uppercase">Sem chamados registrados.</p></div>
                        ) : (
                            historicoChamados.map(ticket => (
                                // AJUSTE: Flex-col em mobile para não quebrar layout
                                <div key={ticket.id} onClick={() => navigate(`/chamados/${ticket.id}`)} className="group flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 bg-white border border-slate-100 rounded-3xl hover:border-purple-100 hover:shadow-xl hover:shadow-purple-900/5 cursor-pointer transition-all gap-4 sm:gap-0">
                                    <div className="flex items-center gap-5">
                                        <div className={`p-4 rounded-2xl ${ticket.status === 'FINALIZADO' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                            {ticket.status === 'FINALIZADO' ? <CheckCircle2 size={20} /> : <History size={20} />}
                                        </div>
                                        <div>
                                            <h4 className="font-black text-slate-700 text-sm group-hover:text-[#302464] transition-colors line-clamp-1">{ticket.titulo}</h4>
                                            <div className="flex items-center gap-3 mt-1.5">
                                                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5"><Calendar size={12} /> {new Date(ticket.created_at).toLocaleDateString()}</span>
                                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">{ticket.prioridade}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
                                        <span className={`text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-lg border w-full sm:w-auto text-center ${ticket.status === 'FINALIZADO' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                                            {ticket.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* LISTA DE O.S. */}
                {activeTab === 'OS' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {historicoOS.length === 0 ? (
                            <div className="text-center py-10 opacity-50"><Wrench size={48} className="mx-auto text-slate-200 mb-2"/><p className="text-slate-400 font-bold text-xs uppercase">Sem O.S. vinculadas.</p></div>
                        ) : (
                            historicoOS.map(os => (
                                // AJUSTE: Flex-col em mobile para não quebrar layout
                                <div key={os.id} onClick={() => navigate(`/servicos/${os.id}`)} className="group flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 bg-white border border-slate-100 rounded-3xl hover:border-amber-100 hover:shadow-xl hover:shadow-amber-900/5 cursor-pointer transition-all gap-4 sm:gap-0">
                                    <div className="flex items-center gap-5">
                                        <div className="p-4 rounded-2xl bg-[#302464] text-white shadow-lg shadow-purple-900/20">
                                            <FileText size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-slate-700 text-sm group-hover:text-[#302464] transition-colors line-clamp-1">{os.titulo}</h4>
                                            <div className="flex items-center gap-3 mt-1.5">
                                                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5"><Calendar size={12} /> {new Date(os.created_at || os.data_entrada).toLocaleDateString()}</span>
                                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">{os.tipo}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
                                        <span className="text-[10px] font-black text-[#302464] bg-purple-50 px-2 py-1 rounded-lg w-full sm:w-auto text-center">OS #{String(os.id).padStart(4, '0')}</span>
                                        <span className={`text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-lg border w-full sm:w-auto text-center ${
                                            os.status === 'CONCLUIDO' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                            os.status === 'AGUARDANDO_PECA' ? 'bg-red-50 text-red-600 border-red-100' : 
                                            'bg-amber-50 text-amber-600 border-amber-100'
                                        }`}>
                                            {os.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}