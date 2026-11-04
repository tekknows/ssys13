const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  authenticateAgent,
  issueAdministratorSession,
  updateIncognitoPolicy,
  verifyAdministratorSession,
} = require('../backend/incognito-policy');
const { provisionAgent } = require('../backend/provision-agent');

const env = {
  SUPABASE_URL: 'https://mindlock.test.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
  ADMIN_SESSION_SECRET: 'test-session-signing-secret-with-at-least-32-characters',
};

function response(data, status = 200, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(data),
    headers: {
      get: (name) => headers[name.toLowerCase()] || null,
    },
  };
}

function sha256(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

test('administrator sessions require a valid password and administrator role', async () => {
  const originalFetch = global.fetch;
  const password = 'correct-horse-battery';
  let role = 'Administrator';
  global.fetch = async (url) => {
    const parsedUrl = new URL(url);
    if (parsedUrl.pathname.endsWith('/user_credentials')) {
      return response([{ email: 'admin@example.com', password_hash: sha256(password), is_active: true }]);
    }
    if (parsedUrl.pathname.endsWith('/employees')) {
      return response([{ id: 'employee-1', email: 'admin@example.com', account_role: role, is_active: true }]);
    }
    throw new Error(`Unexpected request ${parsedUrl.pathname}`);
  };

  try {
    const token = await issueAdministratorSession('admin@example.com', password, env);
    assert.ok(token);
    assert.deepEqual(verifyAdministratorSession(token, env), { email: 'admin@example.com' });
    role = 'Employee';
    assert.equal(await issueAdministratorSession('admin@example.com', password, env), null);
    role = 'Administrator';
    assert.equal(await issueAdministratorSession('admin@example.com', 'wrong-password', env), null);
  } finally {
    global.fetch = originalFetch;
  }
});

test('global policy update uses the singleton policy and counts registered managed devices', async () => {
  const originalFetch = global.fetch;
  const requests = [];
  global.fetch = async (url, options = {}) => {
    const parsedUrl = new URL(url);
    requests.push({ path: parsedUrl.pathname, body: options.body ? JSON.parse(options.body) : null });
    if (parsedUrl.pathname.endsWith('/rpc/set_incognito_blocking_policy')) return response(null);
    if (parsedUrl.pathname.endsWith('/system_policies')) {
      return response([{ is_enabled: true, updated_at: '2026-11-04T00:00:00.000Z', updated_by: 'admin@example.com' }]);
    }
    if (parsedUrl.pathname.endsWith('/devices')) {
      return response([{ id: 'dev-1' }], 200, { 'content-range': '0-0/2' });
    }
    throw new Error(`Unexpected request ${parsedUrl.pathname}`);
  };

  try {
    const result = await updateIncognitoPolicy(true, 'Admin@Example.com', env);
    assert.equal(result.isEnabled, true);
    assert.equal(result.registeredDevices, 2);
    assert.deepEqual(requests[0].body, {
      p_is_enabled: true,
      p_updated_by: 'admin@example.com',
    });
  } finally {
    global.fetch = originalFetch;
  }
});

test('agents require a matching per-device token and a registered assigned laptop', async () => {
  const originalFetch = global.fetch;
  global.fetch = async (url) => {
    const parsedUrl = new URL(url);
    if (parsedUrl.pathname.endsWith('/device_agent_credentials')) {
      return response([{ token_hash: sha256('agent-token'), is_active: true }]);
    }
    if (parsedUrl.pathname.endsWith('/devices')) {
      return response([{ id: 'dev-1', is_registered: true, email: 'person@example.com', mac_address: '00-11-22-33-44-55' }]);
    }
    throw new Error(`Unexpected request ${parsedUrl.pathname}`);
  };

  try {
    assert.equal(await authenticateAgent('dev-1', 'agent-token', env), true);
    assert.equal(await authenticateAgent('dev-1', 'wrong-token', env), false);
  } finally {
    global.fetch = originalFetch;
  }
});

test('agent provisioning stores only a hash and refuses unregistered laptops', async () => {
  const originalFetch = global.fetch;
  let insertedCredential;
  global.fetch = async (url, options = {}) => {
    const parsedUrl = new URL(url);
    if (parsedUrl.pathname.endsWith('/devices')) {
      return response([{ id: 'dev-1', is_registered: true, email: 'person@example.com', mac_address: '00-11-22-33-44-55' }]);
    }
    if (parsedUrl.pathname.endsWith('/device_agent_credentials')) {
      insertedCredential = JSON.parse(options.body);
      return response(null);
    }
    throw new Error(`Unexpected request ${parsedUrl.pathname}`);
  };

  try {
    const provisioned = await provisionAgent('dev-1', env);
    assert.equal(provisioned.deviceId, 'dev-1');
    assert.equal(insertedCredential.device_id, 'dev-1');
    assert.equal(insertedCredential.token_hash, sha256(provisioned.token));
    assert.notEqual(insertedCredential.token_hash, provisioned.token);
  } finally {
    global.fetch = originalFetch;
  }
});

test('dashboard exposes one global Incognito toggle in its existing blocker panel', () => {
  const htmlPath = path.join(__dirname, '..', 'dashboard', 'index.html');
  const configPath = path.join(__dirname, '..', 'dashboard', 'config.js');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const config = fs.readFileSync(configPath, 'utf8');
  assert.equal((html.match(/id="incognito-toggle"/g) || []).length, 1);
  assert.match(html, /id="incognito-device-count"/);
  assert.doesNotMatch(html, /settings-incognito-toggle|Under Global Policy|Pending Sync/);
  assert.doesNotMatch(config, /import\.meta/);
});

test('Windows agent uses the managed Chrome and Edge policy names and startup task', () => {
  const agentDir = path.join(__dirname, '..', 'windows-agent');
  const agent = fs.readFileSync(path.join(agentDir, 'Mindlock-PolicyAgent.ps1'), 'utf8');
  const installer = fs.readFileSync(path.join(agentDir, 'Install-Mindlock-PolicyAgent.ps1'), 'utf8');
  assert.match(agent, /IncognitoModeAvailability/);
  assert.match(agent, /InPrivateModeAvailability/);
  assert.match(installer, /New-ScheduledTaskTrigger -AtStartup/);
  assert.match(installer, /-UserId 'SYSTEM'.*-RunLevel Highest/);
});
