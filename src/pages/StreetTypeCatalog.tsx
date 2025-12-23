import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { formatTitleCase } from '../utils/textUtils';

interface StreetTypeCatalogProps {
  onCancel: () => void; // Not strictly used if navigated via Sidebar, but good for interface consistency
}

const StreetTypeCatalog: React.FC<StreetTypeCatalogProps> = () => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [types, setTypes] = useState<Array<{ code: string; name: string }>>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);

  const fetchTypes = async () => {
    setListLoading(true);
    const { data, error } = await supabase
      .from('street_types_catalog')
      .select('code, name')
      .order('name');
    
    if (error) {
      console.error('Erro ao buscar tipos de logradouro:', error);
    } else {
      setTypes(data || []);
    }
    setListLoading(false);
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  const handleDelete = async (codeToDelete: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este tipo de logradouro?')) return;

    // Note: If 'code' is not PK, we might need to delete by name or ID. 
    // Schema says 'name' is PK. But we added 'code'. 
    // Let's assume we can delete by 'code' if it's unique, or by 'name'.
    // Safe bet: Delete by 'name' since it's likely the PK in original schema, 
    // BUT we are editing 'code' now.
    // Let's look up the item first to get the name if needed, or just try deleting by code if unique.
    // Given the migration added a unique constraint on code, we can try deleting by code.
    // However, if the original PK is 'name', Supabase might prefer that.
    // Let's use 'code' for now, if it fails we fix.
    // Actually, in the list we have 'name'. Let's find the item.
    const item = types.find(t => t.code === codeToDelete);
    if (!item) return;

    const { error } = await supabase
      .from('street_types_catalog')
      .delete()
      .eq('name', item.name); // Using Name as it's likely the PK

    if (error) {
      alert('Erro ao excluir: ' + error.message);
    } else {
      fetchTypes();
    }
  };

  const handleEdit = (item: { code: string; name: string }) => {
    setCode(item.code || '');
    setName(item.name);
    setEditingCode(item.name); // Using Name as ID for editing state since it's PK
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!code || !name) return alert('Código e Descrição são obrigatórios');
    
    setLoading(true);
    const formattedName = formatTitleCase(name);

    try {
      if (editingCode) {
        // Update
        // Note: Updating PK 'name' might be tricky if referenced. 
        // Assuming cascade or simple update.
        const { error } = await supabase
          .from('street_types_catalog')
          .update({ code, name: formattedName })
          .eq('name', editingCode);
        
        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('street_types_catalog')
          .insert([{ code, name: formattedName }]);
        
        if (error) throw error;
      }

      setShowForm(false);
      setCode('');
      setName('');
      setEditingCode(null);
      fetchTypes();
    } catch (error: any) {
      alert('Erro ao salvar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24 space-y-8 animate-fade-in">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
            <span className="material-symbols-outlined">signpost</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Tipos de Logradouro</h1>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">Catálogo de Endereços</p>
          </div>
        </div>
      </div>

      {!showForm && (
        <div className="flex justify-end">
          <button
            onClick={() => {
              setEditingCode(null);
              setCode('');
              setName('');
              setShowForm(true);
            }}
            className="h-12 px-6 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/30 hover:bg-primary-dark transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined">add</span>
            Novo Tipo
          </button>
        </div>
      )}

      {showForm && (
        <div className="bg-white dark:bg-surface-dark rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 space-y-6 animate-slide-up">
          <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">{editingCode ? 'edit' : 'add_circle'}</span>
            {editingCode ? 'Editar Tipo' : 'Novo Cadastro'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Código</label>
              <input 
                type="text" 
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ex: 001" 
                className="w-full h-12 bg-slate-50 dark:bg-background-dark/30 border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-primary focus:ring-0 rounded-t-lg px-4 text-slate-900 dark:text-white transition-all text-sm font-medium"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Descrição (Tipo)</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Rua, Avenida..." 
                className="w-full h-12 bg-slate-50 dark:bg-background-dark/30 border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-primary focus:ring-0 rounded-t-lg px-4 text-slate-900 dark:text-white transition-all text-sm font-medium"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button 
              onClick={() => setShowForm(false)}
              className="px-6 h-12 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-500 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSave}
              disabled={loading}
              className="px-8 h-12 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/30 hover:bg-primary-dark transition-all flex items-center gap-2 disabled:opacity-70"
            >
              {loading ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : <span className="material-symbols-outlined">save</span>}
              Salvar
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-surface-dark rounded-3xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-background-dark/50 border-b border-slate-100 dark:border-slate-800">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-32">Código</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right w-32">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {listLoading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center">
                    <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
                  </td>
                </tr>
              ) : types.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-slate-500 text-sm">
                    Nenhum tipo cadastrado.
                  </td>
                </tr>
              ) : (
                types.map((t) => (
                  <tr key={t.name} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-sm text-primary font-bold">{t.code || '---'}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-700 dark:text-slate-200">{t.name}</td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <button onClick={() => handleEdit(t)} className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all">
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                      </button>
                      <button onClick={() => handleDelete(t.code)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all">
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StreetTypeCatalog;
