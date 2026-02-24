-- Migration: Seed institutions (009 T040)
-- Purpose: Sample community colleges and trade schools for ROI comparison UI
-- Per research §5; quickstart. Production: extend via College Scorecard API.
-- Representative sample; coa/sticker_price from public data where available.
-- Idempotent: skip if any seed row exists.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.institutions WHERE source = 'manual' LIMIT 1) THEN
    INSERT INTO public.institutions (
      name, institution_type, state, sticker_price, net_price, coa, source
    ) VALUES
      ('Santa Monica College', 'community_college', 'CA', 14640, 4200, 18000, 'manual'),
      ('Pasadena City College', 'community_college', 'CA', 12200, 3800, 15000, 'manual'),
      ('Los Angeles Trade-Tech College', 'trade_school', 'CA', 11420, 3500, 14000, 'manual'),
      ('Bunker Hill Community College', 'community_college', 'MA', 12500, 4500, 16000, 'manual'),
      ('Ivy Tech Community College', 'community_college', 'IN', 8900, 3200, 12000, 'manual'),
      ('Lincoln Tech', 'trade_school', 'NJ', 28000, 22000, 32000, 'manual'),
      ('Universal Technical Institute', 'trade_school', 'AZ', 45000, 35000, 48000, 'manual');
  END IF;
END $$;
