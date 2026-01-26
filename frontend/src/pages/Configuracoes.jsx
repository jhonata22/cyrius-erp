import { useState, useEffect } from 'react';
import { 
  Settings, Lock, User, Save, ShieldCheck, 
  UserCircle, Mail, Briefcase, Fingerprint, 
  Sparkles, Camera, AtSign 
} from 'lucide-react';
import equipeService from '../services/equipeService';
import authService from '../services/authService';

export default function Configuracoes() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState(null);
  
  const [formData, setFormData] = useState({
    nome: '',
    username: '', // Novo campo
    password: '',
    confirmPassword: '',
    foto: null // Novo campo
  });

  const [preview, setPreview] = useState(null); // Para mostrar a foto antes de salvar

  useEffect(() => {
    equipeService.getMe()
      .then(dados => {
        setUserData(dados);
        setFormData(prev => ({ 
            ...prev, 
            nome: dados.nome,
            username: dados.username // O serializer precisa retornar isso (source='usuario.username')
        }));
        if (dados.foto) setPreview(dados.foto);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
        setFormData(prev => ({ ...prev, foto: file }));
        setPreview(URL.createObjectURL(file));
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (formData.password && formData.password !== formData.confirmPassword) {
        return alert("As senhas não coincidem!");
    }

    try {
        setSaving(true);
        
        // Para enviar arquivos, precisamos de FormData
        const dataToSend = new FormData();
        dataToSend.append('nome', formData.nome);
        dataToSend.append('username', formData.username);
        if (formData.password) dataToSend.append('password', formData.password);
        if (formData.foto instanceof File) dataToSend.append('foto', formData.foto);

        const res = await equipeService.updateMe(dataToSend);
        
        // Atualiza a foto no cache local para o Layout pegar
        if (res.foto) localStorage.setItem('user_photo', res.foto);
        if (formData.username) localStorage.setItem('username', formData.username);

        alert("Perfil atualizado! Algumas alterações podem exigir novo login.");
        setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
    } catch (err) {
        alert(err.response?.data?.erro || "Erro ao salvar.");
    } finally {
        setSaving(false);
    }
  };

  if (loading) return <div className="p-20 text-center animate-pulse text-[#7C69AF] font-bold">Carregando...</div>;

  return (
    <div className="max-w-5xl mx-auto pb-20 animate-in fade-in duration-700">
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight flex items-center gap-3">
             <Settings className="text-[#7C69AF]" /> Configurações
          </h1>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* COLUNA ESQUERDA: FOTO E INFO */}
        <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm text-center">
                <div className="relative w-32 h-32 mx-auto mb-6 group cursor-pointer">
                    <div className="w-full h-full rounded-full overflow-hidden border-4 border-slate-50 shadow-xl">
                        {preview ? (
                            <img src={preview} alt="Perfil" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-[#302464] flex items-center justify-center text-white text-4xl font-black">
                                {formData.nome?.charAt(0)}
                            </div>
                        )}
                    </div>
                    <label htmlFor="foto-upload" className="absolute bottom-0 right-0 bg-[#7C69AF] text-white p-2 rounded-full hover:bg-[#302464] transition-colors shadow-lg cursor-pointer">
                        <Camera size={18} />
                    </label>
                    <input id="foto-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                </div>
                
                <h3 className="font-black text-slate-800 text-xl">{userData?.nome}</h3>
                <p className="text-xs font-bold text-[#7C69AF] uppercase tracking-widest mt-1">{userData?.cargo}</p>
            </div>
        </div>

        {/* COLUNA DIREITA: FORMULÁRIO */}
        <div className="lg:col-span-2">
            <form onSubmit={handleUpdate} className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
                
                {/* DADOS DE ACESSO */}
                <div className="space-y-6">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-3">
                        <UserCircle className="text-[#7C69AF]" size={18} /> Dados de Acesso
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                            <input className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3.5 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-purple-100"
                                value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Usuário (Login)</label>
                            <div className="relative">
                                <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                <input className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border-none rounded-2xl font-bold text-[#302464] outline-none focus:ring-4 focus:ring-purple-100"
                                    value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* SEGURANÇA */}
                <div className="space-y-6 pt-8 border-t border-slate-50">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-3">
                        <Fingerprint className="text-[#7C69AF]" size={18} /> Alterar Senha
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <input type="password" placeholder="Nova Senha" 
                            className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3.5 font-bold outline-none focus:ring-4 focus:ring-purple-100"
                            value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                        <input type="password" placeholder="Confirmar Senha" 
                            className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3.5 font-bold outline-none focus:ring-4 focus:ring-purple-100"
                            value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} />
                    </div>
                </div>

                <div className="pt-6 flex justify-end">
                    <button type="submit" disabled={saving} className="bg-gradient-to-r from-[#302464] to-[#7C69AF] text-white px-10 py-4 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all disabled:opacity-50">
                        {saving ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </div>
            </form>
        </div>
      </div>
    </div>
  );
}