import api from './api';

const ativoService = {
  listar: async () => {
    const response = await api.get('/ativos/');
    return response.data;
  },

  buscarPorId: async (id) => {
    // ATENÇÃO: A barra no final é OBRIGATÓRIA no Django
    const response = await api.get(`/ativos/${id}/`);
    return response.data;
  },

  criar: async (dados) => {
    const response = await api.post('/ativos/', dados);
    return response.data;
  },

  atualizar: async (id, dados) => {
    // ATENÇÃO: A barra no final aqui também
    const response = await api.patch(`/ativos/${id}/`, dados);
    return response.data;
  },

  excluir: async (id) => {
    const response = await api.delete(`/ativos/${id}/`);
    return response.data;
  }
};

export default ativoService;