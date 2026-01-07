import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, User, MapPin, Calendar, Clock, 
  AlertCircle, CheckCircle, Briefcase, Save 
} from 'lucide-react';

export default function ChamadoDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [chamado, setChamado] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [loading, setLoading] = useState(true);

  // Estados de Edição
  const [status, setStatus] = useState('');
  const [prioridade, setPrioridade] = useState('');

  useEffect(() => {
    carregarDados();
  }, [id]);

  const carregarDados = async () => {
    try {
      // 1. Busca o Chamado
      const resChamado = await axios.get(`http://localhost:8000/api/chamados/${id}/`);
      setChamado(resChamado.data);
      setStatus(resChamado.data.status);
      setPrioridade(resChamado.data.prioridade);

      // 2. Busca o Cliente vinculado ao chamado
      if (resChamado.data.cliente) {
        const resCliente = await axios.get(`http://localhost:8000/api/clientes/${resChamado.data.cliente}/`);
        setCliente(resCliente.data);
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
      await axios.patch(`http://localhost:8000/api/chamados/${id}/`, {
        status: status,
        prioridade: prioridade
      });
      alert("Chamado atualizado com sucesso!");
      navigate('/chamados'); // Volta para a lista
    } catch (error) {
      console.error(error);
      alert("Erro ao atualizar chamado.");
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando detalhes...</div>;
  if (!chamado) return <div className="p-8 text-center text-red-500">Chamado não encontrado.</div>;

  return (
    <div className="max-w-4xl mx-auto">
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
          </div>
          <h1 className="text-2xl font-bold text-gray-800">{chamado.titulo}</h1>
        </div>
        
        {/* Painel de Controle (Status) */}
        <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg border border-gray-200">
          <select 
            value={status} 
            onChange={e => setStatus(e.target.value)}
            className="bg-white border-none text-sm font-medium text-gray-700 focus:ring-0 rounded-md py-1.5 pl-3 pr-8 cursor-pointer outline-none"
          >
            <option value="ABERTO">🔓 Aberto</option>
            <option value="EM_ANDAMENTO">🔨 Em Andamento</option>
            <option value="FINALIZADO">✅ Finalizado</option>
            <option value="CANCELADO">🚫 Cancelado</option>
          </select>
          <button 
            onClick={handleSalvar}
            className="bg-primary-dark text-white p-2 rounded-md hover:bg-primary-light transition-colors"
            title="Salvar Alterações"
          >
            <Save size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* COLUNA DA ESQUERDA: DETALHES DO CLIENTE */}
        <div className="md:col-span-1 space-y-6">
          {cliente && (
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <User size={14} /> Dados do Cliente
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

                <div className="pt-3 border-t border-gray-50">
                  <button 
                    onClick={() => navigate(`/documentacao/${cliente.id}`)}
                    className="w-full py-2 text-xs font-bold text-primary-dark bg-primary-light/10 rounded-lg hover:bg-primary-light/20 transition-colors"
                  >
                    Ver Documentação Técnica
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Info do Chamado */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
             <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Clock size={14} /> Detalhes
              </h3>
              <div className="text-sm text-gray-600 space-y-2">
                <p><strong>Abertura:</strong> {new Date(chamado.created_at).toLocaleDateString('pt-BR')} às {new Date(chamado.created_at).toLocaleTimeString('pt-BR').slice(0,5)}</p>
                <p><strong>Origem:</strong> {chamado.origem}</p>
              </div>
          </div>
        </div>

        {/* COLUNA DA DIREITA: DESCRIÇÃO E HISTÓRICO */}
        <div className="md:col-span-2">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Descrição do Problema</h3>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
              {chamado.descricao_detalhada}
            </div>
          </div>

          {/* Placeholder para futuras interações */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 opacity-60">
             <div className="flex items-center gap-2 mb-4">
                <Briefcase size={20} className="text-gray-400" />
                <h3 className="text-lg font-bold text-gray-400">Apontamento de Horas</h3>
             </div>
             <p className="text-sm text-gray-400">
               Esta funcionalidade será ativada em breve. Aqui você poderá registrar o que foi feito e quanto tempo levou.
             </p>
          </div>
        </div>

      </div>
    </div>
  );
}