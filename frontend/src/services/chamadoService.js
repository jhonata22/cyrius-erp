import api from './api';

const chamadoService = {
  // ATUALIZADO: Agora aceita um objeto de filtros e o ID da empresa
  listar: async (filtros = {}, empresaId = null) => {
    // Cria uma cópia dos filtros para não alterar o original
    const params = { ...filtros };

    // Se a empresa estiver selecionada, adiciona ao parâmetro
    if (empresaId) {
      params.empresa = empresaId;
    }

    // O Axios converte automaticamente o objeto params em query string
    // Ex: /chamados/?page=1&status=ABERTO&empresa=1
    const response = await api.get('/chamados/', { params });
    return response.data;
  },

  // --- NOVO MÉTODO: LISTAR POR CLIENTE ---
  listarPorCliente: async (clienteId, pagina = 1) => {
    const response = await api.get('/chamados/', {
        params: {
            cliente: clienteId,
            page: pagina
        }
    });
    return response.data;
  },
  
  buscarPorId: async (id) => {
    const response = await api.get(`/chamados/${id}/`);
    return response.data;
  },

  criar: async (dados) => {
    const payload = { ...dados };
    if (payload.data_agendamento) {
      // Garante formato ISO correto
      payload.data_agendamento = new Date(payload.data_agendamento).toISOString();
    }
    const response = await api.post('/chamados/', payload);
    return response.data;
  },
  
  atualizar: async (id, dados) => {
    const payload = { ...dados };
    if (payload.data_agendamento && payload.data_agendamento.length > 10) {
      payload.data_agendamento = new Date(payload.data_agendamento).toISOString();
    }
    const response = await api.patch(`/chamados/${id}/`, payload);
    return response.data;
  },

  finalizar: async (id, dadosFinalizacao) => {
    const response = await api.patch(`/chamados/${id}/`, {
      status: 'FINALIZADO',
      ...dadosFinalizacao
    });
    return response.data;
  },

  // ESTATÍSTICAS DO DASHBOARD
  getDashboardStats: async (mesAno, empresaId = null) => {
    const params = { mes: mesAno };
    if (empresaId) params.empresa = empresaId;

    const response = await api.get('/chamados/estatisticas/', { params });
    return response.data; 
  },
  
  // ESTATÍSTICAS PARA A TELA DE CHAMADOS (MÉTODO NOVO SUGERIDO)
  // Se você usar estatísticas na tela de listagem, use este padrão:
  estatisticas: async (mes, empresaId = null) => {
    const params = { mes };
    if (empresaId) params.empresa = empresaId;
    
    const response = await api.get('/chamados/estatisticas/', { params });
    return response.data;
  },
};

export default chamadoService;