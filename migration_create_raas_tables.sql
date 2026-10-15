-- =================================================================================================
-- MIGRATION: CREATE RAAS (REGISTRO DAS AÇÕES AMBULATORIAIS DE SAÚDE - PSICOSSOCIAL / CAPS) TABLES
-- =================================================================================================

-- 1. TABELA PRINCIPAL: raas_psychosocial (Cabeçalho, Identificação do Paciente e Dados Clínicos)
CREATE TABLE IF NOT EXISTS public.raas_psychosocial (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  competence TEXT NOT NULL, -- Ex: 'Março / 2026' ou '03/2026'
  establishment_cnes TEXT NOT NULL,
  establishment_name TEXT,
  status TEXT DEFAULT 'Ativo', -- 'Ativo', 'Finalizado', 'Processado SIA'
  
  -- Bloco 1: Identificação & Admissão
  patient_cns TEXT NOT NULL,
  patient_cpf TEXT,
  patient_name TEXT NOT NULL,
  admission_date DATE,
  record_number TEXT, -- Nº do Prontuário
  birth_date DATE,
  gender TEXT DEFAULT 'M', -- 'M', 'F', 'O'
  nationality TEXT DEFAULT 'Brasileira',
  street_situation BOOLEAN DEFAULT FALSE, -- Situação de Rua (Sim/Não)

  -- Bloco 2: Informações Clínicas & Rede
  substance_user BOOLEAN DEFAULT FALSE, -- Usuário de Álcool/Drogas
  origin_code TEXT, -- Origem do Usuário (ex: '02 - Atenção Básica / ESF')
  cid_primary TEXT NOT NULL, -- CID-10 Principal
  cid_primary_desc TEXT,
  cid_secondary TEXT,
  cid_secondary_desc TEXT,
  esf_coverage BOOLEAN DEFAULT FALSE,
  esf_cnes_team TEXT,
  destination_code TEXT, -- Destino (ex: '1 - Permanência / Acompanhamento')
  notes TEXT,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Garantir que colunas existentes tenham tipo permissivo TEXT e novas colunas existam
DO $$
BEGIN
  ALTER TABLE public.raas_psychosocial ADD COLUMN IF NOT EXISTS cid_secondary TEXT;
  ALTER TABLE public.raas_psychosocial ADD COLUMN IF NOT EXISTS cid_secondary_desc TEXT;
  ALTER TABLE public.raas_psychosocial ALTER COLUMN competence TYPE TEXT;
  ALTER TABLE public.raas_psychosocial ALTER COLUMN establishment_cnes TYPE TEXT;
  ALTER TABLE public.raas_psychosocial ALTER COLUMN patient_cns TYPE TEXT;
  ALTER TABLE public.raas_psychosocial ALTER COLUMN patient_cpf TYPE TEXT;
  ALTER TABLE public.raas_psychosocial ALTER COLUMN record_number TYPE TEXT;
  ALTER TABLE public.raas_psychosocial ALTER COLUMN cid_primary TYPE TEXT;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Índices para buscas rápidas
CREATE INDEX IF NOT EXISTS idx_raas_cnes ON public.raas_psychosocial(establishment_cnes);
CREATE INDEX IF NOT EXISTS idx_raas_patient_cns ON public.raas_psychosocial(patient_cns);
CREATE INDEX IF NOT EXISTS idx_raas_competence ON public.raas_psychosocial(competence);
CREATE INDEX IF NOT EXISTS idx_raas_status ON public.raas_psychosocial(status);

-- 2. TABELA DE ITENS / GRADE DE DIGITAÇÃO DE AÇÕES: raas_psychosocial_items
CREATE TABLE IF NOT EXISTS public.raas_psychosocial_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  raas_id UUID REFERENCES public.raas_psychosocial(id) ON DELETE CASCADE NOT NULL,
  procedure_code TEXT NOT NULL, -- Código SIGTAP (ex: '03.01.08.020-8')
  procedure_name TEXT,
  action_date DATE NOT NULL,
  quantity INTEGER DEFAULT 1,
  professional_cns TEXT NOT NULL,
  professional_name TEXT,
  professional_cbo TEXT NOT NULL,
  professional_occupation TEXT,
  local TEXT NOT NULL, -- 'C' (CAPS) ou 'T' (Território) - Campo Obrigatório do RAAS!
  status TEXT DEFAULT 'VALIDADO',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_raas_items_raas_id ON public.raas_psychosocial_items(raas_id);
CREATE INDEX IF NOT EXISTS idx_raas_items_proc ON public.raas_psychosocial_items(procedure_code);
CREATE INDEX IF NOT EXISTS idx_raas_items_prof ON public.raas_psychosocial_items(professional_cns);

-- 3. HABILITAR RLS (ROW LEVEL SECURITY)
ALTER TABLE public.raas_psychosocial ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raas_psychosocial_items ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS DE ACESSO (Permissão total para visualização e gravação)
DROP POLICY IF EXISTS "Acesso total a raas_psychosocial para autenticados" ON public.raas_psychosocial;
DROP POLICY IF EXISTS "Acesso total a raas_psychosocial" ON public.raas_psychosocial;
CREATE POLICY "Acesso total a raas_psychosocial" ON public.raas_psychosocial 
  FOR ALL USING (true);

DROP POLICY IF EXISTS "Acesso total a raas_psychosocial_items para autenticados" ON public.raas_psychosocial_items;
DROP POLICY IF EXISTS "Acesso total a raas_psychosocial_items" ON public.raas_psychosocial_items;
CREATE POLICY "Acesso total a raas_psychosocial_items" ON public.raas_psychosocial_items 
  FOR ALL USING (true);
