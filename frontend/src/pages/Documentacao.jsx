import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, Save, Building2, Wifi, Lock, Monitor, 
  Server, TrendingUp, Phone, Mail, User, Globe, Shield, Search, BookOpen, X 
} from 'lucide-react';

export default function Documentacao() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // --- ESTADOS DE DADOS ---
  const [listaClientes, setListaClientes] = useState([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);

  // --- ESTADOS DO CLIENTE ATUAL ---
  const [cliente, setCliente] = useState(null);
  const [ativos, setAtivos] = useState([]);
  const [activeTab, setActiveTab] = useState('geral');
  
  // --- ESTADOS LÓGICOS ---
  const [docId, setDocId] = useState(null); 
  const [modalAberto, setModalAberto] = useState(null); 
  const [formTemp, setFormTemp] = useState({}); 

  // Estado para os textos longos (Editáveis)
  const [textos, setTextos] = useState({
    configuracao_mikrotik: '',
    topologia_rede: '',
    estrutura_servidores: '',
    rotina_backup: '',
    pontos_fracos_melhorias: ''
  });

  useEffect(() => {
    carregarDados();
  }, [id]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      if (!id) {
        // MODO SELEÇÃO: URL Relativa
        const res = await axios.get('/api/clientes/');
        setListaClientes(res.data);
      } else {
        // MODO DETALHE: URLs Relativas
        const [resCliente, resAtivos] = await Promise.all([
          axios.get(`/api/clientes/${id}/`),
          axios.get('/api/ativos/')
        ]);
        
        const dadosCliente = resCliente.data;
        setCliente(dadosCliente);
        setAtivos(resAtivos.data.filter(a => a.cliente === parseInt(id)));

        // Popula os textos se existirem
        if (dadosCliente.documentacao_tecnica) {
          setDocId(dadosCliente.documentacao_tecnica.id);
          setTextos({
            configuracao_mikrotik: dadosCliente.documentacao_tecnica.configuracao_mikrotik || '',
            topologia_rede: dadosCliente.documentacao_tecnica.topologia_rede || '',
            estrutura_servidores: dadosCliente.documentacao_tecnica.estrutura_servidores || '',
            rotina_backup: dadosCliente.documentacao_tecnica.rotina_backup || '',
            pontos_fracos_melhorias: dadosCliente.documentacao_tecnica.pontos_fracos_melhorias || ''
          });
        } else {
          setDocId(null);
          setTextos({ configuracao_mikrotik: '', topologia_rede: '', estrutura_servidores: '', rotina_backup: '', pontos_fracos_melhorias: '' });
        }
      }
    } catch (error) {
      console.error("Erro ao carregar dossiê:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- FUNÇÕES LÓGICAS ---

  const handleSalvarTextos = async () => {
    try {
      const payload = { ...textos, cliente: parseInt(id) };
      
      if (docId) {
        await axios.patch(`/api/documentacao/${docId}/`, payload);
      } else {
        await axios.post('/api/documentacao/', payload);
      }
      alert("Textos técnicos atualizados!");
      carregarDados();
    } catch (error) {
      alert("Erro ao salvar textos.");
      console.error(error);
    }
  };

  const handleSalvarModal = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formTemp, cliente: parseInt(id) };
      
      let endpoint = '';
      if (modalAberto === 'contato') endpoint = '/api/contatos/';
      if (modalAberto === 'provedor') endpoint = '/api/provedores/';
      if (modalAberto === 'email') endpoint = '/api/emails/';
      if (modalAberto === 'ativo') endpoint = '/api/ativos/';

      await axios.post(endpoint, payload);
      alert("Item adicionado com sucesso!");
      setModalAberto(null);
      setFormTemp({});
      carregarDados();
    } catch (error) {
      console.error(error);
      alert("Erro ao adicionar item. Verifique os campos.");
    }
  };

  // --- MODO 1: SELEÇÃO DE CLIENTE ---
  if (!id) {
    const filtrados = listaClientes.filter(c => c.razao_social.toLowerCase().includes(busca.toLowerCase()));

    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Documentação Técnica</h1>
          <p className="text-gray-500 text-sm">Selecione uma empresa para gerenciar o dossiê técnico.</p>
        </div>

        <div className="relative mb-6">
          <input type="text" placeholder="Buscar empresa..." className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-light/50 shadow-sm"
            value={busca} onChange={e => setBusca(e.target.value)}
          />
          <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>

        {loading ? <p className="text-center py-10 text-gray-500 font-medium">Carregando carteira...</p> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtrados.map(cli => (
              <div key={cli.id} onClick={() => navigate(`/documentacao/${cli.id}`)} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md cursor-pointer transition-all group hover:border-primary-light">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-primary-dark group-hover:text-white transition-colors">
                    <Building2 size={24} />
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${cli.tipo_cliente === 'CONTRATO' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {cli.tipo_cliente}
                  </span>
                </div>
                <h3 className="font-bold text-gray-800 text-lg group-hover:text-primary-dark">{cli.razao_social}</h3>
                <p className="text-sm text-gray-500 mt-1 truncate">{cli.endereco}</p>
                <div className="mt-4 pt-4 border-t border-gray-50 flex items-center text-xs text-gray-400 font-medium">
                  <BookOpen size={14} className="mr-1" /> Acessar Documentação
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- MODO 2: VISUALIZAÇÃO DA DOCUMENTAÇÃO ---
  if (loading) return <div className="p-8 text-center text-gray-500 font-medium">Carregando dossiê técnico...</div>;
  if (!cliente) return <div className="p-8 text-center text-red-500">Empresa não encontrada.</div>;

  const contatos = cliente.contatos || [];
  const provedores = cliente.provedores || [];
  const emails = cliente.contas_email || [];

  const renderContent = () => {
    switch (activeTab) {
      case 'geral':
        return (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Building2 size={20} className="text-primary-dark" /> Dados Cadastrais
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold">Razão Social</p>
                  <p className="text-gray-800">{cliente.razao_social}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold">CNPJ / CPF</p>
                  <p className="text-gray-800 font-mono">{cliente.cnpj || cliente.cpf}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs text-gray-500 uppercase font-bold">Endereço Principal</p>
                  <p className="text-gray-800">{cliente.endereco}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <User size={20} className="text-primary-dark" /> Gestores e Contatos
                </h3>
                <button onClick={() => setModalAberto('contato')} className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-md font-bold text-gray-600">
                  + Adicionar
                </button>
              </div>
              
              {contatos.length === 0 ? <p className="text-gray-400 text-sm italic">Nenhum contato cadastrado.</p> : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {contatos.map(c => (
                    <div key={c.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="font-bold text-gray-800">{c.nome}</p>
                      <p className="text-xs text-primary-dark font-bold uppercase mb-2">{c.cargo}</p>
                      <div className="space-y-1 text-sm text-gray-600">
                        {c.telefone && <p className="flex items-center gap-2"><Phone size={14} /> {c.telefone}</p>}
                        {c.email && <p className="flex items-center gap-2"><Mail size={14} /> {c.email}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 'rede':
        return (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <Globe size={20} className="text-blue-600" /> Links de Internet
                </h3>
                <button onClick={() => setModalAberto('provedor')} className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-md font-bold text-gray-600">+ Provedor</button>
              </div>
              {provedores.length === 0 ? <p className="text-gray-400 text-sm italic">Nenhum link registrado.</p> : (
                <div className="grid gap-4">
                  {provedores.map(p => (
                    <div key={p.id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                      <div>
                        <p className="font-bold text-gray-800">{p.nome_operadora} - {p.plano_contratado}</p>
                        <p className="text-xs text-gray-500 font-mono">IP: {p.ip_fixo || 'Dinâmico'}</p>
                      </div>
                      <div className="text-sm text-gray-600 mt-2 md:mt-0 text-right">
                        <p><strong>Suporte:</strong> {p.telefone_suporte}</p>
                        <p className="text-xs font-mono bg-white px-2 py-1 rounded border mt-1">PPPoE: {p.usuario_pppoe} / ***</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                  <Wifi size={20} className="text-orange-600" /> Mikrotik / Firewall
                </h3>
                <textarea 
                  className="w-full h-40 p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-light/50"
                  placeholder="NAT, VPNs, Scripts..."
                  value={textos.configuracao_mikrotik}
                  onChange={e => setTextos({...textos, configuracao_mikrotik: e.target.value})}
                />
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                  <Shield size={20} className="text-green-600" /> Topologia de Rede
                </h3>
                <textarea 
                  className="w-full h-40 p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-light/50"
                  placeholder="Mapa de switchs, VLANs..."
                  value={textos.topologia_rede}
                  onChange={e => setTextos({...textos, topologia_rede: e.target.value})}
                />
              </div>
            </div>
            <div className="flex justify-end">
               <button onClick={handleSalvarTextos} className="bg-primary-dark text-white px-5 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-light font-bold shadow-md transition-all">
                 <Save size={18}/> Salvar Seção de Rede
               </button>
            </div>
          </div>
        );

      case 'senhas':
        return (
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
             <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <Mail size={20} className="text-purple-600" /> Contas de E-mail
                </h3>
                <button onClick={() => setModalAberto('email')} className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-md font-bold text-gray-600">+ Nova Conta</button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3">E-mail</th>
                      <th className="px-4 py-3">Usuário</th>
                      <th className="px-4 py-3">Senha</th>
                      <th className="px-4 py-3">Provedor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emails.map(e => (
                      <tr key={e.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-800">{e.email}</td>
                        <td className="px-4 py-3 text-gray-600">{e.nome_usuario}</td>
                        <td className="px-4 py-3 font-mono bg-gray-100 rounded text-gray-600 w-32 text-center select-all">{e.senha}</td>
                        <td className="px-4 py-3 text-gray-500">{e.provedor}</td>
                      </tr>
                    ))}
                    {emails.length === 0 && (
                      <tr>
                        <td colSpan="4" className="text-center py-6 text-gray-400 italic">Nenhuma conta vinculada.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
          </div>
        );

      case 'inventario':
        return (
          <div className="space-y-6">
             <div className="flex justify-between items-center">
                <h3 className="font-bold text-gray-800">Ativos no Inventário ({ativos.length})</h3>
                <button onClick={() => setModalAberto('ativo')} className="bg-primary-dark text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-light flex gap-2 items-center font-bold shadow-md">
                  <Monitor size={18} /> Novo Ativo
                </button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ativos.map(ativo => (
                  <div key={ativo.id} className="bg-white p-4 rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <div className={`p-2 rounded-lg ${ativo.tipo === 'COMPUTADOR' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                         {ativo.tipo === 'COMPUTADOR' ? <Monitor size={20} /> : <Server size={20} />}
                      </div>
                      <span className="text-[10px] font-bold bg-gray-100 px-2 py-1 rounded uppercase text-gray-500">{ativo.tipo}</span>
                    </div>
                    <h4 className="font-bold text-gray-800">{ativo.nome}</h4>
                    <p className="text-xs text-gray-500 mb-3">{ativo.marca_modelo}</p>
                    
                    <div className="space-y-1 bg-gray-50 p-2 rounded text-xs text-gray-600 border border-gray-100">
                       {ativo.processador && <p><strong>Processador:</strong> {ativo.processador}</p>}
                       {ativo.anydesk_id && <p className="text-blue-600 font-bold">AnyDesk: {ativo.anydesk_id}</p>}
                       {ativo.ip_local && <p><strong>IP Local:</strong> {ativo.ip_local}</p>}
                       {ativo.usuario_local && <p>Login: {ativo.usuario_local}</p>}
                    </div>
                  </div>
                ))}
             </div>
          </div>
        );

      case 'servidores':
        return (
           <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                  <Server size={20} className="text-indigo-600" /> Servidores e Virtualização
                </h3>
                <textarea 
                  className="w-full h-48 p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-light/50"
                  value={textos.estrutura_servidores}
                  placeholder="Descreva AD, DHCP, DNS, Virtualização..."
                  onChange={e => setTextos({...textos, estrutura_servidores: e.target.value})}
                />
              </div>
              
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                  <Save size={20} className="text-teal-600" /> Política de Backup
                </h3>
                <textarea 
                  className="w-full h-32 p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-light/50"
                  value={textos.rotina_backup}
                  placeholder="Caminhos, softwares e frequência de backup..."
                  onChange={e => setTextos({...textos, rotina_backup: e.target.value})}
                />
              </div>
              <div className="flex justify-end">
                 <button onClick={handleSalvarTextos} className="bg-primary-dark text-white px-5 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-light font-bold shadow-md"><Save size={18}/> Salvar Servidores</button>
              </div>
           </div>
        );

      case 'consultoria':
        return (
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-orange-500">
             <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <TrendingUp size={20} className="text-orange-600" /> Plano de Melhorias (Consultoria)
             </h3>
             <p className="text-sm text-gray-600 mb-4 font-medium">
                Registre equipamentos obsoletos e sugestões de upgrade para futuras negociações.
             </p>
             <textarea 
                className="w-full h-64 p-4 bg-orange-50 rounded-lg border border-orange-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400 font-medium"
                placeholder="- Servidor com hardware antigo&#10;- Switch 10/100 limitando rede&#10;- Falta de No-break no rack"
                value={textos.pontos_fracos_melhorias}
                onChange={e => setTextos({...textos, pontos_fracos_melhorias: e.target.value})}
              />
              <div className="flex justify-end mt-4">
                 <button onClick={handleSalvarTextos} className="bg-orange-600 text-white px-5 py-2 rounded-lg flex items-center gap-2 hover:bg-orange-700 font-bold shadow-md"><Save size={18}/> Salvar Análise</button>
              </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center text-primary-dark">
            <Building2 size={32} />
            </div>
            <div>
            <h1 className="text-2xl font-bold text-gray-800">{cliente.razao_social}</h1>
            <p className="text-gray-500 text-sm flex items-center gap-2">
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold uppercase">{cliente.tipo_cliente}</span>
                <span>• Gestão Técnica Centralizada</span>
            </p>
            </div>
        </div>
        
        <button 
            onClick={() => { setCliente(null); navigate('/documentacao'); }}
            className="text-sm text-primary-dark hover:underline flex items-center gap-1 font-bold"
        >
            <ArrowLeft size={16} /> Trocar Empresa
        </button>
      </div>

      {/* TABS NAVEGAÇÃO */}
      <div className="flex overflow-x-auto gap-2 border-b border-gray-200 mb-6 pb-1 no-scrollbar">
        {[
          { id: 'geral', label: 'Visão Geral', icon: Building2 },
          { id: 'rede', label: 'Rede & Internet', icon: Globe },
          { id: 'senhas', label: 'Senhas & Emails', icon: Lock },
          { id: 'inventario', label: 'Inventário', icon: Monitor },
          { id: 'servidores', label: 'Servidores & Backup', icon: Server },
          { id: 'consultoria', label: 'Melhorias', icon: TrendingUp },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2 rounded-t-lg text-sm font-bold transition-all whitespace-nowrap
              ${activeTab === tab.id 
                ? 'bg-white border-b-2 border-primary-dark text-primary-dark shadow-sm' 
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {renderContent()}

      {/* MODAL UNIFICADO */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 border border-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-gray-800">Adicionar Informação</h3>
              <button onClick={() => {setModalAberto(null); setFormTemp({});}} className="text-gray-400 hover:text-red-500 transition-colors"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSalvarModal} className="space-y-4">
              {modalAberto === 'contato' && (
                <>
                  <input required placeholder="Nome Completo" className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-light/50" onChange={e => setFormTemp({...formTemp, nome: e.target.value})} />
                  <input required placeholder="Cargo / Função" className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-light/50" onChange={e => setFormTemp({...formTemp, cargo: e.target.value})} />
                  <input placeholder="Telefone de Contato" className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-light/50" onChange={e => setFormTemp({...formTemp, telefone: e.target.value})} />
                  <input placeholder="E-mail" className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-light/50" onChange={e => setFormTemp({...formTemp, email: e.target.value})} />
                </>
              )}

              {modalAberto === 'provedor' && (
                <>
                  <input required placeholder="Operadora" className="w-full p-3 border border-gray-200 rounded-lg outline-none" onChange={e => setFormTemp({...formTemp, nome_operadora: e.target.value})} />
                  <input placeholder="Velocidade / Plano" className="w-full p-3 border border-gray-200 rounded-lg outline-none" onChange={e => setFormTemp({...formTemp, plano_contratado: e.target.value})} />
                  <input placeholder="Telefone Suporte Técnico" className="w-full p-3 border border-gray-200 rounded-lg outline-none" onChange={e => setFormTemp({...formTemp, telefone_suporte: e.target.value})} />
                  <input placeholder="IP Fixo" className="w-full p-3 border border-gray-200 rounded-lg outline-none" onChange={e => setFormTemp({...formTemp, ip_fixo: e.target.value})} />
                  <input placeholder="Login PPPoE" className="w-full p-3 border border-gray-200 rounded-lg outline-none" onChange={e => setFormTemp({...formTemp, usuario_pppoe: e.target.value})} />
                  <input placeholder="Senha PPPoE" className="w-full p-3 border border-gray-200 rounded-lg outline-none" onChange={e => setFormTemp({...formTemp, senha_pppoe: e.target.value})} />
                </>
              )}

              {modalAberto === 'email' && (
                <>
                  <input required type="email" placeholder="Endereço de E-mail" className="w-full p-3 border border-gray-200 rounded-lg outline-none" onChange={e => setFormTemp({...formTemp, email: e.target.value})} />
                  <input required placeholder="Senha da Conta" className="w-full p-3 border border-gray-200 rounded-lg outline-none" onChange={e => setFormTemp({...formTemp, senha: e.target.value})} />
                  <input placeholder="Responsável" className="w-full p-3 border border-gray-200 rounded-lg outline-none" onChange={e => setFormTemp({...formTemp, nome_usuario: e.target.value})} />
                  <input placeholder="Plataforma (Ex: Google Workspace)" className="w-full p-3 border border-gray-200 rounded-lg outline-none" onChange={e => setFormTemp({...formTemp, provedor: e.target.value})} />
                </>
              )}

              {modalAberto === 'ativo' && (
                <>
                  <input required placeholder="Nome/Hostname" className="w-full p-3 border border-gray-200 rounded-lg outline-none" onChange={e => setFormTemp({...formTemp, nome: e.target.value})} />
                  <select required className="w-full p-3 border border-gray-200 rounded-lg outline-none bg-white" onChange={e => setFormTemp({...formTemp, tipo: e.target.value})} defaultValue="">
                    <option value="" disabled>Tipo de Equipamento...</option>
                    <option value="COMPUTADOR">Computador/Notebook</option>
                    <option value="SERVIDOR">Servidor Físico/VM</option>
                    <option value="REDE">Roteador/Switch/AP</option>
                    <option value="IMPRESSORA">Impressora de Rede</option>
                  </select>
                  <input placeholder="Marca e Modelo" className="w-full p-3 border border-gray-200 rounded-lg outline-none" onChange={e => setFormTemp({...formTemp, marca_modelo: e.target.value})} />
                  <input placeholder="AnyDesk/TeamViewer ID" className="w-full p-3 border border-gray-200 rounded-lg outline-none" onChange={e => setFormTemp({...formTemp, anydesk_id: e.target.value})} />
                  <div className="grid grid-cols-2 gap-2">
                    <input placeholder="Usuário Admin" className="w-full p-3 border border-gray-200 rounded-lg outline-none" onChange={e => setFormTemp({...formTemp, usuario_local: e.target.value})} />
                    <input placeholder="Senha Admin" className="w-full p-3 border border-gray-200 rounded-lg outline-none" onChange={e => setFormTemp({...formTemp, senha_local: e.target.value})} />
                  </div>
                </>
              )}

              <button type="submit" className="w-full py-3 bg-primary-dark text-white rounded-lg hover:bg-primary-light font-bold shadow-lg transition-all mt-4">
                Confirmar e Salvar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}