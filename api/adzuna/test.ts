import { queryAdzuna } from '../_shared/adzunaService.js';
import {
  sendJsonResponse,
  validateHttpMethod,
  VercelLikeRequest,
  VercelLikeResponse,
} from '../_shared/httpHelper.js';

export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
  try {
    console.log('[VERCEL-ADZUNA] Test handler invoked - Method:', req.method);

    if (!validateHttpMethod(req, res, ['GET', 'OPTIONS'])) {
      return;
    }

    if (req.method === 'OPTIONS') {
      res.setHeader('Allow', 'GET, OPTIONS');
      return sendJsonResponse(res, 204, {});
    }

    const testResult = await queryAdzuna({
      query: 'customer',
      location: '',
      daysOld: 30,
      resultsPerPage: 10,
      page: 1,
    });

    return sendJsonResponse(res, 200, {
      testName: 'Minimal Diagnostic Test (Query: customer, Location: none, Days: 30, Limit: 10)',
      runtime: 'VERCEL-API-V2',
      result: testResult,
    });
  } catch (testErr: any) {
    console.error('[VERCEL-ADZUNA] Test handler exception:', testErr);
    return sendJsonResponse(res, 500, {
      ok: false,
      runtimeBackend: 'ADZUNA-BACKEND-V2',
      error: testErr.message || 'Erro no endpoint de teste Adzuna',
    });
  }
}
