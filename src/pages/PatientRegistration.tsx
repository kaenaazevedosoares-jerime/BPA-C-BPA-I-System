import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { PatientImportModal } from '../components/PatientImportModal';
import { formatTitleCase } from '../utils/textUtils';

// Interface correspondente à tabela 'patients' no banco de dados
interface Patient {
  id: string;
  cns: string;
  name: string;
  birth_date: string;
  gender: string;
  nationality: string;
  race: string;
  ethnicity: string;
  zip_code: string;
  city: string;
  neighborhood: string;
  street_code: string;
  street_type: string;
  street: string;
  number: string;
  phone: string;
  email: string;
}

interface PatientRegistrationProps {
  onCancel: () => void;
  onSave: () => void;
  userRole?: string;
  initialCns?: string;
  initialName?: string;
}

const PatientRegistration: React.FC<PatientRegistrationProps> = ({ onCancel, onSave, userRole, initialCns, initialName }) => {
  const [loading, setLoading] = useState(false);
  const [fetchingPatients, setFetchingPatients] = useState(true);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(!!(initialCns || initialName)); // Open form if initial data provided
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [catalogs, setCatalogs] = useState<{
    neighborhoods: string[];
    streetTypes: { code: string; name: string }[];
    streets: { code: string; name: string }[];
    complements: string[];
    nationalities: string[];
    races: string[];
    ethnicities: string[];
    savedCeps: string[]; // Cache of saved CEPs to toggle button
  }>({
    neighborhoods: [],
    streetTypes: [],
    streets: [],
    nationalities: [],
    races: [],
    ethnicities: [],
    savedCeps: [],
    complements: []
  });

  const initialFormState = {
    cns: initialCns || '',
    name: initialName || '',
    birth_date: '',
    gender: 'Masculino',
    nationality: 'Brasileira',
    race: '',
    ethnicity: '',
    zip_code: '',
    city: '',
    state: '', // Mantido para UX (ViaCEP)
    neighborhood: '',
    street_code: '',
    street_type: '',
    street: '',
    number: '',
    complement: '', // Mantido para UX
    phone: '',
    email: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  // Carregar Catálogos
  const fetchCatalogs = useCallback(async () => {
    const [neighRes, typeRes, streetRes, compRes, natRes, raceRes, ethRes, cepRes] = await Promise.all([
      supabase.from('neighborhoods_catalog').select('name').order('name'),
      supabase.from('street_types_catalog').select('code, name').order('name'),
      supabase.from('streets_catalog').select('code, name').limit(10000).order('name'),
      supabase.from('complements_catalog').select('name').order('name'),
      supabase.from('nationalities_catalog').select('name').order('name'),
      supabase.from('races_catalog').select('name').order('name'),
      supabase.from('ethnicities_catalog').select('name').order('name'),
      supabase.from('zip_codes_catalog').select('cep')
    ]);

    setCatalogs({
      neighborhoods: neighRes.data?.map(n => n.name) || [],
      streetTypes: typeRes.data || [],
      streets: streetRes.data || [],
      complements: compRes.data?.map(c => c.name) || [],
      nationalities: natRes.data?.map(n => n.name) || [],
      races: raceRes.data?.map(n => n.name) || [],
      ethnicities: ethRes.data?.map(n => n.name) || [],
      savedCeps: cepRes.data?.map(c => c.cep) || []
    });
  }, []);

  // Carregar Pacientes
  const fetchPatients = useCallback(async () => {
    setFetchingPatients(true);
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      console.error('Erro ao buscar pacientes:', error.message);
    } else {
      setPatients(data || []);
    }
    setFetchingPatients(false);
  }, []);

  useEffect(() => {
    fetchCatalogs();
    fetchPatients();
  }, [fetchCatalogs, fetchPatients]);

  // Check for existing patient if initialCns is provided (Fix Notification Flow)
  useEffect(() => {
    const checkExistingPatient = async () => {
      if (!initialCns) return;

      const cleanCns = initialCns.replace(/\D/g, '');
      if (!cleanCns) return;

      try {
        const { data, error } = await supabase
          .from('patients')
          .select('*')
          .eq('cns', cleanCns)
          .maybeSingle();

        if (data) {
          setEditingId(data.id);
          setFormData(prev => ({
            ...prev,
            ...data,
            // Ensure fields match form state requirements
            birth_date: data.birth_date || '',
            gender: data.gender || 'Masculino',
            nationality: data.nationality || 'Brasileira',
            race: data.race || '',
            ethnicity: data.ethnicity || '',
            zip_code: data.zip_code || '',
            city: data.city || '',
            neighborhood: data.neighborhood || '',
            street_code: data.street_code || '',
            street_type: data.street_type || '',
            street: data.street || '',
            number: data.number || '',
            complement: data.complement || '',
            phone: data.phone || '',
            email: data.email || ''
          }));
        }
      } catch (err) {
        console.error("Error checking existing patient:", err);
      }
    };

    checkExistingPatient();
  }, [initialCns]);

  const handleChange = (field: string, value: string) => {
    let newValue = value;
    
    // Sync Logic for Street Code <-> Street Type
    if (field === 'street_code') {
      const found = catalogs.streetTypes.find(t => t.code === value);
      if (found) {
        setFormData(prev => ({ ...prev, street_code: value, street_type: found.name }));
        return;
      }
    } else if (field === 'street_type') {
      const found = catalogs.streetTypes.find(t => t.name.toLowerCase() === value.toLowerCase());
      if (found && found.code) {
        setFormData(prev => ({ ...prev, street_type: value, street_code: found.code }));
        return;
      }
    } else if (field === 'phone') {
      // Phone Mask (11 digits: (XX) XXXXX-XXXX)
      const digits = value.replace(/\D/g, '');
      if (digits.length <= 11) {
        newValue = digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        if (digits.length < 11 && digits.length > 2) {
           // Partial mask while typing
           newValue = digits.replace(/(\d{2})(\d{0,5})/, '($1) $2');
        }
      } else {
        return; // Block more than 11 digits
      }
    } else if (field === 'cns') {
      // Allow only numbers
      newValue = newValue.replace(/\D/g, '');
    }

    setFormData(prev => ({ ...prev, [field]: newValue }));

    // Auto-CEP Logic
    if (field === 'zip_code' && newValue.replace(/\D/g, '').length === 8) {
      handleCepLookup(newValue.replace(/\D/g, ''));
    }
  };

  const handleCepLookup = async (cep: string) => {
    try {
      // 1. Try Local Catalog First
      const { data: localData } = await supabase
        .from('zip_codes_catalog')
        .select('*')
        .eq('cep', cep)
        .single();

      if (localData) {
        setFormData(prev => ({
          ...prev,
          city: localData.city,
          state: localData.state,
          neighborhood: localData.neighborhood || prev.neighborhood,
          street: localData.street || prev.street
        }));
        return;
      }

      // 2. Try ViaCEP
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          city: data.localidade,
          state: data.uf, // Preenche visualmente
          neighborhood: data.bairro || prev.neighborhood,
          street: data.logradouro || prev.street
        }));
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
    }
  };

  const saveCepToCatalog = async () => {
    if (!formData.zip_code || formData.zip_code.length < 8) return;
    const cep = formData.zip_code.replace(/\D/g, '');
    
    const payload = {
      cep,
      street: formatTitleCase(formData.street),
      neighborhood: formatTitleCase(formData.neighborhood),
      city: formatTitleCase(formData.city),
      state: formData.state?.toUpperCase()
    };

    const { error } = await supabase.from('zip_codes_catalog').upsert([payload]);
    
    if (error) {
      console.error('Erro ao salvar CEP:', error.message);
      alert(`Erro ao salvar CEP: ${error.message}`);
    } else {
      alert('CEP salvo no catálogo local com sucesso!');
      fetchCatalogs();
    }
  };

  const saveToCatalog = async (table: string, field: string, value: string, extraField?: string, extraValue?: string) => {
    if (!value) return;
    const payload: any = { [field]: value };
    if (extraField) payload[extraField] = extraValue;

    const { error } = await supabase.from(table).insert([payload]);
    if (error) {
      if (error.code === '23505') {
         alert('Este item já existe no catálogo.');
      } else {
         console.error(`Erro ao salvar no catálogo ${table}:`, error.message);
         alert(`Erro ao salvar: ${error.message}`);
      }
    } else {
      alert('Salvo no catálogo com sucesso!');
      fetchCatalogs(); 
    }
  };

  const handleSave = async () => {
    // Validate Mandatory Fields
    const requiredFields = {
      cns: 'Cartão SUS',
      name: 'Nome Completo',
      birth_date: 'Data de Nascimento',
      gender: 'Sexo',
      nationality: 'Nacionalidade',
      race: 'Raça / Cor',
      ethnicity: 'Etnia',
      zip_code: 'CEP',
      city: 'Município',
      neighborhood: 'Bairro',
      street_code: 'Cód. Lograd.',
      street_type: 'Tipo Lograd.',
      street: 'Logradouro',
      number: 'Número',
      complement: 'Complemento',
      phone: 'Telefone / Celular'
    };

    for (const [key, label] of Object.entries(requiredFields)) {
      if (!formData[key as keyof typeof formData]) {
        return alert(`O campo "${label}" é obrigatório.`);
      }
    }

    // Phone Validation (Strict 11 digits)
    const phoneDigits = formData.phone.replace(/\D/g, '');
    if (phoneDigits.length !== 11) {
      return alert('O telefone deve conter DDD + 9 dígitos (total 11 números).');
    }

    // CNS/CPF Validation
    const cnsDigits = formData.cns.replace(/\D/g, '');
    if (cnsDigits.length !== 11 && cnsDigits.length !== 15) {
      return alert('O Cartão SUS/CPF deve conter 11 (CPF) ou 15 (CNS) dígitos.');
    }

    setLoading(true);
    
    // Filtra campos que não existem no banco
    const dataToSave = {
      cns: formData.cns,
      name: formatTitleCase(formData.name),
      birth_date: formData.birth_date || null,
      gender: formData.gender,
      nationality: formatTitleCase(formData.nationality) || null,
      race: formatTitleCase(formData.race) || null,
      ethnicity: formatTitleCase(formData.ethnicity) || null,
      zip_code: formData.zip_code || null,
      city: formatTitleCase(formData.city) || null,
      neighborhood: formatTitleCase(formData.neighborhood) || null,
      street_code: formData.street_code || null,
      street_type: formatTitleCase(formData.street_type) || null,
      complement: formatTitleCase(formData.complement) || null, 
      street: formatTitleCase(formData.street) || null,
      number: formData.number || null,
      phone: formData.phone || null,
      email: formData.email?.toLowerCase() || null
      // state e complement removidos
    };

    try {
      let error;
      if (editingId) {
        const { error: err } = await supabase.from('patients').update(dataToSave).eq('id', editingId);
        error = err;
      } else {
        const { error: err } = await supabase.from('patients').insert([dataToSave]);
        error = err;
      }

      setLoading(false);
      if (error) {
        alert('Erro ao salvar paciente: ' + error.message);
      } else {
        // If initial data was provided (came from another flow), call onSave to return
        if (initialCns || initialName) {
           onSave(); 
           return;
        }

        setShowForm(false);
        setEditingId(null);
        setFormData(initialFormState);
        await fetchPatients();
      }
    } catch (e: any) {
      setLoading(false);
      alert('Erro inesperado: ' + e.message);
    }
  };

  const handleEdit = (patient: Patient) => {
    setFormData({
      ...initialFormState,
      ...patient,
      birth_date: patient.birth_date || '',
      cns: patient.cns || '',
      state: '', // Não vem do banco
      complement: '' // Não vem do banco
    });
    setEditingId(patient.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este paciente? Esta ação não pode ser desfeita.')) return;

    const { error } = await supabase.from('patients').delete().eq('id', id);
    if (error) {
      alert('Erro ao excluir paciente: ' + error.message);
    } else {
      fetchPatients();
    }
  };

  const toggleForm = () => {
    if (showForm) {
      setFormData(initialFormState);
      setEditingId(null);
    }
    setShowForm(!showForm);
  };

  const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const filteredPatients = patients.filter(p => 
    normalize(p.name).includes(normalize(searchTerm)) || 
    p.cns.includes(searchTerm)
  );

  return (
    <div className="max-w-6xl mx-auto p-4 pb-24 space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">group</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pacientes</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Gerencie o cadastro de usuários e pacientes do sistema.</p>
        </div>
        
        <div className="flex gap-3">
          {!showForm && (
            <button 
              onClick={() => setShowImportModal(true)}
              className="h-12 px-4 rounded-xl font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 transition-all flex items-center gap-2 hover:shadow-md hover:bg-green-200 dark:hover:bg-green-900/50"
            >
              <span className="material-symbols-outlined">upload_file</span>
              <span className="hidden sm:inline">Importar Excel</span>
            </button>
          )}

          <button 
            onClick={toggleForm}
            className={`h-12 px-6 rounded-xl font-bold transition-all flex items-center gap-2 shadow-sm ${showForm ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-white' : 'bg-primary text-white shadow-primary/30'}`}
          >
            <span className="material-symbols-outlined">{showForm ? 'close' : 'person_add'}</span>
            {showForm ? 'Cancelar' : 'Novo Paciente'}
          </button>
        </div>
      </div>

      {showForm ? (
        <div className="bg-white dark:bg-surface-dark rounded-3xl p-6 shadow-xl border border-primary/20 animate-fade-in space-y-8">
          {/* Dados de Identificação */}
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">account_circle</span>
              {editingId ? 'Editando Paciente' : 'Dados de Identificação'}
            </h3>
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputGroup label="Cartão SUS (CNS)" placeholder="000 0000 0000 0000" icon="qr_code_scanner" value={formData.cns} onChange={(v: string) => handleChange('cns', v)} required />
              <InputGroup label="Nome Completo" placeholder="Digite o nome do paciente" value={formData.name} onChange={(v: string) => handleChange('name', v)} required />
              <InputGroup label="Data de Nascimento" type="date" value={formData.birth_date} onChange={(v: string) => handleChange('birth_date', v)} required />
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Sexo <span className="text-red-500">*</span></label>
                <select 
                  value={formData.gender}
                  onChange={(e) => handleChange('gender', e.target.value)}
                  className="h-12 bg-slate-50 dark:bg-background-dark border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-primary focus:ring-0 rounded-t-lg px-4 text-slate-900 dark:text-white transition-colors text-sm font-medium"
                >
                  <option>Masculino</option>
                  <option>Feminino</option>
                  <option>Outro</option>
                </select>
              </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <div className="relative">
                <InputGroup label="Nacionalidade" placeholder="Ex: Brasileira" value={formData.nationality} onChange={(v: string) => handleChange('nationality', v)} list="nat-list" required />
                <datalist id="nat-list">{catalogs.nationalities.map(n => <option key={n} value={n} />)}</datalist>
                {!catalogs.nationalities.includes(formData.nationality) && formData.nationality && (
                  <button onClick={() => saveToCatalog('nationalities_catalog', 'name', formData.nationality)} className="absolute right-0 -bottom-5 text-[9px] font-black text-primary uppercase hover:underline">Salvar Nova</button>
                )}
              </div>
              <div className="relative">
                <InputGroup label="Raça / Cor" placeholder="Ex: Parda" value={formData.race} onChange={(v: string) => handleChange('race', v)} list="race-list" required />
                <datalist id="race-list">{catalogs.races.map(n => <option key={n} value={n} />)}</datalist>
                {!catalogs.races.includes(formData.race) && formData.race && (
                  <button onClick={() => saveToCatalog('races_catalog', 'name', formData.race)} className="absolute right-0 -bottom-5 text-[9px] font-black text-primary uppercase hover:underline">Salvar Nova</button>
                )}
              </div>
              <div className="relative">
                <InputGroup label="Etnia" placeholder="Ex: Tupi" value={formData.ethnicity} onChange={(v: string) => handleChange('ethnicity', v)} list="eth-list" required />
                <datalist id="eth-list">{catalogs.ethnicities.map(n => <option key={n} value={n} />)}</datalist>
                {!catalogs.ethnicities.includes(formData.ethnicity) && formData.ethnicity && (
                  <button onClick={() => saveToCatalog('ethnicities_catalog', 'name', formData.ethnicity)} className="absolute right-0 -bottom-5 text-[9px] font-black text-primary uppercase hover:underline">Salvar Nova</button>
                )}
              </div>
            </section>
          </div>

          {/* Endereço e Catálogos */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">location_on</span>
              Endereço e Catálogos
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="relative">
                <InputGroup label="CEP" placeholder="00000-000" icon="search" value={formData.zip_code} onChange={(v: string) => handleChange('zip_code', v)} required />
                {formData.zip_code && formData.zip_code.replace(/\D/g, '').length === 8 && !catalogs.savedCeps.includes(formData.zip_code.replace(/\D/g, '')) && (
                  <button onClick={saveCepToCatalog} className="absolute right-0 -bottom-5 text-[9px] font-black text-primary uppercase hover:underline">Salvar CEP</button>
                )}
              </div>
              <div className="md:col-span-2">
                <InputGroup label="Município" placeholder="Preenchido via CEP" value={formData.city} onChange={(v: string) => handleChange('city', v)} required />
              </div>
              <div className="relative">
                <InputGroup label="Bairro" placeholder="Nome do bairro" value={formData.neighborhood} onChange={(v: string) => handleChange('neighborhood', v)} list="neighborhood-list" required />
                <datalist id="neighborhood-list">{catalogs.neighborhoods.map(n => <option key={n} value={n} />)}</datalist>
                {!catalogs.neighborhoods.includes(formData.neighborhood) && formData.neighborhood && (
                  <button onClick={() => saveToCatalog('neighborhoods_catalog', 'name', formData.neighborhood)} className="absolute right-0 -bottom-5 text-[9px] font-black text-primary uppercase hover:underline">Salvar Novo Bairro</button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-2 relative">
                <InputGroup label="Cód. Lograd." placeholder="Código" value={formData.street_code} onChange={(v: string) => handleChange('street_code', v)} list="street-code-list" required />
                <datalist id="street-code-list">{catalogs.streetTypes.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}</datalist>
              </div>

              <div className="md:col-span-2 relative">
                <InputGroup label="Tipo Lograd." placeholder="Rua..." value={formData.street_type} onChange={(v: string) => handleChange('street_type', v)} list="type-list" required />
                <datalist id="type-list">{catalogs.streetTypes.map(t => <option key={t.name} value={t.name} />)}</datalist>
              </div>

              <div className="md:col-span-4 relative">
                <InputGroup label="Logradouro" placeholder="Nome da via" value={formData.street} onChange={(v: string) => handleChange('street', v)} list="street-name-list" required />
                <datalist id="street-name-list">{catalogs.streets.map(s => <option key={s.name} value={s.name} />)}</datalist>
                {!catalogs.streets.some(s => s.name.toLowerCase() === formData.street.toLowerCase()) && formData.street && (
                  <button onClick={() => saveToCatalog('streets_catalog', 'name', formData.street, 'code', formData.street_code)} className="absolute right-0 -bottom-5 text-[9px] font-black text-primary uppercase hover:underline">Salvar Logradouro</button>
                )}
              </div>

              <div className="md:col-span-2">
                <InputGroup label="Nº" placeholder="123" value={formData.number} onChange={(v: string) => handleChange('number', v)} className="min-w-[80px]" required />
              </div>

              <div className="md:col-span-2 relative">
                 <InputGroup label="Complemento" placeholder="Apto..." value={formData.complement} onChange={(v: string) => handleChange('complement', v)} list="complement-list" required />
                 <datalist id="complement-list">{catalogs.complements.map(c => <option key={c} value={c} />)}</datalist>
                 {!catalogs.complements.includes(formData.complement) && formData.complement && (
                  <button onClick={() => saveToCatalog('complements_catalog', 'name', formData.complement)} className="absolute right-0 -bottom-5 text-[9px] font-black text-primary uppercase hover:underline">Salvar Complemento</button>
                )}
              </div>
            </div>
          </div>

          {/* Contato */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">call</span>
              Contato
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputGroup label="Telefone / Celular" placeholder="(00) 00000-0000" icon="phone" value={formData.phone} onChange={(v: string) => handleChange('phone', v)} required />
              <InputGroup label="E-mail" placeholder="paciente@exemplo.com" icon="mail" value={formData.email} onChange={(v: string) => handleChange('email', v)} />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              onClick={handleSave} 
              disabled={loading} 
              className="w-full h-14 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/30 hover:bg-primary-dark transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
              ) : (
                <>
                  <span className="material-symbols-outlined">{editingId ? 'sync' : 'save'}</span>
                  {editingId ? 'Atualizar Cadastro' : 'Salvar Cadastro Completo'}
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Lista de Pacientes */
        <div className="space-y-6 animate-fade-in">
          <div className="relative group">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 group-focus-within:text-primary transition-colors">search</span>
            <input 
              type="text"
              placeholder="Pesquisar por nome ou Cartão SUS..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-14 bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-2xl pl-12 pr-4 shadow-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all text-slate-900 dark:text-white"
            />
          </div>

          <div className="bg-white dark:bg-surface-dark rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-background-dark/50 border-b border-slate-100 dark:border-slate-800">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Paciente</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">CNS</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Localização</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {fetchingPatients ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                        <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
                        <p className="mt-2 text-sm text-slate-500">Carregando pacientes...</p>
                      </td>
                    </tr>
                  ) : filteredPatients.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                        <span className="material-symbols-outlined text-slate-300 text-4xl mb-2">person_search</span>
                        <p className="text-sm text-slate-500 font-medium">Nenhum paciente encontrado.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredPatients.map((patient) => (
                      <tr key={patient.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase">
                              {patient.name.charAt(0)}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-900 dark:text-white">{patient.name}</span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {patient.birth_date ? new Date(patient.birth_date).toLocaleDateString('pt-BR') : '---'} • {patient.gender}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                            {patient.cns}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm text-slate-600 dark:text-slate-400">{patient.neighborhood || '---'}</span>
                            <span className="text-[10px] text-slate-400">{patient.city}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => handleEdit(patient)}
                              className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                              title="Editar Dados"
                            >
                              <span className="material-symbols-outlined text-[20px]">edit</span>
                            </button>
                            {userRole === 'admin' && (
                              <button 
                                onClick={() => handleDelete(patient.id)}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                title="Excluir Paciente"
                              >
                                <span className="material-symbols-outlined text-[20px]">delete</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <PatientImportModal 
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            setShowImportModal(false);
            fetchPatients();
            alert('Importação realizada com sucesso!');
          }}
        />
      )}
    </div>
  );
};

const InputGroup = ({ label, placeholder, icon, type = "text", value, onChange, list, className, required }: any) => (
  <div className={`flex flex-col gap-2 group ${className || ''}`}>
    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div className="relative">
      <input 
        type={type} 
        value={value}
        list={list}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-12 bg-slate-50 dark:bg-background-dark border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-primary focus:ring-0 rounded-t-lg px-4 pr-12 text-slate-900 dark:text-white transition-all text-sm font-medium"
      />
      {icon && <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-primary/70">{icon}</span>}
    </div>
  </div>
);

export default PatientRegistration;