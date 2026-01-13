import api from './api';

const estoqueService = {
  // --- PRODUTOS ---

  // Método genérico usado pelo Módulo de Serviços
  listar: async () => {
    const response = await api.get('/estoque/produtos/');
    return response.data;
  },

  // Mantendo compatibilidade com seu código antigo
  listarProdutos: async () => {
    const response = await api.get('/estoque/produtos/');
    return response.data;
  },

  criarProduto: async (dados) => {
    const response = await api.post('/estoque/produtos/', dados);
    return response.data;
  },

  atualizarProduto: async (id, dados) => {
    const response = await api.put(`/estoque/produtos/${id}/`, dados);
    return response.data;
  },

  excluirProduto: async (id) => {
    await api.delete(`/estoque/produtos/${id}/`);
  },

  // --- FORNECEDORES ---
  // Rota base definida no urls.py como r'fornecedores' (sem prefixo estoque)
  listarFornecedores: async () => {
    const response = await api.get('/fornecedores/'); // Ajustado para bater com urls.py
    return response.data;
  },

  criarFornecedor: async (dados) => {
    const response = await api.post('/fornecedores/', dados);
    return response.data;
  },

  buscarFornecedorPorId: async (id) => {
    const response = await api.get(`/fornecedores/${id}/`);
    return response.data;
  },

  // --- MOVIMENTAÇÃO ---
  // Rota base definida no urls.py como r'estoque/movimentacoes'
  listarHistorico: async () => {
    const response = await api.get('/estoque/movimentacoes/');
    return response.data;
  },

  registrarMovimento: async (formData) => {
    // O Django receberá via multipart/form-data por causa do arquivo
    // Nota: Certifique-se de que o backend espera '/estoque/movimentacoes/'
    const response = await api.post('/estoque/movimentacoes/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
};

export default estoqueService;