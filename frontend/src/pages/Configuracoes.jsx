import { useState, useEffect } from 'react';
import { 
  Settings, Lock, User, Save, ShieldCheck, 
  UserCircle, Mail, Briefcase, Fingerprint, 
  ChevronRight, Sparkles, ShieldAlert, Info // <--- ADICIONADO
} from 'lucide-react';
import equipeService from '../services/equipeService';
import authService from '../services/authService';

export default function Configuracoes() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    equipeService.getMe()
      .then(dados => {
        setUserData(dados);
        setFormData(prev => ({ ...prev, nome: dados.nome }));
      })
      .catch(err => console.error("Erro ao carregar perfil", err))
      .finally(() => setLoading(false));
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (formData.password && formData.password !== formData.confirmPassword) {
        return alert("As senhas não coincidem!");
    }

    try {
        setSaving(true);
        await equipeService.updateMe({
            nome: formData.nome,
            password: formData.password || undefined
        });
        alert("Configurações atualizadas com sucesso!");
        setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
    } catch (err) {
        alert("Erro ao salvar. Verifique sua conexão.");
    } finally {
        setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col h-screen items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-[#7C69AF] rounded-full animate-spin"></div>
        <p className="text-[#7C69AF] font-black uppercase tracking-widest text-[10px]">Acessando Preferências...</p>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto pb-20 animate-in fade-in duration-700">
      
      {/* HEADER DINÂMICO */}
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2 text-[#7C69AF]">
            <Settings size={20} />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">System Preferences</span>
          </div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Configurações</h1>
        </div>
        
        {/* CARD DE IDENTIDADE RÁPIDA */}
        <div className="bg-white px-6 py-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-[#302464] rounded-2xl flex items-center justify-center text-white font-black">
                {userData?.nome.substring(0, 2).toUpperCase()}
            </div>
            <div>
                <p className="text-sm font-black text-slate-800 leading-tight">{userData?.nome}</p>
                <p className="text-[10px] font-bold text-[#7C69AF] uppercase tracking-widest mt-0.5">{userData?.cargo}</p>
            </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUNA ESQUERDA: NÍVEL DE ACESSO */}
        <div className="lg:col-span-1 space-y-6">
            <div className="bg-[#302464] p-8 rounded-[2.5rem] text-white shadow-xl shadow-purple-900/20 relative overflow-hidden group">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#7C69AF] opacity-20 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700"></div>
                <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-6 text-[#A696D1] flex items-center gap-2">
                    <ShieldCheck size={16} /> Permissões
                </h3>
                <div className="space-y-4">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                        <p className="text-[9px] font-black text-white/30 uppercase mb-1">Cargo Atual</p>
                        <p className="font-black text-lg">{userData?.cargo}</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                        <p className="text-[9px] font-black text-white/30 uppercase mb-1">ID de Técnico</p>
                        <p className="font-mono text-sm">#CY-{userData?.id.toString().padStart(3, '0')}</p>
                    </div>
                </div>
                <div className="mt-8 pt-6 border-t border-white/5 flex items-start gap-3">
                    <Info size={16} className="text-[#A696D1] shrink-0 mt-0.5" />
                    <p className="text-[10px] text-white/40 leading-relaxed font-bold">
                        Somente administradores podem alterar cargos ou custos operacionais.
                    </p>
                </div>
            </div>
            
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Sessão Atual</h3>
                <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 font-medium">Status</span>
                    <span className="flex items-center gap-1.5 text-emerald-500 font-black uppercase text-[10px]">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                        Ativa e Segura
                    </span>
                </div>
                <button 
                  onClick={() => authService.logout()}
                  className="w-full mt-6 py-3 border-2 border-red-50 text-red-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-50 hover:text-red-600 transition-all"
                >
                    Encerrar Sessão
                </button>
            </div>
        </div>

        {/* COLUNA DIREITA: FORMULÁRIOS */}
        <div className="lg:col-span-2 space-y-8">
            <form onSubmit={handleUpdate} className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
                
                {/* DADOS GERAIS */}
                <div className="space-y-6 mb-12">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-3">
                        <User className="text-[#7C69AF]" size={18} /> Informações Pessoais
                    </h3>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                        <input 
                            className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-[#302464] outline-none focus:ring-4 focus:ring-purple-100 transition-all"
                            value={formData.nome}
                            onChange={e => setFormData({...formData, nome: e.target.value})}
                        />
                    </div>
                </div>

                {/* SEGURANÇA */}
                <div className="space-y-6 pt-10 border-t border-slate-50">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-3">
                            <Fingerprint className="text-[#7C69AF]" size={18} /> Segurança da Conta
                        </h3>
                        <span className="text-[9px] font-black text-amber-500 bg-amber-50 px-2 py-1 rounded-lg">Mínimo 6 caracteres</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nova Senha</label>
                            <input 
                                type="password"
                                className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-[#302464] outline-none focus:ring-4 focus:ring-purple-100 transition-all placeholder:text-slate-300"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={e => setFormData({...formData, password: e.target.value})}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirmar Senha</label>
                            <input 
                                type="password"
                                className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-[#302464] outline-none focus:ring-4 focus:ring-purple-100 transition-all placeholder:text-slate-300"
                                placeholder="••••••••"
                                value={formData.confirmPassword}
                                onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                            />
                        </div>
                    </div>
                </div>

                {/* AÇÃO */}
                <div className="mt-12 flex items-center justify-between gap-6">
                    <div className="hidden sm:flex items-center gap-3 text-slate-400">
                        <Sparkles size={20} className="text-amber-400" />
                        <p className="text-[10px] font-bold uppercase tracking-tight leading-tight">
                            As alterações entram em vigor<br/>após o salvamento.
                        </p>
                    </div>
                    <button 
                        type="submit"
                        disabled={saving}
                        className="flex-1 sm:flex-none bg-gradient-to-r from-[#302464] to-[#7C69AF] text-white px-12 py-4 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-purple-900/30 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {saving ? 'Processando...' : 'Salvar Alterações'}
                    </button>
                </div>
            </form>
        </div>
      </div>
    </div>
  );
}