CREATE TABLE IF NOT EXISTS public.procedure_cbos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  procedure_id UUID NOT NULL REFERENCES public.procedures_catalog(id) ON DELETE CASCADE,
  cbo_id UUID NOT NULL REFERENCES public.cbos(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(procedure_id, cbo_id)
);

ALTER TABLE public.procedure_cbos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso total a procedure_cbos" ON public.procedure_cbos
FOR ALL USING (auth.role() = 'authenticated');
