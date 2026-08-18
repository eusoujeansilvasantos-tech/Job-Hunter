-- ================================================================
-- JOB HUNTER AI — FASE 2: SCHEMA SUPABASE SECURED WITH AUTH & RLS
-- Aplicação pessoal de uso único (Single-User Personal Application)
-- ================================================================

-- Habilitar extensão pgcrypto para geração de UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================================
-- 1. TABLE: jobs
-- ================================================================
CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    external_key TEXT NOT NULL,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT,
    description TEXT,
    url TEXT,
    published_at TIMESTAMPTZ,
    source TEXT,
    sources JSONB DEFAULT '[]'::jsonb,
    geo_classification TEXT,
    score INTEGER,
    score_breakdown JSONB DEFAULT '{}'::jsonb,
    ats_coverage INTEGER,
    matched_skills JSONB DEFAULT '[]'::jsonb,
    related_skills JSONB DEFAULT '[]'::jsonb,
    missing_skills JSONB DEFAULT '[]'::jsonb,
    ats_keywords JSONB DEFAULT '[]'::jsonb,
    match_reasons JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT jobs_user_external_key_key UNIQUE (user_id, external_key),
    CONSTRAINT jobs_id_user_key UNIQUE (id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON public.jobs (user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_external_key ON public.jobs (external_key);
CREATE INDEX IF NOT EXISTS idx_jobs_score ON public.jobs (score DESC);

-- ================================================================
-- 2. TABLE: applications
-- ================================================================
CREATE TABLE IF NOT EXISTS public.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    job_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'NEW',
    prepared_at TIMESTAMPTZ,
    applied_at TIMESTAMPTZ,
    interview_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    offer_at TIMESTAMPTZ,
    notes TEXT,
    company_contact_name TEXT,
    company_contact_email TEXT,
    recruiter_name TEXT,
    recruiter_linkedin TEXT,
    salary_expectation TEXT,
    salary_offered TEXT,
    work_model TEXT,
    application_channel TEXT,
    application_url TEXT,
    next_step TEXT,
    next_step_date TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT applications_user_job_fk FOREIGN KEY (job_id, user_id) REFERENCES public.jobs(id, user_id) ON DELETE CASCADE,
    CONSTRAINT applications_user_job_key UNIQUE (user_id, job_id),
    CONSTRAINT applications_id_user_key UNIQUE (id, user_id),
    CONSTRAINT applications_id_user_job_key UNIQUE (id, user_id, job_id),
    CONSTRAINT chk_applications_status_valid CHECK (status IN ('NEW', 'PREPARED', 'APPLIED', 'INTERVIEW', 'REJECTED', 'OFFER'))
);

CREATE INDEX IF NOT EXISTS idx_applications_user_id ON public.applications (user_id);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON public.applications (job_id);

-- ================================================================
-- 2b. TABLE: application_events
-- ================================================================
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
    CONSTRAINT application_events_parent_fk FOREIGN KEY (application_id, user_id, job_id) REFERENCES public.applications(id, user_id, job_id) ON DELETE CASCADE,
    CONSTRAINT application_events_user_event_key_key UNIQUE (user_id, event_key),
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
    CONSTRAINT chk_app_events_status_change_to_status CHECK (
      event_type <> 'STATUS_CHANGE' OR to_status IS NOT NULL
    ),
    CONSTRAINT chk_app_events_from_status_valid CHECK (
      from_status IS NULL OR from_status IN ('NEW', 'PREPARED', 'APPLIED', 'INTERVIEW', 'REJECTED', 'OFFER')
    ),
    CONSTRAINT chk_app_events_to_status_valid CHECK (
      to_status IS NULL OR to_status IN ('NEW', 'PREPARED', 'APPLIED', 'INTERVIEW', 'REJECTED', 'OFFER')
    )
);

CREATE INDEX IF NOT EXISTS idx_app_events_user_created ON public.application_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_events_app_created ON public.application_events (application_id, created_at ASC);

-- ================================================================
-- 3. TABLE: tailored_resumes
-- ================================================================
CREATE TABLE IF NOT EXISTS public.tailored_resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    job_id UUID NOT NULL,
    target_title TEXT,
    headline TEXT,
    professional_summary TEXT,
    priority_skills JSONB DEFAULT '[]'::jsonb,
    selected_experience JSONB DEFAULT '[]'::jsonb,
    ats_keywords JSONB DEFAULT '{}'::jsonb,
    matched_keywords JSONB DEFAULT '[]'::jsonb,
    related_keywords JSONB DEFAULT '[]'::jsonb,
    missing_keywords JSONB DEFAULT '[]'::jsonb,
    audit_notes JSONB DEFAULT '[]'::jsonb,
    ats_coverage INTEGER,
    resume_language TEXT DEFAULT 'pt-BR',
    resume_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT tailored_resumes_user_job_fk FOREIGN KEY (job_id, user_id) REFERENCES public.jobs(id, user_id) ON DELETE CASCADE,
    CONSTRAINT tailored_resumes_user_job_key UNIQUE (user_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_tailored_resumes_user_id ON public.tailored_resumes (user_id);
CREATE INDEX IF NOT EXISTS idx_tailored_resumes_job_id ON public.tailored_resumes (job_id);

-- ================================================================
-- 4. TABLE: source_snapshots
-- ================================================================
CREATE TABLE IF NOT EXISTS public.source_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source_name TEXT NOT NULL,
    provider TEXT NOT NULL,
    board_token TEXT,
    window_days INTEGER DEFAULT 30,
    total_jobs INTEGER DEFAULT 0,
    brazil_latam_jobs INTEGER DEFAULT 0,
    relevant_jobs INTEGER DEFAULT 0,
    jobs_85_plus INTEGER DEFAULT 0,
    jobs_90_plus INTEGER DEFAULT 0,
    relevance_rate NUMERIC DEFAULT 0,
    high_match_rate NUMERIC DEFAULT 0,
    excellent_match_rate NUMERIC DEFAULT 0,
    yield_score INTEGER,
    confidence TEXT,
    current_priority TEXT,
    suggested_priority TEXT,
    captured_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_source_snapshots_user_id ON public.source_snapshots (user_id);
CREATE INDEX IF NOT EXISTS idx_source_snapshots_captured_at ON public.source_snapshots (captured_at DESC);

-- ================================================================
-- 5. TRIGGER FUNCTION FOR AUTOMATIC updated_at
-- ================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_jobs_updated_at ON public.jobs;
CREATE TRIGGER set_jobs_updated_at
    BEFORE UPDATE ON public.jobs
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_applications_updated_at ON public.applications;
CREATE TRIGGER set_applications_updated_at
    BEFORE UPDATE ON public.applications
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_tailored_resumes_updated_at ON public.tailored_resumes;
CREATE TRIGGER set_tailored_resumes_updated_at
    BEFORE UPDATE ON public.tailored_resumes
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ================================================================
-- 6. STRICT ROW LEVEL SECURITY (RLS) POLICIES
--    Acesso EXCLUSIVO para o usuário autenticado dono da linha
-- ================================================================
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tailored_resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_snapshots ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Allow all access to jobs" ON public.jobs;
DROP POLICY IF EXISTS "Allow all access to applications" ON public.applications;
DROP POLICY IF EXISTS "Allow all access to application_events" ON public.application_events;
DROP POLICY IF EXISTS "Allow all access to tailored_resumes" ON public.tailored_resumes;
DROP POLICY IF EXISTS "Allow all access to source_snapshots" ON public.source_snapshots;

-- POLÍTICAS SEGURAS: Apenas a role authenticated com user_id coincidente
CREATE POLICY "Users can manage their own jobs"
    ON public.jobs
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own applications"
    ON public.applications
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own application events"
    ON public.application_events
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own tailored resumes"
    ON public.tailored_resumes
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own source snapshots"
    ON public.source_snapshots
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
