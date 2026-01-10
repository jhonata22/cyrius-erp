import api from './api';

const authService = {
  // Envia usuário e senha para obter o token
  login: async (credentials) => {
    // credentials = { username, password }
    const response = await api.post('/token/', credentials);
    return response.data;
  },

  // Método utilitário para logout (limpa o navegador)
  logout: () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  },

  // Futuramente: Método para validar se o token ainda é válido
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  }
};

export default authService;