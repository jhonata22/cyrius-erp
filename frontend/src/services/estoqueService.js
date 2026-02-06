import api from './api';

const estoqueService = {
  // --- PRODUTOS ---

  // Método genérico
  listar: async (empresaId = null) => {
    const params = {};
    // Mesmo sendo catálogo global, o backend pode usar o ID para retornar o saldo específico daquela filial
    if (empresaId) params.empresa = empresaId;
    
    const response = await api.get('/estoque/produtos/', { params });
    return response.data;
  },

  listarProdutos: async (empresaId = null) => {
    const params = {};
    if (empresaId) params.empresa = empresaId;

    const response = await api.get('/estoque/produtos/', { params });
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
  
  // Agora aceita empresaId para filtrar fornecedores exclusivos da filial (se houver essa regra)
  listarFornecedores: async (empresaId = null) => {
    const params = {};
    if (empresaId) params.empresa = empresaId;

    const response = await api.get('/fornecedores/', { params });
    return response.data;
  },

  criarFornecedor: async (dados) => {
    // 'dados' já deve conter o campo 'empresa' se vinculado
    const response = await api.post('/fornecedores/', dados);
    return response.data;
  },

  buscarFornecedorPorId: async (id) => {
    const response = await api.get(`/fornecedores/${id}/`);
    return response.data;
  },

  // --- MOVIMENTAÇÃO ---
  
  // Fundamental: Filtra o histórico pela empresa selecionada
  listarHistorico: async (empresaId = null) => {
    const params = {};
    if (empresaId) params.empresa = empresaId;

    const response = await api.get('/estoque/movimentacoes/', { params });
    return response.data;
  },

  registrarMovimento: async (formData) => {
    // O formData já vem montado do frontend com o campo 'empresa' incluso
    const response = await api.post('/estoque/movimentacoes/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
};

export default estoqueService;