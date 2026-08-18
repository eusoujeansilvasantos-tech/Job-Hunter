-- ============================================================================
-- PHASE 3.1 — APPLICATION PIPELINE & COCKPIT MIGRATION
-- ============================================================================

-- 1. Expand applications table with additional operational fields
ALTER TABLE public.applications 
  ADD COLUMN IF NOT EXISTS company_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS company_contact_email TEXT,
  ADD COLUMN IF NOT EXISTS recruiter_name TEXT,
  ADD COLUMN IF NOT EXISTS recruiter_linkedin TEXT,
  ADD COLUMN IF NOT EXISTS salary_expectation TEXT,
  ADD COLUMN IF NOT EXISTS salary_offered TEXT,
  ADD COLUMN IF NOT EXISTS work_model TEXT,
  ADD COLUMN IF NOT EXISTS application_channel TEXT,
  ADD COLUMN IF NOT EXISTS application_url TEXT,
  ADD COLUMN IF NOT EXISTS next_step TEXT,
  ADD COLUMN IF NOT EXISTS next_step_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;

-- Backfill last_activity_at safely for existing applications without artificial NOW()
UPDATE public.applications
SET last_activity_at = COALESCE(updated_at, created_at, NOW())
WHERE last_activity_at IS NULL;

-- Set default NOW() for future inserts
ALTER TABLE public.applications 
  ALTER COLUMN last_activity_at SET DEFAULT NOW();

-- Add status check constraint on applications if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_applications_status_valid'
  ) THEN
    ALTER TABLE public.applications
      ADD CONSTRAINT chk_applications_status_valid
      CHECK (status IN ('NEW', 'PREPARED', 'APPLIED', 'INTERVIEW', 'REJECTED', 'OFFER'));
  END IF;
END $$;

-- 2. Ensure composite UNIQUE constraints on applications for referential integrity
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'applications_id_user_key'
  ) THEN
    ALTER TABLE public.applications ADD CONSTRAINT applications_id_user_key UNIQUE (id, user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'applications_id_user_job_key'
  ) THEN
    ALTER TABLE public.applications ADD CONSTRAINT applications_id_user_job_key UNIQUE (id, user_id, job_id);
  END IF;
END $$;

-- 3. Create application_events table
CREATE TABLE IF NOT EXISTS public.application_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    application_id UUID NOT NULL,
    job_id UUID NOT NULL,
    from_status TEXT,
    to_status TEXT,
    event_type TEXT NOT NULL DEFAULT 'STATUS_CHANGE',
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    event_key TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Composite FK: Guarantees that application_id + user_id + job_id ALL match the same parent record!
    CONSTRAINT application_events_parent_fk 
      FOREIGN KEY (application_id, user_id, job_id) 
      REFERENCES public.applications(id, user_id, job_id) 
      ON DELETE CASCADE,

    -- Event Key Idempotency constraint per user
    CONSTRAINT application_events_user_event_key_key UNIQUE (user_id, event_key),

    -- Valid Event Types constraint
    CONSTRAINT chk_app_events_type_valid CHECK (
      event_type IN (
        'STATUS_CHANGE',
        'RECRUITER_CONTACT',
        'INTERVIEW_SCHEDULED',
        'INTERVIEW_COMPLETED',
        'TECHNICAL_TEST',
        'CASE_SUBMITTED',
        'FOLLOW_UP_SENT',
        'OTHER'
      )
    ),

    -- Require to_status for STATUS_CHANGE events; optional otherwise
    CONSTRAINT chk_app_events_status_change_to_status CHECK (
      event_type <> 'STATUS_CHANGE' OR to_status IS NOT NULL
    ),

    -- Status validity constraint when status fields are present
    CONSTRAINT chk_app_events_from_status_valid CHECK (
      from_status IS NULL OR from_status IN ('NEW', 'PREPARED', 'APPLIED', 'INTERVIEW', 'REJECTED', 'OFFER')
    ),
    CONSTRAINT chk_app_events_to_status_valid CHECK (
      to_status IS NULL OR to_status IN ('NEW', 'PREPARED', 'APPLIED', 'INTERVIEW', 'REJECTED', 'OFFER')
    )
);

-- Indexes for high performance reads & timeline ordering
CREATE INDEX IF NOT EXISTS idx_app_events_user_created ON public.application_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_events_app_created ON public.application_events (application_id, created_at ASC);

-- 4. Enable Strict RLS
ALTER TABLE public.application_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own application events" ON public.application_events;
CREATE POLICY "Users can manage their own application events"
    ON public.application_events
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
