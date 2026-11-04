const http = require('node:http');
const { resolveSupabaseConfig, createSyncRequestPayload } = require('./supabase-sync');
const { supabase } = require('./supabase.js');
const { verifyPassword, hashPassword } = require('./password');
const { getChangelogRetentionCutoff } = require('./changelog-retention');
const {
  authenticateAdministrator,
  authenticateAgent,
  getAgentIncognitoPolicy,
  getIncognitoPolicySummary,
  issueAdministratorSession,
  updateIncognitoPolicy,
} = require('./incognito-policy');

const SYNC_TABLE_COLUMNS = {
  settings: ['id', 'admin_email', 'retention_date', 'accent_color', 'ticket_retention_days', 'disposal_retention_days', 'changelog_retention_days', 'changelog_auto_cleanup_enabled', 'features', 'created_at', 'updated_at', 'data'],
  employees: ['id', 'employee_id', 'name', 'surname', 'email', 'department', 'role', 'account_role', 'auth_user_id', 'is_active', 'created_at', 'updated_at', 'data'],
  devices: ['id', 'employee_id', 'employee_name', 'email', 'user_name', 'laptop_name', 'laptop_id', 'mac_address', 'purchased_at', 'last_sync', 'policy_version', 'is_registered', 'created_at', 'updated_at', 'data'],
  replacements: ['id', 'old_laptop_id', 'new_laptop_id', 'employee_id', 'replaced_at', 'reason', 'created_at', 'data'],
  policies: ['id', 'name', 'domain', 'url', 'category', 'is_enabled', 'user_ids', 'created_at', 'updated_at', 'data'],
  schedules: ['id', 'name', 'policy_id', 'employee_id', 'user_ids', 'days', 'start_time', 'end_time', 'starts_at', 'ends_at', 'is_enabled', 'created_at', 'updated_at', 'data'],
  usage: ['id', 'employee_id', 'device_id', 'user_name', 'mb_used', 'online_hours', 'recorded_at', 'data'],
  analytics_snapshot: ['id', 'daily', 'categories', 'weekly_usage', 'asset_status', 'updated_at', 'data'],
  notifications: ['id', 'title', 'message', 'type', 'is_read', 'employee_id', 'created_at', 'data'],
  ticket_settings: ['id', 'enabled', 'default_status', 'default_priority', 'ticket_id_format', 'default_assignment', 'support_instructions', 'message_retention_days', 'history_retention_days', 'resolved_ticket_retention_days', 'keep_messages_indefinitely', 'auto_cleanup_enabled', 'last_cleanup_date', 'next_scheduled_cleanup', 'last_cleanup_execution_key', 'cleanup_history', 'categories', 'priorities', 'statuses', 'notifications', 'workflow', 'security', 'updated_at', 'data'],
  ticket_category_settings: ['id', 'categories', 'updated_at'],
  tickets: ['id', 'ticket_number', 'title', 'description', 'category', 'priority', 'status', 'employee_id', 'employee_email', 'assigned_to', 'laptop_id', 'created_at', 'updated_at', 'resolved_at', 'messages', 'history', 'data'],
  changelog: ['id', 'version', 'date', 'title', 'changes', 'created_at', 'data'],
};

function createApiError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function getManagedDevicePolicyRecords(deviceId) {
  const [deviceResult, legacyResult, policiesResult] = await Promise.all([
    supabase.from('devices').select('id,employee_id,email').eq('id', deviceId).maybeSingle(),
    supabase
      .from('blocking_policies')
      .select('id,device_id,version,name,enabled,domains,schedule')
      .eq('device_id', deviceId)
      .order('version', { ascending: false }),
    supabase.from('policies').select('id,name,domain,is_enabled,user_ids,data,updated_at'),
  ]);
  const error = deviceResult.error || legacyResult.error || policiesResult.error;
  if (error) return { data: null, error };
  if (!deviceResult.data) return { data: legacyResult.data || [], error: null };

  const employeeQueries = [];
  if (deviceResult.data.email) {
    employeeQueries.push(
      supabase.from('employees').select('id,employee_id,email').eq('email', deviceResult.data.email).maybeSingle()
    );
  }
  if (deviceResult.data.employee_id) {
    employeeQueries.push(
      supabase.from('employees').select('id,employee_id,email').eq('employee_id', deviceResult.data.employee_id).maybeSingle(),
      supabase.from('employees').select('id,employee_id,email').eq('id', deviceResult.data.employee_id).maybeSingle()
    );
  }
  const employeeResults = await Promise.all(employeeQueries);
  const employeeError = employeeResults.find((result) => result.error)?.error;
  if (employeeError) return { data: null, error: employeeError };

  const assignedIdentities = new Set([
    deviceResult.data.employee_id,
    deviceResult.data.email && String(deviceResult.data.email).toLowerCase(),
    ...employeeResults.flatMap((result) => result.data
      ? [result.data.id, result.data.employee_id, String(result.data.email || '').toLowerCase()]
      : []),
  ].filter(Boolean).map(String));

  const assignedPolicies = (policiesResult.data || []).flatMap((policy) => {
    const data = policy.data && typeof policy.data === 'object' && !Array.isArray(policy.data)
      ? policy.data
      : {};
    const userIds = Array.isArray(policy.user_ids)
      ? policy.user_ids.map(String)
      : Array.isArray(data.userIds)
        ? data.userIds.map(String)
        : [];
    if (String(data.scope || 'all') === 'specific'
      && !userIds.some((identity) => assignedIdentities.has(identity))) {
      return [];
    }

    const domain = String(policy.domain || data.domain || '').trim();
    const domains = Array.isArray(data.domains) ? data.domains : (domain ? [domain] : []);
    if (!domains.length) return [];

    return [{
      id: policy.id,
      device_id: deviceId,
      version: Number(data.version) || 1,
      name: policy.name || data.name || domain || 'Website policy',
      enabled: data.enabled !== false && policy.is_enabled !== false,
      domains,
      schedule: data.schedule || {},
    }];
  });

  const merged = new Map();
  for (const policy of [...(legacyResult.data || []), ...assignedPolicies]) {
    merged.set(String(policy.id), policy);
  }
  return { data: [...merged.values()], error: null };
}

async function saveManagedDeviceUsageEvents(deviceId, events) {
  if (!Array.isArray(events) || events.length > 100) {
    throw new Error('events must be an array containing no more than 100 records.');
  }
  if (events.length === 0) return 0;

  const rows = events.map((event) => {
    if (!event || typeof event !== 'object' || Array.isArray(event)) {
      throw new Error('Each usage event must be an object.');
    }
    return {
      device_id: deviceId,
      domain: String(event.domain || '').slice(0, 253),
      timestamp: event.timestamp || event.recorded_at || new Date().toISOString(),
      duration_seconds: Number.isInteger(event.duration_seconds) && event.duration_seconds >= 0
        ? event.duration_seconds
        : 0,
      blocked: event.blocked === true,
      policy_id: event.policy_id ? String(event.policy_id).slice(0, 128) : null,
    };
  });
  const { error } = await supabase.from('usage_events').insert(rows);
  if (error) throw new Error(`Usage event write failed: ${error.message}`);
  return rows.length;
}

async function saveEmployeeAccount(input) {
  const email = String(input.email || '').trim().toLowerCase();
  const previousEmail = String(input.previousEmail || input.previous_email || '').trim().toLowerCase();
  const role = String(input.accountRole || input.account_role || input.role || 'Employee').trim();
  const password = typeof input.password === 'string' ? input.password : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw createApiError(400, 'Provide a valid employee email address.');
  if (previousEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(previousEmail)) {
    throw createApiError(400, 'Provide a valid previous employee email address.');
  }
  if (!['Administrator', 'IT Staff', 'Employee'].includes(role)) throw createApiError(400, 'Provide a valid employee role.');
  if (password && (password.length < 8 || password.length > 1024)) {
    throw createApiError(400, 'Employee passwords must contain between 8 and 1024 characters.');
  }
  if (['Administrator', 'IT Staff'].includes(role) && !password) {
    const lookupEmail = previousEmail || email;
    const { data: existingCredential, error: credentialError } = await supabase
      .from('user_credentials')
      .select('email')
      .eq('email', lookupEmail)
      .maybeSingle();
    if (credentialError) throw new Error(`Could not verify the existing employee credential: ${credentialError.message}`);
    if (!existingCredential) {
      throw createApiError(400, 'A password is required when creating a privileged account.');
    }
  }

  const { data, error } = await supabase.rpc('save_employee_account', {
    p_email: email,
    p_previous_email: previousEmail || null,
    p_employee_id: String(input.employeeId || input.employee_id || '').trim() || null,
    p_name: input.name === undefined ? null : String(input.name).trim(),
    p_surname: input.surname === undefined ? null : String(input.surname).trim(),
    p_department: input.department === undefined ? null : String(input.department).trim(),
    p_role: role === 'Administrator' ? 'Admin' : role,
    p_account_role: role,
    p_password_hash: password ? hashPassword(password) : null,
    p_is_active: input.is_active !== false,
  });
  if (error?.code === '23505') {
    throw createApiError(409, 'That email address or employee ID is already in use.');
  }
  if (error?.code === 'P0002') {
    throw createApiError(404, 'The employee being edited no longer exists.');
  }
  if (error) throw new Error(`Employee account write failed: ${error.message}`);
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Employee account write returned an invalid response.');
  }
  return data;
}

async function verifyAdministratorPassword(email, password) {
  const { data, error } = await supabase
    .from('user_credentials')
    .select('password_hash,is_active')
    .eq('email', email)
    .maybeSingle();
  if (error) throw new Error(`Could not verify account credentials: ${error.message}`);
  return Boolean(data && data.is_active !== false && verifyPassword(password, data.password_hash));
}

function stripSensitiveData(value) {
  if (Array.isArray(value)) return value.map(stripSensitiveData);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !/(password|secret|token|credential)/i.test(key))
    .map(([key, entry]) => [key, stripSensitiveData(entry)]));
}

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

  const allowedColumns = SYNC_TABLE_COLUMNS[tableName];
  if (!allowedColumns) {
    throw new Error(`Unsupported Supabase sync table: ${tableName}`);
  }
  const allowedColumnSet = new Set(allowedColumns);
  const normalizedRecords = records.map((record) => {
    const normalized = {};
    const additionalData = record.data && typeof record.data === 'object' && !Array.isArray(record.data)
      ? stripSensitiveData(record.data)
      : {};
    for (const [key, value] of Object.entries(record)) {
      if (key === 'data') continue;
      if (/(password|secret|token|credential)/i.test(key)) continue;
      if (allowedColumnSet.has(key)) normalized[key] = stripSensitiveData(value);
      else additionalData[key] = stripSensitiveData(value);
    }
    if (allowedColumnSet.has('data')) normalized.data = additionalData;
    return normalized;
  });
  const conflictKey = tableName === 'employees' ? 'email' : 'id';
  const { error } = await supabase.from(tableName).upsert(normalizedRecords, { onConflict: conflictKey });
  if (error) {
    throw new Error(`Supabase write failed for ${tableName}: ${error.message}`);
  }

  return {
    tableName,
    upserted: records.length,
  };
}

async function loadDashboardStateFromSupabase() {
  resolveSupabaseConfig(process.env);
  const tableNames = [
    'settings',
    'incognito_control',
    'employee_permissions',
    'employees',
    'devices',
    'replacements',
    'policies',
    'schedules',
    'usage',
    'analytics_snapshot',
    'notifications',
    'ticket_settings',
    'tickets',
    'changelog',
  ];

  const entries = await Promise.all(tableNames.map(async (tableName) => {
    const { data, error } = await supabase.from(tableName).select('*');
    if (error) throw new Error(`Supabase read failed for ${tableName}: ${error.message}`);
    return [tableName, stripSensitiveData(Array.isArray(data) ? data : [])];
  }));
  return Object.fromEntries(entries);
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

  const forwardedHost = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim();
  const requestHost = forwardedHost || String(req.headers.host || '').trim();
  const forwardedProtocol = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const requestProtocol = forwardedProtocol || (req.socket.encrypted ? 'https' : 'http');
  let isSameOrigin = false;
  if (requestHost) {
    try {
      isSameOrigin = new URL(origin).origin === new URL(`${requestProtocol}://${requestHost}`).origin;
    } catch (error) {
      isSameOrigin = false;
    }
  }

  const allowedOrigins = String(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (!isSameOrigin && !allowedOrigins.includes(origin)) {
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

  if (req.method === 'GET' && url.pathname === '/api/supabase-sync') {
    const administrator = await authenticateAdministrator(getBearerToken(req));
    if (!administrator) {
      sendJson(res, 401, { ok: false, error: 'An active administrator session is required.' });
      return;
    }
    sendJson(res, 200, { ok: true, state: await loadDashboardStateFromSupabase() });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/admin/changelog/cleanup') {
    const administrator = await authenticateAdministrator(getBearerToken(req));
    if (!administrator) {
      sendJson(res, 401, { ok: false, error: 'An active administrator session is required.' });
      return;
    }
    const body = await getRequestBody(req);
    if (!body || typeof body !== 'object' || Array.isArray(body)
      || !Number.isInteger(body.retentionDays) || body.retentionDays < 0 || body.retentionDays > 36500) {
      sendJson(res, 400, { ok: false, error: 'retentionDays must be an integer between 0 and 36500.' });
      return;
    }
    const cutoffDate = getChangelogRetentionCutoff(body.retentionDays);
    if (!cutoffDate) {
      sendJson(res, 200, { ok: true, deleted: 0, cutoffDate: null });
      return;
    }
    const { data, error, count } = await supabase
      .from('changelog')
      .delete({ count: 'exact' })
      .lt('date', cutoffDate)
      .select('id');
    if (error) throw new Error(`Update log cleanup failed: ${error.message}`);
    sendJson(res, 200, {
      ok: true,
      deleted: Number(count ?? data?.length ?? 0),
      cutoffDate,
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/admin/employees') {
    const administrator = await authenticateAdministrator(getBearerToken(req));
    if (!administrator) {
      sendJson(res, 401, { ok: false, error: 'An active administrator session is required.' });
      return;
    }
    const body = await getRequestBody(req);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      sendJson(res, 400, { ok: false, error: 'Request body must be an object.' });
      return;
    }
    sendJson(res, 200, { ok: true, employee: await saveEmployeeAccount(body) });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/admin/account/verify-password') {
    const administrator = await authenticateAdministrator(getBearerToken(req));
    if (!administrator) {
      sendJson(res, 401, { ok: false, error: 'An active administrator session is required.' });
      return;
    }
    const body = await getRequestBody(req);
    if (typeof body.password !== 'string' || !body.password) {
      sendJson(res, 400, { ok: false, error: 'password is required.' });
      return;
    }
    sendJson(res, 200, {
      ok: true,
      valid: await verifyAdministratorPassword(administrator.email, body.password),
    });
    return;
  }

  if (req.method === 'PUT' && url.pathname === '/api/admin/account') {
    const administrator = await authenticateAdministrator(getBearerToken(req));
    if (!administrator) {
      sendJson(res, 401, { ok: false, error: 'An active administrator session is required.' });
      return;
    }
    const body = await getRequestBody(req);
    const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
    const newPassword = typeof body.newPassword === 'string' && body.newPassword ? body.newPassword : currentPassword;
    const newEmail = String(body.newEmail || administrator.email).trim().toLowerCase();
    if (!currentPassword || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)
      || newPassword.length < 8 || newPassword.length > 1024) {
      sendJson(res, 400, { ok: false, error: 'Provide a valid email and password.' });
      return;
    }
    if (!await verifyAdministratorPassword(administrator.email, currentPassword)) {
      sendJson(res, 401, { ok: false, error: 'The current password is incorrect.' });
      return;
    }
    const { error: updateError } = await supabase.rpc('update_administrator_account', {
      p_current_email: administrator.email,
      p_new_email: newEmail,
      p_password_hash: hashPassword(newPassword),
    });
    if (updateError?.code === '23505') {
      sendJson(res, 409, { ok: false, error: 'That email address is already in use.' });
      return;
    }
    if (updateError) throw new Error(`Could not update administrator account: ${updateError.message}`);
    const token = await issueAdministratorSession(newEmail, newPassword);
    if (!token) throw new Error('Account updated, but a new session could not be issued.');
    sendJson(res, 200, { ok: true, email: newEmail, token });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/admin/account-exists') {
    const administrator = await authenticateAdministrator(getBearerToken(req));
    if (!administrator) {
      sendJson(res, 401, { ok: false, error: 'An active administrator session is required.' });
      return;
    }
    const email = String(url.searchParams.get('email') || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      sendJson(res, 400, { ok: false, error: 'Provide a valid email address.' });
      return;
    }
    const { data, error } = await supabase
      .from('user_credentials')
      .select('email')
      .eq('email', email)
      .maybeSingle();
    if (error) throw new Error(`Could not check account email: ${error.message}`);
    sendJson(res, 200, { ok: true, exists: Boolean(data) });
    return;
  }

  if (req.method === 'PUT' && url.pathname === '/api/admin/employee-permissions') {
    const administrator = await authenticateAdministrator(getBearerToken(req));
    if (!administrator) {
      sendJson(res, 401, { ok: false, error: 'An active administrator session is required.' });
      return;
    }
    const body = await getRequestBody(req);
    const employeeId = String(body.employeeId || '').trim();
    if (!employeeId || typeof body.canAccessAdmin !== 'boolean') {
      sendJson(res, 400, { ok: false, error: 'employeeId and boolean canAccessAdmin are required.' });
      return;
    }
    if (employeeId === String(administrator.employeeId)) {
      sendJson(res, 400, { ok: false, error: 'Administrators cannot change their own Admin UI permission.' });
      return;
    }
    const { data: target, error: targetError } = await supabase
      .from('employees')
      .select('id,is_active')
      .eq('id', employeeId)
      .maybeSingle();
    if (targetError) throw new Error(`Could not load employee: ${targetError.message}`);
    if (!target || target.is_active === false) {
      sendJson(res, 404, { ok: false, error: 'An active employee with that id was not found.' });
      return;
    }
    const { data: previous, error: previousError } = await supabase
      .from('employee_permissions')
      .select('permission_granted_at')
      .eq('employee_id', employeeId)
      .maybeSingle();
    if (previousError) throw new Error(`Could not load current permission: ${previousError.message}`);
    const grantedAt = body.canAccessAdmin
      ? previous?.permission_granted_at || new Date().toISOString()
      : previous?.permission_granted_at || null;
    const permission = {
      employee_id: employeeId,
      can_access_admin: body.canAccessAdmin,
      permission_granted_by: body.canAccessAdmin ? administrator.employeeId : null,
      permission_granted_at: grantedAt,
      updated_at: new Date().toISOString(),
    };
    const { error: permissionError } = await supabase
      .from('employee_permissions')
      .upsert(permission, { onConflict: 'employee_id' });
    if (permissionError) throw new Error(`Employee permission write failed: ${permissionError.message}`);
    sendJson(res, 200, { ok: true, permission });
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

  if (req.method === 'GET' && url.pathname === '/api/agent/blocking-policies') {
    const deviceId = url.searchParams.get('deviceId') || '';
    const authenticated = await authenticateAgent(deviceId, getBearerToken(req));
    if (!authenticated) {
      sendJson(res, 401, { ok: false, error: 'The management agent is not authorized for this registered laptop.' });
      return;
    }
    const { data, error } = await getManagedDevicePolicyRecords(deviceId);
    if (error) throw new Error(`Could not load assigned website policies: ${error.message}`);
    sendJson(res, 200, { ok: true, policies: data || [] });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/agent/usage-events') {
    const body = await getRequestBody(req);
    const deviceId = String(body.deviceId || '').trim();
    const authenticated = await authenticateAgent(deviceId, getBearerToken(req));
    if (!authenticated) {
      sendJson(res, 401, { ok: false, error: 'The management agent is not authorized for this registered laptop.' });
      return;
    }
    const inserted = await saveManagedDeviceUsageEvents(deviceId, body.events);
    sendJson(res, 200, { ok: true, inserted });
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

  if (req.method === 'GET' && (url.pathname === '/health' || url.pathname === '/api/health')) {
    sendJson(res, 200, { ok: true, status: 'ok' });
    return;
  }

  if (url.pathname === '/api/admin/session'
    || url.pathname === '/api/incognito-policy'
    || (req.method === 'GET' && url.pathname === '/api/supabase-sync')
    || url.pathname === '/api/admin/employees'
    || url.pathname === '/api/admin/changelog/cleanup'
    || url.pathname === '/api/admin/account/verify-password'
    || url.pathname === '/api/admin/account'
    || url.pathname === '/api/admin/account-exists'
    || url.pathname === '/api/admin/employee-permissions'
    || url.pathname === '/api/agent/incognito-policy'
    || url.pathname === '/api/agent/blocking-policies'
    || url.pathname === '/api/agent/usage-events') {
    try {
      const handled = await handleManagementRequest(req, res, url);
      if (handled === false) {
        sendJson(res, 405, { ok: false, error: 'Method not allowed.' });
      }
    } catch (error) {
      if (error.message === 'Request body must be valid JSON.' || error.message === 'Request body is too large.') {
        sendJson(res, 400, { ok: false, error: error.message });
      } else if (Number.isInteger(error.statusCode)) {
        sendJson(res, error.statusCode, { ok: false, error: error.message });
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
  getManagedDevicePolicyRecords,
  loadDashboardStateFromSupabase,
  saveManagedDeviceUsageEvents,
  saveEmployeeAccount,
  verifyAdministratorPassword,
  stripSensitiveData,
  syncStateToSupabase,
  server,
};
