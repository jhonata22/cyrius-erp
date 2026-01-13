import api from './api';

const servicoService = {
  // 1. CRUD Básico
  listar: async () => {
    const response = await api.get('/servicos/');
    return response.data;
  },

  buscarPorId: async (id) => {
    const response = await api.get(`/servicos/${id}/`);
    return response.data;
  },

  criar: async (dados) => {
    const response = await api.post('/servicos/', dados);
    return response.data;
  },

  atualizar: async (id, dados) => {
    const response = await api.patch(`/servicos/${id}/`, dados);
    return response.data;
  },

  excluir: async (id) => {
    const response = await api.delete(`/servicos/${id}/`);
    return response.data;
  },

  // 2. Ações Específicas (Lógica de Negócio)

  // Adiciona peça validando estoque no backend
  adicionarItem: async (osId, dadosItem) => {
    // dadosItem espera: { produto: id, quantidade: qtd, preco_venda: valor }
    const response = await api.post(`/servicos/${osId}/adicionar-item/`, dadosItem);
    return response.data;
  },

  // Finaliza a OS (Baixa Estoque + Gera Financeiro)
  finalizar: async (osId) => {
    const response = await api.post(`/servicos/${osId}/finalizar/`);
    return response.data;
  },

  // Upload de arquivos (PDFs, Fotos)
  anexarArquivo: async (osId, arquivo, tipo, descricao) => {
    const formData = new FormData();
    formData.append('arquivo', arquivo);
    formData.append('tipo', tipo || 'OUTRO');
    formData.append('descricao', descricao || '');

    const response = await api.post(`/servicos/${osId}/anexar/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
};

export default servicoService;