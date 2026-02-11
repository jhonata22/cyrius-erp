import api from './api';

const servicoService = {
  // 1. CRUD Básico da OS
  // ATUALIZADO: Aceita filtros e o ID da empresa
  listar: async (filtros = {}, empresaId = null) => { 
    const params = { ...filtros };
    
    // Se tiver empresa selecionada, injeta no parametro GET
    if (empresaId) {
      params.empresa = empresaId;
    }

    // O Axios converte o objeto params para query string automaticamente (?empresa=1&status=ABERTO...)
    const response = await api.get('/servicos/', { params });
    return response.data;
  },

  buscarPorId: async (id) => {
    const response = await api.get(`/servicos/${id}/`);
    return response.data;
  },

  criar: async (dados) => {
    // O objeto 'dados' já vem com o campo 'empresa' preenchido pelo front
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

  // 2. Ações Específicas (Itens e Peças)

  // Adiciona peça à OS
  adicionarItem: async (osId, dadosItem) => {
    const response = await api.post(`/servicos/${osId}/adicionar-item/`, dadosItem);
    return response.data;
  },

  // Atualiza quantidade ou preço de um item já inserido
  atualizarItem: async (itemId, dados) => {
    const response = await api.patch(`/itens-servico/${itemId}/`, dados);
    return response.data;
  },

  // Remove item da OS
  removerItem: async (itemId) => {
    const response = await api.delete(`/itens-servico/${itemId}/`);
    return response.data;
  },

  // Remove anexo da OS
  removerAnexo: async (anexoId) => {
    const response = await api.delete(`/anexos-servico/${anexoId}/`);
    return response.data;
  },

  // 3. Lógica de Finalização e Anexos

  /**
   * Finaliza a OS
   * Dispara: Baixa de estoque + Geração de Financeiro
   */
  finalizar: async (osId) => {
    const response = await api.post(`/servicos/${osId}/finalizar/`);
    return response.data;
  },

  // Upload de arquivos
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