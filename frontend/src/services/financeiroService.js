import api from './api';

const financeiroService = {
  // -----------------------------
  // CRUD BÁSICO
  // -----------------------------
  listar: async () => {
    const response = await api.get('/financeiro/');
    return response.data;
  },

  criar: async (dados) => {
    const response = await api.post('/financeiro/', dados);
    return response.data;
  },

  atualizar: async (id, dados) => {
    const response = await api.put(`/financeiro/${id}/`, dados);
    return response.data;
  },

  excluir: async (id) => {
    const response = await api.delete(`/financeiro/${id}/`);
    return response.data;
  },

  // -----------------------------
  // KPIs / DASHBOARD
  // -----------------------------
  estatisticasGerais: async () => {
    const response = await api.get('/financeiro/estatisticas/');
    return response.data;
  },

  estatisticasMensais: async (mes, ano) => {
    const response = await api.get('/financeiro/estatisticas-mensais/', {
      params: { mes, ano }
    });
    return response.data;
  },

  graficoMensal: async (ano) => {
    const response = await api.get('/financeiro/grafico-mensal/', {
      params: { ano }
    });
    return response.data;
  },

  // -----------------------------
  // PROCESSOS FINANCEIROS
  // -----------------------------
  gerarFaturasMensais: async () => {
    const response = await api.post('/financeiro/gerar-mensalidades/');
    return response.data;
  },

  fecharMes: async (mes, ano) => {
    const response = await api.post('/financeiro/fechar-mes/', { mes, ano });
    return response.data;
  }
};

export default financeiroService;
