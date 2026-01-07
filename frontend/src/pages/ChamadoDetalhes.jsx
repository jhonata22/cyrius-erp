import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, User, MapPin, Calendar, Clock, 
  AlertCircle, CheckCircle, Briefcase, Save, Truck, DollarSign, Users 
} from 'lucide-react';

export default function ChamadoDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [chamado, setChamado] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [tecnicosDetalhados, setTecnicosDetalhados] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados de Edição
  const [status, setStatus] = useState('');
  const [prioridade, setPrioridade] = useState('');
  
  // Novos Estados para Visita
  const [dataAgendamento, setDataAgendamento] = useState('');
  const [custoTransporte, setCustoTransporte] = useState(0);

  useEffect(() => {
    carregarDados();
  }, [id]);

  const carregarDados = async () => {
    try {
      // CORREÇÃO: URL Relativa para o Nginx
      const resChamado = await axios.get(`/api/chamados/${id}/`);
      const dados = resChamado.data;
      
      setChamado(dados);
      setStatus(dados.status);
      setPrioridade(dados.prioridade);
      
      // Prepara campos de visita
      if (dados.data_agendamento) {
        const date = new Date(dados.data_agendamento);
        date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
        setDataAgendamento(date.toISOString().slice(0, 16));
      }
      setCustoTransporte(dados.custo_transporte || 0);

      // CORREÇÃO: URL Relativa para Cliente
      if (dados.cliente) {
        const resCliente = await axios.get(`/api/clientes/${dados.cliente}/`);
        setCliente(resCliente.data);
      }

      // CORREÇÃO: URL Relativa para Equipe
      if (dados.tecnicos && dados.tecnicos.length > 0) {
        const reqs = dados.tecnicos.map(tId => axios.get(`/api/equipe/${tId}/`));
        const resps = await Promise.all(reqs);
        setTecnicosDetalhados(resps.map(r => r.data));
      }

    } catch (error) {
      console.error("Erro ao carregar detalhes:", error);
      alert("Erro ao carregar dados do chamado.");
    } finally {
      setLoading(false);
    }
  };

  const handleSalvar = async () => {
    try {
      const payload = {
        status,
        prioridade,
        custo_transporte: parseFloat(custoTransporte),
        data_agendamento: dataAgendamento ? dataAgendamento : null
      };

      // CORREÇÃO: PATCH com URL Relativa
      await axios.patch(`/api/chamados/${id}/`, payload);
      alert("Atualizado com sucesso!");
      carregarDados(); 
    } catch (error) {
      console.error(error);
      alert("Erro ao atualizar chamado.");
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando detalhes...</div>;
  if (!chamado) return <div className="p-8 text-center text-red-500">Chamado não encontrado.</div>;

  const isVisita = chamado.tipo_atendimento === 'VISITA';

  return (
    <div className="max-w-5xl mx-auto pb-10">
      {/* Botão Voltar */}
      <button onClick={() => navigate('/chamados')} className="flex items-center text-gray-500 hover:text-primary-dark mb-6 text-sm font-medium transition-colors">
        <ArrowLeft size={18} className="mr-2" /> Voltar para Lista
      </button>

      {/* CABEÇALHO */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="font-mono text-lg font-bold text-gray-400">#{chamado.protocolo}</span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${prioridade === 'CRITICA' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
              {prioridade}
            </span>
            {isVisita && (
                 <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-purple-100 text-purple-700 flex items-center gap-1">
                    <Truck size={12} /> Visita Técnica
                 </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-800">{chamado.titulo}</h1>
        </div>
        
        {/* Painel de Controle (Status e Save) */}
        <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg border border-gray-200 shadow-sm">
          <select 
            value={status} 
            onChange={e => setStatus(e.target.value)}
            className="bg-white border-none text-sm font-bold text-gray-700 focus:ring-0 rounded-md py-2 pl-3 pr-8 cursor-pointer outline-none"
          >
            <option value="ABERTO">🔓 Aberto</option>
            <option value="AGENDADO">📅 Agendado</option>
            <option value="EM_ANDAMENTO">🔨 Em Andamento</option>
            <option value="FINALIZADO">✅ Finalizado</option>
            <option value="CANCELADO">🚫 Cancelado</option>
          </select>
          <button 
            onClick={handleSalvar}
            className="bg-primary-dark text-white p-2 rounded-md hover:bg-primary-light transition-colors shadow-md"
            title="Salvar Alterações"
          >
            <Save size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUNA DA ESQUERDA: CLIENTE E TÉCNICOS */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* CLIENTE */}
          {cliente && (
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <User size={14} /> Cliente
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-bold text-gray-800">{cliente.razao_social}</p>
                  <p className="text-xs text-gray-500">{cliente.cnpj || cliente.cpf}</p>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin size={16} className="text-primary-light mt-0.5 shrink-0" />
                  <p className="text-sm text-gray-600">{cliente.endereco}</p>
                </div>
                <button 
                    onClick={() => navigate(`/documentacao/${cliente.id}`)}
                    className="w-full py-2 text-xs font-bold text-primary-dark bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors border border-blue-100"
                  >
                    Ver Documentação Técnica
                </button>
              </div>
            </div>
          )}

          {/* EQUIPE TÉCNICA */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Users size={14} /> Equipe Designada
              </h3>
              <div className="space-y-3">
                 {tecnicosDetalhados.length > 0 ? tecnicosDetalhados.map(tec => (
                     <div key={tec.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                        <div className="w-8 h-8 bg-primary-dark/10 rounded-full flex items-center justify-center text-primary-dark text-xs font-bold">
                            {tec.nome.charAt(0)}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-700">{tec.nome}</p>
                            <p className="text-[10px] text-gray-500 uppercase">{tec.cargo}</p>
                        </div>
                     </div>
                 )) : (
                     <p className="text-sm text-gray-400 italic">Nenhum técnico vinculado.</p>
                 )}
              </div>
          </div>
        </div>

        {/* COLUNA DA DIREITA: DESCRIÇÃO, CUSTOS E DATA */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* SE FOR VISITA: CARD DE AGENDAMENTO E CUSTOS */}
          {isVisita && (
              <div className="bg-purple-50 p-6 rounded-xl border border-purple-100 grid md:grid-cols-2 gap-6">
                  <div>
                      <label className="block text-xs font-bold text-purple-800 uppercase mb-2 flex items-center gap-2">
                          <Calendar size={14} /> Data da Visita
                      </label>
                      <input 
                        type="datetime-local" 
                        className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500/50 outline-none"
                        value={dataAgendamento}
                        onChange={e => setDataAgendamento(e.target.value)}
                      />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-purple-800 uppercase mb-2 flex items-center gap-2">
                          <DollarSign size={14} /> Custo Transporte (R$)
                      </label>
                      <input 
                        type="number"
                        step="0.01"
                        className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500/50 outline-none"
                        value={custoTransporte}
                        onChange={e => setCustoTransporte(e.target.value)}
                        placeholder="0.00"
                      />
                  </div>
              </div>
          )}

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Descrição da Solicitação</h3>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
              {chamado.descricao_detalhada}
            </div>
            <div className="mt-4 text-xs text-gray-400 flex justify-between">
                <span>Origem: {chamado.origem}</span>
                <span>Aberto em: {new Date(chamado.created_at).toLocaleString('pt-BR')}</span>
            </div>
          </div>

          {/* Placeholder para Apontamentos Futuros */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 opacity-60 hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-2 mb-4">
                <Briefcase size={20} className="text-gray-400" />
                <h3 className="text-lg font-bold text-gray-400">Apontamento de Horas</h3>
              </div>
              <p className="text-sm text-gray-400">
                Em breve, você poderá descrever o serviço realizado aqui e calcular o valor final das horas técnicas.
              </p>
          </div>
        </div>

      </div>
    </div>
  );
}