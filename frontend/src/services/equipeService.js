import api from './api';

const equipeService = {
  // Lista todos os membros (para a página Equipe)
  listar: async () => {
    const response = await api.get('/equipe/');
    return response.data;
  },

  // Cria novo membro
  // Importante: Se 'dados' for um FormData (com foto), o axios detecta automaticamente o Content-Type
  criar: async (dados) => {
    const response = await api.post('/equipe/', dados);
    return response.data;
  },

  // Exclui um membro
  excluir: async (id) => {
    const response = await api.delete(`/equipe/${id}/`);
    return response.data;
  },

  // --- PERFIL DO USUÁRIO LOGADO ---
  // Padronizei como 'me' para bater com o código do Layout.jsx
  me: async () => {
    const response = await api.get('/equipe/me/');
    return response.data;
  },

  // Mantive o getMe como alias caso você tenha usado em outros lugares do sistema
  getMe: async () => {
    const response = await api.get('/equipe/me/');
    return response.data;
  },

  // Busca um perfil específico pelo ID (ex: Gestor editando Técnico)
  buscarPorId: async (id) => {
    const response = await api.get(`/equipe/${id}/`);
    return response.data;
  },

  // Atualiza perfil (Patch)
  // Lógica inteligente: Se passar ID, atualiza o outro. Se não passar ID, atualiza a si mesmo (/me/)
  atualizar: async (id, dados) => {
    const url = id ? `/equipe/${id}/` : '/equipe/me/';
    
    // Configuração para garantir que envio de arquivos (fotos) funcione
    const config = {};
    if (dados instanceof FormData) {
      config.headers = { 'Content-Type': 'multipart/form-data' };
    }

    const response = await api.patch(url, dados, config);
    return response.data;
  }
};

export default equipeService;