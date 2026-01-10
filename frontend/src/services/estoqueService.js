import api from './api';

const estoqueService = {
  // --- PRODUTOS ---
  listarProdutos: async () => {
    const response = await api.get('/produtos/');
    return response.data;
  },
  criarProduto: async (dados) => {
    const response = await api.post('/produtos/', dados);
    return response.data;
  },
  atualizarProduto: async (id, dados) => {
    const response = await api.put(`/produtos/${id}/`, dados);
    return response.data;
  },
  excluirProduto: async (id) => {
    const response = await api.delete(`/produtos/${id}/`);
    return response.data;
  },

  // --- FORNECEDORES ---
  listarFornecedores: async () => {
    const response = await api.get('/fornecedores/');
    return response.data;
  },
  criarFornecedor: async (dados) => {
    const response = await api.post('/fornecedores/', dados);
    return response.data;
  },

  // --- MOVIMENTAÇÃO (ESTOQUE) ---
  listarHistorico: async () => {
    const response = await api.get('/estoque/');
    return response.data;
  },
  
  // Suporte a Upload de Arquivo (FormData)
  registrarMovimento: async (formData) => {
    // O Axios detecta FormData automaticamente e configura os headers corretos
    const response = await api.post('/estoque/', formData);
    return response.data;
  }
};

export default estoqueService;