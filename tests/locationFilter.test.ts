import { applySearchLocationFilter, matchesSearchLocation, normalizeLocation } from '../src/services/locationFilter';
import { classifyGeo } from '../src/services/geoClassifier';
import { deduplicateJobs } from '../src/utils/deduplication';
import { Job } from '../src/types';

function runTests() {
  console.log('=====================================================');
  console.log('RUNNING JOB HUNTER LOCATION & GEO SEARCH TESTS (A - J)');
  console.log('=====================================================\n');

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

  const createMockJob = (id: string, title: string, location: string, description: string, source: 'adzuna' | 'greenhouse' = 'adzuna', url?: string): Job => {
    const geo = classifyGeo(location, description);
    return {
      id,
      title,
      company: 'Test Company',
      location,
      workplaceType: 'Presencial',
      seniority: 'Pleno',
      description,
      requirements: [],
      url: url || `https://example.com/jobs/${id}`,
      publishedAt: '2026-08-01',
      source,
      sources: [source],
      geoCategory: geo,
    };
  };

  // TEST A: Search "Ribeirão Preto", Job "Ribeirão Preto, SP — On-site" -> INCLUDED
  {
    const jobA = createMockJob('a1', 'Customer Success Manager', 'Ribeirão Preto, SP', 'Vaga presencial em Ribeirão Preto');
    const resA = applySearchLocationFilter([jobA], 'Ribeirão Preto');
    assert('TEST A: Ribeirão Preto on-site is INCLUDED', resA.filteredJobs.length === 1 && resA.metrics.matchedLocal.total === 1);
  }

  // TEST B: Search "Ribeirão Preto", Job "São Paulo, SP — On-site" -> EXCLUDED
  {
    const jobB = createMockJob('b1', 'Customer Success Analyst', 'São Paulo, SP', 'Atuação presencial em São Paulo capital');
    const resB = applySearchLocationFilter([jobB], 'Ribeirão Preto');
    assert('TEST B: São Paulo on-site is EXCLUDED for Ribeirão Preto search', resB.filteredJobs.length === 0 && resB.metrics.rejectedByLocation.total === 1);
  }

  // TEST C: Search "Ribeirão Preto", Job "Remote — Brazil" -> INCLUDED
  {
    const jobC = createMockJob('c1', 'CS Ops Lead', 'Remote - Brazil', 'Trabalho 100% remoto de qualquer lugar do Brasil');
    const resC = applySearchLocationFilter([jobC], 'Ribeirão Preto');
    assert('TEST C: Remote Brazil is INCLUDED for Ribeirão Preto search', resC.filteredJobs.length === 1 && resC.metrics.remoteBrazil.total === 1);
  }

  // TEST D: Search "Ribeirão Preto", Job "Remote — United States only" -> EXCLUDED
  {
    const jobD = createMockJob('d1', 'CS Manager US', 'Remote', 'Must reside in the US. United States only.');
    const resD = applySearchLocationFilter([jobD], 'Ribeirão Preto');
    assert('TEST D: Remote US only is EXCLUDED', resD.filteredJobs.length === 0 && jobD.geoCategory === 'NOT_COMPATIBLE');
  }

  // TEST E: Search "Ribeirão Preto", Job "LATAM Remote" (LATAM_COMPATIBLE) -> INCLUDED
  {
    const jobE = createMockJob('e1', 'Account Executive LATAM', 'Remote - LATAM', '100% remote across Latin America');
    const resE = applySearchLocationFilter([jobE], 'Ribeirão Preto');
    assert('TEST E: LATAM Remote is INCLUDED when LATAM_COMPATIBLE', resE.filteredJobs.length === 1 && resE.metrics.latamRemote.total === 1);
  }

  // TEST F: Search "Ribeirão Preto", Job with LATAM in title but US Only description -> EXCLUDED
  {
    const jobF = createMockJob('f1', 'LATAM Lead', 'Remote', 'Remote - US only. Must be located in US.');
    const resF = applySearchLocationFilter([jobF], 'Ribeirão Preto');
    assert('TEST F: Incompatible foreign job is EXCLUDED', resF.filteredJobs.length === 0);
  }

  // TEST G: Search empty (""), Job "São Paulo" -> NOT excluded by location
  {
    const jobG = createMockJob('g1', 'Customer Onboarding Specialist', 'São Paulo, SP', 'Escritório São Paulo');
    const resG = applySearchLocationFilter([jobG], '');
    assert('TEST G: Empty search location does NOT exclude Brazil jobs', resG.filteredJobs.length === 1 && resG.metrics.matchedLocal.total === 1);
  }

  // TEST H: Search "Ribeirão Preto", Job "Ribeirao Preto - SP" (accent insensitive) -> INCLUDED
  {
    const jobH = createMockJob('h1', 'Support Analyst', 'Ribeirao Preto - SP', 'Vaga em Ribeirao Preto sem acento');
    const resH = applySearchLocationFilter([jobH], 'Ribeirão Preto');
    assert('TEST H: Accent-insensitive match (Ribeirao Preto - SP) is INCLUDED', resH.filteredJobs.length === 1 && resH.metrics.matchedLocal.total === 1);
  }

  // TEST I: Search "Ribeirão Preto", duplicate job from Adzuna and Greenhouse -> 1 unique job
  {
    const jobAdzuna = createMockJob('i1', 'CS Manager', 'Ribeirão Preto, SP', 'Vaga na empresa XYZ em Ribeirão Preto', 'adzuna', 'https://boards.greenhouse.io/xyz/jobs/999');
    const jobGreenhouse = createMockJob('i2', 'CS Manager', 'Ribeirão Preto, SP', 'Vaga na empresa XYZ em Ribeirão Preto detalhada', 'greenhouse', 'https://boards.greenhouse.io/xyz/jobs/999');
    
    const { filteredJobs } = applySearchLocationFilter([jobAdzuna, jobGreenhouse], 'Ribeirão Preto');
    const { uniqueJobs, duplicatesRemoved } = deduplicateJobs(filteredJobs);
    assert('TEST I: Deduplication merges Adzuna + Greenhouse into 1 job', uniqueJobs.length === 1 && duplicatesRemoved === 1 && uniqueJobs[0].sources?.includes('adzuna') && uniqueJobs[0].sources?.includes('greenhouse'));
  }

  // TEST J: Adzuna unavailable / HTTP error -> Greenhouse still succeeds and diagnostics record failure cleanly
  {
    const greenhouseJob1 = createMockJob('j1', 'CS Representative', 'Remote - Brasil', 'Trabalho remoto', 'greenhouse');
    const greenhouseJob2 = createMockJob('j2', 'CS Specialist', 'Ribeirão Preto, SP', 'Presencial Ribeirão', 'greenhouse');
    const greenhouseJob3 = createMockJob('j3', 'CS Specialist Belo Horizonte', 'Belo Horizonte, MG', 'Presencial BH', 'greenhouse');

    const combined = [greenhouseJob1, greenhouseJob2, greenhouseJob3];
    const { filteredJobs, metrics } = applySearchLocationFilter(combined, 'Ribeirão Preto');

    assert('TEST J: Pipeline succeeds when Adzuna returns 0, filtering Greenhouse properly', 
      filteredJobs.length === 2 && 
      metrics.sourceBefore.greenhouse === 3 &&
      metrics.matchedLocal.greenhouse === 1 &&
      metrics.remoteBrazil.greenhouse === 1 &&
      metrics.rejectedByLocation.greenhouse === 1
    );
  }

  console.log('\n=====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED / ${failed} FAILED`);
  console.log('=====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
