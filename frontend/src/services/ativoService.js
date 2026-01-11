import api from './api';

const ativoService = {
  buscarPorId: async (id) => {
    const response = await api.get(`/ativos/${id}/`);
    return response.data;
  },
  atualizar: async (id, dados) => {
    const response = await api.patch(`/ativos/${id}/`, dados);
    return response.data;
  },
  excluir: async (id) => {
    await api.delete(`/ativos/${id}/`);
  }
};

export default ativoService;