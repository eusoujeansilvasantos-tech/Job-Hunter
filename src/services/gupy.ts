import { Job, SeniorityLevel, WorkplaceType, GupyRawJob, GupySearchDiagnostics } from '../types';
import { classifyGeo } from './geoClassifier';

export interface GupyFetchOptions {
  query?: string;
  location?: string;
  city?: string;
  state?: string;
  workplaceType?: string;
  limit?: number;
  offset?: number;
  page?: number;
}

export interface GupyFetchResult {
  ok: boolean;
  httpStatus: number;
  jobs: Job[];
  rawCount: number;
  diagnostics: GupySearchDiagnostics;
  error?: string;
}

/**
 * Clean text from HTML artifacts and extra spacing.
 */
function cleanText(text: string): string {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Infer WorkplaceType using Gupy structured fields with text fallback.
 */
export function inferGupyWorkplaceType(
  rawWorkplace?: string,
  isRemote?: boolean,
  title?: string,
  description?: string,
  location?: string
): WorkplaceType {
  const wp = (rawWorkplace || '').toLowerCase().trim();

  if (wp === 'remote' || wp === 'remoto' || isRemote === true) {
    return 'Remoto';
  }
  if (wp === 'hybrid' || wp === 'hibrido' || wp === 'híbrido') {
    return 'Híbrido';
  }
  if (wp === 'on-site' || wp === 'onsite' || wp === 'presencial') {
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
 * Infer SeniorityLevel from vacancy type, title, and description.
 */
export function inferGupySeniority(
  rawType?: string,
  title?: string,
  description?: string
): SeniorityLevel {
  const typeLower = (rawType || '').toLowerCase();
  if (
    typeLower.includes('internship') ||
    typeLower.includes('estagio') ||
    typeLower.includes('estágio')
  ) {
    return 'Estágio';
  }
  if (typeLower.includes('apprentice') || typeLower.includes('aprendiz')) {
    return 'Estágio';
  }

  const combined = `${title || ''} ${description || ''}`.toLowerCase();
  if (combined.includes('estágio') || combined.includes('estagio') || combined.includes('estagiário') || combined.includes('estagiario') || combined.includes('intern')) {
    return 'Estágio';
  }
  if (combined.includes('junior') || combined.includes('júnior') || combined.includes('jr')) {
    return 'Júnior';
  }
  if (
    combined.includes('lead') ||
    combined.includes('lider') ||
    combined.includes('líder') ||
    combined.includes('gerente') ||
    combined.includes('head') ||
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
  if (combined.includes('senior') || combined.includes('sênior') || combined.includes('sr')) {
    return 'Sênior';
  }
  return 'Pleno';
}

/**
 * Format Gupy location into clean, human-readable Brazilian standard.
 */
export function formatGupyLocation(
  city?: string,
  state?: string,
  country?: string,
  isRemote?: boolean,
  workplaceType?: string
): string {
  const cleanCity = cleanText(city || '');
  const cleanState = cleanText(state || '');
  const cleanCountry = cleanText(country || 'Brasil');

  if (workplaceType === 'remote' || isRemote === true) {
    if (cleanCity && cleanState) {
      return `${cleanCity}, ${cleanState} (Remoto)`;
    }
    if (cleanState) {
      return `${cleanState} (Remoto)`;
    }
    return 'Remoto / Brasil';
  }

  const parts = [cleanCity, cleanState, cleanCountry].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(', ');
  }
  return 'Brasil';
}

/**
 * Extract key requirements from structured skills and text description.
 */
export function extractGupyRequirements(
  title: string,
  description: string,
  skills?: string[]
): string[] {
  const reqs = new Set<string>();

  // Add explicit skills if provided by Gupy
  if (Array.isArray(skills)) {
    for (const skill of skills) {
      const clean = cleanText(skill);
      if (clean && clean.length > 1) {
        reqs.add(clean);
      }
    }
  }

  // Common keywords scanner
  const commonTech = [
    'Customer Success', 'CSM', 'Onboarding', 'SaaS', 'SQL', 'Power BI', 'Excel',
    'Churn', 'NPS', 'HubSpot', 'Salesforce', 'Zendesk', 'Gainsight', 'CRM',
    'Python', 'React', 'Node.js', 'PostgreSQL', 'API', 'Análise de Dados',
    'Inglês Fluente', 'Espanhol', 'Gestão de Contas', 'Retenção', 'Atendimento B2B',
    'Inside Sales', 'Suporte Técnico', 'CSAT', 'Jira', 'Metodologias Ágeis'
  ];

  const combined = `${title} ${description}`.toLowerCase();
  for (const tech of commonTech) {
    if (combined.includes(tech.toLowerCase())) {
      reqs.add(tech);
    }
  }

  if (reqs.size === 0) {
    reqs.add('Customer Success / Atendimento');
    reqs.add('Comunicação & Relacionamento B2B');
  }

  return Array.from(reqs).slice(0, 8);
}

/**
 * Normalizes a raw Gupy job into the application's canonical Job model.
 */
export function normalizeGupyJob(raw: GupyRawJob): Job {
  const title = cleanText(raw.name || 'Vaga Sem Título');
  const company = cleanText(raw.careerPageName || 'Empresa na Gupy');
  const description = cleanText(raw.description || 'Descrição detalhada disponível na página oficial de candidatura da Gupy.');
  const location = formatGupyLocation(raw.city, raw.state, raw.country, raw.isRemoteWork, raw.workplaceType);
  const workplaceType = inferGupyWorkplaceType(raw.workplaceType, raw.isRemoteWork, title, description, location);
  const seniority = inferGupySeniority(raw.type, title, description);
  const requirements = extractGupyRequirements(title, description, raw.skills);

  let pubDateStr = new Date().toISOString().split('T')[0];
  if (raw.publishedDate) {
    try {
      const d = new Date(raw.publishedDate);
      if (!isNaN(d.getTime())) {
        pubDateStr = d.toISOString().split('T')[0];
      }
    } catch {
      // fallback to today
    }
  }

  // Official public candidate application page URL
  const jobUrl = raw.jobUrl || raw.careerPageUrl || `https://portal.gupy.io/job-search/term=${encodeURIComponent(title)}`;
  const geoCategory = classifyGeo(location, description);

  return {
    id: `gupy-${raw.id}`,
    title,
    company,
    location,
    workplaceType,
    seniority,
    description,
    requirements,
    url: jobUrl,
    publishedAt: pubDateStr,
    source: 'gupy',
    sources: ['gupy'],
    discovery_source: 'gupy',
    companyLogo: raw.careerPageLogo,
    geoCategory,
  };
}

/**
 * Fetches jobs from the Gupy source via backend proxy (or direct fallback).
 */
export async function fetchGupyJobs(options: GupyFetchOptions = {}): Promise<GupyFetchResult> {
  const startTime = Date.now();
  const query = options.query?.trim() || '';
  const limit = options.limit || 50;
  const offset = options.offset || 0;

  try {
    const response = await fetch('/api/gupy/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query,
        location: options.location,
        city: options.city,
        state: options.state,
        workplaceType: options.workplaceType,
        limit,
        offset,
      }),
    });

    const data = await response.json();
    const durationMs = Date.now() - startTime;

    if (!response.ok || !data.ok) {
      const isNoMatching = data.statusCategory === 'NO_MATCHING_JOBS';
      const status = isNoMatching
        ? 'NO_MATCHING_JOBS'
        : data.statusCategory === 'RATE_LIMITED'
        ? 'RATE_LIMITED'
        : 'ERROR';

      return {
        ok: isNoMatching,
        httpStatus: response.status || 200,
        jobs: [],
        rawCount: 0,
        diagnostics: {
          status,
          publicDiscovery: 'AVAILABLE',
          requests: 1,
          rawJobs: 0,
          normalizedCount: 0,
          brazilCount: 0,
          remoteBrazilCount: 0,
          latamCount: 0,
          blockedCount: 0,
          duplicatesRemoved: 0,
          finalGupyResults: 0,
          durationMs,
          cacheStatus: data.cacheStatus || 'LIVE',
          adapterVersion: 'GUPY-BRAZIL-V1',
          expansionStage: 'BRAZIL-SOURCES-V1',
          error: data.gupyError || 'Erro ao consultar a Gupy',
        },
        error: data.gupyError,
      };
    }

    const rawList: GupyRawJob[] = Array.isArray(data.results) ? data.results : [];
    const normalizedJobs: Job[] = rawList.map(normalizeGupyJob);

    // Compute geographic stats
    let brazilCount = 0;
    let remoteBrazilCount = 0;
    let latamCount = 0;
    let blockedCount = 0;

    for (const j of normalizedJobs) {
      if (j.geoCategory === 'BRAZIL') {
        brazilCount++;
      } else if (j.geoCategory === 'REMOTE_BRAZIL') {
        remoteBrazilCount++;
        brazilCount++;
      } else if (j.geoCategory === 'LATAM_COMPATIBLE') {
        latamCount++;
      } else if (j.geoCategory === 'INTERNATIONAL_UNKNOWN') {
        // eligible international unknown
      } else {
        blockedCount++;
      }
    }

    return {
      ok: true,
      httpStatus: 200,
      jobs: normalizedJobs,
      rawCount: rawList.length,
      diagnostics: {
        status: normalizedJobs.length > 0 ? 'ACTIVE' : 'NO_MATCHING_JOBS',
        publicDiscovery: 'AVAILABLE',
        requests: 1,
        rawJobs: rawList.length,
        normalizedCount: normalizedJobs.length,
        brazilCount,
        remoteBrazilCount,
        latamCount,
        blockedCount,
        duplicatesRemoved: 0,
        finalGupyResults: normalizedJobs.length,
        durationMs,
        cacheStatus: data.cacheStatus || 'LIVE',
        adapterVersion: 'GUPY-BRAZIL-V1',
        expansionStage: 'BRAZIL-SOURCES-V1',
        error: null,
      },
    };
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    return {
      ok: false,
      httpStatus: 500,
      jobs: [],
      rawCount: 0,
      diagnostics: {
        status: 'NETWORK_ERROR',
        publicDiscovery: 'UNAVAILABLE',
        requests: 1,
        rawJobs: 0,
        normalizedCount: 0,
        brazilCount: 0,
        remoteBrazilCount: 0,
        latamCount: 0,
        blockedCount: 0,
        duplicatesRemoved: 0,
        finalGupyResults: 0,
        durationMs,
        cacheStatus: 'LIVE',
        adapterVersion: 'GUPY-BRAZIL-V1',
        expansionStage: 'BRAZIL-SOURCES-V1',
        error: err.message || 'Exceção de rede ao conectar com o serviço Gupy',
      },
      error: err.message,
    };
  }
}
