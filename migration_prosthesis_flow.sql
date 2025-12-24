-- Adicionar colunas para fluxo de Próteses e Controle SIA
ALTER TABLE public.procedure_production
ADD COLUMN IF NOT EXISTS sia_processed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS date_delivery TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS date_cancellation TIMESTAMP WITH TIME ZONE;

-- Atualizar comentários (opcional, para documentação)
COMMENT ON COLUMN public.procedure_production.sia_processed IS 'Indica se o procedimento foi processado no SIA/SUS';
COMMENT ON COLUMN public.procedure_production.date_delivery IS 'Data de entrega da prótese';
COMMENT ON COLUMN public.procedure_production.date_cancellation IS 'Data de cancelamento do procedimento';
