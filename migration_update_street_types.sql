-- Migration: Add code column to street_types_catalog
-- Description: Adds a 'code' column to support mapping between street type codes and names.
-- Also ensures 'code' is unique.

DO $$ 
BEGIN 
    -- Add column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'street_types_catalog' 
        AND column_name = 'code'
    ) THEN
        ALTER TABLE public.street_types_catalog ADD COLUMN code TEXT;
        
        -- Add unique constraint to code
        ALTER TABLE public.street_types_catalog ADD CONSTRAINT street_types_catalog_code_key UNIQUE (code);
        
        -- Note: Existing rows will have NULL code. 
        -- You may want to manually update them or delete them if they are invalid without code.
        -- For now, we allow NULLs initially but the UI will enforce code entry.
    END IF;

    -- Ensure RLS allows access (already set in schema, but good to double check or re-apply if needed)
    -- Assuming existing policies cover SELECT/INSERT/UPDATE/DELETE for authenticated users.
END $$;
