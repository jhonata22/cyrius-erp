import api from './api';

const financeiroService = {
  listar: async () => {
    const response = await api.get('/financeiro/');
    return response.data;
  },

  criar: async (dados) => {
    const response = await api.post('/financeiro/', dados);
    return response.data;
  },

  atualizar: async (id, dados) => {
    const response = await api.put(`/financeiro/${id}/`, dados);
    return response.data;
  },

  excluir: async (id) => {
    const response = await api.delete(`/financeiro/${id}/`);
    return response.data;
  }
};

export default financeiroService;