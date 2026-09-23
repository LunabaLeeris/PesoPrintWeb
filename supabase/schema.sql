-- ==============================================================================
-- PesoPrint Supabase Database Schema
-- Tables: kiosks, documents
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- kiosks
-- Stores the unique kiosk identity, active user session lock, and last update
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kiosks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session TEXT, -- IP address or session token of the user currently using the kiosk
    tunnel TEXT, -- Cloudflare tunnel or local network URL for the kiosk's printer
    date_updated TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for session queries
CREATE INDEX IF NOT EXISTS idx_kiosks_session ON public.kiosks(session);

-- ------------------------------------------------------------------------------
-- Table: documents
-- Stores uploaded print documents associated with a kiosk and print options
-- options format: [[1, 3], [2, 0], [i, j]] where i = page number, j = copy count
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kiosk_id UUID NOT NULL REFERENCES public.kiosks(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    document_url TEXT NOT NULL,
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    date_updated TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for fast lookup by kiosk_id
CREATE INDEX IF NOT EXISTS idx_documents_kiosk_id ON public.documents(kiosk_id);

-- ------------------------------------------------------------------------------
-- Automatic date_updated trigger function
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.date_updated = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_kiosks_updated_at ON public.kiosks;
CREATE TRIGGER set_kiosks_updated_at
    BEFORE UPDATE ON public.kiosks
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_documents_updated_at ON public.documents;
CREATE TRIGGER set_documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- Row Level Security (RLS) Policies
-- ------------------------------------------------------------------------------
ALTER TABLE public.kiosks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Kiosks Policies (allow anon web users to read and update session for scanned kiosk)
DROP POLICY IF EXISTS "Allow public read kiosks" ON public.kiosks;
CREATE POLICY "Allow public read kiosks"
    ON public.kiosks FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow public insert kiosks" ON public.kiosks;
CREATE POLICY "Allow public insert kiosks"
    ON public.kiosks FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update kiosks" ON public.kiosks;
CREATE POLICY "Allow public update kiosks"
    ON public.kiosks FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Documents Policies (allow anon web users to create, read, update documents)
DROP POLICY IF EXISTS "Allow public read documents" ON public.documents;
CREATE POLICY "Allow public read documents"
    ON public.documents FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow public insert documents" ON public.documents;
CREATE POLICY "Allow public insert documents"
    ON public.documents FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update documents" ON public.documents;
CREATE POLICY "Allow public update documents"
    ON public.documents FOR UPDATE
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete documents" ON public.documents;
CREATE POLICY "Allow public delete documents"
    ON public.documents FOR DELETE
    USING (true);

-- ------------------------------------------------------------------------------
-- Realtime Publication (allows live listening for new uploads on Kiosk Pi)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'kiosks'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.kiosks;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'documents'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.documents;
    END IF;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;
