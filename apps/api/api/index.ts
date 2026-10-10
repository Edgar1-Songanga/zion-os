import type { Request, Response } from 'express';
import handler from '../dist/apps/api/src/serverless.handler.js';

const normalizeVercelRequestPath = require('../scripts/normalize-vercel-request-path.cjs') as (request: Request) => string | undefined;

export default async function apiFunction(request: Request, response: Response): Promise<void> {
  try {
    normalizeVercelRequestPath(request);
  } catch {
    response.statusCode = 400;
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.end(JSON.stringify({ statusCode: 400, error: 'Bad Request', message: 'Invalid API path' }));
    return;
  }
  await handler(request, response);
}
