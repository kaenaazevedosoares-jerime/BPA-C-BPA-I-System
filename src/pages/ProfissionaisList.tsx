import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
// Lista de profissionais em formato de tabela, similar à lista de pacientes

interface Profissional {
  id: string;
  sus: string;
  nome: string;
  profissao: string;
  cbo?: string;
  endereco?: string;
  telefone?: string;
  email?: string;
  created_at: string;
}

interface ProfissionaisListProps {
  onAddNew: () => void;
  onEdit: (id: string) => void;
}

const ProfissionaisList: React.FC<ProfissionaisListProps> = ({ onAddNew, onEdit }) => {
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchProfissionais();
  }, []);

  const fetchProfissionais = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profissionais')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;
      setProfissionais(data || []);
    } catch (error) {
      console.error('Erro ao buscar profissionais:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('profissionais')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setProfissionais(profissionais.filter(p => p.id !== id));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Erro ao excluir profissional:', error);
      alert('Erro ao excluir profissional');
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  const handlePhoneClick = (phone: string) => {
    window.open(`tel:${phone.replace(/\D/g, '')}`, '_self');
  };

  const handleEmailClick = (email: string) => {
    window.open(`mailto:${email}`, '_self');
  };

  

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
          <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Profissionais</h2>
        <button
          onClick={onAddNew}
          className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Novo Profissional
        </button>
      </div>

      <div className="relative group mb-4">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 group-focus-within:text-primary transition-colors">search</span>
        <input 
          type="text"
          placeholder="Pesquisar por nome ou Número SUS..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full h-14 bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-2xl pl-12 pr-4 shadow-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all text-slate-900 dark:text-white"
        />
        {searchTerm && (
          <button onClick={handleClearSearch} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary">
            <span className="material-symbols-outlined">close</span>
          </button>
        )}
      </div>

      {profissionais.length === 0 ? (
        <div className="text-center py-12">
          <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 mb-4">person_search</span>
          <h3 className="text-lg font-medium text-slate-600 dark:text-slate-400 mb-2">Nenhum profissional encontrado</h3>
          <p className="text-slate-500 dark:text-slate-500 mb-4">Comece cadastrando um novo profissional</p>
          <button
            onClick={onAddNew}
            className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all"
          >
            Cadastrar Primeiro Profissional
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-surface-dark rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-background-dark/50 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Profissional</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nº SUS</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Profissão / CBO</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {profissionais
                  .filter(p => {
                    const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
                    const term = norm(searchTerm);
                    return norm(p.nome).includes(term) || p.sus.includes(searchTerm.replace(/\D/g, ''));
                  })
                  .map((p) => (
                    <tr key={p.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase">
                            {p.nome.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-900 dark:text-white">{p.nome}</span>
                            <span className="text-[10px] text-slate-400 font-medium">Cadastrado em: {new Date(p.created_at).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{p.sus}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm text-slate-600 dark:text-slate-400">{p.profissao}</span>
                          <span className="text-[10px] text-slate-400">CBO: {p.cbo || '---'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => onEdit(p.id)}
                            className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                            title="Editar Dados"
                          >
                            <span className="material-symbols-outlined text-[20px]">edit</span>
                          </button>
                          <button 
                            onClick={() => setDeleteConfirm(p.id)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title="Excluir Profissional"
                          >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-surface-dark rounded-xl shadow-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Confirmar Exclusão</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Tem certeza que deseja excluir este profissional? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfissionaisList;
