import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface BpaProductionFormProps {
  onCancel: () => void;
  onSave: () => void;
}

const BpaProductionForm: React.FC<BpaProductionFormProps> = ({ onCancel, onSave }) => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authStep, setAuthStep] = useState<'search' | 'password'>('search');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedProfessional, setSelectedProfessional] = useState<any | null>(null);
  const [accessPassword, setAccessPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Production Form State
  const [loading, setLoading] = useState(false);
  const [competence, setCompetence] = useState('');
  const [availableCompetences, setAvailableCompetences] = useState<{ label: string; value: string }[]>([]);
  
  // Procedure Items
  const [items, setItems] = useState<Array<{
    procedure_code: string;
    procedure_name: string;
    cbo: string;
    quantity: number;
  }>>([]);

  // Current Item Input State
  const [currentProcedure, setCurrentProcedure] = useState('');
  const [procedureResults, setProcedureResults] = useState<any[]>([]);
  const [selectedProcedure, setSelectedProcedure] = useState<any | null>(null);
  const [quantity, setQuantity] = useState(1);

  // Initialize Competences
  useEffect(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const prevDate = new Date(currentYear, currentMonth - 1, 1);
    
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const options = [
      {
        label: `${months[prevDate.getMonth()]} / ${prevDate.getFullYear()}`,
        value: `${months[prevDate.getMonth()]} / ${prevDate.getFullYear()}`
      },
      {
        label: `${months[currentMonth]} / ${currentYear}`,
        value: `${months[currentMonth]} / ${currentYear}`
      }
    ];

    setAvailableCompetences(options);
    setCompetence(options[1].value); // Default to current month
  }, []);

  // Search Professionals
  useEffect(() => {
    const searchPros = async () => {
      if (searchTerm.length < 3) {
        setSearchResults([]);
        return;
      }

      const { data, error } = await supabase
        .from('profissionais')
        .select(`
          id, nome, sus, cbo, profissao, establishment_id, access_password,
          establishments ( id, cnes, name )
        `)
        .or(`nome.ilike.%${searchTerm}%,sus.ilike.%${searchTerm}%`)
        .limit(5);

      if (data) setSearchResults(data);
    };

    const debounce = setTimeout(searchPros, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm]);

  // Search Procedures
  useEffect(() => {
    const searchProcs = async () => {
      if (currentProcedure.length < 3) {
        setProcedureResults([]);
        return;
      }

      // If already selected, don't search
      if (selectedProcedure && (selectedProcedure.name === currentProcedure || selectedProcedure.code === currentProcedure)) {
        return;
      }

      // Use the search_procedures RPC function if available, otherwise direct query
      const { data } = await supabase
        .from('procedures_catalog')
        .select('*')
        .or(`name.ilike.%${currentProcedure}%,code.ilike.%${currentProcedure}%`)
        .limit(5);

      if (data) setProcedureResults(data);
    };

    const debounce = setTimeout(searchProcs, 300);
    return () => clearTimeout(debounce);
  }, [currentProcedure, selectedProcedure]);

  const handleAuth = () => {
    if (!selectedProfessional) return;

    if (selectedProfessional.access_password === accessPassword) {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Senha incorreta. Tente novamente.');
    }
  };

  const addItem = () => {
    if (!selectedProcedure) return;

    setItems(prev => [
      ...prev,
      {
        procedure_code: selectedProcedure.code,
        procedure_name: selectedProcedure.name,
        cbo: selectedProfessional.cbo || '000000', // Default if missing
        quantity: quantity
      }
    ]);

    // Reset item inputs
    setSelectedProcedure(null);
    setCurrentProcedure('');
    setQuantity(1);
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (items.length === 0) {
      alert('Adicione pelo menos um procedimento.');
      return;
    }

    if (!selectedProfessional.establishments?.cnes) {
      alert('Profissional não está vinculado a um estabelecimento com CNES válido.');
      return;
    }

    try {
      setLoading(true);

      const cnes = selectedProfessional.establishments.cnes;
      const refMonth = competence;

      // 1. Check/Create Header
      let { data: header, error: headerError } = await supabase
        .from('bpa_consolidated')
        .select('id, total_quantity, professional_id')
        .eq('cnes', cnes)
        .eq('reference_month', refMonth)
        .eq('professional_id', selectedProfessional.id) // Busca cabeçalho específico deste profissional
        .maybeSingle(); // Usa maybeSingle para evitar erro se não encontrar

      if (!header) {
        // Create new header specific for this professional
        const { data: newHeader, error: createError } = await supabase
          .from('bpa_consolidated')
          .insert([{
            cnes,
            reference_month: refMonth,
            total_quantity: 0,
            professional_id: selectedProfessional.id
          }])
          .select()
          .single();

        if (createError) throw createError;
        header = newHeader;
      }

      // 2. Process Items
      let totalAdded = 0;

      for (const item of items) {
        totalAdded += item.quantity;

        // Check if item exists
        const { data: existingItem, error: fetchError } = await supabase
          .from('bpa_consolidated_items')
          .select('id, quantity')
          .eq('bpa_id', header.id)
          .eq('procedure_info', item.procedure_code)
          .eq('cbo_info', item.cbo)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // Ignore not found error
             throw fetchError;
        }

        if (existingItem) {
          const { error: updateError } = await supabase
            .from('bpa_consolidated_items')
            .update({ quantity: existingItem.quantity + item.quantity })
            .eq('id', existingItem.id);
            
          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await supabase
            .from('bpa_consolidated_items')
            .insert([{
              bpa_id: header.id,
              procedure_info: item.procedure_code,
              cbo_info: item.cbo,
              quantity: item.quantity
            }]);
            
          if (insertError) throw insertError;
        }
      }

      // 3. Update Header Total
      await supabase
        .from('bpa_consolidated')
        .update({ total_quantity: (header.total_quantity || 0) + totalAdded })
        .eq('id', header.id);

      alert('Produção lançada com sucesso!');
      onSave(); // Redirect/Close

    } catch (error: any) {
      console.error('Erro ao salvar produção:', error);
      alert('Erro ao salvar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- RENDER ---

  if (!isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="bg-white dark:bg-surface-dark w-full max-w-md p-8 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 animate-fade-in">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl text-primary">fact_check</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Produção BPA-C</h2>
            <p className="text-slate-500 text-sm mt-2">Identifique-se para acessar o lançamento individual</p>
          </div>

          {authStep === 'search' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Buscar Profissional (Nome ou CNS)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">search</span>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Digite para buscar..."
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  />
                </div>
                {/* Results Dropdown */}
                {searchResults.length > 0 && (
                  <div className="mt-2 bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {searchResults.map(pro => (
                      <button
                        key={pro.id}
                        onClick={() => {
                          setSelectedProfessional(pro);
                          setAuthStep('password');
                          setSearchResults([]);
                          setSearchTerm('');
                        }}
                        className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0"
                      >
                        <p className="font-medium text-slate-800 dark:text-slate-200">{pro.nome}</p>
                        <p className="text-xs text-slate-500">CNS: {pro.sus}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl mb-4">
                <div className="flex-1">
                  <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">{selectedProfessional?.nome}</p>
                  <p className="text-xs text-slate-500">CNS: {selectedProfessional?.sus}</p>
                </div>
                <button 
                  onClick={() => {
                    setAuthStep('search');
                    setSelectedProfessional(null);
                    setAccessPassword('');
                    setAuthError('');
                  }}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Alterar
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Senha de Acesso
                </label>
                <input
                  type="password"
                  value={accessPassword}
                  onChange={(e) => {
                    setAccessPassword(e.target.value);
                    setAuthError('');
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                  placeholder="Digite sua senha de acesso"
                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                />
                {authError && <p className="text-red-500 text-sm mt-2">{authError}</p>}
              </div>

              <button
                onClick={handleAuth}
                className="w-full bg-primary hover:bg-primary-dark text-white font-medium py-3 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
              >
                Acessar Produção
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- AUTHENTICATED FORM ---

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in">
      {/* Header Info */}
      <div className="bg-white dark:bg-surface-dark p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-1">
              {selectedProfessional?.nome}
            </h2>
            <div className="flex flex-wrap gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px]">id_card</span>
                CNS: {selectedProfessional?.sus}
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px]">work</span>
                {selectedProfessional?.profissao}
              </span>
            </div>
          </div>
          <div className="text-right">
             <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <span className="material-symbols-outlined text-slate-500 text-[18px]">domain</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {selectedProfessional?.establishments?.name || 'Sem Vínculo'}
                </span>
             </div>
             {selectedProfessional?.establishments?.cnes && (
               <p className="text-xs text-slate-400 mt-1">CNES: {selectedProfessional.establishments.cnes}</p>
             )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Competence Selection */}
          <div className="bg-white dark:bg-surface-dark p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">
              Competência
            </h3>
            <select
              value={competence}
              onChange={(e) => setCompetence(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-primary outline-none"
            >
              {availableCompetences.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Procedure Entry */}
          <div className="bg-white dark:bg-surface-dark p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Procedimentos Produzidos
              </h3>
              <button 
                onClick={addItem}
                disabled={!selectedProcedure}
                className="bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                ADICIONAR LANÇAMENTO
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
              {/* Procedure Search */}
              <div className="md:col-span-6 relative">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Procedimento (Nome ou Código)</label>
                <input 
                  type="text"
                  value={currentProcedure}
                  onChange={(e) => {
                    setCurrentProcedure(e.target.value);
                    if (selectedProcedure) setSelectedProcedure(null);
                  }}
                  placeholder="Busque o procedimento..."
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none text-sm"
                />
                {/* Autocomplete Dropdown */}
                {procedureResults.length > 0 && !selectedProcedure && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                    {procedureResults.map(proc => (
                      <button
                        key={proc.id}
                        onClick={() => {
                          setSelectedProcedure(proc);
                          setCurrentProcedure(`${proc.code} - ${proc.name}`);
                          setProcedureResults([]);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-800 last:border-0"
                      >
                        <span className="font-mono font-bold text-primary mr-2">{proc.code}</span>
                        <span className="text-slate-700 dark:text-slate-300 truncate">{proc.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* CBO (Read-only) */}
              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">CBO (Vinculado)</label>
                <input 
                  type="text"
                  value={selectedProfessional?.cbo || ''}
                  readOnly
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed text-sm"
                />
              </div>

              {/* Quantity */}
              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Quantidade</label>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 flex items-center justify-center bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg transition-colors"
                  >
                    -
                  </button>
                  <input 
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full text-center px-2 py-1 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 font-bold"
                  />
                  <button 
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-8 h-8 flex items-center justify-center bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* List of Added Items */}
            <div className="space-y-4 mt-6">
              <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 dark:border-primary/30 rounded-xl overflow-hidden shadow-lg shadow-primary/5 animate-pulse" style={{ animationDuration: '3s' }}>
                {items.length > 0 ? (
                  <div className="divide-y divide-primary/10 dark:divide-primary/20">
                    {/* Header da Tabela */}
                    <div className="grid grid-cols-12 gap-4 p-3 bg-primary/10 dark:bg-primary/20 text-xs font-bold text-primary uppercase tracking-wider">
                      <div className="col-span-8">Procedimento</div>
                      <div className="col-span-2 text-center">CBO</div>
                      <div className="col-span-2 text-center">Qtd</div>
                    </div>

                    {/* Linhas */}
                    {items.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                        {/* Procedimento */}
                        <div className="col-span-8 pr-2">
                          <div className="font-mono font-bold text-primary text-sm mb-0.5">
                            {item.procedure_code}
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-400 font-medium line-clamp-2">
                            {item.procedure_name}
                          </div>
                        </div>

                        {/* CBO */}
                        <div className="col-span-2 flex items-center justify-center">
                          <span className="font-mono text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded">
                            {item.cbo}
                          </span>
                        </div>

                        {/* Quantidade & Ações */}
                        <div className="col-span-2 flex items-center justify-center gap-2 relative">
                          <span className="font-bold text-slate-800 dark:text-white text-base">
                            {item.quantity}
                          </span>
                          
                          <button 
                            onClick={() => removeItem(idx)}
                            className="absolute -right-2 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            title="Remover item"
                          >
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-slate-50/50 dark:bg-slate-800/20">
                    <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2">post_add</span>
                    <p className="text-slate-500 text-sm font-medium">Nenhum item na lista</p>
                    <p className="text-slate-400 text-xs mt-1">Preencha o formulário acima e clique em "Adicionar"</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Summary & Actions */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-surface-dark p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 sticky top-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Resumo do Lançamento</h3>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Competência</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">{competence}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Total Procedimento</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">{items.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Qtd. Total</span>
                <span className="font-bold text-primary text-lg">
                  {items.reduce((acc, curr) => acc + curr.quantity, 0)}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleSave}
                disabled={loading || items.length === 0}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-green-600/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? 'Salvando...' : 'CONFIRMAR E SALVAR'}
                {!loading && <span className="material-symbols-outlined">check</span>}
              </button>
              
              <button
                onClick={onCancel}
                disabled={loading}
                className="w-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BpaProductionForm;
