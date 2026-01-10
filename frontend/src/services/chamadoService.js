import api from './api';

const chamadoService = {
  // Já existente
  buscarPorId: async (id) => {
    const response = await api.get(`/chamados/${id}/`);
    return response.data;
  },
  
  // Já existente
  atualizar: async (id, dados) => {
    const response = await api.patch(`/chamados/${id}/`, dados);
    return response.data;
  },

  // --- NOVOS MÉTODOS ---
  listar: async () => {
    const response = await api.get('/chamados/');
    return response.data;
  },

  criar: async (dados) => {
    const response = await api.post('/chamados/', dados);
    return response.data;
  }
};

export default chamadoService;