import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// REMOVIDO: import axios from 'axios';
import { 
  Plus, Clock, Briefcase, Building2, Calendar, MapPin, Truck 
} from 'lucide-react';

// IMPORTAÇÃO DOS SERVIÇOS
import chamadoService from '../services/chamadoService';
import equipeService from '../services/equipeService';
import clienteService from '../services/clienteService';

export default function Chamados() {
  const [chamados, setChamados] = useState([]);
  const [equipe, setEquipe] = useState([]); 
  const [clientes, setClientes] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  // Controle do Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('PADRAO'); // 'PADRAO' ou 'VISITA'
  
  const navigate = useNavigate();

  // Estados do Formulário
  const [clienteId, setClienteId] = useState('');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [prioridade, setPrioridade] = useState('MEDIA');
  const [origem, setOrigem] = useState('TELEFONE');
  
  // Novos Estados para Visita
  const [dataAgendamento, setDataAgendamento] = useState('');
  const [tecnicosSelecionados, setTecnicosSelecionados] = useState([]); // Array de IDs

  // --- REFATORADO: Carregamento com Serviços ---
  const carregarDados = async () => {
    try {
      // Promise.all continua sendo usado para performance
      const [dadosChamados, dadosEquipe, dadosClientes] = await Promise.all([
        chamadoService.listar(),
        equipeService.listar(),
        clienteService.listar()
      ]);
      
      setChamados(dadosChamados);
      setEquipe(dadosEquipe);
      setClientes(dadosClientes);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const abrirModal = (modo) => {
    setModalMode(modo);
    // Limpar form ao abrir
    setTitulo('');
    setDescricao('');
    setTecnicosSelecionados([]);
    setClienteId('');
    setOrigem('TELEFONE');
    setDataAgendamento('');
    setIsModalOpen(true);
  };

  const toggleTecnico = (id) => {
    setTecnicosSelecionados(prev => {
      if (prev.includes(id)) {
        return prev.filter(t => t !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // --- REFATORADO: Submit com Serviço ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!clienteId) {
      alert("Por favor, selecione um cliente.");
      return;
    }

    const isVisita = modalMode === 'VISITA';

    const payload = {
      cliente: clienteId,
      titulo,
      descricao_detalhada: descricao,
      origem: origem,
      status: isVisita ? 'AGENDADO' : 'ABERTO',
      tipo_atendimento: isVisita ? 'VISITA' : 'REMOTO',
      data_agendamento: isVisita ? dataAgendamento : null,
      prioridade,
      tecnicos: tecnicosSelecionados 
    };

    try {
      // Chamada limpa ao serviço
      await chamadoService.criar(payload);
      
      alert(isVisita ? "Visita agendada com sucesso!" : "Chamado aberto com sucesso!");
      setIsModalOpen(false);
      carregarDados();
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar. Verifique se preencheu a Data em caso de visita.");
    }
  };

  // Funções Auxiliares de UI (Mantidas)
  const getPriorityColor = (p) => {
    const map = { 'BAIXA': 'bg-blue-100 text-blue-700', 'MEDIA': 'bg-yellow-100 text-yellow-700', 'ALTA': 'bg-orange-100 text-orange-700', 'CRITICA': 'bg-red-100 text-red-700' };
    return map[p] || 'bg-gray-100';
  };

  const getStatusColor = (s) => {
    const map = { 
        'ABERTO': 'bg-green-100 text-green-700', 
        'EM_ANDAMENTO': 'bg-blue-100 text-blue-700', 
        'FINALIZADO': 'bg-gray-100 text-gray-600', 
        'CANCELADO': 'bg-red-100 text-red-700',
        'AGENDADO': 'bg-purple-100 text-purple-700'
    };
    return map[s] || 'bg-gray-100';
  };

  return (
    <div>
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Central de Atendimento</h1>
          <p className="text-gray-500 text-sm mt-1">Gerencie chamados remotos e visitas técnicas.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => abrirModal('VISITA')} className="bg-white border border-primary-dark text-primary-dark hover:bg-gray-50 px-5 py-2 rounded-lg flex items-center gap-2 text-sm font-bold shadow-sm transition-all">
            <Calendar size={18} /> Agendar Visita
          </button>
          <button onClick={() => abrirModal('PADRAO')} className="bg-primary-dark hover:bg-[#1a1b4b] text-white px-5 py-2 rounded-lg flex items-center gap-2 text-sm font-medium shadow-lg transition-all">
            <Plus size={18} /> Novo Chamado
          </button>
        </div>
      </div>

      {/* LISTA DE CHAMADOS */}
      <div className="grid gap-4">
        {loading ? <p>Carregando...</p> : chamados.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500 mb-4">Nenhum atendimento encontrado.</p>
            <button onClick={() => abrirModal('PADRAO')} className="text-primary-dark font-bold hover:underline">Criar o Primeiro</button>
          </div>
        ) : (
          chamados.map((ticket) => (
            <div 
              key={ticket.id} 
              onClick={() => navigate(`/chamados/${ticket.id}`)}
              className="cursor-pointer bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row justify-between gap-4 items-start md:items-center group"
            >
              
              <div className="flex gap-4 items-start">
                <div className={`p-3 rounded-full mt-1 ${ticket.tipo_atendimento === 'VISITA' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                  {ticket.tipo_atendimento === 'VISITA' ? <Truck size={24} /> : <Briefcase size={24} />}
                </div>
                
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-gray-400">#{ticket.protocolo}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${getPriorityColor(ticket.prioridade)}`}>
                      {ticket.prioridade}
                    </span>
                    {ticket.tipo_atendimento === 'VISITA' && (
                        <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full uppercase font-bold flex items-center gap-1">
                            <MapPin size={10} /> Visita
                        </span>
                    )}
                  </div>
                  <h3 className="font-bold text-gray-800 text-lg group-hover:text-primary-dark transition-colors">{ticket.titulo}</h3>
                  <p className="text-gray-500 text-sm mt-1 line-clamp-1">{ticket.descricao_detalhada}</p>
                  
                  {ticket.nome_cliente && (
                      <p className="text-xs text-gray-500 font-semibold mt-2 flex items-center gap-1">
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
                    
                    {ticket.tipo_atendimento === 'VISITA' && ticket.data_agendamento ? (
                        <p className="text-xs text-purple-600 mt-1 flex items-center justify-end gap-1 font-bold">
                           <Calendar size={12} /> {new Date(ticket.data_agendamento).toLocaleString('pt-BR')}
                        </p>
                    ) : (
                        <p className="text-xs text-gray-400 mt-1 flex items-center justify-end gap-1">
                           <Clock size={12} /> {new Date(ticket.created_at).toLocaleDateString('pt-BR')}
                        </p>
                    )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL UNIFICADO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                  {modalMode === 'VISITA' ? <><Truck size={24} className="text-purple-600"/> Agendar Visita Técnica</> : <><Plus size={24} className="text-blue-600"/> Abrir Chamado Remoto</>}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* CAMPO ESPECÍFICO DE VISITA */}
              {modalMode === 'VISITA' && (
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                      <label className="block text-sm font-bold text-purple-900 mb-1">Data e Hora da Visita</label>
                      <input 
                        required 
                        type="datetime-local" 
                        className="w-full px-4 py-2 border border-purple-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-500/50 bg-white"
                        value={dataAgendamento}
                        onChange={e => setDataAgendamento(e.target.value)}
                      />
                  </div>
              )}

              {/* CLIENTE */}
              <div>
                <div className="flex justify-between">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cliente Solicitante</label>
                    <button type="button" onClick={() => navigate('/clientes')} className="text-xs text-primary-dark hover:underline font-bold">
                        + Novo Cliente Avulso
                    </button>
                </div>
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
                  value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex: Servidor Parado / Instalação de Impressora" />
              </div>

              {/* DESCRIÇÃO */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição Detalhada</label>
                <textarea required rows="3" className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-light/50"
                  value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Detalhes do que precisa ser feito..." />
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

                {/* ORIGEM */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Origem</label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none bg-white"
                      value={origem} onChange={e => setOrigem(e.target.value)}>
                      <option value="TELEFONE">Telefone</option>
                      <option value="WHATSAPP">WhatsApp</option>
                      <option value="EMAIL">E-mail</option>
                  </select>
                </div>
              </div>

              {/* SELEÇÃO DE TÉCNICOS */}
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Técnicos Designados ({tecnicosSelecionados.length})</label>
                  <div className="border border-gray-200 rounded-lg p-3 max-h-32 overflow-y-auto bg-gray-50">
                      {equipe.map(tec => (
                          <div key={tec.id} className="flex items-center gap-2 mb-2 last:mb-0">
                              <input 
                                type="checkbox" 
                                id={`tec-${tec.id}`} 
                                checked={tecnicosSelecionados.includes(tec.id)}
                                onChange={() => toggleTecnico(tec.id)}
                                className="w-4 h-4 text-primary-dark rounded focus:ring-primary-light"
                              />
                              <label htmlFor={`tec-${tec.id}`} className="text-sm text-gray-700 cursor-pointer select-none flex-1">
                                  {tec.nome} <span className="text-xs text-gray-400">({tec.cargo})</span>
                              </label>
                          </div>
                      ))}
                      {equipe.length === 0 && <p className="text-xs text-gray-400">Nenhuma equipe cadastrada.</p>}
                  </div>
              </div>

              <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button type="submit" className={`px-6 py-2 text-white rounded-lg shadow-lg font-bold transition-all ${modalMode === 'VISITA' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-primary-dark hover:bg-[#1a1b4b]'}`}>
                    {modalMode === 'VISITA' ? 'Confirmar Agendamento' : 'Abrir Chamado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}