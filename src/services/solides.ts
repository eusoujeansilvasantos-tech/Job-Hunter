import { Job, SeniorityLevel, WorkplaceType, SolidesRawJob, SolidesSearchDiagnostics } from '../types';
import { classifyGeo } from './geoClassifier';

export interface SolidesFetchOptions {
  query?: string;
  location?: string;
  city?: string;
  state?: string;
  workplaceType?: string;
  limit?: number;
  offset?: number;
  page?: number;
}

export interface SolidesFetchResult {
  ok: boolean;
  httpStatus: number;
  jobs: Job[];
  rawCount: number;
  diagnostics: SolidesSearchDiagnostics;
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
 * Infer WorkplaceType using Sólides structured fields with text fallback.
 */
export function inferSolidesWorkplaceType(
  jobType?: string,
  homeOffice?: boolean,
  title?: string,
  description?: string,
  location?: string
): WorkplaceType {
  const jt = (jobType || '').toLowerCase().trim();

  if (homeOffice === true || jt === 'remoto' || jt === 'remote') {
    return 'Remoto';
  }
  if (jt === 'hibrido' || jt === 'híbrido' || jt === 'hybrid') {
    return 'Híbrido';
  }
  if (jt === 'presencial' || jt === 'on-site' || jt === 'onsite') {
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
 * Infer SeniorityLevel from Sólides seniority fields, title, and description.
 */
export function inferSolidesSeniority(
  rawSeniority?: any,
  title?: string,
  description?: string
): SeniorityLevel {
  let seniorityStr = '';
  if (typeof rawSeniority === 'string') {
    seniorityStr = rawSeniority.toLowerCase();
  } else if (Array.isArray(rawSeniority)) {
    seniorityStr = rawSeniority.map((s) => (typeof s === 'string' ? s : s?.name || '')).join(' ').toLowerCase();
  } else if (rawSeniority && typeof rawSeniority === 'object') {
    seniorityStr = (rawSeniority.name || rawSeniority.title || '').toLowerCase();
  }

  if (
    seniorityStr.includes('estagio') ||
    seniorityStr.includes('estágio') ||
    seniorityStr.includes('estagiario') ||
    seniorityStr.includes('estagiário') ||
    seniorityStr.includes('intern') ||
    seniorityStr.includes('aprendiz')
  ) {
    return 'Estágio';
  }
  if (seniorityStr.includes('junior') || seniorityStr.includes('júnior') || seniorityStr.includes('trainee')) {
    return 'Júnior';
  }
  if (
    seniorityStr.includes('lider') ||
    seniorityStr.includes('líder') ||
    seniorityStr.includes('gerente') ||
    seniorityStr.includes('head') ||
    seniorityStr.includes('coordenador') ||
    seniorityStr.includes('diretor')
  ) {
    return 'Liderança';
  }
  if (seniorityStr.includes('especialista') || seniorityStr.includes('specialist') || seniorityStr.includes('architect')) {
    return 'Especialista';
  }
  if (seniorityStr.includes('senior') || seniorityStr.includes('sênior') || seniorityStr.includes('sr')) {
    return 'Sênior';
  }

  const combined = `${title || ''} ${description || ''}`.toLowerCase();
  if (
    combined.includes('estágio') ||
    combined.includes('estagio') ||
    combined.includes('estagiário') ||
    combined.includes('estagiario') ||
    combined.includes('intern') ||
    combined.includes('aprendiz')
  ) {
    return 'Estágio';
  }
  if (combined.includes('junior') || combined.includes('júnior') || combined.includes('jr.') || combined.includes(' jr ') || combined.endsWith(' jr')) {
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
  if (combined.includes('senior') || combined.includes('sênior') || combined.includes('sr.') || combined.includes(' sr ') || combined.endsWith(' sr')) {
    return 'Sênior';
  }
  return 'Pleno';
}

/**
 * Format Sólides location into clean, human-readable Brazilian standard.
 */
export function formatSolidesLocation(
  city?: any,
  state?: any,
  address?: any,
  homeOffice?: boolean,
  jobType?: string
): string {
  let cityName = '';
  let stateCode = '';

  if (typeof city === 'string') {
    cityName = cleanText(city);
  } else if (city && typeof city === 'object') {
    cityName = cleanText(city.name || '');
  }

  if (typeof state === 'string') {
    stateCode = cleanText(state).toUpperCase();
  } else if (state && typeof state === 'object') {
    stateCode = cleanText(state.code || state.name || '').toUpperCase();
  }

  // Address fallback
  if (!cityName && address?.city) {
    cityName = cleanText(address.city);
  }
  if (!stateCode && address?.state) {
    stateCode = cleanText(address.state).toUpperCase();
  }

  if (homeOffice === true || jobType === 'remoto' || jobType === 'remote') {
    if (cityName && stateCode) {
      return `Remoto (${cityName}, ${stateCode})`;
    }
    if (stateCode) {
      return `Remoto (${stateCode}, Brasil)`;
    }
    return 'Remoto (Brasil)';
  }

  if (cityName && stateCode) {
    return `${cityName}, ${stateCode}`;
  }
  if (cityName) {
    return `${cityName}, Brasil`;
  }
  if (stateCode) {
    return `${stateCode}, Brasil`;
  }

  return 'Brasil';
}

/**
 * Format salary object from Sólides into readable Brazilian Real representation.
 */
export function formatSolidesSalary(salary?: any): string | undefined {
  if (!salary) return undefined;
  if (salary.showRangeToApplicant === false) return undefined;

  const initial = Number(salary.initialRange);
  const final = Number(salary.finalRange);

  const hasInitial = !isNaN(initial) && initial > 0;
  const hasFinal = !isNaN(final) && final > 0;

  if (hasInitial && hasFinal) {
    if (initial === final) {
      return `R$ ${initial.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `R$ ${initial.toLocaleString('pt-BR', { minimumFractionDigits: 0 })} - R$ ${final.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;
  } else if (hasInitial) {
    return `A partir de R$ ${initial.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else if (hasFinal) {
    return `Até R$ ${final.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  return undefined;
}

/**
 * Builds canonical public portal URL for a Sólides vacancy.
 */
export function buildSolidesCanonicalUrl(raw: SolidesRawJob): string {
  if (raw.redirectLink && raw.redirectLink.startsWith('http')) {
    try {
      const parsed = new URL(raw.redirectLink);
      // Ensure hostname has a valid dot followed by domain characters (not ending in dot like 'riepercapital.')
      if (parsed.hostname.includes('.') && !parsed.hostname.endsWith('.')) {
        return raw.redirectLink;
      }
    } catch {
      // Fall through to standard portal URL
    }
  }
  if (raw.id && raw.slug) {
    return `https://vagas.solides.com.br/vaga/${raw.id}/${raw.slug}`;
  }
  if (raw.id) {
    return `https://vagas.solides.com.br/vaga/${raw.id}`;
  }
  return 'https://vagas.solides.com.br';
}

/**
 * Extracts hard skills, benefits and requirements from raw Sólides job.
 */
export function extractSolidesRequirements(raw: SolidesRawJob): string[] {
  const reqs: string[] = [];

  if (Array.isArray(raw.hardSkills)) {
    raw.hardSkills.forEach((skill) => {
      const name = cleanText(typeof skill === 'string' ? skill : skill?.name || '');
      if (name && !reqs.includes(name)) {
        reqs.push(name);
      }
    });
  }

  if (Array.isArray(raw.benefits)) {
    raw.benefits.forEach((benefit) => {
      const name = cleanText(typeof benefit === 'string' ? benefit : benefit?.name || '');
      if (name && !reqs.includes(name)) {
        reqs.push(name);
      }
    });
  }

  const desc = cleanText(raw.description || '');
  if (desc && reqs.length < 5) {
    const lines = desc.split(/[;\n•·-]/).map((l) => l.trim()).filter((l) => l.length > 5 && l.length < 100);
    for (const line of lines) {
      if (
        line.toLowerCase().includes('experiência') ||
        line.toLowerCase().includes('conhecimento') ||
        line.toLowerCase().includes('habilidade') ||
        line.toLowerCase().includes('superior') ||
        line.toLowerCase().includes('formação') ||
        line.toLowerCase().includes('inglês') ||
        line.toLowerCase().includes('domínio') ||
        line.toLowerCase().includes('diferencial')
      ) {
        if (!reqs.includes(line)) {
          reqs.push(line);
        }
        if (reqs.length >= 6) break;
      }
    }
  }

  if (reqs.length === 0) {
    reqs.push('Conhecimentos compatíveis com a função descrita');
  }

  return reqs;
}

/**
 * Normalizes a raw Sólides vacancy into a standard, robust Job model.
 */
export function normalizeSolidesJob(raw: SolidesRawJob): Job {
  const rawId = String(raw.id || '').trim();
  const id = rawId.startsWith('solides-') ? rawId : `solides-${rawId}`;
  const title = cleanText(raw.title || 'Vaga Sólides');
  const company = cleanText(raw.companyName || 'Empresa Contratante');
  const location = formatSolidesLocation(raw.city, raw.state, raw.address, raw.homeOffice, raw.jobType);
  const workplaceType = inferSolidesWorkplaceType(raw.jobType, raw.homeOffice, title, raw.description, location);
  const seniority = inferSolidesSeniority(raw.seniority, title, raw.description);
  const description = cleanText(raw.description || '');
  const requirements = extractSolidesRequirements(raw);
  const url = buildSolidesCanonicalUrl(raw);
  const publishedAt = raw.createdAt || new Date().toISOString();
  const salaryRange = formatSolidesSalary(raw.salary);
  const geoCategory = classifyGeo(location, description);

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
    source: 'solides',
    sources: ['solides'],
    discovery_source: 'solides',
    companyLogo: raw.companyLogo || undefined,
    roleFamily: undefined,
    language: 'pt-BR',
    geoCategory,
    status: 'NEW',
    resumeLanguageOverride: 'pt-BR',
  };
}

/**
 * Fetches public jobs from Sólides via the backend proxy (/api/solides/search).
 */
export function buildSolidesSearchDiagnostics(
  status: SolidesSearchDiagnostics['status'],
  rawJobs: number,
  normalizedCount: number,
  brazilCount: number,
  remoteBrazilCount: number,
  latamCount: number,
  blockedCount: number,
  duplicatesRemoved: number,
  finalSolidesResults: number,
  durationMs: number,
  cacheStatus: 'LIVE' | 'CACHE' = 'LIVE',
  error?: string | null
): SolidesSearchDiagnostics {
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
    finalSolidesResults,
    durationMs,
    cacheStatus,
    adapterVersion: 'SOLIDES-BRAZIL-V1',
    expansionStage: 'BRAZIL-SOURCES-V1',
    error: error || null,
  };
}

/**
 * Client-side fetcher calling the secure backend proxy for Sólides public jobs.
 */
export async function fetchSolidesJobs(options: SolidesFetchOptions = {}): Promise<SolidesFetchResult> {
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
    };

    const response = await fetch('/api/solides/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const durationMs = Math.round(performance.now() - startTime);

    if (!response.ok) {
      let errorMsg = `Sólides Proxy HTTP ${response.status}`;
      try {
        const errJson = await response.json();
        if (errJson.solidesError) errorMsg = errJson.solidesError;
      } catch {}

      const diagnostics = buildSolidesSearchDiagnostics(
        response.status === 429 ? 'RATE_LIMITED' : 'ERROR',
        0, 0, 0, 0, 0, 0, 0, 0,
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
      const errorMsg = data.solidesError || data.error || 'Erro retornado pela Sólides';
      const diagnostics = buildSolidesSearchDiagnostics(
        data.statusCategory || (data.solidesHttpStatus === 429 ? 'RATE_LIMITED' : 'ERROR'),
        0, 0, 0, 0, 0, 0, 0, 0,
        durationMs,
        data.cacheStatus === 'CACHE' ? 'CACHE' : 'LIVE',
        errorMsg
      );
      return {
        ok: false,
        httpStatus: data.solidesHttpStatus || 400,
        jobs: [],
        rawCount: 0,
        diagnostics,
        error: errorMsg,
      };
    }

    const rawItems: SolidesRawJob[] = Array.isArray(data.results) ? data.results : [];
    const cacheStatus: 'LIVE' | 'CACHE' = data.cacheStatus === 'CACHE' ? 'CACHE' : 'LIVE';

    const normalizedJobs = rawItems.map(normalizeSolidesJob);

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

    const status: SolidesSearchDiagnostics['status'] =
      normalizedJobs.length > 0 ? 'ACTIVE' : 'NO_MATCHING_JOBS';

    const diagnostics = buildSolidesSearchDiagnostics(
      status,
      rawItems.length,
      normalizedJobs.length,
      brazilCount,
      remoteBrazilCount,
      latamCount,
      blockedCount,
      0,
      normalizedJobs.length,
      durationMs,
      cacheStatus,
      null
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
    const errorMsg = err.message || 'Erro de conexão ao buscar vagas da Sólides.';

    const diagnostics = buildSolidesSearchDiagnostics(
      'NETWORK_ERROR',
      0, 0, 0, 0, 0, 0, 0, 0,
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
