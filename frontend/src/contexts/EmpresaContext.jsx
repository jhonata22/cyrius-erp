import React, { createContext, useState, useEffect, useContext } from 'react';
import empresaService from '../services/empresaService';

const EmpresaContext = createContext({});

export const EmpresaProvider = ({ children }) => {
  const [empresas, setEmpresas] = useState([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState(null); // null = Todas
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarEmpresas();
  }, []);

  const carregarEmpresas = async () => {
    try {
      const dados = await empresaService.listar();
      setEmpresas(dados);

      // Lógica de Persistência
      const salvo = localStorage.getItem('cyrius_empresa_ativa');
      
      if (salvo === 'todas') {
        // Se estava salvo como "todas", definimos null
        setEmpresaSelecionada(null);
      } else if (salvo) {
        const empresaSalva = dados.find(e => e.id === parseInt(salvo));
        if (empresaSalva) {
          setEmpresaSelecionada(empresaSalva);
        } else {
          // Se não achou (ex: empresa deletada), joga para Todas
          setEmpresaSelecionada(null); 
        }
      } else {
        // Padrão inicial: Todas as empresas (null)
        setEmpresaSelecionada(null);
      }
    } catch (error) {
      console.error("Erro ao carregar empresas", error);
    } finally {
      setLoading(false);
    }
  };

  const trocarEmpresa = (empresaOuId) => {
    // Se receber 'todas' ou null, limpa a seleção
    if (empresaOuId === 'todas' || empresaOuId === null) {
      setEmpresaSelecionada(null);
      localStorage.setItem('cyrius_empresa_ativa', 'todas');
    } else {
      // Se receber o objeto empresa
      setEmpresaSelecionada(empresaOuId);
      localStorage.setItem('cyrius_empresa_ativa', empresaOuId.id);
    }
    
    // Opcional: window.location.reload();
  };

  return (
    <EmpresaContext.Provider value={{ 
      empresas, 
      empresaSelecionada, 
      trocarEmpresa, 
      loading 
    }}>
      {children}
    </EmpresaContext.Provider>
  );
};

export const useEmpresa = () => useContext(EmpresaContext);