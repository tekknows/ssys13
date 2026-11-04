const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');
const handleApiRequest = require('../api/[...path]');

test('Vercel API adapter routes health and administrator session requests to the backend', async (context) => {
  const server = http.createServer(handleApiRequest);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  context.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));

  const address = server.address();
  const healthResponse = await fetch(`http://127.0.0.1:${address.port}/api/health`);
  assert.equal(healthResponse.status, 200);
  assert.deepEqual(await healthResponse.json(), { ok: true, status: 'ok' });

  const response = await fetch(`http://127.0.0.1:${address.port}/api/admin/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    ok: false,
    error: 'Invalid administrator credentials.',
  });
});
