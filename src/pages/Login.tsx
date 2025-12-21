
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface LoginProps {
  onLogin: () => void;
  onGoToRegister: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onGoToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      onLogin();
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-6 bg-background-light dark:bg-background-dark transition-colors duration-300">
      <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-primary/20 blur-[100px] dark:bg-primary/10 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] h-[400px] w-[400px] rounded-full bg-accent-purple/20 blur-[100px] dark:bg-accent-purple/10 pointer-events-none"></div>

      <div className="relative w-full max-w-md space-y-8 bg-white/70 dark:bg-surface-dark/70 backdrop-blur-xl rounded-3xl p-8 shadow-2xl ring-1 ring-slate-200 dark:ring-white/5 animate-fade-in">
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/30 shadow-glow">
            <span className="material-symbols-outlined text-4xl text-primary">dentistry</span>
          </div>
          <h2 className="text-xs font-bold tracking-widest text-primary uppercase mb-2">Laboratório Regional</h2>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Bem-vindo</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Acesse sua conta para gerenciar pedidos</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="p-3 rounded-lg bg-red-100 border border-red-200 text-red-700 text-xs font-bold animate-pulse">
              {error}
            </div>
          )}
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">E-mail</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">mail</span>
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl border-0 py-3.5 pl-10 bg-slate-50 dark:bg-background-dark/50 text-slate-900 dark:text-white ring-1 ring-inset ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-primary transition-all text-sm" 
                  placeholder="seu.email@exemplo.com" 
                  required 
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Senha</label>
                <button type="button" className="text-xs font-bold text-primary hover:underline">Esqueci a senha</button>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">lock</span>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="block w-full rounded-xl border-0 py-3.5 pl-10 bg-slate-50 dark:bg-background-dark/50 text-slate-900 dark:text-white ring-1 ring-inset ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-primary transition-all text-sm" 
                  required 
                />
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full bg-primary py-4 rounded-xl text-white font-bold shadow-neon hover:bg-primary-dark hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
            ) : 'Entrar no Sistema'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Ainda não tem uma conta? 
          <button onClick={onGoToRegister} className="font-bold text-primary ml-1 hover:underline">Cadastre-se</button>
        </p>
      </div>
    </div>
  );
};

export default Login;
