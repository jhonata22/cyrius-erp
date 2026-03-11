import api from './api';

const chamadoService = {
  // GET /api/chamados/?empresa=1&status=ABERTO
  listar: async (filtros = {}, empresaId = null) => {
    const params = { ...filtros };

    if (empresaId) {
      params.empresa = empresaId;
    }

    const response = await api.get('/chamados/', { params });
    return response.data;
  },

  // Útil para histórico de um cliente específico
  listarPorCliente: async (clienteId, pagina = 1) => {
    const response = await api.get('/chamados/', {
        params: {
            cliente: clienteId,
            page: pagina
        }
    });
    return response.data;
  },
  
  buscarPorId: async (id) => {
    const response = await api.get(`/chamados/${id}/`);
    return response.data;
  },

  criar: async (dados) => {
    const payload = { ...dados };
    if (payload.data_agendamento) {
      payload.data_agendamento = new Date(payload.data_agendamento).toISOString();
    }
    // Payload já contém 'empresa': id
    const response = await api.post('/chamados/', payload);
    return response.data;
  },
  
  atualizar: async (id, dados) => {
    const payload = { ...dados };
    if (payload.data_agendamento && payload.data_agendamento.length > 10) {
      payload.data_agendamento = new Date(payload.data_agendamento).toISOString();
    }
    const response = await api.patch(`/chamados/${id}/`, payload);
    return response.data;
  },

  finalizar: async (id, dadosFinalizacao) => {
    const formData = new FormData();
    formData.append('status', 'FINALIZADO');

    Object.keys(dadosFinalizacao).forEach(key => {
      const value = dadosFinalizacao[key];
      if (value !== null && value !== undefined && value !== '') {
        if (key === 'resolucoes_assuntos') {
          // Stringify the array so it can be sent via FormData
          formData.append(key, JSON.stringify(value));
        } else {
          const fieldName = key === 'arquivo' ? 'arquivo_conclusao' : key;
          formData.append(fieldName, value);
        }
      }
    });

    const response = await api.patch(`/chamados/${id}/`, formData);
    return response.data;
  },

  // Estatísticas para Dashboard
  getDashboardStats: async (mesAno, empresaId = null) => {
    const params = { mes: mesAno };
    if (empresaId) params.empresa = empresaId;

    const response = await api.get('/chamados/estatisticas/', { params });
    return response.data; 
  },
  
  // Rota alternativa de estatísticas
  estatisticas: async (mes, empresaId = null) => {
    const params = { mes };
    if (empresaId) params.empresa = empresaId;
    
    const response = await api.get('/chamados/estatisticas/', { params });
    return response.data;
  },

  listarAssuntos: async () => {
    const response = await api.get('/assuntos/');
    return response.data?.results || response.data || [];
  },

  criarAssunto: async (dados) => {
    const response = await api.post('/assuntos/', dados);
    return response.data;
  },

  listarRelacionados: async (id) => {
    const response = await api.get('/chamados/' + id + '/relacionados/');
    return response.data;
  },

  // Comentários
  listarComentarios: async (chamadoId) => {
    const response = await api.get(`/chamados/${chamadoId}/comentarios/`);
    return response.data;
  },

  adicionarComentario: async (chamadoId, texto) => {
    const response = await api.post(`/chamados/${chamadoId}/comentarios/`, { texto });
    return response.data;
  },

  // --- MÉTODOS ADICIONADOS PARA SUPER CHAMADO ---

  adicionarItem: async (chamadoId, dadosItem) => {
    const response = await api.post(`/chamados/${chamadoId}/adicionar-item/`, dadosItem);
    return response.data;
  },

  atualizarItem: async (itemId, dados) => {
    const response = await api.patch(`/itens-chamado/${itemId}/`, dados);
    return response.data;
  },

  removerItem: async (itemId) => {
    const response = await api.delete(`/itens-chamado/${itemId}/`);
    return response.data;
  },

  anexarArquivo: async (chamadoId, formData) => {
    const response = await api.post(`/chamados/${chamadoId}/anexar/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  removerAnexo: async (anexoId) => {
    const response = await api.delete(`/anexos-chamado/${anexoId}/`);
    return response.data;
  },

  gerarOrcamentoPdf: async (chamadoId) => {
    const response = await api.post(`/chamados/${chamadoId}/gerar-orcamento/`);
    return response.data;
  },
};

export default chamadoService;
