import { queryPandape } from '../_shared/pandapeService.js';
import { getActivePandapeTenants } from '../_shared/pandapeTenants.js';
import {
  parseRequestQuery,
  sendJsonResponse,
  validateHttpMethod,
  VercelLikeRequest,
  VercelLikeResponse,
} from '../_shared/httpHelper.js';

export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
  try {
    console.log('[VERCEL-PANDAPE-TEST] Diagnostic endpoint invoked');

    if (!validateHttpMethod(req, res, ['GET', 'POST', 'OPTIONS'])) {
      return;
    }

    if (req.method === 'OPTIONS') {
      res.setHeader('Allow', 'GET, POST, OPTIONS');
      return sendJsonResponse(res, 204, {});
    }

    const queryParams = parseRequestQuery(req);
    const query = (queryParams?.query ?? 'desenvolvedor') as string;
    const limit = Number(queryParams?.limit ?? 10);
    const activeTenants = getActivePandapeTenants();

    const startTime = Date.now();
    const result = await queryPandape({
      query,
      limit,
    });
    const totalLatency = Date.now() - startTime;

    const summary = {
      testEndpoint: '/api/pandape/test',
      status: result.ok ? 'SUCCESS' : 'FAILED',
      latencyMs: totalLatency,
      registeredTenantsCount: activeTenants.length,
      tenantsChecked: result.tenantsChecked,
      tenantsSuccessful: result.tenantsSuccessful,
      tenantsFailed: result.tenantsFailed,
      rawJobsReceived: result.total,
      filteredReturned: result.resultsReceived,
      sampleJobs: result.results.slice(0, 3).map((j) => ({
        id: j.id,
        title: j.title,
        company: j.company,
        location: j.location,
        workplace: j.workplace,
        contract: j.contract,
        url: j.url,
      })),
      tenantDiagnostics: result.tenantDiagnostics,
    };

    return sendJsonResponse(res, result.httpStatus || 200, summary);
  } catch (err: any) {
    console.error('[VERCEL-PANDAPE-TEST] Exception in test endpoint:', err);
    return sendJsonResponse(res, 500, {
      testEndpoint: '/api/pandape/test',
      status: 'EXCEPTION',
      error: err.message || 'Erro inesperado no endpoint de teste do Pandapé',
    });
  }
}
