import { queryAdzuna } from '../_shared/adzunaService.js';
import {
  parseRequestBody,
  parseRequestQuery,
  sendJsonResponse,
  validateHttpMethod,
  VercelLikeRequest,
  VercelLikeResponse,
} from '../_shared/httpHelper.js';

export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
  try {
    console.log('[VERCEL-ADZUNA] Search handler invoked - Method:', req.method);

    if (!validateHttpMethod(req, res, ['POST', 'GET', 'OPTIONS'])) {
      return;
    }

    if (req.method === 'OPTIONS') {
      res.setHeader('Allow', 'POST, GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      return sendJsonResponse(res, 204, {});
    }

    const body = await parseRequestBody(req);
    const queryParams = parseRequestQuery(req);

    const query = (body?.query ?? queryParams?.query) as string | undefined;
    const location = (body?.location ?? queryParams?.location) as string | undefined;
    const daysOld = Number(body?.daysOld ?? queryParams?.daysOld ?? body?.days ?? queryParams?.days ?? 30);
    const country = (body?.country ?? queryParams?.country ?? 'br') as string;
    const page = Number(body?.page ?? queryParams?.page ?? 1);
    const resultsPerPage = Number(body?.resultsPerPage ?? queryParams?.resultsPerPage ?? body?.limit ?? queryParams?.limit ?? 50);

    console.log(`[VERCEL-ADZUNA] Calling queryAdzuna with query='${query || ''}' location='${location || ''}' page=${page}`);
    const result = await queryAdzuna({
      query,
      location,
      daysOld,
      country,
      page,
      resultsPerPage,
    });

    return sendJsonResponse(res, result.httpStatus || 200, result);
  } catch (err: any) {
    console.error('[VERCEL-ADZUNA] Unhandled error in handler:', err);
    return sendJsonResponse(res, 500, {
      ok: false,
      runtimeBackend: 'ADZUNA-BACKEND-V2',
      clientEndpoint: '/api/adzuna/search',
      backendHandler: 'adzuna/search.ts (VERCEL-API-V2)',
      errorStage: 'BACKEND_PROXY',
      statusCategory: 'SERVER_EXCEPTION',
      httpStatus: 500,
      adzunaHttpStatus: null,
      statusText: 'Internal Server Error',
      adzunaError: err.message || 'Erro inesperado no handler da Adzuna',
      results: [],
    });
  }
}
