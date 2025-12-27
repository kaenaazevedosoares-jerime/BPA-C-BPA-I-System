-- Adicionar coluna establishment_id na tabela profissionais
ALTER TABLE public.profissionais
ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES public.establishments(id);

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_profissionais_establishment_id ON public.profissionais(establishment_id);

-- Comentário para documentação
COMMENT ON COLUMN public.profissionais.establishment_id IS 'Referência ao estabelecimento (CNES) onde o profissional atua';
