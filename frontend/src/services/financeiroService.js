import api from './api';

const financeiroService = {
  // GET /api/financeiro/
  // Agora aceita filtros extras e o ID da empresa
  listar: async (filtros = {}, empresaId = null) => {
    const params = { ...filtros };
    
    // Se tiver empresa selecionada, manda na query string (?empresa=1)
    if (empresaId) {
      params.empresa = empresaId;
    }

    const response = await api.get('/lancamentos/', { params });
    return response.data;
  },

  // GET /api/financeiro/estatisticas/
  estatisticasGerais: async (mes = null, ano = null, empresaId = null) => {
    const params = {};
    if (mes) params.mes = mes;
    if (ano) params.ano = ano;
    
    // Filtra estatísticas pelo CNPJ selecionado
    if (empresaId) params.empresa = empresaId;
    
    const response = await api.get('/lancamentos/estatisticas/', { params });
    return response.data;
  },

  // POST /api/financeiro/gerar-mensalidades/
  gerarFaturasMensais: async (empresaId = null) => {
    // Envia o ID no corpo para o backend saber para qual empresa gerar
    const payload = {};
    if (empresaId) payload.empresa_id = empresaId;

    const response = await api.post('/lancamentos/gerar-mensalidades/', payload);
    return response.data;
  },

  // POST /api/financeiro/
  criar: async (dados) => {
    // Aqui assumimos que o objeto 'dados' já vem com o campo 'empresa' 
    // preenchido pelo formulário ou pelo contexto antes de chamar esta função.
    const response = await api.post('/lancamentos/', dados);
    return response.data;
  },

  // PATCH /api/financeiro/{id}/
  atualizar: async (id, dados) => {
    const response = await api.patch(`/lancamentos/${id}/`, dados);
    return response.data;
  },

  // DELETE /api/financeiro/{id}/
  excluir: async (id) => {
    await api.delete(`/lancamentos/${id}/`);
  },

  // POST /api/financeiro/baixar-lote/
  baixarEmLote: async (ids) => {
    const response = await api.post('/lancamentos/baixar-lote/', { ids });
    return response.data;
  },

  // POST /api/financeiro/processar-recorrencias/
  processarRecorrencias: async (empresaId = null) => {
    const params = {};
    // Processa apenas as recorrencias desta empresa
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