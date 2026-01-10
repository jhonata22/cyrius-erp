import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// REMOVIDO: import axios from 'axios';
import { Plus, Search, MapPin, Calendar, FileText, Building2, User } from 'lucide-react';

// IMPORTAÇÃO DO SERVIÇO
import clienteService from '../services/clienteService';

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [busca, setBusca] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  // Estados do Formulário
  const [razaoSocial, setRazaoSocial] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [endereco, setEndereco] = useState('');
  const [tipo, setTipo] = useState('CONTRATO');
  const [valor, setValor] = useState('');
  const [diaVencimento, setDiaVencimento] = useState(5);

  // --- REFATORADO: Função de Carregamento ---
  const carregarClientes = async () => {
    try {
      const dados = await clienteService.listar();
      setClientes(dados);
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
    }
  };

  useEffect(() => {
    carregarClientes();
  }, []);

  // --- REFATORADO: Função de Submit ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        razao_social: razaoSocial,
        cnpj: cpfCnpj.length > 11 ? cpfCnpj : null,
        cpf: cpfCnpj.length <= 11 ? cpfCnpj : null,
        endereco,
        tipo_cliente: tipo,
        valor_contrato_mensal: parseFloat(valor),
        dia_vencimento: parseInt(diaVencimento)
      };

      // Chamada limpa ao serviço
      await clienteService.criar(payload);
      
      alert("Cliente cadastrado!");
      setIsModalOpen(false);
      carregarClientes();
      
      // Limpar form
      setRazaoSocial(''); 
      setCpfCnpj(''); 
      setEndereco(''); 
      setValor('');
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar cliente.");
    }
  };

  // Filtro de busca (Mantido igual)
  const clientesFiltrados = clientes.filter(c => 
    c.razao_social.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Carteira de Clientes</h1>
          <p className="text-gray-500 text-sm">Gerencie contratos e clientes avulsos.</p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <input 
              type="text" 
              placeholder="Buscar cliente..." 
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-light/50"
            />
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
          <button onClick={() => setIsModalOpen(true)} className="bg-primary-dark hover:bg-[#1a1b4b] text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium shadow-lg transition-all">
            <Plus size={18} /> <span className="hidden md:inline">Novo Cliente</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clientesFiltrados.map(cliente => (
          <div 
            key={cliente.id} 
            onClick={() => navigate(`/documentacao/${cliente.id}`)}
            className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
          >
            {/* Faixa lateral colorida baseada no tipo */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${cliente.tipo_cliente === 'CONTRATO' ? 'bg-green-500' : 'bg-gray-400'}`}></div>

            <div className="flex justify-between items-start mb-4 pl-2">
              <div className={`p-3 rounded-lg ${cliente.tipo_cliente === 'CONTRATO' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                {cliente.tipo_cliente === 'CONTRATO' ? <Building2 size={24} /> : <User size={24} />}
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${cliente.tipo_cliente === 'CONTRATO' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {cliente.tipo_cliente}
              </span>
            </div>

            <div className="pl-2">
              <h3 className="font-bold text-gray-800 text-lg group-hover:text-primary-dark transition-colors">{cliente.razao_social}</h3>
              <p className="text-gray-400 text-xs mt-1 font-mono">{cliente.cnpj || cliente.cpf || 'Sem Doc'}</p>
              
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <MapPin size={16} /> <span className="truncate">{cliente.endereco}</span>
                </div>
                {cliente.tipo_cliente === 'CONTRATO' && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar size={16} /> <span>Vence dia {cliente.dia_vencimento}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-50 pl-2 flex justify-between items-center">
               <span className="text-xs text-gray-400">Ver documentação</span>
               <FileText size={18} className="text-gray-300 group-hover:text-primary-light" />
            </div>
          </div>
        ))}
      </div>

      {/* MODAL NOVO CLIENTE */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="font-bold text-gray-800 text-lg mb-6">Novo Cliente</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Razão Social / Nome</label>
                <input required type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" 
                  value={razaoSocial} onChange={e => setRazaoSocial(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">CPF / CNPJ</label>
                   <input required type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" 
                     value={cpfCnpj} onChange={e => setCpfCnpj(e.target.value)} placeholder="Apenas números" />
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                   <select className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none bg-white"
                     value={tipo} onChange={e => setTipo(e.target.value)}>
                     <option value="CONTRATO">Contrato Mensal</option>
                     <option value="AVULSO">Avulso</option>
                   </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Endereço Completo</label>
                <input required type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" 
                  value={endereco} onChange={e => setEndereco(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Valor Mensal (R$)</label>
                   <input required type="number" step="0.01" className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" 
                     value={valor} onChange={e => setValor(e.target.value)} />
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Dia Vencimento</label>
                   <input required type="number" max="31" min="1" className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" 
                     value={diaVencimento} onChange={e => setDiaVencimento(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-primary-dark text-white rounded-lg hover:bg-[#1a1b4b]">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}