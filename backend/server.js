const http = require('node:http');
const { resolveSupabaseConfig, createSyncRequestPayload } = require('./supabase-sync');

function getRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
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

async function upsertTable(config, tableName, rows) {
  const records = Array.isArray(rows) ? rows.filter(Boolean) : [];
  if (!records.length) {
    return { tableName, upserted: 0 };
  }

  const conflictKey = records.some((row) => row && row.email) ? 'email' : 'id';
  const url = `${config.url}/rest/v1/${tableName}?on_conflict=${encodeURIComponent(conflictKey)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(records),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Supabase write failed for ${tableName}: ${response.status} ${text}`);
  }

  return {
    tableName,
    upserted: records.length,
    raw: text,
  };
}

async function syncStateToSupabase(state) {
  const config = resolveSupabaseConfig(process.env);
  const payload = createSyncRequestPayload(state);

  const tableNames = [
    'settings',
    'incognito_control',
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
      const result = await upsertTable(config, tableName, rows);
      results.push(result);
    } else if (rows && typeof rows === 'object') {
      const result = await upsertTable(config, tableName, [rows]);
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
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'GET' && url.pathname === '/health') {
    sendJson(res, 200, { ok: true, status: 'ok' });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/supabase-sync') {
    try {
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
server.listen(port, () => {
  console.log(`Secure Supabase sync backend running on http://localhost:${port}`);
});

module.exports = {
  syncStateToSupabase,
  server,
};
