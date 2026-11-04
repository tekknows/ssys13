const crypto = require('node:crypto');
const { getSupabaseClient } = require('./supabase.js');
const { hashPassword, verifyPassword } = require('./password');

const POLICY_NAME = 'incognito_blocking';
const ADMIN_SESSION_TTL_SECONDS = 15 * 60;

function getAdminSessionSecret(env = process.env) {
  const secret = String(env.ADMIN_SESSION_SECRET || '');
  if (secret.length < 32) {
    throw new Error('ADMIN_SESSION_SECRET must contain at least 32 characters.');
  }
  return secret;
}

function equalSecret(actual, expected) {
  const actualBytes = Buffer.from(String(actual || ''));
  const expectedBytes = Buffer.from(String(expected || ''));
  return actualBytes.length === expectedBytes.length && crypto.timingSafeEqual(actualBytes, expectedBytes);
}

function normalizeRole(value) {
  return String(value || '').trim().toLowerCase();
}

async function findAdministrator(email, env = process.env) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail || normalizedEmail.length > 254) return null;

  const client = getSupabaseClient(env);
  const [employeeResult, credentialResult] = await Promise.all([
    client
      .from('employees')
      .select('id,email,role,account_role,is_active')
      .eq('email', normalizedEmail)
      .limit(1)
      .maybeSingle(),
    client
      .from('user_credentials')
      .select('is_active')
      .eq('email', normalizedEmail)
      .limit(1)
      .maybeSingle(),
  ]);
  if (employeeResult.error) throw employeeResult.error;
  if (credentialResult.error) throw credentialResult.error;

  const employee = employeeResult.data;
  const credential = credentialResult.data;
  const role = normalizeRole(employee?.account_role || employee?.role);
  if (!employee || employee.is_active === false || !credential || credential.is_active === false) return null;
  return role === 'administrator' || role === 'admin' ? employee : null;
}

async function issueAdministratorSession(email, password, env = process.env) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail || typeof password !== 'string' || password.length === 0) {
    return null;
  }

  const { data: credential, error } = await getSupabaseClient(env)
    .from('user_credentials')
    .select('email,password_hash,is_active')
    .eq('email', normalizedEmail)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!credential || credential.is_active === false) return null;

  if (!verifyPassword(password, credential.password_hash)) return null;
  if (!String(credential.password_hash || '').startsWith('scrypt$')) {
    const { data: upgraded, error: upgradeError } = await getSupabaseClient(env)
      .from('user_credentials')
      .update({ password_hash: hashPassword(password) })
      .eq('email', normalizedEmail)
      .eq('password_hash', credential.password_hash)
      .select('email')
      .maybeSingle();
    if (upgradeError) throw upgradeError;
    if (!upgraded) return null;
  }

  const employee = await findAdministrator(normalizedEmail, env);
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
  const employee = await findAdministrator(session.email, env);
  return employee ? { email: String(employee.email).trim().toLowerCase(), employeeId: employee.id } : null;
}

async function getRegisteredManagedDeviceCount(env = process.env) {
  const { count, error } = await getSupabaseClient(env)
    .from('devices')
    .select('id', { count: 'exact', head: true })
    .eq('is_registered', true)
    .not('email', 'is', null)
    .not('mac_address', 'is', null);
  if (error) throw error;
  if (!Number.isInteger(count)) {
    throw new Error('Supabase did not return the exact registered device count.');
  }
  return count;
}

async function getIncognitoPolicySummary(env = process.env) {
  const client = getSupabaseClient(env);
  const [policyResult, registeredDevices] = await Promise.all([
    client
      .from('system_policies')
      .select('is_enabled,updated_at,updated_by')
      .eq('policy_name', POLICY_NAME)
      .limit(1)
      .maybeSingle(),
    getRegisteredManagedDeviceCount(env),
  ]);
  if (policyResult.error) throw policyResult.error;
  if (!policyResult.data) {
    throw new Error(`The ${POLICY_NAME} row is missing; apply the Incognito policy migration.`);
  }

  return {
    isEnabled: policyResult.data.is_enabled === true,
    updatedAt: policyResult.data.updated_at || null,
    registeredDevices,
  };
}

async function updateIncognitoPolicy(isEnabled, updatedBy, env = process.env) {
  const { error } = await getSupabaseClient(env)
    .from('system_policies')
    .upsert({
      policy_name: POLICY_NAME,
      is_enabled: Boolean(isEnabled),
      updated_by: String(updatedBy || '').trim().toLowerCase(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'policy_name' });
  if (error) throw error;
  return getIncognitoPolicySummary(env);
}

async function authenticateAgent(deviceId, token, env = process.env) {
  const normalizedDeviceId = String(deviceId || '').trim();
  if (!normalizedDeviceId || normalizedDeviceId.length > 128 || !token) return false;

  const client = getSupabaseClient(env);
  const credentialResult = await client
    .from('device_agent_credentials')
    .select('token_hash,is_active')
    .eq('device_id', normalizedDeviceId)
    .limit(1)
    .maybeSingle();
  if (credentialResult.error) throw credentialResult.error;
  const credential = credentialResult.data;
  if (!credential || credential.is_active !== true) return false;

  const actualHash = crypto.createHash('sha256').update(String(token), 'utf8').digest('hex');
  if (!equalSecret(credential.token_hash, actualHash)) return false;

  const deviceResult = await client
    .from('devices')
    .select('id,is_registered,email,mac_address')
    .eq('id', normalizedDeviceId)
    .limit(1)
    .maybeSingle();
  if (deviceResult.error) throw deviceResult.error;
  const device = deviceResult.data;
  if (!device || device.is_registered !== true || !device.email || !device.mac_address) return false;

  const { error: syncError } = await client
    .from('devices')
    .update({ last_sync: new Date().toISOString() })
    .eq('id', normalizedDeviceId);
  if (syncError) throw syncError;
  return true;
}

async function getAgentIncognitoPolicy(env = process.env) {
  const { data, error } = await getSupabaseClient(env)
    .from('system_policies')
    .select('is_enabled,updated_at')
    .eq('policy_name', POLICY_NAME)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new Error(`The ${POLICY_NAME} row is missing; apply the Incognito policy migration.`);
  }
  return {
    policyName: POLICY_NAME,
    isEnabled: data.is_enabled === true,
    updatedAt: data.updated_at || null,
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
  updateIncognitoPolicy,
  verifyAdministratorSession,
};
