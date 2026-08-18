-- Supabase Migration: Phase 3.3 — Follow-up Intelligence
-- Adds fields for manual snooze and override to applications table

ALTER TABLE public.applications
ADD COLUMN IF NOT EXISTS follow_up_snoozed_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS follow_up_override TEXT DEFAULT 'AUTO';

ALTER TABLE public.applications
DROP CONSTRAINT IF EXISTS check_follow_up_override;

ALTER TABLE public.applications
ADD CONSTRAINT check_follow_up_override CHECK (
  follow_up_override IS NULL OR follow_up_override IN (
    'AUTO',
    'DO_NOT_FOLLOW_UP',
    'FOLLOW_UP_LATER'
  )
);
