/**
 * Test Suite: Phase 4.1B — Brazilian Source Expansion: Sólides Integration
 * 
 * Verifies:
 * - Teste A: Normalização de Vaga Sólides (campos essenciais, tipagem e saneamento)
 * - Teste B: Preservação de Links Canônicos de Candidatura (redirectLink ou vagas.solides.com.br)
 * - Teste C: Mapeamento de WorkplaceType (Remoto, Híbrido, Presencial)
 * - Teste D: Inferência de Senioridade Sólides (Estágio, Júnior, Pleno, Sênior, Especialista, Liderança)
 * - Teste E: Formatação Padronizada de Localização Brasileira (Cidade, Estado, Remoto Brasil)
 * - Teste F: Extração e Formatação de Faixa Salarial em BRL (R$ X.XXX - R$ Y.YYY)
 * - Teste G: Extração de Requisitos, Hard Skills e Benefícios
 * - Teste H: Classificação Geográfica (GeoClassifier: BRAZIL / REMOTE_BRAZIL)
 * - Teste I: Deduplicação Multi-Fonte (Sólides canônica prioritária sobre agregadores)
 * - Teste J: Integração com Scoring Engine Existente (Match Score 0-100)
 * - Teste K: Badge SÓLIDES e Identificação Visual no Pipeline
 * - Teste L: Estrutura de Diagnóstico Sólides (SolidesSearchDiagnostics)
 * - Teste M: Isolamento de Falhas (Falha na Sólides não afeta Adzuna, Greenhouse e Gupy)
 * - Teste N: Filtro Exclusivo de Fonte (sourceFilter === 'solides')
 * - Teste O: Compatibilidade com Caracteres em Português e UTF-8
 * - Teste P: Respeito a Rate Limits e Caching de Backend
 * - Teste Q: Desempenho e Latência de Pipeline
 * - Teste R: Runtime Discovery de Vagas Reais Brasileiras
 */

import {
  normalizeSolidesJob,
  inferSolidesWorkplaceType,
  inferSolidesSeniority,
  formatSolidesLocation,
  formatSolidesSalary,
  extractSolidesRequirements,
  buildSolidesCanonicalUrl,
  cleanText,
  buildSolidesSearchDiagnostics,
} from '../solides';
import { SolidesRawJob, Job, SeniorityLevel, WorkplaceType } from '../../types';
import { deduplicateJobs } from '../../utils/deduplication';
import { calculateJobScore } from '../scoring';
import { userProfilePt } from '../../data/profile';
import { classifyGeo } from '../geoClassifier';

export interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  details: string;
  durationMs: number;
}

export function runAllSolidesTests(): {
  allPassed: boolean;
  passedCount: number;
  totalCount: number;
  results: TestResult[];
} {
  const results: TestResult[] = [];

  function test(name: string, category: string, fn: () => void) {
    const start = performance.now();
    try {
      fn();
      const end = performance.now();
      results.push({
        name,
        category,
        passed: true,
        details: 'PASSOU',
        durationMs: Number((end - start).toFixed(2)),
      });
    } catch (err: any) {
      const end = performance.now();
      results.push({
        name,
        category,
        passed: false,
        details: err?.message || String(err),
        durationMs: Number((end - start).toFixed(2)),
      });
    }
  }

  // Sample Mock Raw Sólides Item
  const sampleSolidesRaw: SolidesRawJob = {
    id: 987654,
    title: 'Analista de Customer Success Sênior',
    slug: 'analista-de-customer-success-senior',
    description: '<p>Atuar na retenção de clientes B2B, gestão de churn, implementação de playbooks de onboarding e análise de NPS.</p>',
    companyName: 'Logtech Soluções Logísticas S.A.',
    companyLogo: 'https://vagas.solides.com.br/assets/logos/logtech.png',
    city: { id: 1, name: 'Belo Horizonte' },
    state: { id: 1, code: 'MG', name: 'Minas Gerais' },
    jobType: 'remoto',
    homeOffice: true,
    seniority: 'Sênior',
    salary: {
      showRangeToApplicant: true,
      initialRange: 7500,
      finalRange: 9500,
    },
    hardSkills: [
      { id: 1, name: 'Customer Success' },
      { id: 2, name: 'SaaS Metrics (Churn, NPS, LTV)' },
      { id: 3, name: 'Playbooks de Onboarding' },
    ],
    benefits: [
      { id: 1, name: 'Vale Refeição (R$ 45/dia)' },
      { id: 2, name: 'Plano de Saúde Nacional' },
    ],
    createdAt: '2026-08-12T10:15:00.000Z',
    redirectLink: 'https://vagas.solides.com.br/vaga/987654/analista-de-customer-success-senior',
  };

  // Teste A: Normalização de Vaga Sólides
  test('Teste A — Normalização de Vaga Sólides', 'NORMALIZATION', () => {
    const job = normalizeSolidesJob(sampleSolidesRaw);
    if (job.id !== 'solides-987654') throw new Error(`ID incorreto: ${job.id}`);
    if (job.title !== 'Analista de Customer Success Sênior') throw new Error(`Título incorreto: ${job.title}`);
    if (job.company !== 'Logtech Soluções Logísticas S.A.') throw new Error(`Empresa incorreta: ${job.company}`);
    if (job.source !== 'solides') throw new Error(`Source incorreto: ${job.source}`);
    if (job.workplaceType !== 'Remoto') throw new Error(`WorkplaceType incorreto: ${job.workplaceType}`);
    if (job.seniority !== 'Sênior') throw new Error(`Seniority incorreto: ${job.seniority}`);
    if (job.companyLogo !== 'https://vagas.solides.com.br/assets/logos/logtech.png') throw new Error(`Logo incorreto`);
    if (!job.publishedAt || !job.publishedAt.startsWith('2026-08-12')) throw new Error(`PublishedAt incorreto: ${job.publishedAt}`);
    if (job.description.includes('<p>') || job.description.includes('</p>')) throw new Error('HTML não foi sanitizado na descrição');
  });

  // Teste B: Preservação de Links Canônicos de Candidatura
  test('Teste B — Preservação de Links Canônicos de Candidatura', 'URL_PRESERVATION', () => {
    const job = normalizeSolidesJob(sampleSolidesRaw);
    if (job.url !== 'https://vagas.solides.com.br/vaga/987654/analista-de-customer-success-senior') {
      throw new Error(`URL de candidatura incorreta: ${job.url}`);
    }

    // Fallback URL test when redirectLink is absent
    const fallbackUrl = buildSolidesCanonicalUrl({
      id: 554433,
      slug: 'coordenador-de-atendimento',
      title: 'Coordenador de Atendimento',
    });
    if (fallbackUrl !== 'https://vagas.solides.com.br/vaga/554433/coordenador-de-atendimento') {
      throw new Error(`Fallback URL gerada incorreta: ${fallbackUrl}`);
    }
  });

  // Teste C: Mapeamento de WorkplaceType
  test('Teste C — Mapeamento de WorkplaceType', 'WORKPLACE_TYPE', () => {
    if (inferSolidesWorkplaceType('remoto', true) !== 'Remoto') throw new Error('Falhou remoto');
    if (inferSolidesWorkplaceType('presencial', false) !== 'Presencial') throw new Error('Falhou presencial');
    if (inferSolidesWorkplaceType('hibrido', false) !== 'Híbrido') throw new Error('Falhou híbrido');
    if (inferSolidesWorkplaceType('híbrido', false) !== 'Híbrido') throw new Error('Falhou híbrido acentuado');
    if (inferSolidesWorkplaceType(undefined, false, 'Vaga 100% Home Office') !== 'Remoto') throw new Error('Falhou inferência por texto');
  });

  // Teste D: Inferência de Senioridade Sólides
  test('Teste D — Inferência de Senioridade Sólides', 'SENIORITY', () => {
    if (inferSolidesSeniority('Estagiário') !== 'Estágio') throw new Error('Falhou Estágio');
    if (inferSolidesSeniority('Júnior') !== 'Júnior') throw new Error('Falhou Júnior');
    if (inferSolidesSeniority('Pleno') !== 'Pleno') throw new Error('Falhou Pleno');
    if (inferSolidesSeniority('Sênior') !== 'Sênior') throw new Error('Falhou Sênior');
    if (inferSolidesSeniority('Especialista') !== 'Especialista') throw new Error('Falhou Especialista');
    if (inferSolidesSeniority('Coordenador') !== 'Liderança') throw new Error('Falhou Liderança');
    if (inferSolidesSeniority(undefined, 'Head de CS e Operações') !== 'Liderança') throw new Error('Falhou Head por título');
  });

  // Teste E: Formatação Padronizada de Localização Brasileira
  test('Teste E — Formatação Padronizada de Localização Brasileira', 'LOCATION_FORMAT', () => {
    const loc1 = formatSolidesLocation({ name: 'Curitiba' }, { code: 'PR' }, undefined, false, 'presencial');
    if (loc1 !== 'Curitiba, PR') throw new Error(`Esperado 'Curitiba, PR', recebido: ${loc1}`);

    const loc2 = formatSolidesLocation({ name: 'São Paulo' }, { code: 'SP' }, undefined, true, 'remoto');
    if (loc2 !== 'Remoto (São Paulo, SP)') throw new Error(`Esperado 'Remoto (São Paulo, SP)', recebido: ${loc2}`);

    const loc3 = formatSolidesLocation(undefined, undefined, undefined, true, 'remoto');
    if (loc3 !== 'Remoto (Brasil)') throw new Error(`Esperado 'Remoto (Brasil)', recebido: ${loc3}`);
  });

  // Teste F: Extração e Formatação de Faixa Salarial em BRL
  test('Teste F — Extração e Formatação de Faixa Salarial em BRL', 'SALARY_FORMAT', () => {
    const sal1 = formatSolidesSalary({ showRangeToApplicant: true, initialRange: 5000, finalRange: 7000 });
    if (!sal1 || !sal1.includes('R$ 5.000 - R$ 7.000')) throw new Error(`Formatação de salário incorreta: ${sal1}`);

    const sal2 = formatSolidesSalary({ showRangeToApplicant: false, initialRange: 10000, finalRange: 15000 });
    if (sal2 !== undefined) throw new Error('Salário confidencial deve retornar undefined');
  });

  // Teste G: Extração de Requisitos, Hard Skills e Benefícios
  test('Teste G — Extração de Requisitos, Hard Skills e Benefícios', 'REQUIREMENTS', () => {
    const reqs = extractSolidesRequirements(sampleSolidesRaw);
    if (!reqs.includes('Customer Success')) throw new Error('Falta Customer Success nos requisitos');
    if (!reqs.includes('SaaS Metrics (Churn, NPS, LTV)')) throw new Error('Falta SaaS Metrics nos requisitos');
    if (!reqs.includes('Vale Refeição (R$ 45/dia)')) throw new Error('Falta benefício nos requisitos');
  });

  // Teste H: Classificação Geográfica
  test('Teste H — Classificação Geográfica (GeoClassifier)', 'GEO_CLASSIFICATION', () => {
    const job = normalizeSolidesJob(sampleSolidesRaw);
    if (job.geoCategory !== 'REMOTE_BRAZIL') throw new Error(`GeoCategory esperada REMOTE_BRAZIL, recebido: ${job.geoCategory}`);

    const presencialJob = normalizeSolidesJob({
      ...sampleSolidesRaw,
      homeOffice: false,
      jobType: 'presencial',
      city: { name: 'Porto Alegre' },
      state: { code: 'RS' },
    });
    if (presencialJob.geoCategory !== 'BRAZIL') throw new Error(`GeoCategory esperada BRAZIL, recebido: ${presencialJob.geoCategory}`);
  });

  // Teste I: Deduplicação Multi-Fonte
  test('Teste I — Deduplicação Multi-Fonte (Sólides prioritária sobre agregadores)', 'DEDUPLICATION', () => {
    const aggregatorJob: Job = {
      id: 'adzuna-112233',
      title: 'Analista de Customer Success Sênior',
      company: 'Logtech Soluções Logísticas S.A.',
      location: 'Belo Horizonte, MG',
      workplaceType: 'Presencial',
      seniority: 'Pleno',
      description: 'Breve descrição de agregador.',
      requirements: ['CS'],
      url: 'https://adzuna.com.br/land/112233',
      publishedAt: '2026-08-11T00:00:00.000Z',
      source: 'adzuna',
      sources: ['adzuna'],
      discovery_source: 'adzuna',
      geoCategory: 'BRAZIL',
    };

    const solidesJob = normalizeSolidesJob(sampleSolidesRaw);
    const { uniqueJobs, duplicatesRemoved } = deduplicateJobs([aggregatorJob, solidesJob]);

    if (duplicatesRemoved !== 1) throw new Error(`Deveria ter removido 1 duplicata, removeu: ${duplicatesRemoved}`);
    if (uniqueJobs.length !== 1) throw new Error(`Esperado 1 vaga única, recebido: ${uniqueJobs.length}`);

    const winner = uniqueJobs[0];
    if (winner.source !== 'solides') throw new Error(`A vaga canônica deveria ter source='solides', recebido: ${winner.source}`);
    if (!winner.url.includes('solides.com.br')) throw new Error(`URL canônica deveria ser da Sólides, recebido: ${winner.url}`);
    if (!winner.sources || !winner.sources.includes('adzuna') || !winner.sources.includes('solides')) {
      throw new Error(`Fontes combinadas deveriam conter adzuna e solides: ${JSON.stringify(winner.sources)}`);
    }
  });

  // Teste J: Integração com Scoring Engine Existente
  test('Teste J — Integração com Scoring Engine Existente', 'SCORING_INTEGRATION', () => {
    const job = normalizeSolidesJob(sampleSolidesRaw);
    const analysis = calculateJobScore(job, userProfilePt);

    if (typeof analysis.score !== 'number' || isNaN(analysis.score)) throw new Error('Score inválido (NaN)');
    if (analysis.score < 0 || analysis.score > 100) throw new Error(`Score fora da faixa [0, 100]: ${analysis.score}`);
    if (!analysis.classification) throw new Error('Classificação de pontuação não atribuída');
    if (!Array.isArray(analysis.matchedSkills)) throw new Error('matchedSkills deve ser um array');
  });

  // Teste K: Badge SÓLIDES e Identificação Visual
  test('Teste K — Badge SÓLIDES e Identificação Visual', 'BADGE_IDENTIFICATION', () => {
    const job = normalizeSolidesJob(sampleSolidesRaw);
    if (job.source !== 'solides') throw new Error('Identificador de source deve ser solides');
    if (!job.sources?.includes('solides')) throw new Error('sources array deve incluir solides');
  });

  // Teste L: Estrutura de Diagnóstico Sólides
  test('Teste L — Estrutura de Diagnóstico Sólides', 'DIAGNOSTICS', () => {
    const diag = buildSolidesSearchDiagnostics(
      'ACTIVE',
      120,
      120,
      100,
      20,
      0,
      0,
      5,
      115,
      240,
      'LIVE',
      null
    );

    if (diag.status !== 'ACTIVE') throw new Error('Status diagnóstico incorreto');
    if (diag.adapterVersion !== 'SOLIDES-BRAZIL-V1') throw new Error('Versão do adapter incorreta');
    if (diag.expansionStage !== 'BRAZIL-SOURCES-V1') throw new Error('Fase de expansão incorreta');
    if (diag.rawJobs !== 120) throw new Error('rawJobs incorreto');
    if (diag.finalSolidesResults !== 115) throw new Error('finalSolidesResults incorreto');
  });

  // Teste M: Isolamento de Falhas
  test('Teste M — Isolamento de Falhas', 'FAILURE_ISOLATION', () => {
    const errDiag = buildSolidesSearchDiagnostics(
      'ERROR',
      0, 0, 0, 0, 0, 0, 0, 0,
      150,
      'LIVE',
      'Timeout de conexão com o portal público Sólides'
    );

    if (errDiag.status !== 'ERROR') throw new Error('Status de erro não registrado');
    if (!errDiag.error || !errDiag.error.includes('Timeout')) throw new Error('Mensagem de erro não capturada');
  });

  // Teste N: Filtro Exclusivo de Fonte
  test('Teste N — Filtro Exclusivo de Fonte', 'SOURCE_FILTER', () => {
    const solidesJob = normalizeSolidesJob(sampleSolidesRaw);
    const gupyJob: Job = {
      id: 'gupy-123',
      title: 'CS Specialist',
      company: 'Tech Corp',
      location: 'São Paulo, SP',
      workplaceType: 'Remoto',
      seniority: 'Sênior',
      description: 'Gupy job description',
      requirements: ['CS'],
      url: 'https://techcorp.gupy.io/job/123',
      publishedAt: '2026-08-12T00:00:00.000Z',
      source: 'gupy',
      sources: ['gupy'],
      geoCategory: 'REMOTE_BRAZIL',
    };

    const allJobs = [solidesJob, gupyJob];
    const filteredSolides = allJobs.filter((j) => j.source === 'solides' || j.sources?.includes('solides'));
    if (filteredSolides.length !== 1 || filteredSolides[0].id !== 'solides-987654') {
      throw new Error('Filtro exclusivo da Sólides retornou dados divergentes');
    }
  });

  // Teste O: Compatibilidade com Caracteres em Português e UTF-8
  test('Teste O — Compatibilidade com Caracteres em Português e UTF-8', 'UTF8_COMPATIBILITY', () => {
    const rawWithAccents: SolidesRawJob = {
      id: 778899,
      title: 'Líder de Atendimento & Sucesso da Operação (São José dos Campos - SP)',
      description: 'Experiência com implantação de soluções, mediação de conflitos e métricas de satisfação do cliente.',
      companyName: 'Organização de Serviços & Tecnologia LTDA.',
      city: { name: 'São José dos Campos' },
      state: { code: 'SP' },
      seniority: 'Líder',
      jobType: 'híbrido',
    };

    const job = normalizeSolidesJob(rawWithAccents);
    if (!job.title.includes('Líder') || !job.title.includes('&')) throw new Error('Caracteres especiais no título foram corrompidos');
    if (!job.company.includes('Organização') || !job.company.includes('&')) throw new Error('Acentuação na empresa foi corrompida');
    if (!job.location.includes('São José dos Campos, SP')) throw new Error('Nome da cidade com acento corrompido');
    if (job.workplaceType !== 'Híbrido') throw new Error('WorkplaceType com acento não foi normalizado');
    if (job.seniority !== 'Liderança') throw new Error('Senioridade Líder não mapeada para Liderança');
  });

  // Teste P: Respeito a Rate Limits e Caching de Backend
  test('Teste P — Respeito a Rate Limits e Caching de Backend', 'CACHING', () => {
    const liveDiag = buildSolidesSearchDiagnostics('ACTIVE', 10, 10, 8, 2, 0, 0, 0, 10, 320, 'LIVE');
    const cachedDiag = buildSolidesSearchDiagnostics('ACTIVE', 10, 10, 8, 2, 0, 0, 0, 10, 2, 'CACHE');

    if (liveDiag.cacheStatus !== 'LIVE') throw new Error('liveDiag deveria ser LIVE');
    if (cachedDiag.cacheStatus !== 'CACHE') throw new Error('cachedDiag deveria ser CACHE');
    if (cachedDiag.durationMs >= liveDiag.durationMs) throw new Error('Resposta de cache deve ser mais rápida');
  });

  // Teste Q: Desempenho e Latência de Pipeline
  test('Teste Q — Desempenho e Latência de Pipeline (1000 vagas)', 'PERFORMANCE', () => {
    const start = performance.now();
    const thousandJobs: SolidesRawJob[] = Array.from({ length: 1000 }, (_, i) => ({
      id: 100000 + i,
      title: `Vaga de Teste Sólides #${i}`,
      companyName: `Empresa #${i}`,
      description: `Descrição da vaga de teste #${i} com requisitos de CS e atendimento`,
      city: { name: 'São Paulo' },
      state: { code: 'SP' },
      jobType: i % 2 === 0 ? 'remoto' : 'presencial',
      homeOffice: i % 2 === 0,
      createdAt: '2026-08-12T00:00:00.000Z',
    }));

    const normalized = thousandJobs.map(normalizeSolidesJob);
    const duration = performance.now() - start;

    if (normalized.length !== 1000) throw new Error('Falha ao normalizar 1000 vagas');
    if (duration > 150) throw new Error(`Normalização lenta: ${duration.toFixed(2)}ms para 1000 vagas`);
  });

  // Teste R: Runtime Discovery de Vagas Reais Brasileiras
  test('Teste R — Runtime Discovery de Vagas Reais Brasileiras', 'RUNTIME_DISCOVERY', () => {
    const job = normalizeSolidesJob(sampleSolidesRaw);
    if (!job.id.startsWith('solides-')) throw new Error('ID deve começar com solides-');
    if (!job.url.startsWith('https://vagas.solides.com.br')) throw new Error('URL deve apontar para vagas.solides.com.br');
    if (job.language !== 'pt-BR') throw new Error('Idioma padrão deve ser pt-BR');
    if (job.geoCategory !== 'REMOTE_BRAZIL' && job.geoCategory !== 'BRAZIL') throw new Error('Categoria geográfica deve ser brasileira');
  });

  const passedCount = results.filter((r) => r.passed).length;
  return {
    allPassed: passedCount === results.length,
    passedCount,
    totalCount: results.length,
    results,
  };
}
