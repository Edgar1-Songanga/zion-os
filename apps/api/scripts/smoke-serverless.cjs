process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_PUBLISHABLE_KEY = 'ci-only-publishable-key';
process.env.ZION_ALLOWED_ORIGINS = 'http://localhost:3000';

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
