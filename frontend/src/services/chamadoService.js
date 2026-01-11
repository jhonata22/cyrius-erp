import api from './api';

const chamadoService = {
  listar: async () => {
    const response = await api.get('/chamados/');
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

  finalizar: async (id) => {
    const response = await api.patch(`/chamados/${id}/`, { status: 'FINALIZADO' });
    return response.data;
  },

  getDashboardStats: async () => {
    const chamados = await chamadoService.listar();
    const hojeStr = new Date().toISOString().split('T')[0];

    const stats = chamados.reduce((acc, c) => {
      if (c.status === 'ABERTO') acc.abertos++;
      else if (c.status === 'EM_ANDAMENTO') acc.emAndamento++;
      else if (c.status === 'FINALIZADO') acc.finalizados++;

      const isHoje = c.created_at?.startsWith(hojeStr) || c.data_agendamento?.startsWith(hojeStr);
      if (isHoje) {
        acc.hojeCount++;
        if (c.nome_cliente) acc.empresasHoje.add(c.nome_cliente);
      }
      return acc;
    }, { total: chamados.length, abertos: 0, emAndamento: 0, finalizados: 0, hojeCount: 0, empresasHoje: new Set() });

    return {
      ...stats,
      hoje: { quantidade: stats.hojeCount, empresas: Array.from(stats.empresasHoje) },
      grafico: [
        { name: 'Abertos', quantidade: stats.abertos, color: '#F6993F' },
        { name: 'Em Curso', quantidade: stats.emAndamento, color: '#3b82f6' },
        { name: 'Resolvidos', quantidade: stats.finalizados, color: '#2ecc71' },
      ]
    };
  }
};

export default chamadoService;