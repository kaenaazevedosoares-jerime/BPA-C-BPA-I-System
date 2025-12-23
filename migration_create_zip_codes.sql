-- Migration: Create zip_codes_catalog table
-- Description: Stores local cache of ZIP codes (CEPs) and their associated address data.
-- Useful for offline access or regions not covered by external APIs (ViaCEP).

CREATE TABLE IF NOT EXISTS public.zip_codes_catalog (
    cep TEXT PRIMARY KEY,
    street TEXT,
    neighborhood TEXT,
    city TEXT,
    state TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.zip_codes_catalog ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ 
BEGIN 
    -- Allow read for everyone (or authenticated)
    DROP POLICY IF EXISTS "Leitura de ceps" ON public.zip_codes_catalog;
    CREATE POLICY "Leitura de ceps" ON public.zip_codes_catalog FOR SELECT USING (true);

    -- Allow insert/update for authenticated users
    DROP POLICY IF EXISTS "Escrita de ceps" ON public.zip_codes_catalog;
    CREATE POLICY "Escrita de ceps" ON public.zip_codes_catalog FOR INSERT WITH CHECK (auth.role() = 'authenticated');

    DROP POLICY IF EXISTS "Atualizacao de ceps" ON public.zip_codes_catalog;
    CREATE POLICY "Atualizacao de ceps" ON public.zip_codes_catalog FOR UPDATE USING (auth.role() = 'authenticated');
END $$;
