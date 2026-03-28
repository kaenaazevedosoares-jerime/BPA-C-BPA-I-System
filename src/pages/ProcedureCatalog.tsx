import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { formatTitleCase } from '../utils/textUtils';

interface ProcedureCatalogProps {
  onCancel: () => void;
  onSave: () => void;
}

interface ProcedureItem {
  id: string;
  code: string;
  name: string;
  category?: string;
  created_at: string;
  cbos?: { cbo: { code: string; occupation: string } }[];
}

const ProcedureCatalog: React.FC<ProcedureCatalogProps> = ({ onCancel, onSave }) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [selectedCbos, setSelectedCbos] = useState<{ id: string; code: string; occupation: string }[]>([]);
  const [cboSearchTerm, setCboSearchTerm] = useState('');
  const [cboSuggestions, setCboSuggestions] = useState<{ id: string; code: string; occupation: string }[]>([]);
  const [cboSearchTimer, setCboSearchTimer] = useState<any>(null);

  const [categorySuggestions, setCategorySuggestions] = useState<string[]>([]);
  const [catSearchTimer, setCatSearchTimer] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [procedures, setProcedures] = useState<ProcedureItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchCategory, setSearchCategory] = useState('');
  const [termSuggestions, setTermSuggestions] = useState<string[]>([]);
  const [categoryFilterSuggestions, setCategoryFilterSuggestions] = useState<string[]>([]);
  const [termTimer, setTermTimer] = useState<any>(null);
  const [catTimer, setCatTimer] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchProcedures = useCallback(async () => {
    setFetching(true);
    let query = supabase
      .from('procedures_catalog')
      .select(`
        *,
        cbos:procedure_cbos (
          cbo:cbos (
            code,
            occupation
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (searchTerm) query = query.or(`code.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`);
    if (searchCategory) query = query.ilike('category', `%${searchCategory}%`);

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar procedimentos:', error.message);
    } else {
      setProcedures(data || []);
    }
    setFetching(false);
  }, [searchTerm, searchCategory]);

  useEffect(() => {
    fetchProcedures();
  }, [fetchProcedures]);

  const searchCbos = async (term: string) => {
    if (!term || term.length < 2) {
      setCboSuggestions([]);
      return;
    }

    const { data, error } = await supabase
      .rpc('search_cbos', { search_term: term })
      .limit(10);

    if (error) {
      console.error('Erro ao buscar CBOs:', error);
    } else {
      setCboSuggestions(data || []);
    }
  };

  const handleSave = async () => {
    if (!code || !name) return alert('Preencha todos os campos obrigatórios');
    
    setLoading(true);
    let procedureId = editingId;

    if (editingId) {
      const { error } = await supabase
        .from('procedures_catalog')
        .update({ code, name: formatTitleCase(name), category: formatTitleCase(category) })
        .eq('id', editingId);
      
      if (error) {
        alert('Erro ao atualizar: ' + error.message);
        setLoading(false);
        return;
      }
    } else {
      const { data, error } = await supabase
        .from('procedures_catalog')
        .insert([{ code, name: formatTitleCase(name), category: formatTitleCase(category) }])
        .select()
        .single();

      if (error) {
        alert('Erro ao salvar: ' + error.message);
        setLoading(false);
        return;
      }
      procedureId = data.id;
    }

    // Update CBOs
    if (procedureId) {
      // First delete existing links
      await supabase.from('procedure_cbos').delete().eq('procedure_id', procedureId);
      
      // Then insert new ones
      if (selectedCbos.length > 0) {
        const { error: cboError } = await supabase
          .from('procedure_cbos')
          .insert(selectedCbos.map(cbo => ({
            procedure_id: procedureId,
            cbo_id: cbo.id
          })));
        
        if (cboError) console.error('Erro ao vincular CBOs:', cboError);
      }
    }

    setLoading(false);
    setEditingId(null);
    setCode(''); setName(''); setCategory(''); setSelectedCbos([]);
    fetchProcedures();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este procedimento?')) return;

    const { error } = await supabase
      .from('procedures_catalog')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Erro ao excluir: ' + error.message);
    } else {
      fetchProcedures();
    }
  };

  const handleEdit = (item: ProcedureItem) => {
    setEditingId(item.id);
    setCode(item.code);
    setName(item.name);
    setCategory(item.category || '');
    // Map loaded CBOs to selection format
    const cbos = item.cbos?.map((pc: any) => ({
      id: pc.cbo.id, // Assuming join returns this structure, might need adjustment based on real response
      code: pc.cbo.code,
      occupation: pc.cbo.occupation
    })) || [];
    setSelectedCbos(cbos);
    
    setCategorySuggestions([]);
    setShowForm(true);
    
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelForm = () => {
    setEditingId(null);
    setCode('');
    setName('');
    setCategory('');
    setSelectedCbos([]);
    setShowForm(false);
  };

  const searchCategorySuggestions = async (term: string) => {
    const v = term.trim();
    if (!v) { setCategorySuggestions([]); return; }
    const first = v[0];
    const { data, error } = await supabase
      .from('procedures_catalog')
      .select('category')
      .ilike('category', `${first}%`)
      .not('category', 'is', null)
      .limit(10);
    if (error) {
      console.error('Erro ao buscar categorias:', error.message);
      setCategorySuggestions([]);
      return;
    }
    const unique = Array.from(new Set((data || []).map((d: any) => d.category))).filter(Boolean);
    setCategorySuggestions(unique);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24 space-y-8 animate-fade-in">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
            <span className="material-symbols-outlined">list_alt</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Catálogo de Procedimentos</h1>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">Gestão SIGTAP / LRPD</p>
          </div>
        </div>
      </div>

      {!showForm && !editingId && (
        <div className="flex justify-end animate-fade-in">
          <button
            onClick={() => setShowForm(true)}
            className="w-full md:w-auto h-12 px-6 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/30 hover:bg-primary-dark transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">add</span>
            Novo Cadastro
          </button>
        </div>
      )}

      {/* Formulário de Cadastro */}
      {(showForm || editingId) && (
        <div className="bg-white dark:bg-surface-dark rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 space-y-6 animate-slide-up">
          <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">add_circle</span>
            {editingId ? 'Editar Procedimento' : 'Novo Cadastro'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-4 flex flex-col gap-2 group">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Código</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Ex: 03.07.01..." 
                  className="w-full h-12 bg-slate-50 dark:bg-background-dark/30 border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-primary focus:ring-0 rounded-t-lg px-4 pr-12 text-slate-900 dark:text-white transition-all text-sm font-mono"
                />
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-primary/70 text-[20px]">qr_code</span>
              </div>
            </div>

            <div className="md:col-span-6 flex flex-col gap-2 group">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Nome do Procedimento</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Prótese Total Maxilar" 
                  className="w-full h-12 bg-slate-50 dark:bg-background-dark/30 border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-primary focus:ring-0 rounded-t-lg px-4 pr-12 text-slate-900 dark:text-white transition-all text-sm font-medium"
                />
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-primary/70 text-[20px]">edit_note</span>
              </div>
            </div>

            <div className="md:col-span-4 flex flex-col gap-2 group">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Categoria</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    if (catSearchTimer) clearTimeout(catSearchTimer);
                    const t = setTimeout(() => searchCategorySuggestions(e.target.value), 200);
                    setCatSearchTimer(t);
                  }}
                  placeholder="Ex: Odontologia, Clínica, Laboratório" 
                  className="w-full h-12 bg-slate-50 dark:bg-background-dark/30 border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-primary focus:ring-0 rounded-t-lg px-4 pr-12 text-slate-900 dark:text-white transition-all text-sm font-medium"
                  autoComplete="off"
                />
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-primary/70 text-[20px]">category</span>
                {categorySuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-20 max-h-56 overflow-y-auto">
                    {categorySuggestions.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => { setCategory(cat); setCategorySuggestions([]); }}
                        className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm"
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="md:col-span-12 flex flex-col gap-2 group">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Profissionais Competentes (CBOs)</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={cboSearchTerm}
                  onChange={(e) => {
                    setCboSearchTerm(e.target.value);
                    if (cboSearchTimer) clearTimeout(cboSearchTimer);
                    const t = setTimeout(() => searchCbos(e.target.value), 300);
                    setCboSearchTimer(t);
                  }}
                  placeholder="Buscar CBO por código ou ocupação..." 
                  className="w-full h-12 bg-slate-50 dark:bg-background-dark/30 border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-primary focus:ring-0 rounded-t-lg px-4 pr-12 text-slate-900 dark:text-white transition-all text-sm font-medium"
                />
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-primary/70 text-[20px]">work</span>
                
                {cboSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-20 max-h-56 overflow-y-auto">
                    {cboSuggestions.map((cbo) => (
                      <button
                        key={cbo.id}
                        onClick={() => {
                          if (!selectedCbos.some(sc => sc.id === cbo.id)) {
                            setSelectedCbos([...selectedCbos, cbo]);
                          }
                          setCboSearchTerm('');
                          setCboSuggestions([]);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm border-b border-slate-100 dark:border-slate-700 last:border-0"
                      >
                        <span className="font-mono font-bold text-primary mr-2">{cbo.code}</span>
                        <span className="text-slate-700 dark:text-slate-300">{cbo.occupation}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedCbos.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedCbos.map((cbo) => (
                    <div key={cbo.id} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                      <span className="font-mono font-bold text-xs text-primary">{cbo.code}</span>
                      <span className="text-xs text-slate-600 dark:text-slate-400 max-w-[200px] truncate">{cbo.occupation}</span>
                      <button 
                        onClick={() => setSelectedCbos(selectedCbos.filter(sc => sc.id !== cbo.id))}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="md:col-span-12 flex items-end gap-2 justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
              <button 
                onClick={handleCancelForm}
                className="w-12 h-12 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold transition-all flex items-center justify-center flex-shrink-0"
                title="Cancelar"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
              <button 
                onClick={handleSave}
                disabled={loading}
                className="w-full h-12 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/30 hover:bg-primary-dark transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading ? (
                  <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined">add</span>
                )}
                <span className="md:hidden lg:inline">{editingId ? 'Salvar' : 'Adicionar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filtros (acima da lista) */}
      <div className="bg-white dark:bg-surface-dark rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
        <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">filter_alt</span>
          Filtros de Busca
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={async (e) => {
                const v = e.target.value;
                setSearchTerm(v);
                if (termTimer) clearTimeout(termTimer);
                const t = setTimeout(async () => {
                  const q = v.trim();
                  if (!q) { setTermSuggestions([]); return; }
                  const like = `%${q}%`;
                  const { data, error } = await supabase
                    .from('procedures_catalog')
                    .select('code,name')
                    .or(`code.ilike.${like},name.ilike.${like}`)
                    .limit(20);
                  if (error) { setTermSuggestions([]); return; }
                  const codes = Array.from(new Set((data || []).map((d: any) => d.code).filter(Boolean)));
                  const names = Array.from(new Set((data || []).map((d: any) => d.name).filter(Boolean)));
                  setTermSuggestions(Array.from(new Set([...codes, ...names])));
                }, 200);
                setTermTimer(t);
              }}
              placeholder="Buscar por nome ou código"
              className="w-full h-11 bg-slate-50 dark:bg-background-dark/30 border border-slate-200 dark:border-slate-700 rounded-lg px-3 text-sm"
              autoComplete="off"
            />
            {termSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-20 max-h-56 overflow-y-auto">
                {termSuggestions.map((s) => (
                  <button key={s} onClick={() => { setSearchTerm(s); setTermSuggestions([]); }} className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm">
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <input
              type="text"
              value={searchCategory}
              onChange={(e) => {
                const v = e.target.value;
                setSearchCategory(v);
                if (catTimer) clearTimeout(catTimer);
                const t = setTimeout(async () => {
                  const q = v.trim();
                  if (!q) { setCategoryFilterSuggestions([]); return; }
                  const like = `${q[0]}%`;
                  const { data, error } = await supabase
                    .from('procedures_catalog')
                    .select('category')
                    .ilike('category', like)
                    .not('category', 'is', null)
                    .limit(20);
                  if (error) { setCategoryFilterSuggestions([]); return; }
                  const unique = Array.from(new Set((data || []).map((d: any) => d.category))).filter(Boolean);
                  setCategoryFilterSuggestions(unique);
                }, 200);
                setCatTimer(t);
              }}
              placeholder="Filtrar por categoria"
              className="w-full h-11 bg-slate-50 dark:bg-background-dark/30 border border-slate-200 dark:border-slate-700 rounded-lg px-3 text-sm"
              autoComplete="off"
            />
            {categoryFilterSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-20 max-h-56 overflow-y-auto">
                {categoryFilterSuggestions.map((s) => (
                  <button key={s} onClick={() => { setSearchCategory(s); setCategoryFilterSuggestions([]); }} className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover.bg-slate-700 text-sm">
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end">
          <button onClick={fetchProcedures} className="h-11 px-4 rounded-lg bg-primary text-white font-bold hover:bg-primary-dark">Aplicar Filtros</button>
        </div>
      </div>

      {/* Lista de Procedimentos */}
      <div className="space-y-4">
        <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1">
          <span className="material-symbols-outlined text-sm">inventory</span>
          Itens Cadastrados ({procedures.length})
        </h3>

        <div className="bg-white dark:bg-surface-dark rounded-3xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800">
          {/* Header - Desktop Only */}
          <div className="hidden md:grid grid-cols-[120px_2fr_1fr_1fr_100px] gap-4 px-6 py-4 bg-slate-50 dark:bg-background-dark/50 border-b border-slate-100 dark:border-slate-800">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Código</div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do Procedimento</div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria</div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CBOs</div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {fetching ? (
              <div className="px-6 py-12 text-center">
                <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
                <p className="mt-2 text-sm text-slate-500">Carregando catálogo...</p>
              </div>
            ) : procedures.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <span className="material-symbols-outlined text-slate-300 text-4xl mb-2">find_in_page</span>
                <p className="text-sm text-slate-500 font-medium">Nenhum procedimento encontrado.</p>
              </div>
            ) : (
              procedures.map((proc) => (
                <div key={proc.id} className="group flex flex-col md:grid md:grid-cols-[120px_2fr_1fr_1fr_100px] gap-3 md:gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  
                  {/* Linha 1 Mobile: Código e Nome */}
                  <div className="flex flex-col md:contents">
                    <div className="flex items-center justify-between md:block mb-2 md:mb-0">
                       <span className="md:hidden text-[10px] font-black text-slate-400 uppercase tracking-widest">Código</span>
                       <span className="text-sm font-mono font-bold text-primary bg-primary/5 px-2 py-1 rounded-md inline-block">{proc.code}</span>
                    </div>
                    
                    <div className="md:col-span-1">
                       <span className="text-sm font-medium text-slate-700 dark:text-slate-200 block mb-2 md:mb-0">{proc.name}</span>
                       {/* Categoria visível logo abaixo do nome no mobile */}
                       <div className="md:hidden flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
                          <span className="material-symbols-outlined text-[14px]">category</span>
                          {proc.category || 'Sem categoria'}
                       </div>
                    </div>
                  </div>

                  {/* Coluna Categoria (Desktop) */}
                  <div className="hidden md:flex items-center">
                    <span className="text-xs text-slate-500 dark:text-slate-400">{proc.category || '-'}</span>
                  </div>

                  {/* CBOs */}
                  <div className="flex flex-col md:justify-center">
                    <span className="md:hidden text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">CBOs Competentes</span>
                    <div className="flex flex-wrap gap-1">
                      {proc.cbos && proc.cbos.length > 0 ? (
                        proc.cbos.map((pc: any, idx) => (
                          <span key={idx} className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700" title={pc.cbo.occupation}>
                            {pc.cbo.code}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Sem CBOs</span>
                      )}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center justify-end gap-2 mt-2 md:mt-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800">
                    <button 
                      onClick={() => handleEdit(proc)}
                      className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                      title="Editar"
                    >
                      <span className="material-symbols-outlined text-[20px]">edit</span>
                    </button>
                    <button 
                      onClick={() => handleDelete(proc.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                      title="Excluir"
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Botão Voltar (Apenas visual, já que o salvar está na mesma tela) */}
      <div className="flex justify-start">
        <button 
          onClick={onCancel}
          className="px-6 h-12 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold bg-white dark:bg-surface-dark hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95"
        >
          Voltar ao Dashboard
        </button>
      </div>
    </div>
  );
};

export default ProcedureCatalog;
