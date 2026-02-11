import api from './api';

const documentacaoService = {

  // Método genérico para salvar sub-itens (Contatos, Provedores, Contratos, etc)
  // O Axios detecta automaticamente se 'payload' é JSON ou FormData (Arquivo)
  salvarItem: async (url, payload) => {
    const response = await api.post(url, payload);
    return response.data;
  },

  // Método genérico para exclusão
  excluirItem: async (url, id) => {
    const response = await api.delete(`${url}${id}/`);
    return response.data;
  },

  // Busca lista de ativos para a aba Inventário
  listarAtivos: async (clienteId) => {
    const response = await api.get(`/ativos/?cliente=${clienteId}`);
    return response.data;
  },
  
  // Cria o registro principal da documentação (textos)
  criar: async (payload) => {
    const response = await api.post('/documentacao/', payload);
    return response.data;
  },

  // Atualiza o registro principal da documentação (textos)
  atualizar: async (id, payload) => {
    const response = await api.put(`/documentacao/${id}/`, payload);
    return response.data;
  },
};

export default documentacaoService;