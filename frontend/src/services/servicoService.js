import api from './api';

const servicoService = {
  // 1. CRUD Básico da OS
  listar: async (filtros) => { 
    const params = new URLSearchParams(filtros).toString(); 
    const url = params ? `/servicos/?${params}` : '/servicos/';
    const response = await api.get(url);
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

  // 2. Ações Específicas (Peças e Lógica)

  // Adiciona peça (Criação)
  adicionarItem: async (osId, dadosItem) => {
    const response = await api.post(`/servicos/${osId}/adicionar-item/`, dadosItem);
    return response.data;
  },

  // --- NOVOS MÉTODOS PARA O FRONTEND FUNCIONAR ---

  // Atualiza um item já existente (Ex: alterar quantidade)
  // NOTA: Requer que o backend tenha uma rota /api/itens-servico/{id}/
  atualizarItem: async (itemId, dados) => {
    const response = await api.patch(`/itens-servico/${itemId}/`, dados);
    return response.data;
  },

  // Remove um item específico da OS
  // NOTA: Requer que o backend tenha uma rota /api/itens-servico/{id}/
  removerItem: async (itemId) => {
    const response = await api.delete(`/itens-servico/${itemId}/`);
    return response.data;
  },

  // -----------------------------------------------

  // Finaliza a OS
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