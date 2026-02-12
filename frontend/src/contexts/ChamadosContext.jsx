import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import chamadoService from '../services/chamadoService';
import equipeService from '../services/equipeService';
import clienteService from '../services/clienteService';
import ativoService from '../services/ativoService';
import { useEmpresas } from '../hooks/useEmpresas';

// 1. DEFINIÇÃO NO TOPO (Para não dar erro de referência)
const ABAS_FILTRO = [
    { id: 'TODOS', label: 'Todos', statusBackend: '' },
    { id: 'PENDENTES', label: 'Pendentes', statusBackend: 'ABERTO' },
    { id: 'ANDAMENTO', label: 'Em Andamento', statusBackend: 'EM_ANDAMENTO' },
    { id: 'VISITAS', label: 'Visitas Agendadas', statusBackend: 'AGENDADO' },
    { id: 'CONCLUIDOS', label: 'Concluídos', statusBackend: 'FINALIZADO' },
];

export const ChamadosContext = createContext();

export function ChamadosProvider({ children }) {
  const { empresas } = useEmpresas();

  // STATE
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [chamados, setChamados] = useState([]);
  const [equipe, setEquipe] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [ativos, setAtivos] = useState([]);
  
  // FILTERS & PAGINATION
  const [pagina, setPagina] = useState(1);
  const [totalItens, setTotalItens] = useState(0);
  const [abaAtiva, setAbaAtiva] = useState('TODOS'); 
  const [contadores, setContadores] = useState({ PENDENTES: 0, ANDAMENTO: 0, VISITAS: 0 }); 
  const [filtroEmpresa, setFiltroEmpresa] = useState('');
  const [filtrosData, setFiltrosData] = useState({ inicio: '', fim: '' });
  const [busca, setBusca] = useState('');
  
  // SCROLL RESTORATION
  const [scrollPos, setScrollPos] = useState(0);

  // DATA FETCHING
  const carregarDados = useCallback(async () => {
    if (isInitialLoad) setLoading(true);

    try {
      const empresaId = filtroEmpresa || null;
      const statusFiltro = ABAS_FILTRO.find(a => a.id === abaAtiva)?.statusBackend || '';

      const [
        responseChamados, e, cli, atv,
        pend, and, vis
      ] = await Promise.all([
        chamadoService.listar({
            page: pagina,
            data_inicio: filtrosData.inicio,
            data_fim: filtrosData.fim,
            status: statusFiltro,
            search: busca 
        }, empresaId), 
        equipeService.listar(empresaId),
        clienteService.listar(empresaId),
        ativoService.listar(empresaId),
        chamadoService.listar({ status: 'ABERTO', page_size: 1 }, empresaId),
        chamadoService.listar({ status: 'EM_ANDAMENTO', page_size: 1 }, empresaId),
        chamadoService.listar({ status: 'AGENDADO', page_size: 1 }, empresaId),
      ]);

      setContadores({
        PENDENTES: pend.count || 0,
        ANDAMENTO: and.count || 0,
        VISITAS: vis.count || 0,
      });

      const listaTratada = responseChamados?.results || (Array.isArray(responseChamados) ? responseChamados : []);
      setChamados(listaTratada);
      setTotalItens(responseChamados?.count || listaTratada.length || 0);
      
      setEquipe(Array.isArray(e) ? e : []);
      setClientes(Array.isArray(cli) ? cli : []);
      setAtivos(Array.isArray(atv) ? atv : []);

    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      setChamados([]);
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  }, [pagina, filtrosData, abaAtiva, filtroEmpresa, busca, isInitialLoad]);

  useEffect(() => { 
      const timer = setTimeout(() => {
          carregarDados();
      }, 500);
      return () => clearTimeout(timer);
  }, [carregarDados]);


  const value = {
    loading,
    chamados,
    equipe,
    clientes,
    ativos,
    pagina,
    setPagina,
    totalItens,
    abaAtiva,
    setAbaAtiva,
    contadores,
    filtroEmpresa,
    setFiltroEmpresa,
    filtrosData,
    setFiltrosData,
    busca,
    setBusca,
    empresas,
    carregarDados,
    scrollPos,
    setScrollPos,
    ABAS_FILTRO // <--- EXPORTANDO AQUI PARA A PÁGINA NÃO QUEBRAR
  };

  return (
    <ChamadosContext.Provider value={value}>
      {children}
    </ChamadosContext.Provider>
  );
}

export function useChamados() {
  const context = useContext(ChamadosContext);
  if (!context) {
    throw new Error('useChamados must be used within a ChamadosProvider');
  }
  return context;
}