import api from './api';

const documentacaoService = {
  // ... (outros métodos mantidos)

  salvarItem: async (url, payload) => {
    const response = await api.post(url, payload);
    return response.data;
  },

  // NOVO MÉTODO PARA EXCLUSÃO
  excluirItem: async (url, id) => {
    const response = await api.delete(`${url}${id}/`);
    return response.data;
  },

  listarAtivos: async () => {
    const response = await api.get('/ativos/');
    return response.data;
  },
  
  criar: async (payload) => {
    const response = await api.post('/documentacao/', payload);
    return response.data;
  },

  atualizar: async (id, payload) => {
    const response = await api.put(`/documentacao/${id}/`, payload);
    return response.data;
  },
};

export default documentacaoService;