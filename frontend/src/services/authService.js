import api from './api';

const authService = {
  /**
   * Realiza o login e já organiza o armazenamento do Token e do Usuário.
   */
  login: async (credentials) => {
    const response = await api.post('/token/', credentials);
    
    // Se o backend retornou sucesso, salvamos o token e o nome do usuário
    if (response.data.access) {
      localStorage.setItem('token', response.data.access);
      localStorage.setItem('username', credentials.username); // Útil para o "Olá, fulano"
    }
    
    return response.data;
  },

  /**
   * Limpa todos os dados de sessão e redireciona para o login.
   */
  logout: () => {
    localStorage.clear(); // Limpa token, username e qualquer outra sujeira
    window.location.href = '/login';
  },

  /**
   * Retorna true se houver um token salvo.
   */
  isAuthenticated: () => {
    const token = localStorage.getItem('token');
    return !!token;
  },

  /**
   * Retorna o nome do usuário logado para exibir na interface.
   */
  getLoggedUser: () => {
    return localStorage.getItem('username') || 'Usuário';
  }
};

export default authService;