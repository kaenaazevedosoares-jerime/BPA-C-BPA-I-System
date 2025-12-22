-- Habilitar extensão unaccent para ignorar acentos
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Função RPC para buscar pacientes ignorando acentos e case
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

-- Função RPC para buscar procedimentos ignorando acentos e case
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

-- Função RPC para buscar estabelecimentos (CNES) ignorando acentos e case
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

-- Função RPC para buscar CBOs ignorando acentos e case
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
