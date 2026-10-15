export type RaasStatus = 'Ativo' | 'Finalizado' | 'Processado SIA';

export type RaasLocal = 'C' | 'T' | ''; // C = CAPS, T = Território

export interface RaasActionItem {
  id: string;
  procedure_code: string;
  procedure_name: string;
  action_date: string; // YYYY-MM-DD or DD/MM/YYYY
  quantity: number;
  professional_cns: string;
  professional_name?: string;
  professional_cbo: string;
  professional_occupation?: string;
  local: RaasLocal; // Mandatory: 'C' or 'T'
  status?: 'VALIDADO' | 'ERRO';
  validation_error?: string;
}

export interface RaasRecord {
  id: string;
  // Contexto / Cabeçalho
  competence: string; // MM/AAAA (ex: "03/2026")
  establishment_cnes: string;
  establishment_name: string;
  status: RaasStatus;
  
  // Bloco 1: Identificação & Admissão
  patient_cns: string;
  patient_cpf?: string;
  patient_name: string;
  admission_date: string; // DD/MM/AAAA
  record_number: string; // Prontuário
  birth_date: string; // DD/MM/AAAA
  gender: 'M' | 'F' | 'O';
  nationality: string; // Padrão "Brasileira"
  street_situation: boolean; // Situação de rua (SIM/NÃO)

  // Bloco 2: Informações Clínicas, Origem e Cobertura da Rede
  substance_user: boolean; // Usuário de Álcool/Drogas (SIM/NÃO)
  origin_code: string; // Código de Origem SIA/SUS (ex: "02 - Atenção Básica / ESF")
  cid_primary: string; // Código CID-10 Principal (ex: "F32.2")
  cid_primary_desc: string; // Descrição (ex: "Episódio Depressivo Grave")
  cid_secondary?: string; // CID Secundário (opcional)
  cid_secondary_desc?: string; // Descrição do CID Secundário (opcional)
  esf_coverage: boolean; // Possui cobertura ESF
  esf_cnes_team?: string; // CNES ou INE da equipe ESF
  destination_code: string; // Destino do usuário (ex: "1 - Permanência / Acompanhamento")
  
  // Bloco 3: Grade de Ações Realizadas
  actions: RaasActionItem[];

  // Metadados
  created_at?: string;
  updated_at?: string;
  notes?: string;
}

export const RAAS_ORIGIN_OPTIONS = [
  { code: '01', label: '01 - Demanda Espontânea' },
  { code: '02', label: '02 - Atenção Básica / ESF' },
  { code: '03', label: '03 - Urgência / Emergência (UPA/Pronto Socorro)' },
  { code: '04', label: '04 - Outro CAPS' },
  { code: '05', label: '05 - Hospital Geral' },
  { code: '06', label: '06 - Hospital Psiquiátrico' },
  { code: '07', label: '07 - Sistema Judiciário / Conselho Tutelar' },
  { code: '08', label: '08 - CAPS AD' },
  { code: '09', label: '09 - CAPS i' },
  { code: '99', label: '99 - Outros Serviços de Saúde' },
];

export const RAAS_DESTINATION_OPTIONS = [
  { code: '1', label: '1 - Permanência / Acompanhamento no CAPS' },
  { code: '2', label: '2 - Alta Clínica' },
  { code: '3', label: '3 - Transferência para outro CAPS' },
  { code: '4', label: '4 - Encaminhamento para Atenção Básica / UBS' },
  { code: '5', label: '5 - Evasão / Abandono de Tratamento' },
  { code: '6', label: '6 - Óbito' },
  { code: '7', label: '7 - Encaminhamento para Internação / Hospital Geral' },
];

export const COMMON_PSYCH_CIDS = [
  { code: 'F32.2', desc: 'Episódio Depressivo Grave sem Sintomas Psicóticos' },
  { code: 'F33.2', desc: 'Transtorno Depressivo Recorrente, Episódio Grave Atual' },
  { code: 'F31.1', desc: 'Transtorno Afetivo Bipolar, Episódio Atual Maníaco' },
  { code: 'F31.3', desc: 'Transtorno Afetivo Bipolar, Episódio Atual Depressivo Leve ou Moderado' },
  { code: 'F20.0', desc: 'Esquizofrenia Paranoide' },
  { code: 'F20.5', desc: 'Esquizofrenia Residual' },
  { code: 'F25.0', desc: 'Transtorno Esquizoafetivo do Tipo Maníaco' },
  { code: 'F10.2', desc: 'Transtornos Mentais Devidos ao Uso de Álcool - Síndrome de Dependência' },
  { code: 'F19.2', desc: 'Transtornos Mentais Devidos ao Uso de Múltiplas Drogas - Síndrome de Dependência' },
  { code: 'F41.0', desc: 'Transtorno de Pânico (Ansiedade Paroxística Episódica)' },
  { code: 'F41.2', desc: 'Transtorno Misto Ansioso e Depressivo' },
  { code: 'F60.3', desc: 'Transtorno de Personalidade Emocionalmente Instável (Borderline)' },
  { code: 'F84.0', desc: 'Autismo Infantil' },
  { code: 'F90.0', desc: 'Distúrbios da Atividade e da Atenção (TDAH)' },
];

export const COMMON_RAAS_PROCEDURES = [
  { code: '03.01.08.020-8', name: 'Atendimento Individual em CAPS' },
  { code: '03.01.08.021-6', name: 'Atendimento em Grupo em CAPS' },
  { code: '03.01.08.022-4', name: 'Atendimento Familiar em CAPS' },
  { code: '03.01.08.023-2', name: 'Práticas Corporais em CAPS' },
  { code: '03.01.08.024-0', name: 'Acolhimento Noturno em CAPS' },
  { code: '03.01.08.025-9', name: 'Atendimento Domiciliar / Território em CAPS' },
  { code: '03.01.08.026-7', name: 'Acolhimento Inicial em CAPS' },
  { code: '03.01.08.027-5', name: 'Promoção de Contratualidade / Convivência' },
  { code: '03.01.08.028-3', name: 'Acompanhamento de Paciente em Crise' },
  { code: '03.01.08.029-1', name: 'Oficinas Terapêuticas em CAPS' },
];
