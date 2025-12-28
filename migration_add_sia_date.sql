DO $$
BEGIN
    -- Adicionar date_sia
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='procedure_production' AND column_name='date_sia') THEN
        ALTER TABLE public.procedure_production ADD COLUMN date_sia DATE;
    END IF;
END $$;

COMMENT ON COLUMN public.procedure_production.date_sia IS 'Data de processamento no SIA';
