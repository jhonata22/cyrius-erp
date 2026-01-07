import { useState } from 'react';
import axios from 'axios';
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
      // 1. Pede o token ao Backend
      const response = await axios.post('http://localhost:8000/api/token/', {
        username,
        password
      });

      // 2. Salva o token no navegador
      const token = response.data.access;
      localStorage.setItem('token', token);
      
      // 3. Configura o axios globalmente
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // 4. Entra no sistema
      navigate('/');
      
    } catch (err) {
      console.error(err);
      setError('Usuário ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white font-sans">
      
      {/* LADO ESQUERDO (IMAGEM) */}
      <div className="hidden lg:flex w-1/2 bg-primary-dark items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-primary-dark/90 z-10"></div>
        {/* Imagem de Fundo (Escritório) */}
        <img 
          src="https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069&auto=format&fit=crop" 
          alt="Office" 
          className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-50"
        />
        
        <div className="relative z-20 text-white p-12 max-w-lg">
          <h1 className="text-5xl font-bold mb-6">CYRI<span className="text-primary-light">US</span></h1>
          <p className="text-xl text-gray-300 leading-relaxed">
            Gestão inteligente para sua empresa de TI.
            <br/>Controle chamados, estoque e contratos em um só lugar.
          </p>
        </div>
      </div>

      {/* LADO DIREITO (FORMULÁRIO) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-[#F4F6F9]">
        <div className="w-full max-w-md bg-white p-10 rounded-2xl shadow-xl">
          
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-800">Login</h2>
            <p className="text-gray-500 mt-2">Entre com suas credenciais de acesso.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 text-center">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Usuário</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><User size={20} /></span>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-light/50 outline-none transition-all"
                  placeholder="Seu usuário"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Senha</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Lock size={20} /></span>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-light/50 outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3 bg-primary-dark hover:bg-[#1a1b4b] text-white font-bold rounded-lg transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20 disabled:opacity-70"
            >
              {loading ? 'Entrando...' : <>Acessar Sistema <ArrowRight size={18} /></>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}