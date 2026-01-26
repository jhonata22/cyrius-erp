import { useState, useEffect } from 'react';
import { Plus, User, Briefcase, DollarSign, Trash2, Shield, X, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom'; // <--- 1. IMPORTAÇÃO
import equipeService from '../services/equipeService';

export default function Equipe() {
  const [funcionarios, setFuncionarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const navigate = useNavigate(); // <--- 2. INICIALIZAÇÃO
  
  const [formData, setFormData] = useState({
    nome: '',
    cargo: 'TECNICO',
    custo_hora: ''
  });

  const carregarEquipe = async () => {
    try {
      setLoading(true);
      const data = await equipeService.listar();
      setFuncionarios(data);
    } catch (error) {
      console.error("Erro ao carregar equipe:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarEquipe();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await equipeService.criar({
        ...formData,
        custo_hora: parseFloat(formData.custo_hora)
      });
      
      setIsModalOpen(false);
      setFormData({ nome: '', cargo: 'TECNICO', custo_hora: '' });
      carregarEquipe();
      alert("Colaborador cadastrado com sucesso!");
    } catch (error) {
      alert("Erro ao salvar. Verifique se o usuário já existe.");
    }
  };

  const excluirFuncionario = async (id) => {
    if (window.confirm("Deseja realmente remover este colaborador?")) {
      try {
        await equipeService.excluir(id);
        carregarEquipe();
      } catch (error) {
        alert("Erro ao excluir. O técnico pode ter atendimentos vinculados.");
      }
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Equipe</h1>
          <div className="h-1 w-12 bg-[#7C69AF] mt-2 rounded-full"></div>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#302464] hover:bg-[#7C69AF] text-white px-8 py-3.5 rounded-2xl flex items-center gap-2 transition-all duration-300 shadow-xl shadow-purple-900/20 font-black text-sm active:scale-95"
        >
          <Plus size={20} />
          Novo Colaborador
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-[#7C69AF] font-black uppercase tracking-widest text-[10px] animate-pulse">Sincronizando Time Cyrius...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {funcionarios.map(func => (
            <div 
                key={func.id} 
                // 3. EVENTO DE CLIQUE NO CARD INTEIRO
                onClick={() => navigate(`/perfil/${func.id}`)}
                className="bg-white p-6 rounded-[2.2rem] shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden cursor-pointer"
            >
              
              <button 
                onClick={(e) => {
                    // 4. IMPEDE QUE O CLIQUE NA LIXEIRA ABRA O PERFIL
                    e.stopPropagation(); 
                    excluirFuncionario(func.id);
                }}
                className="absolute top-6 right-6 text-slate-200 hover:text-red-500 transition-colors z-10"
                title="Excluir Colaborador"
              >
                <Trash2 size={18} />
              </button>

              <div className="flex items-center gap-5 mb-8">
                {/* LÓGICA DE FOTO DO PERFIL */}
                <div className="shrink-0">
                    {func.foto ? (
                        <img 
                            src={func.foto} 
                            alt={func.nome} 
                            className="w-16 h-16 rounded-2xl object-cover shadow-lg border-2 border-white"
                        />
                    ) : (
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg
                          ${(func.cargo === 'GESTOR' || func.cargo === 'SOCIO') ? 'bg-[#7C69AF] shadow-purple-500/20' : 'bg-[#302464] shadow-slate-900/20'}`}>
                          {func.nome.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>

                <div>
                  <h3 className="font-black text-slate-800 text-lg leading-tight group-hover:text-[#7C69AF] transition-colors line-clamp-1">{func.nome}</h3>
                  
                  {/* Badge de Cargo */}
                  <span className={`text-[9px] px-2 py-0.5 rounded-lg font-black uppercase tracking-[0.15em] mt-1 inline-block border
                    ${(func.cargo === 'GESTOR' || func.cargo === 'SOCIO') 
                        ? 'bg-purple-50 text-[#7C69AF] border-purple-100' 
                        : func.cargo === 'ESTAGIARIO' 
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                            : 'bg-slate-50 text-slate-600 border-slate-100'}`}>
                    {func.cargo}
                  </span>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-slate-50">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                    <Briefcase size={14} className="text-[#A696D1]" /> Atuação
                  </span>
                  <span className="font-black text-slate-700 text-sm">{func.cargo}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                    <DollarSign size={14} className="text-[#A696D1]" /> Custo/Hora
                  </span>
                  <span className="font-black text-[#302464] text-sm">R$ {func.custo_hora}</span>
                </div>
              </div>
              
              {/* DICA VISUAL PARA O USUÁRIO SABER QUE É CLICÁVEL */}
              <div className="absolute inset-x-0 bottom-0 h-1 bg-[#7C69AF] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#302464]/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-8 relative border border-white/20">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 text-slate-400 hover:text-[#302464]">
              <X size={24} />
            </button>

            <h3 className="font-black text-[#302464] text-2xl mb-2">Novo Membro</h3>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-8">Credenciais de acesso automáticas</p>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#7C69AF] transition-colors"><User size={18} /></span>
                  <input 
                    name="nome" type="text" required value={formData.nome} onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-purple-500/5 outline-none transition-all font-bold text-[#302464]"
                    placeholder="Ex: João da Silva"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cargo</label>
                  <select 
                    name="cargo" value={formData.cargo} onChange={handleChange}
                    className="w-full px-4 py-3.5 bg-slate-50 border-none rounded-2xl outline-none font-bold text-slate-700 cursor-pointer"
                  >
                    <option value="TECNICO">Técnico</option>
                    <option value="ESTAGIARIO">Estagiário</option>
                    <option value="GESTOR">Gestor</option>
                    <option value="SOCIO">Sócio</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Custo/Hora</label>
                  <input 
                    name="custo_hora" type="number" step="0.01" required value={formData.custo_hora} onChange={handleChange}
                    className="w-full px-4 py-3.5 bg-slate-50 border-none rounded-2xl outline-none font-bold text-[#302464]"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="bg-purple-50 p-5 rounded-[1.5rem] border border-purple-100 flex gap-4 items-start">
                <div className="p-2 bg-white rounded-xl shadow-sm text-[#7C69AF] shrink-0">
                    <Shield size={20} />
                </div>
                <p className="text-[10px] text-[#7C69AF] font-bold leading-relaxed">
                  SENHA TEMPORÁRIA: <span className="font-black underline decoration-2">Mudar@123456</span>. 
                  O colaborador poderá alterar foto e senha no perfil.
                </p>
              </div>

              <button 
                type="submit" 
                className="w-full py-5 bg-gradient-to-r from-[#302464] to-[#7C69AF] text-white rounded-3xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-purple-900/20 active:scale-95 transition-all mt-4"
              >
                Ativar Colaborador
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}