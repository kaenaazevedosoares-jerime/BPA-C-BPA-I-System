
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface CboRegistrationProps {
  onCancel: () => void;
  onSave: () => void;
}

const CboRegistration: React.FC<CboRegistrationProps> = ({ onCancel, onSave }) => {
  const [code, setCode] = useState('');
  const [occupation, setOccupation] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [cbos, setCbos] = useState<Array<{ id: number; code: string; occupation: string }>>([]);
  const [listLoading, setListLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadCbos = async () => {
    setListLoading(true);
    const { data, error } = await supabase
      .from('cbos')
      .select('id, code, occupation')
      .order('code');
    if (error) {
      alert('Erro ao carregar CBOs: ' + error.message);
    } else {
      setCbos(data || []);
    }
    setListLoading(false);
  };

  useEffect(() => {
    loadCbos();
  }, []);

  const handleDelete = async (id: number) => {
    const ok = window.confirm('Deseja excluir este CBO?');
    if (!ok) return;
    setDeletingId(id);
    const { error } = await supabase
      .from('cbos')
      .delete()
      .eq('id', id);
    setDeletingId(null);
    if (error) {
      alert('Erro ao excluir: ' + error.message);
    } else {
      await loadCbos();
    }
  };

  const handleSave = async () => {
    if (!code || !occupation) return alert('Preencha todos os campos');
    
    setLoading(true);
    const { error } = await supabase
      .from('cbos')
      .insert([{ code, occupation }]);

    setLoading(false);
    if (error) {
      alert('Erro ao salvar: ' + error.message);
    } else {
      setCode('');
      setOccupation('');
      setShowForm(false);
      await loadCbos();
      onSave();
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24 space-y-8 animate-fade-in">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
            <span className="material-symbols-outlined">clinical_notes</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Registro de CBO</h1>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">Classificação Brasileira de Ocupações</p>
          </div>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Cadastre os códigos de ocupação permitidos para os lançamentos de produção.</p>
      </div>

      {/* Lista de CBOs */}
      <div className="bg-white dark:bg-surface-dark rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 space-y-6">
        <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">CBOs Cadastrados</h3>
        {listLoading ? (
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <span className="material-symbols-outlined animate-spin">progress_activity</span>
            Carregando...
          </div>
        ) : cbos.length === 0 ? (
          <div className="text-slate-500 dark:text-slate-400 text-sm">Nenhum CBO cadastrado ainda.</div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {cbos.map((cbo) => (
              <li key={cbo.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                    <span className="material-symbols-outlined">badge</span>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{cbo.code}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{cbo.occupation}</div>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(cbo.id)}
                  disabled={deletingId === cbo.id}
                  className="h-10 px-3 rounded-lg border-2 border-red-200 dark:border-red-700 text-red-600 dark:text-red-300 bg-white dark:bg-surface-dark hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex items-center gap-2 disabled:opacity-60"
                >
                  {deletingId === cbo.id ? (
                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  ) : (
                    <span className="material-symbols-outlined">delete</span>
                  )}
                  Excluir
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Formulário (oculto até acionado) */}
      {showForm && (
        <div className="bg-white dark:bg-surface-dark rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 space-y-8">
          <section className="space-y-6">
            <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">Dados da Ocupação</h3>
            <div className="space-y-6">
              <div className="flex flex-col gap-2 group">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Código CBO</label>
                <div className="relative">
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Ex: 223208"
                    className="w-full h-12 bg-slate-50 dark:bg-background-dark/30 border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-primary focus:ring-0 rounded-t-lg px-4 pr-12 text-slate-900 dark:text-white transition-all text-sm font-medium"
                  />
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-primary/70 text-[20px]">badge</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 group">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Profissão / Descrição</label>
                <div className="relative">
                  <input
                    type="text"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    placeholder="Ex: Cirurgião Dentista - Clínico Geral"
                    className="w-full h-12 bg-slate-50 dark:bg-background-dark/30 border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-primary focus:ring-0 rounded-t-lg px-4 pr-12 text-slate-900 dark:text-white transition-all text-sm font-medium"
                  />
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-primary/70 text-[20px]">work</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-40">
        <div className="max-w-2xl mx-auto flex gap-4">
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="flex-1 h-14 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/30 hover:bg-primary-dark transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">add_circle</span>
              Novo CBO
            </button>
          ) : (
            <>
              <button
                onClick={() => { setShowForm(false); setCode(''); setOccupation(''); }}
                disabled={loading}
                className="flex-1 h-14 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold bg-white dark:bg-surface-dark hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-[2] h-14 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/30 hover:bg-primary-dark transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading ? (
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                ) : (
                  <>
                    <span className="material-symbols-outlined">save</span>
                    Salvar CBO
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CboRegistration;
