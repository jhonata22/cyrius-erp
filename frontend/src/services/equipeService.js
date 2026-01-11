import api from './api';

const equipeService = {
  listar: async () => {
    const response = await api.get('/equipe/');
    return response.data;
  },

  buscarPorId: async (id) => {
    const response = await api.get(`/equipe/${id}/`);
    return response.data;
  },

  criar: async (dados) => {
    const response = await api.post('/equipe/', dados);
    return response.data;
  },

  atualizar: async (id, dados) => {
    const response = await api.put(`/equipe/${id}/`, dados);
    return response.data;
  },

  excluir: async (id) => {
    const response = await api.delete(`/equipe/${id}/`);
    return response.data;
  },

getMe: async () => {
    const response = await api.get('/equipe/me/');
    return response.data;
  },
  updateMe: async (dados) => {
    const response = await api.patch('/equipe/me/', dados);
    return response.data;
  }

};

export default equipeService;