import { supabase } from '../lib/supabase';
import { RaasRecord, RaasActionItem } from '../types/raas';

const LOCAL_STORAGE_KEY = 'raas_psychosocial_records_v1';

// Normaliza data para formato aceito pelo PostgreSQL (YYYY-MM-DD ou null)
export const toDatabaseDate = (val?: string | null): string | null => {
  if (!val || typeof val !== 'string') return null;
  const clean = val.trim();
  if (!clean || clean === 'N/A') return null;

  // Se já for ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;

  // Se for DD/MM/AAAA ou DD-MM-AAAA
  const parts = clean.includes('/') ? clean.split('/') : clean.split('-');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    if (d && m && y && !isNaN(Number(d)) && !isNaN(Number(m)) && !isNaN(Number(y))) {
      return `${y.padStart(4, '20')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }

  return null;
};

// Converte data ISO do banco (YYYY-MM-DD) para formato brasileiro (DD/MM/AAAA) para a interface
export const toUiDate = (val?: string | null): string => {
  if (!val || typeof val !== 'string') return '';
  const clean = val.trim();
  if (!clean || clean === 'N/A') return '';

  // Se já estiver em DD/MM/AAAA
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) return clean;

  // Se vier no formato ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
    const datePart = clean.substring(0, 10);
    const [y, m, d] = datePart.split('-');
    return `${d}/${m}/${y}`;
  }

  return clean;
};

// Seed demo data matching the official reference image
const SEED_DATA: RaasRecord[] = [
  {
    id: 'raas-demo-001',
    competence: 'Março / 2026',
    establishment_cnes: '1234567',
    establishment_name: 'CAPS I VIVER BEM',
    status: 'Ativo',
    patient_cns: '898001122334455',
    patient_cpf: '123.456.789-00',
    patient_name: 'JOÃO DA SILVA (DADOS FICTÍCIOS DE TESTE)',
    admission_date: '15/03/2026',
    record_number: 'PRONT-2026-084',
    birth_date: '12/05/1988',
    gender: 'M',
    nationality: 'BRASILEIRA',
    street_situation: false,
    substance_user: false,
    origin_code: '02 - Atenção Básica / ESF',
    cid_primary: 'F32.2',
    cid_primary_desc: 'EPISÓDIO DEPRESSIVO GRAVE',
    cid_secondary: 'F10.2',
    cid_secondary_desc: 'TRANSTORNOS MENTAIS DEVIDOS AO USO DE ÁLCOOL',
    esf_coverage: false,
    esf_cnes_team: 'NÃO POSSUI COBERTURA ESF',
    destination_code: '1 - PERMANÊNCIA / ACOMPANHAMENTO',
    notes: 'Paciente acolhido em acompanhamento regular multiprofissional.',
    created_at: new Date().toISOString(),
    actions: [
      {
        id: 'act-1',
        procedure_code: '03.01.08.020-8',
        procedure_name: 'Atendimento Individual em CAPS',
        action_date: '18/03/2026',
        quantity: 1,
        professional_cns: '898000123456789',
        professional_name: 'Dr. Lucas Arantes',
        professional_cbo: '225133',
        professional_occupation: 'Médico Psiquiatra',
        local: 'C',
        status: 'VALIDADO'
      },
      {
        id: 'act-2',
        procedure_code: '03.01.08.021-6',
        procedure_name: 'Atendimento em Grupo em CAPS',
        action_date: '20/03/2026',
        quantity: 1,
        professional_cns: '898000987654321',
        professional_name: 'Enf. Mariana Souza',
        professional_cbo: '223505',
        professional_occupation: 'Enfermeiro',
        local: '', // Intencionalmente vazio para demonstrar a regra técnica de validação!
        status: 'ERRO',
        validation_error: "Faltou informar o Local ('C' para CAPS ou 'T' para Território)"
      },
      {
        id: 'act-3',
        procedure_code: '03.01.08.022-4',
        procedure_name: 'Atendimento Familiar em CAPS',
        action_date: '22/03/2026',
        quantity: 1,
        professional_cns: '898000555444333',
        professional_name: 'Carla Nogueira',
        professional_cbo: '251605',
        professional_occupation: 'Assistente Social',
        local: 'C',
        status: 'VALIDADO'
      }
    ]
  }
];

export const validateRaasAction = (item: Partial<RaasActionItem>): { isValid: boolean; error?: string } => {
  if (!item.local || (item.local !== 'C' && item.local !== 'T')) {
    return { isValid: false, error: "Faltou informar o Local ('C' para CAPS ou 'T' para Território)" };
  }
  if (!item.procedure_code) {
    return { isValid: false, error: "Procedimento não informado" };
  }
  if (!item.action_date) {
    return { isValid: false, error: "Data do atendimento não informada" };
  }
  if (!item.professional_cns) {
    return { isValid: false, error: "CNS do profissional executante obrigatório" };
  }
  if (!item.professional_cbo) {
    return { isValid: false, error: "CBO do profissional obrigatório" };
  }
  return { isValid: true };
};

export const getStoredLocalRecords = (): RaasRecord[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(SEED_DATA));
      return SEED_DATA;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading localStorage for RAAS:', err);
    return SEED_DATA;
  }
};

export const saveStoredLocalRecords = (records: RaasRecord[]): void => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.error('Error saving to localStorage for RAAS:', err);
  }
};

export const fetchRaasRecords = async (): Promise<RaasRecord[]> => {
  try {
    const { data: dbRecords, error } = await supabase
      .from('raas_psychosocial')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !dbRecords) {
      console.warn('Não foi possível ler raas_psychosocial do Supabase (usando local):', error?.message);
      return getStoredLocalRecords();
    }

    const fullRecords: RaasRecord[] = [];
    for (const record of dbRecords) {
      const { data: items } = await supabase
        .from('raas_psychosocial_items')
        .select('*')
        .eq('raas_id', record.id)
        .order('action_date', { ascending: true });

      const mappedActions: RaasActionItem[] = (items || []).map((it: any) => {
        const uiActionDate = toUiDate(it.action_date);
        const val = validateRaasAction({
          local: it.local,
          procedure_code: it.procedure_code,
          action_date: uiActionDate,
          professional_cns: it.professional_cns,
          professional_cbo: it.professional_cbo
        });
        return {
          id: it.id,
          procedure_code: it.procedure_code,
          procedure_name: it.procedure_name || '',
          action_date: uiActionDate,
          quantity: it.quantity || 1,
          professional_cns: it.professional_cns,
          professional_name: it.professional_name || '',
          professional_cbo: it.professional_cbo,
          professional_occupation: it.professional_occupation || '',
          local: it.local,
          status: val.isValid ? 'VALIDADO' : 'ERRO',
          validation_error: val.error
        };
      });

      fullRecords.push({
        id: record.id,
        competence: record.competence,
        establishment_cnes: record.establishment_cnes,
        establishment_name: record.establishment_name || '',
        status: record.status || 'Ativo',
        patient_cns: record.patient_cns,
        patient_cpf: record.patient_cpf || '',
        patient_name: record.patient_name,
        admission_date: toUiDate(record.admission_date),
        record_number: record.record_number || '',
        birth_date: toUiDate(record.birth_date),
        gender: record.gender || 'M',
        nationality: record.nationality || 'Brasileira',
        street_situation: !!record.street_situation,
        substance_user: !!record.substance_user,
        origin_code: record.origin_code || '',
        cid_primary: record.cid_primary,
        cid_primary_desc: record.cid_primary_desc || '',
        cid_secondary: record.cid_secondary || '',
        cid_secondary_desc: record.cid_secondary_desc || '',
        esf_coverage: !!record.esf_coverage,
        esf_cnes_team: record.esf_cnes_team || '',
        destination_code: record.destination_code || '',
        notes: record.notes || '',
        created_at: record.created_at,
        actions: mappedActions
      });
    }

    if (fullRecords.length === 0) {
      // Se a tabela do banco estiver vazia, verifica se o usuário tinha salvo algo no local para sincronizar
      const local = getStoredLocalRecords();
      const localUserRecords = local.filter(l => !l.id.startsWith('raas-demo-'));
      if (localUserRecords.length > 0) {
        // Tenta sincronizar os registros do usuário que estavam salvos localmente
        for (const loc of localUserRecords) {
          try {
            await saveRaasRecord({ ...loc, id: undefined });
          } catch (syncErr) {
            console.warn('Erro ao sincronizar registro local para o BD:', syncErr);
          }
        }
        // Recarrega após sincronização
        return fetchRaasRecords();
      }
      return local;
    }

    // Mantém o cache local atualizado com os dados reais do banco
    saveStoredLocalRecords(fullRecords);
    return fullRecords;
  } catch (err) {
    console.warn('Fallback to local storage for RAAS:', err);
    return getStoredLocalRecords();
  }
};

export const saveRaasRecord = async (record: Omit<RaasRecord, 'id'> & { id?: string }): Promise<RaasRecord> => {
  const isNew = !record.id || record.id.startsWith('raas-local-') || record.id.startsWith('raas-demo-');
  const tempId = record.id || `raas-local-${Date.now()}`;

  // Valida e formata ações
  const evaluatedActions: RaasActionItem[] = (record.actions || []).map(action => {
    const val = validateRaasAction(action);
    return {
      ...action,
      id: action.id || `act-${Math.random().toString(36).substr(2, 9)}`,
      action_date: toUiDate(action.action_date) || action.action_date,
      status: val.isValid ? 'VALIDADO' : 'ERRO',
      validation_error: val.error
    };
  });

  const fullRecord: RaasRecord = {
    ...record,
    id: tempId,
    admission_date: toUiDate(record.admission_date) || record.admission_date,
    birth_date: toUiDate(record.birth_date) || record.birth_date,
    actions: evaluatedActions,
    updated_at: new Date().toISOString()
  };

  // Prepara payload com datas ISO (YYYY-MM-DD ou null) aceitas pelo PostgreSQL
  const dbPayload = {
    competence: fullRecord.competence,
    establishment_cnes: fullRecord.establishment_cnes,
    establishment_name: fullRecord.establishment_name,
    status: fullRecord.status,
    patient_cns: fullRecord.patient_cns,
    patient_cpf: fullRecord.patient_cpf || null,
    patient_name: fullRecord.patient_name,
    admission_date: toDatabaseDate(fullRecord.admission_date),
    record_number: fullRecord.record_number || null,
    birth_date: toDatabaseDate(fullRecord.birth_date),
    gender: fullRecord.gender || 'M',
    nationality: fullRecord.nationality || 'BRASILEIRA',
    street_situation: !!fullRecord.street_situation,
    substance_user: !!fullRecord.substance_user,
    origin_code: fullRecord.origin_code || null,
    cid_primary: fullRecord.cid_primary,
    cid_primary_desc: fullRecord.cid_primary_desc || null,
    cid_secondary: fullRecord.cid_secondary || null,
    cid_secondary_desc: fullRecord.cid_secondary_desc || null,
    esf_coverage: !!fullRecord.esf_coverage,
    esf_cnes_team: fullRecord.esf_cnes_team || null,
    destination_code: fullRecord.destination_code || null,
    notes: fullRecord.notes || null
  };

  let savedId = tempId;

  try {
    if (isNew) {
      let insertResult = await supabase
        .from('raas_psychosocial')
        .insert([dbPayload])
        .select()
        .single();

      if (insertResult.error && (insertResult.error.message?.includes('cid_secondary_desc') || insertResult.error.message?.includes('column') || insertResult.error.code === 'PGRST204')) {
        console.warn('Tentando inserir sem coluna cid_secondary_desc (não migrada no BD):', insertResult.error.message);
        const { cid_secondary_desc, ...payloadWithoutDesc } = dbPayload;
        insertResult = await supabase
          .from('raas_psychosocial')
          .insert([payloadWithoutDesc])
          .select()
          .single();

        if (insertResult.error && (insertResult.error.message?.includes('cid_secondary') || insertResult.error.message?.includes('column'))) {
          const { cid_secondary, ...payloadWithoutCids } = payloadWithoutDesc;
          insertResult = await supabase
            .from('raas_psychosocial')
            .insert([payloadWithoutCids])
            .select()
            .single();
        }
      }

      if (insertResult.error) {
        console.error('Erro ao inserir raas_psychosocial no Supabase:', insertResult.error);
        throw new Error(insertResult.error.message || 'Falha ao salvar paciente no banco de dados');
      }

      if (insertResult.data) {
        savedId = insertResult.data.id;
        fullRecord.id = insertResult.data.id;
      }
    } else {
      let updateResult = await supabase
        .from('raas_psychosocial')
        .update(dbPayload)
        .eq('id', fullRecord.id);

      if (updateResult.error && (updateResult.error.message?.includes('cid_secondary_desc') || updateResult.error.message?.includes('column') || updateResult.error.code === 'PGRST204')) {
        console.warn('Tentando atualizar sem coluna cid_secondary_desc (não migrada no BD):', updateResult.error.message);
        const { cid_secondary_desc, ...payloadWithoutDesc } = dbPayload;
        updateResult = await supabase
          .from('raas_psychosocial')
          .update(payloadWithoutDesc)
          .eq('id', fullRecord.id);

        if (updateResult.error && (updateResult.error.message?.includes('cid_secondary') || updateResult.error.message?.includes('column'))) {
          const { cid_secondary, ...payloadWithoutCids } = payloadWithoutDesc;
          updateResult = await supabase
            .from('raas_psychosocial')
            .update(payloadWithoutCids)
            .eq('id', fullRecord.id);
        }
      }

      if (updateResult.error) {
        console.error('Erro ao atualizar raas_psychosocial no Supabase:', updateResult.error);
        throw new Error(updateResult.error.message || 'Falha ao atualizar registro no banco de dados');
      }

      savedId = fullRecord.id;
      // Remove itens antigos para reinserir atualizados
      await supabase.from('raas_psychosocial_items').delete().eq('raas_id', savedId);
    }

    // Inserção das ações na tabela de itens com action_date em ISO
    if (savedId && !savedId.startsWith('raas-local-') && !savedId.startsWith('raas-demo-')) {
      const itemsPayload = evaluatedActions.map(act => ({
        raas_id: savedId,
        procedure_code: act.procedure_code,
        procedure_name: act.procedure_name || null,
        action_date: toDatabaseDate(act.action_date) || new Date().toISOString().split('T')[0],
        quantity: act.quantity || 1,
        professional_cns: act.professional_cns,
        professional_name: act.professional_name || null,
        professional_cbo: act.professional_cbo,
        professional_occupation: act.professional_occupation || null,
        local: act.local || '',
        status: act.status || 'VALIDADO'
      }));

      if (itemsPayload.length > 0) {
        const { error: itemsError } = await supabase
          .from('raas_psychosocial_items')
          .insert(itemsPayload);

        if (itemsError) {
          console.error('Erro ao inserir raas_psychosocial_items no Supabase:', itemsError);
          throw new Error(itemsError.message || 'Falha ao salvar ações no banco de dados');
        }
      }
    }
  } catch (dbErr: any) {
    console.error('Falha de persistência no Supabase:', dbErr);
    // Salva localmente em caso de queda de rede, mas lança o erro para alertar a interface
    const locals = getStoredLocalRecords();
    const existingIdx = locals.findIndex(l => l.id === fullRecord.id);
    if (existingIdx >= 0) {
      locals[existingIdx] = fullRecord;
    } else {
      locals.unshift(fullRecord);
    }
    saveStoredLocalRecords(locals);
    throw dbErr;
  }

  // Atualiza cache local sincronizado
  const locals = getStoredLocalRecords();
  const existingIdx = locals.findIndex(l => l.id === fullRecord.id);
  if (existingIdx >= 0) {
    locals[existingIdx] = fullRecord;
  } else {
    locals.unshift(fullRecord);
  }
  saveStoredLocalRecords(locals);

  return fullRecord;
};

export const deleteRaasRecord = async (id: string): Promise<void> => {
  try {
    if (!id.startsWith('raas-local-') && !id.startsWith('raas-demo-')) {
      const { error } = await supabase.from('raas_psychosocial').delete().eq('id', id);
      if (error) {
        console.error('Erro ao excluir do Supabase:', error);
        throw error;
      }
    }
  } catch (err) {
    console.warn('Exclusão remota falhou, removendo do armazenamento local:', err);
  }

  const locals = getStoredLocalRecords().filter(l => l.id !== id);
  saveStoredLocalRecords(locals);
};
