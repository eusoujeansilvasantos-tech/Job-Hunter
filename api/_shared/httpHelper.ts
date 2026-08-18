import type { IncomingMessage, ServerResponse } from 'http';

export interface VercelLikeRequest extends IncomingMessage {
  query?: Record<string, string | string[] | undefined>;
  body?: any;
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
}

export interface VercelLikeResponse extends ServerResponse {
  status?: (code: number) => VercelLikeResponse;
  json?: (body: any) => void;
  setHeader: (name: string, value: string | number | readonly string[]) => this;
  send?: (body: any) => void;
}

/**
 * Extracts and parses body from either pre-parsed req.body or raw body stream.
 * Guaranteed to never hang or block execution.
 */
export async function parseRequestBody(req: VercelLikeRequest): Promise<any> {
  // If body is already parsed by Vercel or Express
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'object') {
      return req.body;
    }
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body);
      } catch {
        return {};
      }
    }
    if (Buffer.isBuffer(req.body)) {
      try {
        return JSON.parse(req.body.toString('utf-8'));
      } catch {
        return {};
      }
    }
    return req.body;
  }

  // If request is GET, HEAD, OPTIONS or stream is already complete/ended
  const method = (req.method || 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS' || req.complete || req.readableEnded) {
    return {};
  }

  // Fallback for raw streams with a strict 500ms timeout to prevent hanging
  return new Promise((resolve) => {
    let bodyData = '';
    let isSettled = false;

    const timeout = setTimeout(() => {
      if (!isSettled) {
        isSettled = true;
        resolve({});
      }
    }, 500);

    req.on('data', (chunk) => {
      bodyData += chunk;
    });

    req.on('end', () => {
      if (!isSettled) {
        isSettled = true;
        clearTimeout(timeout);
        try {
          resolve(bodyData ? JSON.parse(bodyData) : {});
        } catch {
          resolve({});
        }
      }
    });

    req.on('error', () => {
      if (!isSettled) {
        isSettled = true;
        clearTimeout(timeout);
        resolve({});
      }
    });
  });
}

/**
 * Extracts query parameters from req.query or parses from req.url.
 */
export function parseRequestQuery(req: VercelLikeRequest): Record<string, string | undefined> {
  if (req.query && typeof req.query === 'object') {
    const result: Record<string, string | undefined> = {};
    for (const [key, val] of Object.entries(req.query)) {
      result[key] = Array.isArray(val) ? val[0] : val;
    }
    return result;
  }

  if (req.url && req.url.includes('?')) {
    const searchParams = new URLSearchParams(req.url.split('?')[1]);
    const result: Record<string, string | undefined> = {};
    searchParams.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  return {};
}

/**
 * Sends a standardized JSON response compatible with both Vercel Serverless and Express.
 */
export function sendJsonResponse(
  res: VercelLikeResponse,
  statusCode: number,
  data: any
): void {
  try {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('X-Runtime', 'VERCEL-API-V2');
    res.setHeader('Cache-Control', 'no-store, max-age=0');

    if (typeof res.status === 'function' && typeof res.json === 'function') {
      res.status(statusCode).json(data);
      return;
    }

    res.statusCode = statusCode;
    res.end(JSON.stringify(data));
  } catch (sendErr) {
    console.error('[HTTP-HELPER] Error sending JSON response:', sendErr);
  }
}

/**
 * Validates allowed HTTP methods and responds with 405 Method Not Allowed if invalid.
 */
export function validateHttpMethod(
  req: VercelLikeRequest,
  res: VercelLikeResponse,
  allowedMethods: string[]
): boolean {
  const method = (req.method || 'GET').toUpperCase();
  if (!allowedMethods.map((m) => m.toUpperCase()).includes(method)) {
    sendJsonResponse(res, 405, {
      ok: false,
      runtimeBackend: 'VERCEL-API-V2',
      error: `Method ${method} Not Allowed. Allowed methods: ${allowedMethods.join(', ')}`,
      statusCategory: 'METHOD_NOT_ALLOWED',
      httpStatus: 405,
      allowedMethods,
    });
    return false;
  }
  return true;
}
