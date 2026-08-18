-- Phase 3.2: Apply Priority Engine Migration
-- Adds snapshot columns to applications table to record scores at the time of application.

ALTER TABLE public.applications
ADD COLUMN IF NOT EXISTS apply_priority_at_application INTEGER CHECK (apply_priority_at_application IS NULL OR (apply_priority_at_application >= 0 AND apply_priority_at_application <= 100)),
ADD COLUMN IF NOT EXISTS match_score_at_application INTEGER CHECK (match_score_at_application IS NULL OR (match_score_at_application >= 0 AND match_score_at_application <= 100)),
ADD COLUMN IF NOT EXISTS ats_coverage_at_application INTEGER CHECK (ats_coverage_at_application IS NULL OR (ats_coverage_at_application >= 0 AND ats_coverage_at_application <= 100));

COMMENT ON COLUMN public.applications.apply_priority_at_application IS 'Snapshot of the Apply Priority Score (0-100) when candidate applied';
COMMENT ON COLUMN public.applications.match_score_at_application IS 'Snapshot of the Match Score (0-100) when candidate applied';
COMMENT ON COLUMN public.applications.ats_coverage_at_application IS 'Snapshot of the ATS Coverage Score (0-100%) when candidate applied';
