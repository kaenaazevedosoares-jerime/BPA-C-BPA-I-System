import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import ProfissionalCard from '../components/ProfissionalCard';

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
  const [searchProfissao, setSearchProfissao] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchProfissionais();
  }, []);

  const fetchProfissionais = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('profissionais')
        .select('*')
        .order('nome', { ascending: true });

      if (searchTerm) {
        query = query.ilike('nome', `%${searchTerm}%`);
      }

      if (searchProfissao) {
        query = query.ilike('profissao', `%${searchProfissao}%`);
      }

      const { data, error } = await query;

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

  const handleSearch = () => {
    fetchProfissionais();
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setSearchProfissao('');
    fetchProfissionais();
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Profissionais</h2>
          <button
            onClick={onAddNew}
            className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Novo Profissional
          </button>
        </div>

        <div className="bg-white dark:bg-surface-dark rounded-xl shadow-md p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome..."
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Profissão</label>
              <input
                type="text"
                value={searchProfissao}
                onChange={(e) => setSearchProfissao(e.target.value)}
                placeholder="Buscar por profissão..."
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={handleClearSearch}
                className="bg-slate-500 hover:bg-slate-600 text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all"
              >
                Limpar
              </button>
            </div>
          </div>
        </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {profissionais.map((profissional) => (
            <ProfissionalCard
              key={profissional.id}
              profissional={profissional}
              onEdit={onEdit}
              onDelete={(id) => setDeleteConfirm(id)}
            />
          ))}
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
