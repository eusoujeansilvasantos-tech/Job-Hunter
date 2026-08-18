import { normalizeAdzunaJob } from '../src/services/jobSources';
import { normalizeGreenhouseJob } from '../src/services/greenhouse';
import { classifyGeo } from '../src/services/geoClassifier';
import { applySearchLocationFilter } from '../src/services/locationFilter';
import { deduplicateJobs } from '../src/utils/deduplication';
import { calculateJobScore } from '../src/services/scoring';
import { calculateApplyPriority } from '../src/services/applyPriority';
import { userProfile } from '../src/data/profile';
import { Job, UserProfile } from '../src/types';

export function runPipelineIntegrationTests() {
  console.log('========================================================================');
  console.log('RUNNING FULL PIPELINE INTEGRATION TEST: ADZUNA + GREENHOUSE + RANKING');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(name: string, condition: boolean, details?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name} - Details: ${details || 'Assertion failed'}`);
      failed++;
    }
  }

  // --- 1. SIMULATE RAW DATA FROM SOURCES ---
  const rawAdzunaJobs = [
    {
      id: 'adz-1',
      title: 'Customer Success Manager - Ribeirão Preto',
      company: { display_name: 'AgroTech Brasil' },
      location: { display_name: 'Ribeirão Preto, São Paulo', area: ['Brasil', 'São Paulo', 'Ribeirão Preto'] },
      description: 'Responsável pela gestão da carteira de clientes agro em Ribeirão Preto e região. Vaga presencial.',
      redirect_url: 'https://adzuna.com/land/adz-1',
      created: '2026-08-10T12:00:00Z',
    },
    {
      id: 'adz-2',
      title: 'Customer Success Analyst - São Paulo Capital',
      company: { display_name: 'Fintech SP' },
      location: { display_name: 'São Paulo, SP', area: ['Brasil', 'São Paulo'] },
      description: 'Atuação presencial em São Paulo capital na Faria Lima.',
      redirect_url: 'https://adzuna.com/land/adz-2',
      created: '2026-08-11T12:00:00Z',
    },
    {
      id: 'adz-3',
      title: 'Senior Customer Success Lead (100% Remoto Brasil)',
      company: { display_name: 'CloudCorp SaaS' },
      location: { display_name: 'Remoto - Brasil', area: ['Brasil'] },
      description: 'Vaga 100% remota em qualquer cidade do Brasil. Gestão de clientes enterprise B2B SaaS, QBR, NPS e retenção.',
      redirect_url: 'https://adzuna.com/land/adz-3',
      created: '2026-08-12T12:00:00Z',
    },
    {
      id: 'adz-4',
      title: 'Client Services Lead - London UK',
      company: { display_name: 'UK Finance Ltd' },
      location: { display_name: 'London, Greater London', area: ['UK', 'London'] },
      description: 'On-site London office only. Must have right to work in the UK.',
      redirect_url: 'https://adzuna.com/land/adz-4',
      created: '2026-08-12T12:00:00Z',
    },
  ];

  const rawGreenhouseJobs = [
    {
      id: 201,
      title: 'Customer Success Specialist',
      company: 'AgroTech Brasil',
      boardToken: 'agrotech',
      location: { name: 'Ribeirao Preto - SP' },
      content: 'Atendimento ao cliente em Ribeirão Preto. Modelo híbrido.',
      absolute_url: 'https://boards.greenhouse.io/agrotech/jobs/201',
      updated_at: '2026-08-10T12:00:00Z',
    },
    {
      id: 202,
      title: 'Senior Customer Success Lead (100% Remoto Brasil)',
      company: 'CloudCorp SaaS',
      boardToken: 'cloudcorp',
      location: { name: 'Remote - Brazil' },
      content: 'Vaga 100% remota em qualquer cidade do Brasil. Gestão de clientes enterprise B2B SaaS, QBR, NPS e retenção.',
      absolute_url: 'https://boards.greenhouse.io/cloudcorp/jobs/202',
      updated_at: '2026-08-12T12:00:00Z',
    },
    {
      id: 203,
      title: 'Customer Success Manager LATAM',
      company: 'GlobalSoft LATAM',
      boardToken: 'globalsoft',
      location: { name: 'Remote - Latin America' },
      content: 'Work remotely across Latin America (LATAM). Fluent English and Spanish required.',
      absolute_url: 'https://boards.greenhouse.io/globalsoft/jobs/203',
      updated_at: '2026-08-09T12:00:00Z',
    },
    {
      id: 204,
      title: 'Customer Onboarding Manager - Belo Horizonte',
      company: 'MiningTech BH',
      boardToken: 'miningtech',
      location: { name: 'Belo Horizonte, MG' },
      content: 'Atuação presencial ou híbrida no escritório de Belo Horizonte.',
      absolute_url: 'https://boards.greenhouse.io/miningtech/jobs/204',
      updated_at: '2026-08-08T12:00:00Z',
    },
    {
      id: 205,
      title: 'Enterprise CS Director - US Only',
      company: 'US Enterprise Tech',
      boardToken: 'ustech',
      location: { name: 'Remote - United States' },
      content: 'Must be physically located in the United States. US citizenship or green card required.',
      absolute_url: 'https://boards.greenhouse.io/ustech/jobs/205',
      updated_at: '2026-08-07T12:00:00Z',
    },
  ];

  // --- 2. STEP 1: NORMALIZATION & GEOCLASSIFIER ---
  const normalizedAdzuna: Job[] = rawAdzunaJobs.map(normalizeAdzunaJob);
  const normalizedGreenhouse: Job[] = rawGreenhouseJobs.map((j) =>
    normalizeGreenhouseJob(j, j.company, j.boardToken)
  );

  assert('STEP 1A: Adzuna jobs normalized correctly', normalizedAdzuna.length === 4);
  assert('STEP 1B: Greenhouse jobs normalized correctly', normalizedGreenhouse.length === 5);

  // Pre-filter international incompatible from baseline (like in jobSources.ts)
  const eligibleAdzuna = normalizedAdzuna.filter((j) => j.geoCategory !== 'NOT_COMPATIBLE');
  const eligibleGreenhouse = normalizedGreenhouse.filter((j) => j.geoCategory !== 'NOT_COMPATIBLE');

  assert(
    'STEP 1C: London on-site Adzuna is rejected as NOT_COMPATIBLE',
    eligibleAdzuna.length === 3 && normalizedAdzuna.find((j) => j.id.includes('adz-4'))?.geoCategory === 'NOT_COMPATIBLE'
  );
  assert(
    'STEP 1D: US Only Greenhouse is rejected as NOT_COMPATIBLE',
    eligibleGreenhouse.length === 4 && normalizedGreenhouse.find((j) => j.id.includes('205'))?.geoCategory === 'NOT_COMPATIBLE'
  );

  const combinedJobs = [...eligibleAdzuna, ...eligibleGreenhouse];
  assert('STEP 1E: Combined eligible pool before Search Location Filter = 7 jobs', combinedJobs.length === 7);

  // --- 3. STEP 2: SEARCH LOCATION FILTER (Search Location = "Ribeirão Preto") ---
  const searchLocation = 'Ribeirão Preto';
  const filterResult = applySearchLocationFilter(combinedJobs, searchLocation);

  assert(
    'STEP 2A: Search Location Filter ran for Ribeirão Preto',
    filterResult.metrics.searchLocation === 'Ribeirão Preto'
  );

  // Check metrics breakdown
  assert(
    'STEP 2B: Matched Local includes Ribeirão Preto on-site and hybrid jobs',
    filterResult.metrics.matchedLocal.adzuna === 1 && filterResult.metrics.matchedLocal.greenhouse === 1
  );

  assert(
    'STEP 2C: Remote Brazil includes CloudCorp SaaS remote jobs',
    filterResult.metrics.remoteBrazil.adzuna === 1 && filterResult.metrics.remoteBrazil.greenhouse === 1
  );

  assert(
    'STEP 2D: LATAM Remote includes GlobalSoft LATAM job',
    filterResult.metrics.latamRemote.greenhouse === 1
  );

  assert(
    'STEP 2E: Rejected By Location excludes São Paulo on-site and Belo Horizonte hybrid',
    filterResult.metrics.rejectedByLocation.adzuna === 1 && // adz-2 (SP)
    filterResult.metrics.rejectedByLocation.greenhouse === 1 && // gh-204 (BH)
    filterResult.metrics.rejectedByLocation.total === 2
  );

  assert(
    'STEP 2F: Total after Search Location Filter is exactly 5 (7 - 2 = 5)',
    filterResult.filteredJobs.length === 5 && filterResult.metrics.totalAfter === 5
  );

  // --- 4. STEP 3: DEDUPLICATION ---
  const deduplicationResult = deduplicateJobs(filterResult.filteredJobs);
  const dedupedJobs = deduplicationResult.uniqueJobs;

  assert(
    'STEP 3A: Deduplication detects duplicate job (CloudCorp SaaS remote from Adzuna + Greenhouse)',
    deduplicationResult.duplicatesRemoved === 1
  );

  assert(
    'STEP 3B: Pipeline total after deduplication is exactly 4 unique jobs',
    dedupedJobs.length === 4
  );

  const duplicateItem = dedupedJobs.find((j) => j.company === 'CloudCorp SaaS');
  assert(
    'STEP 3C: Duplicate item preserves multi-source tracking',
    !!duplicateItem && duplicateItem.sources.includes('adzuna') && duplicateItem.sources.includes('greenhouse')
  );

  // --- 5. STEP 4: SCORING & RANKING ENGINE ---
  const scoredJobs = dedupedJobs.map((job) => ({
    ...job,
    analysis: calculateJobScore(job, userProfile),
    priority: calculateApplyPriority(job),
  }));

  // Sort by score descending
  scoredJobs.sort((a, b) => b.analysis.score - a.analysis.score);

  assert('STEP 4A: All 4 jobs are scored deterministically', scoredJobs.every((j) => typeof j.analysis.score === 'number' && j.analysis.score >= 0 && j.analysis.score <= 100));

  // Verify that top matched job gets high score
  const topJob = scoredJobs[0];
  assert(
    'STEP 4B: Top job is a Customer Success role with high match',
    topJob.title.includes('Customer Success') && topJob.analysis.score >= 70
  );

  // Print Summary Table
  console.log('\n--- FINAL PIPELINE INTEGRATION TEST AUDIT TABLE ---');
  console.log(`| Total Raw Received: 9 (Adzuna: 4, Greenhouse: 5)`);
  console.log(`| Incompatible International Filtered: 2 (London: 1, US Only: 1)`);
  console.log(`| Eligible Pool Before Search Loc Filter: ${combinedJobs.length}`);
  console.log(`| Search Location Filter ("${searchLocation}"):`);
  console.log(`|   - Matched Local: ${filterResult.metrics.matchedLocal.total}`);
  console.log(`|   - Remote Brazil: ${filterResult.metrics.remoteBrazil.total}`);
  console.log(`|   - LATAM Remote: ${filterResult.metrics.latamRemote.total}`);
  console.log(`|   - Rejected (São Paulo on-site + Belo Horizonte hybrid): ${filterResult.metrics.rejectedByLocation.total}`);
  console.log(`| Pool After Search Loc Filter: ${filterResult.filteredJobs.length}`);
  console.log(`| Duplicates Removed: ${deduplicationResult.duplicatesRemoved}`);
  console.log(`| Final Ranked Pipeline Jobs: ${scoredJobs.length}`);
  console.log('-----------------------------------------------------\n');

  console.log(`Integration Test Result: ${passed} Passed, ${failed} Failed\n`);
  return failed === 0;
}

if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('pipeline.test')) {
  const success = runPipelineIntegrationTests();
  process.exit(success ? 0 : 1);
}
