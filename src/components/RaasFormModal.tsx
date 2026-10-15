import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { supabase } from '../lib/supabase';
import {
  RaasRecord,
  RaasActionItem,
  RaasLocal,
  RAAS_ORIGIN_OPTIONS,
  RAAS_DESTINATION_OPTIONS,
  COMMON_PSYCH_CIDS,
  COMMON_RAAS_PROCEDURES
} from '../types/raas';
import { validateRaasAction } from '../services/raasService';

interface RaasFormModalProps {
  initialData?: RaasRecord | null;
  onClose: () => void;
  onSave: (record: Omit<RaasRecord, 'id'> & { id?: string }) => void;
}

const RaasFormModal: React.FC<RaasFormModalProps> = ({ initialData, onClose, onSave }) => {
  // Contexto
  const [competence, setCompetence] = useState('Março / 2026');
  const [establishmentCnes, setEstablishmentCnes] = useState('1234567');
  const [establishmentName, setEstablishmentName] = useState('CAPS I VIVER BEM');
  const [status, setStatus] = useState<RaasRecord['status']>('Ativo');

  // Bloco 1: Identificação & Admissão
  const [patientCns, setPatientCns] = useState('');
  const [patientCpf, setPatientCpf] = useState('');
  const [patientName, setPatientName] = useState('');
  const [admissionDate, setAdmissionDate] = useState('');
  const [recordNumber, setRecordNumber] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'M' | 'F' | 'O'>('M');
  const [nationality, setNationality] = useState('BRASILEIRA');
  const [streetSituation, setStreetSituation] = useState(false);

  // Busca de Paciente cadastrado
  const [patientSearch, setPatientSearch] = useState('');
  const [patientSuggestions, setPatientSuggestions] = useState<any[]>([]);

  // Bloco 2: Informações Clínicas & Rede
  const [substanceUser, setSubstanceUser] = useState(false);
  const [originCode, setOriginCode] = useState('02 - Atenção Básica / ESF');
  const [cidPrimary, setCidPrimary] = useState('F32.2');
  const [cidPrimaryDesc, setCidPrimaryDesc] = useState('EPISÓDIO DEPRESSIVO GRAVE');
  const [cidSecondary, setCidSecondary] = useState('');
  const [cidSecondaryDesc, setCidSecondaryDesc] = useState('');
  const [esfCoverage, setEsfCoverage] = useState(false);
  const [esfCnesTeam, setEsfCnesTeam] = useState('');
  const [destinationCode, setDestinationCode] = useState('1 - Permanência / Acompanhamento no CAPS');
  const [notes, setNotes] = useState('');

  // Bloco 3: Grade de Ações
  const [actions, setActions] = useState<RaasActionItem[]>([]);

  // Campos para Nova Ação (Inclusão Passo a Passo)
  const [newProcCode, setNewProcCode] = useState('03.01.08.020-8');
  const [newProcName, setNewProcName] = useState('Atendimento Individual em CAPS');
  const [newActionDate, setNewActionDate] = useState('');
  const [newQty, setNewQty] = useState(1);
  const [newProfCns, setNewProfCns] = useState('');
  const [newProfName, setNewProfName] = useState('');
  const [newProfCbo, setNewProfCbo] = useState('');
  const [newProfOcc, setNewProfOcc] = useState('');
  const [newLocal, setNewLocal] = useState<RaasLocal>('C');

  // Autocomplete de profissionais
  const [professionalsList, setProfessionalsList] = useState<any[]>([]);
  const [establishmentsList, setEstablishmentsList] = useState<any[]>([]);

  // Carregar dados existentes ou padrões
  useEffect(() => {
    if (initialData) {
      setCompetence(initialData.competence || 'Março / 2026');
      setEstablishmentCnes(initialData.establishment_cnes || '1234567');
      setEstablishmentName(initialData.establishment_name || '');
      setStatus(initialData.status || 'Ativo');
      setPatientCns(initialData.patient_cns || '');
      setPatientCpf(initialData.patient_cpf || '');
      setPatientName(initialData.patient_name || '');
      setAdmissionDate(initialData.admission_date || '');
      setRecordNumber(initialData.record_number || '');
      setBirthDate(initialData.birth_date || '');
      setGender(initialData.gender || 'M');
      setNationality(initialData.nationality || 'BRASILEIRA');
      setStreetSituation(!!initialData.street_situation);
      setSubstanceUser(!!initialData.substance_user);
      setOriginCode(initialData.origin_code || '02 - Atenção Básica / ESF');
      setCidPrimary(initialData.cid_primary || 'F32.2');
      setCidPrimaryDesc(initialData.cid_primary_desc || 'EPISÓDIO DEPRESSIVO GRAVE');
      setCidSecondary(initialData.cid_secondary || '');
      setCidSecondaryDesc(initialData.cid_secondary_desc || '');
      setEsfCoverage(!!initialData.esf_coverage);
      setEsfCnesTeam(initialData.esf_cnes_team || '');
      setDestinationCode(initialData.destination_code || '1 - Permanência / Acompanhamento no CAPS');
      setNotes(initialData.notes || '');
      setActions(initialData.actions || []);
    } else {
      // Data padrão de hoje para admissão
      const today = new Date().toISOString().split('T')[0];
      const todayBr = today.split('-').reverse().join('/');
      setAdmissionDate(todayBr);
      setNewActionDate(todayBr);
      setCidSecondary('');
      setCidSecondaryDesc('');
    }
  }, [initialData]);

  // Carregar profissionais e estabelecimentos cadastrados no sistema
  useEffect(() => {
    const loadLookups = async () => {
      try {
        const { data: profs } = await supabase.from('profissionais').select('sus,nome,cbo,profissao').limit(50);
        if (profs && profs.length > 0) {
          setProfessionalsList(profs);
          if (!newProfCns && profs[0]) {
            setNewProfCns(profs[0].sus || '');
            setNewProfName(profs[0].nome || '');
            setNewProfCbo(profs[0].cbo || '');
            setNewProfOcc(profs[0].profissao || '');
          }
        }

        const { data: estabs } = await supabase.from('establishments').select('cnes,name').limit(20);
        if (estabs && estabs.length > 0) {
          setEstablishmentsList(estabs);
        }
      } catch (err) {
        console.warn('Erro ao carregar lookups:', err);
      }
    };
    loadLookups();
  }, []);

  // Busca rápida de paciente cadastrado
  const handleSearchPatient = async (term: string) => {
    setPatientSearch(term);
    if (term.length < 2) {
      setPatientSuggestions([]);
      return;
    }
    try {
      const { data } = await supabase
        .from('patients')
        .select('*')
        .or(`name.ilike.%${term}%,cns.ilike.%${term}%`)
        .limit(5);
      setPatientSuggestions(data || []);
    } catch {
      setPatientSuggestions([]);
    }
  };

  const handleSelectPatient = (p: any) => {
    setPatientCns(p.cns || '');
    setPatientName(p.name || '');
    if (p.birth_date) {
      const parts = p.birth_date.split('-');
      setBirthDate(parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : p.birth_date);
    }
    if (p.gender) {
      setGender(p.gender === 'Feminino' || p.gender === 'F' ? 'F' : 'M');
    }
    if (p.nationality) setNationality(p.nationality);
    setPatientSearch('');
    setPatientSuggestions([]);
  };

  const handleSelectProcedure = (code: string) => {
    setNewProcCode(code);
    const found = COMMON_RAAS_PROCEDURES.find(p => p.code === code);
    if (found) setNewProcName(found.name);
  };

  const handleSelectCid = (code: string) => {
    setCidPrimary(code);
    const found = COMMON_PSYCH_CIDS.find(c => c.code === code);
    if (found) setCidPrimaryDesc(found.desc);
  };

  const handleSelectSecondaryCid = (code: string) => {
    setCidSecondary(code);
    const found = COMMON_PSYCH_CIDS.find(c => c.code === code);
    if (found) setCidSecondaryDesc(found.desc);
    else if (!code) setCidSecondaryDesc('');
  };

  const handleSelectProfessional = (cns: string) => {
    setNewProfCns(cns);
    const found = professionalsList.find(p => p.sus === cns);
    if (found) {
      setNewProfName(found.nome);
      setNewProfCbo(found.cbo || '');
      setNewProfOcc(found.profissao || '');
    }
  };

  const handleAddAction = () => {
    if (!newProcCode) return alert('Selecione um procedimento.');
    if (!newActionDate) return alert('Informe a data da ação.');
    if (!newProfCns) return alert('Informe o CNS do profissional executante.');
    if (!newProfCbo) return alert('Informe o CBO do profissional.');

    const validation = validateRaasAction({
      local: newLocal,
      procedure_code: newProcCode,
      action_date: newActionDate,
      professional_cns: newProfCns,
      professional_cbo: newProfCbo
    });

    const newActionItem: RaasActionItem = {
      id: `act-${Math.random().toString(36).substr(2, 9)}`,
      procedure_code: newProcCode,
      procedure_name: newProcName,
      action_date: newActionDate,
      quantity: Number(newQty) || 1,
      professional_cns: newProfCns,
      professional_name: newProfName,
      professional_cbo: newProfCbo,
      professional_occupation: newProfOcc,
      local: newLocal,
      status: validation.isValid ? 'VALIDADO' : 'ERRO',
      validation_error: validation.error
    };

    setActions([...actions, newActionItem]);
  };

  const handleRemoveAction = (id: string) => {
    setActions(actions.filter(a => a.id !== id));
  };

  const handleToggleActionLocal = (id: string) => {
    setActions(actions.map(act => {
      if (act.id !== id) return act;
      const nextLocal: RaasLocal = act.local === 'C' ? 'T' : act.local === 'T' ? '' : 'C';
      const val = validateRaasAction({ ...act, local: nextLocal });
      return {
        ...act,
        local: nextLocal,
        status: val.isValid ? 'VALIDADO' : 'ERRO',
        validation_error: val.error
      };
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) return alert('Nome do paciente é obrigatório.');
    if (!patientCns.trim()) return alert('CNS do paciente é obrigatório.');
    if (!cidPrimary.trim()) return alert('CID-10 Principal é obrigatório.');

    onSave({
      id: initialData?.id,
      competence,
      establishment_cnes: establishmentCnes,
      establishment_name: establishmentName,
      status,
      patient_cns: patientCns.trim(),
      patient_cpf: patientCpf.trim(),
      patient_name: patientName.trim().toUpperCase(),
      admission_date: admissionDate,
      record_number: recordNumber.trim(),
      birth_date: birthDate,
      gender,
      nationality: nationality.trim().toUpperCase() || 'BRASILEIRA',
      street_situation: streetSituation,
      substance_user: substanceUser,
      origin_code: originCode,
      cid_primary: cidPrimary.trim().toUpperCase(),
      cid_primary_desc: cidPrimaryDesc.trim().toUpperCase(),
      cid_secondary: cidSecondary.trim().toUpperCase() || undefined,
      cid_secondary_desc: cidSecondaryDesc.trim().toUpperCase() || undefined,
      esf_coverage: esfCoverage,
      esf_cnes_team: esfCnesTeam.trim(),
      destination_code: destinationCode,
      notes,
      actions
    });
  };

  return ReactDOM.createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-surface-dark w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col my-auto max-h-[92vh] overflow-hidden animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-[24px]">assignment_turned_in</span>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                {initialData ? 'Editar Registro RAAS Psicossocial' : 'Novo Registro Oficial RAAS Psicossocial'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ministério da Saúde • Sistema de Informações Ambulatoriais (SIA/SUS)
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE FORM) */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1">
          
          {/* CONTEXTO DO SISTEMA & COMPETÊNCIA */}
          <div className="bg-slate-100/70 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                Competência Ativa (Mês/Ano)
              </label>
              <input
                type="text"
                value={competence}
                onChange={e => setCompetence(e.target.value)}
                placeholder="Ex: Março / 2026"
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                CNES Estabelecimento / CAPS
              </label>
              <input
                type="text"
                value={establishmentCnes}
                onChange={e => {
                  setEstablishmentCnes(e.target.value);
                  const found = establishmentsList.find(est => est.cnes === e.target.value);
                  if (found) setEstablishmentName(found.name);
                }}
                placeholder="CNES (7 dígitos)"
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                Nome da Unidade / Estabelecimento
              </label>
              <input
                type="text"
                value={establishmentName}
                onChange={e => setEstablishmentName(e.target.value)}
                placeholder="Nome do CAPS"
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* 1. IDENTIFICAÇÃO DO USUÁRIO & ADMISSÃO */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">1</span>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
                  Identificação do Usuário & Admissão
                </h4>
              </div>
              
              {/* Autocomplete de Pacientes */}
              <div className="relative w-64">
                <input
                  type="text"
                  value={patientSearch}
                  onChange={e => handleSearchPatient(e.target.value)}
                  placeholder="Puxar do cadastro..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary"
                />
                {patientSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-30 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                    {patientSuggestions.map(p => (
                      <div
                        key={p.id}
                        onClick={() => handleSelectPatient(p)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-xs"
                      >
                        <p className="font-bold text-slate-900 dark:text-white">{p.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">CNS: {p.cns}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  CPF / CNS do Paciente *
                </label>
                <input
                  type="text"
                  required
                  value={patientCns}
                  onChange={e => setPatientCns(e.target.value)}
                  placeholder="Cartão SUS (15 dígitos)"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Nome Completo do Paciente *
                </label>
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={e => setPatientName(e.target.value)}
                  placeholder="Nome do usuário"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Nº do Prontuário
                </label>
                <input
                  type="text"
                  value={recordNumber}
                  onChange={e => setRecordNumber(e.target.value)}
                  placeholder="Ex: PRONT-2026-084"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Data de Admissão
                </label>
                <input
                  type="text"
                  value={admissionDate}
                  onChange={e => setAdmissionDate(e.target.value)}
                  placeholder="DD/MM/AAAA"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Data Nasc. (DD/MM/AAAA)
                </label>
                <input
                  type="text"
                  value={birthDate}
                  onChange={e => setBirthDate(e.target.value)}
                  placeholder="DD/MM/AAAA"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Sexo
                </label>
                <select
                  value={gender}
                  onChange={e => setGender(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                  <option value="O">Outro</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Situação de Rua?
                </label>
                <select
                  value={streetSituation ? 'SIM' : 'NAO'}
                  onChange={e => setStreetSituation(e.target.value === 'SIM')}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="NAO">NÃO</option>
                  <option value="SIM">SIM</option>
                </select>
              </div>
            </div>
          </div>

          {/* 2. INFORMAÇÕES CLÍNICAS, ORIGEM E COBERTURA DA REDE */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">2</span>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
                Informações Clínicas, Origem e Cobertura da Rede
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Usuário de Álcool/Drogas?
                </label>
                <select
                  value={substanceUser ? 'SIM' : 'NAO'}
                  onChange={e => setSubstanceUser(e.target.value === 'SIM')}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="NAO">NÃO</option>
                  <option value="SIM">SIM</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Origem do Usuário (SIA/SUS)
                </label>
                <select
                  value={originCode}
                  onChange={e => setOriginCode(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-primary"
                >
                  {RAAS_ORIGIN_OPTIONS.map(opt => (
                    <option key={opt.code} value={opt.label}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Cobertura ESF / Equipe
                </label>
                <div className="flex gap-2">
                  <select
                    value={esfCoverage ? 'SIM' : 'NAO'}
                    onChange={e => setEsfCoverage(e.target.value === 'SIM')}
                    className="w-24 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-2 text-xs text-slate-800 dark:text-white outline-none"
                  >
                    <option value="NAO">NÃO</option>
                    <option value="SIM">SIM</option>
                  </select>
                  <input
                    type="text"
                    disabled={!esfCoverage}
                    value={esfCnesTeam}
                    onChange={e => setEsfCnesTeam(e.target.value)}
                    placeholder={esfCoverage ? "CNES ou INE da equipe" : "Sem cobertura"}
                    className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* Linha Destacada: CID-10 Principal & CID-10 Secundário */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 bg-slate-100/60 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-bold uppercase text-slate-600 dark:text-slate-300">
                    CID-10 Principal *
                  </label>
                  <span className="text-[10px] font-medium text-primary">Diagnóstico Principal</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={cidPrimary}
                    onChange={e => setCidPrimary(e.target.value.toUpperCase())}
                    placeholder="Ex: F32.2"
                    className="w-28 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-primary shadow-xs"
                  />
                  <select
                    value={cidPrimary}
                    onChange={e => handleSelectCid(e.target.value)}
                    className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-2 text-xs text-slate-700 dark:text-slate-300 outline-none shadow-xs"
                  >
                    <option value="">Selecione CID rápido...</option>
                    {COMMON_PSYCH_CIDS.map(c => (
                      <option key={c.code} value={c.code}>{c.code} - {c.desc}</option>
                    ))}
                  </select>
                </div>
                {cidPrimaryDesc && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                    {cidPrimaryDesc}
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-bold uppercase text-slate-600 dark:text-slate-300">
                    CID-10 Secundário
                  </label>
                  <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">Causas Associadas (Opcional)</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={cidSecondary}
                    onChange={e => setCidSecondary(e.target.value.toUpperCase())}
                    placeholder="Ex: F10.2 (Opcional)"
                    className="w-28 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-primary shadow-xs"
                  />
                  <select
                    value={cidSecondary}
                    onChange={e => handleSelectSecondaryCid(e.target.value)}
                    className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-2 text-xs text-slate-700 dark:text-slate-300 outline-none shadow-xs"
                  >
                    <option value="">Nenhum / Selecione CID rápido...</option>
                    {COMMON_PSYCH_CIDS.map(c => (
                      <option key={c.code} value={c.code}>{c.code} - {c.desc}</option>
                    ))}
                  </select>
                </div>
                {cidSecondaryDesc && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                    {cidSecondaryDesc}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Destino do Usuário
                </label>
                <select
                  value={destinationCode}
                  onChange={e => setDestinationCode(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-primary"
                >
                  {RAAS_DESTINATION_OPTIONS.map(opt => (
                    <option key={opt.code} value={opt.label}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Status do Registro
                </label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Ativo">Ativo (Aguardando Produção)</option>
                  <option value="Finalizado">Finalizado</option>
                  <option value="Processado SIA">Processado SIA</option>
                </select>
              </div>
            </div>
          </div>

          {/* 3. DADOS DAS AÇÕES REALIZADAS (GRADE DE DIGITAÇÃO DE PRODUÇÃO) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">3</span>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
                Dados das Ações Realizadas (Grade de Digitação de Produção)
              </h4>
            </div>

            {/* Painel Amarelo: Inclusão Passo a Passo de Nova Ação */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-3">
              <p className="text-[11px] font-bold uppercase text-amber-700 dark:text-amber-400 tracking-wider">
                Campos para Inclusão de Nova Ação (Passo a Passo de Digitação):
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-2.5 items-end">
                {/* Procedimento */}
                <div className="md:col-span-4">
                  <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                    Procedimento (SIGTAP 03.01.08)
                  </label>
                  <select
                    value={newProcCode}
                    onChange={e => handleSelectProcedure(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none"
                  >
                    {COMMON_RAAS_PROCEDURES.map(p => (
                      <option key={p.code} value={p.code}>{p.code} - {p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Data Ação */}
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                    Data Ação
                  </label>
                  <input
                    type="text"
                    value={newActionDate}
                    onChange={e => setNewActionDate(e.target.value)}
                    placeholder="DD/MM/AAAA"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none"
                  />
                </div>

                {/* Qtd */}
                <div className="md:col-span-1">
                  <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                    Qtd
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newQty}
                    onChange={e => setNewQty(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-2 text-xs text-center text-slate-800 dark:text-white outline-none"
                  />
                </div>

                {/* Profissional CNS */}
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                    Profissional CNS
                  </label>
                  {professionalsList.length > 0 ? (
                    <select
                      value={newProfCns}
                      onChange={e => handleSelectProfessional(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-2 text-xs text-slate-800 dark:text-white outline-none"
                    >
                      <option value="">Selecione...</option>
                      {professionalsList.map(pr => (
                        <option key={pr.sus} value={pr.sus}>{pr.nome} ({pr.sus})</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={newProfCns}
                      onChange={e => setNewProfCns(e.target.value)}
                      placeholder="CNS do Prof."
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-2 text-xs outline-none"
                    />
                  )}
                </div>

                {/* Local (C ou T) - Campo Obrigatório */}
                <div className="md:col-span-1">
                  <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                    Local *
                  </label>
                  <select
                    value={newLocal}
                    onChange={e => setNewLocal(e.target.value as any)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-2 text-xs font-bold text-center text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-primary"
                    title="C = CAPS, T = Território"
                  >
                    <option value="C">C (CAPS)</option>
                    <option value="T">T (Território)</option>
                    <option value="">[Vazio - Testar Erro]</option>
                  </select>
                </div>

                {/* Botão Incluir */}
                <div className="md:col-span-2">
                  <button
                    type="button"
                    onClick={handleAddAction}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    [ INCLUIR ]
                  </button>
                </div>
              </div>
            </div>

            {/* Grade de Ações Inseridas */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-surface-dark">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2.5 px-3">Procedimento</th>
                    <th className="py-2.5 px-3">Data</th>
                    <th className="py-2.5 px-2 text-center">Qtd</th>
                    <th className="py-2.5 px-3">Profissional / CBO</th>
                    <th className="py-2.5 px-2 text-center">Local (C/T)</th>
                    <th className="py-2.5 px-3 text-center">Status no Sistema</th>
                    <th className="py-2.5 px-2 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {actions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400">
                        Nenhuma ação na grade. Use o painel acima para incluir atendimentos.
                      </td>
                    </tr>
                  ) : (
                    actions.map((act) => {
                      const isItemError = !act.local || (act.local !== 'C' && act.local !== 'T') || act.status === 'ERRO';
                      return (
                        <tr 
                          key={act.id} 
                          className={`transition-colors ${
                            isItemError
                              ? 'bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 font-medium'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <td className="py-2 px-3 font-mono">
                            <span className="font-bold text-primary">{act.procedure_code}</span>
                            <div className="text-[10px] text-slate-500 truncate max-w-xs">{act.procedure_name}</div>
                          </td>
                          <td className="py-2 px-3 font-mono">{act.action_date}</td>
                          <td className="py-2 px-2 text-center font-bold">{act.quantity}</td>
                          <td className="py-2 px-3">
                            <div className="font-mono text-[11px]">{act.professional_cns}</div>
                            <div className="text-[10px] text-slate-400">CBO: {act.professional_cbo}</div>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleActionLocal(act.id)}
                              className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                                act.local === 'C'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                                  : act.local === 'T'
                                  ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300'
                                  : 'bg-red-500 text-white animate-pulse'
                              }`}
                              title="Clique para alternar Local ('C', 'T' ou pendente)"
                            >
                              {act.local || '[ ]'}
                            </button>
                          </td>
                          <td className="py-2 px-3 text-center">
                            {isItemError ? (
                              <span className="text-[10px] font-bold text-red-600 dark:text-red-400 flex items-center justify-center gap-1">
                                <span className="material-symbols-outlined text-[13px]">warning</span>
                                ERRO: Faltou 'C' ou 'T'
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                                <span className="material-symbols-outlined text-[13px]">check_circle</span>
                                VALIDADO (Linha Branca)
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveAction(act.id)}
                              className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                              title="Remover ação"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* OBSERVAÇÕES */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
              Observações / Notas do Prontuário
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Anotações clínicas ou complementares..."
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none resize-none"
            />
          </div>

          {/* FOOTER ACTIONS */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-md flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">save</span>
              Salvar Registro RAAS
            </button>
          </div>

        </form>
      </div>
    </div>,
    document.body
  );
};

export default RaasFormModal;
