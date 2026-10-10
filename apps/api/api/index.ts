import type { Request, Response } from 'express';
import handler from '../dist/apps/api/src/serverless.handler.js';

const normalizeVercelRequestPath = require('../scripts/normalize-vercel-request-path.cjs') as (request: Request) => string | undefined;

type NodeResponse = {
  statusCode: number;
  setHeader(name: string, value: string): unknown;
  end(body?: string): unknown;
};

export default async function apiFunction(request: Request, response: Response): Promise<void> {
  try {
    normalizeVercelRequestPath(request);
  } catch {
    const rawResponse = response as unknown as NodeResponse;
    rawResponse.statusCode = 400;
    rawResponse.setHeader('Content-Type', 'application/json; charset=utf-8');
    rawResponse.end(JSON.stringify({ statusCode: 400, error: 'Bad Request', message: 'Invalid API path' }));
    return;
  }
  await handler(request, response);
}
