export interface GupyQueryOptions {
  query?: string;
  jobName?: string;
  location?: string;
  city?: string;
  state?: string;
  workplaceType?: string;
  limit?: number;
  offset?: number;
  page?: number;
}

export interface GupyQueryResult {
  ok: boolean;
  runtimeBackend: string;
  clientEndpoint: string;
  backendHandler: string;
  errorStage: 'REQUEST' | 'BACKEND_PROXY' | 'GUPY_API' | 'RESPONSE_PARSE' | null;
  statusCategory: string;
  cacheStatus: 'LIVE' | 'CACHE';
  httpStatus: number;
  gupyHttpStatus: number | null;
  statusText: string;
  apiUrlSanitized: string;
  query: string;
  location: string;
  limit: number;
  offset: number;
  total: number;
  resultsReceived: number;
  latencyMs: number;
  gupyError: string | null;
  results: any[];
}

interface GupyCacheEntry {
  timestamp: number;
  data: GupyQueryResult;
}

// In-memory cache for Gupy public search queries (TTL: 10 minutes)
const gupyMemoryCache = new Map<string, GupyCacheEntry>();
const GUPY_CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Helper function to query Gupy public search safely with caching, timeouts, and full diagnostics.
 */
export async function queryGupy(options: GupyQueryOptions): Promise<GupyQueryResult> {
  const startTime = Date.now();
  const cleanQuery = (options.query || options.jobName || '').trim();
  const cleanLocation = (options.location || options.city || '').trim();
  const cleanState = (options.state || '').trim();
  const limit = Math.min(100, Math.max(1, Number(options.limit || 50)));
  const offset = options.offset !== undefined ? Number(options.offset) : (options.page ? (Number(options.page) - 1) * limit : 0);

  const clientEndpoint = '/api/gupy/search';
  const backendHandler = 'gupyService:queryGupy (VERCEL-API-V2)';
  const runtimeBackend = 'GUPY-BACKEND-V1';

  console.log(`[VERCEL-GUPY] Querying Gupy: query='${cleanQuery}' location='${cleanLocation}' limit=${limit} offset=${offset}`);

  // Cache key construction
  const cacheKey = `${cleanQuery.toLowerCase()}|${cleanLocation.toLowerCase()}|${cleanState.toLowerCase()}|${options.workplaceType || ''}|${limit}|${offset}`;
  const cached = gupyMemoryCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < GUPY_CACHE_TTL_MS) {
    const latencyMs = Date.now() - startTime;
    console.log(`[VERCEL-GUPY] Returning cached response (${cached.data.resultsReceived} jobs)`);
    return {
      ...cached.data,
      cacheStatus: 'CACHE',
      latencyMs,
    };
  }

  // Build Gupy API URL
  const gupyParams = new URLSearchParams();
  if (cleanQuery) {
    gupyParams.append('jobName', cleanQuery);
  }
  gupyParams.append('limit', String(limit));
  gupyParams.append('offset', String(offset));

  if (options.workplaceType) {
    gupyParams.append('workplaceType', options.workplaceType);
  }
  if (cleanState) {
    gupyParams.append('state', cleanState);
  }

  const gupyApiUrl = `https://employability-portal.gupy.io/api/v1/jobs?${gupyParams.toString()}`;
  const sanitizedUrl = `https://employability-portal.gupy.io/api/v1/jobs?${gupyParams.toString()}`;

  // 10 second timeout controller
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 10000);

  try {
    console.log(`[VERCEL-GUPY] Upstream request to: ${gupyApiUrl}`);
    const response = await fetch(gupyApiUrl, {
      signal: abortController.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;
    console.log(`[VERCEL-GUPY] Gupy API response status: ${response.status} (latency: ${latencyMs}ms)`);

    if (!response.ok) {
      let statusCategory = 'SOURCE_UNAVAILABLE';
      let gupyError = `Gupy retornou HTTP ${response.status} (${response.statusText})`;
      if (response.status === 429) {
        statusCategory = 'RATE_LIMITED';
        gupyError = 'Limite de requisições excedido na Gupy (429). Tente novamente em alguns instantes.';
      } else if (response.status === 404) {
        statusCategory = 'NO_MATCHING_JOBS';
        gupyError = 'Nenhuma vaga encontrada para os critérios informados.';
      }

      return {
        ok: false,
        runtimeBackend,
        clientEndpoint,
        backendHandler,
        errorStage: 'GUPY_API',
        statusCategory,
        cacheStatus: 'LIVE',
        httpStatus: 200,
        gupyHttpStatus: response.status,
        statusText: response.statusText,
        apiUrlSanitized: sanitizedUrl,
        query: cleanQuery || '—',
        location: cleanLocation || '—',
        limit,
        offset,
        total: 0,
        resultsReceived: 0,
        latencyMs,
        gupyError,
        results: [],
      };
    }

    const rawText = await response.text();
    let parsedData: any = null;
    try {
      parsedData = JSON.parse(rawText);
    } catch (parseErr: any) {
      console.error('[VERCEL-GUPY] JSON parse error from Gupy response');
      return {
        ok: false,
        runtimeBackend,
        clientEndpoint,
        backendHandler,
        errorStage: 'RESPONSE_PARSE',
        statusCategory: 'PARSING_ERROR',
        cacheStatus: 'LIVE',
        httpStatus: 200,
        gupyHttpStatus: response.status,
        statusText: 'Invalid JSON from Gupy',
        apiUrlSanitized: sanitizedUrl,
        query: cleanQuery || '—',
        location: cleanLocation || '—',
        limit,
        offset,
        total: 0,
        resultsReceived: 0,
        latencyMs,
        gupyError: 'A Gupy retornou uma resposta não-JSON ou corrompida.',
        results: [],
      };
    }

    const rawJobs = Array.isArray(parsedData.data) ? parsedData.data : (Array.isArray(parsedData) ? parsedData : []);
    const total = parsedData.pagination?.total !== undefined ? Number(parsedData.pagination.total) : rawJobs.length;

    let statusCategory = 'SUCCESS_WITH_RESULTS';
    if (rawJobs.length === 0) {
      statusCategory = 'NO_MATCHING_JOBS';
    }

    console.log(`[VERCEL-GUPY] Successfully fetched ${rawJobs.length} jobs (Total: ${total})`);

    const resultPayload: GupyQueryResult = {
      ok: true,
      runtimeBackend,
      clientEndpoint,
      backendHandler,
      errorStage: null,
      statusCategory,
      cacheStatus: 'LIVE',
      httpStatus: 200,
      gupyHttpStatus: response.status,
      statusText: response.statusText,
      apiUrlSanitized: sanitizedUrl,
      query: cleanQuery || '—',
      location: cleanLocation || '—',
      limit,
      offset,
      total,
      resultsReceived: rawJobs.length,
      latencyMs,
      gupyError: null,
      results: rawJobs,
    };

    // Store in memory cache
    try {
      gupyMemoryCache.set(cacheKey, {
        timestamp: Date.now(),
        data: resultPayload,
      });
    } catch {}

    return resultPayload;
  } catch (err: any) {
    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;
    const isAbort = err.name === 'AbortError';
    console.error('[VERCEL-GUPY] Exception querying Gupy:', err);

    return {
      ok: false,
      runtimeBackend,
      clientEndpoint,
      backendHandler,
      errorStage: 'BACKEND_PROXY',
      statusCategory: isAbort ? 'SOURCE_UNAVAILABLE' : 'NETWORK_ERROR',
      cacheStatus: 'LIVE',
      httpStatus: 200,
      gupyHttpStatus: null,
      statusText: isAbort ? 'Gateway Timeout (10s)' : 'Network Exception',
      apiUrlSanitized: sanitizedUrl,
      query: cleanQuery || '—',
      location: cleanLocation || '—',
      limit,
      offset,
      total: 0,
      resultsReceived: 0,
      latencyMs,
      gupyError: isAbort
        ? 'Tempo limite de resposta da Gupy excedido (10s).'
        : (err.message || 'Exceção de rede ao conectar com o portal público da Gupy.'),
      results: [],
    };
  }
}
