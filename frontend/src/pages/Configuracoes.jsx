import { useState, useEffect } from 'react';
import { 
  Settings, Lock, User, Save, ShieldCheck, 
  UserCircle, Mail, Briefcase, Fingerprint, 
  Sparkles, Camera, AtSign, Building, Plus, X
} from 'lucide-react';
import equipeService from '../services/equipeService';
import empresaService from '../services/empresaService';

export default function Configuracoes() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState(null);
  const [isSocio, setIsSocio] = useState(false);
  
  const [formData, setFormData] = useState({
    nome: '',
    username: '',
    password: '',
    confirmPassword: '',
    foto: null
  });

  const [preview, setPreview] = useState(null);

  // State for company management
  const [modalOpen, setModalOpen] = useState(false);
  const [empresas, setEmpresas] = useState([]);
  const [empresaFormData, setEmpresaFormData] = useState({ id: null, nome_fantasia: '', razao_social: '', cnpj: '' });

  useEffect(() => {
    equipeService.getMe()
      .then(dados => {
        console.log('DEBUG: User Cargo:', dados.cargo);
        setUserData(dados);
        setFormData(prev => ({ 
            ...prev, 
            nome: dados.nome,
            username: dados.username
        }));
        if (dados.foto) setPreview(dados.foto);

        if (dados.cargo === 'SOCIO') {
          setIsSocio(true);
          loadEmpresas();
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const loadEmpresas = async () => {
    try {
      const data = await empresaService.listar();
      setEmpresas(data);
    } catch (error) {
      console.error("Erro ao carregar empresas", error);
    }
  };

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
        
        const dataToSend = new FormData();
        dataToSend.append('nome', formData.nome);
        dataToSend.append('username', formData.username);
        if (formData.password) dataToSend.append('password', formData.password);
        if (formData.foto instanceof File) dataToSend.append('foto', formData.foto);

        const res = await equipeService.updateMe(dataToSend);
        
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

  const handleSaveEmpresa = async (e) => {
    e.preventDefault();
    try {
      if (empresaFormData.id) {
        await empresaService.atualizar(empresaFormData.id, empresaFormData);
      } else {
        await empresaService.criar(empresaFormData);
      }
      alert("Empresa salva com sucesso!");
      setModalOpen(false);
      loadEmpresas();
    } catch (error) {
      alert("Erro ao salvar empresa");
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
            {isSocio && (
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-3 mb-4">
                  <Building className="text-[#7C69AF]" size={18} /> Filiais & Multi-empresas
                </h3>
                <button onClick={() => setModalOpen(true)} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all">
                  Gerenciar
                </button>
              </div>
            )}
        </div>

        <div className="lg:col-span-2">
            <form onSubmit={handleUpdate} className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
                
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

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] p-8 max-w-lg w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-slate-800">Gerenciar Empresas</h2>
              <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              {empresas.map(empresa => (
                <div key={empresa.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                  <div>
                    <p className="font-bold text-slate-700">{empresa.nome_fantasia}</p>
                    <p className="text-xs text-slate-500">{empresa.cnpj}</p>
                  </div>
                  <button onClick={() => setEmpresaFormData(empresa)} className="text-xs font-bold text-[#7C69AF]">Editar</button>
                </div>
              ))}
            </div>

            <form onSubmit={handleSaveEmpresa} className="space-y-4 pt-6 border-t">
              <h3 className="text-lg font-bold text-slate-700">{empresaFormData.id ? 'Editar Empresa' : 'Nova Empresa'}</h3>
              <input
                className="w-full bg-slate-100 border-none rounded-2xl px-5 py-3.5 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-purple-100"
                value={empresaFormData.nome_fantasia}
                onChange={e => setEmpresaFormData({ ...empresaFormData, nome_fantasia: e.target.value })}
                placeholder="Nome Fantasia"
              />
              <input
                className="w-full bg-slate-100 border-none rounded-2xl px-5 py-3.5 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-purple-100"
                value={empresaFormData.razao_social}
                onChange={e => setEmpresaFormData({ ...empresaFormData, razao_social: e.target.value })}
                placeholder="Razão Social"
              />
              <input
                className="w-full bg-slate-100 border-none rounded-2xl px-5 py-3.5 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-purple-100"
                value={empresaFormData.cnpj}
                onChange={e => setEmpresaFormData({ ...empresaFormData, cnpj: e.target.value })}
                placeholder="CNPJ"
              />
              <div className="flex justify-end gap-4">
                <button type="button" onClick={() => setEmpresaFormData({ id: null, nome_fantasia: '', razao_social: '', cnpj: '' })} className="text-xs font-bold text-slate-500">Limpar</button>
                <button type="submit" className="bg-[#302464] text-white px-6 py-3 rounded-2xl font-bold text-xs uppercase">Salvar Empresa</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}