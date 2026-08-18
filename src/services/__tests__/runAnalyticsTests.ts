import { calculateJobSearchAnalytics } from '../jobSearchAnalytics';
import { ApplicationDetails, ApplicationEvent, JobWithAnalysis } from '../../types';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`FAIL: ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  } else {
    console.log(`PASS [${msg}]`);
  }
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

console.log('=== RUNNING JOB SEARCH ANALYTICS TESTS (A-O) ===\n');

// Helper to create a dummy job
function createDummyJob(id: string, title = 'Customer Success Manager', company = 'Acme Co'): JobWithAnalysis {
  return {
    id,
    title,
    company,
    location: 'Sao Paulo, Brazil',
    url: `https://example.com/job/${id}`,
    source: 'Greenhouse',
    discovery_source: 'Greenhouse',
    workplaceType: 'Remoto',
    seniority: 'Sênior',
    description: 'Test Job',
    requirements: ['CS'],
    publishedAt: new Date().toISOString(),
    language: 'pt-BR',
    roleFamily: 'Customer Success',
    analysis: {
      score: 85,
      classification: 'Excelente',
      breakdown: {
        titleScore: 20,
        skillsScore: 25,
        experienceScore: 20,
        toolsScore: 10,
        seniorityScore: 10,
        languageScore: 0,
        educationScore: 0,
        locationScore: 0,
        keywordsScore: 0,
        total: 85,
      },
      matchedSkills: ['CS'],
      relatedSkills: [],
      missingSkills: [],
      atsKeywords: ['CS'],
      matchReasons: [],
      strengths: [],
      gaps: [],
      relevantExperienceSummary: [],
    },
  };
}

// Test A: 10 applied, 2 interviews -> Applied -> Interview = 20%
const appsA: Record<string, ApplicationDetails> = {};
const jobsA: JobWithAnalysis[] = [];
for (let i = 1; i <= 10; i++) {
  const j = createDummyJob(`job-a-${i}`);
  jobsA.push(j);
  appsA[j.id] = {
    jobId: j.id,
    jobKey: j.url,
    status: i <= 2 ? 'INTERVIEW' : 'APPLIED',
    applied_at: daysAgo(10),
    interview_at: i <= 2 ? daysAgo(5) : undefined,
  };
}
const resA = calculateJobSearchAnalytics({ jobs: jobsA, applications: appsA, events: [] });
assert(resA.overview.totalApplied === 10, 'A: Total applied = 10');
assert(resA.overview.totalInterviews === 2, 'A: Total interviews = 2');
assert(resA.conversion.appliedToInterviewRate === 20, 'A: Applied -> Interview Rate = 20%');

// Test B: 4 interviews, 1 offer -> Interview -> Offer = 25%
const appsB: Record<string, ApplicationDetails> = {};
const jobsB: JobWithAnalysis[] = [];
for (let i = 1; i <= 4; i++) {
  const j = createDummyJob(`job-b-${i}`);
  jobsB.push(j);
  appsB[j.id] = {
    jobId: j.id,
    jobKey: j.url,
    status: i === 1 ? 'OFFER' : 'INTERVIEW',
    applied_at: daysAgo(15),
    interview_at: daysAgo(10),
    offer_at: i === 1 ? daysAgo(2) : undefined,
  };
}
const resB = calculateJobSearchAnalytics({ jobs: jobsB, applications: appsB, events: [] });
assert(resB.overview.totalInterviews === 4, 'B: Total interviews = 4');
assert(resB.overview.totalOffers === 1, 'B: Total offers = 1');
assert(resB.conversion.interviewToOfferRate === 25, 'B: Interview -> Offer Rate = 25%');

// Test C: Application APPLIED -> INTERVIEW -> REJECTED -> conta como interview conversion
const jC = createDummyJob('job-c-1');
const appC: Record<string, ApplicationDetails> = {
  [jC.id]: {
    jobId: jC.id,
    jobKey: jC.url,
    status: 'REJECTED',
    applied_at: daysAgo(20),
    interview_at: daysAgo(12),
    rejected_at: daysAgo(2),
  },
};
const resC = calculateJobSearchAnalytics({ jobs: [jC], applications: appC, events: [] });
assert(resC.overview.totalInterviews === 1, 'C: Preserva conversão em entrevista mesmo se status virou REJECTED');

// Test D: Application REJECTED sem entrevista -> rejection before interview
const jD = createDummyJob('job-d-1');
const appD: Record<string, ApplicationDetails> = {
  [jD.id]: {
    jobId: jD.id,
    jobKey: jD.url,
    status: 'REJECTED',
    applied_at: daysAgo(15),
    rejected_at: daysAgo(5),
  },
};
const resD = calculateJobSearchAnalytics({ jobs: [jD], applications: appD, events: [] });
assert(resD.rejectionAnalytics.rejectionsBeforeInterview === 1, 'D: Rejeição sem entrevista é classificada como Before Interview');

// Test E: Source A (10 applied, 4 interviews) vs Source B (50 applied, 5 interviews) -> Source A tem melhor conversion rate
const jobsE: JobWithAnalysis[] = [];
const appsE: Record<string, ApplicationDetails> = {};

// Source A (10 applied, 4 interviews -> 40%)
for (let i = 1; i <= 10; i++) {
  const j = createDummyJob(`job-ea-${i}`);
  j.source = 'Adzuna';
  j.discovery_source = 'Adzuna';
  jobsE.push(j);
  appsE[j.id] = {
    jobId: j.id,
    jobKey: j.url,
    status: i <= 4 ? 'INTERVIEW' : 'APPLIED',
    applied_at: daysAgo(10),
  };
}
// Source B (50 applied, 5 interviews -> 10%)
for (let i = 1; i <= 50; i++) {
  const j = createDummyJob(`job-eb-${i}`);
  j.source = 'Greenhouse';
  j.discovery_source = 'Greenhouse';
  jobsE.push(j);
  appsE[j.id] = {
    jobId: j.id,
    jobKey: j.url,
    status: i <= 5 ? 'INTERVIEW' : 'APPLIED',
    applied_at: daysAgo(10),
  };
}
const resE = calculateJobSearchAnalytics({ jobs: jobsE, applications: appsE, events: [] });
const srcAdzuna = resE.sourcePerformance.find((s) => s.source === 'Adzuna');
const srcGreenhouse = resE.sourcePerformance.find((s) => s.source === 'Greenhouse');
assert(srcAdzuna && srcAdzuna.appliedToInterviewRate === 40, 'E: Adzuna = 40% conversion rate');
assert(srcGreenhouse && srcGreenhouse.appliedToInterviewRate === 10, 'E: Greenhouse = 10% conversion rate');
assert(srcAdzuna!.appliedToInterviewRate > srcGreenhouse!.appliedToInterviewRate, 'E: Source A possui melhor conversion rate que Source B');

// Test F: Match bucket 90+ usa snapshot match_score_at_application
const jF = createDummyJob('job-f-1');
jF.analysis.score = 60; // Current score is 60
const appF: Record<string, ApplicationDetails> = {
  [jF.id]: {
    jobId: jF.id,
    jobKey: jF.url,
    status: 'APPLIED',
    applied_at: daysAgo(5),
    match_score_at_application: 95, // Snapshot was 95
  },
};
const resF = calculateJobSearchAnalytics({ jobs: [jF], applications: appF, events: [] });
const bucket90 = resF.scorePerformance.matchScoreBuckets.find((b) => b.bucket === '90–100');
assert(bucket90 && bucket90.applied === 1, 'F: Usa snapshot match_score_at_application (95 -> bucket 90-100) em vez do score atual');

// Test G: Apply Priority bucket usa snapshot apply_priority_at_application
const jG = createDummyJob('job-g-1');
const appG: Record<string, ApplicationDetails> = {
  [jG.id]: {
    jobId: jG.id,
    jobKey: jG.url,
    status: 'APPLIED',
    applied_at: daysAgo(5),
    apply_priority_at_application: 88,
  },
};
const resG = calculateJobSearchAnalytics({ jobs: [jG], applications: appG, events: [] });
const priorityBucket = resG.scorePerformance.applyPriorityBuckets.find((b) => b.bucket === '80–89');
assert(priorityBucket && priorityBucket.applied === 1, 'G: Usa snapshot apply_priority_at_application (88 -> bucket 80-89)');

// Test H: ATS bucket usa snapshot ats_coverage_at_application
const jH = createDummyJob('job-h-1');
const appH: Record<string, ApplicationDetails> = {
  [jH.id]: {
    jobId: jH.id,
    jobKey: jH.url,
    status: 'APPLIED',
    applied_at: daysAgo(5),
    ats_coverage_at_application: 78,
  },
};
const resH = calculateJobSearchAnalytics({ jobs: [jH], applications: appH, events: [] });
const atsBucket = resH.scorePerformance.atsCoverageBuckets.find((b) => b.bucket === '70–79');
assert(atsBucket && atsBucket.applied === 1, 'H: Usa snapshot ats_coverage_at_application (78 -> bucket 70-79)');

// Test I: First contact: applied day 10 ago, recruiter contact day 7 ago -> 3 days
const jI = createDummyJob('job-i-1');
const appI: Record<string, ApplicationDetails> = {
  [jI.id]: {
    jobId: jI.id,
    jobKey: jI.url,
    status: 'APPLIED',
    applied_at: daysAgo(10),
  },
};
const evtI: ApplicationEvent = {
  id: 'evt-i-1',
  application_id: jI.id,
  job_id: jI.id,
  event_type: 'RECRUITER_CONTACT',
  created_at: daysAgo(7),
};
const resI = calculateJobSearchAnalytics({ jobs: [jI], applications: appI, events: [evtI] });
assert(resI.timeMetrics.timeToFirstContact.mean === 3, 'I: Time to first contact = 3 dias');

// Test J: Interview scheduled 7 days after applied -> time to interview = 7
const jJ = createDummyJob('job-j-1');
const appJ: Record<string, ApplicationDetails> = {
  [jJ.id]: {
    jobId: jJ.id,
    jobKey: jJ.url,
    status: 'INTERVIEW',
    applied_at: daysAgo(10),
    interview_at: daysAgo(3),
  },
};
const resJ = calculateJobSearchAnalytics({ jobs: [jJ], applications: appJ, events: [] });
assert(resJ.timeMetrics.timeToInterview.mean === 7, 'J: Time to interview = 7 dias');

// Test K: Uma application com 10 events -> continua contando UMA candidatura
const jK = createDummyJob('job-k-1');
const appK: Record<string, ApplicationDetails> = {
  [jK.id]: {
    jobId: jK.id,
    jobKey: jK.url,
    status: 'APPLIED',
    applied_at: daysAgo(5),
  },
};
const eventsK: ApplicationEvent[] = [];
for (let i = 1; i <= 10; i++) {
  eventsK.push({
    id: `evt-k-${i}`,
    application_id: jK.id,
    job_id: jK.id,
    event_type: 'OTHER',
    notes: `Event note ${i}`,
    created_at: daysAgo(4),
  });
}
const resK = calculateJobSearchAnalytics({ jobs: [jK], applications: appK, events: eventsK });
assert(resK.overview.totalApplied === 1, 'K: Uma aplicação com 10 eventos conta como exatamente 1 candidatura');

// Test L: Total applied < 5 -> small sample warning
const jL = createDummyJob('job-l-1');
const appL: Record<string, ApplicationDetails> = {
  [jL.id]: {
    jobId: jL.id,
    jobKey: jL.url,
    status: 'APPLIED',
    applied_at: daysAgo(2),
  },
};
const resL = calculateJobSearchAnalytics({ jobs: [jL], applications: appL, events: [] });
assert(resL.warnings.some((w) => w.includes('AMOSTRA PEQUENA')), 'L: Emite aviso de amostra pequena para <5 candidaturas');

// Test M: Application Channel 'LinkedIn' separado de Source 'Greenhouse'
const jM = createDummyJob('job-m-1');
jM.source = 'Greenhouse';
jM.discovery_source = 'Greenhouse';
const appM: Record<string, ApplicationDetails> = {
  [jM.id]: {
    jobId: jM.id,
    jobKey: jM.url,
    status: 'APPLIED',
    applied_at: daysAgo(5),
    application_channel: 'LinkedIn',
  },
};
const resM = calculateJobSearchAnalytics({ jobs: [jM], applications: appM, events: [] });
const chLinkedIn = resM.channelPerformance.find((c) => c.channel === 'LinkedIn');
const srcGreenhouseM = resM.sourcePerformance.find((s) => s.source === 'Greenhouse');
assert(chLinkedIn && chLinkedIn.applied === 1, 'M: Canal LinkedIn registrado separadamente');
assert(srcGreenhouseM && srcGreenhouseM.applied === 1, 'M: Fonte Greenhouse registrada separadamente sem misturar com canal');

// Test N: Restore/localStorage -> analytics idêntico
const appsRaw = JSON.stringify(appsA);
const appsRestored = JSON.parse(appsRaw);
const resN = calculateJobSearchAnalytics({ jobs: jobsA, applications: appsRestored, events: [] });
assert(resN.overview.totalApplied === resA.overview.totalApplied, 'N: Analytics de dados restaurados do JSON/localStorage produz resultado idêntico');

// Test O: Data inválida -> ignorada com segurança sem crash
const jO = createDummyJob('job-o-1');
const appO: Record<string, ApplicationDetails> = {
  [jO.id]: {
    jobId: jO.id,
    jobKey: jO.url,
    status: 'APPLIED',
    applied_at: 'data_invalida_xyz' as any,
  },
};
const resO = calculateJobSearchAnalytics({ jobs: [jO], applications: appO, events: [] });
assert(resO !== undefined, 'O: Tratamento seguro de datas inválidas sem crash');

console.log('\n=== ALL JOB SEARCH ANALYTICS TESTS PASSED 100% ===');
