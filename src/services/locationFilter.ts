import { Job } from '../types';
import { classifyGeo, GeoCategory } from './geoClassifier';

export interface LocationFilterMetrics {
  locationFilterRuntime?: string;
  searchLocation: string;
  sourceBefore: {
    adzuna: number;
    greenhouse: number;
    other: number;
    total: number;
  };
  matchedLocal: {
    adzuna: number;
    greenhouse: number;
    other: number;
    total: number;
  };
  remoteBrazil: {
    adzuna: number;
    greenhouse: number;
    other: number;
    total: number;
  };
  latamRemote: {
    adzuna: number;
    greenhouse: number;
    other: number;
    total: number;
  };
  rejectedByLocation: {
    adzuna: number;
    greenhouse: number;
    other: number;
    total: number;
  };
  totalAfter: number;
}

/**
 * Brazilian states mapping for intelligent state and city matching.
 */
export const BRAZIL_STATE_MAP: Record<string, { name: string; normalizedName: string }> = {
  ac: { name: 'Acre', normalizedName: 'acre' },
  al: { name: 'Alagoas', normalizedName: 'alagoas' },
  ap: { name: 'Amapá', normalizedName: 'amapa' },
  am: { name: 'Amazonas', normalizedName: 'amazonas' },
  ba: { name: 'Bahia', normalizedName: 'bahia' },
  ce: { name: 'Ceará', normalizedName: 'ceara' },
  df: { name: 'Distrito Federal', normalizedName: 'distrito federal' },
  es: { name: 'Espírito Santo', normalizedName: 'espirito santo' },
  go: { name: 'Goiás', normalizedName: 'goias' },
  ma: { name: 'Maranhão', normalizedName: 'maranhao' },
  mt: { name: 'Mato Grosso', normalizedName: 'mato grosso' },
  ms: { name: 'Mato Grosso do Sul', normalizedName: 'mato grosso do sul' },
  mg: { name: 'Minas Gerais', normalizedName: 'minas gerais' },
  pa: { name: 'Pará', normalizedName: 'para' },
  pb: { name: 'Paraíba', normalizedName: 'paraiba' },
  pr: { name: 'Paraná', normalizedName: 'parana' },
  pe: { name: 'Pernambuco', normalizedName: 'pernambuco' },
  pi: { name: 'Piauí', normalizedName: 'piaui' },
  rj: { name: 'Rio de Janeiro', normalizedName: 'rio de janeiro' },
  rn: { name: 'Rio Grande do Norte', normalizedName: 'rio grande do norte' },
  rs: { name: 'Rio Grande do Sul', normalizedName: 'rio grande do sul' },
  ro: { name: 'Rondônia', normalizedName: 'rondonia' },
  rr: { name: 'Roraima', normalizedName: 'roraima' },
  sc: { name: 'Santa Catarina', normalizedName: 'santa catarina' },
  sp: { name: 'São Paulo', normalizedName: 'sao paulo' },
  se: { name: 'Sergipe', normalizedName: 'sergipe' },
  to: { name: 'Tocantins', normalizedName: 'tocantins' },
};

/**
 * Normalizes location string:
 * - lowercase
 * - removes accents/diacritics
 * - strips non-alphanumeric chars
 * - collapses spaces
 */
export function normalizeLocation(raw: string): string {
  if (!raw) return '';
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts meaningful tokens from a location query (e.g. "Ribeirão Preto, SP" -> ["ribeirao", "preto"]).
 * Strips out generic terms like "brasil", "brazil", "remote", "remoto" and isolated state acronyms if city is present.
 */
export function extractLocationTokens(locationStr: string): string[] {
  const norm = normalizeLocation(locationStr);
  if (!norm) return [];

  const rawTokens = norm.split(' ').filter(Boolean);
  const ignoredGeneric = new Set(['brasil', 'brazil', 'remote', 'remoto', 'home', 'office', 'hybrid', 'hibrido']);

  const filtered = rawTokens.filter((t) => !ignoredGeneric.has(t));
  return filtered.length > 0 ? filtered : rawTokens;
}

/**
 * Checks if a job location matches a target search location string.
 */
export function matchesSearchLocation(jobLocation: string, searchLocation: string): boolean {
  if (!searchLocation || !searchLocation.trim()) {
    return true; // No filter applied
  }

  const normSearch = normalizeLocation(searchLocation);
  const normJob = normalizeLocation(jobLocation);

  if (!normSearch) return true;
  if (!normJob) return false;

  // Direct substring match
  if (normJob.includes(normSearch)) {
    return true;
  }

  // Token-based matching: e.g. Search "Ribeirao Preto - SP" vs Job "Ribeirão Preto"
  const searchTokens = extractLocationTokens(searchLocation);
  const jobTokens = extractLocationTokens(jobLocation);

  if (searchTokens.length === 0) return true;

  // If search has multiple tokens (e.g. ["ribeirao", "preto"]), check if primary tokens are present in job
  // Exclude single state 2-letter acronyms from primary tokens if we have longer words
  const primarySearchTokens = searchTokens.filter((t) => t.length > 2 || searchTokens.length === 1);

  if (primarySearchTokens.length > 0) {
    const allPrimaryInJob = primarySearchTokens.every((token) => normJob.includes(token));
    if (allPrimaryInJob) return true;
  }

  // Also check if primary job tokens are inside search (e.g. Job: "Ribeirao Preto", Search: "Ribeirao Preto, SP, Brasil")
  const primaryJobTokens = jobTokens.filter((t) => t.length > 2 || jobTokens.length === 1);
  if (primaryJobTokens.length > 0) {
    const allPrimaryJobInSearch = primaryJobTokens.every((token) => normSearch.includes(token));
    if (allPrimaryJobInSearch) return true;
  }

  // Check state match if search was a state name or code
  const isStateSearch = Object.entries(BRAZIL_STATE_MAP).find(
    ([code, data]) => normSearch === code || normSearch === data.normalizedName
  );

  if (isStateSearch) {
    const [stateCode, stateData] = isStateSearch;
    if (
      normJob.includes(` ${stateCode}`) ||
      normJob.startsWith(`${stateCode} `) ||
      normJob === stateCode ||
      normJob.includes(stateData.normalizedName)
    ) {
      return true;
    }
  }

  return false;
}

export interface FilterJobsResult<T extends Job> {
  filteredJobs: T[];
  metrics: LocationFilterMetrics;
}

/**
 * Applies Geographic Eligibility and Search Location Filter to normalized jobs.
 * 
 * Pipeline Stage:
 * Sources -> Normalization -> GeoClassifier -> Search Location Filter -> Deduplication -> Scoring
 */
export function applySearchLocationFilter<T extends Job>(
  jobs: T[],
  searchLocation: string,
  options: {
    includeUncertainIntl?: boolean;
    countryCode?: string;
  } = {}
): FilterJobsResult<T> {
  const cleanSearchLocation = (searchLocation || '').trim();
  const isSearchActive = cleanSearchLocation.length > 0;

  const metrics: LocationFilterMetrics = {
    locationFilterRuntime: 'LOCATION-FILTER-V2',
    searchLocation: cleanSearchLocation || '(Nenhum - Todas as Regiões)',
    sourceBefore: { adzuna: 0, greenhouse: 0, other: 0, total: 0 },
    matchedLocal: { adzuna: 0, greenhouse: 0, other: 0, total: 0 },
    remoteBrazil: { adzuna: 0, greenhouse: 0, other: 0, total: 0 },
    latamRemote: { adzuna: 0, greenhouse: 0, other: 0, total: 0 },
    rejectedByLocation: { adzuna: 0, greenhouse: 0, other: 0, total: 0 },
    totalAfter: 0,
  };

  const getSourceKey = (source?: string): 'adzuna' | 'greenhouse' | 'other' => {
    if (!source) return 'other';
    const s = source.toLowerCase();
    if (s.includes('adzuna')) return 'adzuna';
    if (s.includes('greenhouse')) return 'greenhouse';
    return 'other';
  };

  const filteredJobs: T[] = [];

  for (const job of jobs) {
    const sourceKey = getSourceKey(job.source);
    metrics.sourceBefore[sourceKey]++;
    metrics.sourceBefore.total++;

    const geo: GeoCategory = job.geoCategory || classifyGeo(job.location, job.description);

    // Rule 1: Never include NOT_COMPATIBLE (e.g. US Only)
    if (geo === 'NOT_COMPATIBLE') {
      metrics.rejectedByLocation[sourceKey]++;
      metrics.rejectedByLocation.total++;
      continue;
    }

    // Rule 2: International Unknown only if explicitly requested
    if (geo === 'INTERNATIONAL_UNKNOWN') {
      if (!options.includeUncertainIntl) {
        metrics.rejectedByLocation[sourceKey]++;
        metrics.rejectedByLocation.total++;
        continue;
      }
      // If included, and location search is active, check location or allow if generic remote
      const isRemote = (job.location + ' ' + job.description).toLowerCase().includes('remote') ||
                       (job.location + ' ' + job.description).toLowerCase().includes('remoto');
      if (isRemote || !isSearchActive || matchesSearchLocation(job.location, cleanSearchLocation)) {
        filteredJobs.push(job);
        metrics.matchedLocal[sourceKey]++;
        metrics.matchedLocal.total++;
      } else {
        metrics.rejectedByLocation[sourceKey]++;
        metrics.rejectedByLocation.total++;
      }
      continue;
    }

    // If no search location is specified, all Brazil / LATAM eligible jobs are included
    if (!isSearchActive) {
      if (geo === 'REMOTE_BRAZIL') {
        metrics.remoteBrazil[sourceKey]++;
        metrics.remoteBrazil.total++;
      } else if (geo === 'LATAM_COMPATIBLE') {
        metrics.latamRemote[sourceKey]++;
        metrics.latamRemote.total++;
      } else {
        metrics.matchedLocal[sourceKey]++;
        metrics.matchedLocal.total++;
      }
      filteredJobs.push(job);
      continue;
    }

    // With active search location:
    // Any Hybrid or On-site job requires physical presence in the stated city
    const isPhysicalPresenceRequired = job.workplaceType === 'Híbrido' || job.workplaceType === 'Presencial';

    if (isPhysicalPresenceRequired) {
      const isMatch = matchesSearchLocation(job.location, cleanSearchLocation);
      if (isMatch) {
        metrics.matchedLocal[sourceKey]++;
        metrics.matchedLocal.total++;
        filteredJobs.push(job);
      } else {
        metrics.rejectedByLocation[sourceKey]++;
        metrics.rejectedByLocation.total++;
      }
      continue;
    }

    // Rule 3: 100% Remote Brazil is ALWAYS INCLUDED (can be done from any searched city)
    if (geo === 'REMOTE_BRAZIL') {
      metrics.remoteBrazil[sourceKey]++;
      metrics.remoteBrazil.total++;
      filteredJobs.push(job);
      continue;
    }

    // Rule 4: LATAM Remote is INCLUDED if classified as LATAM_COMPATIBLE
    if (geo === 'LATAM_COMPATIBLE') {
      metrics.latamRemote[sourceKey]++;
      metrics.latamRemote.total++;
      filteredJobs.push(job);
      continue;
    }

    // Rule 5: BRAZIL general (if remote or matched location)
    if (geo === 'BRAZIL') {
      if (job.workplaceType === 'Remoto') {
        metrics.remoteBrazil[sourceKey]++;
        metrics.remoteBrazil.total++;
        filteredJobs.push(job);
      } else {
        const isMatch = matchesSearchLocation(job.location, cleanSearchLocation);
        if (isMatch) {
          metrics.matchedLocal[sourceKey]++;
          metrics.matchedLocal.total++;
          filteredJobs.push(job);
        } else {
          metrics.rejectedByLocation[sourceKey]++;
          metrics.rejectedByLocation.total++;
        }
      }
      continue;
    }

    // Fallback for any unclassified
    metrics.rejectedByLocation[sourceKey]++;
    metrics.rejectedByLocation.total++;
  }

  metrics.totalAfter = filteredJobs.length;

  return {
    filteredJobs,
    metrics,
  };
}
