
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface RegisterProps {
  onRegister: () => void;
  onGoToLogin: () => void;
}

const Register: React.FC<RegisterProps> = ({ onRegister, onGoToLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // 1. Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // 2. Fallback: Call RPC just in case trigger fails
    if (authData.user) {
      await supabase.rpc('create_profile_after_signup', { full_name: fullName });
      alert('Cadastro realizado com sucesso!');
      onGoToLogin();
    } else {
      alert('Cadastro realizado! Verifique seu e-mail para confirmar a conta.');
      onGoToLogin();
    }
    
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-6 bg-background-light dark:bg-background-dark transition-colors duration-300">
      <div className="absolute top-0 right-0 h-64 w-64 translate-x-1/3 -translate-y-1/3 rounded-full bg-primary opacity-20 blur-[80px]"></div>
      
      <div className="relative w-full max-w-md space-y-8 bg-white/70 dark:bg-surface-dark/70 backdrop-blur-xl rounded-3xl p-8 shadow-2xl ring-1 ring-slate-200 dark:ring-white/5 animate-fade-in">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Criar Conta</h1>
          <p className="mt-2 text-sm text-slate-500">Cadastre-se para acessar o painel de gestão LRPD.</p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleRegister}>
          {error && (
            <div className="p-3 rounded-lg bg-red-100 border border-red-200 text-red-700 text-xs font-bold">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nome Completo</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">person</span>
              <input 
                type="text" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="block w-full rounded-xl border-0 py-3 pl-10 bg-slate-50 dark:bg-background-dark/50 text-slate-900 dark:text-white ring-1 ring-inset ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-primary text-sm" 
                placeholder="Seu nome" 
                required 
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">E-mail Corporativo</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">mail</span>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-xl border-0 py-3 pl-10 bg-slate-50 dark:bg-background-dark/50 text-slate-900 dark:text-white ring-1 ring-inset ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-primary text-sm" 
                placeholder="exemplo@laboratorio.com" 
                required 
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Senha</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">lock</span>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-xl border-0 py-3 pl-10 bg-slate-50 dark:bg-background-dark/50 text-slate-900 dark:text-white ring-1 ring-inset ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-primary text-sm" 
                placeholder="••••••••" 
                required 
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary py-4 rounded-xl text-white font-bold shadow-neon hover:bg-primary-dark transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : 'Criar Minha Conta'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Já possui conta? 
          <button onClick={onGoToLogin} className="font-bold text-primary ml-1 hover:underline">Fazer Login</button>
        </p>
      </div>
    </div>
  );
};

export default Register;
