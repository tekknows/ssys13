const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');
const handleApiRequest = require('../api/[...path]');
const handleAdminSessionRequest = require('../api/admin/session');

test('Vercel API adapter routes health and administrator session requests to the backend', async (context) => {
  const server = http.createServer((req, res) => {
    if (req.url === '/api/admin/session') {
      handleAdminSessionRequest(req, res);
      return;
    }
    handleApiRequest(req, res);
  });
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
    headers: {
      'Content-Type': 'application/json',
      Origin: `http://127.0.0.1:${address.port}`,
    },
    body: '{}',
  });

  assert.equal(response.status, 401);
  assert.equal(response.headers.get('access-control-allow-origin'), `http://127.0.0.1:${address.port}`);
  assert.deepEqual(await response.json(), {
    ok: false,
    error: 'Invalid administrator credentials.',
  });
});

test('Vercel API rejects unlisted cross-origin requests', async (context) => {
  const server = http.createServer(handleAdminSessionRequest);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  context.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));

  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/admin/session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://untrusted.example',
    },
    body: '{}',
  });

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), {
    ok: false,
    error: 'This dashboard origin is not allowed.',
  });
});
