import api from './api';

const clienteService = {
  listar: async () => {
    const response = await api.get('/clientes/');
    return response.data;
  },

  buscarPorId: async (id) => {
    const response = await api.get(`/clientes/${id}/`);
    return response.data;
  },

  criar: async (payload) => {
    const response = await api.post('/clientes/', payload);
    return response.data;
  },

  atualizar: async (id, payload) => {
    const response = await api.put(`/clientes/${id}/`, payload);
    return response.data;
  },

  excluir: async (id) => {
    await api.delete(`/clientes/${id}/`);
  }
};

export default clienteService;