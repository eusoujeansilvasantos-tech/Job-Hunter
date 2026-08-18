import { queryPandape, fetchPandapeJobDetail } from '../_shared/pandapeService.js';
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
    console.log('[VERCEL-PANDAPE] Search handler invoked - Method:', req.method);

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

    // Check if client is requesting detail enrichment for a specific job
    const isDetailRequest = (body?.action === 'detail' || queryParams?.action === 'detail') && (body?.rawId || queryParams?.rawId || body?.jobId || queryParams?.jobId);
    if (isDetailRequest) {
      const tenantKey = (body?.tenantKey ?? queryParams?.tenantKey ?? '') as string;
      const rawId = (body?.rawId ?? queryParams?.rawId ?? body?.jobId ?? queryParams?.jobId) as string;
      console.log(`[VERCEL-PANDAPE] Detail enrichment request: tenant='${tenantKey}' rawId='${rawId}'`);
      const detailResult = await fetchPandapeJobDetail(tenantKey, rawId);
      return sendJsonResponse(res, detailResult.ok ? 200 : 404, detailResult);
    }

    const query = (body?.query ?? queryParams?.query ?? body?.title ?? queryParams?.title ?? body?.what ?? queryParams?.what) as string | undefined;
    const location = (body?.location ?? queryParams?.location ?? body?.where ?? queryParams?.where) as string | undefined;
    const city = (body?.city ?? queryParams?.city) as string | undefined;
    const state = (body?.state ?? queryParams?.state) as string | undefined;
    const workplaceType = (body?.workplaceType ?? queryParams?.workplaceType) as string | undefined;
    const tenantKey = (body?.tenantKey ?? queryParams?.tenantKey) as string | undefined;
    const page = Number(body?.page ?? queryParams?.page ?? 1);
    const limit = Number(body?.limit ?? queryParams?.limit ?? body?.resultsPerPage ?? queryParams?.resultsPerPage ?? 50);

    console.log(`[VERCEL-PANDAPE] Calling queryPandape with query='${query || ''}' location='${location || ''}' limit=${limit}`);
    const result = await queryPandape({
      query,
      location,
      city,
      state,
      workplaceType,
      tenantKey,
      limit,
      page,
    });

    return sendJsonResponse(res, result.httpStatus || 200, result);
  } catch (err: any) {
    console.error('[VERCEL-PANDAPE] Unhandled error in handler:', err);
    return sendJsonResponse(res, 500, {
      ok: false,
      runtimeBackend: 'PANDAPE-BACKEND-V1',
      clientEndpoint: '/api/pandape/search',
      backendHandler: 'pandape/search.ts (VERCEL-API-V2)',
      errorStage: 'BACKEND_PROXY',
      statusCategory: 'SERVER_EXCEPTION',
      httpStatus: 500,
      pandapeHttpStatus: null,
      statusText: 'Internal Server Error',
      pandapeError: err.message || 'Erro inesperado no handler do Pandapé',
      results: [],
    });
  }
}
