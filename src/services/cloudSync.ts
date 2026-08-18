import {
  supabaseClient,
  isSupabaseConfigured,
  hasSupabaseUrl,
  hasPublishableKey,
  generateExternalKey,
  getAuthenticatedUserId,
  initSupabase,
  configDetails,
} from './supabase';
import { Job, JobWithAnalysis, ApplicationStatus, ApplicationDetails, ApplicationEvent, WorkplaceType } from '../types';
import { TailoredResume } from './resume';
import { DEFAULT_GREENHOUSE_BOARDS, LOCAL_STORAGE_BOARDS_KEY } from '../data/jobBoards';
import {
  LOCAL_STORAGE_KEY,
  LOCAL_STORAGE_DETAILS_KEY,
  LOCAL_STORAGE_EVENTS_KEY,
  LOCAL_STORAGE_JOBS_KEY,
  getJobStableId,
  getStoredStatuses,
  getStoredDetails,
  getStoredEvents,
  saveRestoredJobs,
} from './applicationStatus';

export interface CloudSyncDiagnostics {
  apiConfigStatus: string;
  configJsonValid: boolean;
  urlReceivedFromBackend: boolean;
  publishableKeyReceivedFromBackend: boolean;
  createClientExecuted: boolean;
  supabaseSessionActive: boolean;
  hasUrl: boolean;
  hasPublishableKey: boolean;
  clientInitialized: boolean;
  configured: boolean;
  authenticated: boolean;
  userEmail: string | null;
  connected: boolean;
  lastSync: string | null;
  jobsSynced: number;
  applicationsSynced: number;
  resumesSynced: number;
  snapshotsSynced: number;
  errors: string[];
}

export interface SupabaseErrorDetails {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
}

export interface StepDiagnostic {
  id: 'AUTH' | 'JOBS' | 'APPLICATIONS' | 'RESUMES' | 'SNAPSHOTS' | 'COMPLETE';
  name: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'OK' | 'ERROR' | 'TIMEOUT';
  foundCount: number;
  syncedCount: number;
  message?: string;
  error?: SupabaseErrorDetails;
}

export interface DetailedMigrationResult {
  status: 'SUCCESS' | 'ERROR' | 'TIMEOUT';
  currentStepId?: string;
  failedStepName?: string;
  userAuthOk: boolean;
  userId?: string;
  userEmail?: string;
  summary: {
    jobsFound: number;
    jobsSynced: number;
    appsFound: number;
    appsSynced: number;
    resumesFound: number;
    resumesSynced: number;
    snapshotsFound: number;
    snapshotsSynced: number;
  };
  steps: StepDiagnostic[];
  error?: SupabaseErrorDetails;
}

let lastSyncTimestamp: string | null = null;
let syncErrors: string[] = [];

// Session cache to prevent saving source snapshot more than once per source per session
const savedSnapshotsThisSession = new Set<string>();

/**
 * Defensive Promise wrapper with explicit timeout protection.
 */
export function withTimeout<T>(
  promise: Promise<T> | PromiseLike<T>,
  ms: number = 10000,
  operationName: string = 'Operação Supabase'
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const err: any = new Error(`TIMEOUT: Operação "${operationName}" excedeu o tempo limite de ${ms / 1000}s.`);
      err.code = 'TIMEOUT';
      reject(err);
    }, ms);

    Promise.resolve(promise)
      .then((res) => {
        clearTimeout(timer);
        resolve(res as T);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * Safely converts any potential date value to a valid ISO string.
 * Returns null if the value is null, undefined, empty, or unparseable.
 * Does NOT throw RangeError: Invalid time value.
 */
export function toSafeISOString(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;

  const date = value instanceof Date ? value : new Date(value as string | number);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * Ensures payload objects do NOT contain `undefined` properties.
 */
function sanitizePayload<T extends Record<string, any>>(obj: T): T {
  const clean: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val === undefined) {
      clean[key] = null;
    } else {
      clean[key] = val;
    }
  }
  return clean as T;
}

/**
 * Extracts structured Postgrest/Supabase error details.
 */
function extractSupabaseError(err: any): SupabaseErrorDetails {
  if (!err) return { message: 'Erro desconhecido' };
  return {
    message: err.message || String(err),
    code: err.code ? String(err.code) : undefined,
    details: err.details ? String(err.details) : undefined,
    hint: err.hint ? String(err.hint) : undefined,
  };
}

/**
 * Checks connectivity to Supabase.
 */
export async function testSupabaseConnection(): Promise<boolean> {
  await initSupabase();
  if (!isSupabaseConfigured || !supabaseClient) {
    return false;
  }
  try {
    const { data: { user }, error: authErr } = await withTimeout(
      supabaseClient.auth.getUser(),
      5000,
      'auth.getUser'
    );
    if (authErr || !user) {
      console.warn('[CloudSync] Test connection: No authenticated user session.');
      return false;
    }
    const { error } = await withTimeout(
      supabaseClient.from('jobs').select('id').limit(1),
      5000,
      'jobs.select'
    );
    if (error) {
      console.warn('[CloudSync] Test connection error:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[CloudSync] Connection failed:', err);
    return false;
  }
}

/**
 * Saves job to Supabase under authenticated user.
 */
export async function syncJobToSupabase(
  job: Job | JobWithAnalysis,
  options: { force?: boolean } = {},
  overrideUserId?: string
): Promise<string | null> {
  if (!isSupabaseConfigured || !supabaseClient) {
    return null;
  }

  const userId = overrideUserId || (await getAuthenticatedUserId());
  if (!userId) {
    return null;
  }

  const score = (job as JobWithAnalysis).analysis?.score ?? 0;
  const status = job.status || 'NEW';
  const shouldSave = options.force || score >= 75 || status !== 'NEW';

  if (!shouldSave) {
    return null;
  }

  const extKey = generateExternalKey(job);
  const now = new Date().toISOString();
  const analysis = (job as JobWithAnalysis).analysis;

  const publishedAtSafe = toSafeISOString(job.publishedAt);
  if (job.publishedAt && publishedAtSafe === null) {
    console.warn('[CloudSync Diagnostic] Invalid temporal value in job publishedAt:', {
      external_key: extKey,
      title: job.title || 'Sem título',
      invalid_field: 'publishedAt',
      original_value: job.publishedAt,
    });
  }

  const payload = sanitizePayload({
    user_id: userId,
    external_key: extKey,
    title: job.title || 'Sem título',
    company: job.company || 'Empresa não informada',
    location: job.location || '',
    description: job.description || '',
    url: job.url || '',
    published_at: publishedAtSafe,
    source: job.source || 'unknown',
    sources: job.sources || (job.source ? [job.source] : []),
    geo_classification: job.geoCategory || null,
    score: score,
    score_breakdown: analysis?.breakdown || {},
    ats_coverage: analysis ? Math.round((analysis.matchedSkills.length / Math.max(1, analysis.matchedSkills.length + analysis.missingSkills.length)) * 100) : null,
    matched_skills: analysis?.matchedSkills || [],
    related_skills: analysis?.relatedSkills || [],
    missing_skills: analysis?.missingSkills || [],
    ats_keywords: analysis?.atsKeywords || [],
    match_reasons: analysis?.matchReasons || [],
    last_seen_at: toSafeISOString(now) || now,
    updated_at: toSafeISOString(now) || now,
  });

  try {
    const { data, error } = await withTimeout(
      supabaseClient
        .from('jobs')
        .upsert(payload, { onConflict: 'user_id, external_key' })
        .select('id')
        .maybeSingle(),
      8000,
      `upsert job ${job.title}`
    );

    if (error) {
      console.error('[CloudSync] Error upserting job:', error.message);
      syncErrors.push(`Job ${job.title}: ${error.message}`);
      return null;
    }

    if (data?.id) {
      lastSyncTimestamp = new Date().toLocaleTimeString('pt-BR');
      return data.id;
    }

    // Fallback if upsert select returned no id
    const { data: fallbackData, error: fbErr } = await withTimeout(
      supabaseClient
        .from('jobs')
        .select('id')
        .eq('user_id', userId)
        .eq('external_key', extKey)
        .maybeSingle(),
      5000,
      `fetch job id ${job.title}`
    );

    if (fallbackData?.id) {
      lastSyncTimestamp = new Date().toLocaleTimeString('pt-BR');
      return fallbackData.id;
    }

    if (fbErr) {
      syncErrors.push(`Job ${job.title} fetch fallback: ${fbErr.message}`);
    }

    return null;
  } catch (err: any) {
    console.error('[CloudSync] Job sync failed:', err);
    syncErrors.push(`Job ${job.title}: ${err.message || String(err)}`);
    return null;
  }
}

/**
 * Sync application status change to `applications` table.
 */
export async function syncApplicationStatus(
  job: Job | JobWithAnalysis,
  details: ApplicationDetails | ApplicationStatus,
  autoEvent?: ApplicationEvent | null,
  overrideUserId?: string,
  overrideJobId?: string
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabaseClient) {
    return false;
  }

  const userId = overrideUserId || (await getAuthenticatedUserId());
  if (!userId) {
    return false;
  }

  try {
    const jobId = overrideJobId || (await syncJobToSupabase(job, { force: true }, userId));
    if (!jobId) return false;

    const { data: existingApp } = await withTimeout(
      supabaseClient
        .from('applications')
        .select('*')
        .eq('user_id', userId)
        .eq('job_id', jobId)
        .maybeSingle(),
      5000,
      `select application ${job.title}`
    );

    const appDetails: Partial<ApplicationDetails> =
      typeof details === 'string' ? { status: details } : details;

    const status = appDetails.status || 'NEW';
    const now = new Date().toISOString();
    const extKey = generateExternalKey(job);

    const checkAppDate = (fieldName: string, rawValue: unknown): string | null => {
      const safe = toSafeISOString(rawValue);
      if (rawValue && safe === null) {
        console.warn(`[CloudSync Diagnostic] Invalid temporal value in application ${fieldName}:`, {
          external_key: extKey,
          title: job.title || 'Sem título',
          invalid_field: fieldName,
          original_value: rawValue,
        });
      }
      return safe;
    };

    const rawPrepared = appDetails.prepared_at || (status === 'PREPARED' ? (existingApp?.prepared_at || now) : existingApp?.prepared_at || null);
    const prepared_at = checkAppDate('prepared_at', rawPrepared);

    const rawApplied = appDetails.applied_at || (status === 'APPLIED' ? (existingApp?.applied_at || now) : existingApp?.applied_at || null);
    const applied_at = checkAppDate('applied_at', rawApplied);

    const rawInterview = appDetails.interview_at || (status === 'INTERVIEW' ? (existingApp?.interview_at || now) : existingApp?.interview_at || null);
    const interview_at = checkAppDate('interview_at', rawInterview);

    const rawRejected = appDetails.rejected_at || (status === 'REJECTED' ? (existingApp?.rejected_at || now) : existingApp?.rejected_at || null);
    const rejected_at = checkAppDate('rejected_at', rawRejected);

    const rawOffer = appDetails.offer_at || (status === 'OFFER' ? (existingApp?.offer_at || now) : existingApp?.offer_at || null);
    const offer_at = checkAppDate('offer_at', rawOffer);

    const rawLastActivity = appDetails.last_activity_at || now;
    const last_activity_at = checkAppDate('last_activity_at', rawLastActivity) || now;

    const next_step_date = checkAppDate('next_step_date', appDetails.next_step_date);

    const payload = sanitizePayload({
      user_id: userId,
      job_id: jobId,
      status: status || 'NEW',
      prepared_at,
      applied_at,
      interview_at,
      rejected_at,
      offer_at,
      last_activity_at,
      notes: appDetails.notes !== undefined ? appDetails.notes : existingApp?.notes || null,
      company_contact_name: appDetails.company_contact_name !== undefined ? appDetails.company_contact_name : existingApp?.company_contact_name || null,
      company_contact_email: appDetails.company_contact_email !== undefined ? appDetails.company_contact_email : existingApp?.company_contact_email || null,
      recruiter_name: appDetails.recruiter_name !== undefined ? appDetails.recruiter_name : existingApp?.recruiter_name || null,
      recruiter_linkedin: appDetails.recruiter_linkedin !== undefined ? appDetails.recruiter_linkedin : existingApp?.recruiter_linkedin || null,
      salary_expectation: appDetails.salary_expectation !== undefined ? appDetails.salary_expectation : existingApp?.salary_expectation || null,
      salary_offered: appDetails.salary_offered !== undefined ? appDetails.salary_offered : existingApp?.salary_offered || null,
      work_model: appDetails.work_model !== undefined ? appDetails.work_model : existingApp?.work_model || null,
      application_channel: appDetails.application_channel !== undefined ? appDetails.application_channel : existingApp?.application_channel || null,
      application_url: appDetails.application_url !== undefined ? appDetails.application_url : existingApp?.application_url || null,
      next_step: appDetails.next_step !== undefined ? appDetails.next_step : existingApp?.next_step || null,
      next_step_date,
      apply_priority_at_application: appDetails.apply_priority_at_application !== undefined ? appDetails.apply_priority_at_application : existingApp?.apply_priority_at_application || null,
      match_score_at_application: appDetails.match_score_at_application !== undefined ? appDetails.match_score_at_application : existingApp?.match_score_at_application || null,
      ats_coverage_at_application: appDetails.ats_coverage_at_application !== undefined ? appDetails.ats_coverage_at_application : existingApp?.ats_coverage_at_application || null,
      follow_up_snoozed_until: appDetails.follow_up_snoozed_until !== undefined ? appDetails.follow_up_snoozed_until : existingApp?.follow_up_snoozed_until || null,
      follow_up_override: appDetails.follow_up_override !== undefined ? appDetails.follow_up_override : existingApp?.follow_up_override || 'AUTO',
      updated_at: now,
    });

    const { data: upsertedApp, error } = await withTimeout(
      supabaseClient
        .from('applications')
        .upsert(payload, { onConflict: 'user_id, job_id' })
        .select('id')
        .maybeSingle(),
      8000,
      `upsert application ${job.title}`
    );

    if (error) {
      console.error('[CloudSync] Error syncing application status:', error.message);
      syncErrors.push(`Status ${job.title}: ${error.message}`);
      return false;
    }

    const application_id = upsertedApp?.id || existingApp?.id;

    if (autoEvent && application_id) {
      await syncApplicationEventInternal({
        ...autoEvent,
        application_id,
        job_id: jobId,
        user_id: userId,
      });
    }

    lastSyncTimestamp = new Date().toLocaleTimeString('pt-BR');
    return true;
  } catch (err: any) {
    console.error('[CloudSync] Status sync failed:', err);
    syncErrors.push(`Status ${job.title}: ${err.message || String(err)}`);
    return false;
  }
}

export async function syncApplicationEvent(
  job: Job | JobWithAnalysis,
  event: ApplicationEvent,
  overrideUserId?: string
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabaseClient) return false;

  const userId = overrideUserId || (await getAuthenticatedUserId());
  if (!userId) return false;

  try {
    const jobId = await syncJobToSupabase(job, { force: true }, userId);
    if (!jobId) return false;

    // Get remote application id
    const { data: appData } = await supabaseClient
      .from('applications')
      .select('id')
      .eq('user_id', userId)
      .eq('job_id', jobId)
      .maybeSingle();

    if (!appData?.id) return false;

    return await syncApplicationEventInternal({
      ...event,
      application_id: appData.id,
      job_id: jobId,
      user_id: userId,
    });
  } catch (err: any) {
    console.error('[CloudSync] syncApplicationEvent failed:', err);
    return false;
  }
}

async function syncApplicationEventInternal(eventData: {
  application_id: string;
  job_id: string;
  user_id: string;
  from_status?: string | null;
  to_status?: string | null;
  event_type: string;
  notes?: string | null;
  metadata?: Record<string, any>;
  event_key?: string | null;
  created_at?: string;
}): Promise<boolean> {
  if (!supabaseClient) return false;

  try {
    const createdAtSafe = toSafeISOString(eventData.created_at) || new Date().toISOString();
    if (eventData.created_at && toSafeISOString(eventData.created_at) === null) {
      console.warn('[CloudSync Diagnostic] Invalid temporal value in application_event created_at:', {
        event_type: eventData.event_type,
        invalid_field: 'created_at',
        original_value: eventData.created_at,
      });
    }

    const payload = sanitizePayload({
      user_id: eventData.user_id,
      application_id: eventData.application_id,
      job_id: eventData.job_id,
      from_status: eventData.from_status || null,
      to_status: eventData.to_status || null,
      event_type: eventData.event_type,
      notes: eventData.notes || null,
      metadata: eventData.metadata || {},
      event_key: eventData.event_key || null,
      created_at: createdAtSafe,
    });

    const { error } = await withTimeout(
      supabaseClient
        .from('application_events')
        .upsert(payload, { onConflict: 'user_id, event_key' }),
      8000,
      `upsert application_event ${eventData.event_type}`
    );

    if (error) {
      console.error('[CloudSync] Error syncing application event:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error('[CloudSync] Event sync failed:', err);
    return false;
  }
}

export interface TailoredResumeSyncDiagnostic {
  success: boolean;
  resumeGenerated: boolean;
  jobSynced: boolean;
  remoteJobId: string | null;
  resumeSynced: boolean;
  error?: SupabaseErrorDetails;
}

/**
 * Sync tailored resume to `tailored_resumes` table.
 */
export async function syncTailoredResume(
  job: Job | JobWithAnalysis,
  tailoredResume: TailoredResume,
  overrideUserId?: string,
  overrideJobId?: string
): Promise<TailoredResumeSyncDiagnostic> {
  if (!isSupabaseConfigured || !supabaseClient) {
    return {
      success: false,
      resumeGenerated: Boolean(tailoredResume),
      jobSynced: false,
      remoteJobId: null,
      resumeSynced: false,
      error: { message: 'Supabase não está configurado ou cliente não inicializado.' },
    };
  }

  const userId = overrideUserId || (await getAuthenticatedUserId());
  if (!userId) {
    return {
      success: false,
      resumeGenerated: Boolean(tailoredResume),
      jobSynced: false,
      remoteJobId: null,
      resumeSynced: false,
      error: { message: 'Usuário não autenticado no Supabase.' },
    };
  }

  try {
    const jobId = overrideJobId || (await syncJobToSupabase(job, { force: true }, userId));
    const jobSynced = Boolean(jobId);

    if (!jobId) {
      const errDetails: SupabaseErrorDetails = {
        message: `Não foi possível sincronizar a vaga no Supabase para obter o job_id remoto.`,
      };
      syncErrors.push(`Resume ${job.title}: ${errDetails.message}`);
      return {
        success: false,
        resumeGenerated: Boolean(tailoredResume),
        jobSynced: false,
        remoteJobId: null,
        resumeSynced: false,
        error: errDetails,
      };
    }

    const now = new Date().toISOString();

    const payload = sanitizePayload({
      user_id: userId,
      job_id: jobId,
      target_title: tailoredResume.targetTitle || job.title || '',
      headline: tailoredResume.headline || null,
      professional_summary: tailoredResume.professionalSummary || null,
      priority_skills: tailoredResume.prioritySkills || [],
      selected_experience: tailoredResume.selectedExperienceBullets || [],
      ats_keywords: tailoredResume.atsKeywords || {},
      matched_keywords: tailoredResume.atsKeywords?.matched || [],
      related_keywords: tailoredResume.atsKeywords?.related || [],
      missing_keywords: tailoredResume.atsKeywords?.missing || [],
      audit_notes: tailoredResume.notes || [],
      ats_coverage: tailoredResume.atsCoverageScore || 0,
      resume_language: tailoredResume.resumeLanguage || 'pt-BR',
      resume_text: JSON.stringify(tailoredResume),
      updated_at: now,
    });

    const { error } = await withTimeout(
      supabaseClient
        .from('tailored_resumes')
        .upsert(payload, { onConflict: 'user_id, job_id' }),
      8000,
      `upsert tailored resume ${job.title}`
    );

    if (error) {
      const errDetails = extractSupabaseError(error);
      console.error('[CloudSync] Error syncing tailored resume:', errDetails.message);
      syncErrors.push(`Resume ${job.title}: ${errDetails.message}`);
      return {
        success: false,
        resumeGenerated: Boolean(tailoredResume),
        jobSynced,
        remoteJobId: jobId,
        resumeSynced: false,
        error: errDetails,
      };
    }

    lastSyncTimestamp = new Date().toLocaleTimeString('pt-BR');
    return {
      success: true,
      resumeGenerated: Boolean(tailoredResume),
      jobSynced: true,
      remoteJobId: jobId,
      resumeSynced: true,
    };
  } catch (err: any) {
    const errDetails = extractSupabaseError(err);
    console.error('[CloudSync] Tailored resume sync failed:', errDetails.message);
    syncErrors.push(`Resume ${job.title}: ${errDetails.message}`);
    return {
      success: false,
      resumeGenerated: Boolean(tailoredResume),
      jobSynced: false,
      remoteJobId: null,
      resumeSynced: false,
      error: errDetails,
    };
  }
}

/**
 * Save source snapshot with user_id.
 */
export async function syncSourceSnapshot(
  data: {
    sourceName: string;
    provider: string;
    boardToken?: string;
    windowDays?: number;
    totalJobs: number;
    brazilLatamJobs: number;
    relevantJobs: number;
    jobs85Plus: number;
    jobs90Plus: number;
    relevanceRate?: number;
    highMatchRate?: number;
    excellentMatchRate?: number;
    yieldScore: number | null;
    confidence: string;
    currentPriority: number | string;
    suggestedPriority: number | string;
  },
  overrideUserId?: string
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabaseClient) {
    return false;
  }

  const userId = overrideUserId || (await getAuthenticatedUserId());
  if (!userId) {
    return false;
  }

  const sessionKey = `${userId}_${data.sourceName}_${data.boardToken || 'default'}`;
  if (savedSnapshotsThisSession.has(sessionKey)) {
    return true;
  }

  try {
    const payload = sanitizePayload({
      user_id: userId,
      source_name: data.sourceName,
      provider: data.provider,
      board_token: data.boardToken || null,
      window_days: data.windowDays || 30,
      total_jobs: data.totalJobs || 0,
      brazil_latam_jobs: data.brazilLatamJobs || 0,
      relevant_jobs: data.relevantJobs || 0,
      jobs_85_plus: data.jobs85Plus || 0,
      jobs_90_plus: data.jobs90Plus || 0,
      relevance_rate: data.relevanceRate ?? (data.brazilLatamJobs > 0 ? Math.round((data.relevantJobs / data.brazilLatamJobs) * 100) : 0),
      high_match_rate: data.highMatchRate ?? (data.brazilLatamJobs > 0 ? Math.round((data.jobs85Plus / data.brazilLatamJobs) * 100) : 0),
      excellent_match_rate: data.excellentMatchRate ?? (data.brazilLatamJobs > 0 ? Math.round((data.jobs90Plus / data.brazilLatamJobs) * 100) : 0),
      yield_score: data.yieldScore ?? null,
      confidence: data.confidence || 'LOW',
      current_priority: String(data.currentPriority ?? '1'),
      suggested_priority: String(data.suggestedPriority ?? '1'),
      captured_at: new Date().toISOString(),
    });

    const { error } = await withTimeout(
      supabaseClient.from('source_snapshots').insert(payload),
      8000,
      `insert snapshot ${data.sourceName}`
    );

    if (error) {
      console.error('[CloudSync] Error saving source snapshot:', error.message);
      syncErrors.push(`Snapshot ${data.sourceName}: ${error.message}`);
      return false;
    }

    savedSnapshotsThisSession.add(sessionKey);
    lastSyncTimestamp = new Date().toLocaleTimeString('pt-BR');
    return true;
  } catch (err: any) {
    console.error('[CloudSync] Snapshot sync failed:', err);
    syncErrors.push(`Snapshot ${data.sourceName}: ${err.message || String(err)}`);
    return false;
  }
}

/**
 * Restore data from Supabase to local state for authenticated user.
 */
export async function restoreCloudData(): Promise<{
  restoredJobs: number;
  restoredApplications: number;
  restoredResumes: number;
  appliedMap: Record<string, ApplicationStatus>;
  tailoredResumesMap: Record<string, TailoredResume>;
} | null> {
  if (!isSupabaseConfigured || !supabaseClient) {
    return null;
  }

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return null;
  }

  try {
    const { data: jobs, error: jErr } = await withTimeout(
      supabaseClient.from('jobs').select('*'),
      8000,
      'fetch jobs'
    );
    if (jErr) throw jErr;

    const { data: apps, error: aErr } = await withTimeout(
      supabaseClient.from('applications').select('*'),
      8000,
      'fetch applications'
    );
    if (aErr) throw aErr;

    const { data: events, error: eErr } = await withTimeout(
      supabaseClient.from('application_events').select('*').order('created_at', { ascending: true }),
      8000,
      'fetch application_events'
    );
    if (eErr && eErr.code !== '42P01') { // Ignore relation missing if migration not applied yet
      console.warn('[CloudSync] Warning fetching application_events:', eErr.message);
    }

    const { data: resumes, error: rErr } = await withTimeout(
      supabaseClient.from('tailored_resumes').select('*'),
      8000,
      'fetch tailored_resumes'
    );
    if (rErr) throw rErr;

    const appliedMap: Record<string, ApplicationStatus> = {};
    const detailsMap: Record<string, ApplicationDetails> = {};
    const tailoredResumesMap: Record<string, TailoredResume> = {};

    const jobIdToKeyMap = new Map<string, string>();
    const restoredJobsList: JobWithAnalysis[] = [];

    // 1. Process jobs fetched from Supabase and calculate normalized stable keys
    (jobs || []).forEach((j) => {
      const restoredJob: JobWithAnalysis = {
        id: j.id,
        title: j.title || 'Cargo sem título',
        company: j.company || 'Empresa não informada',
        location: j.location || '',
        description: j.description || '',
        url: j.url || '',
        publishedAt: j.published_at || new Date().toISOString(),
        workplaceType: (j.geo_classification === 'REMOTE' ? 'Remoto' : 'Híbrido') as WorkplaceType,
        seniority: 'Pleno',
        source: j.source || 'supabase',
        requirements: [],
        analysis: {
          score: j.score || 0,
          classification: j.score >= 90 ? 'Excelente' : j.score >= 80 ? 'Muito alta' : j.score >= 70 ? 'Boa' : 'Média',
          breakdown: j.score_breakdown || { total: j.score || 0, titleScore: 0, skillsScore: 0, experienceScore: 0, toolsScore: 0, seniorityScore: 0, languageScore: 0, educationScore: 0, locationScore: 0, keywordsScore: 0 },
          matchedSkills: j.matched_skills || [],
          relatedSkills: j.related_skills || [],
          missingSkills: j.missing_skills || [],
          atsKeywords: j.ats_keywords || [],
          matchReasons: j.match_reasons || [],
          strengths: [],
          gaps: [],
          relevantExperienceSummary: [],
        },
      };

      const stableKey = getJobStableId(restoredJob);
      restoredJobsList.push(restoredJob);

      jobIdToKeyMap.set(j.id, stableKey);
      if (j.external_key) jobIdToKeyMap.set(j.external_key, stableKey);
      if (j.url) {
        jobIdToKeyMap.set(j.url, stableKey);
        jobIdToKeyMap.set(j.url.toLowerCase().trim(), stableKey);
      }
      jobIdToKeyMap.set(stableKey, stableKey);
    });

    // Save restored jobs to localStorage so Cockpit can reconstruct cards
    if (restoredJobsList.length > 0) {
      saveRestoredJobs(restoredJobsList);
    }

    // 2. Process applications, resolving candidate keys and preserving unresolved applications
    (apps || []).forEach((app) => {
      let key = jobIdToKeyMap.get(app.job_id) || jobIdToKeyMap.get(app.job_key);
      let isUnresolved = false;

      if (!key && app.application_url) {
        try {
          key = getJobStableId({ url: app.application_url, company: '', title: '' } as any);
        } catch {
          // ignore
        }
      }

      if (!key) {
        key = app.job_id || `UNRESOLVED_${app.id}`;
        isUnresolved = true;
      }

      const appStatus = (app.status as ApplicationStatus) || 'NEW';
      appliedMap[key] = appStatus;

      const restoredDetail: ApplicationDetails = {
        id: app.id,
        jobId: app.job_id || key,
        jobKey: key,
        status: appStatus,
        prepared_at: app.prepared_at,
        applied_at: app.applied_at,
        interview_at: app.interview_at,
        rejected_at: app.rejected_at,
        offer_at: app.offer_at,
        last_activity_at: app.last_activity_at || app.updated_at || app.created_at,
        notes: app.notes,
        company_contact_name: app.company_contact_name,
        company_contact_email: app.company_contact_email,
        recruiter_name: app.recruiter_name,
        recruiter_linkedin: app.recruiter_linkedin,
        salary_expectation: app.salary_expectation,
        salary_offered: app.salary_offered,
        work_model: app.work_model,
        application_channel: app.application_channel,
        application_url: app.application_url,
        next_step: app.next_step,
        next_step_date: app.next_step_date,
        apply_priority_at_application: app.apply_priority_at_application,
        match_score_at_application: app.match_score_at_application,
        ats_coverage_at_application: app.ats_coverage_at_application,
        follow_up_snoozed_until: app.follow_up_snoozed_until,
        follow_up_override: app.follow_up_override || 'AUTO',
        created_at: app.created_at,
        updated_at: app.updated_at,
      };

      detailsMap[key] = restoredDetail;

      console.log(`[CloudSync Restore Audit] Restored application id=${app.id}, status=${appStatus}, resolvedKey=${key}, unresolved=${isUnresolved}`);
    });

    // 3. Perform a MERGE with local storage (preserving local data without overwrite)
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const localStatusMap = getStoredStatuses();
        const localDetailsMap = getStoredDetails();
        const localEvents = getStoredEvents();

        const mergedStatusMap = { ...localStatusMap, ...appliedMap };
        const mergedDetailsMap = { ...localDetailsMap, ...detailsMap };

        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(mergedStatusMap));
        localStorage.setItem(LOCAL_STORAGE_DETAILS_KEY, JSON.stringify(mergedDetailsMap));

        if (events && Array.isArray(events) && events.length > 0) {
          const eventMap = new Map<string, any>();
          localEvents.forEach((e) => {
            if (e.id) eventMap.set(e.id, e);
          });
          events.forEach((e) => {
            if (e.id) eventMap.set(e.id, e);
          });
          const mergedEvents = Array.from(eventMap.values());
          localStorage.setItem(LOCAL_STORAGE_EVENTS_KEY, JSON.stringify(mergedEvents));
        }
      } catch (e) {
        console.error('Error writing merged application details to localStorage:', e);
      }
    }

    (resumes || []).forEach((res) => {
      const key = jobIdToKeyMap.get(res.job_id) || res.job_id;
      if (key && res.resume_text) {
        try {
          tailoredResumesMap[key] = JSON.parse(res.resume_text);
        } catch {
          tailoredResumesMap[key] = {
            resumeLanguage: res.resume_language || 'pt-BR',
            targetTitle: res.target_title || '',
            headline: res.headline || '',
            professionalSummary: res.professional_summary || '',
            prioritySkills: res.priority_skills || [],
            selectedExperienceBullets: res.selected_experience || [],
            atsKeywords: res.ats_keywords || { matched: [], related: [], missing: [] },
            atsCoverageScore: res.ats_coverage || 0,
            totalRelevantJobKeywords: 0,
            coveredJobKeywordsCount: 0,
            notes: res.audit_notes || [],
          };
        }
      }
    });

    lastSyncTimestamp = new Date().toLocaleTimeString('pt-BR');

    return {
      restoredJobs: jobs?.length || 0,
      restoredApplications: apps?.length || 0,
      restoredResumes: resumes?.length || 0,
      appliedMap,
      tailoredResumesMap,
    };
  } catch (err: any) {
    console.error('[CloudSync] Restore failed:', err);
    syncErrors.push(`Restore error: ${err.message || String(err)}`);
    return null;
  }
}

/**
 * Audit & step-by-step migration of local data to Supabase under current auth.uid().
 */
export async function migrateLocalDataToSupabase(
  appliedMap: Record<string, ApplicationStatus>,
  tailoredResumesMap: Record<string, TailoredResume>,
  jobList: JobWithAnalysis[],
  onProgress?: (result: DetailedMigrationResult) => void
): Promise<DetailedMigrationResult> {
  const steps: StepDiagnostic[] = [
    { id: 'AUTH', name: 'Sessão autenticada', status: 'PENDING', foundCount: 0, syncedCount: 0 },
    { id: 'JOBS', name: 'Jobs', status: 'PENDING', foundCount: 0, syncedCount: 0 },
    { id: 'APPLICATIONS', name: 'Applications', status: 'PENDING', foundCount: 0, syncedCount: 0 },
    { id: 'RESUMES', name: 'Tailored Resumes', status: 'PENDING', foundCount: 0, syncedCount: 0 },
    { id: 'SNAPSHOTS', name: 'Source Snapshots', status: 'PENDING', foundCount: 0, syncedCount: 0 },
    { id: 'COMPLETE', name: 'Sincronização concluída', status: 'PENDING', foundCount: 0, syncedCount: 0 },
  ];

  const result: DetailedMigrationResult = {
    status: 'SUCCESS',
    userAuthOk: false,
    summary: {
      jobsFound: 0,
      jobsSynced: 0,
      appsFound: 0,
      appsSynced: 0,
      resumesFound: 0,
      resumesSynced: 0,
      snapshotsFound: 0,
      snapshotsSynced: 0,
    },
    steps,
  };

  const updateStep = (
    stepId: StepDiagnostic['id'],
    patch: Partial<StepDiagnostic>
  ) => {
    const idx = steps.findIndex((s) => s.id === stepId);
    if (idx !== -1) {
      steps[idx] = { ...steps[idx], ...patch };
    }
    if (onProgress) {
      onProgress({ ...result, steps: [...steps] });
    }
  };

  if (!isSupabaseConfigured || !supabaseClient) {
    updateStep('AUTH', {
      status: 'ERROR',
      message: 'Supabase não está configurado. Verifique a URL e a Publishable Key.',
      error: { message: 'Cliente Supabase não inicializado' },
    });
    result.status = 'ERROR';
    result.failedStepName = 'Sessão autenticada';
    result.error = { message: 'Cliente Supabase não inicializado' };
    return result;
  }

  let activeUser: any = null;

  // STEP 1: AUTH
  try {
    updateStep('AUTH', { status: 'IN_PROGRESS' });
    const { data: { user }, error: authErr } = await withTimeout(
      supabaseClient.auth.getUser(),
      8000,
      'auth.getUser'
    );

    if (authErr || !user || !user.id) {
      const errDetails = extractSupabaseError(authErr || 'Nenhum usuário autenticado encontrado');
      updateStep('AUTH', {
        status: 'ERROR',
        message: `Sessão inválida ou não autenticada: ${errDetails.message}`,
        error: errDetails,
      });
      result.status = 'ERROR';
      result.failedStepName = 'Sessão autenticada';
      result.error = errDetails;
      return result;
    }

    activeUser = user;
    result.userAuthOk = true;
    result.userId = user.id;
    result.userEmail = user.email || undefined;

    updateStep('AUTH', {
      status: 'OK',
      foundCount: 1,
      syncedCount: 1,
      message: `OK (User ID: ${user.id})`,
    });
  } catch (err: any) {
    const isTimeout = err.code === 'TIMEOUT' || String(err).includes('TIMEOUT');
    const errDetails = extractSupabaseError(err);
    updateStep('AUTH', {
      status: isTimeout ? 'TIMEOUT' : 'ERROR',
      message: isTimeout ? 'TIMEOUT NA ETAPA: Sessão autenticada' : `ERRO NA ETAPA: Sessão autenticada (${errDetails.message})`,
      error: errDetails,
    });
    result.status = isTimeout ? 'TIMEOUT' : 'ERROR';
    result.failedStepName = 'Sessão autenticada';
    result.error = errDetails;
    return result;
  }

  const userId = activeUser.id;

  // Map to store newly generated UUIDs: key -> jobId
  const keyToJobIdMap = new Map<string, string>();

  // STEP 2: JOBS
  try {
    updateStep('JOBS', { status: 'IN_PROGRESS' });

    // Filter jobs to migrate
    const eligibleJobs = jobList.filter((job) => {
      const extKey = generateExternalKey(job);
      const localStatus = appliedMap[job.url] || appliedMap[extKey] || job.status;
      const localResume = tailoredResumesMap[job.url] || tailoredResumesMap[extKey];
      return (job.analysis?.score ?? 0) >= 75 || (localStatus && localStatus !== 'NEW') || Boolean(localResume);
    });

    // If no eligible jobs by filter, take all local jobs if present
    const jobsToMigrate = eligibleJobs.length > 0 ? eligibleJobs : jobList;
    result.summary.jobsFound = jobsToMigrate.length;

    updateStep('JOBS', { foundCount: jobsToMigrate.length, syncedCount: 0 });

    let syncedJobs = 0;
    for (const job of jobsToMigrate) {
      const extKey = generateExternalKey(job);
      const jobId = await syncJobToSupabase(job, { force: true }, userId);
      if (jobId) {
        syncedJobs++;
        keyToJobIdMap.set(extKey, jobId);
        if (job.url) keyToJobIdMap.set(job.url, jobId);
      }
    }

    result.summary.jobsSynced = syncedJobs;
    updateStep('JOBS', {
      status: 'OK',
      syncedCount: syncedJobs,
      message: `${syncedJobs} de ${jobsToMigrate.length} vagas sincronizadas com sucesso`,
    });
  } catch (err: any) {
    const isTimeout = err.code === 'TIMEOUT' || String(err).includes('TIMEOUT');
    const errDetails = extractSupabaseError(err);
    updateStep('JOBS', {
      status: isTimeout ? 'TIMEOUT' : 'ERROR',
      message: isTimeout ? 'TIMEOUT NA ETAPA: Jobs' : `ERRO NA ETAPA: Jobs (${errDetails.message})`,
      error: errDetails,
    });
    result.status = isTimeout ? 'TIMEOUT' : 'ERROR';
    result.failedStepName = 'Jobs';
    result.error = errDetails;
    return result;
  }

  // STEP 3: APPLICATIONS
  try {
    updateStep('APPLICATIONS', { status: 'IN_PROGRESS' });

    // Build list of applications to sync
    const appEntries: { job: JobWithAnalysis; status: ApplicationStatus; extKey: string; url: string }[] = [];

    // Collect from appliedMap
    for (const [key, status] of Object.entries(appliedMap)) {
      if (status && status !== 'NEW') {
        const matchingJob = jobList.find((j) => j.url === key || generateExternalKey(j) === key);
        if (matchingJob) {
          appEntries.push({
            job: matchingJob,
            status,
            extKey: generateExternalKey(matchingJob),
            url: matchingJob.url || '',
          });
        }
      }
    }

    // Also collect from jobs that have status !== 'NEW'
    for (const job of jobList) {
      if (job.status && job.status !== 'NEW') {
        const extKey = generateExternalKey(job);
        const alreadyIn = appEntries.some((e) => e.extKey === extKey || (job.url && e.url === job.url));
        if (!alreadyIn) {
          appEntries.push({
            job,
            status: job.status,
            extKey,
            url: job.url || '',
          });
        }
      }
    }

    result.summary.appsFound = appEntries.length;
    updateStep('APPLICATIONS', { foundCount: appEntries.length, syncedCount: 0 });

    let syncedApps = 0;
    for (const entry of appEntries) {
      const existingJobId = keyToJobIdMap.get(entry.extKey) || keyToJobIdMap.get(entry.url);
      const success = await syncApplicationStatus(entry.job, entry.status, undefined, userId, existingJobId);
      if (success) {
        syncedApps++;
      }
    }

    result.summary.appsSynced = syncedApps;
    updateStep('APPLICATIONS', {
      status: 'OK',
      syncedCount: syncedApps,
      message: `${syncedApps} de ${appEntries.length} candidaturas sincronizadas`,
    });
  } catch (err: any) {
    const isTimeout = err.code === 'TIMEOUT' || String(err).includes('TIMEOUT');
    const errDetails = extractSupabaseError(err);
    updateStep('APPLICATIONS', {
      status: isTimeout ? 'TIMEOUT' : 'ERROR',
      message: isTimeout ? 'TIMEOUT NA ETAPA: Applications' : `ERRO NA ETAPA: Applications (${errDetails.message})`,
      error: errDetails,
    });
    result.status = isTimeout ? 'TIMEOUT' : 'ERROR';
    result.failedStepName = 'Applications';
    result.error = errDetails;
    return result;
  }

  // STEP 4: TAILORED RESUMES
  try {
    updateStep('RESUMES', { status: 'IN_PROGRESS' });

    const resumeEntries: { job: JobWithAnalysis; resume: TailoredResume; extKey: string; url: string }[] = [];

    for (const [key, resume] of Object.entries(tailoredResumesMap)) {
      if (resume) {
        const matchingJob = jobList.find((j) => j.url === key || generateExternalKey(j) === key);
        if (matchingJob) {
          resumeEntries.push({
            job: matchingJob,
            resume,
            extKey: generateExternalKey(matchingJob),
            url: matchingJob.url || '',
          });
        }
      }
    }

    result.summary.resumesFound = resumeEntries.length;
    updateStep('RESUMES', { foundCount: resumeEntries.length, syncedCount: 0 });

    let syncedResumes = 0;
    for (const entry of resumeEntries) {
      const existingJobId = keyToJobIdMap.get(entry.extKey) || keyToJobIdMap.get(entry.url);
      const res = await syncTailoredResume(entry.job, entry.resume, userId, existingJobId);
      if (res.success) {
        syncedResumes++;
      }
    }

    result.summary.resumesSynced = syncedResumes;
    updateStep('RESUMES', {
      status: 'OK',
      syncedCount: syncedResumes,
      message: `${syncedResumes} de ${resumeEntries.length} currículos customizados sincronizados`,
    });
  } catch (err: any) {
    const isTimeout = err.code === 'TIMEOUT' || String(err).includes('TIMEOUT');
    const errDetails = extractSupabaseError(err);
    updateStep('RESUMES', {
      status: isTimeout ? 'TIMEOUT' : 'ERROR',
      message: isTimeout ? 'TIMEOUT NA ETAPA: Tailored Resumes' : `ERRO NA ETAPA: Tailored Resumes (${errDetails.message})`,
      error: errDetails,
    });
    result.status = isTimeout ? 'TIMEOUT' : 'ERROR';
    result.failedStepName = 'Tailored Resumes';
    result.error = errDetails;
    return result;
  }

  // STEP 5: SOURCE SNAPSHOTS
  try {
    updateStep('SNAPSHOTS', { status: 'IN_PROGRESS' });

    let localBoards: any[] = [];
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_BOARDS_KEY);
      if (raw) localBoards = JSON.parse(raw);
    } catch {
      // fallback
    }
    if (!localBoards || localBoards.length === 0) {
      localBoards = DEFAULT_GREENHOUSE_BOARDS;
    }

    result.summary.snapshotsFound = localBoards.length;
    updateStep('SNAPSHOTS', { foundCount: localBoards.length, syncedCount: 0 });

    let syncedSnaps = 0;
    for (const board of localBoards) {
      const m = board.metrics || {
        totalJobs: board.lastJobCount || 0,
        brazilJobs: 0,
        relevantJobs: 0,
        score85Plus: 0,
        score90Plus: 0,
      };

      const success = await syncSourceSnapshot(
        {
          sourceName: board.company || 'Greenhouse Board',
          provider: board.provider || 'greenhouse',
          boardToken: board.boardToken,
          totalJobs: m.totalJobs || 0,
          brazilLatamJobs: m.brazilJobs || 0,
          relevantJobs: m.relevantJobs || 0,
          jobs85Plus: m.score85Plus || 0,
          jobs90Plus: m.score90Plus || 0,
          yieldScore: board.yieldScore ?? null,
          confidence: board.confidence || 'LOW',
          currentPriority: board.priority || 1,
          suggestedPriority: board.suggestedPriority || 1,
        },
        userId
      );

      if (success) syncedSnaps++;
    }

    result.summary.snapshotsSynced = syncedSnaps;
    updateStep('SNAPSHOTS', {
      status: 'OK',
      syncedCount: syncedSnaps,
      message: `${syncedSnaps} de ${localBoards.length} snapshots de rendimento registrados`,
    });
  } catch (err: any) {
    const isTimeout = err.code === 'TIMEOUT' || String(err).includes('TIMEOUT');
    const errDetails = extractSupabaseError(err);
    updateStep('SNAPSHOTS', {
      status: isTimeout ? 'TIMEOUT' : 'ERROR',
      message: isTimeout ? 'TIMEOUT NA ETAPA: Source Snapshots' : `ERRO NA ETAPA: Source Snapshots (${errDetails.message})`,
      error: errDetails,
    });
    result.status = isTimeout ? 'TIMEOUT' : 'ERROR';
    result.failedStepName = 'Source Snapshots';
    result.error = errDetails;
    return result;
  }

  // STEP 6: COMPLETE
  updateStep('COMPLETE', {
    status: 'OK',
    message: 'Sincronização concluída com sucesso no Supabase RLS!',
  });

  lastSyncTimestamp = new Date().toLocaleTimeString('pt-BR');
  result.status = 'SUCCESS';
  return result;
}

/**
 * Diagnostics stats for UI panel.
 */
export async function getCloudSyncDiagnostics(): Promise<CloudSyncDiagnostics> {
  await initSupabase(true);
  const configured = isSupabaseConfigured;
  let authenticated = false;
  let userEmail: string | null = null;
  let connected = false;
  let jobsSynced = 0;
  let applicationsSynced = 0;
  let resumesSynced = 0;
  let snapshotsSynced = 0;

  if (configured && supabaseClient) {
    try {
      const { data: { user } } = await withTimeout(
        supabaseClient.auth.getUser(),
        5000,
        'auth.getUser'
      );
      if (user) {
        authenticated = true;
        userEmail = user.email || null;

        const { count: jCount, error: jErr } = await withTimeout(
          supabaseClient.from('jobs').select('*', { count: 'exact', head: true }),
          5000,
          'count jobs'
        );
        const { count: aCount } = await withTimeout(
          supabaseClient.from('applications').select('*', { count: 'exact', head: true }),
          5000,
          'count applications'
        );
        const { count: rCount } = await withTimeout(
          supabaseClient.from('tailored_resumes').select('*', { count: 'exact', head: true }),
          5000,
          'count tailored_resumes'
        );
        const { count: sCount } = await withTimeout(
          supabaseClient.from('source_snapshots').select('*', { count: 'exact', head: true }),
          5000,
          'count source_snapshots'
        );

        if (!jErr) {
          connected = true;
          jobsSynced = jCount || 0;
          applicationsSynced = aCount || 0;
          resumesSynced = rCount || 0;
          snapshotsSynced = sCount || 0;
        }
      }
    } catch {
      connected = false;
    }
  }

  return {
    apiConfigStatus: configDetails.apiConfigHttpStatus,
    configJsonValid: configDetails.configJsonValid,
    urlReceivedFromBackend: configDetails.urlReceivedFromBackend,
    publishableKeyReceivedFromBackend: configDetails.publishableKeyReceivedFromBackend,
    createClientExecuted: configDetails.createClientExecuted,
    supabaseSessionActive: authenticated,
    hasUrl: hasSupabaseUrl,
    hasPublishableKey: hasPublishableKey,
    clientInitialized: Boolean(supabaseClient !== null),
    configured,
    authenticated,
    userEmail,
    connected,
    lastSync: lastSyncTimestamp,
    jobsSynced,
    applicationsSynced,
    resumesSynced,
    snapshotsSynced,
    errors: syncErrors.slice(-5),
  };
}
