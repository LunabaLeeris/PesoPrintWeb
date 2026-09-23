-- ==============================================================================
-- PesoPrint Supabase Seed Data
-- ==============================================================================

-- Insert sample kiosks for development and testing:
INSERT INTO public.kiosks (id, session, date_updated)
VALUES 
    -- Test URL: http://localhost:3000/?kiosk=11111111-1111-1111-1111-111111111111
    ('11111111-1111-1111-1111-111111111111', NULL, timezone('utc'::text, now())),

    -- Busy / Locked by another user (session is occupied)
    -- Test URL: http://localhost:3000/?kiosk=22222222-2222-2222-2222-222222222222
    ('22222222-2222-2222-2222-222222222222', 'other_user_device_session', timezone('utc'::text, now()))
ON CONFLICT (id) DO UPDATE 
SET 
    session = EXCLUDED.session,
    date_updated = EXCLUDED.date_updated;