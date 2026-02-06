import { useState, useEffect } from 'react';
import api from '../services/api';

export function useEmpresas() {
    const [empresas, setEmpresas] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        
        async function load() {
            try {
                // Endpoint deve retornar lista pura: [{id: 1, nome: '...'}, ...]
                const response = await api.get('/core/empresas/'); 
                if (isMounted) {
                    setEmpresas(response.data);
                }
            } catch (error) {
                console.error("Erro ao carregar lista de empresas", error);
            } finally {
                if (isMounted) setLoading(false);
            }
        }
        load();

        return () => { isMounted = false; };
    }, []);

    return { empresas, loading };
}