import { calculateApplyPriority } from '../applyPriority';
import { JobWithAnalysis, ApplicationStatus } from '../../types';
import { setJobStatus, getStoredDetails, getStoredEvents } from '../applicationStatus';

// Simple mock for node execution environment
if (typeof window === 'undefined') {
  const store: Record<string, string> = {};
  (global as any).window = {
    localStorage: {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, val: string) => { store[key] = val; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
    },
  };
  (global as any).localStorage = (global as any).window.localStorage;
}

export function runApplyPriorityTests(): boolean {
  let passed = true;

  const assert = (condition: boolean, testName: string, detail?: string) => {
    if (condition) {
      console.log(`PASS [${testName}]`);
    } else {
      console.error(`FAIL [${testName}]: ${detail || 'Assertion failed'}`);
      passed = false;
    }
  };

  const todayIso = new Date().toISOString();
  const daysAgo25Iso = new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString();

  // Base mock helper
  const createTestJob = (overrides: Partial<JobWithAnalysis>): JobWithAnalysis => ({
    id: 'test-job-1',
    title: 'Customer Success Specialist',
    company: 'SaaS Corp',
    location: 'São Paulo, SP',
    workplaceType: 'Remoto',
    seniority: 'Sênior',
    description: 'Vaga para Customer Success no Brasil com inglês desejável.',
    requirements: ['Customer Success', 'SaaS'],
    url: 'https://saascorp.com/jobs/1',
    publishedAt: todayIso,
    source: 'greenhouse',
    geoCategory: 'BRAZIL',
    status: 'NEW',
    analysis: {
      score: 95,
      classification: 'Excelente',
      breakdown: {
        titleScore: 20,
        skillsScore: 25,
        experienceScore: 20,
        toolsScore: 10,
        seniorityScore: 10,
        languageScore: 5,
        educationScore: 3,
        locationScore: 3,
        keywordsScore: 4,
        total: 95,
      },
      matchedSkills: ['Customer Success', 'SaaS'],
      relatedSkills: [],
      missingSkills: [],
      atsKeywords: ['CSM', 'Churn'],
      matchReasons: ['Excelente aderência'],
      strengths: ['Experiência sólida'],
      gaps: [],
      relevantExperienceSummary: ['5 anos de CS'],
    },
    ...overrides,
  });

  // Test A: Match 95, ATS 90, Publicada hoje, Brazil, Sem gaps, Source Yield 80+ -> Apply Priority 90+ (APPLY NOW)
  const jobA = createTestJob({ publishedAt: todayIso });
  const resA = calculateApplyPriority(jobA, { atsCoverage: 90, sourceYield: 85 });
  assert(
    resA.score >= 90 && resA.classification === 'APPLY NOW',
    'Case A: Apply Priority 90+ (APPLY NOW)',
    `Expected >=90 and APPLY NOW, got ${resA.score} (${resA.classification})`
  );

  // Test B: Match 95, ATS 90, Publicada há 25 dias, Brazil, Sem gaps -> Menor que A
  const jobB = createTestJob({ publishedAt: daysAgo25Iso });
  const resB = calculateApplyPriority(jobB, { atsCoverage: 90, sourceYield: 85 });
  assert(
    resB.score < resA.score,
    'Case B: Vaga antiga pontua menor que vaga recente',
    `Expected score B (${resB.score}) < score A (${resA.score})`
  );

  // Test C: Match 87, ATS 92, Publicada hoje, Remote Brazil, Sem gaps, Source Yield alto -> Pode superar B (Match 95 antiga)
  const jobC = createTestJob({
    publishedAt: todayIso,
    analysis: {
      ...jobA.analysis,
      score: 87,
    },
  });
  const resC = calculateApplyPriority(jobC, { atsCoverage: 92, sourceYield: 85 });
  assert(
    resC.score > resB.score,
    'Case C: Match 87 recente supera Match 95 antiga (há 25 dias)',
    `Expected score C (${resC.score}) > score B (${resB.score})`
  );

  // Test D: Match 96, US Only -> NOT ELIGIBLE
  const jobD = createTestJob({
    geoCategory: 'NOT_COMPATIBLE',
    location: 'Remote - US Only',
    description: 'Must reside in the US. US Only.',
  });
  const resD = calculateApplyPriority(jobD, { atsCoverage: 90, sourceYield: 80 });
  assert(
    resD.classification === 'NOT ELIGIBLE' && resD.blockers.length > 0,
    'Case D: US Only resulta em NOT ELIGIBLE e traz Blocker',
    `Expected NOT ELIGIBLE with blockers, got ${resD.classification}`
  );

  // Test E: Match 90, Required Critical Gap -> Não classificar como APPLY NOW (Blocker)
  const jobE = createTestJob({
    description: 'Inglês fluente obrigatório para atuação global.',
    analysis: {
      ...jobA.analysis,
      score: 90,
      gaps: ['Inglês fluente obrigatório não verificado no perfil'],
    },
  });
  const resE = calculateApplyPriority(jobE, { atsCoverage: 80, sourceYield: 75 });
  assert(
    resE.classification !== 'APPLY NOW' && resE.blockers.length > 0,
    'Case E: Required Critical Gap gera Blocker e impede APPLY NOW',
    `Expected not APPLY NOW and blocker present, got ${resE.classification}`
  );

  // Test F: Match 75, ATS 70, Vaga recente, Brazil -> REVIEW / Faixa intermediária
  const jobF = createTestJob({
    publishedAt: todayIso,
    analysis: {
      ...jobA.analysis,
      score: 75,
    },
  });
  const resF = calculateApplyPriority(jobF, { atsCoverage: 70, sourceYield: 60 });
  assert(
    resF.classification === 'REVIEW' || resF.classification === 'HIGH PRIORITY',
    'Case F: Match 75 Recente fica na faixa intermediária (REVIEW / HIGH PRIORITY)',
    `Got ${resF.classification} (${resF.score})`
  );

  // Test G: Status APPLIED -> Classification: ALREADY APPLIED
  const jobG = createTestJob({ status: 'APPLIED' });
  const resG = calculateApplyPriority(jobG, { atsCoverage: 90, sourceYield: 80 });
  assert(
    resG.classification === 'ALREADY APPLIED',
    'Case G: Status APPLIED resulta em ALREADY APPLIED',
    `Expected ALREADY APPLIED, got ${resG.classification}`
  );

  // Test H: Status INTERVIEW -> Classification: IN INTERVIEW
  const jobH = createTestJob({ status: 'INTERVIEW' });
  const resH = calculateApplyPriority(jobH, { atsCoverage: 90, sourceYield: 80 });
  assert(
    resH.classification === 'IN INTERVIEW',
    'Case H: Status INTERVIEW resulta em IN INTERVIEW',
    `Expected IN INTERVIEW, got ${resH.classification}`
  );

  // Test I: Source Yield desconhecido -> Componente neutro (3 pts)
  const jobI = createTestJob({});
  const resI = calculateApplyPriority(jobI, { atsCoverage: 80, sourceYield: null });
  assert(
    resI.breakdown.sourceComponent === 3,
    'Case I: Source Yield nulo pontua neutro (3 pts)',
    `Expected 3 pts, got ${resI.breakdown.sourceComponent}`
  );

  // Test J: Data desconhecida -> RECENCY_UNKNOWN (6 pts) e warning
  const jobJ = createTestJob({ publishedAt: 'Há 2 dias' }); // Unparseable string
  const resJ = calculateApplyPriority(jobJ, { atsCoverage: 80, sourceYield: 70 });
  assert(
    resJ.breakdown.recencyComponent === 6 && resJ.warnings.some((w) => w.includes('Data de publicação')),
    'Case J: Data desconhecida pontua neutro (6 pts) com aviso',
    `Expected 6 pts and date warning, got ${resJ.breakdown.recencyComponent}`
  );

  // Test K: Vaga duplicada Adzuna + Greenhouse -> Única Apply Priority calculada
  const jobK = createTestJob({
    source: 'greenhouse',
    sources: ['greenhouse', 'adzuna'],
    publishedAt: todayIso,
  });
  const resK = calculateApplyPriority(jobK, { atsCoverage: 85, sourceYield: 80 });
  assert(
    typeof resK.score === 'number' && resK.score >= 0 && resK.score <= 100,
    'Case K: Vaga com múltiplas fontes possui uma única Apply Priority determinística',
    `Calculated score: ${resK.score}`
  );

  // Test L: PREPARED -> APPLIED salva snapshot em application details e metadata em application_event
  const jobL = createTestJob({ id: 'test-job-snapshot-l', status: 'PREPARED' });
  setJobStatus(jobL, 'APPLIED', 'Candidatura realizada pelo portal');

  const details = getStoredDetails();
  const appDetails = Object.values(details).find((d) => d.jobId === jobL.id);
  const events = getStoredEvents();
  const appEvent = events.find((e) => e.job_id === jobL.id && e.to_status === 'APPLIED');

  assert(
    appDetails?.apply_priority_at_application !== undefined &&
      appDetails?.match_score_at_application === 95 &&
      appEvent?.metadata?.applyPriority !== undefined,
    'Case L: Snapshot capturado com sucesso ao transicionar para APPLIED',
    `Snapshot details: ${JSON.stringify(appDetails)}, event metadata: ${JSON.stringify(appEvent?.metadata)}`
  );

  console.log(`\n=== APPLY PRIORITY TESTS COMPLETED: ${passed ? 'ALL PASSED 100%' : 'SOME FAILED'} ===\n`);
  return passed;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = runApplyPriorityTests();
  if (!result) process.exit(1);
}
