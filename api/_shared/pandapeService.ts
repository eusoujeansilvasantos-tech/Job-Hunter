import { getActivePandapeTenants, getPandapeTenantByKey, PandapeTenant } from './pandapeTenants.js';

export interface PandapeQueryOptions {
  query?: string;
  location?: string;
  city?: string;
  state?: string;
  workplaceType?: string;
  limit?: number;
  page?: number;
  tenantKey?: string;
  enrichDetails?: boolean;
  maxEnrichConcurrency?: number;
}

export interface PandapeRawJob {
  id: string; // canonical ID format: pandape_{tenantKey}_{rawId}
  rawId: string;
  tenantKey: string;
  tenantName: string;
  title: string;
  company: string;
  location: string;
  workplace: string; // 'Home Office' | 'Híbrido' | 'Presencial'
  contract: string; // 'CLT' | 'PJ' | 'Estágio' | etc.
  salary?: string;
  publishedRaw: string;
  url: string;
  description?: string;
  requirements?: string[];
  responsibilities?: string[];
  benefits?: string[];
  skills?: string[];
  companyLogo?: string;
  positionsCount?: string;
  enrichmentStatus?: 'NOT_REQUESTED' | 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'CACHED';
  isEnriched?: boolean;
}

export interface PandapeTenantDiagnostics {
  tenantKey: string;
  name: string;
  status: 'OK' | 'ERROR' | 'TIMEOUT';
  httpStatus?: number;
  rawCount: number;
  error?: string | null;
  durationMs: number;
}

export interface PandapeDetailEnrichmentDiagnostics {
  detailRequested: number;
  detailSuccess: number;
  detailFailed: number;
  detailCacheHit: number;
  detailCacheMiss: number;
  jsonLdJobPostingCount: number;
  htmlFallbackCount: number;
  descriptionEnriched: number;
  requirementsEnriched: number;
  skillsExtracted: number;
  benefitsEnriched: number;
  avgDetailLatencyMs: number;
  totalEnrichmentLatencyMs: number;
}

export interface PandapeQueryResult {
  ok: boolean;
  success: boolean;
  source: 'PANDAPE';
  error: string | null;
  upstreamStatus: number | null;
  runtimeBackend: string;
  clientEndpoint: string;
  backendHandler: string;
  errorStage: 'REQUEST' | 'BACKEND_PROXY' | 'PANDAPE_API' | 'RESPONSE_PARSE' | null;
  statusCategory: string;
  cacheStatus: 'LIVE' | 'CACHE';
  httpStatus: number;
  pandapeHttpStatus: number | null;
  statusText: string;
  apiUrlSanitized: string;
  query: string;
  location: string;
  limit: number;
  page: number;
  total: number;
  resultsReceived: number;
  tenantsChecked: number;
  tenantsSuccessful: number;
  tenantsFailed: number;
  latencyMs: number;
  pandapeError: string | null;
  tenantDiagnostics: PandapeTenantDiagnostics[];
  enrichment?: PandapeDetailEnrichmentDiagnostics;
  results: PandapeRawJob[];
}

interface PandapeCacheEntry {
  timestamp: number;
  data: PandapeQueryResult;
}

export interface PandapeDetailEnrichmentResult {
  ok: boolean;
  rawId: string;
  tenantKey: string;
  title?: string;
  description?: string;
  requirements?: string[];
  responsibilities?: string[];
  benefits?: string[];
  skills?: string[];
  salaryRange?: string;
  workplace?: string;
  location?: string;
  contract?: string;
  seniority?: string;
  companyLogo?: string;
  jsonLdDetected: boolean;
  htmlFallbackUsed: boolean;
  enrichmentStatus: 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'CACHED';
  durationMs: number;
  source: 'LIVE' | 'CACHE';
  error?: string;
}

// In-memory cache for Pandapé search queries (TTL: 10 minutes)
const pandapeMemoryCache = new Map<string, PandapeCacheEntry>();
const PANDAPE_CACHE_TTL_MS = 10 * 60 * 1000;

// In-memory cache for Pandapé job details (TTL: 45 minutes)
const pandapeDetailCache = new Map<string, { timestamp: number; data: PandapeDetailEnrichmentResult }>();
const PANDAPE_DETAIL_CACHE_TTL_MS = 45 * 60 * 1000;

// Upstream request timeout per tenant (8 seconds)
const TENANT_REQUEST_TIMEOUT_MS = 8000;
// Detail request timeout (6 seconds)
const DETAIL_REQUEST_TIMEOUT_MS = 6000;
// Detail concurrency limit
const MAX_DETAIL_CONCURRENCY = 5;

/**
 * Decodes HTML entities commonly found in Pandapé career pages.
 */
export function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      try {
        return String.fromCharCode(parseInt(hex, 16));
      } catch {
        return '';
      }
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      try {
        return String.fromCharCode(parseInt(dec, 10));
      } catch {
        return '';
      }
    })
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

/**
 * Parses Pandapé vacancy cards from career page or ListVacancies HTML.
 */
export function parsePandapeCardsFromHtml(
  html: string,
  tenant: PandapeTenant
): PandapeRawJob[] {
  const cards: PandapeRawJob[] = [];
  if (!html) return cards;

  const cardRegex = /<a[^>]*class=[\"'][^\"']*card-vacancy[^\"']*[\"'][^>]*href=[\"'](\/Detail\/\d+)[\"'][\s\S]*?<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = cardRegex.exec(html)) !== null) {
    const cardHtml = match[0];
    const detailHref = match[1];
    const rawId = detailHref.replace('/Detail/', '').trim();

    // Title
    const titleMatch =
      cardHtml.match(/<h3[^>]*title=[\"']([^\"']+)[\"']/i) ||
      cardHtml.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
    const title = titleMatch
      ? decodeHtmlEntities(titleMatch[1].replace(/<[^>]+>/g, ''))
      : 'Vaga na ' + tenant.name;

    // Items inside vacancy-detail
    const detailSection = cardHtml.match(
      /<div class=[\"']vacancy-detail[\"']>([\s\S]*?)<\/div>\s*<\/div>\s*<\/a>/i
    );
    const detailInner = detailSection ? detailSection[1] : cardHtml;

    // Extract textual blocks from div.align-middle
    const itemRegex = /<div[^>]*class=[\"'][^\"']*align-middle[^\"']*[\"']>([\s\S]*?)<\/div>/gi;
    let itemMatch: RegExpExecArray | null;
    const items: string[] = [];
    while ((itemMatch = itemRegex.exec(detailInner)) !== null) {
      const text = decodeHtmlEntities(
        itemMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
      );
      if (text) items.push(text);
    }

    // Publication date
    const dateMatch = cardHtml.match(
      /<div[^>]*class=[\"'][^\"']*vacancy-date[^\"']*[\"']>([\s\S]*?)<\/div>/i
    );
    const publishedRaw = dateMatch
      ? decodeHtmlEntities(dateMatch[1].replace(/<[^>]+>/g, '').trim())
      : '';

    // Classify extracted items
    let location = 'Brasil';
    let workplace = 'Presencial';
    let contract = 'CLT';
    let salary = '';
    let positionsCount = '';

    for (const item of items) {
      const lower = item.toLowerCase();
      if (lower.includes('home office') || lower.includes('remoto')) {
        workplace = 'Home Office';
      } else if (lower.includes('híbrido') || lower.includes('hibrido')) {
        workplace = 'Híbrido';
      } else if (lower.includes('presencial')) {
        workplace = 'Presencial';
      } else if (
        lower.includes('clt') ||
        lower.includes('pj') ||
        lower.includes('estágio') ||
        lower.includes('estagio') ||
        lower.includes('temporário') ||
        lower.includes('autônomo') ||
        lower.includes('efetivo') ||
        lower.includes('jovem aprendiz')
      ) {
        contract = item;
      } else if (item.includes('R$') || lower.includes('salário') || lower.includes('a combinar')) {
        salary = item;
      } else if (lower.includes('posição') || lower.includes('posições') || lower.includes('vaga') || lower.includes('vagas')) {
        positionsCount = item;
      } else if (
        !lower.includes('integral') &&
        !lower.includes('parcial') &&
        !lower.includes('noturno') &&
        !lower.includes('turno') &&
        !lower.includes('indiferente')
      ) {
        location = item;
      }
    }

    cards.push({
      id: `pandape_${tenant.key}_${rawId}`,
      rawId,
      tenantKey: tenant.key,
      tenantName: tenant.name,
      title,
      company: tenant.name,
      location,
      workplace,
      contract,
      salary: salary || undefined,
      publishedRaw,
      positionsCount: positionsCount || undefined,
      url: `https://${tenant.subdomain}.pandape.infojobs.com.br/Detail/${rawId}`,
    });
  }

  return cards;
}

/**
 * Fetch a single tenant's public vacancies safely with timeout and error handling.
 */
async function fetchTenantVacancies(
  tenant: PandapeTenant,
  page = 1
): Promise<{
  ok: boolean;
  tenantKey: string;
  name: string;
  status: number;
  jobs: PandapeRawJob[];
  error?: string;
  durationMs: number;
}> {
  const start = Date.now();
  const targetUrl = `https://${tenant.subdomain}.pandape.infojobs.com.br/`;
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), TENANT_REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(targetUrl, {
      signal: abortController.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    clearTimeout(timeoutId);
    const durationMs = Date.now() - start;

    if (!res.ok) {
      return {
        ok: false,
        tenantKey: tenant.key,
        name: tenant.name,
        status: res.status,
        jobs: [],
        error: `HTTP ${res.status} ${res.statusText}`,
        durationMs,
      };
    }

    const html = await res.text();
    const jobs = parsePandapeCardsFromHtml(html, tenant);

    return {
      ok: true,
      tenantKey: tenant.key,
      name: tenant.name,
      status: res.status,
      jobs,
      durationMs,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const durationMs = Date.now() - start;
    const isAbort = err.name === 'AbortError';

    return {
      ok: false,
      tenantKey: tenant.key,
      name: tenant.name,
      status: isAbort ? 504 : 500,
      jobs: [],
      error: isAbort ? 'Timeout (8s)' : (err.message || 'Network error'),
      durationMs,
    };
  }
}

/**
 * Fetch detailed job description and requirements for a specific Pandapé job on demand (JSON-LD first with defensive HTML fallback).
 */
export async function fetchPandapeJobDetail(
  tenantKey: string,
  rawId: string
): Promise<PandapeDetailEnrichmentResult> {
  const start = Date.now();
  const cacheKey = `pandape-detail:${tenantKey}:${rawId}`;
  
  // 1. Memory Cache Check
  const cached = pandapeDetailCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < PANDAPE_DETAIL_CACHE_TTL_MS) {
    return {
      ...cached.data,
      source: 'CACHE',
      durationMs: Date.now() - start,
    };
  }

  const tenant = getPandapeTenantByKey(tenantKey);
  const subdomain = tenant ? tenant.subdomain : tenantKey;
  const detailUrl = `https://${subdomain}.pandape.infojobs.com.br/Detail/${rawId}`;

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), DETAIL_REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(detailUrl, {
      signal: abortController.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      },
    });

    clearTimeout(timeoutId);
    const durationMs = Date.now() - start;

    if (!res.ok) {
      return {
        ok: false,
        rawId,
        tenantKey,
        jsonLdDetected: false,
        htmlFallbackUsed: false,
        enrichmentStatus: 'FAILED',
        durationMs,
        source: 'LIVE',
        error: `HTTP ${res.status} ${res.statusText}`,
      };
    }

    const html = await res.text();
    let jsonLdDetected = false;
    let htmlFallbackUsed = true;

    let title: string | undefined;
    let description: string | undefined;
    const requirements: string[] = [];
    const responsibilities: string[] = [];
    const benefits: string[] = [];
    const skills: string[] = [];
    let salaryRange: string | undefined;
    let workplace: string | undefined;
    let location: string | undefined;
    let contract: string | undefined;
    let seniority: string | undefined;
    let companyLogo: string | undefined;

    // 2. PRIMARY: JSON-LD Extraction
    const jsonLdRegex = /<script type=[\"']application\/ld\+json[\"']>([\s\S]*?)<\/script>/gi;
    let jsonLdMatch: RegExpExecArray | null;
    while ((jsonLdMatch = jsonLdRegex.exec(html)) !== null) {
      try {
        const parsed = JSON.parse(jsonLdMatch[1]);
        let jobPosting = null;
        if (parsed && parsed['@type'] === 'JobPosting') {
          jobPosting = parsed;
        } else if (parsed && Array.isArray(parsed['@graph'])) {
          jobPosting = parsed['@graph'].find((g: any) => g && g['@type'] === 'JobPosting');
        }

        if (jobPosting) {
          jsonLdDetected = true;
          if (jobPosting.title) title = decodeHtmlEntities(String(jobPosting.title).trim());
          if (jobPosting.description) {
            description = decodeHtmlEntities(
              String(jobPosting.description)
                .replace(/<br\s*[\/]?>/gi, '\n')
                .replace(/<\/p>/gi, '\n\n')
                .replace(/<\/li>/gi, '\n')
                .replace(/<[^>]+>/g, '')
                .trim()
            );
          }
          if (jobPosting.employmentType) contract = String(jobPosting.employmentType);
          if (jobPosting.hiringOrganization?.name) tenantKey = String(jobPosting.hiringOrganization.name);
          if (jobPosting.hiringOrganization?.logo) companyLogo = String(jobPosting.hiringOrganization.logo);
          if (jobPosting.jobLocationType === 'TELECOMMUTE') workplace = 'Home Office';
          if (jobPosting.baseSalary?.value?.value) {
            salaryRange = `R$ ${jobPosting.baseSalary.value.value}`;
          }
          if (Array.isArray(jobPosting.skills)) {
            jobPosting.skills.forEach((s: any) => {
              const str = String(s).trim();
              if (str && !skills.includes(str)) skills.push(str);
            });
          }
          if (Array.isArray(jobPosting.responsibilities)) {
            jobPosting.responsibilities.forEach((r: any) => {
              const str = String(r).trim();
              if (str && !responsibilities.includes(str)) responsibilities.push(str);
            });
          }
          if (Array.isArray(jobPosting.qualifications)) {
            jobPosting.qualifications.forEach((q: any) => {
              const str = String(q).trim();
              if (str && !requirements.includes(str)) requirements.push(str);
            });
          }
        }
      } catch {}
    }

    // 3. DEFENSIVE HTML FALLBACK: Parse Meta & Micro-Tags
    // Title from H1 if missing
    if (!title) {
      const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
      if (h1Match) {
        title = decodeHtmlEntities(h1Match[1].replace(/<[^>]+>/g, '').trim());
      }
    }

    // Company logo from OpenGraph / Twitter meta
    if (!companyLogo) {
      const ogImgMatch = html.match(/<meta[^>]*property=[\"']og:image[\"'][^>]*content=[\"']([^\"']+)[\"']/i) ||
                          html.match(/<meta[^>]*name=[\"']twitter:image[\"'][^>]*content=[\"']([^\"']+)[\"']/i);
      if (ogImgMatch && ogImgMatch[1] && !ogImgMatch[1].includes('default') && !ogImgMatch[1].includes('placeholder')) {
        companyLogo = ogImgMatch[1].trim();
      }
    }

    // Custom tags inside #detail
    const customTags: string[] = [];
    const tagRegex = /<div[^>]*class=[\"'][^\"']*custom-tag[^\"']*[\"'][\s\S]*?<span[^>]*class=[\"'][^\"']*js_tagText[^\"']*[\"'][^>]*>([\s\S]*?)<\/span>/gi;
    let tagMatch: RegExpExecArray | null;
    while ((tagMatch = tagRegex.exec(html)) !== null) {
      const cleanTag = decodeHtmlEntities(tagMatch[1].replace(/<[^>]+>/g, '').trim());
      if (cleanTag && !customTags.includes(cleanTag)) {
        customTags.push(cleanTag);
      }
    }

    // Categorize tags
    for (const tag of customTags) {
      const lower = tag.toLowerCase();
      if (lower.includes('home office') || lower.includes('remoto')) {
        workplace = 'Home Office';
      } else if (lower.includes('híbrido') || lower.includes('hibrido')) {
        workplace = 'Híbrido';
      } else if (lower.includes('presencial')) {
        workplace = 'Presencial';
      } else if (tag.includes('R$') || lower.includes('salário') || lower.includes('a combinar')) {
        salaryRange = tag;
      } else if (
        lower.includes('efetivo') ||
        lower.includes('clt') ||
        lower.includes('pj') ||
        lower.includes('estágio') ||
        lower.includes('temporário') ||
        lower.includes('autônomo') ||
        lower.includes('jovem aprendiz')
      ) {
        contract = tag;
      } else if (
        lower.includes('analista') ||
        lower.includes('especialista') ||
        lower.includes('sênior') ||
        lower.includes('pleno') ||
        lower.includes('júnior') ||
        lower.includes('auxiliar') ||
        lower.includes('assistente') ||
        lower.includes('estagiário') ||
        lower.includes('líder') ||
        lower.includes('coordenador') ||
        lower.includes('gerente')
      ) {
        seniority = tag;
      } else if (
        lower.includes('vr') ||
        lower.includes('va') ||
        lower.includes('vale') ||
        lower.includes('saúde') ||
        lower.includes('odontológico') ||
        lower.includes('seguro de vida') ||
        lower.includes('gympass') ||
        lower.includes('auxílio') ||
        lower.includes('participação nos lucros') ||
        lower.includes('plr')
      ) {
        if (!benefits.includes(tag)) benefits.push(tag);
      } else if (
        !lower.includes('posição') &&
        !lower.includes('posições') &&
        !lower.includes('integral') &&
        !lower.includes('parcial') &&
        !lower.includes('noturno') &&
        !lower.includes('ensino') &&
        !lower.includes('superior') &&
        !lower.includes('médio') &&
        !lower.includes('técnico') &&
        !lower.includes('brasil') &&
        !lower.includes(' - ') &&
        !lower.includes('/') // avoid date tags like 31/ago/2026
      ) {
        if (!skills.includes(tag)) skills.push(tag);
      } else if (lower.includes('brasil') || lower.includes(' - ')) {
        location = tag;
      }
    }

    // 4. Description section parsing (#description)
    const descStart = html.indexOf('id="description"');
    if (descStart !== -1) {
      const descEnd = html.indexOf('</main>', descStart);
      const descChunk = html.substring(descStart, descEnd !== -1 ? descEnd : descStart + 12000);

      // Clean formatted full description
      const parsedFullDescription = decodeHtmlEntities(
        descChunk
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<br\s*[\/]?>/gi, '\n')
          .replace(/<\/p>/gi, '\n\n')
          .replace(/<\/li>/gi, '\n')
          .replace(/<[^>]+>/g, '')
          .replace(/\n{3,}/g, '\n\n')
          .trim()
      );

      if (!description || parsedFullDescription.length > description.length) {
        description = parsedFullDescription;
      }

      // Split into sections: Atividades / Requisitos / Diferencial / Benefícios
      // Find list items or lines
      const liMatches = descChunk.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
      
      // Let's identify the section context for each <li> or paragraph
      const sectionRegex = /(<p[^>]*>|<h[2-4][^>]*>|<strong>)([\s\S]*?)(<\/p>|<\/h[2-4]>|<\/strong>)([\s\S]*?)(?=(?:<p[^>]*>|<h[2-4][^>]*>|<strong>|$))/gi;
      let secMatch: RegExpExecArray | null;
      
      while ((secMatch = sectionRegex.exec(descChunk)) !== null) {
        const headerText = decodeHtmlEntities(secMatch[2].replace(/<[^>]+>/g, '').toLowerCase().trim());
        const bodyContent = secMatch[4];
        const innerLis = (bodyContent.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || []).map(li =>
          decodeHtmlEntities(li.replace(/<[^>]+>/g, '').trim())
        ).filter(t => t.length > 3);

        const isResp = headerText.includes('atividades') || headerText.includes('responsabilidades') || headerText.includes('o que você vai fazer');
        const isReq = headerText.includes('requisitos') || headerText.includes('necessário') || headerText.includes('o que esperamos') || headerText.includes('qualificações') || headerText.includes('perfil');
        const isDiff = headerText.includes('diferencial') || headerText.includes('desejável') || headerText.includes('pontos extras');
        const isBen = headerText.includes('benefícios') || headerText.includes('o que oferecemos') || headerText.includes('vantagens');

        if (isResp) {
          innerLis.forEach(item => {
            if (!responsibilities.includes(item)) responsibilities.push(item);
          });
        } else if (isReq || isDiff) {
          innerLis.forEach(item => {
            if (!requirements.includes(item)) requirements.push(item);
          });
        } else if (isBen) {
          innerLis.forEach(item => {
            if (!benefits.includes(item)) benefits.push(item);
          });
        }
      }

      // If no structured sections matched, collect general <li> into requirements/responsibilities
      if (requirements.length === 0 && responsibilities.length === 0 && liMatches.length > 0) {
        liMatches.forEach(li => {
          const item = decodeHtmlEntities(li.replace(/<[^>]+>/g, '').trim());
          if (item.length > 5 && !item.toLowerCase().startsWith('política') && !item.toLowerCase().startsWith('aviso')) {
            if (!requirements.includes(item)) requirements.push(item);
          }
        });
      }
    }

    // Determine enrichment quality status
    let enrichmentStatus: 'SUCCESS' | 'PARTIAL' | 'FAILED' = 'PARTIAL';
    const hasRichDescription = !!description && description.length >= 100;
    const hasStructuredItems = requirements.length > 0 || responsibilities.length > 0 || benefits.length > 0;

    if (hasRichDescription || hasStructuredItems) {
      enrichmentStatus = 'SUCCESS';
    } else if (customTags.length > 0 || salaryRange || contract || workplace) {
      enrichmentStatus = 'PARTIAL';
    } else {
      enrichmentStatus = 'FAILED';
    }

    const detailResult: PandapeDetailEnrichmentResult = {
      ok: true,
      rawId,
      tenantKey,
      title,
      description,
      requirements: requirements.length > 0 ? requirements : undefined,
      responsibilities: responsibilities.length > 0 ? responsibilities : undefined,
      benefits: benefits.length > 0 ? benefits : undefined,
      skills: skills.length > 0 ? skills : undefined,
      salaryRange,
      workplace,
      location,
      contract,
      seniority,
      companyLogo,
      jsonLdDetected,
      htmlFallbackUsed,
      enrichmentStatus,
      durationMs,
      source: 'LIVE',
    };

    // Cache valid result
    try {
      pandapeDetailCache.set(cacheKey, {
        timestamp: Date.now(),
        data: detailResult,
      });
    } catch {}

    return detailResult;
  } catch (err: any) {
    clearTimeout(timeoutId);
    const durationMs = Date.now() - start;
    return {
      ok: false,
      rawId,
      tenantKey,
      jsonLdDetected: false,
      htmlFallbackUsed: false,
      enrichmentStatus: 'FAILED',
      durationMs,
      source: 'LIVE',
      error: err.name === 'AbortError' ? 'Timeout (6s)' : (err.message || 'Failed to fetch detail'),
    };
  }
}

/**
 * Concurrency runner to execute promises in controlled batches.
 */
async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit);
    const batchResults = await Promise.all(batch.map((item) => fn(item)));
    results.push(...batchResults);
  }
  return results;
}

/**
 * Enriches a batch of Pandapé raw jobs with detailed description, requirements, responsibilities,
 * skills, benefits, and workplace/salary refinements under strict concurrency control (MAX 5).
 */
export async function enrichPandapeJobsBatch(
  jobs: PandapeRawJob[],
  maxConcurrency = MAX_DETAIL_CONCURRENCY
): Promise<{
  enrichedJobs: PandapeRawJob[];
  diagnostics: PandapeDetailEnrichmentDiagnostics;
}> {
  const t0 = Date.now();
  let detailRequested = jobs.length;
  let detailSuccess = 0;
  let detailFailed = 0;
  let detailCacheHit = 0;
  let detailCacheMiss = 0;
  let jsonLdJobPostingCount = 0;
  let htmlFallbackCount = 0;
  let descriptionEnriched = 0;
  let requirementsEnriched = 0;
  let skillsExtracted = 0;
  let benefitsEnriched = 0;
  let totalLatencySum = 0;

  const enrichedJobs: PandapeRawJob[] = [];

  const detailResults = await runWithConcurrency(jobs, maxConcurrency, async (job) => {
    const detail = await fetchPandapeJobDetail(job.tenantKey, job.rawId);
    return { job, detail };
  });

  for (const { job, detail } of detailResults) {
    totalLatencySum += detail.durationMs;

    if (detail.source === 'CACHE') {
      detailCacheHit++;
    } else {
      detailCacheMiss++;
    }

    if (detail.jsonLdDetected) {
      jsonLdJobPostingCount++;
    }
    if (detail.htmlFallbackUsed) {
      htmlFallbackCount++;
    }

    if (detail.ok && (detail.enrichmentStatus === 'SUCCESS' || detail.enrichmentStatus === 'PARTIAL')) {
      detailSuccess++;

      const updatedJob: PandapeRawJob = {
        ...job,
        enrichmentStatus: detail.enrichmentStatus,
        isEnriched: true,
      };

      // MERGE RULES: Never overwrite valid discovery data with null/undefined/empty
      if (detail.description && detail.description.length > (job.description?.length || 0)) {
        updatedJob.description = detail.description;
        descriptionEnriched++;
      }

      if (detail.requirements && detail.requirements.length > 0) {
        const mergedReqs = Array.from(new Set([...(job.requirements || []), ...detail.requirements]));
        updatedJob.requirements = mergedReqs;
        requirementsEnriched++;
      }

      if (detail.responsibilities && detail.responsibilities.length > 0) {
        updatedJob.responsibilities = detail.responsibilities;
      }

      if (detail.benefits && detail.benefits.length > 0) {
        updatedJob.benefits = detail.benefits;
        benefitsEnriched++;
      }

      if (detail.skills && detail.skills.length > 0) {
        updatedJob.skills = detail.skills;
        skillsExtracted += detail.skills.length;
      }

      if (detail.salaryRange && !job.salary) {
        updatedJob.salary = detail.salaryRange;
      }

      if (detail.workplace) {
        updatedJob.workplace = detail.workplace;
      }

      if (detail.companyLogo && !job.companyLogo) {
        updatedJob.companyLogo = detail.companyLogo;
      }

      enrichedJobs.push(updatedJob);
    } else {
      detailFailed++;
      // A failure in detail must NEVER remove the job from discovery!
      enrichedJobs.push({
        ...job,
        enrichmentStatus: 'FAILED',
        isEnriched: false,
      });
    }
  }

  const totalEnrichmentLatencyMs = Date.now() - t0;
  const avgDetailLatencyMs = detailRequested > 0 ? Math.round(totalLatencySum / detailRequested) : 0;

  return {
    enrichedJobs,
    diagnostics: {
      detailRequested,
      detailSuccess,
      detailFailed,
      detailCacheHit,
      detailCacheMiss,
      jsonLdJobPostingCount,
      htmlFallbackCount,
      descriptionEnriched,
      requirementsEnriched,
      skillsExtracted,
      benefitsEnriched,
      avgDetailLatencyMs,
      totalEnrichmentLatencyMs,
    },
  };
}

/**
 * Main Pandapé search orchestrator across corporate tenants with concurrency control,
 * caching, filtering, Detail Enrichment, and full diagnostics.
 */
export async function queryPandape(options: PandapeQueryOptions): Promise<PandapeQueryResult> {
  const startTime = Date.now();
  const cleanQuery = (options.query || '').trim().toLowerCase();
  const cleanLocation = (options.location || options.city || '').trim().toLowerCase();
  const requestedLimit = Math.min(150, Math.max(1, Number(options.limit || 50)));
  const clientPage = Math.max(1, Number(options.page || 1));
  const specificTenantKey = (options.tenantKey || '').trim().toLowerCase();
  const shouldEnrich = options.enrichDetails !== false; // Default: true

  const clientEndpoint = '/api/pandape/search';
  const backendHandler = 'pandapeService:queryPandape (VERCEL-API-V2)';
  const runtimeBackend = 'PANDAPE-BACKEND-V1';

  console.log(
    `[VERCEL-PANDAPE] Querying Pandapé: query='${cleanQuery}' location='${cleanLocation}' limit=${requestedLimit} page=${clientPage} enrich=${shouldEnrich}`
  );

  // Cache check
  const cacheKey = `${cleanQuery}|${cleanLocation}|${options.workplaceType || ''}|${specificTenantKey}|${requestedLimit}|${clientPage}|${shouldEnrich}`;
  const cached = pandapeMemoryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < PANDAPE_CACHE_TTL_MS) {
    const latencyMs = Date.now() - startTime;
    console.log(`[VERCEL-PANDAPE] Returning cached response (${cached.data.resultsReceived} jobs)`);
    return {
      ...cached.data,
      cacheStatus: 'CACHE',
      latencyMs,
    };
  }

  // Select target tenants
  let targetTenants = getActivePandapeTenants();
  if (specificTenantKey) {
    const matched = getPandapeTenantByKey(specificTenantKey);
    if (matched) {
      targetTenants = [matched];
    }
  }

  // Execute tenant fetches with controlled concurrency (e.g. batches of 6) to isolate failures
  const tenantResults = await runWithConcurrency(targetTenants, 6, (tenant) =>
    fetchTenantVacancies(tenant, clientPage)
  );

  let totalRawJobs = 0;
  let successfulTenants = 0;
  let failedTenants = 0;
  const tenantDiagnostics: PandapeTenantDiagnostics[] = [];
  let allCollectedJobs: PandapeRawJob[] = [];

  for (const tr of tenantResults) {
    if (tr.ok) {
      successfulTenants++;
      totalRawJobs += tr.jobs.length;
      allCollectedJobs.push(...tr.jobs);
      tenantDiagnostics.push({
        tenantKey: tr.tenantKey,
        name: tr.name,
        status: 'OK',
        httpStatus: tr.status,
        rawCount: tr.jobs.length,
        durationMs: tr.durationMs,
      });
    } else {
      failedTenants++;
      tenantDiagnostics.push({
        tenantKey: tr.tenantKey,
        name: tr.name,
        status: tr.status === 504 ? 'TIMEOUT' : 'ERROR',
        httpStatus: tr.status,
        rawCount: 0,
        error: tr.error,
        durationMs: tr.durationMs,
      });
    }
  }

  // Apply keyword and location filtering if query was provided
  let filteredJobs = allCollectedJobs;
  if (cleanQuery) {
    filteredJobs = filteredJobs.filter((job) => {
      const titleMatch = job.title.toLowerCase().includes(cleanQuery);
      const companyMatch = job.company.toLowerCase().includes(cleanQuery);
      const contractMatch = job.contract.toLowerCase().includes(cleanQuery);
      return titleMatch || companyMatch || contractMatch;
    });
  }

  if (cleanLocation) {
    filteredJobs = filteredJobs.filter((job) => {
      const locMatch = job.location.toLowerCase().includes(cleanLocation);
      const wpMatch = job.workplace.toLowerCase().includes(cleanLocation);
      return locMatch || wpMatch;
    });
  }

  if (options.workplaceType) {
    const wp = options.workplaceType.toLowerCase();
    filteredJobs = filteredJobs.filter((job) => {
      if (wp.includes('remoto') || wp.includes('remote')) {
        return job.workplace === 'Home Office';
      }
      if (wp.includes('hibrido') || wp.includes('híbrido') || wp.includes('hybrid')) {
        return job.workplace === 'Híbrido';
      }
      if (wp.includes('presencial') || wp.includes('onsite')) {
        return job.workplace === 'Presencial';
      }
      return true;
    });
  }

  // Slice to limit for enrichment to ensure maximum responsiveness
  const candidateJobs = filteredJobs.slice(0, requestedLimit);

  // Execute Detail Enrichment for candidate jobs if enabled
  let finalResults: PandapeRawJob[] = candidateJobs;
  let enrichmentDiagnostics: PandapeDetailEnrichmentDiagnostics | undefined;

  if (shouldEnrich && candidateJobs.length > 0) {
    // Enrich top candidate vacancies in parallel batches of 5
    const enrichOutcome = await enrichPandapeJobsBatch(
      candidateJobs,
      options.maxEnrichConcurrency || MAX_DETAIL_CONCURRENCY
    );
    finalResults = enrichOutcome.enrichedJobs;
    enrichmentDiagnostics = enrichOutcome.diagnostics;
  }

  const latencyMs = Date.now() - startTime;

  let statusCategory = 'SUCCESS_WITH_RESULTS';
  if (finalResults.length === 0) {
    statusCategory = totalRawJobs === 0 && failedTenants > 0 ? 'SOURCE_UNAVAILABLE' : 'NO_MATCHING_JOBS';
  }

  const resultPayload: PandapeQueryResult = {
    ok: true,
    success: true,
    source: 'PANDAPE',
    error: null,
    upstreamStatus: 200,
    runtimeBackend,
    clientEndpoint,
    backendHandler,
    errorStage: null,
    statusCategory,
    cacheStatus: 'LIVE',
    httpStatus: 200,
    pandapeHttpStatus: 200,
    statusText: 'OK',
    apiUrlSanitized: 'https://*.pandape.infojobs.com.br/',
    query: cleanQuery || '—',
    location: cleanLocation || '—',
    limit: requestedLimit,
    page: clientPage,
    total: filteredJobs.length,
    resultsReceived: finalResults.length,
    tenantsChecked: targetTenants.length,
    tenantsSuccessful: successfulTenants,
    tenantsFailed: failedTenants,
    latencyMs,
    pandapeError: null,
    tenantDiagnostics,
    enrichment: enrichmentDiagnostics,
    results: finalResults,
  };

  // Cache successful result
  try {
    pandapeMemoryCache.set(cacheKey, {
      timestamp: Date.now(),
      data: resultPayload,
    });
  } catch {}

  return resultPayload;
}
