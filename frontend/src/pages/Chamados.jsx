import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Clock, AlertCircle, Briefcase, User, Building2, Phone } from 'lucide-react'; // Adicionei Phone

export default function Chamados() {
  const [chamados, setChamados] = useState([]);
  const [equipe, setEquipe] = useState([]); 
  const [clientes, setClientes] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const navigate = useNavigate();

  // Estados do Formulário
  const [clienteId, setClienteId] = useState('');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [prioridade, setPrioridade] = useState('MEDIA');
  const [origem, setOrigem] = useState('TELEFONE'); // <--- NOVO ESTADO
  const [tecnicoResponsavel, setTecnicoResponsavel] = useState('');

  // 1. Carregar Tudo
  const carregarDados = async () => {
    try {
      const [resChamados, resEquipe, resClientes] = await Promise.all([
        axios.get('http://localhost:8000/api/chamados/'),
        axios.get('http://localhost:8000/api/equipe/'),
        axios.get('http://localhost:8000/api/clientes/')
      ]);
      setChamados(resChamados.data);
      setEquipe(resEquipe.data);
      setClientes(resClientes.data);
    } catch (error) {
      console.error("Erro ao carregar:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!clienteId) {
      alert("Por favor, selecione um cliente.");
      return;
    }

    const payload = {
      cliente: clienteId,
      titulo,
      descricao_detalhada: descricao,
      origem: origem, // <--- AGORA USA O QUE VOCÊ ESCOLHEU
      status: 'ABERTO',
      prioridade,
      tecnicos: tecnicoResponsavel ? [tecnicoResponsavel] : [] 
    };

    try {
      await axios.post('http://localhost:8000/api/chamados/', payload);
      alert("Chamado aberto com sucesso!");
      setIsModalOpen(false);
      carregarDados();
      
      // Limpa formulário
      setTitulo('');
      setDescricao('');
      setTecnicoResponsavel('');
      setClienteId('');
      setOrigem('TELEFONE'); // Reseta para o padrão
    } catch (error) {
      console.error(error);
      alert("Erro ao abrir chamado.");
    }
  };

  const getPriorityColor = (p) => {
    const map = { 'BAIXA': 'bg-blue-100 text-blue-700', 'MEDIA': 'bg-yellow-100 text-yellow-700', 'ALTA': 'bg-orange-100 text-orange-700', 'CRITICA': 'bg-red-100 text-red-700' };
    return map[p] || 'bg-gray-100';
  };

  const getStatusColor = (s) => {
    const map = { 'ABERTO': 'bg-green-100 text-green-700', 'EM_ANDAMENTO': 'bg-blue-100 text-blue-700', 'FINALIZADO': 'bg-gray-100 text-gray-600', 'CANCELADO': 'bg-red-100 text-red-700' };
    return map[s] || 'bg-gray-100';
  };

  return (
    <div>
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Central de Chamados</h1>
          <p className="text-gray-500 text-sm mt-1">Gerencie solicitações e atendimentos técnicos.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setIsModalOpen(true)} className="bg-primary-dark hover:bg-[#1a1b4b] text-white px-5 py-2 rounded-lg flex items-center gap-2 text-sm font-medium shadow-lg transition-all">
            <Plus size={18} /> Novo Chamado
          </button>
        </div>
      </div>

      {/* LISTA DE CHAMADOS */}
      <div className="grid gap-4">
        {loading ? <p>Carregando...</p> : chamados.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500">Nenhum chamado encontrado.</p>
          </div>
        ) : (
          chamados.map((ticket) => (
            <div 
              key={ticket.id} 
              onClick={() => navigate(`/chamados/${ticket.id}`)}
              className="cursor-pointer bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row justify-between gap-4 items-start md:items-center"
            >
              
              <div className="flex gap-4 items-start">
                <div className={`p-3 rounded-full mt-1 ${ticket.prioridade === 'CRITICA' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                  {ticket.prioridade === 'CRITICA' ? <AlertCircle size={24} /> : <Briefcase size={24} />}
                </div>
                
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-gray-400">#{ticket.protocolo}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${getPriorityColor(ticket.prioridade)}`}>
                      {ticket.prioridade}
                    </span>
                    {/* Exibe a origem na lista também, se quiser */}
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full uppercase">
                       {ticket.origem}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-800 text-lg">{ticket.titulo}</h3>
                  <p className="text-gray-500 text-sm mt-1 line-clamp-1">{ticket.descricao_detalhada}</p>
                  
                  {ticket.nome_cliente && (
                     <p className="text-xs text-primary-dark font-semibold mt-2 flex items-center gap-1">
                        <Building2 size={12} /> {ticket.nome_cliente}
                     </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0 border-gray-100">
                <div className="text-right mr-4">
                   <span className={`text-xs font-bold px-3 py-1 rounded-full ${getStatusColor(ticket.status)}`}>
                     {ticket.status.replace('_', ' ')}
                   </span>
                   <p className="text-xs text-gray-400 mt-1 flex items-center justify-end gap-1">
                     <Clock size={12} /> {new Date(ticket.created_at).toLocaleDateString('pt-BR')}
                   </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-gray-800 text-lg">Abrir Novo Chamado</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente Solicitante</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Building2 size={18} /></span>
                  <select 
                    required 
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-primary-light/50"
                    value={clienteId} 
                    onChange={e => setClienteId(e.target.value)}
                  >
                    <option value="">Selecione um cliente...</option>
                    {clientes.map(cli => (
                      <option key={cli.id} value={cli.id}>{cli.razao_social}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* TÍTULO */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título do Problema</label>
                <input required type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-light/50" 
                  value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex: Computador não liga" />
              </div>

              {/* DESCRIÇÃO */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição Detalhada</label>
                <textarea required rows="3" className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-light/50"
                  value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="O cliente relatou que..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* PRIORIDADE */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prioridade</label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none bg-white"
                    value={prioridade} onChange={e => setPrioridade(e.target.value)}>
                    <option value="BAIXA">Baixa</option>
                    <option value="MEDIA">Média</option>
                    <option value="ALTA">Alta</option>
                    <option value="CRITICA">Crítica (Urgente)</option>
                  </select>
                </div>

                {/* ORIGEM (NOVO CAMPO) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Origem</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Phone size={16} /></span>
                    <select className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg outline-none bg-white"
                      value={origem} onChange={e => setOrigem(e.target.value)}>
                      <option value="TELEFONE">Telefone</option>
                      <option value="WHATSAPP">WhatsApp</option>
                      <option value="EMAIL">E-mail</option>
                      <option value="PRESENCIAL">Presencial</option>
                      <option value="SISTEMA">Sistema</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* TÉCNICO */}
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Atribuir Técnico</label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none bg-white"
                    value={tecnicoResponsavel} onChange={e => setTecnicoResponsavel(e.target.value)}>
                    <option value="">-- Sem Técnico --</option>
                    {equipe.map(tec => (
                      <option key={tec.id} value={tec.id}>
                        {tec.nome} ({tec.cargo})
                      </option>
                    ))}
                  </select>
              </div>

              <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-primary-dark text-white rounded-lg hover:bg-[#1a1b4b] shadow-lg">Abrir Chamado</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}