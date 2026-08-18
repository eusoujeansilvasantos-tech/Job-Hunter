import { getPublicConfig } from './_shared/configService.js';
import {
  sendJsonResponse,
  validateHttpMethod,
  VercelLikeRequest,
  VercelLikeResponse,
} from './_shared/httpHelper.js';

export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
  try {
    console.log('[VERCEL-CONFIG] Handler invoked - Method:', req.method);

    if (!validateHttpMethod(req, res, ['GET', 'OPTIONS'])) {
      return;
    }

    if (req.method === 'OPTIONS') {
      res.setHeader('Allow', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      return sendJsonResponse(res, 204, {});
    }

    const config = getPublicConfig();
    const isConfigured = Boolean(config.supabaseUrl && config.supabasePublishableKey);
    console.log(`[VERCEL-CONFIG] Supabase configured: ${isConfigured}`);

    return sendJsonResponse(res, 200, {
      ...config,
      supabaseConfigured: isConfigured,
      runtime: 'VERCEL-API-V2',
    });
  } catch (err: any) {
    console.error('[VERCEL-CONFIG] Unhandled Exception:', err);
    return sendJsonResponse(res, 500, {
      supabaseUrl: '',
      supabasePublishableKey: '',
      supabaseConfigured: false,
      error: 'CONFIG_RETRIEVAL_FAILED',
      runtime: 'VERCEL-API-V2',
    });
  }
}
