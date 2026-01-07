-- Adicionar coluna access_password na tabela profissionais
ALTER TABLE public.profissionais
ADD COLUMN IF NOT EXISTS access_password VARCHAR(255);

-- Comentário para documentação
COMMENT ON COLUMN public.profissionais.access_password IS 'Senha de acesso para lançamento de produção individual';
