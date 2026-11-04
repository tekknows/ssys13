const http = require('node:http');
const { resolveSupabaseConfig, createSyncRequestPayload } = require('./supabase-sync');
const { supabase } = require('./supabase.js');
const {
  authenticateAdministrator,
  authenticateAgent,
  getAgentIncognitoPolicy,
  getIncognitoPolicySummary,
  issueAdministratorSession,
  updateIncognitoPolicy,
} = require('./incognito-policy');

function getRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    let oversized = false;
    req.on('data', (chunk) => {
      if (oversized) return;
      body += chunk;
      if (body.length > 1024 * 64) {
        oversized = true;
        body = '';
      }
    });
    req.on('end', () => {
      if (oversized) {
        reject(new Error('Request body is too large.'));
        return;
      }
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error('Request body must be valid JSON.'));
      }
    });
    req.on('error', reject);
  });
}

async function upsertTable(tableName, rows) {
  const records = Array.isArray(rows) ? rows.filter(Boolean) : [];
  if (!records.length) {
    return { tableName, upserted: 0 };
  }

  const conflictKey = records.some((row) => row && row.email) ? 'email' : 'id';
  const { error } = await supabase.from(tableName).upsert(records, { onConflict: conflictKey });
  if (error) {
    throw new Error(`Supabase write failed for ${tableName}: ${error.message}`);
  }

  return {
    tableName,
    upserted: records.length,
  };
}

async function syncStateToSupabase(state) {
  resolveSupabaseConfig(process.env);
  const payload = createSyncRequestPayload(state);

  const tableNames = [
    'settings',
    'employees',
    'devices',
    'replacements',
    'policies',
    'schedules',
    'usage',
    'analytics_snapshot',
    'notifications',
    'ticket_settings',
    'ticket_category_settings',
    'tickets',
    'changelog',
  ];

  const results = [];
  for (const tableName of tableNames) {
    const rows = payload[tableName] ?? [];
    if (Array.isArray(rows) && rows.length) {
      const result = await upsertTable(tableName, rows);
      results.push(result);
    } else if (rows && typeof rows === 'object') {
      const result = await upsertTable(tableName, [rows]);
      results.push(result);
    }
  }

  return {
    ok: true,
    syncedTables: results.map((item) => item.tableName),
    rowsUpdated: results.reduce((sum, item) => sum + Number(item.upserted || 0), 0),
  };
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(JSON.stringify(payload));
}

function applyCorsHeaders(req, res) {
  const origin = String(req.headers.origin || '');
  if (!origin) return true;

  const allowedOrigins = String(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (!allowedOrigins.includes(origin)) {
    sendJson(res, 403, { ok: false, error: 'This dashboard origin is not allowed.' });
    return false;
  }

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Max-Age', '600');
  res.setHeader('Vary', 'Origin');
  return true;
}

function getBearerToken(req) {
  const authorization = String(req.headers.authorization || '');
  const match = /^Bearer\s+([^\s]+)$/i.exec(authorization);
  return match ? match[1] : '';
}

async function handleManagementRequest(req, res, url) {
  if (req.method === 'POST' && url.pathname === '/api/admin/session') {
    const body = await getRequestBody(req);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      sendJson(res, 400, { ok: false, error: 'Request body must be a JSON object.' });
      return;
    }
    const token = await issueAdministratorSession(body.email, body.password);
    if (!token) {
      sendJson(res, 401, { ok: false, error: 'Invalid administrator credentials.' });
      return;
    }
    sendJson(res, 200, { ok: true, token });
    return;
  }

  if ((req.method === 'GET' || req.method === 'PUT') && url.pathname === '/api/incognito-policy') {
    const administrator = await authenticateAdministrator(getBearerToken(req));
    if (!administrator) {
      sendJson(res, 401, { ok: false, error: 'An active administrator session is required.' });
      return;
    }

    if (req.method === 'GET') {
      sendJson(res, 200, { ok: true, ...(await getIncognitoPolicySummary()) });
      return;
    }

    const body = await getRequestBody(req);
    if (!body || typeof body !== 'object' || Array.isArray(body) || typeof body.isEnabled !== 'boolean') {
      sendJson(res, 400, { ok: false, error: 'isEnabled must be a boolean.' });
      return;
    }
    sendJson(res, 200, {
      ok: true,
      ...(await updateIncognitoPolicy(body.isEnabled, administrator.email)),
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/agent/incognito-policy') {
    const deviceId = url.searchParams.get('deviceId') || '';
    const authenticated = await authenticateAgent(deviceId, getBearerToken(req));
    if (!authenticated) {
      sendJson(res, 401, { ok: false, error: 'The management agent is not authorized for this registered laptop.' });
      return;
    }
    sendJson(res, 200, { ok: true, ...(await getAgentIncognitoPolicy()) });
    return;
  }

  return false;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (!applyCorsHeaders(req, res)) return;
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    sendJson(res, 200, { ok: true, status: 'ok' });
    return;
  }

  if (url.pathname === '/api/admin/session'
    || url.pathname === '/api/incognito-policy'
    || url.pathname === '/api/agent/incognito-policy') {
    try {
      const handled = await handleManagementRequest(req, res, url);
      if (handled === false) {
        sendJson(res, 405, { ok: false, error: 'Method not allowed.' });
      }
    } catch (error) {
      if (error.message === 'Request body must be valid JSON.' || error.message === 'Request body is too large.') {
        sendJson(res, 400, { ok: false, error: error.message });
      } else {
        console.error('Incognito management API request failed.', error);
        sendJson(res, 503, { ok: false, error: 'The management service could not complete the request.' });
      }
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/supabase-sync') {
    try {
      const administrator = await authenticateAdministrator(getBearerToken(req));
      if (!administrator) {
        sendJson(res, 401, { ok: false, error: 'An active administrator session is required.' });
        return;
      }
      const requestBody = await getRequestBody(req);
      const payload = requestBody && requestBody.state ? requestBody.state : requestBody;
      const result = await syncStateToSupabase(payload || {});
      sendJson(res, 200, result);
    } catch (error) {
      sendJson(res, 500, {
        ok: false,
        error: error.message || 'Secure backend sync failed.',
      });
    }
    return;
  }

  sendJson(res, 404, {
    ok: false,
    error: 'Not found.',
  });
});

const port = Number(process.env.PORT || 3000);
if (require.main === module) {
  server.listen(port, () => {
    console.log(`Secure Supabase sync backend running on port ${port}`);
  });
}

module.exports = {
  handleManagementRequest,
  syncStateToSupabase,
  server,
};
