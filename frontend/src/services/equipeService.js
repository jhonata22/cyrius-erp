import api from './api';

const equipeService = {
  // Lista todos (para a página Equipe)
  listar: async () => {
    const response = await api.get('/equipe/');
    return response.data;
  },

  // Cria novo
  criar: async (dados) => {
    const response = await api.post('/equipe/', dados);
    return response.data;
  },

  // Exclui
  excluir: async (id) => {
    const response = await api.delete(`/equipe/${id}/`);
    return response.data;
  },

  // Pega o perfil logado
  getMe: async () => {
    const response = await api.get('/equipe/me/');
    return response.data;
  },

  // --- ADICIONE ESTE MÉTODO ---
  // Pega um perfil específico (para o Gestor ver o Técnico)
  buscarPorId: async (id) => {
    const response = await api.get(`/equipe/${id}/`);
    return response.data;
  },

  // Atualiza perfil (Patch)
  atualizar: async (id, dados) => {
    // Se tiver ID, atualiza aquele ID. Se não, atualiza o /me/
    const url = id ? `/equipe/${id}/` : '/equipe/me/';
    const response = await api.patch(url, dados);
    return response.data;
  }
};

export default equipeService;