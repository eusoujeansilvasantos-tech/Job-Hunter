import { queryGupy } from '../_shared/gupyService.js';
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
    console.log('[VERCEL-GUPY] Search handler invoked - Method:', req.method);

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

    const query = (body?.query ?? queryParams?.query ?? body?.jobName ?? queryParams?.jobName ?? body?.what ?? queryParams?.what) as string | undefined;
    const location = (body?.location ?? queryParams?.location ?? body?.where ?? queryParams?.where) as string | undefined;
    const city = (body?.city ?? queryParams?.city) as string | undefined;
    const state = (body?.state ?? queryParams?.state) as string | undefined;
    const workplaceType = (body?.workplaceType ?? queryParams?.workplaceType) as string | undefined;
    const page = Number(body?.page ?? queryParams?.page ?? 1);
    const limit = Number(body?.limit ?? queryParams?.limit ?? body?.resultsPerPage ?? queryParams?.resultsPerPage ?? 50);
    const offset = body?.offset !== undefined ? Number(body.offset) : (queryParams?.offset !== undefined ? Number(queryParams.offset) : (page - 1) * limit);

    console.log(`[VERCEL-GUPY] Calling queryGupy with query='${query || ''}' location='${location || ''}' page=${page}`);
    const result = await queryGupy({
      query,
      location,
      city,
      state,
      workplaceType,
      limit,
      offset,
      page,
    });

    return sendJsonResponse(res, result.httpStatus || 200, result);
  } catch (err: any) {
    console.error('[VERCEL-GUPY] Unhandled error in handler:', err);
    return sendJsonResponse(res, 500, {
      ok: false,
      runtimeBackend: 'GUPY-BACKEND-V1',
      clientEndpoint: '/api/gupy/search',
      backendHandler: 'gupy/search.ts (VERCEL-API-V2)',
      errorStage: 'BACKEND_PROXY',
      statusCategory: 'SERVER_EXCEPTION',
      httpStatus: 500,
      gupyHttpStatus: null,
      statusText: 'Internal Server Error',
      gupyError: err.message || 'Erro inesperado no handler da Gupy',
      results: [],
    });
  }
}
