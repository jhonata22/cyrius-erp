import api from './api';

const vendaService = {
  listarVendas: (empresaId = null) => {
    let url = '/vendas/';
    if (empresaId) {
      url += `?empresa=${empresaId}`;
    }
    return api.get(url).then(response => response.data);
  },

  criarVenda: (dadosVenda) => {
    return api.post('/vendas/', dadosVenda).then(response => response.data);
  },
};

export default vendaService;
