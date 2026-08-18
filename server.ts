import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

import { queryAdzuna } from './api/_shared/adzunaService.js';
import { queryGupy } from './api/_shared/gupyService.js';
import { querySolides } from './api/_shared/solidesService.js';
import { queryPandape, fetchPandapeJobDetail } from './api/_shared/pandapeService.js';
import { getPublicConfig } from './api/_shared/configService.js';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Ensure all /api responses default to application/json and set runtime markers
  app.use('/api', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('X-Runtime', 'VERCEL-API-V2');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    next();
  });

  // API Route: Secure Adzuna Proxy (supports POST, GET, with or without trailing slash)
  const handleAdzunaSearch = async (req: express.Request, res: express.Response) => {
    try {
      const query = (req.body?.query ?? req.query?.query) as string | undefined;
      const location = (req.body?.location ?? req.query?.location) as string | undefined;
      const daysOld = Number(req.body?.daysOld ?? req.query?.daysOld ?? req.body?.days ?? req.query?.days ?? 30);
      const country = (req.body?.country ?? req.query?.country ?? 'br') as string;
      const page = Number(req.body?.page ?? req.query?.page ?? 1);
      const resultsPerPage = Number(req.body?.resultsPerPage ?? req.query?.resultsPerPage ?? req.body?.limit ?? req.query?.limit ?? 50);

      const result = await queryAdzuna({ query, location, daysOld, country, page, resultsPerPage });
      return res.status(result.httpStatus || 200).json(result);
    } catch (routeErr: any) {
      return res.status(500).json({
        ok: false,
        runtimeBackend: 'ADZUNA-BACKEND-V2',
        clientEndpoint: '/api/adzuna/search',
        backendHandler: 'server.ts:queryAdzuna',
        errorStage: 'BACKEND_PROXY',
        statusCategory: 'SERVER_EXCEPTION',
        httpStatus: 500,
        adzunaHttpStatus: null,
        statusText: 'Internal Server Error',
        adzunaError: routeErr.message || 'Erro inesperado no servidor proxy Adzuna',
        results: [],
      });
    }
  };

  app.post('/api/adzuna/search', handleAdzunaSearch);
  app.post('/api/adzuna/search/', handleAdzunaSearch);
  app.get('/api/adzuna/search', handleAdzunaSearch);
  app.get('/api/adzuna/search/', handleAdzunaSearch);

  // Minimal Test Diagnostic Endpoint
  app.get('/api/adzuna/test', async (req, res) => {
    try {
      const testResult = await queryAdzuna({
        query: 'customer',
        location: '',
        daysOld: 30,
        resultsPerPage: 10,
        page: 1,
      });
      return res.json({
        testName: 'Minimal Diagnostic Test (Query: customer, Location: none, Days: 30, Limit: 10)',
        runtime: 'VERCEL-API-V2',
        result: testResult,
      });
    } catch (testErr: any) {
      return res.status(500).json({
        ok: false,
        runtimeBackend: 'ADZUNA-BACKEND-V2',
        error: testErr.message || 'Erro no endpoint de teste Adzuna',
      });
    }
  });

  // API Route: Secure Gupy Public Search Proxy (supports POST, GET, with or without trailing slash)
  const handleGupySearch = async (req: express.Request, res: express.Response) => {
    try {
      const query = (req.body?.query ?? req.query?.query ?? req.body?.jobName ?? req.query?.jobName ?? req.body?.what ?? req.query?.what) as string | undefined;
      const location = (req.body?.location ?? req.query?.location ?? req.body?.where ?? req.query?.where) as string | undefined;
      const city = (req.body?.city ?? req.query?.city) as string | undefined;
      const state = (req.body?.state ?? req.query?.state) as string | undefined;
      const workplaceType = (req.body?.workplaceType ?? req.query?.workplaceType) as string | undefined;
      const page = Number(req.body?.page ?? req.query?.page ?? 1);
      const limit = Number(req.body?.limit ?? req.query?.limit ?? req.body?.resultsPerPage ?? req.query?.resultsPerPage ?? 50);
      const offset = req.body?.offset !== undefined ? Number(req.body.offset) : (req.query?.offset !== undefined ? Number(req.query.offset) : (page - 1) * limit);

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

      return res.status(result.httpStatus || 200).json(result);
    } catch (routeErr: any) {
      return res.status(500).json({
        ok: false,
        runtimeBackend: 'GUPY-BACKEND-V1',
        clientEndpoint: '/api/gupy/search',
        backendHandler: 'server.ts:queryGupy',
        errorStage: 'BACKEND_PROXY',
        statusCategory: 'SERVER_EXCEPTION',
        httpStatus: 500,
        gupyHttpStatus: null,
        statusText: 'Internal Server Error',
        gupyError: routeErr.message || 'Erro inesperado no servidor proxy Gupy',
        results: [],
      });
    }
  };

  app.post('/api/gupy/search', handleGupySearch);
  app.post('/api/gupy/search/', handleGupySearch);
  app.get('/api/gupy/search', handleGupySearch);
  app.get('/api/gupy/search/', handleGupySearch);

  // Minimal Gupy Test Diagnostic Endpoint
  app.get('/api/gupy/test', async (req, res) => {
    try {
      const testResult = await queryGupy({
        query: 'customer',
        limit: 10,
      });
      return res.json({
        testName: 'Minimal Diagnostic Test Gupy (Query: customer, Limit: 10)',
        runtime: 'VERCEL-API-V2',
        result: testResult,
      });
    } catch (testErr: any) {
      return res.status(500).json({
        ok: false,
        runtimeBackend: 'GUPY-BACKEND-V1',
        error: testErr.message || 'Erro no endpoint de teste Gupy',
      });
    }
  });

  // API Route: Secure Sólides Public Search Proxy (supports POST, GET, with or without trailing slash)
  const handleSolidesSearch = async (req: express.Request, res: express.Response) => {
    try {
      const query = (req.body?.query ?? req.query?.query ?? req.body?.title ?? req.query?.title ?? req.body?.what ?? req.query?.what) as string | undefined;
      const location = (req.body?.location ?? req.query?.location ?? req.body?.where ?? req.query?.where) as string | undefined;
      const city = (req.body?.city ?? req.query?.city) as string | undefined;
      const state = (req.body?.state ?? req.query?.state) as string | undefined;
      const workplaceType = (req.body?.workplaceType ?? req.query?.workplaceType) as string | undefined;
      const page = Number(req.body?.page ?? req.query?.page ?? 1);
      const limit = Number(req.body?.limit ?? req.query?.limit ?? req.body?.resultsPerPage ?? req.query?.resultsPerPage ?? req.body?.take ?? req.query?.take ?? 50);

      const result = await querySolides({
        query,
        location,
        city,
        state,
        workplaceType,
        limit,
        page,
      });

      return res.status(result.httpStatus || 200).json(result);
    } catch (routeErr: any) {
      return res.status(500).json({
        ok: false,
        runtimeBackend: 'SOLIDES-BACKEND-V1',
        clientEndpoint: '/api/solides/search',
        backendHandler: 'server.ts:querySolides',
        errorStage: 'BACKEND_PROXY',
        statusCategory: 'SERVER_EXCEPTION',
        httpStatus: 500,
        solidesHttpStatus: null,
        statusText: 'Internal Server Error',
        solidesError: routeErr.message || 'Erro inesperado no servidor proxy Sólides',
        results: [],
      });
    }
  };

  app.post('/api/solides/search', handleSolidesSearch);
  app.post('/api/solides/search/', handleSolidesSearch);
  app.get('/api/solides/search', handleSolidesSearch);
  app.get('/api/solides/search/', handleSolidesSearch);

  // Minimal Sólides Test Diagnostic Endpoint
  app.get('/api/solides/test', async (req, res) => {
    try {
      const testResult = await querySolides({
        query: 'customer',
        limit: 10,
      });
      return res.json({
        testName: 'Minimal Diagnostic Test Sólides (Query: customer, Limit: 10)',
        runtime: 'VERCEL-API-V2',
        result: testResult,
      });
    } catch (testErr: any) {
      return res.status(500).json({
        ok: false,
        runtimeBackend: 'SOLIDES-BACKEND-V1',
        error: testErr.message || 'Erro no endpoint de teste Sólides',
      });
    }
  });

  // API Route: Secure Pandapé Public Search Proxy (supports POST, GET, with or without trailing slash)
  const handlePandapeSearch = async (req: express.Request, res: express.Response) => {
    try {
      // Detail enrichment request
      if ((req.body?.action === 'detail' || req.query?.action === 'detail') && (req.body?.rawId || req.query?.rawId || req.body?.jobId || req.query?.jobId)) {
        const tenantKey = (req.body?.tenantKey ?? req.query?.tenantKey ?? '') as string;
        const rawId = (req.body?.rawId ?? req.query?.rawId ?? req.body?.jobId ?? req.query?.jobId) as string;
        const detailResult = await fetchPandapeJobDetail(tenantKey, rawId);
        return res.status(detailResult.ok ? 200 : 404).json(detailResult);
      }

      const query = (req.body?.query ?? req.query?.query ?? req.body?.title ?? req.query?.title ?? req.body?.what ?? req.query?.what) as string | undefined;
      const location = (req.body?.location ?? req.query?.location ?? req.body?.where ?? req.query?.where) as string | undefined;
      const city = (req.body?.city ?? req.query?.city) as string | undefined;
      const state = (req.body?.state ?? req.query?.state) as string | undefined;
      const workplaceType = (req.body?.workplaceType ?? req.query?.workplaceType) as string | undefined;
      const tenantKey = (req.body?.tenantKey ?? req.query?.tenantKey) as string | undefined;
      const page = Number(req.body?.page ?? req.query?.page ?? 1);
      const limit = Number(req.body?.limit ?? req.query?.limit ?? req.body?.resultsPerPage ?? req.query?.resultsPerPage ?? 50);

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

      return res.status(result.httpStatus || 200).json(result);
    } catch (routeErr: any) {
      return res.status(500).json({
        ok: false,
        runtimeBackend: 'PANDAPE-BACKEND-V1',
        clientEndpoint: '/api/pandape/search',
        backendHandler: 'server.ts:queryPandape',
        errorStage: 'BACKEND_PROXY',
        statusCategory: 'SERVER_EXCEPTION',
        httpStatus: 500,
        pandapeHttpStatus: null,
        statusText: 'Internal Server Error',
        pandapeError: routeErr.message || 'Erro inesperado no servidor proxy Pandapé',
        results: [],
      });
    }
  };

  app.post('/api/pandape/search', handlePandapeSearch);
  app.post('/api/pandape/search/', handlePandapeSearch);
  app.get('/api/pandape/search', handlePandapeSearch);
  app.get('/api/pandape/search/', handlePandapeSearch);

  // Minimal Pandapé Test Diagnostic Endpoint
  app.get('/api/pandape/test', async (req, res) => {
    try {
      const query = (req.query?.query as string) || 'desenvolvedor';
      const limit = Number(req.query?.limit || 10);
      const testResult = await queryPandape({
        query,
        limit,
      });
      return res.json({
        testName: `Minimal Diagnostic Test Pandapé (Query: ${query}, Limit: ${limit})`,
        runtime: 'VERCEL-API-V2',
        result: testResult,
      });
    } catch (testErr: any) {
      return res.status(500).json({
        ok: false,
        runtimeBackend: 'PANDAPE-BACKEND-V1',
        error: testErr.message || 'Erro no endpoint de teste Pandapé',
      });
    }
  });

  // Pandapé Detail Endpoint for on-demand rich job description
  app.get('/api/pandape/detail', async (req, res) => {
    try {
      const tenantKey = (req.query?.tenantKey as string) || '';
      const rawId = (req.query?.rawId as string) || (req.query?.jobId as string) || '';
      const detailResult = await fetchPandapeJobDetail(tenantKey, rawId);
      return res.status(detailResult.ok ? 200 : 404).json(detailResult);
    } catch (detailErr: any) {
      return res.status(500).json({
        ok: false,
        error: detailErr.message || 'Erro ao buscar detalhes da vaga Pandapé',
      });
    }
  });

  // Public Configuration Endpoint (Supabase Frontend Credentials Only)
  app.get('/api/config', (req, res) => {
    const config = getPublicConfig();
    const isConfigured = Boolean(config.supabaseUrl && config.supabasePublishableKey);
    return res.json({
      ...config,
      supabaseConfigured: isConfigured,
      runtime: 'VERCEL-API-V2',
    });
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      ok: true,
      status: 'ok',
      runtime: 'VERCEL-API-V2',
    });
  });

  // API 404 Fallback: guarantees any unmatched /api/* route returns JSON instead of falling through to HTML
  app.all('/api/*', (req, res) => {
    res.status(404).json({
      ok: false,
      runtimeBackend: 'VERCEL-API-V2',
      error: `Endpoint '${req.originalUrl}' não encontrado na API.`,
      statusCategory: 'ROUTE_NOT_FOUND',
      httpStatus: 404,
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
