export interface SolidesQueryOptions {
  query?: string;
  location?: string;
  city?: string;
  state?: string;
  workplaceType?: string;
  limit?: number;
  page?: number;
}

export interface SolidesQueryResult {
  ok: boolean;
  success: boolean;
  source: 'SOLIDES';
  error: string | null;
  upstreamStatus: number | null;
  runtimeBackend: string;
  clientEndpoint: string;
  backendHandler: string;
  errorStage: 'REQUEST' | 'BACKEND_PROXY' | 'SOLIDES_API' | 'RESPONSE_PARSE' | null;
  statusCategory: string;
  cacheStatus: 'LIVE' | 'CACHE';
  httpStatus: number;
  solidesHttpStatus: number | null;
  statusText: string;
  apiUrlSanitized: string;
  query: string;
  location: string;
  limit: number;
  page: number;
  total: number;
  resultsReceived: number;
  latencyMs: number;
  solidesError: string | null;
  results: any[];
}

interface SolidesCacheEntry {
  timestamp: number;
  data: SolidesQueryResult;
}

// In-memory cache for Solides public search queries (TTL: 10 minutes)
const solidesMemoryCache = new Map<string, SolidesCacheEntry>();
const SOLIDES_CACHE_TTL_MS = 10 * 60 * 1000;

// Maximum take allowed per single upstream request by Sólides API
const SOLIDES_MAX_TAKE_PER_REQUEST = 25;

/**
 * Fetch a single page from Sólides API gateway with proper timeout, headers, and error capture.
 */
async function fetchSolidesUpstreamPage(params: URLSearchParams, timeoutMs = 10000) {
  const solidesApiUrl = `https://apigw.solides.com.br/jobs/v3/vacancies?${params.toString()}`;
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

  console.log(`[VERCEL-SOLIDES] Upstream request to: ${solidesApiUrl}`);

  try {
    const response = await fetch(solidesApiUrl, {
      signal: abortController.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Origin': 'https://vagas.solides.com.br',
        'Referer': 'https://vagas.solides.com.br/',
      },
    });

    clearTimeout(timeoutId);
    console.log(`[VERCEL-SOLIDES] Sólides API response status: ${response.status}`);

    if (!response.ok) {
      const errorBodyText = await response.text().catch(() => '');
      console.error(`[VERCEL-SOLIDES] UPSTREAM STATUS: ${response.status}`);
      console.error(`[VERCEL-SOLIDES] UPSTREAM ERROR BODY: ${errorBodyText}`);

      let parsedError: any = null;
      try {
        parsedError = JSON.parse(errorBodyText);
      } catch {}

      const errorDetail = parsedError?.detail
        ? (Array.isArray(parsedError.detail) ? parsedError.detail.join(', ') : String(parsedError.detail))
        : (parsedError?.title || parsedError?.message || errorBodyText || `HTTP ${response.status}`);

      return {
        ok: false,
        status: response.status,
        statusText: response.statusText,
        errorBody: errorBodyText,
        errorDetail,
        url: solidesApiUrl,
      };
    }

    const rawText = await response.text();
    let parsedData: any = null;
    try {
      parsedData = JSON.parse(rawText);
    } catch (parseErr: any) {
      console.error('[VERCEL-SOLIDES] JSON parse error from Sólides response');
      return {
        ok: false,
        status: response.status,
        statusText: 'Invalid JSON from Sólides',
        errorBody: rawText,
        errorDetail: 'JSON parse error',
        url: solidesApiUrl,
      };
    }

    const rawJobs = Array.isArray(parsedData.data) ? parsedData.data : (Array.isArray(parsedData) ? parsedData : []);
    const total = parsedData.count !== undefined ? Number(parsedData.count) : rawJobs.length;

    return {
      ok: true,
      status: response.status,
      statusText: response.statusText,
      total,
      jobs: rawJobs,
      url: solidesApiUrl,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const isAbort = err.name === 'AbortError';
    console.error('[VERCEL-SOLIDES] Exception querying Sólides upstream:', err);
    return {
      ok: false,
      status: isAbort ? 504 : 500,
      statusText: isAbort ? 'Gateway Timeout' : 'Network Exception',
      errorBody: err.message || '',
      errorDetail: isAbort ? 'Tempo limite de resposta da Sólides excedido (10s).' : (err.message || 'Erro de rede'),
      url: solidesApiUrl,
      isAbort,
    };
  }
}

/**
 * Helper function to query Solides public search safely with caching, pagination, timeouts, and full diagnostics.
 */
export async function querySolides(options: SolidesQueryOptions): Promise<SolidesQueryResult> {
  const startTime = Date.now();
  const cleanQuery = (options.query || '').trim();
  const cleanLocation = (options.location || options.city || '').trim();
  const cleanState = (options.state || '').trim();
  const requestedLimit = Math.min(100, Math.max(1, Number(options.limit || 50)));
  const clientPage = Math.max(1, Number(options.page || 1));

  const clientEndpoint = '/api/solides/search';
  const backendHandler = 'solidesService:querySolides (VERCEL-API-V2)';
  const runtimeBackend = 'SOLIDES-BACKEND-V1';

  console.log(`[VERCEL-SOLIDES] Querying Sólides: query='${cleanQuery}' location='${cleanLocation}' limit=${requestedLimit} page=${clientPage}`);

  // Cache key construction
  const cacheKey = `${cleanQuery.toLowerCase()}|${cleanLocation.toLowerCase()}|${cleanState.toLowerCase()}|${options.workplaceType || ''}|${requestedLimit}|${clientPage}`;
  const cached = solidesMemoryCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < SOLIDES_CACHE_TTL_MS) {
    const latencyMs = Date.now() - startTime;
    console.log(`[VERCEL-SOLIDES] Returning cached response (${cached.data.resultsReceived} jobs)`);
    return {
      ...cached.data,
      cacheStatus: 'CACHE',
      latencyMs,
    };
  }

  // Determine pagination requests
  // Sólides API strictly enforces take <= 25.
  // If client requests limit <= 25, we make 1 request with take = limit.
  // If client requests limit > 25 (e.g. 50), we can make 2 parallel requests with take = 25.
  const pagesToFetch: number[] = [];
  if (requestedLimit <= SOLIDES_MAX_TAKE_PER_REQUEST) {
    pagesToFetch.push(clientPage);
  } else {
    // E.g. clientPage 1 -> upstream pages 1 & 2
    // clientPage 2 -> upstream pages 3 & 4
    const basePage = (clientPage - 1) * 2;
    pagesToFetch.push(basePage + 1);
    pagesToFetch.push(basePage + 2);
  }

  // Base parameters builder
  function buildParamsForPage(pageNum: number, takeNum: number): URLSearchParams {
    const p = new URLSearchParams();
    if (cleanQuery) {
      p.append('title', cleanQuery);
    }
    p.append('take', String(Math.min(SOLIDES_MAX_TAKE_PER_REQUEST, Math.max(1, takeNum))));
    p.append('page', String(pageNum));

    if (options.workplaceType) {
      const wp = options.workplaceType.toLowerCase();
      if (wp.includes('remoto') || wp.includes('remote')) {
        p.append('homeOffice', 'true');
      } else if (wp.includes('presencial') || wp.includes('onsite')) {
        p.append('jobType', 'presencial');
      } else if (wp.includes('hibrido') || wp.includes('hybrid')) {
        p.append('jobType', 'hibrido');
      }
    }

    if (cleanState && cleanState.length <= 2 && cleanState.toUpperCase() !== 'BR') {
      p.append('state', cleanState.toUpperCase());
    }

    return p;
  }

  const takeForFirst = Math.min(SOLIDES_MAX_TAKE_PER_REQUEST, requestedLimit);
  const sanitizedUrl = `https://apigw.solides.com.br/jobs/v3/vacancies?${buildParamsForPage(pagesToFetch[0], takeForFirst).toString()}`;

  // Execute requests in parallel
  const pagePromises = pagesToFetch.map((pageNum) =>
    fetchSolidesUpstreamPage(buildParamsForPage(pageNum, SOLIDES_MAX_TAKE_PER_REQUEST))
  );

  const responses = await Promise.all(pagePromises);
  const latencyMs = Date.now() - startTime;

  // Check if first request had error
  const firstRes = responses[0];
  if (!firstRes.ok) {
    let statusCategory = 'SOURCE_UNAVAILABLE';
    let errorCode = 'SOLIDES_UPSTREAM_ERROR';
    let solidesError = firstRes.errorDetail || `Sólides retornou HTTP ${firstRes.status}`;

    if (firstRes.status === 400) {
      statusCategory = 'SOLIDES_UPSTREAM_BAD_REQUEST';
      errorCode = 'SOLIDES_UPSTREAM_BAD_REQUEST';
      solidesError = `Sólides HTTP 400 (Bad Request): ${firstRes.errorDetail || 'Parâmetro inválido na consulta upstream'}`;
    } else if (firstRes.status === 429) {
      statusCategory = 'RATE_LIMITED';
      errorCode = 'SOLIDES_RATE_LIMITED';
      solidesError = 'Limite de requisições excedido na Sólides (429). Tente novamente em alguns instantes.';
    } else if (firstRes.status === 404) {
      statusCategory = 'NO_MATCHING_JOBS';
      errorCode = 'NO_MATCHING_JOBS';
      solidesError = 'Nenhuma vaga encontrada para os critérios informados.';
    }

    return {
      ok: false,
      success: false,
      source: 'SOLIDES',
      error: errorCode,
      upstreamStatus: firstRes.status,
      runtimeBackend,
      clientEndpoint,
      backendHandler,
      errorStage: 'SOLIDES_API',
      statusCategory,
      cacheStatus: 'LIVE',
      httpStatus: firstRes.status === 400 ? 400 : 200,
      solidesHttpStatus: firstRes.status,
      statusText: firstRes.statusText || 'Error',
      apiUrlSanitized: firstRes.url || sanitizedUrl,
      query: cleanQuery || '—',
      location: cleanLocation || '—',
      limit: requestedLimit,
      page: clientPage,
      total: 0,
      resultsReceived: 0,
      latencyMs,
      solidesError,
      results: [],
    };
  }

  // Combine jobs from successful responses
  let combinedJobs: any[] = [];
  let totalCount = firstRes.total || 0;

  for (const r of responses) {
    if (r.ok && Array.isArray(r.jobs)) {
      combinedJobs = combinedJobs.concat(r.jobs);
      if (r.total !== undefined && r.total > totalCount) {
        totalCount = r.total;
      }
    }
  }

  // Trim to requestedLimit
  if (combinedJobs.length > requestedLimit) {
    combinedJobs = combinedJobs.slice(0, requestedLimit);
  }

  let statusCategory = 'SUCCESS_WITH_RESULTS';
  if (combinedJobs.length === 0) {
    statusCategory = 'NO_MATCHING_JOBS';
  }

  console.log(`[VERCEL-SOLIDES] Successfully fetched ${combinedJobs.length} jobs (Total: ${totalCount})`);

  const resultPayload: SolidesQueryResult = {
    ok: true,
    success: true,
    source: 'SOLIDES',
    error: null,
    upstreamStatus: firstRes.status,
    runtimeBackend,
    clientEndpoint,
    backendHandler,
    errorStage: null,
    statusCategory,
    cacheStatus: 'LIVE',
    httpStatus: 200,
    solidesHttpStatus: firstRes.status,
    statusText: firstRes.statusText || 'OK',
    apiUrlSanitized: sanitizedUrl,
    query: cleanQuery || '—',
    location: cleanLocation || '—',
    limit: requestedLimit,
    page: clientPage,
    total: totalCount,
    resultsReceived: combinedJobs.length,
    latencyMs,
    solidesError: null,
    results: combinedJobs,
  };

  // Store in memory cache
  try {
    solidesMemoryCache.set(cacheKey, {
      timestamp: Date.now(),
      data: resultPayload,
    });
  } catch {}

  return resultPayload;
}

