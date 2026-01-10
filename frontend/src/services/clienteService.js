import api from './api';

const clienteService = {
  listar: async () => {
    const response = await api.get('/clientes/');
    return response.data;
  },

  criar: async (dados) => {
    const response = await api.post('/clientes/', dados);
    return response.data;
  },

  atualizar: async (id, dados) => {
    const response = await api.put(`/clientes/${id}/`, dados);
    return response.data;
  },

  excluir: async (id) => {
    const response = await api.delete(`/clientes/${id}/`);
    return response.data;
  },
  
  // Para buscar detalhes de um cliente específico (se precisar no futuro)
buscarPorId: async (id) => {
    const response = await api.get(`/clientes/${id}/`);
    return response.data;
  }
};

export default clienteService;