import api from './api';

const estoqueService = {
  // PRODUTOS
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
    await api.delete(`/produtos/${id}/`);
  },

  // FORNECEDORES
  listarFornecedores: async () => {
    const response = await api.get('/fornecedores/');
    return response.data;
  },
  criarFornecedor: async (dados) => {
    const response = await api.post('/fornecedores/', dados);
    return response.data;
  },

  // MOVIMENTAÇÃO
  listarHistorico: async () => {
    const response = await api.get('/estoque/');
    return response.data;
  },
  registrarMovimento: async (formData) => {
    // O Django receberá via multipart/form-data por causa do arquivo
    const response = await api.post('/estoque/', formData);
    return response.data;
  },

  buscarFornecedorPorId: async (id) => {
    const response = await api.get(`/fornecedores/${id}/`);
    return response.data;
  }

};

export default estoqueService;