import { Job, SeniorityLevel, WorkplaceType, PandapeRawJob, PandapeSearchDiagnostics } from '../types';
import { classifyGeo } from './geoClassifier';

export interface PandapeFetchOptions {
  query?: string;
  location?: string;
  city?: string;
  state?: string;
  workplaceType?: string;
  tenantKey?: string;
  limit?: number;
  page?: number;
}

export interface PandapeFetchResult {
  ok: boolean;
  httpStatus: number;
  jobs: Job[];
  rawCount: number;
  diagnostics: PandapeSearchDiagnostics;
  error?: string;
}

/**
 * Clean text from HTML artifacts and extra spacing.
 */
export function cleanText(text: string): string {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Infer WorkplaceType using Pandapé structured fields with text fallback.
 */
export function inferPandapeWorkplaceType(
  rawWorkplace?: string,
  title?: string,
  description?: string,
  location?: string
): WorkplaceType {
  const wp = (rawWorkplace || '').toLowerCase().trim();

  if (wp.includes('home office') || wp.includes('remoto') || wp.includes('remote')) {
    return 'Remoto';
  }
  if (wp.includes('híbrido') || wp.includes('hibrido') || wp.includes('hybrid')) {
    return 'Híbrido';
  }
  if (wp.includes('presencial') || wp.includes('on-site') || wp.includes('onsite')) {
    return 'Presencial';
  }

  // Fallback to text inspection
  const combined = `${title || ''} ${description || ''} ${location || ''}`.toLowerCase();
  if (
    combined.includes('híbrido') ||
    combined.includes('hibrido') ||
    combined.includes('hybrid')
  ) {
    return 'Híbrido';
  }
  if (
    combined.includes('remoto') ||
    combined.includes('remote') ||
    combined.includes('home office') ||
    combined.includes('teletrabalho') ||
    combined.includes('100% remoto')
  ) {
    return 'Remoto';
  }

  return 'Presencial';
}

/**
 * Infer SeniorityLevel from title, description, and contract type.
 */
export function inferPandapeSeniority(
  title?: string,
  description?: string,
  contract?: string
): SeniorityLevel {
  const combined = `${title || ''} ${description || ''} ${contract || ''}`.toLowerCase();

  if (
    combined.includes('estágio') ||
    combined.includes('estagio') ||
    combined.includes('estagiário') ||
    combined.includes('estagiario') ||
    combined.includes('intern') ||
    combined.includes('aprendiz') ||
    combined.includes('jovem aprendiz')
  ) {
    return 'Estágio';
  }
  if (
    combined.includes('junior') ||
    combined.includes('júnior') ||
    combined.includes('jr.') ||
    combined.includes(' jr ') ||
    combined.endsWith(' jr') ||
    combined.includes('trainee')
  ) {
    return 'Júnior';
  }
  if (
    combined.includes('lead') ||
    combined.includes('lider') ||
    combined.includes('líder') ||
    combined.includes('gerente') ||
    combined.includes('head ') ||
    combined.includes('head of') ||
    combined.includes('coordenador') ||
    combined.includes('coordenadora') ||
    combined.includes('manager') ||
    combined.includes('diretor') ||
    combined.includes('diretora')
  ) {
    return 'Liderança';
  }
  if (
    combined.includes('especialista') ||
    combined.includes('specialist') ||
    combined.includes('principal') ||
    combined.includes('staff') ||
    combined.includes('architect')
  ) {
    return 'Especialista';
  }
  if (
    combined.includes('senior') ||
    combined.includes('sênior') ||
    combined.includes('sr.') ||
    combined.includes(' sr ') ||
    combined.endsWith(' sr')
  ) {
    return 'Sênior';
  }

  return 'Pleno';
}

/**
 * Format Pandapé location into standard Brazilian display string.
 */
export function formatPandapeLocation(rawLocation?: string, workplace?: string): string {
  const loc = cleanText(rawLocation || '').trim();
  const isRemote =
    (workplace || '').toLowerCase().includes('home office') ||
    (workplace || '').toLowerCase().includes('remoto');

  if (isRemote) {
    if (loc && loc !== 'Brasil' && loc !== 'Home Office') {
      return `Remoto (${loc}, Brasil)`;
    }
    return 'Remoto (Brasil)';
  }

  if (loc) {
    if (!loc.toLowerCase().includes('brasil')) {
      return `${loc}, Brasil`;
    }
    return loc;
  }

  return 'Brasil';
}

/**
 * Extract hard skills and requirements from Pandapé raw vacancy.
 */
export function extractPandapeRequirements(raw: PandapeRawJob): string[] {
  const reqs: string[] = [];

  if (Array.isArray(raw.requirements) && raw.requirements.length > 0) {
    raw.requirements.forEach((r) => {
      const cleaned = cleanText(r);
      if (cleaned && !reqs.includes(cleaned)) {
        reqs.push(cleaned);
      }
    });
  }

  if (raw.contract) {
    reqs.push(`Modelo de Contratação: ${raw.contract}`);
  }

  if (raw.description && reqs.length < 5) {
    const lines = raw.description.split(/[;\n•·-]/).map((l) => l.trim()).filter((l) => l.length > 5 && l.length < 100);
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (
        lower.includes('experiência') ||
        lower.includes('conhecimento') ||
        lower.includes('habilidade') ||
        lower.includes('superior') ||
        lower.includes('formação') ||
        lower.includes('inglês') ||
        lower.includes('domínio') ||
        lower.includes('diferencial')
      ) {
        if (!reqs.includes(line)) {
          reqs.push(line);
        }
        if (reqs.length >= 5) break;
      }
    }
  }

  if (reqs.length === 0) {
    reqs.push('Requisitos e qualificações alinhados com o perfil corporativo da vaga');
  }

  return reqs;
}

/**
 * Normalizes a raw Pandapé vacancy into standard Job model.
 */
export function normalizePandapeJob(raw: PandapeRawJob): Job {
  const id = raw.id.startsWith('pandape_') ? raw.id : `pandape_${raw.tenantKey}_${raw.rawId}`;
  const title = cleanText(raw.title || 'Vaga Pandapé');
  const company = cleanText(raw.company || raw.tenantName || 'Empresa Contratante');
  const location = formatPandapeLocation(raw.location, raw.workplace);
  const workplaceType = inferPandapeWorkplaceType(raw.workplace, title, raw.description, location);
  const seniority = inferPandapeSeniority(title, raw.description, raw.contract);
  const description = cleanText(
    raw.description ||
      `Vaga oficial publicada pela ${company} através do portal de carreiras Pandapé (ATS InfoJobs). Localidade: ${location}. Modelo de trabalho: ${workplaceType}. Tipo de contratação: ${raw.contract || 'CLT'}.`
  );
  const requirements = extractPandapeRequirements(raw);
  const url = raw.url || `https://${raw.tenantKey}.pandape.infojobs.com.br/Detail/${raw.rawId}`;
  const publishedAt = new Date().toISOString();
  const salaryRange = raw.salary ? cleanText(raw.salary) : undefined;
  const geoCategory = classifyGeo(location, description);
  const isEnriched = !!(raw.isEnriched || raw.enrichmentStatus === 'SUCCESS' || raw.enrichmentStatus === 'PARTIAL');
  const enrichmentStatus = raw.enrichmentStatus || (isEnriched ? 'SUCCESS' : 'NOT_REQUESTED');

  return {
    id,
    title,
    company,
    location,
    workplaceType,
    seniority,
    description,
    requirements,
    url,
    publishedAt,
    salaryRange,
    source: 'pandape',
    sources: ['pandape'],
    discovery_source: 'pandape',
    companyLogo: raw.companyLogo,
    responsibilities: raw.responsibilities,
    benefits: raw.benefits,
    skills: raw.skills,
    employmentType: raw.contract,
    enrichmentStatus,
    isEnriched,
    roleFamily: undefined,
    language: 'pt-BR',
    geoCategory,
    status: 'NEW',
    resumeLanguageOverride: 'pt-BR',
  };
}

/**
 * Builds Pandapé search diagnostics.
 */
export function buildPandapeSearchDiagnostics(
  status: PandapeSearchDiagnostics['status'],
  rawJobs: number,
  normalizedCount: number,
  brazilCount: number,
  remoteBrazilCount: number,
  latamCount: number,
  blockedCount: number,
  duplicatesRemoved: number,
  finalPandapeResults: number,
  tenantsChecked: number,
  tenantsSuccessful: number,
  tenantsFailed: number,
  durationMs: number,
  cacheStatus: 'LIVE' | 'CACHE' = 'LIVE',
  error?: string | null,
  tenantDiagnostics?: PandapeSearchDiagnostics['tenantDiagnostics'],
  enrichment?: PandapeSearchDiagnostics['enrichment']
): PandapeSearchDiagnostics {
  return {
    status,
    publicDiscovery: 'AVAILABLE',
    requests: 1,
    rawJobs,
    normalizedCount,
    brazilCount,
    remoteBrazilCount,
    latamCount,
    blockedCount,
    duplicatesRemoved,
    finalPandapeResults,
    tenantsChecked,
    tenantsSuccessful,
    tenantsFailed,
    durationMs,
    cacheStatus,
    adapterVersion: 'PANDAPE-BRAZIL-V1',
    expansionStage: 'BRAZIL-SOURCES-V1',
    tenantDiagnostics,
    enrichment,
    error: error || null,
  };
}

/**
 * Client-side fetcher calling the backend proxy for Pandapé public vacancies.
 */
export async function fetchPandapeJobs(options: PandapeFetchOptions = {}): Promise<PandapeFetchResult> {
  const startTime = performance.now();
  const cleanQuery = (options.query || '').trim();
  const cleanLocation = (options.location || options.city || '').trim();
  const limit = options.limit || 50;
  const page = options.page || 1;

  try {
    const payload = {
      query: cleanQuery,
      location: cleanLocation,
      limit,
      page,
      workplaceType: options.workplaceType,
      tenantKey: options.tenantKey,
    };

    const response = await fetch('/api/pandape/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const durationMs = Math.round(performance.now() - startTime);

    if (!response.ok) {
      let errorMsg = `Pandapé Proxy HTTP ${response.status}`;
      try {
        const errJson = await response.json();
        if (errJson.pandapeError) errorMsg = errJson.pandapeError;
      } catch {}

      const diagnostics = buildPandapeSearchDiagnostics(
        response.status === 429 ? 'RATE_LIMITED' : 'ERROR',
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        durationMs,
        'LIVE',
        errorMsg
      );

      return {
        ok: false,
        httpStatus: response.status,
        jobs: [],
        rawCount: 0,
        diagnostics,
        error: errorMsg,
      };
    }

    const data = await response.json();
    if (data.ok === false || data.success === false) {
      const errorMsg = data.pandapeError || data.error || 'Erro retornado pelo Pandapé';
      const diagnostics = buildPandapeSearchDiagnostics(
        data.statusCategory || (data.pandapeHttpStatus === 429 ? 'RATE_LIMITED' : 'ERROR'),
        0, 0, 0, 0, 0, 0, 0, 0,
        data.tenantsChecked || 0,
        data.tenantsSuccessful || 0,
        data.tenantsFailed || 0,
        durationMs,
        data.cacheStatus === 'CACHE' ? 'CACHE' : 'LIVE',
        errorMsg,
        data.tenantDiagnostics
      );
      return {
        ok: false,
        httpStatus: data.pandapeHttpStatus || 400,
        jobs: [],
        rawCount: 0,
        diagnostics,
        error: errorMsg,
      };
    }

    const rawItems: PandapeRawJob[] = Array.isArray(data.results) ? data.results : [];
    const cacheStatus: 'LIVE' | 'CACHE' = data.cacheStatus === 'CACHE' ? 'CACHE' : 'LIVE';

    const normalizedJobs = rawItems.map(normalizePandapeJob);

    let brazilCount = 0;
    let remoteBrazilCount = 0;
    let latamCount = 0;
    let blockedCount = 0;

    normalizedJobs.forEach((j) => {
      if (j.geoCategory === 'BRAZIL') brazilCount++;
      else if (j.geoCategory === 'REMOTE_BRAZIL') remoteBrazilCount++;
      else if (j.geoCategory === 'LATAM_COMPATIBLE') latamCount++;
      else blockedCount++;
    });

    const status: PandapeSearchDiagnostics['status'] =
      normalizedJobs.length > 0 ? 'ACTIVE' : 'NO_MATCHING_JOBS';

    const diagnostics = buildPandapeSearchDiagnostics(
      status,
      rawItems.length,
      normalizedJobs.length,
      brazilCount,
      remoteBrazilCount,
      latamCount,
      blockedCount,
      0,
      normalizedJobs.length,
      data.tenantsChecked || 0,
      data.tenantsSuccessful || 0,
      data.tenantsFailed || 0,
      durationMs,
      cacheStatus,
      null,
      data.tenantDiagnostics,
      data.enrichment
    );

    return {
      ok: true,
      httpStatus: 200,
      jobs: normalizedJobs,
      rawCount: rawItems.length,
      diagnostics,
    };
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - startTime);
    const errorMsg = err.message || 'Erro de conexão ao buscar vagas do Pandapé.';

    const diagnostics = buildPandapeSearchDiagnostics(
      'NETWORK_ERROR',
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      durationMs,
      'LIVE',
      errorMsg
    );

    return {
      ok: false,
      httpStatus: 500,
      jobs: [],
      rawCount: 0,
      diagnostics,
      error: errorMsg,
    };
  }
}

/**
 * Enrich single Pandapé job with full description on demand (Lazy Enrichment).
 */
export async function fetchPandapeJobDetailClient(
  tenantKey: string,
  rawId: string
): Promise<{ ok: boolean; title?: string; description?: string; requirements?: string[]; error?: string }> {
  try {
    const res = await fetch(`/api/pandape/search?action=detail&tenantKey=${encodeURIComponent(tenantKey)}&rawId=${encodeURIComponent(rawId)}`);
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    return await res.json();
  } catch (err: any) {
    return { ok: false, error: err.message || 'Falha ao buscar detalhes' };
  }
}
