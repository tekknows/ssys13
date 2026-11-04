const crypto = require('node:crypto');
const { resolveSupabaseConfig } = require('./supabase-sync');

const POLICY_NAME = 'incognito_blocking';
const ADMIN_SESSION_TTL_SECONDS = 15 * 60;

function getAdminSessionSecret(env = process.env) {
  const secret = String(env.ADMIN_SESSION_SECRET || '');
  if (secret.length < 32) {
    throw new Error('ADMIN_SESSION_SECRET must contain at least 32 characters.');
  }
  return secret;
}

async function supabaseRequest(path, { method = 'GET', body, prefer } = {}, env = process.env) {
  const config = resolveSupabaseConfig(env);
  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Supabase request failed (${response.status}): ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

function equalSecret(actual, expected) {
  const actualBytes = Buffer.from(String(actual || ''));
  const expectedBytes = Buffer.from(String(expected || ''));
  return actualBytes.length === expectedBytes.length && crypto.timingSafeEqual(actualBytes, expectedBytes);
}

function normalizeRole(value) {
  return String(value || '').trim().toLowerCase();
}

async function getAdministratorByEmail(email, env = process.env) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail || normalizedEmail.length > 254) return null;

  const employees = await supabaseRequest(
    `employees?email=eq.${encodeURIComponent(normalizedEmail)}&select=id,email,role,account_role,is_active&limit=1`,
    {},
    env
  );
  const employee = Array.isArray(employees) ? employees[0] : null;
  if (!employee || employee.is_active === false) return null;

  const role = normalizeRole(employee.account_role || employee.role);
  if (role !== 'administrator' && role !== 'admin') return null;
  const credentials = await supabaseRequest(
    `user_credentials?email=eq.${encodeURIComponent(normalizedEmail)}&select=is_active&limit=1`,
    {},
    env
  );
  const credential = Array.isArray(credentials) ? credentials[0] : null;
  if (!credential || credential.is_active === false) return null;
  return employee;
}

async function issueAdministratorSession(email, password, env = process.env) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail || typeof password !== 'string' || password.length === 0 || password.length > 1024) {
    return null;
  }

  const credentials = await supabaseRequest(
    `user_credentials?email=eq.${encodeURIComponent(normalizedEmail)}&select=email,password_hash,is_active&limit=1`,
    {},
    env
  );
  const credential = Array.isArray(credentials) ? credentials[0] : null;
  if (!credential || credential.is_active === false) return null;

  const storedPassword = String(credential.password_hash || '').trim();
  const hashedPassword = crypto.createHash('sha256').update(password, 'utf8').digest('hex');
  if (!equalSecret(storedPassword.toLowerCase(), hashedPassword) && !equalSecret(storedPassword, password.trim())) {
    return null;
  }

  const employee = await getAdministratorByEmail(normalizedEmail, env);
  if (!employee) return null;
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    sub: normalizedEmail,
    exp: now + ADMIN_SESSION_TTL_SECONDS,
    iat: now,
  };
  const encodedClaims = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signature = crypto.createHmac('sha256', getAdminSessionSecret(env)).update(encodedClaims).digest('base64url');
  return `${encodedClaims}.${signature}`;
}

function verifyAdministratorSession(token, env = process.env) {
  if (typeof token !== 'string') return null;
  const [encodedClaims, signature, extra] = token.split('.');
  if (!encodedClaims || !signature || extra !== undefined) return null;
  const expectedSignature = crypto.createHmac('sha256', getAdminSessionSecret(env)).update(encodedClaims).digest('base64url');
  if (!equalSecret(signature, expectedSignature)) return null;

  try {
    const claims = JSON.parse(Buffer.from(encodedClaims, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (typeof claims.sub !== 'string' || !Number.isInteger(claims.exp) || claims.exp <= now) return null;
    return { email: claims.sub };
  } catch (error) {
    return null;
  }
}

async function authenticateAdministrator(token, env = process.env) {
  const session = verifyAdministratorSession(token, env);
  if (!session) return null;
  const employee = await getAdministratorByEmail(session.email, env);
  return employee ? { email: String(employee.email).trim().toLowerCase(), employeeId: employee.id } : null;
}

async function getIncognitoPolicySummary(env = process.env) {
  const [policyRows, registeredDevices] = await Promise.all([
    supabaseRequest(
      `system_policies?policy_name=eq.${POLICY_NAME}&select=is_enabled,updated_at,updated_by&limit=1`,
      {},
      env
    ),
    getRegisteredManagedDeviceCount(env),
  ]);
  if (!Array.isArray(policyRows) || !policyRows[0]) {
    throw new Error(`The ${POLICY_NAME} row is missing; apply the Incognito policy migration.`);
  }

  return {
    isEnabled: policyRows[0].is_enabled === true,
    updatedAt: policyRows[0].updated_at || null,
    registeredDevices,
  };
}

async function getRegisteredManagedDeviceCount(env = process.env) {
  const config = resolveSupabaseConfig(env);
  const url = `${config.url}/rest/v1/devices?is_registered=eq.true&email=not.is.null&mac_address=not.is.null&select=id`;
  const response = await fetch(url, {
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      Prefer: 'count=exact',
      Range: '0-0',
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase device count failed (${response.status}): ${text}`);
  }
  const contentRange = response.headers.get('content-range') || '';
  const match = /\/(\d+|\*)$/.exec(contentRange);
  if (!match) {
    throw new Error('Supabase did not return the exact registered device count.');
  }
  return match[1] === '*' ? 0 : Number(match[1]);
}

async function updateIncognitoPolicy(isEnabled, updatedBy, env = process.env) {
  await supabaseRequest('rpc/set_incognito_blocking_policy', {
    method: 'POST',
    body: {
      p_is_enabled: Boolean(isEnabled),
      p_updated_by: String(updatedBy || '').trim().toLowerCase(),
    },
  }, env);
  return getIncognitoPolicySummary(env);
}

async function authenticateAgent(deviceId, token, env = process.env) {
  const normalizedDeviceId = String(deviceId || '').trim();
  if (!normalizedDeviceId || normalizedDeviceId.length > 128 || !token) return false;
  const credentialRows = await supabaseRequest(
    `device_agent_credentials?device_id=eq.${encodeURIComponent(normalizedDeviceId)}&select=token_hash,is_active&limit=1`,
    {},
    env
  );
  const credential = Array.isArray(credentialRows) ? credentialRows[0] : null;
  if (!credential || credential.is_active !== true) return false;

  const actualHash = crypto.createHash('sha256').update(String(token), 'utf8').digest('hex');
  if (!equalSecret(credential.token_hash, actualHash)) return false;

  const devices = await supabaseRequest(
    `devices?id=eq.${encodeURIComponent(normalizedDeviceId)}&select=id,is_registered,email,mac_address&limit=1`,
    {},
    env
  );
  const device = Array.isArray(devices) ? devices[0] : null;
  return Boolean(device && device.is_registered === true && device.email && device.mac_address);
}

async function getAgentIncognitoPolicy(env = process.env) {
  const rows = await supabaseRequest(
    `system_policies?policy_name=eq.${POLICY_NAME}&select=is_enabled,updated_at&limit=1`,
    {},
    env
  );
  if (!Array.isArray(rows) || !rows[0]) {
    throw new Error(`The ${POLICY_NAME} row is missing; apply the Incognito policy migration.`);
  }
  return {
    policyName: POLICY_NAME,
    isEnabled: rows[0].is_enabled === true,
    updatedAt: rows[0].updated_at || null,
  };
}

module.exports = {
  ADMIN_SESSION_TTL_SECONDS,
  POLICY_NAME,
  authenticateAdministrator,
  authenticateAgent,
  equalSecret,
  getAdminSessionSecret,
  getAgentIncognitoPolicy,
  getIncognitoPolicySummary,
  getRegisteredManagedDeviceCount,
  issueAdministratorSession,
  supabaseRequest,
  updateIncognitoPolicy,
  verifyAdministratorSession,
};
