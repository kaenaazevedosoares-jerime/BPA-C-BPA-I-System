-- ARQUIVO MESTRE DE BANCO DE DADOS - LRPD SYSTEM
-- Data de Atualização: 2025-12-23
-- Descrição: Script completo para configuração do banco de dados (Criação + Migrações)
-- Regras: Idempotente, Seguro (RLS), Comentado em PT-BR.

-- =================================================================================================
-- 1. CONFIGURAÇÃO INICIAL E EXTENSÕES
-- =================================================================================================

DO $$ 
BEGIN 
    -- Verifica e instala extensão pgcrypto (necessária para UUIDs e criptografia)
    IF NOT EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pgcrypto') THEN
        CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    END IF;

    -- Verifica e instala extensão unaccent (necessária para buscas insensíveis a acentos)
    IF NOT EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'unaccent') THEN
        CREATE EXTENSION IF NOT EXISTS "unaccent";
    END IF;
    
    RAISE NOTICE 'Verificação de ambiente e extensões concluída.';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao configurar ambiente: %', SQLERRM;
END $$;

-- =================================================================================================
-- 2. TABELAS DO SISTEMA (Estrutura Base)
-- =================================================================================================

-- 2.1 PERFIS DE USUÁRIO (PROFILES)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  role TEXT DEFAULT 'operator', -- 'admin' ou 'operator'
  permissions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Garantir colunas em caso de migração de tabela existente
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='permissions') THEN
        ALTER TABLE public.profiles ADD COLUMN permissions JSONB DEFAULT '{}'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='email') THEN
        ALTER TABLE public.profiles ADD COLUMN email TEXT;
    END IF;
END $$;

-- 2.2 PACIENTES
CREATE TABLE IF NOT EXISTS public.patients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cns TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  birth_date DATE,
  gender TEXT,
  nationality TEXT,
  race TEXT,
  ethnicity TEXT,
  zip_code TEXT,
  city TEXT,
  street_code TEXT,
  street_type TEXT,
  street TEXT,
  number TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.3 ESTABELECIMENTOS
CREATE TABLE IF NOT EXISTS public.establishments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cnes TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  social_reason TEXT,
  responsible_tech TEXT,
  zip_code TEXT,
  city TEXT,
  state TEXT,
  neighborhood TEXT,
  street TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.4 CATÁLOGO DE PROCEDIMENTOS
CREATE TABLE IF NOT EXISTS public.procedures_catalog (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
-- Garantir coluna category
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='procedures_catalog' AND column_name='category') THEN
        ALTER TABLE public.procedures_catalog ADD COLUMN category TEXT;
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_procedures_catalog_category ON public.procedures_catalog(category);

-- 2.5 CATÁLOGO DE CBOs
CREATE TABLE IF NOT EXISTS public.cbos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  occupation TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.6 PROFISSIONAIS
CREATE TABLE IF NOT EXISTS public.profissionais (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sus VARCHAR(15) UNIQUE NOT NULL,
  nome VARCHAR(255) NOT NULL,
  profissao VARCHAR(100) NOT NULL,
  cbo VARCHAR(10),
  endereco TEXT,
  telefone VARCHAR(20),
  email VARCHAR(255),
  access_password VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
COMMENT ON COLUMN public.profissionais.access_password IS 'Senha de acesso para lançamento de produção individual';

CREATE INDEX IF NOT EXISTS idx_profissionais_nome ON public.profissionais(nome);
CREATE INDEX IF NOT EXISTS idx_profissionais_sus ON public.profissionais(sus);

-- 2.7 PRODUÇÃO DE PROCEDIMENTOS (BPA-I)
CREATE TABLE IF NOT EXISTS public.procedure_production (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES public.patients(id),
  procedure_code TEXT NOT NULL,
  status TEXT DEFAULT 'Agendado',
  date_service TIMESTAMP WITH TIME ZONE,
  date_scheduling TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ATUALIZAÇÃO: Colunas para Fluxo de Próteses e SIA (Idempotente)
DO $$
BEGIN
    -- Adicionar sia_processed
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='procedure_production' AND column_name='sia_processed') THEN
        ALTER TABLE public.procedure_production ADD COLUMN sia_processed BOOLEAN DEFAULT false;
    END IF;
    
    -- Adicionar date_delivery
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='procedure_production' AND column_name='date_delivery') THEN
        ALTER TABLE public.procedure_production ADD COLUMN date_delivery TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Adicionar date_cancellation
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='procedure_production' AND column_name='date_cancellation') THEN
        ALTER TABLE public.procedure_production ADD COLUMN date_cancellation TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Adicionar date_sia
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='procedure_production' AND column_name='date_sia') THEN
        ALTER TABLE public.procedure_production ADD COLUMN date_sia DATE;
    END IF;

    -- Adicionar professional_id (Vínculo com Profissional para Dashboard)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='procedure_production' AND column_name='professional_id') THEN
        ALTER TABLE public.procedure_production ADD COLUMN professional_id UUID REFERENCES public.profissionais(id);
    END IF;

    -- Adicionar professional_id em BPA CONSOLIDADO (Para rastrear quem produziu)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='bpa_consolidated' AND column_name='professional_id') THEN
        ALTER TABLE public.bpa_consolidated ADD COLUMN professional_id UUID REFERENCES public.profissionais(id);
    END IF;
END $$;

COMMENT ON COLUMN public.procedure_production.sia_processed IS 'Indica se o procedimento foi processado no SIA/SUS';
COMMENT ON COLUMN public.procedure_production.date_delivery IS 'Data de entrega da prótese';
COMMENT ON COLUMN public.procedure_production.date_cancellation IS 'Data de cancelamento do procedimento';
COMMENT ON COLUMN public.procedure_production.date_sia IS 'Data de processamento no SIA';

-- 2.8 BPA CONSOLIDADO (Header e Items)
CREATE TABLE IF NOT EXISTS public.bpa_consolidated (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cnes TEXT NOT NULL,
  reference_month TEXT NOT NULL,
  total_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.bpa_consolidated_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bpa_id UUID REFERENCES public.bpa_consolidated(id) ON DELETE CASCADE,
  procedure_info TEXT,
  cbo_info TEXT,
  age_group TEXT,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.9 TEMPLATES WHATSAPP (Novo Recurso)
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.10 TABELAS AUXILIARES (CATÁLOGOS SIMPLES)
CREATE TABLE IF NOT EXISTS public.neighborhoods_catalog ( name TEXT PRIMARY KEY );
CREATE TABLE IF NOT EXISTS public.nationalities_catalog ( name TEXT PRIMARY KEY );
CREATE TABLE IF NOT EXISTS public.races_catalog ( name TEXT PRIMARY KEY );
CREATE TABLE IF NOT EXISTS public.ethnicities_catalog ( name TEXT PRIMARY KEY );
CREATE TABLE IF NOT EXISTS public.street_types_catalog ( name TEXT PRIMARY KEY );
CREATE TABLE IF NOT EXISTS public.streets_catalog ( name TEXT PRIMARY KEY );

-- =================================================================================================
-- 3. FUNÇÕES E TRIGGERS
-- =================================================================================================

-- 3.1 Função para criar perfil automaticamente ao registrar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, permissions)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email, 'Usuário'),
    new.email,
    'operator',
    '{}'::jsonb
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para handle_new_user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3.2 Função para atualizar updated_at em profissionais
CREATE OR REPLACE FUNCTION public.set_updated_at_profissionais()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS set_updated_at_profissionais ON public.profissionais;
CREATE TRIGGER set_updated_at_profissionais
BEFORE UPDATE ON public.profissionais
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at_profissionais();

-- 3.3 Funções de Busca (RPC)

-- Busca Pacientes
CREATE OR REPLACE FUNCTION search_patients(search_term TEXT)
RETURNS SETOF patients AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM patients
  WHERE unaccent(name) ILIKE unaccent('%' || search_term || '%')
     OR cns ILIKE '%' || search_term || '%';
END;
$$ LANGUAGE plpgsql;

-- Busca Procedimentos
CREATE OR REPLACE FUNCTION search_procedures(search_term TEXT)
RETURNS SETOF procedures_catalog AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM procedures_catalog
  WHERE unaccent(name) ILIKE unaccent('%' || search_term || '%')
     OR code ILIKE '%' || search_term || '%'
     OR unaccent(category) ILIKE unaccent('%' || search_term || '%');
END;
$$ LANGUAGE plpgsql;

-- Busca CBOs (ocupações) ignorando acentos e permitindo busca por código
CREATE OR REPLACE FUNCTION search_cbos(search_term TEXT)
RETURNS SETOF cbos AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM cbos
  WHERE unaccent(occupation) ILIKE unaccent('%' || search_term || '%')
     OR code ILIKE '%' || search_term || '%';
END;
$$ LANGUAGE plpgsql;

-- 3.4 Views para Dashboard (Estatísticas em Tempo Real)

-- View: Métricas Gerais BPA-I (Status)
CREATE OR REPLACE VIEW public.vw_dashboard_bpai_status AS
SELECT
    TO_CHAR(date_service, 'YYYY') AS ano,
    TO_CHAR(date_service, 'MM') AS mes,
    COUNT(*) FILTER (WHERE status = 'Finalizado' OR status = 'Concluído' OR sia_processed = true) AS finalizados,
    COUNT(*) FILTER (WHERE status = 'Pendente' OR status = 'Em Produção') AS pendentes,
    COUNT(*) FILTER (WHERE status = 'Consulta/Molde') AS consulta_molde,
    COUNT(*) FILTER (WHERE status = 'Agendado Entrega') AS agendado_entrega,
    COUNT(*) FILTER (WHERE status = 'Cancelado') AS cancelados
FROM procedure_production
GROUP BY 1, 2;

-- View: Ranking Procedimentos BPA-I
CREATE OR REPLACE VIEW public.vw_dashboard_bpai_procedures AS
SELECT
    TO_CHAR(pp.date_service, 'YYYY') AS ano,
    TO_CHAR(pp.date_service, 'MM') AS mes,
    pc.name AS procedure_name,
    COUNT(*) AS total
FROM procedure_production pp
LEFT JOIN procedures_catalog pc ON pp.procedure_code = pc.code
GROUP BY 1, 2, 3;

-- View: Produção por Profissional BPA-I
CREATE OR REPLACE VIEW public.vw_dashboard_bpai_professionals AS
SELECT
    TO_CHAR(pp.date_service, 'YYYY') AS ano,
    TO_CHAR(pp.date_service, 'MM') AS mes,
    p.nome AS professional_name,
    COUNT(*) AS total
FROM procedure_production pp
LEFT JOIN profissionais p ON pp.professional_id = p.id
WHERE pp.professional_id IS NOT NULL
GROUP BY 1, 2, 3;

-- View: Métricas BPA-C Consolidado (Por Unidade)
CREATE OR REPLACE VIEW public.vw_dashboard_bpac_units AS
SELECT
    TRIM(SPLIT_PART(reference_month, '/', 2)) AS ano_texto,
    bpa.reference_month,
    e.name AS unit_name,
    SUM(bpa.total_quantity) AS total
FROM bpa_consolidated bpa
LEFT JOIN establishments e ON bpa.cnes = e.cnes
GROUP BY 1, 2, 3;

-- View: Produção por Profissional BPA-C (Novo)
CREATE OR REPLACE VIEW public.vw_dashboard_bpac_professionals AS
SELECT
    TRIM(SPLIT_PART(bpa.reference_month, '/', 2)) AS ano_texto,
    bpa.reference_month,
    p.nome AS professional_name,
    SUM(bpa.total_quantity) AS total
FROM bpa_consolidated bpa
LEFT JOIN profissionais p ON bpa.professional_id = p.id
WHERE bpa.professional_id IS NOT NULL
GROUP BY 1, 2, 3;

-- View: Ranking Procedimentos BPA-C
CREATE OR REPLACE VIEW public.vw_dashboard_bpac_procedures AS
SELECT
    TRIM(SPLIT_PART(bpa.reference_month, '/', 2)) AS ano_texto,
    bpa.reference_month,
    COALESCE(pc.name, items.procedure_info) AS procedure_name,
    SUM(items.quantity) AS total
FROM bpa_consolidated_items items
JOIN bpa_consolidated bpa ON items.bpa_id = bpa.id
LEFT JOIN procedures_catalog pc ON items.procedure_info = pc.code -- Tenta match pelo código
GROUP BY 1, 2, 3;

-- Permitir acesso às views
GRANT SELECT ON public.vw_dashboard_bpai_status TO authenticated;
GRANT SELECT ON public.vw_dashboard_bpai_procedures TO authenticated;
GRANT SELECT ON public.vw_dashboard_bpai_professionals TO authenticated;
GRANT SELECT ON public.vw_dashboard_bpac_units TO authenticated;
GRANT SELECT ON public.vw_dashboard_bpac_professionals TO authenticated;
GRANT SELECT ON public.vw_dashboard_bpac_procedures TO authenticated;

-- =================================================================================================
-- 4. POLÍTICAS DE SEGURANÇA (RLS)
-- =================================================================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.establishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedures_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cbos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedure_production ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bpa_consolidated ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bpa_consolidated_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.neighborhoods_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nationalities_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.races_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ethnicities_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profissionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- Definição de Políticas (Acesso para usuários autenticados)
DO $$
BEGIN
    -- Perfis
    DROP POLICY IF EXISTS "Acesso total a perfis para autenticados" ON public.profiles;
    CREATE POLICY "Acesso total a perfis para autenticados" ON public.profiles FOR ALL USING (auth.role() = 'authenticated');

    -- Pacientes
    DROP POLICY IF EXISTS "Acesso total a pacientes para autenticados" ON public.patients;
    CREATE POLICY "Acesso total a pacientes para autenticados" ON public.patients FOR ALL USING (auth.role() = 'authenticated');

    -- Estabelecimentos
    DROP POLICY IF EXISTS "Acesso total a estabelecimentos para autenticados" ON public.establishments;
    CREATE POLICY "Acesso total a estabelecimentos para autenticados" ON public.establishments FOR ALL USING (auth.role() = 'authenticated');

    -- Catálogos (Procedimentos e CBOs)
    DROP POLICY IF EXISTS "Acesso total a catalogo procedimentos" ON public.procedures_catalog;
    CREATE POLICY "Acesso total a catalogo procedimentos" ON public.procedures_catalog FOR ALL USING (auth.role() = 'authenticated');
    
    DROP POLICY IF EXISTS "Acesso total a CBOs" ON public.cbos;
    CREATE POLICY "Acesso total a CBOs" ON public.cbos FOR ALL USING (auth.role() = 'authenticated');

    -- Produção
    DROP POLICY IF EXISTS "Acesso total a produção" ON public.procedure_production;
    CREATE POLICY "Acesso total a produção" ON public.procedure_production FOR ALL USING (auth.role() = 'authenticated');

    DROP POLICY IF EXISTS "Acesso total a BPA consolidado" ON public.bpa_consolidated;
    CREATE POLICY "Acesso total a BPA consolidado" ON public.bpa_consolidated FOR ALL USING (auth.role() = 'authenticated');

    DROP POLICY IF EXISTS "Acesso total a itens BPA" ON public.bpa_consolidated_items;
    CREATE POLICY "Acesso total a itens BPA" ON public.bpa_consolidated_items FOR ALL USING (auth.role() = 'authenticated');

    -- Profissionais
    DROP POLICY IF EXISTS "Acesso total a profissionais para autenticados" ON public.profissionais;
    CREATE POLICY "Acesso total a profissionais para autenticados" ON public.profissionais FOR ALL USING (auth.role() = 'authenticated');

    -- Templates WhatsApp
    DROP POLICY IF EXISTS "Acesso total a templates para autenticados" ON public.whatsapp_templates;
    CREATE POLICY "Acesso total a templates para autenticados" ON public.whatsapp_templates FOR ALL USING (auth.role() = 'authenticated');

    -- Catálogos Auxiliares (Leitura Pública, Escrita Autenticada)
    DROP POLICY IF EXISTS "Leitura de bairros" ON public.neighborhoods_catalog;
    CREATE POLICY "Leitura de bairros" ON public.neighborhoods_catalog FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Escrita de bairros" ON public.neighborhoods_catalog;
    CREATE POLICY "Escrita de bairros" ON public.neighborhoods_catalog FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    -- (Repetir padrão para outros catálogos se necessário, aqui simplificado para bairros como exemplo principal)
END $$;

-- Políticas Públicas (acesso sem login) para recursos necessários ao auto-cadastro
DO $$
BEGIN
    -- Estabelecimentos: leitura pública para listar opções no formulário
    DROP POLICY IF EXISTS "Leitura pública de estabelecimentos" ON public.establishments;
    CREATE POLICY "Leitura pública de estabelecimentos" ON public.establishments
    FOR SELECT TO anon USING (true);

    -- CBOs: leitura pública para autocomplete de profissão
    DROP POLICY IF EXISTS "Leitura pública de CBOs" ON public.cbos;
    CREATE POLICY "Leitura pública de CBOs" ON public.cbos
    FOR SELECT TO anon USING (true);

    -- Profissionais: permitir cadastro público (insert sem login)
    DROP POLICY IF EXISTS "Cadastro público de profissionais" ON public.profissionais;
    CREATE POLICY "Cadastro público de profissionais" ON public.profissionais
    FOR INSERT TO anon WITH CHECK (true);
END $$;

-- =================================================================================================
-- 5. DADOS INICIAIS (SEED)
-- =================================================================================================

-- 5.1 Sincronização de Perfis Faltantes
DO $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role, permissions)
    SELECT 
        au.id, 
        COALESCE(au.raw_user_meta_data->>'full_name', au.email),
        'operator',
        '{}'::jsonb
    FROM auth.users au
    LEFT JOIN public.profiles pp ON au.id = pp.id
    WHERE pp.id IS NULL;
END $$;

-- 5.2 Templates Padrão de WhatsApp
INSERT INTO public.whatsapp_templates (title, message)
SELECT 'Confirmação de Agendamento', 'Olá {paciente}, confirmamos seu agendamento para o procedimento {procedimento} no dia {data_atendimento}. Por favor, chegue com 15 minutos de antecedência.'
WHERE NOT EXISTS (SELECT 1 FROM public.whatsapp_templates WHERE title = 'Confirmação de Agendamento');

INSERT INTO public.whatsapp_templates (title, message)
SELECT 'Procedimento Concluído', 'Olá {paciente}, seu procedimento {procedimento} foi concluído e está pronto para entrega/instalação. Aguardamos sua visita!'
WHERE NOT EXISTS (SELECT 1 FROM public.whatsapp_templates WHERE title = 'Procedimento Concluído');

-- FIM DO SCRIPT MESTRE
