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

  getVenda: (id) => {
    return api.get(`/vendas/${id}/`).then(response => response.data);
  },

  aprovarVenda: (id) => {
    return api.post(`/vendas/${id}/aprovar/`).then(response => response.data);
  },

  gerarPdf: (id) => {
    return api.get(`/vendas/${id}/gerar_pdf/`, { responseType: 'blob' }).then(response => {
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `orcamento_venda_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    });
  },

  uploadComprovante: (id, file) => {
    const formData = new FormData();
    formData.append('comprovante', file);
    return api.post(`/vendas/${id}/upload_comprovante/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  updateVenda: (id, data) => {
    return api.patch(`/vendas/${id}/`, data).then(response => response.data);
  },

  addItem: (id, itemData) => {
    return api.post(`/vendas/${id}/add_item/`, itemData).then(response => response.data);
  },

  removeItem: (id, itemId) => {
    return api.post(`/vendas/${id}/remove_item/`, { item_id: itemId }).then(response => response.data);
  },
};

export default vendaService;
