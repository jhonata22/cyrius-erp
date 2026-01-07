import axios from 'axios';

const api = axios.create({
  // Graças ao Proxy do Vite e ao Nginx, usamos apenas /api
  baseURL: '/api',
});

// INTERCEPTOR: Envia o token automaticamente se ele existir no localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// INTERCEPTOR: Trata erros globais (Ex: Token expirado)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Se o token expirou, desloga o usuário e manda para o login
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;