import api from './api';

const chamadoService = {
  // GET /api/chamados/?empresa=1&status=ABERTO
  listar: async (filtros = {}, empresaId = null) => {
    const params = { ...filtros };

    if (empresaId) {
      params.empresa = empresaId;
    }

    const response = await api.get('/chamados/', { params });
    return response.data;
  },

  // Útil para histórico de um cliente específico
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
      payload.data_agendamento = new Date(payload.data_agendamento).toISOString();
    }
    // Payload já contém 'empresa': id
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

  // Estatísticas para Dashboard
  getDashboardStats: async (mesAno, empresaId = null) => {
    const params = { mes: mesAno };
    if (empresaId) params.empresa = empresaId;

    const response = await api.get('/chamados/estatisticas/', { params });
    return response.data; 
  },
  
  // Rota alternativa de estatísticas
  estatisticas: async (mes, empresaId = null) => {
    const params = { mes };
    if (empresaId) params.empresa = empresaId;
    
    const response = await api.get('/chamados/estatisticas/', { params });
    return response.data;
  },

  listarAssuntos: async () => {
    const response = await api.get('/assuntos/');
    return response.data?.results || response.data || [];
  },

  listarRelacionados: async (id) => {
    const response = await api.get('/chamados/' + id + '/relacionados/');
    return response.data;
  },
};

export default chamadoService;
