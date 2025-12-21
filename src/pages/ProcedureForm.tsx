import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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
  const [status, setStatus] = useState('Em Produção');
  const [procedureCode, setProcedureCode] = useState('');
  const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(null);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Search State (Patient)
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Search State (Procedure)
  const [procSearchTerm, setProcSearchTerm] = useState('');
  const [procSearchResults, setProcSearchResults] = useState<Procedure[]>([]);
  const [isProcSearching, setIsProcSearching] = useState(false);
  const [showProcResults, setShowProcResults] = useState(false);
  const [showProcDetails, setShowProcDetails] = useState(false);

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
            
            if (data.date_service) {
              const d = new Date(data.date_service);
              d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
              setDateService(d.toISOString().slice(0, 16));
            }

            if (data.date_scheduling) {
              const d = new Date(data.date_scheduling);
              d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
              setDateScheduling(d.toISOString().slice(0, 16));
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
      if (searchTerm.length < 3) {
        setSearchResults([]);
        return;
      }

      // Avoid searching if we're just setting the initial value
      if (initialId && selectedPatient && searchTerm === selectedPatient.name) return;

      setIsSearching(true);
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,cns.ilike.%${searchTerm}%`)
        .limit(5);

      if (!error && data) {
        setSearchResults(data);
      }
      setIsSearching(false);
    };

    const timeoutId = setTimeout(searchPatients, 500);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Search Effect (Procedure)
  useEffect(() => {
    const searchProcedures = async () => {
      if (procSearchTerm.length < 3) {
        setProcSearchResults([]);
        return;
      }

      // Avoid searching if we're just setting the initial value
      if (initialId && selectedProcedure && procSearchTerm === selectedProcedure.code) return;

      setIsProcSearching(true);
      const { data, error } = await supabase
        .from('procedures_catalog')
        .select('*')
        .or(`code.ilike.%${procSearchTerm}%,name.ilike.%${procSearchTerm}%`)
        .limit(5);

      if (!error && data) {
        setProcSearchResults(data);
      }
      setIsProcSearching(false);
    };

    const timeoutId = setTimeout(searchProcedures, 500);
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
  };

  const handleSave = async () => {
    if (!patientId || !procedureCode || !dateService) {
      alert('Por favor, preencha todos os campos obrigatórios (Paciente, Data Atendimento, Procedimento).');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        patient_id: patientId,
        procedure_code: procedureCode,
        status: status,
        date_service: new Date(dateService).toISOString(),
        date_scheduling: dateScheduling ? new Date(dateScheduling).toISOString() : null,
        notes: notes
      };

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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[400px]">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-4 pb-24 space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-8 w-1 bg-gradient-to-b from-primary to-transparent rounded-full"></div>
        <h2 className="text-xl font-bold tracking-wide text-slate-800 dark:text-white uppercase">
          {initialId ? 'Editar Procedimento' : 'Novo Procedimento BPA-I'}
        </h2>
      </div>

      <div className="bg-surface-light dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        
        {/* Patient Selection */}
        <div className="group relative z-20">
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
            {showResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-surface-dark rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden max-h-60 overflow-y-auto z-50">
                {searchResults.map(patient => (
                  <button
                    key={patient.id}
                    onClick={() => handleSelectPatient(patient)}
                    className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-50 dark:border-slate-800 last:border-0"
                  >
                    <p className="font-bold text-slate-900 dark:text-white text-sm">{patient.name}</p>
                    <p className="text-xs text-slate-500">CNS: {patient.cns}</p>
                  </button>
                ))}
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

        {/* Date & Time & Scheduling */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="group">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Data Atendimento *</label>
            <input 
              type="datetime-local" 
              value={dateService}
              onChange={(e) => setDateService(e.target.value)}
              className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl py-3.5 px-4 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm [color-scheme:dark]" 
            />
          </div>
          <div className="group">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase text-primary">Data Agendamento</label>
            <input 
              type="datetime-local" 
              value={dateScheduling}
              onChange={(e) => setDateScheduling(e.target.value)}
              className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl py-3.5 px-4 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm [color-scheme:dark]" 
            />
          </div>
        </div>

        <div className="group">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Status</label>
            <select 
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl py-3.5 px-4 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
            >
              <option>Agendado</option>
              <option>Em Produção</option>
              <option>Finalizado</option>
              <option>Cancelado</option>
            </select>
        </div>

        {/* Procedure Search */}
        <div className="group relative z-10">
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
            {showProcResults && procSearchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-surface-dark rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden max-h-60 overflow-y-auto z-50">
                {procSearchResults.map(proc => (
                  <button
                    key={proc.id}
                    onClick={() => handleSelectProcedure(proc)}
                    className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-50 dark:border-slate-800 last:border-0"
                  >
                    <p className="font-bold text-slate-900 dark:text-white text-sm font-mono">{proc.code}</p>
                    <p className="text-xs text-slate-500">{proc.name}</p>
                  </button>
                ))}
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
    </div>
  );
};

export default ProcedureForm;
