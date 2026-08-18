import { queryGupy } from '../_shared/gupyService.js';
import {
  sendJsonResponse,
  validateHttpMethod,
  VercelLikeRequest,
  VercelLikeResponse,
} from '../_shared/httpHelper.js';

export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
  try {
    console.log('[VERCEL-GUPY] Test handler invoked - Method:', req.method);

    if (!validateHttpMethod(req, res, ['GET', 'OPTIONS'])) {
      return;
    }

    if (req.method === 'OPTIONS') {
      res.setHeader('Allow', 'GET, OPTIONS');
      return sendJsonResponse(res, 204, {});
    }

    const testResult = await queryGupy({
      query: 'customer',
      limit: 10,
    });

    return sendJsonResponse(res, 200, {
      testName: 'Minimal Diagnostic Test Gupy (Query: customer, Limit: 10)',
      runtime: 'VERCEL-API-V2',
      result: testResult,
    });
  } catch (testErr: any) {
    console.error('[VERCEL-GUPY] Test handler exception:', testErr);
    return sendJsonResponse(res, 500, {
      ok: false,
      runtimeBackend: 'GUPY-BACKEND-V1',
      error: testErr.message || 'Erro no endpoint de teste Gupy',
    });
  }
}
