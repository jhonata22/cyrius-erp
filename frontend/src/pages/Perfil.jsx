import { useState, useEffect, useCallback, useRef } from 'react'; 
import { useParams, useNavigate } from 'react-router-dom'; 
import { User, Lock, Save, Camera, Shield, ArrowLeft, Briefcase, DollarSign, Calendar } from 'lucide-react';
import equipeService from '../services/equipeService';
import { formatImgUrl } from '../utils/urlUtils';

export default function Perfil() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null); 
  
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false); 
  
  const [perfil, setPerfil] = useState({
    nome: '',
    username: '', 
    cargo: '',
    custo_hora: '',
    foto: null,
    estatisticas_mes: null 
  });

  const [senhas, setSenhas] = useState({ password: '', confirmPassword: '' });
  const isOutroPerfil = !!id; 

  const carregarPerfil = useCallback(async () => {
    try {
      setLoading(true);
      let data;
      if (isOutroPerfil) {
        data = await equipeService.buscarPorId(id);
      } else {
        data = await equipeService.getMe();
      }
      

      
      setPerfil(data);
    } catch (error) {
      console.error("Erro ao carregar perfil", error);
      alert("Erro ao carregar dados do perfil.");
      navigate('/');
    } finally {
      setLoading(false);
    }
  }, [id, isOutroPerfil, navigate]);

  useEffect(() => {
    carregarPerfil();
  }, [carregarPerfil]);

  const handleFotoClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('foto', file);

      await equipeService.atualizar(isOutroPerfil ? id : null, formData);
      
      alert("Foto atualizada com sucesso!");
      carregarPerfil(); 
    } catch (error) {
      console.error("Erro no upload", error);
      alert("Erro ao atualizar foto.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (senhas.password && senhas.password !== senhas.confirmPassword) {
      alert("As senhas digitadas não conferem.");
      return;
    }

    try {
      const payload = { ...perfil };
      if (senhas.password) payload.password = senhas.password;

      delete payload.estatisticas_mes; 
      delete payload.foto; // Removemos para evitar envio de string de URL antiga

      await equipeService.atualizar(isOutroPerfil ? id : null, payload);
      
      alert("Perfil atualizado com sucesso!");
      setSenhas({ password: '', confirmPassword: '' });
      carregarPerfil();
    } catch (error) {
      console.error(error);
      alert("Erro ao atualizar. Verifique os dados.");
    }
  };

  if (loading) return <div className="p-20 text-center text-[#7C69AF] font-black animate-pulse uppercase tracking-widest text-[10px]">Carregando Ficha...</div>;

  return (
    <div className="max-w-4xl mx-auto pb-20 animate-in fade-in duration-500">
      
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept="image/*"
      />

      <div className="flex items-center gap-4 mb-8">
        {isOutroPerfil && (
            <button onClick={() => navigate(-1)} className="p-3 bg-white rounded-xl shadow-sm hover:shadow-md text-slate-400 hover:text-[#302464] transition-all group">
                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            </button>
        )}
        <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">
                {isOutroPerfil ? `Perfil de ${perfil.nome}` : 'Meu Perfil'}
            </h1>
            <div className="h-1 w-12 bg-[#7C69AF] mt-2 rounded-full"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-purple-900/5 text-center relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-24 bg-[#302464]"></div>
                
                <div 
                    onClick={handleFotoClick}
                    className={`relative w-32 h-32 mx-auto mt-8 rounded-3xl border-4 border-white shadow-lg bg-slate-100 flex items-center justify-center overflow-hidden cursor-pointer transition-transform active:scale-95 ${uploading ? 'animate-pulse' : ''}`}
                >
                    {perfil.foto ? (
                        <img src={formatImgUrl(perfil.foto)} alt="Foto" className="w-full h-full object-cover" />
                    ) : (
                        <User size={48} className="text-slate-300" />
                    )}
                    
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                        <Camera className="text-white mb-1" size={20} />
                        <span className="text-white text-[8px] font-bold uppercase">Alterar</span>
                    </div>

                    {uploading && (
                        <div className="absolute inset-0 bg-[#302464]/80 flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    )}
                </div>

                <div className="mt-4">
                    <h2 className="font-black text-slate-800 text-lg">{perfil.nome}</h2>
                    <span className={`inline-block px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest mt-1
                        ${(perfil.cargo === 'GESTOR' || perfil.cargo === 'SOCIO') ? 'bg-purple-50 text-[#7C69AF]' : 'bg-slate-50 text-slate-500'}
                    `}>
                        {perfil.cargo}
                    </span>
                </div>
            </div>

            {perfil.estatisticas_mes && (
                <div className="bg-[#302464] p-6 rounded-[2.5rem] text-white shadow-lg">
                    <h3 className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-4 flex items-center gap-2">
                        <Calendar size={14}/> Desempenho Mensal
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/10 p-4 rounded-2xl">
                            <span className="block text-2xl font-black">{perfil.estatisticas_mes.total || 0}</span>
                            <span className="text-[9px] uppercase tracking-wide opacity-70">Chamados</span>
                        </div>
                        <div className="bg-white/10 p-4 rounded-2xl">
                            <span className="block text-2xl font-black text-emerald-400">{perfil.estatisticas_mes.finalizados || 0}</span>
                            <span className="text-[9px] uppercase tracking-wide opacity-70">Resolvidos</span>
                        </div>
                    </div>
                </div>
            )}
        </div>

        <div className="md:col-span-2">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2">
                    <Shield size={16} className="text-[#7C69AF]"/> Dados & Credenciais
                </h3>

                <form onSubmit={handleSave} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                            <input 
                                className="w-full bg-slate-50 p-4 rounded-2xl border-none font-bold text-slate-700 outline-none focus:ring-4 focus:ring-purple-500/5 transition-all"
                                value={perfil.nome || ''}
                                onChange={e => setPerfil({...perfil, nome: e.target.value})}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Usuário de Login</label>
                            <input 
                                className="w-full bg-slate-50 p-4 rounded-2xl border-none font-bold text-slate-700 outline-none focus:ring-4 focus:ring-purple-500/5 transition-all"
                                value={perfil.username || ''} 
                                onChange={e => setPerfil({...perfil, username: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1"><Briefcase size={10}/> Cargo</label>
                            <input className="w-full bg-slate-50 p-4 rounded-2xl border-none font-bold text-slate-400 outline-none cursor-not-allowed" value={perfil.cargo || ''} disabled />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1"><DollarSign size={10}/> Custo/Hora</label>
                            <input className="w-full bg-slate-50 p-4 rounded-2xl border-none font-bold text-slate-400 outline-none cursor-not-allowed" value={`R$ ${perfil.custo_hora || '0.00'}`} disabled />
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-50">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Lock size={14} className="text-[#7C69AF]"/> 
                            {isOutroPerfil ? 'Redefinir Senha do Usuário' : 'Alterar Minha Senha'}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <input 
                                type="password"
                                placeholder="Nova Senha"
                                className="w-full bg-slate-50 p-4 rounded-2xl border-none font-bold text-[#302464] outline-none focus:ring-4 focus:ring-purple-500/5 transition-all"
                                value={senhas.password}
                                onChange={e => setSenhas({...senhas, password: e.target.value})}
                            />
                            <input 
                                type="password"
                                placeholder="Confirmar Senha"
                                className="w-full bg-slate-50 p-4 rounded-2xl border-none font-bold text-[#302464] outline-none focus:ring-4 focus:ring-purple-500/5 transition-all"
                                value={senhas.confirmPassword}
                                onChange={e => setSenhas({...senhas, confirmPassword: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button type="submit" className="bg-[#302464] hover:bg-[#7C69AF] text-white px-8 py-4 rounded-2xl flex items-center gap-2 font-black text-xs uppercase tracking-widest shadow-xl shadow-purple-900/20 transition-all active:scale-95">
                            <Save size={18} /> Salvar Alterações
                        </button>
                    </div>
                </form>
            </div>
        </div>
      </div>
    </div>
  );
}