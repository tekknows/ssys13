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
const { hashPassword, verifyPassword } = require('../backend/password');
const { getManagedDevicePolicyRecords, saveEmployeeAccount, stripSensitiveData } = require('../backend/server');
const { getChangelogRetentionCutoff } = require('../backend/changelog-retention');
const { createSyncRequestPayload } = require('../backend/supabase-sync');

test('administrator provisioned passwords use scrypt and verify correctly', () => {
  const hash = hashPassword('correct-horse-battery');
  assert.match(hash, /^scrypt\$/);
  assert.equal(verifyPassword('correct-horse-battery', hash), true);
  assert.equal(verifyPassword('incorrect-password', hash), false);
});

test('administrator provisioning requires at least 8 characters without a maximum', () => {
  const provisioner = fs.readFileSync(path.join(__dirname, '..', 'backend', 'provision-admin.js'), 'utf8');
  const auth = fs.readFileSync(path.join(__dirname, '..', 'backend', 'incognito-policy.js'), 'utf8');
  assert.match(provisioner, /password\.length < 8/);
  assert.doesNotMatch(provisioner, /password\.length\s*>/);
  assert.doesNotMatch(auth, /password\.length\s*>/);
});

test('secure state reads and writes omit credentials and device secrets', () => {
  assert.deepEqual(stripSensitiveData({
    email: 'admin@example.com',
    password_hash: 'hash',
    nested: { deviceSecret: 'secret', label: 'laptop' },
    access_token: 'token',
  }), {
    email: 'admin@example.com',
    nested: { label: 'laptop' },
  });
});

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
  global.fetch = async (url, options = {}) => {
    const parsedUrl = new URL(url);
    if (parsedUrl.pathname.endsWith('/user_credentials')) {
      if (options.method === 'PATCH') {
        return response([{ email: 'admin@example.com' }]);
      }
      return response(parsedUrl.searchParams.get('select').includes('password_hash')
        ? [{ email: 'admin@example.com', password_hash: sha256(password), is_active: true }]
        : [{ is_active: true }]);
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
  let savedPolicy;
  global.fetch = async (url, options = {}) => {
    const parsedUrl = new URL(url);
    requests.push({ path: parsedUrl.pathname, body: options.body ? JSON.parse(options.body) : null });
    if (parsedUrl.pathname.endsWith('/system_policies') && options.method === 'POST') {
      savedPolicy = requests.at(-1).body;
      return response(null);
    }
    if (parsedUrl.pathname.endsWith('/system_policies')) {
      return response([savedPolicy]);
    }
    if (parsedUrl.pathname.endsWith('/devices') && options.method === 'HEAD') {
      return response(null, 200, { 'content-range': '*/2' });
    }
    throw new Error(`Unexpected request ${parsedUrl.pathname}`);
  };

  try {
    const result = await updateIncognitoPolicy(true, 'Admin@Example.com', env);
    assert.equal(result.isEnabled, true);
    assert.equal(result.registeredDevices, 2);
    assert.equal(requests[0].path.endsWith('/system_policies'), true);
    assert.deepEqual(requests[0].body, {
      policy_name: 'incognito_blocking',
      is_enabled: true,
      updated_by: 'admin@example.com',
      updated_at: savedPolicy.updated_at,
    });
    assert.equal(requests[0].body.updated_at, result.updatedAt);
  } finally {
    global.fetch = originalFetch;
  }
});

test('agents require a matching per-device token and a registered assigned laptop', async () => {
  const originalFetch = global.fetch;
  let heartbeatUpdated = false;
  global.fetch = async (url, options = {}) => {
    const parsedUrl = new URL(url);
    if (parsedUrl.pathname.endsWith('/device_agent_credentials')) {
      return response([{ token_hash: sha256('agent-token'), is_active: true }]);
    }
    if (parsedUrl.pathname.endsWith('/devices')) {
      if (options.method === 'PATCH') {
        heartbeatUpdated = true;
        return response(null);
      }
      return response([{ id: 'dev-1', is_registered: true, email: 'person@example.com', mac_address: '00-11-22-33-44-55' }]);
    }
    throw new Error(`Unexpected request ${parsedUrl.pathname}`);
  };

  try {
    assert.equal(await authenticateAgent('dev-1', 'agent-token', env), true);
    assert.equal(heartbeatUpdated, true);
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

test('browser extension retrieves Incognito policy through its authenticated management API', () => {
  const background = fs.readFileSync(path.join(__dirname, '..', 'extension', 'background.js'), 'utf8');
  const policyMigration = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20261104172000_incognito_blocking.sql'), 'utf8');
  assert.match(background, /\/api\/agent\/incognito-policy\?deviceId=/);
  assert.doesNotMatch(background, /\/rest\/v1\/incognito_control/);
  assert.match(policyMigration, /revoke all on public\.incognito_control from anon;[\s\S]*revoke all on public\.incognito_control from authenticated;[\s\S]*revoke all on public\.incognito_control from PUBLIC;/);
  assert.doesNotMatch(policyMigration, /incognito_control_public_read/);
  assert.doesNotMatch(policyMigration, /create or replace function/i);
});

test('base database migration creates system tables with backend-only access', () => {
  const migration = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20261104160000_system_backend.sql'), 'utf8');
  for (const tableName of [
    'settings',
    'employees',
    'user_credentials',
    'employee_permissions',
    'devices',
    'policies',
    'blocking_policies',
    'schedules',
    'usage',
    'usage_events',
    'analytics_snapshot',
    'notifications',
    'ticket_settings',
    'ticket_category_settings',
    'tickets',
    'changelog',
  ]) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${tableName}\\b`));
  }
  assert.match(migration, /revoke all on public\\.%I from public, anon, authenticated/);
  assert.match(migration, /grant select, insert, update, delete on public\\.%I to service_role/);
  assert.match(migration, /create or replace function public\.save_employee_account/);
  assert.match(migration, /create or replace function public\.update_administrator_account/);
  assert.match(migration, /devices_registered_laptop_id_unique_idx/);
  assert.match(migration, /grant execute on function public\.save_employee_account[\s\S]*to service_role/);
  assert.match(migration, /grant execute on function public\.update_administrator_account[\s\S]*to service_role/);
});

test('employee and administrator account changes use authenticated transactional API routes', () => {
  const dashboard = fs.readFileSync(path.join(__dirname, '..', 'dashboard', 'app.js'), 'utf8');
  const backend = fs.readFileSync(path.join(__dirname, '..', 'backend', 'server.js'), 'utf8');
  assert.match(dashboard, /requestAdminApi\('\/api\/admin\/account'/);
  assert.match(dashboard, /previousEmail:/);
  assert.match(backend, /supabase\.rpc\('save_employee_account'/);
  assert.match(backend, /supabase\.rpc\('update_administrator_account'/);
  assert.doesNotMatch(dashboard, /\/rest\/v1\/user_credentials/);
});

test('update log retention cutoff honors UTC days and zero means keep forever', () => {
  const now = new Date('2026-11-06T15:45:00.000Z');
  assert.equal(getChangelogRetentionCutoff(30, now), '2026-10-07');
  assert.equal(getChangelogRetentionCutoff(0, now), null);
  assert.throws(() => getChangelogRetentionCutoff(-1, now), RangeError);
  assert.throws(() => getChangelogRetentionCutoff(1.5, now), RangeError);
});

test('dashboard does not generate or persist account credentials in browser state', () => {
  const dashboard = fs.readFileSync(path.join(__dirname, '..', 'dashboard', 'app.js'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '..', 'dashboard', 'index.html'), 'utf8');
  const backend = fs.readFileSync(path.join(__dirname, '..', 'backend', 'server.js'), 'utf8');
  assert.doesNotMatch(dashboard, /generateTemporaryEmployeePassword|secureHashString|accountPasswords|passwordHashes/);
  assert.match(dashboard, /removeClientCredentialData\(safeState, true\)/);
  assert.match(dashboard, /requestAdminApi\('\/api\/admin\/employees'/);
  assert.doesNotMatch(html, /generate-role-assignment-password|generate-employee-password/);
  assert.match(backend, /password \? hashPassword\(password\) : null/);
});

test('backend refuses privileged account creation without a supplied password', async () => {
  const originalFetch = global.fetch;
  const previousUrl = process.env.SUPABASE_URL;
  const previousSecret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const previousServerSecret = process.env.SUPABASE_SECRET_KEY;
  process.env.SUPABASE_URL = env.SUPABASE_URL;
  process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_SECRET_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  global.fetch = async (url) => {
    const parsedUrl = new URL(url);
    if (parsedUrl.pathname.endsWith('/user_credentials')) return response(null);
    throw new Error(`Unexpected request ${parsedUrl.pathname}`);
  };

  try {
    await assert.rejects(
      saveEmployeeAccount({ email: 'new-admin@example.com', accountRole: 'Administrator' }),
      (error) => error.statusCode === 400 && /password is required/.test(error.message),
    );
  } finally {
    global.fetch = originalFetch;
    if (previousUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = previousUrl;
    if (previousSecret === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousSecret;
    if (previousServerSecret === undefined) delete process.env.SUPABASE_SECRET_KEY;
    else process.env.SUPABASE_SECRET_KEY = previousServerSecret;
  }
});

test('update log retention settings are saved and cleanup is administrator-only', () => {
  const dashboard = fs.readFileSync(path.join(__dirname, '..', 'dashboard', 'app.js'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '..', 'dashboard', 'index.html'), 'utf8');
  const backend = fs.readFileSync(path.join(__dirname, '..', 'backend', 'server.js'), 'utf8');
  const migration = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20261106120000_changelog_retention.sql'), 'utf8');
  assert.match(html, /id="changelog-retention-days"/);
  assert.match(html, /id="changelog-auto-cleanup-enabled"/);
  assert.match(html, /id="changelog-run-cleanup"/);
  assert.match(dashboard, /changelogRetentionDays: 'changelog_retention_days'/);
  assert.match(dashboard, /changelogAutoCleanupEnabled: 'changelog_auto_cleanup_enabled'/);
  assert.match(dashboard, /normalizeChangelogEntries[\s\S]*?return Array\.from\(uniqueEntries\.values\(\)\)[\s\S]*?;/);
  assert.match(backend, /url\.pathname === '\/api\/admin\/changelog\/cleanup'[\s\S]*?authenticateAdministrator\(getBearerToken\(req\)\)/);
  assert.match(migration, /add column changelog_retention_days integer not null default 365/);
  assert.match(migration, /add column changelog_auto_cleanup_enabled boolean not null default true/);
  assert.match(migration, /check \(changelog_retention_days between 0 and 36500\)/);
  assert.doesNotMatch(migration, /^\s*(begin|commit)\s*;/im);
});

test('managed laptop policy sync adapts existing dashboard policies and scopes them to assigned employees', async () => {
  const originalFetch = global.fetch;
  const previousUrl = process.env.SUPABASE_URL;
  const previousSecret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_URL = env.SUPABASE_URL;
  process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  global.fetch = async (url) => {
    const parsedUrl = new URL(url);
    if (parsedUrl.pathname.endsWith('/devices')) {
      return response([{ id: 'device-1', employee_id: 'EMP-01', email: 'person@example.com' }]);
    }
    if (parsedUrl.pathname.endsWith('/blocking_policies')) return response([]);
    if (parsedUrl.pathname.endsWith('/policies')) {
      return response([
        {
          id: 'all-users',
          domain: 'example.com',
          is_enabled: true,
          data: { scope: 'all', schedule: { type: 'daily', start: '08:00', end: '17:00', days: ['Mon'] } },
        },
        {
          id: 'assigned-user',
          domain: 'private.example.com',
          is_enabled: true,
          user_ids: ['employee-db-id'],
          data: { scope: 'specific', enabled: false },
        },
        {
          id: 'other-user',
          domain: 'other.example.com',
          is_enabled: true,
          user_ids: ['another-employee'],
          data: { scope: 'specific' },
        },
      ]);
    }
    if (parsedUrl.pathname.endsWith('/employees')) {
      return response([{ id: 'employee-db-id', employee_id: 'EMP-01', email: 'person@example.com' }]);
    }
    throw new Error(`Unexpected request ${parsedUrl.pathname}`);
  };

  try {
    const result = await getManagedDevicePolicyRecords('device-1');
    assert.equal(result.error, null);
    assert.deepEqual(result.data.map((policy) => policy.id), ['all-users', 'assigned-user']);
    assert.equal(result.data[1].enabled, false);
    assert.deepEqual(result.data[0].schedule.days, ['Mon']);
    assert.equal(createSyncRequestPayload({ features: { incognitoBlocker: false } }).incognito_control, undefined);
  } finally {
    global.fetch = originalFetch;
    if (previousUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = previousUrl;
    if (previousSecret === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousSecret;
  }
});
