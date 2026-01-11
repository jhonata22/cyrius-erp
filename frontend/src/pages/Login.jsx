import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ArrowRight, AlertCircle } from 'lucide-react';
import authService from '../services/authService';

export default function Login() {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  // Se o usuário já estiver logado, manda direto para a Home
  useEffect(() => {
    if (authService.isAuthenticated()) navigate('/');
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({ ...prev, [name]: value }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await authService.login(credentials);

      // Guardamos o token e o username (para exibir um "Olá, fulano" no dashboard)
      localStorage.setItem('token', data.access);
      localStorage.setItem('username', credentials.username);
      
      navigate('/');
    } catch (err) {
      // Tratamento de erro mais específico
      if (!err.response) {
        setError('Servidor offline. Tente novamente mais tarde.');
      } else if (err.response.status === 401) {
        setError('Usuário ou senha incorretos.');
      } else {
        setError('Ocorreu um erro inesperado. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#F4F6F9] font-sans">
      
      {/* LADO ESQUERDO: Branding (Oculto em mobile) */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/90 to-slate-900/95 z-10"></div>
        <img 
          src="https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069&auto=format&fit=crop" 
          alt="Escritório" 
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        />
        
        <div className="relative z-20 text-white p-12 max-w-lg">
          <h1 className="text-6xl font-black tracking-tighter mb-4">
            CYRI<span className="text-indigo-400">US</span>
          </h1>
          <div className="h-1 w-20 bg-indigo-500 mb-6"></div>
          <p className="text-xl text-slate-300 leading-relaxed font-light">
            Sua infraestrutura de TI sob controle total. 
            Simples, inteligente e eficiente.
          </p>
        </div>
      </div>

      {/* LADO DIREITO: Form de Login */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-2xl border border-slate-100">
          
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-800">Bem-vindo</h2>
            <p className="text-slate-500 mt-1">Acesse sua conta para continuar</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            
            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100 animate-in fade-in duration-300">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 ml-1">Usuário</label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                  <User size={18} />
                </span>
                <input 
                  name="username"
                  type="text" 
                  value={credentials.username}
                  onChange={handleChange}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                  placeholder="Seu usuário"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 ml-1">Senha</label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                  <Lock size={18} />
                </span>
                <input 
                  name="password"
                  type="password" 
                  value={credentials.password}
                  onChange={handleChange}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                  placeholder="Sua senha secreta"
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed mt-8"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>Entrar no sistema <ArrowRight size={20} /></>
              )}
            </button>
          </form>

          <p className="text-center mt-10 text-sm text-slate-400">
            © {new Date().getFullYear()} Cyrius ERP. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}