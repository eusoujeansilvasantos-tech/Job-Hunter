export interface AdzunaQueryOptions {
  query?: string;
  location?: string;
  daysOld?: number;
  country?: string;
  page?: number;
  resultsPerPage?: number;
}

export interface AdzunaQueryResult {
  ok: boolean;
  runtimeBackend: string;
  clientEndpoint: string;
  backendHandler: string;
  credentialsStatus: {
    appId: string;
    appKey: string;
  };
  errorStage: 'REQUEST' | 'BACKEND_PROXY' | 'ADZUNA_API' | 'RESPONSE_PARSE' | 'NORMALIZATION' | null;
  statusCategory: string;
  httpStatus: number;
  adzunaHttpStatus: number | null;
  statusText: string;
  apiUrlSanitized: string;
  countryCode: string;
  query: string;
  location: string;
  daysOld: number;
  page: number;
  resultsPerPage: number;
  adzunaCount: number;
  resultsReceived: number;
  adzunaError: string | null;
  results: any[];
}

/**
 * Helper function to query Adzuna safely with full diagnostics and secrets protection.
 */
export async function queryAdzuna(options: AdzunaQueryOptions): Promise<AdzunaQueryResult> {
  console.log('[VERCEL-ADZUNA] Starting Adzuna query evaluation');

  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  const credentialsStatus = {
    appId: appId && appId.trim() !== '' ? 'CONFIGURED' : 'MISSING',
    appKey: appKey && appKey.trim() !== '' ? 'CONFIGURED' : 'MISSING',
  };

  const clientEndpoint = '/api/adzuna/search';
  const backendHandler = 'adzunaService:queryAdzuna (VERCEL-API-V2)';
  const runtimeBackend = 'ADZUNA-BACKEND-V2';

  if (credentialsStatus.appId === 'MISSING' || credentialsStatus.appKey === 'MISSING') {
    console.warn('[VERCEL-ADZUNA] Credentials missing in environment variables');
    return {
      ok: false,
      runtimeBackend,
      clientEndpoint,
      backendHandler,
      credentialsStatus,
      errorStage: 'BACKEND_PROXY',
      statusCategory: 'MISSING_CREDENTIALS',
      httpStatus: 400,
      adzunaHttpStatus: null,
      statusText: 'Bad Request (Missing Credentials)',
      apiUrlSanitized: `https://api.adzuna.com/v1/api/jobs/${(options.country || 'br').toLowerCase().trim()}/search/${options.page || 1}?what=${encodeURIComponent(options.query || '')}&where=${encodeURIComponent(options.location || '')}`,
      countryCode: (options.country || 'br').toLowerCase().trim(),
      query: (options.query || '').trim() || '—',
      location: (options.location || '').trim() || '—',
      daysOld: options.daysOld || 30,
      page: options.page || 1,
      resultsPerPage: options.resultsPerPage || 50,
      adzunaCount: 0,
      resultsReceived: 0,
      adzunaError: 'Credenciais da Adzuna (ADZUNA_APP_ID / ADZUNA_APP_KEY) não foram configuradas nas variáveis de ambiente.',
      results: [],
    };
  }

  const countryCode = (options.country || 'br').toLowerCase().trim();
  const cleanQuery = (options.query || '').trim();
  const cleanLocation = (options.location || '').trim();
  const page = options.page || 1;
  const resultsPerPage = options.resultsPerPage || 50;
  const daysOld = options.daysOld || 30;

  // Build actual params with credentials
  const params = new URLSearchParams();
  params.append('app_id', appId!.trim());
  params.append('app_key', appKey!.trim());
  params.append('results_per_page', String(resultsPerPage));
  if (daysOld && !isNaN(Number(daysOld))) {
    params.append('max_days_old', String(daysOld));
  }
  if (cleanQuery) {
    params.append('what', cleanQuery);
  }
  if (cleanLocation) {
    const locLower = cleanLocation.toLowerCase();
    if (countryCode === 'br' && (locLower === 'brazil' || locLower === 'brasil')) {
      // Omit 'where' because endpoint /jobs/br/ already specifies country Brazil
    } else {
      params.append('where', cleanLocation);
    }
  }

  // Build sanitized params without credentials for UI / logging
  const sanitizedParams = new URLSearchParams();
  sanitizedParams.append('app_id', '[REDACTED]');
  sanitizedParams.append('app_key', '[REDACTED]');
  sanitizedParams.append('results_per_page', String(resultsPerPage));
  if (daysOld) sanitizedParams.append('max_days_old', String(daysOld));
  if (cleanQuery) sanitizedParams.append('what', cleanQuery);
  if (cleanLocation && !(countryCode === 'br' && (cleanLocation.toLowerCase() === 'brazil' || cleanLocation.toLowerCase() === 'brasil'))) {
    sanitizedParams.append('where', cleanLocation);
  }

  const adzunaUrl = `https://api.adzuna.com/v1/api/jobs/${countryCode}/search/${page}?${params.toString()}`;
  const sanitizedUrl = `https://api.adzuna.com/v1/api/jobs/${countryCode}/search/${page}?${sanitizedParams.toString()}`;

  console.log(`[VERCEL-ADZUNA] Requesting Adzuna API: ${sanitizedUrl}`);

  try {
    const response = await fetch(adzunaUrl, {
      headers: {
        'Accept': 'application/json',
      },
    });

    console.log(`[VERCEL-ADZUNA] Adzuna API response HTTP status: ${response.status}`);

    let statusCategory = 'ADZUNA_ERROR';
    let data: any = null;
    let adzunaError: string | null = null;

    if (!response.ok) {
      let errorText = '';
      try {
        errorText = await response.text();
      } catch {}
      console.error(`[VERCEL-ADZUNA] Upstream Error (${response.status}):`, errorText);

      if (response.status === 401 || response.status === 403) {
        statusCategory = 'AUTH_ERROR';
        adzunaError = `Erro de Autenticação na Adzuna (HTTP ${response.status}): Verifique se ADZUNA_APP_ID e ADZUNA_APP_KEY são válidos.`;
      } else if (response.status === 429) {
        statusCategory = 'RATE_LIMIT';
        adzunaError = 'Limite de requisições atingido na API da Adzuna (Rate Limit 429). Tente novamente mais tarde.';
      } else if (response.status === 400) {
        statusCategory = 'BAD_REQUEST';
        adzunaError = `Parâmetros inválidos enviados para a Adzuna (HTTP ${response.status}).`;
      } else if (response.status === 404) {
        statusCategory = 'NOT_FOUND';
        adzunaError = `Endpoint ou mercado '${countryCode}' não encontrado na Adzuna (HTTP 404).`;
      } else {
        statusCategory = 'ADZUNA_ERROR';
        adzunaError = `Erro HTTP ${response.status} retornado pela Adzuna: ${response.statusText || 'Erro no provedor'}`;
      }

      return {
        ok: false,
        runtimeBackend,
        clientEndpoint,
        backendHandler,
        credentialsStatus,
        errorStage: 'ADZUNA_API',
        statusCategory,
        httpStatus: 200, // proxy handled gracefully
        adzunaHttpStatus: response.status,
        statusText: response.statusText,
        apiUrlSanitized: sanitizedUrl,
        countryCode,
        query: cleanQuery || '—',
        location: cleanLocation || '—',
        daysOld,
        page,
        resultsPerPage,
        adzunaCount: 0,
        resultsReceived: 0,
        adzunaError,
        results: [],
      };
    }

    const rawText = await response.text();
    try {
      data = JSON.parse(rawText);
    } catch (parseErr: any) {
      console.error('[VERCEL-ADZUNA] Failed to parse JSON response from Adzuna');
      return {
        ok: false,
        runtimeBackend,
        clientEndpoint,
        backendHandler,
        credentialsStatus,
        errorStage: 'RESPONSE_PARSE',
        statusCategory: 'RESPONSE_PARSE_ERROR',
        httpStatus: 200,
        adzunaHttpStatus: response.status,
        statusText: 'Invalid JSON from Adzuna',
        apiUrlSanitized: sanitizedUrl,
        countryCode,
        query: cleanQuery || '—',
        location: cleanLocation || '—',
        daysOld,
        page,
        resultsPerPage,
        adzunaCount: 0,
        resultsReceived: 0,
        adzunaError: 'A Adzuna retornou uma resposta não-JSON ou corrompida.',
        results: [],
      };
    }

    const count = data.count || 0;
    const results = data.results || [];

    if (count > 0 && results.length > 0) {
      statusCategory = 'SUCCESS_WITH_RESULTS';
    } else {
      statusCategory = 'SUCCESS_EMPTY';
    }

    console.log(`[VERCEL-ADZUNA] Adzuna normalized success: ${results.length} jobs (Total count: ${count})`);

    return {
      ok: true,
      runtimeBackend,
      clientEndpoint,
      backendHandler,
      credentialsStatus,
      errorStage: null,
      statusCategory,
      httpStatus: 200,
      adzunaHttpStatus: response.status,
      statusText: response.statusText,
      apiUrlSanitized: sanitizedUrl,
      countryCode,
      query: cleanQuery || '—',
      location: cleanLocation || '—',
      daysOld,
      page,
      resultsPerPage,
      adzunaCount: count,
      resultsReceived: results.length,
      adzunaError: null,
      results,
    };
  } catch (err: any) {
    console.error('[VERCEL-ADZUNA] Network/Server Exception querying Adzuna:', err);
    return {
      ok: false,
      runtimeBackend,
      clientEndpoint,
      backendHandler,
      credentialsStatus,
      errorStage: 'BACKEND_PROXY',
      statusCategory: 'NETWORK_ERROR',
      httpStatus: 200,
      adzunaHttpStatus: null,
      statusText: 'Internal Proxy Handled',
      apiUrlSanitized: sanitizedUrl,
      countryCode,
      query: cleanQuery || '—',
      location: cleanLocation || '—',
      daysOld,
      page,
      resultsPerPage,
      adzunaCount: 0,
      resultsReceived: 0,
      adzunaError: err.message || 'Exceção de rede ou servidor ao conectar com a Adzuna.',
      results: [],
    };
  }
}
