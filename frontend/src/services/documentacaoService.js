import api from './api';

const documentacaoService = {
  // Salvar/Atualizar os textos longos (Ficha Técnica)
  salvarTextos: async (dados) => {
    // Se tiver ID, atualiza (PATCH). Se não, cria (POST).
    // A lógica de identificar se é update ou create deve ser feita no front
    // ou você pode ter endpoints separados. Vou assumir endpoints separados aqui.
    if (dados.id) {
        const response = await api.patch(`/documentacao/${dados.id}/`, dados);
        return response.data;
    } else {
        const response = await api.post('/documentacao/', dados);
        return response.data;
    }
  },

  // Busca Ativos de um Cliente
  listarAtivos: async () => {
    // Idealmente você filtraria no backend: /ativos/?cliente=ID
    // Por enquanto, vou manter sua lógica de buscar tudo
    const response = await api.get('/ativos/');
    return response.data;
  },

  // Adicionar Sub-itens (Genérico)
  adicionarItem: async (tipo, dados) => {
    // tipo: 'contatos', 'provedores', 'emails', 'ativos'
    const endpointMap = {
      'contato': '/contatos/',
      'provedor': '/provedores/',
      'email': '/emails/', // Ajuste para bater com sua URL do Django (contas_email?)
      'ativo': '/ativos/'
    };
    
    const url = endpointMap[tipo];
    if (!url) throw new Error("Tipo de item inválido");

    const response = await api.post(url, dados);
    return response.data;
  },

  criar: async (dados) => {
    const response = await api.post('/documentacao/', dados);
    return response.data;
  },

  atualizar: async (id, dados) => {
    const response = await api.put(`/documentacao/${id}/`, dados);
    return response.data;
  },

  salvarItem: async (url, dados) => {
    const response = await api.post(url, dados);
    return response.data;
  }
};

export default documentacaoService;