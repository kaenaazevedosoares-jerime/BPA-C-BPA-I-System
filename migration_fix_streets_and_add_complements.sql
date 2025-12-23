-- Migration: Fix Streets Catalog Permissions and Add Complements Catalog
-- Description: 
-- 1. Creates complements_catalog table.
-- 2. Ensures RLS and Policies are set for streets_catalog, street_types_catalog, and complements_catalog.
-- 3. This ensures that the frontend can properly list all items.

-- =================================================================================================
-- 1. COMPLEMENTS CATALOG
-- =================================================================================================

CREATE TABLE IF NOT EXISTS public.complements_catalog (
    name TEXT PRIMARY KEY
);

ALTER TABLE public.complements_catalog ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN 
    -- Policies for Complements
    DROP POLICY IF EXISTS "Leitura de complementos" ON public.complements_catalog;
    CREATE POLICY "Leitura de complementos" ON public.complements_catalog FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Escrita de complementos" ON public.complements_catalog;
    CREATE POLICY "Escrita de complementos" ON public.complements_catalog FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    
    DROP POLICY IF EXISTS "Atualizacao de complementos" ON public.complements_catalog;
    CREATE POLICY "Atualizacao de complementos" ON public.complements_catalog FOR UPDATE USING (auth.role() = 'authenticated');
END $$;

-- =================================================================================================
-- 2. STREETS CATALOG PERMISSIONS (Fix for missing items in dropdown)
-- =================================================================================================

ALTER TABLE public.streets_catalog ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN 
    -- Policies for Streets
    -- Ensure everyone can read streets
    DROP POLICY IF EXISTS "Leitura de ruas" ON public.streets_catalog;
    CREATE POLICY "Leitura de ruas" ON public.streets_catalog FOR SELECT USING (true);

    -- Ensure authenticated users can insert
    DROP POLICY IF EXISTS "Escrita de ruas" ON public.streets_catalog;
    CREATE POLICY "Escrita de ruas" ON public.streets_catalog FOR INSERT WITH CHECK (auth.role() = 'authenticated');
END $$;

-- =================================================================================================
-- 3. STREET TYPES CATALOG PERMISSIONS
-- =================================================================================================

ALTER TABLE public.street_types_catalog ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN 
    -- Policies for Street Types
    DROP POLICY IF EXISTS "Leitura de tipos de rua" ON public.street_types_catalog;
    CREATE POLICY "Leitura de tipos de rua" ON public.street_types_catalog FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Escrita de tipos de rua" ON public.street_types_catalog;
    CREATE POLICY "Escrita de tipos de rua" ON public.street_types_catalog FOR INSERT WITH CHECK (auth.role() = 'authenticated');
END $$;
