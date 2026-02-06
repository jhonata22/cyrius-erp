import api from './api';

const financeiroService = {
  // GET /api/lancamentos/
  listar: async (filtros = {}, empresaId = null) => {
    const params = { ...filtros };
    
    if (empresaId) {
      params.empresa = empresaId;
    }

    const response = await api.get('/lancamentos/', { params });
    return response.data;
  },

  // GET /api/lancamentos/estatisticas/
  estatisticasGerais: async (mes = null, ano = null, empresaId = null) => {
    const params = {};
    if (mes) params.mes = mes;
    if (ano) params.ano = ano;
    if (empresaId) params.empresa = empresaId;
    
    const response = await api.get('/lancamentos/estatisticas/', { params });
    return response.data;
  },

  // POST /api/lancamentos/gerar-mensalidades/
  gerarFaturasMensais: async (empresaId = null) => {
    const payload = {};
    if (empresaId) payload.empresa_id = empresaId;

    const response = await api.post('/lancamentos/gerar-mensalidades/', payload);
    return response.data;
  },

  // POST /api/lancamentos/
  criar: async (dados) => {
    // O payload 'dados' já deve conter 'empresa': id vindo do formulário
    const response = await api.post('/lancamentos/', dados);
    return response.data;
  },

  // PATCH /api/lancamentos/{id}/
  atualizar: async (id, dados) => {
    const response = await api.patch(`/lancamentos/${id}/`, dados);
    return response.data;
  },

  // DELETE /api/lancamentos/{id}/
  excluir: async (id) => {
    await api.delete(`/lancamentos/${id}/`);
  },

  // POST /api/lancamentos/baixar-lote/
  baixarEmLote: async (ids) => {
    const response = await api.post('/lancamentos/baixar-lote/', { ids });
    return response.data;
  },

  // POST /api/lancamentos/processar-recorrencias/
  processarRecorrencias: async (empresaId = null) => {
    const params = {};
    if (empresaId) params.empresa = empresaId;

    const response = await api.post('/lancamentos/processar-recorrencias/', {}, { params });
    return response.data;
  },

  confirmarRecebimento: async (id, arquivoFile, dataPagamento) => {
    const formData = new FormData();
    
    formData.append('status', 'PAGO');
    formData.append('data_pagamento', dataPagamento || new Date().toISOString().split('T')[0]);
    
    if (arquivoFile) {
      formData.append('comprovante', arquivoFile);
    }

    const response = await api.patch(`/lancamentos/${id}/`, formData);
    return response.data;
  },
};

export default financeiroService;