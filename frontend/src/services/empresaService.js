import api from './api';

const empresaService = {
  listar: async () => {
    // Ajuste a URL se você registrou diferente no config/urls.py
    const response = await api.get('/core/empresas/');
    return response.data;
  }
};

export default empresaService;