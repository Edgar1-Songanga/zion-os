import 'reflect-metadata';
import type { Request, Response } from 'express';
import { createZionApplication } from './app.factory';

let applicationPromise: ReturnType<typeof createZionApplication> | undefined;

function getApplication() {
  applicationPromise ??= createZionApplication().catch((error: unknown) => {
    // A rejected initialization must not poison all later warm invocations.
    applicationPromise = undefined;
    throw error;
  });
  return applicationPromise;
}

export default async function handler(request: Request, response: Response): Promise<void> {
  try {
    const application = await getApplication();
    const expressHandler = application.getHttpAdapter().getInstance();
    expressHandler(request, response);
  } catch (error) {
    const requestId = request.headers['x-vercel-id'] ?? request.headers['x-request-id'] ?? 'unknown';
    const message = error instanceof Error ? error.message : 'Unknown bootstrap error';
    console.error(JSON.stringify({
      event: 'zion_api_bootstrap_failure',
      requestId,
      message,
      stack: error instanceof Error ? error.stack : undefined,
    }));

    if (!response.headersSent) {
      response.status(500).json({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'The API could not initialize. Provide the request ID to support.',
        requestId,
      });
    }
  }
}
