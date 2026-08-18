import {
  sendJsonResponse,
  validateHttpMethod,
  VercelLikeRequest,
  VercelLikeResponse,
} from './_shared/httpHelper.js';

export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
  try {
    console.log('[VERCEL-HEALTH] Handler invoked - Method:', req.method);

    if (!validateHttpMethod(req, res, ['GET', 'OPTIONS'])) {
      return;
    }

    if (req.method === 'OPTIONS') {
      res.setHeader('Allow', 'GET, OPTIONS');
      return sendJsonResponse(res, 204, {});
    }

    console.log('[VERCEL-HEALTH] Responding 200 OK with runtime VERCEL-API-V2');
    return sendJsonResponse(res, 200, {
      ok: true,
      status: 'ok',
      runtime: 'VERCEL-API-V2',
    });
  } catch (err: any) {
    console.error('[VERCEL-HEALTH] Unhandled Exception:', err);
    return sendJsonResponse(res, 500, {
      ok: false,
      error: 'INTERNAL_SERVER_ERROR',
      runtime: 'VERCEL-API-V2',
    });
  }
}
