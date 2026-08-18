import { JobWithAnalysis, ApplicationDetails, ApplicationEvent, ApplicationStatus } from '../types';

export type DateRangeOption = '7d' | '30d' | '90d' | '6m' | '12m' | 'all';

export interface AnalyticsFilterOptions {
  dateRange?: DateRangeOption;
  sourceFilter?: string;
  roleFamilyFilter?: string;
  channelFilter?: string;
  languageFilter?: string;
  workModelFilter?: string;
}

export interface AnalyticsInput {
  jobs: JobWithAnalysis[];
  applications: Record<string, ApplicationDetails>;
  events: ApplicationEvent[];
  tailoredResumes?: Record<string, any>;
  sourceSnapshots?: Record<string, any>;
  filters?: AnalyticsFilterOptions;
}

export interface OverviewMetrics {
  totalPrepared: number;
  totalApplied: number;
  totalInterviews: number;
  totalOffers: number;
  totalRejections: number;
  activeProcesses: number;
}

export interface ConversionRates {
  appliedToInterviewRate: number; // 0-100
  interviewToOfferRate: number;   // 0-100
  appliedToOfferRate: number;     // 0-100
}

export interface TimeStats {
  mean: number;
  median: number;
  min: number;
  max: number;
  sampleSize: number;
}

export interface TimeMetrics {
  timeToFirstContact: TimeStats;
  timeToInterview: TimeStats;
  timeToOffer: TimeStats;
}

export interface FunnelStage {
  name: 'Prepared' | 'Applied' | 'Interview' | 'Offer';
  count: number;
  conversionFromPrevious: number; // 0-100
}

export interface SourcePerformanceItem {
  source: string;
  category: 'DISCOVERY' | 'DIRECT';
  jobsFound: number;
  relevantJobs: number;
  applied: number;
  interviews: number;
  offers: number;
  appliedToInterviewRate: number;
  interviewToOfferRate: number;
  avgMatchScore: number;
  avgApplyPriority: number;
  avgAtsCoverage: number;
  conversionScore: number; // 0-100
  sampleConfidence: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface TitlePerformanceItem {
  title: string;
  applied: number;
  interviews: number;
  offers: number;
  appliedToInterviewRate: number;
}

export interface RolePerformanceItem {
  roleFamily: string;
  applied: number;
  interviews: number;
  offers: number;
  appliedToInterviewRate: number;
  appliedToOfferRate: number;
  avgMatchScore: number;
  avgApplyPriority: number;
  avgAtsCoverage: number;
  titles?: TitlePerformanceItem[];
}

export interface BucketPerformanceItem {
  bucket: string;
  applied: number;
  interviews: number;
  offers: number;
  interviewRate: number;
  offerRate: number;
}

export interface Correlations {
  avgMatch: { allApplied: number; interviewConverted: number; offerConverted: number };
  avgApplyPriority: { allApplied: number; interviewConverted: number; offerConverted: number };
  avgAts: { allApplied: number; interviewConverted: number; offerConverted: number };
}

export interface ScorePerformance {
  matchScoreBuckets: BucketPerformanceItem[];
  applyPriorityBuckets: BucketPerformanceItem[];
  atsCoverageBuckets: BucketPerformanceItem[];
  correlations: Correlations;
}

export interface ChannelPerformanceItem {
  channel: string;
  applied: number;
  interviews: number;
  offers: number;
  interviewRate: number;
}

export interface WorkModelPerformanceItem {
  workModel: string;
  applied: number;
  interviews: number;
  offers: number;
  interviewRate: number;
}

export interface LanguagePerformanceItem {
  language: string;
  applied: number;
  interviews: number;
  offers: number;
  interviewRate: number;
}

export interface WeeklyTrendItem {
  weekLabel: string;
  startOfWeek: string;
  applications: number;
  interviews: number;
  offers: number;
}

export interface ActivePipelineMetrics {
  activeApplications: number;
  appliedWaiting: number;
  interviewStage: number;
  offerStage: number;
  avgDaysActive: number;
  medianDaysActive: number;
}

export interface RejectionMetrics {
  totalRejections: number;
  rejectionsBeforeInterview: number;
  rejectionsAfterInterview: number;
}

export interface StrategySignal {
  signal: string;
  level: 'POSITIVE' | 'NEUTRAL' | 'WARNING';
}

export interface AnalyticsResult {
  overview: OverviewMetrics;
  conversion: ConversionRates;
  timeMetrics: TimeMetrics;
  funnel: FunnelStage[];
  sourcePerformance: SourcePerformanceItem[];
  rolePerformance: RolePerformanceItem[];
  scorePerformance: ScorePerformance;
  channelPerformance: ChannelPerformanceItem[];
  workModelPerformance: WorkModelPerformanceItem[];
  languagePerformance: LanguagePerformanceItem[];
  trends: { weeklySeries: WeeklyTrendItem[] };
  activePipeline: ActivePipelineMetrics;
  rejectionAnalytics: RejectionMetrics;
  strategySignals: StrategySignal[];
  warnings: string[];
}

/**
  Safely parses a date string and returns Timestamp in ms, or null if invalid.
 */
function parseSafeDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d;
}

/**
 * Checks whether a date falls within the selected date range relative to now.
 */
function isWithinDateRange(dateStr: string | null | undefined, range: DateRangeOption = 'all'): boolean {
  if (range === 'all') return true;
  const d = parseSafeDate(dateStr);
  if (!d) return false;

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = diffMs / (1000 * 3600 * 24);

  if (diffDays < 0) return true; // future dates included safely

  switch (range) {
    case '7d': return diffDays <= 7;
    case '30d': return diffDays <= 30;
    case '90d': return diffDays <= 90;
    case '6m': return diffDays <= 180;
    case '12m': return diffDays <= 365;
    default: return true;
  }
}

/**
 * Computes mean, median, min, max for an array of day numbers.
 */
function computeTimeStats(daysArray: number[]): TimeStats {
  if (!daysArray || daysArray.length === 0) {
    return { mean: 0, median: 0, min: 0, max: 0, sampleSize: 0 };
  }
  const sorted = [...daysArray].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const mean = Math.round((sum / sorted.length) * 10) / 10;
  const min = Math.round(sorted[0] * 10) / 10;
  const max = Math.round(sorted[sorted.length - 1] * 10) / 10;

  let median = 0;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    median = Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 10) / 10;
  } else {
    median = Math.round(sorted[mid] * 10) / 10;
  }

  return { mean, median, min, max, sampleSize: daysArray.length };
}

/**
 * Main Analytics Calculation Engine for Job Hunter AI.
 * Deterministically computes application conversion metrics from stored historical data.
 */
export function calculateJobSearchAnalytics(input: AnalyticsInput): AnalyticsResult {
  const {
    jobs = [],
    applications = {},
    events = [],
    tailoredResumes = {},
    filters = {}
  } = input;

  const dateRange = filters.dateRange || 'all';

  // 1. Group events by job/application to prevent quadratic lookups & double counting
  const eventsByJobMap = new Map<string, ApplicationEvent[]>();
  for (const evt of events) {
    const key = evt.job_id || evt.application_id;
    if (!key) continue;
    if (!eventsByJobMap.has(key)) {
      eventsByJobMap.set(key, []);
    }
    eventsByJobMap.get(key)!.push(evt);
  }

  // 2. Map jobs by ID and stable key
  const jobByIdMap = new Map<string, JobWithAnalysis>();
  for (const job of jobs) {
    jobByIdMap.set(job.id, job);
  }

  // Helper to extract job associated with an application details
  function getJobForDetails(details: ApplicationDetails): JobWithAnalysis | null {
    if (details.jobId && jobByIdMap.has(details.jobId)) {
      return jobByIdMap.get(details.jobId)!;
    }
    // Fallback search by key
    for (const j of jobs) {
      if (j.id === details.jobId || j.url === details.jobKey) {
        return j;
      }
    }
    return null;
  }

  // 3. Collect unique application records
  const allAppKeys = Object.keys(applications);
  
  interface ApplicationRecord {
    details: ApplicationDetails;
    job: JobWithAnalysis | null;
    jobEvents: ApplicationEvent[];
    hasPrepared: boolean;
    hasApplied: boolean;
    hasInterview: boolean;
    hasOffer: boolean;
    hasRejection: boolean;
    appliedDate: Date | null;
    firstContactDays: number | null;
    interviewDays: number | null;
    offerDays: number | null;
    channel: string;
    workModel: string;
    language: string;
    roleFamily: string;
    source: string;
    matchScore: number;
    applyPriority: number;
    atsCoverage: number;
  }

  const appRecords: ApplicationRecord[] = [];

  for (const key of allAppKeys) {
    const details = applications[key];
    if (!details) continue;

    const job = getJobForDetails(details);
    const jobKey = details.jobId || key;
    const jobEvents = eventsByJobMap.get(jobKey) || (details.id ? eventsByJobMap.get(details.id) || [] : []);

    // Evaluate Conversion Flags
    // Prepared
    const hasPrepared = Boolean(details.prepared_at) || details.status === 'PREPARED';

    // Applied
    const appliedDate = parseSafeDate(details.applied_at);
    const hasApplied = Boolean(appliedDate) || ['APPLIED', 'INTERVIEW', 'OFFER', 'REJECTED'].includes(details.status);

    // Apply Filters (Date Range & Attribute Filters)
    if (filters.sourceFilter && filters.sourceFilter !== 'all') {
      const jSrc = job?.discovery_source || job?.source || 'Other';
      if (jSrc.toLowerCase() !== filters.sourceFilter.toLowerCase()) continue;
    }

    if (filters.roleFamilyFilter && filters.roleFamilyFilter !== 'all') {
      const rf = job?.roleFamily || 'Outros / Geral';
      if (rf !== filters.roleFamilyFilter) continue;
    }

    if (filters.channelFilter && filters.channelFilter !== 'all') {
      const ch = details.application_channel || 'Other';
      if (ch !== filters.channelFilter) continue;
    }

    if (filters.languageFilter && filters.languageFilter !== 'all') {
      const lang = tailoredResumes[job?.url || '']?.resumeLanguage || job?.language || 'pt-BR';
      if (lang !== filters.languageFilter) continue;
    }

    if (filters.workModelFilter && filters.workModelFilter !== 'all') {
      const wm = details.work_model || job?.workplaceType || 'Unknown';
      if (wm.toLowerCase() !== filters.workModelFilter.toLowerCase()) continue;
    }

    // Interview Conversion
    const hasInterview =
      details.status === 'INTERVIEW' ||
      Boolean(parseSafeDate(details.interview_at)) ||
      jobEvents.some((e) =>
        e.event_type === 'INTERVIEW_SCHEDULED' ||
        e.event_type === 'INTERVIEW_COMPLETED' ||
        e.to_status === 'INTERVIEW'
      );

    // Offer Conversion
    const hasOffer =
      details.status === 'OFFER' ||
      Boolean(parseSafeDate(details.offer_at)) ||
      jobEvents.some((e) => e.to_status === 'OFFER');

    // Rejection
    const hasRejection =
      details.status === 'REJECTED' ||
      Boolean(parseSafeDate(details.rejected_at)) ||
      jobEvents.some((e) => e.to_status === 'REJECTED');

    // Timing Metrics Calculation
    let firstContactDays: number | null = null;
    let interviewDays: number | null = null;
    let offerDays: number | null = null;

    if (appliedDate) {
      // First Contact
      const contactEvents = jobEvents.filter((e) =>
        ['RECRUITER_CONTACT', 'INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED'].includes(e.event_type)
      );
      if (contactEvents.length > 0) {
        const sortedContact = contactEvents
          .map((e) => parseSafeDate(e.created_at))
          .filter((d): d is Date => d !== null && d >= appliedDate)
          .sort((a, b) => a.getTime() - b.getTime());
        if (sortedContact.length > 0) {
          firstContactDays = (sortedContact[0].getTime() - appliedDate.getTime()) / (1000 * 3600 * 24);
        }
      }

      // Time to Interview
      const interviewDate = parseSafeDate(details.interview_at);
      const interviewEventDates = jobEvents
        .filter((e) => e.event_type === 'INTERVIEW_SCHEDULED' || e.event_type === 'INTERVIEW_COMPLETED' || e.to_status === 'INTERVIEW')
        .map((e) => parseSafeDate(e.created_at))
        .filter((d): d is Date => d !== null);

      const allInterviewDates = [
        ...(interviewDate ? [interviewDate] : []),
        ...interviewEventDates,
      ].filter((d) => d >= appliedDate).sort((a, b) => a.getTime() - b.getTime());

      if (allInterviewDates.length > 0) {
        interviewDays = (allInterviewDates[0].getTime() - appliedDate.getTime()) / (1000 * 3600 * 24);
      }

      // Time to Offer
      const offerDate = parseSafeDate(details.offer_at);
      const offerEventDates = jobEvents
        .filter((e) => e.to_status === 'OFFER')
        .map((e) => parseSafeDate(e.created_at))
        .filter((d): d is Date => d !== null);

      const allOfferDates = [
        ...(offerDate ? [offerDate] : []),
        ...offerEventDates,
      ].filter((d) => d >= appliedDate).sort((a, b) => a.getTime() - b.getTime());

      if (allOfferDates.length > 0) {
        offerDays = (allOfferDates[0].getTime() - appliedDate.getTime()) / (1000 * 3600 * 24);
      }
    }

    // Scores
    const matchScore = details.match_score_at_application ?? job?.analysis?.score ?? 75;
    const applyPriority = details.apply_priority_at_application ?? 70;
    const atsCoverage = details.ats_coverage_at_application ?? (job?.analysis?.breakdown ? Math.round((job.analysis.breakdown.keywordsScore / 4) * 100) : 70);

    // Attributes
    const channel = details.application_channel || 'Other';
    const workModel = details.work_model || job?.workplaceType || 'Unknown';
    const language = tailoredResumes[job?.url || '']?.resumeLanguage || job?.language || 'pt-BR';
    const roleFamily = job?.roleFamily || 'Outros / Geral';
    const source = job?.discovery_source || job?.source || 'Direct / Board';

    appRecords.push({
      details,
      job,
      jobEvents,
      hasPrepared,
      hasApplied,
      hasInterview,
      hasOffer,
      hasRejection,
      appliedDate,
      firstContactDays,
      interviewDays,
      offerDays,
      channel,
      workModel,
      language,
      roleFamily,
      source,
      matchScore,
      applyPriority,
      atsCoverage,
    });
  }

  // 4. Filter by Date Range on appliedDate (or preparedDate if not applied)
  const filteredRecords = appRecords.filter((rec) => {
    if (rec.hasApplied) {
      return isWithinDateRange(rec.details.applied_at, dateRange);
    } else {
      return isWithinDateRange(rec.details.prepared_at, dateRange);
    }
  });

  const appliedRecords = filteredRecords.filter((r) => r.hasApplied);

  // 5. Compute Overview Metrics
  const totalPrepared = filteredRecords.filter((r) => r.hasPrepared).length;
  const totalApplied = appliedRecords.length;
  const totalInterviews = appliedRecords.filter((r) => r.hasInterview).length;
  const totalOffers = appliedRecords.filter((r) => r.hasOffer).length;
  const totalRejections = appliedRecords.filter((r) => r.hasRejection).length;
  const activeProcesses = appliedRecords.filter((r) =>
    ['APPLIED', 'INTERVIEW', 'PREPARED'].includes(r.details.status) && !r.hasRejection
  ).length;

  const overview: OverviewMetrics = {
    totalPrepared,
    totalApplied,
    totalInterviews,
    totalOffers,
    totalRejections,
    activeProcesses,
  };

  // 6. Conversion Rates
  const appliedToInterviewRate = totalApplied > 0 ? Math.round((totalInterviews / totalApplied) * 1000) / 10 : 0;
  const interviewToOfferRate = totalInterviews > 0 ? Math.round((totalOffers / totalInterviews) * 1000) / 10 : 0;
  const appliedToOfferRate = totalApplied > 0 ? Math.round((totalOffers / totalApplied) * 1000) / 10 : 0;

  const conversion: ConversionRates = {
    appliedToInterviewRate,
    interviewToOfferRate,
    appliedToOfferRate,
  };

  // 7. Time Metrics
  const timeToFirstContact = computeTimeStats(
    appliedRecords.map((r) => r.firstContactDays).filter((d): d is number => d !== null)
  );
  const timeToInterview = computeTimeStats(
    appliedRecords.map((r) => r.interviewDays).filter((d): d is number => d !== null)
  );
  const timeToOffer = computeTimeStats(
    appliedRecords.map((r) => r.offerDays).filter((d): d is number => d !== null)
  );

  const timeMetrics: TimeMetrics = {
    timeToFirstContact,
    timeToInterview,
    timeToOffer,
  };

  // 8. Funnel
  const funnel: FunnelStage[] = [
    { name: 'Prepared', count: totalPrepared, conversionFromPrevious: 100 },
    {
      name: 'Applied',
      count: totalApplied,
      conversionFromPrevious: totalPrepared > 0 ? Math.round((totalApplied / totalPrepared) * 1000) / 10 : 100,
    },
    {
      name: 'Interview',
      count: totalInterviews,
      conversionFromPrevious: appliedToInterviewRate,
    },
    {
      name: 'Offer',
      count: totalOffers,
      conversionFromPrevious: interviewToOfferRate,
    },
  ];

  // 9. Source Performance & Conversion Score
  const sourceGroups = new Map<string, ApplicationRecord[]>();
  for (const r of appliedRecords) {
    const s = r.source;
    if (!sourceGroups.has(s)) sourceGroups.set(s, []);
    sourceGroups.get(s)!.push(r);
  }

  // Also include sources from available jobs search list
  const allJobSources = new Set<string>();
  for (const j of jobs) {
    const s = j.discovery_source || j.source || 'Direct / Board';
    allJobSources.add(s);
  }
  for (const s of sourceGroups.keys()) {
    allJobSources.add(s);
  }

  const sourcePerformance: SourcePerformanceItem[] = Array.from(allJobSources).map((source) => {
    const recs = sourceGroups.get(source) || [];
    const sourceJobs = jobs.filter(
      (j) => (j.discovery_source || j.source || 'Direct / Board') === source
    );

    const jobsFound = sourceJobs.length;
    const relevantJobs = sourceJobs.filter((j) => (j.analysis?.score ?? 0) >= 70).length;

    const applied = recs.length;
    const interviews = recs.filter((r) => r.hasInterview).length;
    const offers = recs.filter((r) => r.hasOffer).length;

    const appliedToInterviewRate = applied > 0 ? Math.round((interviews / applied) * 1000) / 10 : 0;
    const interviewToOfferRate = interviews > 0 ? Math.round((offers / interviews) * 1000) / 10 : 0;

    const avgMatchScore =
      applied > 0 ? Math.round(recs.reduce((acc, r) => acc + r.matchScore, 0) / applied) : 0;
    const avgApplyPriority =
      applied > 0 ? Math.round(recs.reduce((acc, r) => acc + r.applyPriority, 0) / applied) : 0;
    const avgAtsCoverage =
      applied > 0 ? Math.round(recs.reduce((acc, r) => acc + r.atsCoverage, 0) / applied) : 0;

    // Confidence
    let sampleConfidence: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' = 'NONE';
    if (applied >= 10) sampleConfidence = 'HIGH';
    else if (applied >= 3) sampleConfidence = 'MEDIUM';
    else if (applied >= 1) sampleConfidence = 'LOW';

    // Source Conversion Score (0-100)
    let conversionScore = 0;
    if (applied > 0) {
      // Applied -> Interview: max 45 pts
      const interviewPts = (appliedToInterviewRate / 100) * 45;

      // Interview -> Offer: max 30 pts
      const offerPts = (interviewToOfferRate / 100) * 30;

      // Useful Sample Volume: max 15 pts with saturation
      let volumePts = 3;
      if (applied >= 10) volumePts = 15;
      else if (applied >= 5) volumePts = 12;
      else if (applied >= 2) volumePts = 7;

      // Response Speed: max 10 pts
      const firstContacts = recs
        .map((r) => r.firstContactDays)
        .filter((d): d is number => d !== null);
      let speedPts = 0;
      if (firstContacts.length > 0) {
        const avgSpeed = firstContacts.reduce((acc, v) => acc + v, 0) / firstContacts.length;
        if (avgSpeed <= 3) speedPts = 10;
        else if (avgSpeed <= 7) speedPts = 7;
        else if (avgSpeed <= 14) speedPts = 4;
        else speedPts = 2;
      }

      conversionScore = Math.min(100, Math.round(interviewPts + offerPts + volumePts + speedPts));
    }

    const category: 'DISCOVERY' | 'DIRECT' = ['Adzuna', 'Greenhouse', 'Gupy', 'Indeed', 'adzuna', 'greenhouse', 'gupy'].includes(source)
      ? 'DISCOVERY'
      : 'DIRECT';

    return {
      source,
      category,
      jobsFound,
      relevantJobs,
      applied,
      interviews,
      offers,
      appliedToInterviewRate,
      interviewToOfferRate,
      avgMatchScore,
      avgApplyPriority,
      avgAtsCoverage,
      conversionScore,
      sampleConfidence,
    };
  }).sort((a, b) => b.appliedToInterviewRate - a.appliedToInterviewRate || b.applied - a.applied);

  // 10. Role Family Performance & Title Breakdown
  const roleGroups = new Map<string, ApplicationRecord[]>();
  for (const r of appliedRecords) {
    const rf = r.roleFamily;
    if (!roleGroups.has(rf)) roleGroups.set(rf, []);
    roleGroups.get(rf)!.push(r);
  }

  const rolePerformance: RolePerformanceItem[] = Array.from(roleGroups.keys()).map((roleFamily) => {
    const recs = roleGroups.get(roleFamily)!;
    const applied = recs.length;
    const interviews = recs.filter((r) => r.hasInterview).length;
    const offers = recs.filter((r) => r.hasOffer).length;

    const appliedToInterviewRate = applied > 0 ? Math.round((interviews / applied) * 1000) / 10 : 0;
    const appliedToOfferRate = applied > 0 ? Math.round((offers / applied) * 1000) / 10 : 0;

    const avgMatchScore = Math.round(recs.reduce((acc, r) => acc + r.matchScore, 0) / applied);
    const avgApplyPriority = Math.round(recs.reduce((acc, r) => acc + r.applyPriority, 0) / applied);
    const avgAtsCoverage = Math.round(recs.reduce((acc, r) => acc + r.atsCoverage, 0) / applied);

    // Title breakdowns for titles with >= 1 application
    const titleGroups = new Map<string, ApplicationRecord[]>();
    for (const r of recs) {
      const t = r.job?.title || 'Outro Cargo';
      if (!titleGroups.has(t)) titleGroups.set(t, []);
      titleGroups.get(t)!.push(r);
    }

    const titles: TitlePerformanceItem[] = Array.from(titleGroups.keys())
      .map((t) => {
        const tRecs = titleGroups.get(t)!;
        const tApp = tRecs.length;
        const tInt = tRecs.filter((r) => r.hasInterview).length;
        const tOff = tRecs.filter((r) => r.hasOffer).length;
        return {
          title: t,
          applied: tApp,
          interviews: tInt,
          offers: tOff,
          appliedToInterviewRate: tApp > 0 ? Math.round((tInt / tApp) * 1000) / 10 : 0,
        };
      })
      .sort((a, b) => b.applied - a.applied);

    return {
      roleFamily,
      applied,
      interviews,
      offers,
      appliedToInterviewRate,
      appliedToOfferRate,
      avgMatchScore,
      avgApplyPriority,
      avgAtsCoverage,
      titles,
    };
  }).sort((a, b) => b.appliedToInterviewRate - a.appliedToInterviewRate || b.applied - a.applied);

  // 11. Score Buckets & Correlations
  // Match Score Buckets
  const matchBucketsDef = [
    { label: '90–100', min: 90, max: 100 },
    { label: '85–89', min: 85, max: 89.99 },
    { label: '80–84', min: 80, max: 84.99 },
    { label: '75–79', min: 75, max: 79.99 },
    { label: '<75', min: 0, max: 74.99 },
  ];

  const matchScoreBuckets: BucketPerformanceItem[] = matchBucketsDef.map((b) => {
    const recs = appliedRecords.filter((r) => r.matchScore >= b.min && r.matchScore <= b.max);
    const applied = recs.length;
    const interviews = recs.filter((r) => r.hasInterview).length;
    const offers = recs.filter((r) => r.hasOffer).length;
    return {
      bucket: b.label,
      applied,
      interviews,
      offers,
      interviewRate: applied > 0 ? Math.round((interviews / applied) * 1000) / 10 : 0,
      offerRate: applied > 0 ? Math.round((offers / applied) * 1000) / 10 : 0,
    };
  });

  // Apply Priority Buckets
  const priorityBucketsDef = [
    { label: '90–100', min: 90, max: 100 },
    { label: '80–89', min: 80, max: 89.99 },
    { label: '65–79', min: 65, max: 79.99 },
    { label: '50–64', min: 50, max: 64.99 },
    { label: '<50', min: 0, max: 49.99 },
  ];

  const applyPriorityBuckets: BucketPerformanceItem[] = priorityBucketsDef.map((b) => {
    const recs = appliedRecords.filter((r) => r.applyPriority >= b.min && r.applyPriority <= b.max);
    const applied = recs.length;
    const interviews = recs.filter((r) => r.hasInterview).length;
    const offers = recs.filter((r) => r.hasOffer).length;
    return {
      bucket: b.label,
      applied,
      interviews,
      offers,
      interviewRate: applied > 0 ? Math.round((interviews / applied) * 1000) / 10 : 0,
      offerRate: applied > 0 ? Math.round((offers / applied) * 1000) / 10 : 0,
    };
  });

  // ATS Coverage Buckets
  const atsBucketsDef = [
    { label: '90–100', min: 90, max: 100 },
    { label: '80–89', min: 80, max: 89.99 },
    { label: '70–79', min: 70, max: 79.99 },
    { label: '60–69', min: 60, max: 69.99 },
    { label: '<60', min: 0, max: 59.99 },
  ];

  const atsCoverageBuckets: BucketPerformanceItem[] = atsBucketsDef.map((b) => {
    const recs = appliedRecords.filter((r) => r.atsCoverage >= b.min && r.atsCoverage <= b.max);
    const applied = recs.length;
    const interviews = recs.filter((r) => r.hasInterview).length;
    const offers = recs.filter((r) => r.hasOffer).length;
    return {
      bucket: b.label,
      applied,
      interviews,
      offers,
      interviewRate: applied > 0 ? Math.round((interviews / applied) * 1000) / 10 : 0,
      offerRate: applied > 0 ? Math.round((offers / applied) * 1000) / 10 : 0,
    };
  });

  // Simple Correlations
  const interviewConvertedRecords = appliedRecords.filter((r) => r.hasInterview);
  const offerConvertedRecords = appliedRecords.filter((r) => r.hasOffer);

  const calcAvg = (arr: number[]) =>
    arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

  const correlations: Correlations = {
    avgMatch: {
      allApplied: calcAvg(appliedRecords.map((r) => r.matchScore)),
      interviewConverted: calcAvg(interviewConvertedRecords.map((r) => r.matchScore)),
      offerConverted: calcAvg(offerConvertedRecords.map((r) => r.matchScore)),
    },
    avgApplyPriority: {
      allApplied: calcAvg(appliedRecords.map((r) => r.applyPriority)),
      interviewConverted: calcAvg(interviewConvertedRecords.map((r) => r.applyPriority)),
      offerConverted: calcAvg(offerConvertedRecords.map((r) => r.applyPriority)),
    },
    avgAts: {
      allApplied: calcAvg(appliedRecords.map((r) => r.atsCoverage)),
      interviewConverted: calcAvg(interviewConvertedRecords.map((r) => r.atsCoverage)),
      offerConverted: calcAvg(offerConvertedRecords.map((r) => r.atsCoverage)),
    },
  };

  const scorePerformance: ScorePerformance = {
    matchScoreBuckets,
    applyPriorityBuckets,
    atsCoverageBuckets,
    correlations,
  };

  // 12. Channel Performance
  const channelGroups = new Map<string, ApplicationRecord[]>();
  for (const r of appliedRecords) {
    const ch = r.channel;
    if (!channelGroups.has(ch)) channelGroups.set(ch, []);
    channelGroups.get(ch)!.push(r);
  }

  const channelPerformance: ChannelPerformanceItem[] = Array.from(channelGroups.keys()).map((channel) => {
    const recs = channelGroups.get(channel)!;
    const applied = recs.length;
    const interviews = recs.filter((r) => r.hasInterview).length;
    const offers = recs.filter((r) => r.hasOffer).length;
    return {
      channel,
      applied,
      interviews,
      offers,
      interviewRate: applied > 0 ? Math.round((interviews / applied) * 1000) / 10 : 0,
    };
  }).sort((a, b) => b.applied - a.applied);

  // 13. Work Model Performance
  const workModelGroups = new Map<string, ApplicationRecord[]>();
  for (const r of appliedRecords) {
    const wm = r.workModel;
    if (!workModelGroups.has(wm)) workModelGroups.set(wm, []);
    workModelGroups.get(wm)!.push(r);
  }

  const workModelPerformance: WorkModelPerformanceItem[] = Array.from(workModelGroups.keys()).map((workModel) => {
    const recs = workModelGroups.get(workModel)!;
    const applied = recs.length;
    const interviews = recs.filter((r) => r.hasInterview).length;
    const offers = recs.filter((r) => r.hasOffer).length;
    return {
      workModel,
      applied,
      interviews,
      offers,
      interviewRate: applied > 0 ? Math.round((interviews / applied) * 1000) / 10 : 0,
    };
  }).sort((a, b) => b.applied - a.applied);

  // 14. Language Performance
  const languageGroups = new Map<string, ApplicationRecord[]>();
  for (const r of appliedRecords) {
    const lang = r.language;
    if (!languageGroups.has(lang)) languageGroups.set(lang, []);
    languageGroups.get(lang)!.push(r);
  }

  const languagePerformance: LanguagePerformanceItem[] = Array.from(languageGroups.keys()).map((language) => {
    const recs = languageGroups.get(language)!;
    const applied = recs.length;
    const interviews = recs.filter((r) => r.hasInterview).length;
    const offers = recs.filter((r) => r.hasOffer).length;
    return {
      language,
      applied,
      interviews,
      offers,
      interviewRate: applied > 0 ? Math.round((interviews / applied) * 1000) / 10 : 0,
    };
  }).sort((a, b) => b.applied - a.applied);

  // 15. Weekly Trend Series (Last 8 weeks)
  const weeklyMap = new Map<string, { weekLabel: string; startOfWeek: string; applications: number; interviews: number; offers: number }>();
  
  const now = new Date();
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    // Find start of week (Sunday or Monday)
    const day = d.getDay();
    const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeekDate = new Date(d.setDate(diffToMonday));
    const isoWeek = startOfWeekDate.toISOString().split('T')[0];
    const weekLabel = `Semana ${startOfWeekDate.getDate()}/${startOfWeekDate.getMonth() + 1}`;

    weeklyMap.set(isoWeek, {
      weekLabel,
      startOfWeek: isoWeek,
      applications: 0,
      interviews: 0,
      offers: 0,
    });
  }

  for (const r of appliedRecords) {
    if (!r.appliedDate) continue;
    const d = new Date(r.appliedDate);
    const day = d.getDay();
    const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeekDate = new Date(d.setDate(diffToMonday));
    const isoWeek = startOfWeekDate.toISOString().split('T')[0];

    if (weeklyMap.has(isoWeek)) {
      const item = weeklyMap.get(isoWeek)!;
      item.applications += 1;
      if (r.hasInterview) item.interviews += 1;
      if (r.hasOffer) item.offers += 1;
    }
  }

  const weeklySeries = Array.from(weeklyMap.values());

  // 16. Active Pipeline
  const activeRecords = appliedRecords.filter((r) =>
    ['APPLIED', 'INTERVIEW', 'PREPARED'].includes(r.details.status) && !r.hasRejection
  );

  const appliedWaiting = activeRecords.filter((r) => r.details.status === 'APPLIED').length;
  const interviewStage = activeRecords.filter((r) => r.details.status === 'INTERVIEW').length;
  const offerStage = activeRecords.filter((r) => r.details.status === 'OFFER').length;

  const activeDaysList = activeRecords
    .map((r) => {
      const start = r.appliedDate || parseSafeDate(r.details.prepared_at);
      if (!start) return null;
      return (now.getTime() - start.getTime()) / (1000 * 3600 * 24);
    })
    .filter((d): d is number => d !== null);

  const activeDaysStats = computeTimeStats(activeDaysList);

  const activePipeline: ActivePipelineMetrics = {
    activeApplications: activeRecords.length,
    appliedWaiting,
    interviewStage,
    offerStage,
    avgDaysActive: activeDaysStats.mean,
    medianDaysActive: activeDaysStats.median,
  };

  // 17. Rejection Analytics
  const rejectionsBeforeInterview = appliedRecords.filter((r) => r.hasRejection && !r.hasInterview).length;
  const rejectionsAfterInterview = appliedRecords.filter((r) => r.hasRejection && r.hasInterview).length;

  const rejectionAnalytics: RejectionMetrics = {
    totalRejections,
    rejectionsBeforeInterview,
    rejectionsAfterInterview,
  };

  // 18. Strategy Signals & Warnings (Items 27 & 28)
  const warnings: string[] = [];
  const strategySignals: StrategySignal[] = [];

  if (totalApplied < 5) {
    warnings.push('AMOSTRA PEQUENA: Menos de 5 candidaturas enviadas. Os dados são estritamente descritivos e evitam conclusões estatísticas precipitadas.');
  } else if (totalApplied < 10) {
    warnings.push('AMOSTRA MODERADA: Menos de 10 candidaturas. As tendências de conversão ainda estão em consolidação.');
  }

  if (totalApplied >= 5) {
    // Check Match Score 90+ vs lower
    const highMatch = matchScoreBuckets.find((b) => b.bucket === '90–100');
    const lowMatch = matchScoreBuckets.find((b) => b.bucket === '<75');

    if (highMatch && highMatch.applied >= 2 && highMatch.interviewRate > 0) {
      strategySignals.push({
        signal: `Nos seus dados, vagas com Match Score 90+ apresentam taxa de entrevista de ${highMatch.interviewRate}%.`,
        level: 'POSITIVE',
      });
    }

    // Check Best Role Family
    const bestRole = rolePerformance.find((r) => r.applied >= 2);
    if (bestRole) {
      strategySignals.push({
        signal: `Até agora, a família de cargos '${bestRole.roleFamily}' registra sua maior taxa de entrevista (${bestRole.appliedToInterviewRate}% em ${bestRole.applied} candidaturas).`,
        level: 'POSITIVE',
      });
    }

    // Check Best Source
    const bestSource = sourcePerformance.find((s) => s.applied >= 2);
    if (bestSource) {
      strategySignals.push({
        signal: `A fonte '${bestSource.source}' gerou ${bestSource.interviews} entrevistas em ${bestSource.applied} candidaturas (${bestSource.appliedToInterviewRate}% conversão).`,
        level: 'POSITIVE',
      });
    }

    // Check ATS Coverage correlation
    if (correlations.avgAts.interviewConverted > correlations.avgAts.allApplied) {
      strategySignals.push({
        signal: `A amostra atual sugere que candidaturas convertidas em entrevistas possuem cobertura ATS média superior (${correlations.avgAts.interviewConverted}% vs ${correlations.avgAts.allApplied}% geral).`,
        level: 'POSITIVE',
      });
    }
  }

  return {
    overview,
    conversion,
    timeMetrics,
    funnel,
    sourcePerformance,
    rolePerformance,
    scorePerformance,
    channelPerformance,
    workModelPerformance,
    languagePerformance,
    trends: { weeklySeries },
    activePipeline,
    rejectionAnalytics,
    strategySignals,
    warnings,
  };
}
