import api from './api';

const chamadoService = {
  // LISTAR GERAL: Mantido para a tela de listagem principal
  listar: async (pagina = 1, dataInicio = '', dataFim = '', status = '') => {
    const params = new URLSearchParams({
      page: pagina,
      data_inicio: dataInicio,
      data_fim: dataFim,
      status: status
    });
    // Remove params vazios para não sujar a URL
    if (!dataInicio) params.delete('data_inicio');
    if (!dataFim) params.delete('data_fim');
    if (!status) params.delete('status');

    const response = await api.get(`/chamados/?${params.toString()}`);
    return response.data; // Retorna { count, next, results: [] }
  },

  // --- NOVO MÉTODO: LISTAR POR CLIENTE (Usado na Documentação) ---
  listarPorCliente: async (clienteId, pagina = 1) => {
    const response = await api.get('/chamados/', {
        params: {
            cliente: clienteId, // O Backend deve filtrar por ?cliente=ID
            page: pagina
        }
    });
    return response.data;
  },
  // ---------------------------------------------------------------

  buscarPorId: async (id) => {
    const response = await api.get(`/chamados/${id}/`);
    return response.data;
  },

  criar: async (dados) => {
    const payload = { ...dados };
    if (payload.data_agendamento) {
      payload.data_agendamento = new Date(payload.data_agendamento).toISOString();
    }
    const response = await api.post('/chamados/', payload);
    return response.data;
  },
  
  atualizar: async (id, dados) => {
    const payload = { ...dados };
    // Verifica se data_agendamento é válida antes de converter
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
  getDashboardStats: async (mesAno) => {
    const response = await api.get('/chamados/estatisticas/', {
      params: { mes: mesAno }
    });
    return response.data; 
  }
};

export default chamadoService;