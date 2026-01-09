
import { saveAs } from 'file-saver';

interface PatientExportData {
  cns: string;
  name: string;
  birth_date: string;
  gender: string;
  cod_municipio?: string;
  nationality: string;
  race: string;
  zip_code: string;
  street_code: string;
  street: string;
  number: string;
  neighborhood: string;
  phone: string;
}

// Helper para alinhar à direita (preencher com espaços à esquerda)
const alignRight = (value: string, length: number, padChar: string = ' '): string => {
  // Remove quebras de linha e tabulações, normaliza espaços
  const str = value ? String(value).replace(/[\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim() : '';
  return str.slice(0, length).padStart(length, padChar);
};

// Helper para alinhar à esquerda (preencher com espaços à direita)
const alignLeft = (value: string, length: number, padChar: string = ' '): string => {
  // Remove quebras de linha e tabulações, normaliza espaços
  const str = value ? String(value).replace(/[\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim() : '';
  return str.slice(0, length).padEnd(length, padChar);
};

// Mappers simples
const getRaceCode = (race: string): string => {
  const map: Record<string, string> = {
    'Branca': '01',
    'Preta': '02',
    'Parda': '03',
    'Amarela': '04',
    'Indígena': '05',
    'Indigena': '05',
    'Sem Informação': '99'
  };
  // Busca parcial ou exata
  const key = Object.keys(map).find(k => race?.includes(k));
  return key ? map[key] : '';
};

const getNationalityCode = (nat: string): string => {
  if (nat?.toLowerCase().includes('brasileira') || nat?.toLowerCase().includes('brasil')) return '010';
  return ''; 
};

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  // Entrada: YYYY-MM-DD (do banco) -> Saída: AAAAMMDD
  return dateStr.replace(/-/g, '');
};

const formatGender = (gender: string): string => {
  if (gender?.toLowerCase().startsWith('m')) return 'M';
  if (gender?.toLowerCase().startsWith('f')) return 'F';
  return '';
};

export const generateBpaITxt = (patients: PatientExportData[]) => {
  let content = '';

  patients.forEach(p => {
    let line = '';

    // 1-15 (15): SUS
    line += alignRight(p.cns?.replace(/\D/g, ''), 15);

    // 16-45 (30): Paciente (Alinhado à esquerda)
    // Note: The length must be exactly 30 characters.
    line += alignLeft(p.name, 30);

    // 46-53 (8): Nascimento (AAAAMMDD)
    line += alignRight(formatDate(p.birth_date), 8);

    // 54 (1): Sexo
    line += alignRight(formatGender(p.gender), 1);

    // 55-60 (6): Cod. Municipio (Default 150070 apenas se for Anajás ou não informado em contexto específico, mas aqui mantemos o dado se existir, senão vazio ou default conforme lógica de negócio. Mantendo fallback '150070' pois foi regra explicita anterior, mas se vier vazio do objeto e não tiver default, vai vazio)
    // O objeto p.cod_municipio já vem tratado do frontend. Se for undefined, usamos '150070' se for a regra, ou '' se a nova regra "deixe em branco" prevalecer.
    // A regra "Onde não houver dado... deixe em branco" conflita levemente com "Cod. Municipio... popule... Anajás".
    // Vou assumir que se p.cod_municipio estiver vazio, deve ser '150070' (Anajás) pois é o padrão do sistema solicitado, a menos que explicitamente removido.
    // Mas vou garantir que se for null/undefined E não for Anajás (impossivel saber aqui), vai o default.
    // Melhor: p.cod_municipio vem do frontend. Se lá estiver vazio, aqui fica vazio.
    // O frontend já coloca '150070' se for Anajás.
    // Vou usar p.cod_municipio || '' para respeitar "em branco", mas se o frontend mandou '150070', vai '150070'.
    line += alignRight(p.cod_municipio || '', 6);

    // 61-63 (3): Nacionalidade
    line += alignRight(getNationalityCode(p.nationality), 3);

    // 64-65 (2): Raça/Cor
    line += alignRight(getRaceCode(p.race), 2);

    // 66-77 (12): CEP
    line += alignRight(p.zip_code?.replace(/\D/g, ''), 12);

    // 78-80 (3): Cod. Lograd.
    line += alignRight(p.street_code, 3);

    // 81-110 (30): Logradouro
    line += alignRight(p.street, 30);

    // 111-125 (15): Nº
    line += alignRight(p.number, 15);

    // 126-155 (30): Bairro
    line += alignRight(p.neighborhood, 30);

    // 156-166 (11): Telefone
    line += alignRight(p.phone?.replace(/\D/g, ''), 11);

    content += line + '\n';
  });

  // Trigger Download
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  saveAs(blob, `BPA_EXPORT_${new Date().toISOString().slice(0,10)}.txt`);
};
