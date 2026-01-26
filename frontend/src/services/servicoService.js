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

  // 2. Ações Específicas (Itens e Peças)

  // Adiciona peça à OS (Dispara a validação de estoque no backend)
  adicionarItem: async (osId, dadosItem) => {
    const response = await api.post(`/servicos/${osId}/adicionar-item/`, dadosItem);
    return response.data;
  },

  // Atualiza quantidade ou preço de um item já inserido
  atualizarItem: async (itemId, dados) => {
    const response = await api.patch(`/itens-servico/${itemId}/`, dados);
    return response.data;
  },

  // Remove item da OS (O backend bloqueia se a OS estiver FINALIZADA)
  removerItem: async (itemId) => {
    const response = await api.delete(`/itens-servico/${itemId}/`);
    return response.data;
  },

  // 3. Lógica de Finalização e Anexos

  /**
   * Finaliza a OS
   * Dispara: Baixa de estoque + Geração de Financeiro (Entradas e Saídas)
   * Agora o backend retorna erros claros (estoque/decimal) via catch no React
   */
  finalizar: async (osId) => {
    const response = await api.post(`/servicos/${osId}/finalizar/`);
    return response.data;
  },

  // Upload de arquivos (Comprovantes, fotos do serviço, etc.)
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