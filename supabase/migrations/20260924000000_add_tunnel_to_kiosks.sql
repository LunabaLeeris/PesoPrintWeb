-- Migration: 20260924000000_add_tunnel_to_kiosks.sql
-- Description: Add tunnel column to kiosks table to store per-kiosk printer tunnel URLs,
-- and set tunnel for kiosk 11111111-1111-1111-1111-111111111111 to https://api.pesoprint.online

ALTER TABLE public.kiosks 
ADD COLUMN IF NOT EXISTS tunnel TEXT;

-- Update kiosk 11111111-1111-1111-1111-111111111111 with Cloudflare tunnel URL
UPDATE public.kiosks
SET tunnel = 'https://api.pesoprint.online',
    date_updated = timezone('utc'::text, now())
WHERE id = '11111111-1111-1111-1111-111111111111';
