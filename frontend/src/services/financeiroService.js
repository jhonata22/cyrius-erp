import api from './api';

const financeiroService = {
  listar: async () => {
    const response = await api.get('/financeiro/');
    return response.data;
  },

  estatisticasGerais: async (mes = null, ano = null) => {
    const params = mes && ano ? { mes, ano } : {};
    const response = await api.get('/financeiro/estatisticas/', { params });
    return response.data;
  },

  gerarFaturasMensais: async () => {
    const response = await api.post('/financeiro/gerar-mensalidades/');
    return response.data;
  },

  criar: async (dados) => {
    const response = await api.post('/financeiro/', dados);
    return response.data;
  },

  atualizar: async (id, dados) => {
    const response = await api.patch(`/financeiro/${id}/`, dados);
    return response.data;
  },

  excluir: async (id) => {
    await api.delete(`/financeiro/${id}/`);
  }
};

export default financeiroService;