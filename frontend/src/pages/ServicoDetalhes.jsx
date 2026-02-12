import { useState, useEffect, useCallback } from 'react'; 
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Save, CheckCircle, Plus, Trash2, 
  FileText, Image, Paperclip, Box, DollarSign, 
  Truck, Printer, QrCode, Download,
  Edit, Monitor, Users, UserPlus, X 
} from 'lucide-react';
import QRCode from 'react-qr-code';
import servicoService from '../services/servicoService';
import estoqueService from '../services/estoqueService'; 
import equipeService from '../services/equipeService'; 

// NÃO IMPORTAMOS MAIS O CONTEXTO GLOBAL
// import { useEmpresa } from '../contexts/EmpresaContext';

export default function ServicoDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  // const { empresaSelecionada } = useEmpresa(); // REMOVIDO

  const [loading, setLoading] = useState(true);
  const [os, setOs] = useState(null);
  
  // Dados Auxiliares (Carregados com base na empresa da OS)
  const [produtos, setProdutos] = useState([]); 
  const [equipe, setEquipe] = useState([]); 

  // Modais
  const [modalItemOpen, setModalItemOpen] = useState(false);
  const [modalAnexoOpen, setModalAnexoOpen] = useState(false);
  const [modalTecnicoOpen, setModalTecnicoOpen] = useState(false); 

  // Forms dos Modais
  const [itemForm, setItemForm] = useState({ id: null, produto: '', quantidade: 1 });
  const [anexoForm, setAnexoForm] = useState({ arquivo: null, tipo: 'FOTO', descricao: '' });
  const [tecnicoSelecionado, setTecnicoSelecionado] = useState(''); 

  // Edição Geral
  const [editData, setEditData] = useState({
    relatorio_tecnico: '',
    valor_mao_de_obra: '', 
    custo_deslocamento: '',
    desconto: ''
  });

  const carregarDados = useCallback(async () => {
    try {
      setLoading(true);
      
      // 1. Busca a OS pelo ID (O backend já deve retornar o ID da empresa vinculada)
      const dadosOS = await servicoService.buscarPorId(id);
      setOs(dadosOS);
      
      setEditData({
        relatorio_tecnico: dadosOS.relatorio_tecnico || '',
        valor_mao_de_obra: dadosOS.valor_mao_de_obra || '', 
        custo_deslocamento: dadosOS.custo_deslocamento || '',
        desconto: dadosOS.desconto || ''
      });

      // 2. Se a OS estiver ativa, carregamos os auxiliares DA EMPRESA DELA
      if (dadosOS.status !== 'CONCLUIDO' && dadosOS.status !== 'CANCELADO') {
        // Pega o ID da empresa que veio no objeto da OS
        // Se for nulo, busca global (null)
        const empresaId = dadosOS.empresa || null; 
        
        // Carrega Produtos e Equipe filtrados por essa empresa
        const [listaProdutos, listaEquipe] = await Promise.all([
            estoqueService.listarProdutos(empresaId), // Passa ID para filtrar estoque
            equipeService.listar(empresaId)           // Passa ID para filtrar equipe
        ]);

        setProdutos(listaProdutos);
        setEquipe(listaEquipe);
      }

    } catch (error) {
      console.error(error);
      alert("Erro ao carregar O.S.");
      navigate('/servicos');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // --- LÓGICA DE TÉCNICOS ---

  const handleAdicionarTecnico = async (e) => {
    e.preventDefault();
    if (!tecnicoSelecionado) return;

    try {
        const idsAtuais = os.tecnicos ? os.tecnicos.map(t => t.id) : [];
        
        if (idsAtuais.includes(parseInt(tecnicoSelecionado))) {
            alert("Este técnico já está na OS.");
            return;
        }

        const novosIds = [...idsAtuais, parseInt(tecnicoSelecionado)];

        await servicoService.atualizar(id, { tecnicos: novosIds });
        
        setModalTecnicoOpen(false);
        setTecnicoSelecionado('');
        carregarDados(); 
    } catch (error) {
        alert("Erro ao adicionar técnico.");
    }
  };

  const handleRemoverTecnico = async (tecnicoId) => {
    if(!window.confirm("Remover este técnico da OS?")) return;
    try {
        const idsAtuais = os.tecnicos ? os.tecnicos.map(t => t.id) : [];
        const novosIds = idsAtuais.filter(id => id !== tecnicoId);

        await servicoService.atualizar(id, { tecnicos: novosIds });
        carregarDados();
    } catch (error) {
        alert("Erro ao remover técnico.");
    }
  };


  // --- DEMAIS AÇÕES ---

  const handleSalvarGeral = async () => {
    try {
      const payload = {
          ...editData,
          valor_mao_de_obra: parseFloat(editData.valor_mao_de_obra) || 0,
          custo_deslocamento: parseFloat(editData.custo_deslocamento) || 0,
          desconto: parseFloat(editData.desconto) || 0,
      };

      await servicoService.atualizar(id, payload);
      alert("Dados atualizados!");
      carregarDados();
    } catch (error) {
      alert("Erro ao salvar alterações.");
    }
  };

  const handleFinalizar = async () => {
    if (!window.confirm("ATENÇÃO: Finalizar a OS irá:\n1. Baixar o estoque das peças utilizadas.\n2. Gerar o lançamento financeiro.\n\nDeseja continuar?")) return;

    try {
      const payload = {
          ...editData,
          valor_mao_de_obra: parseFloat(editData.valor_mao_de_obra) || 0,
          custo_deslocamento: parseFloat(editData.custo_deslocamento) || 0,
          desconto: parseFloat(editData.desconto) || 0,
      };
      await servicoService.atualizar(id, payload);
      await servicoService.finalizar(id);
      
      alert("Ordem de Serviço finalizada com sucesso!");
      carregarDados();
    } catch (error) {
      alert("Erro ao finalizar: " + (error.response?.data?.erro || "Verifique o estoque ou financeiro."));
    }
  };

  const handleAdicionarItem = async (e) => {
    e.preventDefault();
    if (!itemForm.produto) return;

    try {
      const prodSelecionado = produtos.find(p => p.id === parseInt(itemForm.produto));
      
      const payload = {
        produto: itemForm.produto,
        quantidade: itemForm.quantidade,
        preco_venda: prodSelecionado ? prodSelecionado.preco_venda_sugerido : 0 
      };

      if (itemForm.id) {
        await servicoService.atualizarItem(itemForm.id, payload);
      } else {
        await servicoService.adicionarItem(id, payload);
      }

      setModalItemOpen(false);
      setItemForm({ id: null, produto: '', quantidade: 1 }); 
      carregarDados();
    } catch (error) {
      alert("Erro ao salvar item: " + (error.response?.data?.erro || "Verifique o estoque."));
    }
  };

  const handleExcluirItem = async (itemId) => {
    if(!window.confirm("Tem certeza que deseja remover este item?")) return;

    try {
        await servicoService.removerItem(itemId); 
        carregarDados();
    } catch (error) {
        alert("Erro ao excluir item.");
    }
  };

  const abrirEdicao = (item) => {
    setItemForm({
        id: item.id,
        produto: item.produto, 
        quantidade: item.quantidade
    });
    setModalItemOpen(true);
  };

  const handleAnexar = async (e) => {
    e.preventDefault();
    if (!anexoForm.arquivo) return;

    try {
      await servicoService.anexarArquivo(id, anexoForm.arquivo, anexoForm.tipo, anexoForm.descricao);
      setModalAnexoOpen(false);
      setAnexoForm({ arquivo: null, tipo: 'FOTO', descricao: '' });
      carregarDados();
    } catch (error) {
      alert("Erro ao enviar arquivo.");
    }
  };

  const handleExcluirAnexo = async (anexoId) => {
    if(!window.confirm("Tem certeza que deseja remover este anexo?")) return;

    try {
        await servicoService.removerAnexo(anexoId);
        carregarDados();
    } catch (error) {
        alert("Erro ao excluir anexo.");
    }
  };

  const imprimirOS = () => {
    const totalGeral = (parseFloat(os.total_pecas) || 0) + (parseFloat(editData.valor_mao_de_obra) || 0) - (parseFloat(editData.desconto) || 0);
    const logoHtml = `<img src="/logo.png" alt="CYRIUS" style="max-height: 200px;" />`; 
    const empresaNome = os.empresa_nome || "CYRIUS TECNOLOGIA"; 

    // Pega nomes dos técnicos para impressão
    const nomesTecnicos = os.tecnicos && os.tecnicos.length > 0 
        ? os.tecnicos.map(t => t.nome).join(', ')
        : (os.nome_tecnico || 'Não atribuído');

    const janela = window.open('', '', 'width=800,height=600');
    janela.document.write(`
      <html>
        <head>
          <title>Ordem de Serviço #${os.id}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #302464; padding-bottom: 20px; margin-bottom: 30px; }
            .logo-container { font-size: 24px; font-weight: bold; color: #302464; }
            .info-os { text-align: right; }
            .section { margin-bottom: 30px; }
            .section-title { font-size: 14px; font-weight: bold; text-transform: uppercase; color: #666; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 15px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { text-align: left; font-size: 12px; color: #666; padding: 8px 0; border-bottom: 1px solid #ddd; }
            td { padding: 10px 0; border-bottom: 1px solid #eee; font-size: 14px; }
            .total-row { display: flex; justify-content: flex-end; margin-top: 30px; font-size: 18px; font-weight: bold; }
            .assinaturas { margin-top: 80px; display: flex; justify-content: space-between; }
            .line { border-top: 1px solid #333; width: 40%; text-align: center; padding-top: 10px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-container">
               ${logoHtml}
               <div style="font-size: 12px; margin-top: 5px; color: #666;">${empresaNome}</div>
            </div>
            <div class="info-os">
              <h1>OS #${String(os.id).padStart(4, '0')}</h1>
              <p>Data: ${new Date(os.data_entrada).toLocaleDateString()}</p>
            </div>
          </div>
          <div class="section">
            <div class="grid">
              <div>
                <p><strong>Cliente:</strong> ${os.nome_cliente}</p>
                <p><strong>Técnicos:</strong> ${nomesTecnicos}</p>
                ${os.nome_ativo ? `<p><strong>Ativo:</strong> ${os.nome_ativo}</p>` : ''} 
              </div>
              <div>
                <p><strong>Tipo:</strong> ${os.tipo}</p>
                <p><strong>Status:</strong> ${os.status}</p>
              </div>
            </div>
          </div>
          <div class="section">
            <div class="section-title">Descrição do Problema</div>
            <p>${os.descricao_problema}</p>
          </div>
          <div class="section">
            <div class="section-title">Peças Utilizadas</div>
            <table>
              <thead><tr><th>Item</th><th style="text-align:right">Qtd</th><th style="text-align:right">Valor Un.</th><th style="text-align:right">Total</th></tr></thead>
              <tbody>
                ${os.itens.map(item => `
                  <tr>
                    <td>${item.nome_produto}</td>
                    <td style="text-align:right">${item.quantidade}</td>
                    <td style="text-align:right">${formatMoney(item.preco_venda)}</td>
                    <td style="text-align:right">${formatMoney(item.subtotal)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div class="section">
              <div class="section-title">Resumo Financeiro</div>
              <table style="width: 50%; margin-left: auto;">
                <tr><td>Peças</td><td style="text-align:right">${formatMoney(os.total_pecas)}</td></tr>
                <tr><td>Mão de Obra</td><td style="text-align:right">${formatMoney(editData.valor_mao_de_obra)}</td></tr>
                <tr><td>Desconto</td><td style="text-align:right; color: red;">- ${formatMoney(editData.desconto)}</td></tr>
             </table>
             <div class="total-row">TOTAL: ${formatMoney(totalGeral)}</div>
          </div>
          <div class="assinaturas">
            <div class="line">Assinatura do Técnico</div>
            <div class="line">Assinatura do Cliente</div>
          </div>
        </body>
      </html>
    `);
    janela.document.close();
    janela.print();
  };

  const imprimirEtiqueta = () => {
    const svgElement = document.getElementById('qr-code-hidden');
    if (!svgElement) {
        alert("Erro ao gerar QR Code. Tente novamente.");
        return;
    }
    const qrCodeSvg = svgElement.innerHTML; 
    const janela = window.open('', '', 'width=400,height=400');
    janela.document.write(`
        <html>
            <head>
                <style>
                    body { font-family: sans-serif; text-align: center; padding: 10px; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                    .tag { border: 2px solid #000; padding: 15px; border-radius: 10px; display: inline-block; width: 90%; }
                    h2 { margin: 5px 0; font-size: 22px; font-weight: 900; }
                    p { margin: 5px 0; font-size: 12px; font-weight: bold; }
                    .qr-container { margin: 15px auto; }
                    svg { width: 120px; height: 120px; }
                </style>
            </head>
            <body>
                <div class="tag">
                    <h2>OS #${String(os.id).padStart(4, '0')}</h2>
                    <p>${os.nome_cliente.substring(0, 25)}</p>
                    <div class="qr-container">${qrCodeSvg}</div>
                    <p>Entrada: ${new Date(os.data_entrada).toLocaleDateString()}</p>
                    <p style="font-size: 10px; margin-top: 10px; text-transform: uppercase;">CONTROLE INTERNO</p>
                </div>
            </body>
        </html>
    `);
    janela.document.close();
    setTimeout(() => { janela.print(); }, 500);
  };

  const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  const isLocked = os?.status === 'CONCLUIDO' || os?.status === 'CANCELADO';
  const urlParaQR = window.location.href;

  if (loading || !os) return <div className="p-20 text-center text-[#7C69AF] animate-pulse font-black">Carregando O.S...</div>;

  return (
    <div className="max-w-7xl mx-auto pb-20 animate-in fade-in duration-500">
      
      <div style={{ display: 'none' }} id="qr-code-hidden">
         <QRCode value={urlParaQR} size={150} level="H" />
      </div>

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div className="flex items-center gap-4">
            <button onClick={() => navigate('/servicos')} className="p-3 bg-white rounded-xl shadow-sm text-slate-400 hover:text-[#302464] transition-all">
                <ArrowLeft size={20} />
            </button>
            <div>
                <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">OS #{String(os.id).padStart(4, '0')}</h1>
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border 
                        ${os.status === 'CONCLUIDO' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                        {os.status.replace('_', ' ')}
                    </span>
                    {/* Badge da Empresa */}
                    {os.empresa_nome && (
                        <span className="bg-purple-100 text-[#302464] text-[9px] font-black px-2 py-0.5 rounded border border-purple-200 uppercase">
                            {os.empresa_nome}
                        </span>
                    )}
                </div>
                <p className="text-slate-400 font-bold text-sm mt-1">{os.nome_cliente} • {os.titulo}</p>
                
                {os.ativo && (
                    <div 
                        onClick={() => navigate(`/ativos/${os.codigo_identificacao_ativo}`)}
                        className="flex items-center gap-2 mt-2 text-[#7C69AF] hover:text-[#302464] bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg w-fit cursor-pointer transition-colors border border-purple-100 group"
                    >
                        <Monitor size={14} className="group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-black uppercase tracking-wide">
                            {os.nome_ativo || 'Ver Ativo Vinculado'}
                        </span>
                    </div>
                )}
            </div>
        </div>

        <div className="flex gap-2">
            <button onClick={imprimirOS} className="px-4 py-3 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2" title="Imprimir OS">
                <Printer size={18} /> <span className="hidden sm:inline">Imprimir OS</span>
            </button>
            <button onClick={imprimirEtiqueta} className="px-4 py-3 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2" title="Etiqueta QR">
                <QrCode size={18} /> <span className="hidden sm:inline">Etiqueta</span>
            </button>

            {!isLocked && (
                <>
                    <button onClick={handleSalvarGeral} className="px-6 py-3 bg-white text-[#302464] border border-slate-200 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2">
                        <Save size={16} /> Salvar
                    </button>
                    <button onClick={handleFinalizar} className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2">
                        <CheckCircle size={16} /> Finalizar
                    </button>
                </>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUNA ESQUERDA (2/3) */}
        <div className="lg:col-span-2 space-y-8">
            
            {/* DESCRIÇÃO E LAUDO */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <FileText size={16} className="text-[#7C69AF]"/> Descrição do Problema
                </h3>
                <p className="text-slate-700 font-medium mb-8 bg-slate-50 p-4 rounded-2xl">{os.descricao_problema}</p>

                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <CheckCircle size={16} className="text-[#7C69AF]"/> Laudo Técnico / Solução
                </h3>
                <textarea 
                    className="w-full bg-slate-50 p-4 rounded-2xl border-none font-medium text-slate-700 outline-none focus:ring-2 focus:ring-[#7C69AF] resize-none h-32"
                    placeholder="Descreva o que foi feito..."
                    value={editData.relatorio_tecnico}
                    onChange={e => setEditData({...editData, relatorio_tecnico: e.target.value})}
                    disabled={isLocked}
                />
            </div>

            {/* PEÇAS E PRODUTOS */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Box size={16} className="text-[#7C69AF]"/> Peças & Produtos Utilizados
                    </h3>
                    {!isLocked && (
                        <button 
                            onClick={() => { setItemForm({ id: null, produto: '', quantidade: 1 }); setModalItemOpen(true); }} 
                            className="text-xs font-black text-[#7C69AF] hover:bg-purple-50 px-3 py-2 rounded-lg transition-colors flex items-center gap-1"
                        >
                            <Plus size={14} /> Adicionar
                        </button>
                    )}
                </div>

                {os.itens.length === 0 ? (
                    <div className="text-center py-8 text-slate-300 font-bold text-sm bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        Nenhuma peça utilizada do estoque.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {os.itens.map(item => (
                            <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                <div>
                                    <p className="font-bold text-slate-700 text-sm">{item.nome_produto}</p>
                                    <p className="text-xs text-slate-400 font-bold">{item.quantidade}x {formatMoney(item.preco_venda)}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    {!isLocked && (
                                        <div className="flex items-center gap-1">
                                            <button 
                                                onClick={() => abrirEdicao(item)}
                                                className="p-2 text-[#7C69AF] bg-white rounded-lg shadow-sm hover:bg-purple-50 transition-colors" 
                                                title="Editar Quantidade"
                                            >
                                                <Edit size={14} />
                                            </button>
                                            <button 
                                                onClick={() => handleExcluirItem(item.id)}
                                                className="p-2 text-red-400 bg-white rounded-lg shadow-sm hover:bg-red-50 transition-colors" 
                                                title="Remover Item"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ANEXOS */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Paperclip size={16} className="text-[#7C69AF]"/> Documentos & Fotos
                    </h3>
                    {!isLocked && (
                        <button onClick={() => setModalAnexoOpen(true)} className="text-xs font-black text-[#7C69AF] hover:bg-purple-50 px-3 py-2 rounded-lg transition-colors flex items-center gap-1">
                            <Plus size={14} /> Anexar
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {(os.anexos && Array.isArray(os.anexos) && os.anexos.length > 0) ? (
                        os.anexos.map(anexo => (
                            <div key={anexo.id} className="group relative bg-slate-50 rounded-2xl p-3 border border-slate-100 hover:shadow-lg transition-all flex flex-col aspect-square">
                                {anexo.tipo === 'FOTO' ? (
                                    <img 
                                        src={anexo.arquivo} 
                                        alt={anexo.descricao || 'Foto do anexo'}
                                        className="w-full h-full object-cover rounded-lg bg-slate-200"
                                        onError={(e) => {
                                            e.target.onerror = null; // Prevent infinite loop
                                            e.target.src = 'https://via.placeholder.com/150?text=Arquivo+Nao+Encontrado';
                                            e.target.alt = 'Arquivo não encontrado';
                                        }}
                                    />
                                ) : (
                                    <div className="flex-grow flex flex-col items-center justify-center text-center p-2">
                                        <FileText size={32} className="text-[#7C69AF] mb-2"/>
                                        <p className="font-bold text-slate-600 text-xs truncate mb-1" title={anexo.descricao}>{anexo.tipo}</p>
                                        <p className="text-[10px] text-slate-400 truncate">{anexo.descricao || 'Sem descrição'}</p>
                                    </div>
                                )}
                                <a 
                                    href={anexo.arquivo} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur-sm rounded-lg text-slate-500 hover:text-[#302464] shadow-md opacity-0 group-hover:opacity-100 transition-all"
                                    title="Baixar anexo (pode não existir em dev)"
                                >
                                    <Download size={14} />
                                </a>
                                {!isLocked && (
                                    <button
                                        onClick={() => handleExcluirAnexo(anexo.id)}
                                        className="absolute bottom-2 right-2 p-1.5 bg-white/80 backdrop-blur-sm rounded-lg text-red-500 hover:bg-red-100 shadow-md opacity-0 group-hover:opacity-100 transition-all"
                                        title="Excluir anexo"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        ))
                    ) : (
                        <p className="col-span-full text-center text-slate-400 text-xs py-4">Nenhum anexo.</p>
                    )}
                </div>
            </div>
        </div>

        {/* COLUNA DIREITA (1/3) - Financeiro e Resumo */}
        <div className="space-y-6">
            <div className="bg-[#302464] p-8 rounded-[2.5rem] text-white shadow-xl shadow-purple-900/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#7C69AF] opacity-20 rounded-full blur-3xl -mr-10 -mt-10"></div>
                <h3 className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-6 flex items-center gap-2 relative z-10">
                    <DollarSign size={14}/> Resumo Financeiro
                </h3>
                <div className="space-y-4 relative z-10">
                    <div className="flex justify-between items-center text-sm">
                        <span className="opacity-70">Peças ({os.itens.length})</span>
                        <span className="font-bold">{formatMoney(os.total_pecas)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="opacity-70">Mão de Obra</span>
                        {isLocked ? (
                            <span className="font-bold">{formatMoney(editData.valor_mao_de_obra)}</span>
                        ) : (
                            <input type="number" className="w-24 bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-right font-bold outline-none focus:border-white/50" value={editData.valor_mao_de_obra} onChange={e => setEditData({...editData, valor_mao_de_obra: e.target.value})} />
                        )}
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="opacity-70 text-red-300">Desconto</span>
                        {isLocked ? (
                            <span className="font-bold text-red-300">- {formatMoney(editData.desconto)}</span>
                        ) : (
                            <input type="number" className="w-24 bg-red-500/20 border border-red-500/30 text-red-200 rounded-lg px-2 py-1 text-right font-bold outline-none focus:border-red-400" value={editData.desconto} onChange={e => setEditData({...editData, desconto: e.target.value})} />
                        )}
                    </div>
                    <div className="h-px bg-white/10 my-4"></div>
                    <div className="flex justify-between items-end">
                        <span className="font-black text-lg">TOTAL</span>
                        <div className="text-right">
                             <span className="block text-3xl font-black tracking-tighter">
                                {formatMoney((parseFloat(os.total_pecas) || 0) + (parseFloat(editData.valor_mao_de_obra) || 0) - (parseFloat(editData.desconto) || 0))}
                             </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                 <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Truck size={14} className="text-[#7C69AF]"/> Custos Operacionais
                </h3>
                <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
                    <label className="text-[9px] font-black text-red-400 uppercase tracking-widest block mb-1">Deslocamento / Terceiros</label>
                    <div className="flex items-center gap-2">
                        <span className="text-red-400 font-bold">R$</span>
                        <input type="number" className="bg-transparent font-black text-red-600 outline-none w-full" value={editData.custo_deslocamento} onChange={e => setEditData({...editData, custo_deslocamento: e.target.value})} disabled={isLocked} />
                    </div>
                    <p className="text-[9px] text-red-400 mt-2 leading-tight">Valor a ser reembolsado ao técnico (Sai do caixa da empresa).</p>
                </div>
            </div>

            {/* CARD DE TÉCNICOS RESPONSÁVEIS */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                 <div className="flex justify-between items-center mb-4">
                     <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                         <Users size={14} className="text-[#7C69AF]"/> Equipe Técnica
                     </h3>
                     {!isLocked && (
                         <button onClick={() => setModalTecnicoOpen(true)} className="p-1.5 bg-purple-50 text-[#7C69AF] rounded-lg hover:bg-purple-100 transition-colors">
                             <UserPlus size={14} />
                         </button>
                     )}
                 </div>

                 <div className="space-y-3">
                     {(os.tecnicos && os.tecnicos.length > 0 ? os.tecnicos : (os.nome_tecnico ? [{id: 'unico', nome: os.nome_tecnico}] : [])).map((tec, idx) => (
                         <div key={tec.id || idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                             <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-full bg-[#302464] text-white flex items-center justify-center font-bold text-xs">
                                     {tec.nome.charAt(0)}
                                 </div>
                                 <span className="text-sm font-bold text-slate-700">{tec.nome}</span>
                             </div>
                             {!isLocked && tec.id !== 'unico' && (
                                 <button onClick={() => handleRemoverTecnico(tec.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                                     <X size={14} />
                                 </button>
                             )}
                         </div>
                     ))}
                     {(!os.tecnicos || os.tecnicos.length === 0) && !os.nome_tecnico && (
                         <p className="text-xs text-slate-400 font-medium text-center py-2">Nenhum técnico atribuído.</p>
                     )}
                 </div>

                 <div className="h-px bg-slate-100 my-4"></div>
                 
                 <div className="space-y-2 text-xs font-bold text-slate-500">
                    <div className="flex justify-between">
                        <span>Data Entrada</span>
                        <span>{new Date(os.data_entrada).toLocaleDateString()}</span>
                    </div>
                    {os.data_conclusao && (
                        <div className="flex justify-between text-emerald-600">
                            <span>Concluído em</span>
                            <span>{new Date(os.data_conclusao).toLocaleDateString()}</span>
                        </div>
                    )}
                 </div>
            </div>
        </div>
      </div>

      {/* MODAL ADICIONAR TÉCNICO */}
      {modalTecnicoOpen && (
        <div className="fixed inset-0 bg-[#302464]/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
             <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm p-8 relative">
                <button onClick={() => setModalTecnicoOpen(false)} className="absolute top-6 right-6 text-slate-300 hover:text-[#302464]"><X size={20} /></button>
                <h3 className="font-black text-[#302464] text-xl mb-6">Adicionar Técnico</h3>
                
                {/* AVISO EQUIPE FILTRADA */}
                {os.empresa_nome && (
                    <div className="mb-4 p-2 bg-purple-50 rounded-lg text-center text-xs font-bold text-purple-700">
                        Equipe de: {os.empresa_nome}
                    </div>
                )}

                <form onSubmit={handleAdicionarTecnico}>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Selecione o membro da equipe</label>
                        <select 
                            className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-slate-700 outline-none"
                            value={tecnicoSelecionado}
                            onChange={e => setTecnicoSelecionado(e.target.value)}
                            required
                        >
                            <option value="">Selecione...</option>
                            {equipe.map(tec => (
                                <option key={tec.id} value={tec.id}>{tec.nome}</option>
                            ))}
                        </select>
                    </div>
                    <button className="w-full py-4 bg-[#302464] text-white rounded-2xl font-black text-sm uppercase tracking-widest mt-6 hover:opacity-90 transition-opacity">
                        Confirmar
                    </button>
                </form>
             </div>
        </div>
      )}

      {/* MODAL ADICIONAR/EDITAR ITEM */}
      {modalItemOpen && (
        <div className="fixed inset-0 bg-[#302464]/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
             <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-8 relative">
                <button onClick={() => setModalItemOpen(false)} className="absolute top-6 right-6 text-slate-300 hover:text-[#302464]"><ArrowLeft size={20} /></button>
                <h3 className="font-black text-[#302464] text-xl mb-6">{itemForm.id ? 'Editar Quantidade' : 'Adicionar Peça'}</h3>
                
                {/* AVISO DO ESTOQUE FILTRADO */}
                {os.empresa_nome && (
                    <div className="mb-4 p-2 bg-purple-50 rounded-lg text-center text-xs font-bold text-purple-700">
                        Mostrando estoque de: {os.empresa_nome}
                    </div>
                )}

                <form onSubmit={handleAdicionarItem} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Produto do Estoque</label>
                        <select 
                            className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-slate-700 outline-none disabled:opacity-50"
                            value={itemForm.produto}
                            onChange={e => setItemForm({...itemForm, produto: e.target.value})}
                            required
                            disabled={!!itemForm.id} 
                        >
                            <option value="">Selecione...</option>
                            {produtos.map(p => (
                                <option key={p.id} value={p.id}>{p.nome} (Saldo: {p.estoque_atual})</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantidade</label>
                        <input 
                            type="number" min="1"
                            className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-slate-700 outline-none"
                            value={itemForm.quantidade}
                            onChange={e => setItemForm({...itemForm, quantidade: parseInt(e.target.value)})}
                            required
                        />
                    </div>
                    <button className="w-full py-4 bg-[#302464] text-white rounded-2xl font-black text-sm uppercase tracking-widest mt-4">Confirmar</button>
                </form>
             </div>
        </div>
      )}

      {/* MODAL ANEXO */}
      {modalAnexoOpen && (
        <div className="fixed inset-0 bg-[#302464]/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
             <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-8 relative">
                <button onClick={() => setModalAnexoOpen(false)} className="absolute top-6 right-6 text-slate-300 hover:text-[#302464]"><ArrowLeft size={20} /></button>
                <h3 className="font-black text-[#302464] text-xl mb-6">Novo Anexo</h3>
                <form onSubmit={handleAnexar} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Arquivo (PDF/Img)</label>
                        <input type="file" className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-slate-500 text-xs" onChange={e => setAnexoForm({...anexoForm, arquivo: e.target.files[0]})} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <select className="bg-slate-50 p-4 rounded-2xl font-bold text-slate-700 outline-none text-xs" value={anexoForm.tipo} onChange={e => setAnexoForm({...anexoForm, tipo: e.target.value})}>
                            <option value="FOTO">Foto</option>
                            <option value="NOTA_FISCAL">Nota Fiscal</option>
                            <option value="ORCAMENTO">Orçamento</option>
                            <option value="LAUDO">Laudo</option>
                        </select>
                        <input className="bg-slate-50 p-4 rounded-2xl font-bold text-slate-700 outline-none text-xs" placeholder="Descrição curta" value={anexoForm.descricao} onChange={e => setAnexoForm({...anexoForm, descricao: e.target.value})} />
                    </div>
                    <button className="w-full py-4 bg-[#302464] text-white rounded-2xl font-black text-sm uppercase tracking-widest mt-4">Enviar Arquivo</button>
                </form>
             </div>
        </div>
      )}

    </div>
  );
}