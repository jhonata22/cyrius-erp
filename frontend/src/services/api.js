import axios from 'axios';

// 1. Cria a instância única
const api = axios.create({
    baseURL: 'http://localhost:8000/api', // Altere apenas aqui quando for para produção!
    timeout: 10000,
});

// 2. Interceptor de Requisição (Injeta o Token automaticamente)
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// 3. Interceptor de Resposta (Trata erros globais, ex: Sessão Expirada)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Se o erro for 401 (Não autorizado), pode redirecionar para login
        if (error.response && error.response.status === 401) {
            console.warn("Sessão expirada ou token inválido.");
            // Opcional: window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;