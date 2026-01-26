import api from './api';

const financeiroService = {
  // GET /api/financeiro/ (Lista todos os lançamentos)
  listar: async () => {
    // CORREÇÃO: Removido 'lancamentos/' da URL
    const response = await api.get('/financeiro/');
    return response.data;
  },

  // GET /api/financeiro/estatisticas/
  estatisticasGerais: async (mes = null, ano = null) => {
    const params = {};
    if (mes) params.mes = mes;
    if (ano) params.ano = ano;
    
    // CORREÇÃO: Removido 'lancamentos/' da URL
    const response = await api.get('/financeiro/estatisticas/', { params });
    return response.data;
  },

  // POST /api/financeiro/gerar-mensalidades/
  gerarFaturasMensais: async () => {
    // CORREÇÃO: Removido 'lancamentos/' da URL
    const response = await api.post('/financeiro/gerar-mensalidades/');
    return response.data;
  },

  // POST /api/financeiro/ (Cria novo lançamento)
  criar: async (dados) => {
    // CORREÇÃO: Removido 'lancamentos/' da URL
    const response = await api.post('/financeiro/', dados);
    return response.data;
  },

  // PATCH /api/financeiro/{id}/
  atualizar: async (id, dados) => {
    // CORREÇÃO: Removido 'lancamentos/' da URL
    const response = await api.patch(`/financeiro/${id}/`, dados);
    return response.data;
  },

  // DELETE /api/financeiro/{id}/
  excluir: async (id) => {
    // CORREÇÃO: Removido 'lancamentos/' da URL
    await api.delete(`/financeiro/${id}/`);
  },

  // POST /api/financeiro/baixar-lote/
  baixarEmLote: async (ids) => {
    // CORREÇÃO: Removido 'lancamentos/' da URL
    const response = await api.post('/financeiro/baixar-lote/', { ids });
    return response.data;
  },

  // POST /api/financeiro/processar-recorrencias/
  processarRecorrencias: async () => {
    // CORREÇÃO: Removido 'lancamentos/' da URL
    const response = await api.post('/financeiro/processar-recorrencias/');
    return response.data;
  },
  confirmarRecebimento: async (id, arquivoFile, dataPagamento) => {
    const formData = new FormData();
    
    // Dados obrigatórios
    formData.append('status', 'PAGO');
    formData.append('data_pagamento', dataPagamento || new Date().toISOString().split('T')[0]);
    
    // Se o usuário selecionou um arquivo, anexa ao envio
    if (arquivoFile) {
      formData.append('comprovante', arquivoFile);
    }

    // O Axios detecta FormData e ajusta o header 'Content-Type' automaticamente
    const response = await api.patch(`/financeiro/${id}/`, formData);
    return response.data;
  },
};

export default financeiroService;