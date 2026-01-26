import api from './api';

const chamadoService = {
  // LISTAR: Mantido para a tela de listagem (Chamados.jsx) com paginação
  listar: async (pagina = 1, dataInicio = '', dataFim = '', status = '') => {
    const params = new URLSearchParams({
      page: pagina,
      data_inicio: dataInicio,
      data_fim: dataFim,
      status: status
    });
    const response = await api.get(`/chamados/?${params.toString()}`);
    return response.data; // Retorna { count, next, results: [] }
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

  // ESTATÍSTICAS DO DASHBOARD (Refatorado para a nova rota do Backend)
  getDashboardStats: async (mesAno) => {
    /**
     * mesAno chega como "2026-01".
     * Chamamos a nova action @action estatisticas do Django.
     * Isso ignora a paginação e traz os dados reais de todo o mês.
     */
    const response = await api.get('/chamados/estatisticas/', {
      params: { mes: mesAno }
    });
    
    // Agora retornamos os dados exatamente como o Django envia
    return response.data; 
  }
};

export default chamadoService;