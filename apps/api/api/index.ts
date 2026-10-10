import type { Request, Response } from 'express';
import handler from '../dist/apps/api/src/serverless.handler.js';

const normalizeVercelRequestPath = require('../scripts/normalize-vercel-request-path.cjs') as (request: Request) => string | undefined;

export default async function apiFunction(request: Request, response: Response): Promise<void> {
  try {
    normalizeVercelRequestPath(request);
  } catch {
    response.status(400).json({ statusCode: 400, error: 'Bad Request', message: 'Invalid API path' });
    return;
  }
  await handler(request, response);
}
