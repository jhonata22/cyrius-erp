import { useState } from 'react';
// Alterado: Importamos a nossa instância personalizada
import api from '../services/api'; 
import { useNavigate } from 'react-router-dom';
import { Lock, User, ArrowRight } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Simplificado: Usamos a instância 'api' que já conhece a baseURL /api
      const response = await api.post('/token/', {
        username,
        password
      });

      // Salva o token no navegador
      const token = response.data.access;
      localStorage.setItem('token', token);
      
      /** * NOTA: Não precisamos mais de axios.defaults.headers aqui! 
       * O interceptor em services/api.js lerá o token do localStorage 
       * automaticamente na próxima requisição que o app fizer.
       */

      // Redireciona para a Home/Dashboard
      navigate('/');
      
    } catch (err) {
      console.error("Erro de autenticação:", err);
      if (err.response && err.response.status === 401) {
        setError('Usuário ou senha incorretos.');
      } else {
        setError('Erro de conexão com o servidor.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white font-sans">
      
      {/* LADO ESQUERDO (BRANDING) */}
      <div className="hidden lg:flex w-1/2 bg-[#0f172a] items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[#0f172a]/90 z-10"></div>
        <img 
          src="https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069&auto=format&fit=crop" 
          alt="Cyber Security" 
          className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-50"
        />
        
        <div className="relative z-20 text-white p-12 max-w-lg">
          <h1 className="text-5xl font-bold mb-6 tracking-tighter">CYRI<span className="text-blue-400">US</span></h1>
          <p className="text-xl text-gray-400 leading-relaxed">
            Plataforma centralizada de gestão de TI.
            <br/><span className="text-gray-300">Infraestrutura, Suporte e Finanças em um só lugar.</span>
          </p>
        </div>
      </div>

      {/* LADO DIREITO (LOGIN) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-[#F8FAFC]">
        <div className="w-full max-w-md bg-white p-10 rounded-2xl shadow-2xl border border-gray-100">
          
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-slate-800">Acesso Restrito</h2>
            <p className="text-slate-500 mt-2 font-medium">Cyrius ERP v1.0</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200 text-center font-bold">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Usuário</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><User size={20} /></span>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  placeholder="Seu ID de acesso"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Senha</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Lock size={20} /></span>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3 bg-[#0f172a] hover:bg-slate-800 text-white font-bold rounded-lg transition-all transform hover:scale-[1.01] flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
            >
              {loading ? 'Validando...' : <>Entrar no Dashboard <ArrowRight size={18} /></>}
            </button>
          </form>
          
          <p className="text-center text-xs text-slate-400 mt-8">
            Acesso monitorado. Em caso de perda de senha, contate o administrador.
          </p>
        </div>
      </div>
    </div>
  );
}