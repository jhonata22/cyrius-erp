import api from './api';

const empresaService = {
  listar: async () => {
    const response = await api.get('/core/empresas/');
    return response.data;
  },

  criar: async (dados) => {
    const response = await api.post('/core/empresas/', dados);
    return response.data;
  },

  atualizar: async (id, dados) => {
    const response = await api.patch(`/core/empresas/${id}/`, dados);
    return response.data;
  },

  excluir: async (id) => {
    const response = await api.delete(`/core/empresas/${id}/`);
    return response.data;
  }
};

export default empresaService;
