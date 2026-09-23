-- Migration: 20260923000000_setup_kiosks_and_documents.sql
-- Description: Create kiosks and documents tables with RLS and updated triggers

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.kiosks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session TEXT,
    date_updated TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_kiosks_session ON public.kiosks(session);

CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kiosk_id UUID NOT NULL REFERENCES public.kiosks(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    document_url TEXT NOT NULL,
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    date_updated TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_documents_kiosk_id ON public.documents(kiosk_id);

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

ALTER TABLE public.kiosks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

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
