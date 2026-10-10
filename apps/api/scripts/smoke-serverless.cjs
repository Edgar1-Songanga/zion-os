process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_PUBLISHABLE_KEY = 'ci-only-publishable-key';
process.env.ZION_ALLOWED_ORIGINS = 'http://localhost:3000';

// The generic Vercel Node runtime does not provide Next.js catch-all routing.
// Assert the wildcard rewrite restores nested API paths before Nest receives them.
const normalizeVercelRequestPath = require('./normalize-vercel-request-path.cjs');
const rewrittenRequest = {
  url: '/api/index?__zion_path=v1%2Fresa%2Fconversations&limit=20&cursor=abc',
};
const normalizedPath = normalizeVercelRequestPath(rewrittenRequest);
if (normalizedPath !== '/api/v1/resa/conversations?limit=20&cursor=abc') {
  throw new Error(`Vercel rewrite normalization failed: ${normalizedPath}`);
}

let rejectedTraversal = false;
try {
  normalizeVercelRequestPath({ url: '/api/index?__zion_path=v1%2F..%2Fhealth' });
} catch {
  rejectedTraversal = true;
}
if (!rejectedTraversal) throw new Error('Vercel rewrite accepted a path traversal segment');

// The Vercel Node runtime invokes the Nest build as CommonJS. Assert that each
// workspace exposes a real CommonJS artifact rather than an ESM .js file.
for (const workspace of [
  '@zion/automation-engine',
  '@zion/translation-engine',
  '@zion/referral-engine',
]) {
  const exports = require(workspace);
  if (!exports || Object.keys(exports).length === 0) {
    throw new Error(`CommonJS workspace export is empty: ${workspace}`);
  }
}

const { createServer } = require('node:http');
const handler = require('../dist/apps/api/src/serverless.handler.js').default;

async function main() {
  const server = createServer((request, response) => {
    void handler(request, response);
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  try {
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('No TCP address assigned');
    const response = await fetch(`http://127.0.0.1:${address.port}/api/health`);
    const payload = await response.json();
    if (response.status !== 200 || payload.status !== 'ok' || payload.service !== 'zion-api') {
      throw new Error(`API smoke test failed: HTTP ${response.status}, body=${JSON.stringify(payload)}`);
    }
    console.log(`API serverless smoke test passed: HTTP ${response.status} ${payload.service}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
