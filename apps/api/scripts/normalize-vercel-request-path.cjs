'use strict';

module.exports = function normalizeVercelRequestPath(request) {
  if (!request.url) return undefined;

  const rewrittenUrl = new URL(request.url, 'http://vercel.internal');
  const capturedPaths = rewrittenUrl.searchParams.getAll('__zion_path');
  if (capturedPaths.length === 0) return request.url;

  // The rewrite injects this parameter after preserving the caller's query string.
  const capturedPath = capturedPaths[capturedPaths.length - 1].replace(/^\/+/, '');
  const segments = capturedPath.split('/');
  if (segments.some((segment) => segment === '.' || segment === '..') || capturedPath.includes('\\')) {
    throw new Error('Invalid rewritten API path');
  }

  rewrittenUrl.searchParams.delete('__zion_path');
  const query = rewrittenUrl.searchParams.toString();
  request.url = `/api/${capturedPath}${query ? `?${query}` : ''}`;
  return request.url;
};
