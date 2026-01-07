import { useState, useEffect } from 'react';
// Alterado: Importamos a nossa instância personalizada em vez do axios padrão
import api from '../services/api'; 
import { Plus, ArrowUpCircle, ArrowDownCircle, DollarSign, Calendar, AlertTriangle } from 'lucide-react';

export default function Financeiro() {
  const [lancamentos, setLancamentos] = useState([]);
  const [resumo, setResumo] = useState({ entradas: 0, saidas: 0, saldo: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [acessoNegado, setAcessoNegado] = useState(false);

  // Estados do Formulário
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [tipo, setTipo] = useState('ENTRADA'); 
  const [dataVencimento, setDataVencimento] = useState('');
  const [clienteId, setClienteId] = useState(1); 

  const carregarFinanceiro = () => {
    // Simplificado: Usamos a instância centralizada que aponta para a baseURL /api
    api.get('/financeiro/')
      .then(response => {
        const dados = response.data;
        setLancamentos(dados);
        calcularResumo(dados);
        setAcessoNegado(false);
      })
      .catch(error => {
        console.error("Erro ao carregar dados financeiros:", error);
        // O interceptor lida com o 401 (Login), mas o 403 (Permissão) tratamos aqui
        if (error.response && error.response.status === 403) {
          setAcessoNegado(true);
        }
      });
  };

  const calcularResumo = (dados) => {
    let ent = 0;
    let sai = 0;
    dados.forEach(l => {
      const val = parseFloat(l.valor);
      if (l.tipo_lancamento === 'ENTRADA') ent += val;
      else sai += val;
    });
    setResumo({ entradas: ent, saidas: sai, saldo: ent - sai });
  };

  useEffect(() => {
    carregarFinanceiro();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const dados = {
      descricao,
      valor: parseFloat(valor),
      tipo_lancamento: tipo,
      status: 'PENDENTE',
      data_vencimento: dataVencimento,
      cliente: clienteId
    };

    // Simplificado: O token JWT é inserido automaticamente pelo interceptor
    api.post('/financeiro/', dados)
      .then(() => {
        setIsModalOpen(false);
        carregarFinanceiro();
        setDescricao('');
        setValor('');
        alert("Lançamento realizado com sucesso!");
      })
      .catch(err => {
        console.error(err);
        alert("Erro ao salvar. Verifique se você possui permissão de Gestor.");
      });
  };

  // --- TELA DE BLOQUEIO (RBAC) ---
  if (acessoNegado) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8">
        <div className="bg-red-100 p-6 rounded-full mb-6 animate-pulse">
          <AlertTriangle size={64} className="text-red-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Acesso Restrito</h2>
        <p className="text-gray-500 max-w-md">
          Esta área contém dados sensíveis e é exclusiva para <strong>Gestores e Sócios</strong>. 
          Seu perfil não possui as credenciais necessárias para visualizar o financeiro.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Fluxo de Caixa</h1>
          <p className="text-gray-500 text-sm mt-1">Gestão consolidada de receitas e despesas.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary-dark hover:bg-[#1a1b4b] text-white px-5 py-2.5 rounded-lg flex items-center gap-2 shadow-lg font-bold transition-all"
        >
          <Plus size={18} /> Novo Lançamento
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Entradas</p>
            <h3 className="text-2xl font-bold text-green-600 mt-1">
              R$ {resumo.entradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="bg-green-100 p-3 rounded-full text-green-600">
            <ArrowUpCircle size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Saídas</p>
            <h3 className="text-2xl font-bold text-red-600 mt-1">
              R$ {resumo.saidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="bg-red-100 p-3 rounded-full text-red-600">
            <ArrowDownCircle size={24} />
          </div>
        </div>

        <div className="bg-primary-dark text-white p-6 rounded-xl shadow-xl flex items-center justify-between">
          <div>
            <p className="text-blue-200 text-xs font-bold uppercase tracking-wider">Saldo em Caixa</p>
            <h3 className="text-2xl font-bold mt-1">
              R$ {resumo.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="bg-white/20 p-3 rounded-full text-white">
            <DollarSign size={24} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold border-b">
                <tr>
                <th className="p-4">Descrição do Lançamento</th>
                <th className="p-4">Data Venc.</th>
                <th className="p-4">Tipo</th>
                <th className="p-4 text-right">Valor Líquido</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {lancamentos.map(lanc => (
                <tr key={lanc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-semibold text-gray-700">{lanc.descricao}</td>
                    <td className="p-4 text-gray-500 text-sm">
                        {new Date(lanc.data_vencimento).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="p-4">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase
                        ${lanc.tipo_lancamento === 'ENTRADA' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {lanc.tipo_lancamento}
                    </span>
                    </td>
                    <td className={`p-4 text-right font-bold ${lanc.tipo_lancamento === 'ENTRADA' ? 'text-green-600' : 'text-red-600'}`}>
                    {lanc.tipo_lancamento === 'SAIDA' ? '- ' : ''}
                    R$ {parseFloat(lanc.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
        
        {lancamentos.length === 0 && (
          <div className="p-12 text-center text-gray-400 text-sm italic">Nenhum registro financeiro encontrado no período.</div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 border border-gray-100 animate-in fade-in zoom-in duration-200">
            <h3 className="font-bold text-gray-800 text-lg mb-6">Novo Lançamento Financeiro</h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Descrição</label>
                <input 
                  type="text" required value={descricao} onChange={e => setDescricao(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-light/50 transition-all"
                  placeholder="Ex: Licença Microsoft 365"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Valor (R$)</label>
                  <input 
                    type="number" step="0.01" required value={valor} onChange={e => setValor(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-light/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Tipo</label>
                  <select 
                    value={tipo} onChange={e => setTipo(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-light/50 bg-white"
                  >
                    <option value="ENTRADA">Receita (+)</option>
                    <option value="SAIDA">Despesa (-)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Vencimento</label>
                <input 
                  type="date" required value={dataVencimento} onChange={e => setDataVencimento(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-light/50"
                />
              </div>

              <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-500 hover:text-gray-700 font-medium rounded-lg">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-primary-dark text-white rounded-lg hover:bg-[#1a1b4b] font-bold shadow-md">Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}