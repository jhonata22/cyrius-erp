import { useState, useEffect } from 'react';
// Alterado: Importamos a nossa instância personalizada
import api from '../services/api'; 
import { Plus, User, Briefcase, DollarSign, Trash2, Shield } from 'lucide-react';

export default function Equipe() {
  const [funcionarios, setFuncionarios] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Estados do Formulário
  const [nome, setNome] = useState('');
  const [cargo, setCargo] = useState('TECNICO'); 
  const [custoHora, setCustoHora] = useState('');

  // Carregar dados da API usando a instância centralizada
  const carregarEquipe = () => {
    api.get('/equipe/')
      .then(response => setFuncionarios(response.data))
      .catch(error => console.error("Erro ao carregar equipe:", error));
  };

  useEffect(() => {
    carregarEquipe();
  }, []);

  // Salvar Novo Funcionário
  const handleSubmit = (e) => {
    e.preventDefault();
    
    const dados = {
      nome,
      cargo,
      custo_hora: parseFloat(custoHora)
    };

    // Simplificado: O token e a baseURL já estão configurados no api.js
    api.post('/equipe/', dados)
      .then(() => {
        setIsModalOpen(false);
        carregarEquipe();
        setNome('');
        setCustoHora('');
        alert("Colaborador cadastrado com sucesso!");
      })
      .catch(error => {
        console.error(error);
        alert("Erro ao salvar colaborador. Verifique os dados.");
      });
  };

  // Excluir colaborador
  const excluirFuncionario = (id) => {
    if (window.confirm("Tem certeza que deseja remover este funcionário? Isso pode afetar chamados vinculados.")) {
      api.delete(`/equipe/${id}/`)
        .then(() => carregarEquipe())
        .catch(error => alert("Erro ao excluir colaborador."));
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestão de Equipe</h1>
          <p className="text-gray-500 text-sm mt-1">Gerencie os técnicos e níveis de acesso do Cyrius ERP.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary-dark hover:bg-[#1a1b4b] text-white px-5 py-2.5 rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-indigo-900/20 text-sm font-bold"
        >
          <Plus size={18} />
          Novo Colaborador
        </button>
      </div>

      {/* GRID DE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {funcionarios.map(func => (
          <div key={func.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative group">
            
            <button 
              onClick={() => excluirFuncionario(func.id)}
              className="absolute top-4 right-4 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Remover Colaborador"
            >
              <Trash2 size={18} />
            </button>

            <div className="flex items-center gap-4 mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-inner
                ${func.cargo === 'GESTOR' || func.cargo === 'SOCIO' ? 'bg-indigo-600' : 'bg-blue-500'}`}>
                {func.nome.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-gray-800">{func.nome}</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider
                  ${func.cargo === 'GESTOR' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'}`}>
                  {func.cargo}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-sm text-gray-500 border-t border-gray-50 pt-4">
              <div className="flex items-center gap-2">
                <Briefcase size={16} className="text-gray-400" />
                <span>Cargo: <span className="text-gray-700 font-medium">{func.cargo}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign size={16} className="text-gray-400" />
                <span>Custo/Hora: <span className="text-gray-700 font-medium">R$ {func.custo_hora}</span></span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 border border-gray-100 animate-in fade-in zoom-in duration-200">
            <h3 className="font-bold text-gray-800 text-lg mb-6">Cadastrar Novo Colaborador</h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Nome Completo</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><User size={18} /></span>
                  <input 
                    type="text" required value={nome} onChange={e => setNome(e.target.value)}
                    className="w-full pl-10 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-light/50 outline-none transition-all"
                    placeholder="Nome do colaborador"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Nível de Acesso</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Shield size={18} /></span>
                  <select 
                    value={cargo} onChange={e => setCargo(e.target.value)}
                    className="w-full pl-10 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-light/50 outline-none bg-white transition-all"
                  >
                    <option value="TECNICO">Técnico (Operacional)</option>
                    <option value="GESTOR">Gestor (Administrativo)</option>
                    <option value="SOCIO">Sócio (Administrativo)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Custo por Hora (R$)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><DollarSign size={18} /></span>
                  <input 
                    type="number" step="0.01" required value={custoHora} onChange={e => setCustoHora(e.target.value)}
                    className="w-full pl-10 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-light/50 outline-none transition-all"
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-500 hover:text-gray-700 font-medium rounded-lg transition-colors">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-primary-dark text-white rounded-lg hover:bg-[#1a1b4b] font-bold shadow-md transition-all">Salvar Colaborador</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}