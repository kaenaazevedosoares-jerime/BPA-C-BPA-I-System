-- LRPD DATABASE SCHEMA
-- Version: 2.1.0 (Updated with Search RPCs)
-- Last Updated: 2025-02-22
-- Description: Master schema for LRPD system containing all tables, policies, functions, and initial data.
-- Rules: Follows strict migration guidelines (Idempotency, Error Handling, Atomic Operations)

-- =================================================================================================
-- 0. PRE-REQUISITES & CONFIGURATION
-- =================================================================================================

DO $$ 
BEGIN 
    -- Basic check to ensure we are in a PostgreSQL environment compatible with Supabase extensions
    IF NOT EXISTS (
        SELECT 1 FROM pg_available_extensions WHERE name = 'pgcrypto'
    ) THEN
        CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    END IF;
    
    RAISE NOTICE 'Environment check passed.';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error checking environment: %', SQLERRM;
END $$;

-- =================================================================================================
-- 1. PROFILES & AUTHENTICATION
-- =================================================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT, -- Added for better identification
  role TEXT DEFAULT 'operator', -- 'admin' or 'operator'
  permissions JSONB DEFAULT '{}'::jsonb, -- Flexible granular permissions
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure columns exist (for migrations on existing DBs)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='permissions') THEN
        ALTER TABLE public.profiles ADD COLUMN permissions JSONB DEFAULT '{}'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='email') THEN
        ALTER TABLE public.profiles ADD COLUMN email TEXT;
    END IF;
END $$;

-- Function: Auto-create profile on new user registration
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

-- Trigger: Link auth.users to public.profiles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- =================================================================================================
-- 2. CORE DOMAIN TABLES
-- =================================================================================================

-- 2.1 PATIENTS
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

-- 2.2 ESTABLISHMENTS
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

-- 2.3 PROCEDURES CATALOG (SIGTAP/Internal)
CREATE TABLE IF NOT EXISTS public.procedures_catalog (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
-- Idempotency for column addition
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='procedures_catalog' AND column_name='category') THEN
        ALTER TABLE public.procedures_catalog ADD COLUMN category TEXT;
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_procedures_catalog_category ON public.procedures_catalog(category);

-- 2.4 CBO CATALOG
CREATE TABLE IF NOT EXISTS public.cbos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  occupation TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.5 PROFESSIONALS
CREATE TABLE IF NOT EXISTS public.profissionais (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sus VARCHAR(15) UNIQUE NOT NULL,
  nome VARCHAR(255) NOT NULL,
  profissao VARCHAR(100) NOT NULL,
  cbo VARCHAR(10),
  endereco TEXT,
  telefone VARCHAR(20),
  email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profissionais_nome ON public.profissionais(nome);
CREATE INDEX IF NOT EXISTS idx_profissionais_profissao ON public.profissionais(profissao);
CREATE INDEX IF NOT EXISTS idx_profissionais_sus ON public.profissionais(sus);
CREATE INDEX IF NOT EXISTS idx_profissionais_cbo ON public.profissionais(cbo);

-- Updated_at trigger for professionals
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

-- =================================================================================================
-- 3. PRODUCTION & OPERATIONS
-- =================================================================================================

-- 3.1 BPA-I (Individualized Production)
CREATE TABLE IF NOT EXISTS public.procedure_production (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES public.patients(id),
  procedure_code TEXT NOT NULL,
  status TEXT DEFAULT 'Agendado', -- 'Agendado', 'Em Produção', 'Concluído', 'Entregue'
  date_service TIMESTAMP WITH TIME ZONE,
  date_scheduling TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3.2 BPA-C (Consolidated Production) - Header
CREATE TABLE IF NOT EXISTS public.bpa_consolidated (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cnes TEXT NOT NULL,
  reference_month TEXT NOT NULL,
  total_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3.3 BPA-C - Items
CREATE TABLE IF NOT EXISTS public.bpa_consolidated_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bpa_id UUID REFERENCES public.bpa_consolidated(id) ON DELETE CASCADE,
  procedure_info TEXT, -- Code or Name
  cbo_info TEXT,       -- Code or Name
  age_group TEXT,      -- Age group
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =================================================================================================
-- 4. AUXILIARY TABLES (Autocomplete)
-- =================================================================================================

CREATE TABLE IF NOT EXISTS public.neighborhoods_catalog ( name TEXT PRIMARY KEY );
CREATE TABLE IF NOT EXISTS public.nationalities_catalog ( name TEXT PRIMARY KEY );
CREATE TABLE IF NOT EXISTS public.races_catalog ( name TEXT PRIMARY KEY );
CREATE TABLE IF NOT EXISTS public.ethnicities_catalog ( name TEXT PRIMARY KEY );
CREATE TABLE IF NOT EXISTS public.street_types_catalog ( name TEXT PRIMARY KEY );
CREATE TABLE IF NOT EXISTS public.streets_catalog ( name TEXT PRIMARY KEY );

-- =================================================================================================
-- 5. SECURITY POLICIES (RLS)
-- =================================================================================================

-- Enable RLS on all tables
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

-- Define Policies (MVP: Authenticated users have full access)
DO $$
BEGIN
    -- Profiles
    DROP POLICY IF EXISTS "Acesso total a perfis para autenticados" ON public.profiles;
    CREATE POLICY "Acesso total a perfis para autenticados" ON public.profiles FOR ALL USING (auth.role() = 'authenticated');

    -- Patients
    DROP POLICY IF EXISTS "Acesso total a pacientes para autenticados" ON public.patients;
    CREATE POLICY "Acesso total a pacientes para autenticados" ON public.patients FOR ALL USING (auth.role() = 'authenticated');

    -- Establishments
    DROP POLICY IF EXISTS "Acesso total a estabelecimentos para autenticados" ON public.establishments;
    CREATE POLICY "Acesso total a estabelecimentos para autenticados" ON public.establishments FOR ALL USING (auth.role() = 'authenticated');

    -- Catalog
    DROP POLICY IF EXISTS "Acesso total a catalogo procedimentos" ON public.procedures_catalog;
    CREATE POLICY "Acesso total a catalogo procedimentos" ON public.procedures_catalog FOR ALL USING (auth.role() = 'authenticated');

    -- CBOs
    DROP POLICY IF EXISTS "Acesso total a CBOs" ON public.cbos;
    CREATE POLICY "Acesso total a CBOs" ON public.cbos FOR ALL USING (auth.role() = 'authenticated');

    -- Production
    DROP POLICY IF EXISTS "Acesso total a produção" ON public.procedure_production;
    CREATE POLICY "Acesso total a produção" ON public.procedure_production FOR ALL USING (auth.role() = 'authenticated');

    -- BPA Consolidated
    DROP POLICY IF EXISTS "Acesso total a BPA consolidado" ON public.bpa_consolidated;
    CREATE POLICY "Acesso total a BPA consolidado" ON public.bpa_consolidated FOR ALL USING (auth.role() = 'authenticated');

    DROP POLICY IF EXISTS "Acesso total a itens BPA" ON public.bpa_consolidated_items;
    CREATE POLICY "Acesso total a itens BPA" ON public.bpa_consolidated_items FOR ALL USING (auth.role() = 'authenticated');

    -- Professionals
    DROP POLICY IF EXISTS "Acesso total a profissionais para autenticados" ON public.profissionais;
    CREATE POLICY "Acesso total a profissionais para autenticados" ON public.profissionais FOR ALL USING (auth.role() = 'authenticated');

    -- Auxiliary Catalogs (Public Read, Auth Write)
    DROP POLICY IF EXISTS "Leitura de bairros" ON public.neighborhoods_catalog;
    CREATE POLICY "Leitura de bairros" ON public.neighborhoods_catalog FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Escrita de bairros" ON public.neighborhoods_catalog;
    CREATE POLICY "Escrita de bairros" ON public.neighborhoods_catalog FOR INSERT WITH CHECK (auth.role() = 'authenticated');
END $$;

-- =================================================================================================
-- 6. DATA MIGRATION & FIXES
-- =================================================================================================

-- Fix Missing Profiles (Sync auth.users -> public.profiles)
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
    
    IF FOUND THEN
        RAISE NOTICE 'Synchronized missing profiles from auth.users.';
    END IF;
END $$;

-- =================================================================================================
-- 7. SEARCH FUNCTIONS (RPC) - Added 2025-02-22
-- =================================================================================================

-- Enable Unaccent Extension
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Search Patients
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

-- Search Procedures
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

-- Search Establishments
CREATE OR REPLACE FUNCTION search_establishments(search_term TEXT)
RETURNS SETOF establishments AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM establishments
  WHERE unaccent(name) ILIKE unaccent('%' || search_term || '%')
     OR cns ILIKE '%' || search_term || '%';
END;
$$ LANGUAGE plpgsql;

-- Search CBOs
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
