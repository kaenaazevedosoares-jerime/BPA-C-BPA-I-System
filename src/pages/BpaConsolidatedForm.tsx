
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import BpaConsolidatedCard from '../components/BpaConsolidatedCard';

interface BpaConsolidatedFormProps {
  onCancel: () => void;
  onSave: () => void;
}

interface ProductionEntry {
  id: string;
  procedure: string;
  cbo: string;
  quantity: number;
}

const BpaConsolidatedForm: React.FC<BpaConsolidatedFormProps> = ({ onCancel, onSave }) => {
  const [cnesValue, setCnesValue] = useState('');
  const [cnesName, setCnesName] = useState('');
  const [cnesSuggestions, setCnesSuggestions] = useState<Array<{ id: string; cnes: string; name: string }>>([]);
  const [month, setMonth] = useState('Março / 2024');
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<ProductionEntry[]>([
    { id: '1', procedure: '', cbo: '', quantity: 1 }
  ]);
  const [procedureSug, setProcedureSug] = useState<Record<string, Array<{ code: string; name: string }>>>({});
  const [cboSug, setCboSug] = useState<Record<string, Array<{ code: string; occupation: string }>>>({});
  const [procedureNames, setProcedureNames] = useState<Record<string, string>>({});
  const [cboNames, setCboNames] = useState<Record<string, string>>({});
  const [bpaList, setBpaList] = useState<Array<{ header: any; items: any[]; establishmentName?: string }>>([]);
  const [listLoading, setListLoading] = useState(false);
  const [editingBpaId, setEditingBpaId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Filter states
  const [filterTerm, setFilterTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  const uniqueMonths = useMemo(() => {
    const months = new Set(bpaList.map(item => item.header.reference_month));
    return Array.from(months).sort();
  }, [bpaList]);

  const filteredList = useMemo(() => {
    return bpaList.filter(item => {
      const matchesTerm = filterTerm === '' || 
        item.header.cnes.toLowerCase().includes(filterTerm.toLowerCase()) ||
        (item.establishmentName && item.establishmentName.toLowerCase().includes(filterTerm.toLowerCase()));
      
      const matchesMonth = filterMonth === '' || item.header.reference_month === filterMonth;

      return matchesTerm && matchesMonth;
    });
  }, [bpaList, filterTerm, filterMonth]);

  const addEntry = () => {
    setEntries([...entries, { id: Math.random().toString(36).substr(2, 9), procedure: '', cbo: '', quantity: 1 }]);
  };

  const removeEntry = (id: string) => {
    if (entries.length > 1) {
      setEntries(entries.filter(e => e.id !== id));
    }
  };

  const updateEntry = (id: string, field: keyof ProductionEntry, value: any) => {
    setEntries(entries.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const fetchBpaList = async () => {
    setListLoading(true);
    const { data: headers } = await supabase.from('bpa_consolidated').select('*').order('created_at', { ascending: false });
    const list: Array<{ header: any; items: any[]; establishmentName?: string }> = [];
    if (headers && headers.length) {
      const cnesSet = Array.from(new Set(headers.map((h: any) => h.cnes).filter(Boolean)));
      let estabMap: Record<string, string> = {};
      if (cnesSet.length) {
        const { data: estabs } = await supabase.from('establishments').select('cnes,name').in('cnes', cnesSet);
        (estabs || []).forEach((e: any) => { estabMap[e.cnes] = e.name; });
      }
      for (const h of headers) {
        const { data: items } = await supabase.from('bpa_consolidated_items').select('*').eq('bpa_id', h.id);
        list.push({ header: h, items: items || [], establishmentName: estabMap[h.cnes] });
      }
    }
    setBpaList(list);
    setListLoading(false);
  };

  useEffect(() => { fetchBpaList(); }, []);

  const searchCnes = async (term: string) => {
    if (!term) { setCnesSuggestions([]); return; }
    try {
      const { data, error } = await supabase
        .rpc('search_establishments', { search_term: term })
        .limit(10);
      if (error) throw error;
      setCnesSuggestions(data || []);
    } catch (error) {
      console.warn('RPC Search failed, fallback to standard query');
      const like = `%${term}%`;
      const { data } = await supabase
        .from('establishments')
        .select('id,cnes,name')
        .or(`name.ilike.${like},cnes.ilike.${like}`)
        .limit(10);
      setCnesSuggestions(data || []);
    }
  };

  const searchProcedure = async (id: string, term: string) => {
    if (!term) { setProcedureSug(prev => ({ ...prev, [id]: [] })); return; }
    try {
      const { data, error } = await supabase
        .rpc('search_procedures', { search_term: term })
        .limit(10);
      if (error) throw error;
      setProcedureSug(prev => ({ ...prev, [id]: data || [] }));
    } catch (error) {
      console.warn('RPC Search failed, fallback to standard query');
      const like = `%${term}%`;
      const { data } = await supabase
        .from('procedures_catalog')
        .select('code,name')
        .or(`name.ilike.${like},code.ilike.${like}`)
        .limit(10);
      setProcedureSug(prev => ({ ...prev, [id]: data || [] }));
    }
  };

  const searchCbo = async (id: string, term: string) => {
    if (!term) { setCboSug(prev => ({ ...prev, [id]: [] })); return; }
    try {
      const { data, error } = await supabase
        .rpc('search_cbos', { search_term: term })
        .limit(10);
      if (error) throw error;
      setCboSug(prev => ({ ...prev, [id]: data || [] }));
    } catch (error) {
      console.warn('RPC Search failed, fallback to standard query');
      const like = `%${term}%`;
      const { data } = await supabase
        .from('cbos')
        .select('code,occupation')
        .or(`occupation.ilike.${like},code.ilike.${like}`)
        .limit(10);
      setCboSug(prev => ({ ...prev, [id]: data || [] }));
    }
  };

  const handleSave = async () => {
    if (!cnesValue) return alert('Informe o CNES');
    setLoading(true);

    const totalQty = entries.reduce((sum, e) => sum + Number(e.quantity || 0), 0);

    if (editingBpaId) {
      const { error: updErr } = await supabase
        .from('bpa_consolidated')
        .update({ cnes: cnesValue, reference_month: month, total_quantity: totalQty })
        .eq('id', editingBpaId);
      if (updErr) {
        alert('Erro ao atualizar BPA-C: ' + updErr.message);
        setLoading(false);
        return;
      }
      await supabase.from('bpa_consolidated_items').delete().eq('bpa_id', editingBpaId);
      const itemsToInsert = entries.map(e => ({
        bpa_id: editingBpaId,
        procedure_info: e.procedure,
        cbo_info: e.cbo,
        quantity: e.quantity
      }));
      const { error: insErr } = await supabase.from('bpa_consolidated_items').insert(itemsToInsert);
      setLoading(false);
      if (insErr) {
        alert('Erro ao salvar itens do BPA: ' + insErr.message);
      } else {
        setEditingBpaId(null);
        setShowForm(false);
        onSave();
        await fetchBpaList();
      }
    } else {
      const { data: bpaData, error: bpaError } = await supabase
        .from('bpa_consolidated')
        .insert([{ cnes: cnesValue, reference_month: month, total_quantity: totalQty }])
        .select()
        .single();
      if (bpaError) {
        alert('Erro ao criar BPA: ' + bpaError.message);
        setLoading(false);
        return;
      }
      const itemsToInsert = entries.map(e => ({
        bpa_id: bpaData.id,
        procedure_info: e.procedure,
        cbo_info: e.cbo,
        quantity: e.quantity
      }));
      const { error: itemsError } = await supabase.from('bpa_consolidated_items').insert(itemsToInsert);
      setLoading(false);
      if (itemsError) {
        alert('Erro ao salvar itens do BPA: ' + itemsError.message);
      } else {
        setShowForm(false);
        onSave();
        await fetchBpaList();
      }
    }
  };

  const totalProduction = entries.reduce((sum, e) => sum + Number(e.quantity || 0), 0);

  return (
    <div className="max-w-4xl mx-auto p-4 pb-32 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-1 bg-gradient-to-b from-accent-purple to-transparent rounded-full"></div>
          <h2 className="text-xl font-bold tracking-wide text-slate-800 dark:text-white uppercase">BPA-C Consolidado</h2>
        </div>
        <button
          onClick={() => {
            const monthsPT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
            const now = new Date();
            setEditingBpaId(null);
            setCnesValue('');
            setCnesName('');
            setEntries([{ id: '1', procedure: '', cbo: '', quantity: 1 }]);
            setProcedureNames({});
            setCboNames({});
            setMonth(`${monthsPT[now.getMonth()]} / ${now.getFullYear()}`);
            setShowForm(true);
          }}
          className="text-[12px] font-extrabold text-white uppercase bg-accent-purple px-4 py-2 rounded-xl shadow hover:bg-purple-700 flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          Novo BPA-C
        </button>
      </div>

      {showForm && (
      <div className="bg-surface-light dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-8 w-1 bg-gradient-to-b from-accent-purple to-transparent rounded-full"></div>
          <div>
            <h2 className="text-xl font-bold tracking-wide text-slate-800 dark:text-white uppercase">Novo BPA-C Consolidado</h2>
            <p className="text-xs text-slate-500 font-medium">Lançamento de produção mensal agregada</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="group">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-widest">CNES</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-[20px]">fingerprint</span>
              <input 
                type="text"
                value={cnesValue}
                onChange={(e) => { setCnesValue(e.target.value); searchCnes(e.target.value); setCnesName(''); }}
                placeholder="Insira o CNES ou Nome"
                className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl py-3.5 pl-12 pr-4 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm font-mono" 
              />
              {cnesSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-20 max-h-56 overflow-y-auto">
                  {cnesSuggestions.map(s => (
                    <button key={s.id} onClick={() => { setCnesValue(s.cnes); setCnesName(s.name); setCnesSuggestions([]); }} className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700">
                      <span className="font-mono text-slate-700 dark:text-slate-200">{s.cnes}</span>
                      <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">{s.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {cnesName && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400"><span className="font-semibold">{cnesName}</span></p>
            )}
          </div>
          <div className="group md:col-span-1 lg:col-span-1">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-widest">Mês de Referência</label>
            {(() => {
              const monthsPT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
              const getRecentMonths = (count = 5) => {
                const now = new Date();
                const res: string[] = [];
                for (let i = count - 1; i >= 0; i--) {
                  const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                  res.push(`${monthsPT[d.getMonth()]} / ${d.getFullYear()}`);
                }
                return res;
              };
              const options = getRecentMonths(5);
              if (!options.includes(month)) options.unshift(month);
              return (
                <select 
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl py-3.5 px-4 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
                >
                  {options.map((opt) => (
                    <option key={opt}>{opt}</option>
                  ))}
                </select>
              );
            })()}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-widest">Procedimentos Produzidos</h3>
            <button onClick={addEntry} className="text-[10px] font-extrabold text-primary uppercase bg-primary/10 px-4 py-2 rounded-xl border border-primary/20 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">add</span>
              Adicionar Lançamento
            </button>
          </div>
          
          <div className="space-y-3">
            {entries.map((entry) => (
              <div key={entry.id} className="group relative grid grid-cols-1 lg:grid-cols-12 gap-4 p-5 bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-2xl animate-fade-in">
                <div className="lg:col-span-5 space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Procedimento (Nome ou Código)</label>
                  <div className="relative">
                    <input 
                      type="text"
                      className="w-full bg-slate-50 dark:bg-background-dark/50 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 text-sm focus:border-primary focus:ring-1 focus:ring-primary text-slate-900 dark:text-white"
                      value={entry.procedure}
                      onChange={(e) => { updateEntry(entry.id, 'procedure', e.target.value); searchProcedure(entry.id, e.target.value); }}
                    />
                    {procedureSug[entry.id]?.length ? (
                      <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-20 max-h-56 overflow-y-auto">
                        {procedureSug[entry.id].map(s => (
                          <button key={s.code} onClick={() => { updateEntry(entry.id, 'procedure', s.code); setProcedureSug(prev => ({ ...prev, [entry.id]: [] })); setProcedureNames(prev => ({ ...prev, [entry.id]: s.name })); }} className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700">
                            <span className="font-mono text-slate-700 dark:text-slate-200">{s.code}</span>
                            <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">{s.name}</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  {procedureNames[entry.id] && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400"><span className="font-semibold">{procedureNames[entry.id]}</span></p>
                  )}
                </div>
                <div className="lg:col-span-4 space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CBO (Nome ou Código)</label>
                  <div className="relative">
                    <input 
                      type="text"
                      className="w-full bg-slate-50 dark:bg-background-dark/50 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 text-sm focus:border-primary focus:ring-1 focus:ring-primary text-slate-900 dark:text-white"
                      value={entry.cbo}
                      onChange={(e) => { updateEntry(entry.id, 'cbo', e.target.value); searchCbo(entry.id, e.target.value); }}
                    />
                    {cboSug[entry.id]?.length ? (
                      <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-20 max-h-56 overflow-y-auto">
                        {cboSug[entry.id].map(s => (
                          <button key={s.code} onClick={() => { updateEntry(entry.id, 'cbo', s.code); setCboSug(prev => ({ ...prev, [entry.id]: [] })); setCboNames(prev => ({ ...prev, [entry.id]: s.occupation })); }} className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700">
                            <span className="font-mono text-slate-700 dark:text-slate-200">{s.code}</span>
                            <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">{s.occupation}</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  {cboNames[entry.id] && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400"><span className="font-semibold">{cboNames[entry.id]}</span></p>
                  )}
                </div>
                <div className="lg:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Quantidade</label>
                  <input 
                    type="number" 
                    className="w-full bg-slate-50 dark:bg-background-dark/50 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 text-sm font-bold text-slate-900 dark:text-white" 
                    value={entry.quantity}
                    onChange={(e) => updateEntry(entry.id, 'quantity', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="lg:col-span-1 flex items-end justify-center">
                  <button onClick={() => removeEntry(entry.id)} className="p-2 text-slate-300 hover:text-red-500"><span className="material-symbols-outlined">delete</span></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 bg-primary/5 dark:bg-primary/10 rounded-2xl border border-dashed border-primary/30 flex justify-between items-center">
          <span className="text-sm font-bold text-slate-500 uppercase">Total de Produção</span>
          <span className="text-3xl font-black text-primary">{totalProduction}</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <button onClick={() => { setShowForm(false); setEditingBpaId(null); }} disabled={loading} className="h-12 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold bg-white dark:bg-surface-dark disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={loading} className="h-12 px-6 rounded-xl bg-accent-purple text-white font-bold shadow-lg hover:bg-purple-700 flex items-center justify-center gap-2 disabled:opacity-70">
            {loading ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : <><span className="material-symbols-outlined">send</span>Enviar BPA-C</>}
          </button>
        </div>
      </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">BPA-C Enviados</h3>
          <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
            {filteredList.length} registros encontrados
          </span>
        </div>

        {/* Smart Filter */}
        <div className="bg-white dark:bg-surface-dark p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 animate-fade-in">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-[20px]">search</span>
            <input 
              type="text"
              placeholder="Filtrar por CNES ou Nome do Estabelecimento..."
              value={filterTerm}
              onChange={(e) => setFilterTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-background-dark/50 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-all text-slate-700 dark:text-slate-200"
            />
          </div>
          <div className="w-full md:w-48 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-[20px]">calendar_month</span>
            <select 
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full bg-slate-50 dark:bg-background-dark/50 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-8 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-all text-slate-700 dark:text-slate-200 appearance-none"
            >
              <option value="">Todos os meses</option>
              {uniqueMonths.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-[20px] pointer-events-none">expand_more</span>
          </div>
          {(filterTerm || filterMonth) && (
            <button 
              onClick={() => { setFilterTerm(''); setFilterMonth(''); }}
              className="px-4 py-2.5 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors text-sm font-bold flex items-center gap-2 justify-center"
            >
              <span className="material-symbols-outlined text-[18px]">filter_alt_off</span>
              Limpar
            </button>
          )}
        </div>

        {listLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredList.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 dark:bg-surface-dark/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">filter_list_off</span>
                <p className="text-slate-500 font-medium">Nenhum registro encontrado com os filtros atuais.</p>
              </div>
            ) : (
              filteredList.map(({ header, items, establishmentName }) => (
                <BpaConsolidatedCard
                  key={header.id}
                  header={header}
                  items={items}
                  establishmentName={establishmentName}
                onEdit={async (id) => {
                  const { data: h } = await supabase.from('bpa_consolidated').select('*').eq('id', id).single();
                  const { data: it } = await supabase.from('bpa_consolidated_items').select('*').eq('bpa_id', id);
                  if (h) {
                    setEditingBpaId(id);
                    setCnesValue(h.cnes);
                    setMonth(h.reference_month);
                    const newEntries = (it || []).map((i: any) => ({ id: i.id, procedure: i.procedure_info, cbo: i.cbo_info, quantity: i.quantity }));
                    setEntries(newEntries);
                    const { data: estab } = await supabase.from('establishments').select('name').eq('cnes', h.cnes).single();
                    setCnesName(estab?.name || '');
                    const procCodes = newEntries.map(e => e.procedure).filter(Boolean);
                    const cboCodes = newEntries.map(e => e.cbo).filter(Boolean);
                    const procMap: Record<string, string> = {};
                    const cboMap: Record<string, string> = {};
                    if (procCodes.length) {
                      const { data: procs } = await supabase.from('procedures_catalog').select('code,name').in('code', procCodes);
                      (procs || []).forEach(p => { procMap[p.code] = p.name; });
                    }
                    if (cboCodes.length) {
                      const { data: cbos } = await supabase.from('cbos').select('code,occupation').in('code', cboCodes);
                      (cbos || []).forEach(c => { cboMap[c.code] = c.occupation; });
                    }
                    const procNamesObj: Record<string, string> = {};
                    const cboNamesObj: Record<string, string> = {};
                    newEntries.forEach(e => {
                      if (e.procedure && procMap[e.procedure]) procNamesObj[e.id] = procMap[e.procedure];
                      if (e.cbo && cboMap[e.cbo]) cboNamesObj[e.id] = cboMap[e.cbo];
                    });
                    setProcedureNames(procNamesObj);
                    setCboNames(cboNamesObj);
                    setShowForm(true);
                  }
                }}
                onDelete={async (id) => {
                  await supabase.from('bpa_consolidated').delete().eq('id', id);
                  await fetchBpaList();
                }}
                onReplicate={async (id) => {
                  const { data: h } = await supabase.from('bpa_consolidated').select('*').eq('id', id).single();
                  const { data: it } = await supabase.from('bpa_consolidated_items').select('*').eq('bpa_id', id);
                  if (!h) return;
                  const { data: newHeader, error } = await supabase
                    .from('bpa_consolidated')
                    .insert([{ cnes: h.cnes, reference_month: h.reference_month, total_quantity: h.total_quantity }])
                    .select()
                    .single();
                  if (error) { alert('Erro ao replicar BPA-C: ' + error.message); return; }
                  if (it && it.length) {
                    const toInsert = it.map((i: any) => ({ bpa_id: newHeader.id, procedure_info: i.procedure_info, cbo_info: i.cbo_info, quantity: i.quantity }));
                    await supabase.from('bpa_consolidated_items').insert(toInsert);
                  }
                  setEditingBpaId(newHeader.id);
                  setCnesValue(newHeader.cnes);
                  setMonth(newHeader.reference_month);
                  const newEntries = (it || []).map((i: any) => ({ id: Math.random().toString(36).substr(2, 9), procedure: i.procedure_info, cbo: i.cbo_info, quantity: i.quantity }));
                  setEntries(newEntries);
                  const { data: estab } = await supabase.from('establishments').select('name').eq('cnes', newHeader.cnes).single();
                  setCnesName(estab?.name || '');
                  const procCodes = newEntries.map(e => e.procedure).filter(Boolean);
                  const cboCodes = newEntries.map(e => e.cbo).filter(Boolean);
                  const procMap: Record<string, string> = {};
                  const cboMap: Record<string, string> = {};
                  if (procCodes.length) {
                    const { data: procs } = await supabase.from('procedures_catalog').select('code,name').in('code', procCodes);
                    (procs || []).forEach(p => { procMap[p.code] = p.name; });
                  }
                  if (cboCodes.length) {
                    const { data: cbos } = await supabase.from('cbos').select('code,occupation').in('code', cboCodes);
                    (cbos || []).forEach(c => { cboMap[c.code] = c.occupation; });
                  }
                  const procNamesObj: Record<string, string> = {};
                  const cboNamesObj: Record<string, string> = {};
                  newEntries.forEach(e => {
                    if (e.procedure && procMap[e.procedure]) procNamesObj[e.id] = procMap[e.procedure];
                    if (e.cbo && cboMap[e.cbo]) cboNamesObj[e.id] = cboMap[e.cbo];
                  });
                  setProcedureNames(procNamesObj);
                  setCboNames(cboNamesObj);
                  setShowForm(true);
                  await fetchBpaList();
                }}
              />
            )))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BpaConsolidatedForm;
