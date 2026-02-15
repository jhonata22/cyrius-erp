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
    const response = await api.patch(`/clientes/${id}/`, payload);
    return response.data;
  },

  excluir: async (id) => {
    await api.delete(`/clientes/${id}/`);
  },

  listarContatosLista: async (clienteId) => {
    if (!clienteId) return [];
    try {
      const response = await api.get(`/clientes/${clienteId}/contatos_lista/`);
      return response.data;
    } catch (error) {
      console.error(`Erro ao buscar contatos para o cliente ${clienteId}:`, error);
      return [];
    }
  },
};

export default clienteService;