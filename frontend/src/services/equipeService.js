import api from './api';

const equipeService = {
  // Busca um técnico específico por ID
  buscarPorId: async (id) => {
    const response = await api.get(`/equipe/${id}/`);
    return response.data;
  },

  // Busca a lista de todos os técnicos da equipe
  listar: async () => {
    const response = await api.get('/equipe/');
    return response.data;
  },

  criar: async (dados) => {
    const response = await api.post('/equipe/', dados);
    return response.data;
  },

  excluir: async (id) => {
    const response = await api.delete(`/equipe/${id}/`);
    return response.data;
  }
};

export default equipeService;