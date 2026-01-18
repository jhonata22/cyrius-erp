import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://192.168.1.113/api',
    timeout: 30000, // Aumentei para 30s pois uploads de PDF podem demorar
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // BLINDAGEM PARA UPLOAD:
        // Se o dado for FormData, deixamos o navegador definir o Content-Type
        // para que ele possa gerar o 'boundary' corretamente.
        if (config.data instanceof FormData) {
            delete config.headers['Content-Type'];
        }

        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Se der erro 401 (Não autorizado), desloga o usuário
        if (error.response && error.response.status === 401) {
            localStorage.clear(); 
            // Verificação extra para não recarregar se já estiver no login
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;