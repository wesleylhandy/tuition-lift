-- Add applications table to Realtime publication for Postgres Changes.
-- Required for use-realtime-applications hook (006 dashboard).
-- @see specs/006-scholarship-inbox-dashboard/contracts/realtime-channels.md

ALTER PUBLICATION supabase_realtime ADD TABLE public.applications;
