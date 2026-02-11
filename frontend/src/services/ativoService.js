import api from './api';

const ativoService = {
  listar: async (clienteId) => {
    const params = {};
    if (clienteId) {
      params.cliente = clienteId;
    }
    const response = await api.get('/ativos/', { params });
    return response.data;
  },

  buscarPorId: async (id) => {
    // ATENÇÃO: A barra no final é OBRIGATÓRIA no Django
    const response = await api.get(`/ativos/${id}/`);
    return response.data;
  },

  criar: async (dados) => {
    const payload = { ...dados };

    // Mapeia o campo 'cliente' para 'cliente_id' para compatibilidade com o backend.
    if (payload.cliente) {
        payload.cliente_id = payload.cliente;
        delete payload.cliente;
    }

    const response = await api.post('/ativos/', payload);
    return response.data;
  },

  atualizar: async (id, dados) => {
    // Copia os dados para um novo objeto para não modificar o estado original
    const payload = { ...dados };

    // 1. A chateação do Django: Garante que o ID do cliente seja enviado
    if (payload.cliente && typeof payload.cliente === 'object') {
      payload.cliente_id = payload.cliente.id;
      delete payload.cliente; // Remove o objeto aninhado
    } else {
      payload.cliente_id = payload.cliente; // Garante que o ID seja enviado
      delete payload.cliente;
    }

    // 2. Limpeza de Campos Read-only (Evita warnings e potenciais erros)
    // O backend vai ignorar isso, mas é uma boa prática enviar um payload limpo.
    delete payload.nome_cliente; 
    delete payload.historico_servicos;

    console.log("DEBUG: Payload enviado para a API:", payload);

    const response = await api.patch(`/ativos/${id}/`, payload);
    return response.data;
  },

  excluir: async (id) => {
    const response = await api.delete(`/ativos/${id}/`);
    return response.data;
  }
};

export default ativoService;