import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import PatientRegistration from './PatientRegistration';
import { UserProfile } from '../types';

interface ProcedureFormProps {
  onCancel: () => void;
  onSave: () => void;
  initialId?: string | null;
}

interface Patient {
  id: string;
  name: string;
  cns: string;
  birth_date: string;
  gender: string;
  neighborhood: string;
}

interface Procedure {
  id: string;
  code: string;
  name: string;
}

const ProcedureForm: React.FC<ProcedureFormProps> = ({ onCancel, onSave, initialId }) => {
  // Form State
  const [patientId, setPatientId] = useState<string>('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [dateService, setDateService] = useState('');
  const [dateScheduling, setDateScheduling] = useState('');
  const [status, setStatus] = useState<string>('Em Atendimento');
  const [procedureCode, setProcedureCode] = useState('');
  const [isProsthesis, setIsProsthesis] = useState(false);
  
  // Extra fields for Prosthesis workflow
  const [dateDelivery, setDateDelivery] = useState('');
  const [dateDeliveryText, setDateDeliveryText] = useState('');
  
  const [dateCancellation, setDateCancellation] = useState('');
  const [dateCancellationText, setDateCancellationText] = useState('');
  
  const [siaProcessed, setSiaProcessed] = useState(false);

  // Date Text States (Masked)
  const [dateServiceText, setDateServiceText] = useState('');
  const [dateSchedulingText, setDateSchedulingText] = useState('');

  const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(null);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Search State (Patient)
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Search State (Procedure)
  const [procSearchTerm, setProcSearchTerm] = useState('');
  const [procSearchResults, setProcSearchResults] = useState<Procedure[]>([]);
  const [isProcSearching, setIsProcSearching] = useState(false);
  const [showProcResults, setShowProcResults] = useState(false);
  const [showProcDetails, setShowProcDetails] = useState(false);
  const [showPatientRegistration, setShowPatientRegistration] = useState(false);
  const [registrationInitialData, setRegistrationInitialData] = useState<{cns?: string, name?: string}>({});

  // User Profile State
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Fetch User Profile
  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) setUserProfile(data);
      }
    };
    fetchProfile();
  }, []);

  // Date Helpers
  const formatDateToMask = (isoStr: string) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hour = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hour}:${min}`;
    } catch { return ''; }
  };

  const applyDateMask = (value: string) => {
    let v = value.replace(/\D/g, '');
    if (v.length > 12) v = v.slice(0, 12);
    
    if (v.length > 8) {
      return v.replace(/(\d{2})(\d{2})(\d{4})(\d{2})(\d{0,2})/, '$1/$2/$3 $4:$5');
    } else if (v.length > 4) {
      return v.replace(/(\d{2})(\d{2})(\d{4})/, '$1/$2/$3');
    } else if (v.length > 2) {
      return v.replace(/(\d{2})(\d{2})/, '$1/$2');
    }
    return v;
  };

  const parseDateToISO = (str: string) => {
    if (str.length < 16) return null;
    const [datePart, timePart] = str.split(' ');
    if (!datePart || !timePart) return null;
    const [day, month, year] = datePart.split('/');
    const [hour, minute] = timePart.split(':');
    
    if (!day || !month || !year || !hour || !minute) return null;
    
    // Create date manually to avoid timezone issues
    const d = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
    if (isNaN(d.getTime())) return null;
    
    // Format to YYYY-MM-DDTHH:mm
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${dd}T${hh}:${mm}`;
  };

  // Auto-Finalize Logic for Prosthesis
  // Refined Logic:
  // Only auto-finalize if status is explicitly changed TO 'Finalizado' or if date is added while in a production status.
  // We removed the aggressive useEffect that forced 'Finalizado' if dateDelivery existed.
  // This allows Admins to revert status even if dateDelivery is present (it will be cleared on save if not Finalized).

  // Fetch data for editing
  useEffect(() => {
    if (initialId) {
      const fetchData = async () => {
        setIsLoading(true);
        try {
          const { data, error } = await supabase
            .from('procedure_production')
            .select(`
              *,
              patients (*)
            `)
            .eq('id', initialId)
            .single();

          if (error) throw error;
          if (data) {
            setPatientId(data.patient_id);
            setSelectedPatient(data.patients);
            setSearchTerm(data.patients.name);
            setShowDetails(true);

            setProcedureCode(data.procedure_code);
            setProcSearchTerm(data.procedure_code);
            
            // Fetch procedure details
            const { data: procData } = await supabase
              .from('procedures_catalog')
              .select('*')
              .eq('code', data.procedure_code)
              .single();
            
            if (procData) {
              setSelectedProcedure(procData);
              setShowProcDetails(true);
            }

            setStatus(data.status);
            setNotes(data.notes || '');
            setSiaProcessed(data.sia_processed || false);
            
            if (data.date_service) {
              const d = new Date(data.date_service);
              d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
              const iso = d.toISOString().slice(0, 16);
              setDateService(iso);
              setDateServiceText(formatDateToMask(data.date_service)); 
            }

            if (data.date_delivery) {
              const d = new Date(data.date_delivery);
              d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
              const iso = d.toISOString().slice(0, 16);
              setDateDelivery(iso);
              setDateDeliveryText(formatDateToMask(data.date_delivery));
            }

            if (data.date_cancellation) {
               const d = new Date(data.date_cancellation);
               d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
               const iso = d.toISOString().slice(0, 16);
               setDateCancellation(iso);
               setDateCancellationText(formatDateToMask(data.date_cancellation));
            }

            if (data.date_scheduling) {
              const d = new Date(data.date_scheduling);
              d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
              const iso = d.toISOString().slice(0, 16);
              setDateScheduling(iso);
              setDateSchedulingText(formatDateToMask(data.date_scheduling));
            }
          }
        } catch (error) {
          console.error('Erro ao carregar dados:', error);
          alert('Erro ao carregar dados para edição.');
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    }
  }, [initialId]);

  // Search Effect (Patient)
  useEffect(() => {
    const searchPatients = async () => {
      if (searchTerm.length < 1) {
        setSearchResults([]);
        return;
      }

      // Avoid searching if we're just setting the initial value
      if (initialId && selectedPatient && searchTerm === selectedPatient.name) return;

      setIsSearching(true);
      setSearchError(false);
      try {
        const { data, error } = await supabase
          .rpc('search_patients', { search_term: searchTerm })
          .limit(5);

        if (error) throw error;
        setSearchResults(data || []);
      } catch (error: any) {
        console.warn('RPC Search failed, falling back to standard ILIKE:', error.message);
        
        // Fallback for when RPC is missing (SQL not run)
        const { data, error: fallbackError } = await supabase
          .from('patients')
          .select('*')
          .or(`name.ilike.%${searchTerm}%,cns.ilike.%${searchTerm}%`)
          .limit(5);
          
        if (fallbackError) {
           console.error('Fallback search failed:', fallbackError);
           setSearchError(true);
           setSearchResults([]);
        } else {
           setSearchResults(data || []);
        }
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchPatients, 500);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Search Effect (Procedure)
  useEffect(() => {
    const searchProcedures = async () => {
      if (procSearchTerm.length < 1) {
        setProcSearchResults([]);
        return;
      }

      // Avoid searching if we're just setting the initial value
      if (initialId && selectedProcedure && procSearchTerm === selectedProcedure.code) return;

      setIsProcSearching(true);
      try {
        const { data, error } = await supabase
          .rpc('search_procedures', { search_term: procSearchTerm })
          .limit(5);

        if (error) throw error;
        setProcSearchResults(data || []);
      } catch (error: any) {
        console.warn('RPC Search failed, falling back to standard ILIKE:', error.message);
        const { data, error: fallbackError } = await supabase
          .from('procedures_catalog')
          .select('*')
          .or(`code.ilike.%${procSearchTerm}%,name.ilike.%${procSearchTerm}%`)
          .limit(5);

        if (!fallbackError && data) {
          setProcSearchResults(data);
        }
      } finally {
        setIsProcSearching(false);
      }
    };

    const timeoutId = setTimeout(searchProcedures, 300);
    return () => clearTimeout(timeoutId);
  }, [procSearchTerm]);

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setPatientId(patient.id);
    setSearchTerm(patient.name);
    setShowResults(false);
    setShowDetails(true);
  };

  const handleSelectProcedure = (procedure: Procedure) => {
    setSelectedProcedure(procedure);
    setProcedureCode(procedure.code);
    setProcSearchTerm(procedure.code);
    setShowProcResults(false);
    setShowProcDetails(true);
    
    // Check if it's Prosthesis
    const isProsthesisCheck = procedure.name.toLowerCase().includes('prótese') || procedure.name.toLowerCase().includes('protese');
    setIsProsthesis(isProsthesisCheck);
    
    // Auto-set status if creating new
    if (!initialId) {
      if (isProsthesisCheck) {
        setStatus('Consulta/Molde');
      } else {
        setStatus('Em Atendimento');
      }
    } else {
      // If editing and switching types, ensure valid status
      if (isProsthesisCheck) {
         if (status === 'Em Atendimento') setStatus('Consulta/Molde');
      } else {
         if (status === 'Consulta/Molde' || status === 'Agendado Entrega') setStatus('Em Atendimento');
      }
    }
  };

  // Re-check prosthesis when initial data loads
  useEffect(() => {
    if (selectedProcedure) {
      const check = selectedProcedure.name.toLowerCase().includes('prótese') || selectedProcedure.name.toLowerCase().includes('protese');
      setIsProsthesis(check);
    }
  }, [selectedProcedure]);

  const handleSave = async () => {
    // Basic validation
    if (!patientId || !procedureCode || !dateService) {
      alert('Por favor, preencha todos os campos obrigatórios (Paciente, Data Atendimento, Procedimento).');
      return;
    }

    // Ensure status is selected (default fallback)
    const finalStatus = status || (isProsthesis ? 'Consulta/Molde' : 'Em Atendimento');

    setIsSaving(true);
    try {
      const payload: any = {
        patient_id: patientId,
        procedure_code: procedureCode,
        status: finalStatus,
        date_service: new Date(dateService).toISOString(),
        date_scheduling: dateScheduling ? new Date(dateScheduling).toISOString() : null,
        notes: notes,
        sia_processed: siaProcessed
      };

      if (isProsthesis) {
         // Logic to set or clear date_delivery based on status
         // Only set date_delivery for Finalized status
         if (dateDelivery && finalStatus === 'Finalizado') {
            payload.date_delivery = new Date(dateDelivery).toISOString();
         } else {
            payload.date_delivery = null; // Clear delivery date if reverting status
         }
      }

      if (finalStatus === 'Cancelado' && dateCancellation) {
         payload.date_cancellation = new Date(dateCancellation).toISOString();
      }

      let error;
      if (initialId) {
        // Update existing
        const { error: updateError } = await supabase
          .from('procedure_production')
          .update(payload)
          .eq('id', initialId);
        error = updateError;
      } else {
        // Create new
        const { error: insertError } = await supabase
          .from('procedure_production')
          .insert(payload);
        error = insertError;
      }

      if (error) throw error;
      onSave();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar procedimento. Verifique os dados.');
    } finally {
      setIsSaving(false);
    }
  };

  const isStatusLocked = userProfile?.role?.toLowerCase() !== 'admin' && (
    (status === 'Finalizado') ||
    (status === 'Cancelado')
  ); // Only Admins can revert Finalized/Cancelled status

  // Debug: Log profile role to console
  useEffect(() => {
    if (userProfile) console.log('Current User Role:', userProfile.role);
  }, [userProfile]);

  return (
    <div className="max-w-xl mx-auto p-4 pb-24 space-y-6 animate-fade-in">
      {isLoading ? (
        <div className="flex justify-center items-center h-full min-h-[400px]">
          <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
        </div>
      ) : showPatientRegistration ? (
        <div className="animate-fade-in">
          <PatientRegistration 
            onCancel={() => setShowPatientRegistration(false)}
            onSave={() => {
               setShowPatientRegistration(false);
               // Re-trigger search to find the newly added patient
               if (registrationInitialData.name) setSearchTerm(registrationInitialData.name);
            }}
            userRole="operator" // Or pass current user role
            initialCns={registrationInitialData.cns}
            initialName={registrationInitialData.name}
          />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-1 bg-gradient-to-b from-primary to-transparent rounded-full"></div>
            <h2 className="text-xl font-bold tracking-wide text-slate-800 dark:text-white uppercase">
              {initialId ? 'Editar Procedimento' : 'Novo Procedimento BPA-I'}
            </h2>
          </div>

          <div className="bg-surface-light dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        
        {/* Patient Selection - Imagem 2 Context */}
        <div className={`group relative ${showResults ? 'z-50' : 'z-20'}`}>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Paciente *</label>
            {selectedPatient && (
              <button 
                onClick={() => setShowDetails(!showDetails)}
                className="text-[10px] font-bold uppercase text-primary flex items-center gap-1 hover:underline"
              >
                {showDetails ? 'Ocultar Detalhes' : 'Ver Dados Pessoais'}
                <span className={`material-symbols-outlined text-[16px] transition-transform ${showDetails ? 'rotate-180' : ''}`}>expand_circle_down</span>
              </button>
            )}
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">
              {isSearching ? 'progress_activity' : 'person'}
            </span>
            <input 
              className={`w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl py-3.5 pl-12 pr-4 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm ${isSearching ? 'animate-pulse' : ''}`}
              placeholder="Buscar por nome ou SUS..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowResults(true);
                if (!e.target.value) setSelectedPatient(null);
              }}
              onFocus={() => setShowResults(true)}
            />
            
            {/* Search Results Dropdown */}
            {showResults && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-surface-dark rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden max-h-60 overflow-y-auto z-50">
                {isSearching ? (
                  <div className="p-4 text-center text-slate-500 dark:text-slate-400 text-xs font-medium">
                    <span className="material-symbols-outlined animate-spin text-lg mb-1 block">progress_activity</span>
                    Buscando pacientes...
                  </div>
                ) : searchError ? (
                  <div className="p-4 text-center text-red-500 text-xs font-medium">
                    Erro ao buscar pacientes. Verifique sua conexão.
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map(patient => (
                    <button
                      key={patient.id}
                      onClick={() => handleSelectPatient(patient)}
                      className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-50 dark:border-slate-800 last:border-0"
                    >
                      <p className="font-bold text-slate-900 dark:text-white text-sm">{patient.name}</p>
                      <p className="text-xs text-slate-500">CNS: {patient.cns}</p>
                    </button>
                  ))
                ) : searchTerm.length > 0 ? (
                  <div className="p-4 text-center">
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mb-2">Nenhum paciente encontrado</p>
                    <button 
                      onClick={() => {
                        const isCns = /^\d+$/.test(searchTerm);
                        setRegistrationInitialData({
                          cns: isCns ? searchTerm : '',
                          name: !isCns ? searchTerm : ''
                        });
                        setShowPatientRegistration(true);
                      }}
                      className="text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 mx-auto"
                    >
                      <span className="material-symbols-outlined text-[14px]">person_add</span>
                      Cadastrar Paciente
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Details Area (Patient) */}
        {showDetails && selectedPatient && (
          <div className="p-4 bg-slate-50 dark:bg-background-dark rounded-xl border border-slate-200 dark:border-slate-700 animate-fade-in grid grid-cols-2 gap-4">
             <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Cartão SUS</p>
                <p className="text-sm dark:text-white font-mono">{selectedPatient.cns}</p>
             </div>
             <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Nascimento</p>
                <p className="text-sm dark:text-white">{selectedPatient.birth_date ? new Date(selectedPatient.birth_date).toLocaleDateString('pt-BR') : 'N/A'}</p>
             </div>
             <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Gênero</p>
                <p className="text-sm dark:text-white">{selectedPatient.gender || 'Não informado'}</p>
             </div>
             <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Bairro</p>
                <p className="text-sm dark:text-white">{selectedPatient.neighborhood || 'N/A'}</p>
             </div>
          </div>
        )}

        {/* Procedure Search - Imagem 3 Context (Moved Up) */}
        <div className={`group relative ${showProcResults ? 'z-50' : 'z-10'}`}>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Procedimento (Código) *</label>
            {selectedProcedure && (
              <button 
                onClick={() => setShowProcDetails(!showProcDetails)}
                className="text-[10px] font-bold uppercase text-primary flex items-center gap-1 hover:underline"
              >
                {showProcDetails ? 'Ocultar Detalhes' : 'Ver Descrição'}
                <span className={`material-symbols-outlined text-[16px] transition-transform ${showProcDetails ? 'rotate-180' : ''}`}>expand_circle_down</span>
              </button>
            )}
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">
              {isProcSearching ? 'progress_activity' : 'qr_code_2'}
            </span>
            <input 
              value={procSearchTerm}
              onChange={(e) => {
                setProcSearchTerm(e.target.value);
                setProcedureCode(e.target.value); // Allow manual entry if needed, but search is better
                setShowProcResults(true);
                if (!e.target.value) setSelectedProcedure(null);
              }}
              onFocus={() => setShowProcResults(true)}
              className={`w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl py-3.5 pl-12 pr-4 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm font-mono ${isProcSearching ? 'animate-pulse' : ''}`}
              placeholder="Buscar código ou nome do procedimento..." 
            />
            
            {/* Procedure Search Results Dropdown */}
            {showProcResults && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-surface-dark rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden max-h-60 overflow-y-auto z-[60]">
                {isProcSearching ? (
                  <div className="p-4 text-center text-slate-500 dark:text-slate-400 text-xs font-medium">
                    <span className="material-symbols-outlined animate-spin text-lg mb-1 block">progress_activity</span>
                    Buscando procedimentos...
                  </div>
                ) : procSearchResults.length > 0 ? (
                  procSearchResults.map(proc => (
                    <button
                      key={proc.id}
                      onClick={() => handleSelectProcedure(proc)}
                      className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-50 dark:border-slate-800 last:border-0"
                    >
                      <p className="font-bold text-slate-900 dark:text-white text-sm font-mono">{proc.code}</p>
                      <p className="text-xs text-slate-500">{proc.name}</p>
                    </button>
                  ))
                ) : procSearchTerm.length > 0 ? (
                  <div className="p-4 text-center text-slate-500 dark:text-slate-400 text-xs font-medium">
                    Nenhum procedimento encontrado
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Details Area (Procedure) */}
        {showProcDetails && selectedProcedure && (
          <div className="p-4 bg-slate-50 dark:bg-background-dark rounded-xl border border-slate-200 dark:border-slate-700 animate-fade-in">
             <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Descrição do Procedimento</p>
                <p className="text-sm dark:text-white font-medium">{selectedProcedure.name}</p>
             </div>
          </div>
        )}

        {/* Fields dependent on Procedure Selection */}
        {selectedProcedure && (
          <div className="space-y-6 animate-fade-in">
            {/* Date & Time Section - Dynamic based on Procedure Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="group">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">
                  {isProsthesis ? 'Data Consulta/Molde *' : 'Data Atendimento *'}
                </label>
                <div className="relative">
                  <input 
                    type="text" 
                    inputMode="numeric"
                    value={dateServiceText}
                    placeholder="dd/mm/aaaa hh:mm"
                    maxLength={16}
                    onChange={(e) => {
                      const val = applyDateMask(e.target.value);
                      setDateServiceText(val);
                      const iso = parseDateToISO(val);
                      if (iso) setDateService(iso);
                    }}
                    onBlur={() => {
                      if (dateServiceText.length >= 10 && !dateService) {
                        const iso = parseDateToISO(dateServiceText + (dateServiceText.length === 10 ? ' 00:00' : ''));
                        if (iso) setDateService(iso);
                      }
                    }}
                    className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl py-3.5 px-4 pr-12 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm" 
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('date-service-picker') as HTMLInputElement;
                      if (input) input.showPicker();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                  >
                    <span className="material-symbols-outlined">calendar_month</span>
                  </button>
                  <input
                    id="date-service-picker"
                    type="datetime-local"
                    className="sr-only"
                    value={dateService}
                    onChange={(e) => {
                      setDateService(e.target.value);
                      setDateServiceText(formatDateToMask(e.target.value));
                    }}
                  />
                </div>
              </div>

              {/* Delivery Date - Only for Finalized */}
              {isProsthesis && (status === 'Finalizado') && (
                <div className="group animate-fade-in">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase text-primary">Data Entrega *</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      inputMode="numeric"
                      value={dateDeliveryText}
                      placeholder="dd/mm/aaaa hh:mm"
                      maxLength={16}
                      onChange={(e) => {
                        const val = applyDateMask(e.target.value);
                        setDateDeliveryText(val);
                        const iso = parseDateToISO(val);
                        if (iso) setDateDelivery(iso);
                      }}
                      onBlur={() => {
                         if (dateDeliveryText.length >= 10) {
                            const timePart = dateDeliveryText.length > 10 ? '' : ' 00:00';
                            const iso = parseDateToISO(dateDeliveryText + timePart);
                            if (iso) setDateDelivery(iso);
                         }
                      }}
                      className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl py-3.5 px-4 pr-12 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm" 
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        const input = document.getElementById('date-delivery-picker') as HTMLInputElement;
                        if (input) input.showPicker();
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                    >
                      <span className="material-symbols-outlined">event_available</span>
                    </button>
                    <input
                      id="date-delivery-picker"
                      type="datetime-local"
                      className="sr-only"
                      value={dateDelivery}
                      onChange={(e) => {
                        setDateDelivery(e.target.value);
                        setDateDeliveryText(formatDateToMask(e.target.value));
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Scheduling Date - For Agendado Entrega OR Non-Prosthesis */}
              {((isProsthesis && status === 'Agendado Entrega') || (!isProsthesis && status !== 'Cancelado')) && (
                <div className="group animate-fade-in">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase text-primary">Data Agendamento</label>
                <div className="relative">
                  <input 
                    type="text" 
                    inputMode="numeric"
                    value={dateSchedulingText}
                    placeholder="dd/mm/aaaa hh:mm"
                    maxLength={16}
                    onChange={(e) => {
                      const val = applyDateMask(e.target.value);
                      setDateSchedulingText(val);
                      const iso = parseDateToISO(val);
                      if (iso) setDateScheduling(iso);
                    }}
                    onBlur={() => {
                       if (dateSchedulingText.length >= 10) {
                          const timePart = dateSchedulingText.length > 10 ? '' : ' 00:00';
                          const iso = parseDateToISO(dateSchedulingText + timePart);
                          if (iso) setDateScheduling(iso);
                       }
                    }}
                    className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl py-3.5 px-4 pr-12 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm" 
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('date-scheduling-picker') as HTMLInputElement;
                      if (input) input.showPicker();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                  >
                    <span className="material-symbols-outlined">event</span>
                  </button>
                  <input
                    id="date-scheduling-picker"
                    type="datetime-local"
                    className="sr-only"
                    value={dateScheduling}
                    onChange={(e) => {
                      setDateScheduling(e.target.value);
                      setDateSchedulingText(formatDateToMask(e.target.value));
                    }}
                  />
                </div>
              </div>
              )}

              {/* Cancellation Date - Only if Cancelled */}
              {status === 'Cancelado' && (
                <div className="group animate-fade-in">
                  <label className="block text-xs font-bold text-red-500 mb-2 uppercase">Data Cancelamento *</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      inputMode="numeric"
                      value={dateCancellationText}
                      placeholder="dd/mm/aaaa hh:mm"
                      maxLength={16}
                      onChange={(e) => {
                        const val = applyDateMask(e.target.value);
                        setDateCancellationText(val);
                        const iso = parseDateToISO(val);
                        if (iso) setDateCancellation(iso);
                      }}
                      onBlur={() => {
                         if (dateCancellationText.length >= 10) {
                            const timePart = dateCancellationText.length > 10 ? '' : ' 00:00';
                            const iso = parseDateToISO(dateCancellationText + timePart);
                            if (iso) setDateCancellation(iso);
                         }
                      }}
                      className="w-full bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 rounded-xl py-3.5 px-4 pr-12 focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-sm" 
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        const input = document.getElementById('date-cancellation-picker') as HTMLInputElement;
                        if (input) input.showPicker();
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-600 transition-colors"
                    >
                      <span className="material-symbols-outlined">event_busy</span>
                    </button>
                    <input
                      id="date-cancellation-picker"
                      type="datetime-local"
                      className="sr-only"
                      value={dateCancellation}
                      onChange={(e) => {
                        setDateCancellation(e.target.value);
                        setDateCancellationText(formatDateToMask(e.target.value));
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
               <div className="group">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Status</label>
                <div className="relative">
                  <select 
                    value={status}
                    disabled={isStatusLocked}
                    onChange={(e) => setStatus(e.target.value)}
                    className={`w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl py-3.5 px-4 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm ${isProsthesis && (status === 'Consulta/Molde' || status === 'Agendado Entrega') ? 'border-l-4 border-l-primary' : ''} disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isProsthesis ? (
                      <>
                        <option value="Consulta/Molde">Consulta/Molde</option>
                        <option value="Agendado Entrega">Agendado Entrega</option>
                        <option value="Finalizado">Finalizado</option>
                        <option value="Cancelado">Cancelado</option>
                        <option value="CNS Inválido">CNS Inválido</option>
                      </>
                    ) : (
                      <>
                        <option value="Em Atendimento">Em Atendimento</option>
                        <option value="Finalizado">Finalizado</option>
                        <option value="CNS Inválido">CNS Inválido</option>
                      </>
                    )}
                  </select>
                  {isProsthesis && (status === 'Consulta/Molde' || status === 'Agendado Entrega') && (
                     <div className="absolute right-8 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-bold uppercase pointer-events-none">
                       <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                       Em Produção
                     </div>
                  )}
                </div>
               </div>
            </div>

            <div className="group">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Descrição Detalhada</label>
              <textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl py-4 px-4 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm min-h-[120px] resize-none"
                placeholder="Descreva as especificações da prótese, materiais e observações clínicas..."
              />
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-40">
        <div className="max-w-xl mx-auto flex gap-4">
          <button 
            onClick={onCancel}
            className="flex-1 h-14 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold bg-white dark:bg-surface-dark hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95"
          >
            Voltar
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex-[2] h-14 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/30 hover:bg-primary-dark transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined">save</span>
            )}
            {isSaving ? 'Salvando...' : 'Salvar Procedimento'}
          </button>
        </div>
      </div>
      </>
    )}
    </div>
  );
};

export default ProcedureForm;
