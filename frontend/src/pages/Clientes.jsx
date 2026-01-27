import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Search, MapPin, Calendar, FileText, Building2, 
  User, ChevronRight, DollarSign, X, Info, Filter, Camera 
} from 'lucide-react';

import clienteService from '../services/clienteService';

export default function Clientes() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Estado único para o formulário
  const [formData, setFormData] = useState({
    razao_social: '',
    cpf_cnpj: '',
    endereco: '',
    tipo_cliente: 'CONTRATO',
    valor_contrato_mensal: '',
    dia_vencimento: 5,
    foto: null // Novo campo para a foto
  });

  const carregarClientes = async () => {
    try {
      setLoading(true);
      const dados = await clienteService.listar();
      setClientes(dados);
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarClientes(); }, []);

  // Filtro performático
  const clientesFiltrados = useMemo(() => {
    return clientes.filter(c => 
      c.razao_social.toLowerCase().includes(busca.toLowerCase()) ||
      (c.cnpj && c.cnpj.includes(busca)) ||
      (c.cpf && c.cpf.includes(busca))
    );
  }, [busca, clientes]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Novo handler para a foto
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFormData(prev => ({ ...prev, foto: file }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Usando FormData para enviar arquivo
      const payload = new FormData();
      payload.append('razao_social', formData.razao_social);
      payload.append('endereco', formData.endereco);
      payload.append('tipo_cliente', formData.tipo_cliente);
      payload.append('valor_contrato_mensal', formData.valor_contrato_mensal || 0);
      payload.append('dia_vencimento', formData.dia_vencimento);
      
      if (formData.cpf_cnpj.length > 11) {
          payload.append('cnpj', formData.cpf_cnpj);
      } else {
          payload.append('cpf', formData.cpf_cnpj);
      }

      if (formData.foto) {
          payload.append('foto', formData.foto);
      }

      await clienteService.criar(payload);
      
      setIsModalOpen(false);
      setFormData({ razao_social: '', cpf_cnpj: '', endereco: '', tipo_cliente: 'CONTRATO', valor_contrato_mensal: '', dia_vencimento: 5, foto: null });
      carregarClientes();
      alert("Cliente cadastrado com sucesso!");
    } catch (error) {
      alert("Erro ao salvar cliente. Verifique os dados.");
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Clientes</h1>
          <div className="h-1 w-12 bg-[#7C69AF] mt-2 rounded-full"></div>
        </div>
        
        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-80 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#7C69AF] transition-colors" size={18} />
            <input 
              type="text" placeholder="Buscar por nome ou documento..." 
              value={busca} onChange={e => setBusca(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-purple-500/5 transition-all text-sm"
            />
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-[#302464] hover:bg-[#7C69AF] text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-black shadow-xl shadow-purple-900/10 transition-all active:scale-95 text-sm"
          >
            <Plus size={20} /> Novo Cliente
          </button>
        </div>
      </div>

      {/* LISTA DE CLIENTES */}
      {loading ? (
        <div className="py-20 text-center text-[#7C69AF] animate-pulse font-black uppercase tracking-widest text-[10px]">Sincronizando Carteira Cyrius...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clientesFiltrados.map(cliente => (
            <div 
              key={cliente.id} 
              onClick={() => navigate(`/documentacao/${cliente.id}`)}
              className="group bg-white p-6 rounded-[2.2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer relative overflow-hidden"
            >
              {/* Badge de Tipo */}
              <div className={`absolute top-0 right-0 px-4 py-1 rounded-bl-2xl text-[9px] font-black uppercase tracking-widest
                ${cliente.tipo_cliente === 'CONTRATO' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500'}`}>
                {cliente.tipo_cliente}
              </div>

              <div className="flex items-center gap-4 mb-6">
                {/* Lógica para exibir foto ou inicial */}
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-inner overflow-hidden
                  ${cliente.tipo_cliente === 'CONTRATO' ? 'bg-emerald-500' : 'bg-[#A696D1]'}`}>
                   {cliente.foto ? (
                       <img src={cliente.foto} alt={cliente.razao_social} className="w-full h-full object-cover" />
                   ) : (
                       cliente.razao_social.charAt(0).toUpperCase()
                   )}
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-lg group-hover:text-[#7C69AF] transition-colors leading-tight">
                    {cliente.razao_social}
                  </h3>
                  <p className="text-[10px] font-mono text-slate-400 mt-1 uppercase font-bold">
                    {cliente.cnpj || cliente.cpf || 'Sem documento'}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-2 text-xs text-slate-500 font-bold">
                  <MapPin size={14} className="text-[#A696D1] shrink-0" />
                  <span className="line-clamp-1">{cliente.endereco}</span>
                </div>
                
                {cliente.tipo_cliente === 'CONTRATO' && (
                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                       <Calendar size={12} className="text-[#7C69AF]" /> Vence Dia {cliente.dia_vencimento}
                    </div>
                    <div className="text-sm font-black text-emerald-600">
                       R$ {cliente.valor_contrato_mensal}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between items-center text-slate-300 group-hover:text-[#7C69AF] transition-colors">
                 <span className="text-[10px] font-black uppercase tracking-widest">Ficha Técnica</span>
                 <ChevronRight size={18} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DE CADASTRO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#302464]/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl p-8 max-h-[95vh] overflow-y-auto relative border border-white/20">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 text-slate-400 hover:text-[#302464] transition-colors">
              <X size={24} />
            </button>

            <h3 className="font-black text-[#302464] text-2xl mb-8 flex items-center gap-3">
              <Building2 className="text-[#7C69AF]" /> Novo Cliente
            </h3>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Campo de Upload de Foto */}
              <div className="md:col-span-2 flex justify-center mb-4">
                  <div className="relative group cursor-pointer w-24 h-24">
                      <div className="w-full h-full rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden">
                          {formData.foto ? (
                              <img src={URL.createObjectURL(formData.foto)} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                              <Camera className="text-slate-400 group-hover:text-[#7C69AF] transition-colors" size={32} />
                          )}
                      </div>
                      <input 
                          type="file" 
                          accept="image/*"
                          onChange={handleFileChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="absolute bottom-0 right-0 bg-[#302464] text-white p-1 rounded-full shadow-lg">
                          <Plus size={12} />
                      </div>
                  </div>
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Razão Social / Nome Completo</label>
                <input 
                  name="razao_social" required type="text" value={formData.razao_social} onChange={handleInputChange}
                  className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl outline-none focus:ring-4 focus:ring-purple-500/5 font-bold text-[#302464]"
                  placeholder="Ex: ACME Corporation LTDA"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CPF ou CNPJ</label>
                <input 
                  name="cpf_cnpj" required type="text" value={formData.cpf_cnpj} onChange={handleInputChange}
                  className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl outline-none focus:ring-4 focus:ring-purple-500/5 font-bold"
                  placeholder="Apenas números"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Cliente</label>
                <select 
                  name="tipo_cliente" value={formData.tipo_cliente} onChange={handleInputChange}
                  className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl outline-none focus:ring-4 focus:ring-purple-500/5 font-bold text-slate-700 cursor-pointer"
                >
                  <option value="CONTRATO">CONTRATO MENSAL</option>
                  <option value="AVULSO">CLIENTE AVULSO</option>
                </select>
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Endereço de Atendimento</label>
                <div className="relative group">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#7C69AF] transition-colors" size={18} />
                  <input 
                    name="endereco" required type="text" value={formData.endereco} onChange={handleInputChange}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-none rounded-2xl outline-none focus:ring-4 focus:ring-purple-500/5 font-medium"
                    placeholder="Rua, Número, Bairro, Cidade - UF"
                  />
                </div>
              </div>

              {formData.tipo_cliente === 'CONTRATO' && (
                <div className="md:col-span-2 grid grid-cols-2 gap-6 p-6 bg-emerald-50 rounded-[2rem] border border-emerald-100 animate-in slide-in-from-top-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-emerald-700 uppercase tracking-widest ml-1">Valor Mensalidade (R$)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-300" size={18} />
                      <input 
                        name="valor_contrato_mensal" type="number" step="0.01" value={formData.valor_contrato_mensal} onChange={handleInputChange}
                        className="w-full pl-12 pr-4 py-3 bg-white border-none rounded-xl outline-none focus:ring-4 focus:ring-emerald-200 font-black text-emerald-700"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-emerald-700 uppercase tracking-widest ml-1">Melhor Dia Vencimento</label>
                    <input 
                      name="dia_vencimento" type="number" max="31" min="1" value={formData.dia_vencimento} onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-white border-none rounded-xl outline-none focus:ring-4 focus:ring-emerald-200 font-black text-emerald-700"
                    />
                  </div>
                </div>
              )}

              <button 
                type="submit" 
                className="md:col-span-2 w-full py-5 bg-gradient-to-r from-[#302464] to-[#7C69AF] text-white rounded-3xl font-black text-lg shadow-2xl shadow-purple-900/20 active:scale-95 mt-4 transition-all"
              >
                Salvar Cadastro
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}