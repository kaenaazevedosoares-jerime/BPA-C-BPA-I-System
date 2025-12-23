-- Tabela de Templates de WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- Política de Segurança (Todos autenticados podem ler/escrever)
DROP POLICY IF EXISTS "Acesso total a templates para autenticados" ON public.whatsapp_templates;
CREATE POLICY "Acesso total a templates para autenticados" ON public.whatsapp_templates
  FOR ALL USING (auth.role() = 'authenticated');

-- Inserir dados iniciais (apenas se a tabela estiver vazia)
INSERT INTO public.whatsapp_templates (title, message)
SELECT 'Confirmação de Agendamento', 'Olá {paciente}, confirmamos seu agendamento para o procedimento {procedimento} no dia {data_atendimento}. Por favor, chegue com 15 minutos de antecedência.'
WHERE NOT EXISTS (SELECT 1 FROM public.whatsapp_templates);

INSERT INTO public.whatsapp_templates (title, message)
SELECT 'Procedimento Concluído', 'Olá {paciente}, seu procedimento {procedimento} foi concluído e está pronto para entrega/instalação. Aguardamos sua visita!'
WHERE NOT EXISTS (SELECT 1 FROM public.whatsapp_templates WHERE title = 'Procedimento Concluído');
