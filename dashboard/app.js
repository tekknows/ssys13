const STORAGE_KEY = 'site-blocker-admin-demo';
const LOGIN_STORAGE_KEY = 'site-blocker-admin-auth';
const AUTH_SESSION_KEY = 'site-blocker-admin-session';
const CHANGELOG_SESSION_KEY = 'site-blocker-changelog-session';
const THEME_STORAGE_KEY = 'site-blocker-admin-theme';
const LOGIN_THEME_STORAGE_KEY = 'site-blocker-login-theme';
const SHARED_TICKETS_KEY = 'mindlock-shared-tickets';
const DEFAULT_ACCENT_COLOR = '#555555';
const DEFAULT_ADMIN_EMAIL = 'admin@sys13.com';
const DEFAULT_ADMIN_PASSWORD = 'admin123';
const APP_VERSION = 'v1.5.1';
const APP_RELEASE_DATE = '2026-11-04';
const MAX_CHANGELOG_ENTRIES = 20;
const DEFAULT_SYNC_IDS = {
  settings: '10000000-0000-4000-8000-000000000001',
  analyticsSnapshot: '10000000-0000-4000-8000-000000000002',
  ticketSettings: '10000000-0000-4000-8000-000000000003',
  incognitoControl: 1,
};
let incognitoControlSyncSucceeded = null;

const demoState = {
  devices: [],
  employees: [],
  replacements: [],
  settings: {
    adminEmail: '',
    retentionDate: '2026-10-01',
    accentColor: DEFAULT_ACCENT_COLOR,
    ticketRetentionDays: 3,
  },
  tickets: [],
  policies: [],
  schedules: [],
  usage: [],
  analytics: {
    daily: [0, 0, 0, 0, 0, 0, 0],
    categories: [0, 0, 0, 0],
    weeklyUsage: [0, 0, 0, 0, 0, 0, 0],
    assetStatus: [0, 0, 0, 0],
  },
  features: {
    incognitoBlocker: true,
  },
  notifications: [],
  ticketSettings: {
    enabled: true,
    defaultStatus: 'Open',
    defaultPriority: 'Medium',
    ticketIdFormat: 'TKT-2026-0001',
    defaultAssignment: 'IT Support',
    supportInstructions: 'Contact the IT support desk for hardware, website, extension, or access issues.',
    categories: [
      { id: 'hardware', name: 'Hardware', active: true },
      { id: 'software', name: 'Software', active: true },
      { id: 'browser-extension', name: 'Browser Extension', active: true },
      { id: 'website-blocking', name: 'Website Blocking', active: true },
      { id: 'network', name: 'Network / Internet', active: true },
      { id: 'other', name: 'Other', active: true },
    ],
    priorities: ['Low', 'Medium', 'High', 'Critical'],
    statuses: [
      { name: 'Open', order: 1, allowedNext: ['In Progress', 'Waiting for Employee', 'Closed'] },
      { name: 'In Progress', order: 2, allowedNext: ['Waiting for Employee', 'Resolved', 'Closed'] },
      { name: 'Waiting for Employee', order: 3, allowedNext: ['In Progress', 'Resolved', 'Closed'] },
      { name: 'Resolved', order: 4, allowedNext: ['Closed', 'Reopened'] },
      { name: 'Closed', order: 5, allowedNext: ['Reopened'] },
    ],
    messageRetentionDays: 30,
    historyRetentionDays: 90,
    resolvedTicketRetentionDays: 3,
    keepMessagesIndefinitely: false,
    autoCleanupEnabled: true,
    lastCleanupDate: null,
    nextScheduledCleanup: null,
    lastCleanupExecutionKey: null,
    cleanupHistory: [],
    notifications: {
      newTicket: true,
      highPriority: true,
      newEmployeeMessage: true,
      ticketAssigned: true,
      statusChanged: true,
      ticketResolved: true,
    },
    workflow: {
      defaultITStaff: 'IT Support',
      allowEmployeeReopen: true,
      allowEmployeeMessagesAfterClose: false,
      allowITReopen: true,
      requireResolutionNotes: false,
    },
    security: {
      adminOnlySettings: true,
      restrictManagementByRole: true,
    },
  },
  appVersion: {
    current: APP_VERSION,
    releasedAt: APP_RELEASE_DATE,
  },
  changelog: [
    {
      version: 'v1.5.1',
      date: '2026-11-04',
      title: 'Faster Incognito blocking',
      changes: [
        'Closes new Incognito tabs immediately using the latest synced admin setting.',
        'Refreshes the admin policy after each new Incognito tab opens.',
      ],
    },
    {
      version: 'v1.5.0',
      date: '2026-11-04',
      title: 'Incognito blocking enforcement',
      changes: [
        'Added admin-controlled Incognito tab closing for connected browsers.',
        'Added status guidance for the required browser Incognito extension permission.',
        'Updated the extension download package and version to 1.5.0.',
      ],
    },
    {
      version: 'v1.4.0',
      date: '2026-11-03',
      title: 'Update log and extension improvements',
      changes: [
        'Added editable, retention-limited update log entries.',
        'Improved the extension ticket shortcut and hidden-scrollbar layout.',
        'Updated the admin dashboard and extension version to 1.4.0.',
      ],
    },
    {
      version: 'v1.3.0',
      date: '2026-10-28',
      title: 'Stability and backend alignment update',
      changes: [
        'Aligned the front-end model with the backend and SQL field structure.',
        'Fixed the dashboard action button event binding so ticket buttons respond properly.',
        'Updated login enforcement and access routing for direct dashboard access.',
        'Improved retention cleanup and retention-history flow consistency.',
      ],
    },
    {
      version: 'v1.2.0',
      date: '2026-10-28',
      title: 'Ticket and policy messaging update',
      changes: [
        'Added employee-to-admin messaging inside the ticket module.',
        'Updated policy filtering to include active and inactive states.',
        'Improved the sidebar control and dark-mode styling for navigation.',
      ],
    },
    {
      version: 'v1.1.0',
      date: '2026-10-20',
      title: 'Website blocking controls',
      changes: [
        'Introduced scoped website blocking for all users and specific employees.',
        'Added schedule-based blocking rules for recurring policy windows.',
        'Improved device assignment and registration validation.',
      ],
    },
    {
      version: 'v1.0.0',
      date: '2026-10-05',
      title: 'Initial system launch',
      changes: [
        'Deployed the admin dashboard and employee device tracking.',
        'Added website blocking, tickets, and laptop management modules.',
        'Launched the extension-based employee reporting workflow.',
      ],
    },
  ],
};

const FRONTEND_TO_BACKEND_FIELD_MAP = {
  settings: {
    adminEmail: 'admin_email',
    retentionDate: 'retention_date',
    accentColor: 'accent_color',
    ticketRetentionDays: 'ticket_retention_days',
    disposalRetentionDays: 'disposal_retention_days',
    features: 'features',
  },
  employees: {
    employeeId: 'employee_id',
    accountRole: 'account_role',
  },
  devices: {
    user: 'user_name',
    laptopName: 'laptop_name',
    laptopId: 'laptop_id',
    macAddress: 'mac_address',
    purchasedAt: 'purchased_at',
    lastSync: 'last_sync',
    policyVersion: 'policy_version',
    isRegistered: 'is_registered',
    employeeId: 'employee_id',
  },
  replacements: {
    oldLaptopId: 'old_laptop_id',
    newLaptopId: 'new_laptop_id',
  },
  policies: {
    userIds: 'user_ids',
  },
  usage: {
    user: 'user_name',
    mbUsed: 'mb_used',
    onlineHours: 'online_hours',
    recordedAt: 'recorded_at',
  },
  analytics: {
    weeklyUsage: 'weekly_usage',
    assetStatus: 'asset_status',
  },
  ticketSettings: {
    enabled: 'enabled',
    defaultStatus: 'default_status',
    defaultPriority: 'default_priority',
    ticketIdFormat: 'ticket_id_format',
    defaultAssignment: 'default_assignment',
    supportInstructions: 'support_instructions',
    messageRetentionDays: 'message_retention_days',
    historyRetentionDays: 'history_retention_days',
    resolvedTicketRetentionDays: 'resolved_ticket_retention_days',
    keepMessagesIndefinitely: 'keep_messages_indefinitely',
    autoCleanupEnabled: 'auto_cleanup_enabled',
    lastCleanupDate: 'last_cleanup_date',
    nextScheduledCleanup: 'next_scheduled_cleanup',
    lastCleanupExecutionKey: 'last_cleanup_execution_key',
    cleanupHistory: 'cleanup_history',
    categories: 'categories',
    priorities: 'priorities',
    statuses: 'statuses',
  },
  tickets: {
    laptopId: 'laptop_id',
    createdAt: 'created_at',
    resolvedAt: 'resolved_at',
  },
};

const BACKEND_TO_FRONTEND_FIELD_MAP = Object.fromEntries(
  Object.entries(FRONTEND_TO_BACKEND_FIELD_MAP).flatMap(([groupName, mapping]) =>
    Object.entries(mapping).map(([frontendKey, backendKey]) => [backendKey, frontendKey])
  )
);

function remapFields(value, mapping, direction = 'toBackend') {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((entry) => remapFields(entry, mapping, direction));
  if (typeof value !== 'object') return value;

  const result = {};
  const entries = Object.entries(value);

  entries.forEach(([key, entryValue]) => {
    const targetKey = direction === 'toBackend' ? (mapping[key] || key) : (BACKEND_TO_FRONTEND_FIELD_MAP[key] || key);
    result[targetKey] = remapFields(entryValue, mapping, direction);
  });

  return result;
}

function mapFrontendStateToBackend(stateSource) {
  const source = stateSource || state || {};
  const mapped = {};

  const tableGroups = [
    ['settings', source.settings, FRONTEND_TO_BACKEND_FIELD_MAP.settings],
    ['employees', source.employees, FRONTEND_TO_BACKEND_FIELD_MAP.employees],
    ['devices', source.devices, FRONTEND_TO_BACKEND_FIELD_MAP.devices],
    ['replacements', source.replacements, FRONTEND_TO_BACKEND_FIELD_MAP.replacements],
    ['policies', source.policies, FRONTEND_TO_BACKEND_FIELD_MAP.policies],
    ['schedules', source.schedules, {}],
    ['usage', source.usage, FRONTEND_TO_BACKEND_FIELD_MAP.usage],
    ['analytics_snapshot', source.analytics, FRONTEND_TO_BACKEND_FIELD_MAP.analytics],
    ['ticket_settings', source.ticketSettings, FRONTEND_TO_BACKEND_FIELD_MAP.ticketSettings],
    ['tickets', source.tickets, FRONTEND_TO_BACKEND_FIELD_MAP.tickets],
    ['changelog', source.changelog, {}],
  ];

  tableGroups.forEach(([tableName, value, mapping]) => {
    if (!value) return;
    if (Array.isArray(value)) {
      mapped[tableName] = value.map((entry) => remapFields(entry, mapping, 'toBackend'));
      return;
    }
    mapped[tableName] = remapFields(value, mapping, 'toBackend');
  });

  if (mapped.settings && typeof mapped.settings === 'object') {
    mapped.settings.id = mapped.settings.id || DEFAULT_SYNC_IDS.settings;
    mapped.settings.features = source.features || mapped.settings.features || {};
  }
  mapped.incognito_control = {
    id: DEFAULT_SYNC_IDS.incognitoControl,
    enabled: Boolean(source.features?.incognitoBlocker ?? mapped.settings?.features?.incognitoBlocker ?? true),
  };
  if (mapped.analytics_snapshot && typeof mapped.analytics_snapshot === 'object') {
    mapped.analytics_snapshot.id = mapped.analytics_snapshot.id || DEFAULT_SYNC_IDS.analyticsSnapshot;
  }
  if (mapped.ticket_settings && typeof mapped.ticket_settings === 'object') {
    mapped.ticket_settings.id = mapped.ticket_settings.id || DEFAULT_SYNC_IDS.ticketSettings;
    mapped.ticket_category_settings = {
      id: 1,
      categories: Array.isArray(mapped.ticket_settings.categories) ? mapped.ticket_settings.categories : [],
    };
  }
  if (Array.isArray(mapped.changelog)) {
    mapped.changelog = mapped.changelog.map((entry) => ({ ...entry, id: entry.id || entry.version }));
  }

  if (source.notifications && Array.isArray(source.notifications)) {
    mapped.notifications = source.notifications.map((entry) => ({ ...entry }));
  }

  return mapped;
}

function mapBackendStateToFrontend(payload) {
  const source = payload || {};
  const mapped = {};

  const tableGroups = [
    ['settings', source.settings, FRONTEND_TO_BACKEND_FIELD_MAP.settings],
    ['employees', source.employees, FRONTEND_TO_BACKEND_FIELD_MAP.employees],
    ['devices', source.devices, FRONTEND_TO_BACKEND_FIELD_MAP.devices],
    ['replacements', source.replacements, FRONTEND_TO_BACKEND_FIELD_MAP.replacements],
    ['policies', source.policies, FRONTEND_TO_BACKEND_FIELD_MAP.policies],
    ['schedules', source.schedules, {}],
    ['usage', source.usage, FRONTEND_TO_BACKEND_FIELD_MAP.usage],
    ['analytics', source.analytics_snapshot, FRONTEND_TO_BACKEND_FIELD_MAP.analytics],
    ['ticketSettings', source.ticket_settings, FRONTEND_TO_BACKEND_FIELD_MAP.ticketSettings],
    ['tickets', source.tickets, FRONTEND_TO_BACKEND_FIELD_MAP.tickets],
    ['changelog', source.changelog, {}],
  ];

  tableGroups.forEach(([tableName, value, mapping]) => {
    if (!value) return;
    if (Array.isArray(value)) {
      mapped[tableName] = value.map((entry) => remapFields(entry, mapping, 'fromBackend'));
      return;
    }
    mapped[tableName] = remapFields(value, mapping, 'fromBackend');
  });

  if (mapped.settings && typeof mapped.settings === 'object' && mapped.settings.features) {
    mapped.features = mapped.settings.features;
  }

  if (source.notifications && Array.isArray(source.notifications)) {
    mapped.notifications = source.notifications.map((entry) => ({ ...entry }));
  }

  return mapped;
}

window.sys13DataBindings = {
  frontendToBackend: mapFrontendStateToBackend,
  backendToFrontend: mapBackendStateToFrontend,
};

let state = loadState();
let policyStatusFilter = 'active';

function syncPolicyFilterButtons(selectedFilter = policyStatusFilter) {
  const buttons = document.querySelectorAll('[data-policy-filter]');
  const normalized = selectedFilter === 'inactive' ? 'inactive' : 'active';

  buttons.forEach((button) => {
    const isActive = (button.dataset.policyFilter || 'active') === normalized;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });

  const control = document.querySelector('.segmented-control');
  if (control) {
    control.dataset.state = normalized;
  }

  policyStatusFilter = normalized;
}

function setPolicyFilter(selectedFilter) {
  const normalized = selectedFilter === 'inactive' ? 'inactive' : 'active';
  policyStatusFilter = normalized;
  syncPolicyFilterButtons(normalized);
  renderPolicies();
}

function getDefaultEmployeeAccessRole(employee) {
  const role = String(employee?.role || '').toLowerCase();
  if (role.includes('admin') || role.includes('administrator')) return 'Administrator';
  if (role.includes('support') || role.includes('it') || role.includes('technician')) return 'IT Staff';
  return 'Employee';
}

function normalizeAccountRole(roleName) {
  const normalized = String(roleName || '').trim().toLowerCase();
  if (normalized === 'admin' || normalized === 'administrator') return 'Administrator';
  if (normalized === 'it staff') return 'IT Staff';
  if (normalized === 'employee') return 'Employee';
  return '';
}

function getEmployeeFullName(employee) {
  const name = String(employee?.name || '').trim();
  const surname = String(employee?.surname || '').trim();
  return [name, surname].filter(Boolean).join(' ');
}

function getEmployeeRoleCategory(employee) {
  const accountRole = normalizeAccountRole(employee?.accountRole)
    || normalizeAccountRole(employee?.account_role)
    || normalizeAccountRole(employee?.role)
    || getDefaultEmployeeAccessRole(employee);
  return accountRole === 'Administrator' ? 'Admin' : accountRole;
}

function isPrivilegedAccountRole(roleName) {
  const normalized = String(roleName || '').trim();
  return normalized === 'Administrator' || normalized === 'Admin' || normalized === 'IT Staff';
}

function generateTemporaryEmployeePassword() {
  const prefix = 'Sys13';
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  const number = String(Math.floor(100 + Math.random() * 900));
  return `${prefix}-${suffix}${number}!`;
}

function normalizeEmployeeRoles() {
  if (!Array.isArray(state.employees)) return;
  state.employees = state.employees.map((employee) => {
    const accountRole = normalizeAccountRole(employee.accountRole)
      || normalizeAccountRole(employee.account_role)
      || getDefaultEmployeeAccessRole(employee);
    return {
      ...employee,
      name: getEmployeeFullName(employee),
      surname: '',
      role: accountRole === 'Administrator' ? 'Admin' : accountRole,
      accountRole,
    };
  });
}

function secureHashString(value) {
  const text = String(value || '');
  if (!text) return '';

  if (window.crypto && window.crypto.subtle) {
    const bytes = new TextEncoder().encode(text);
    return window.crypto.subtle.digest('SHA-256', bytes).then((buffer) =>
      Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
    );
  }

  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return Promise.resolve(hash.toString(16).padStart(8, '0'));
}

function buildEmployeePermissionRecord({
  employeeId,
  canAccessAdmin,
  permissionGrantedBy = null,
  permissionGrantedAt = null,
  updatedAt = null,
} = {}) {
  return {
    employee_id: employeeId || null,
    can_access_admin: Boolean(canAccessAdmin),
    permission_granted_by: permissionGrantedBy || null,
    permission_granted_at: permissionGrantedAt || null,
    updated_at: updatedAt || new Date().toISOString(),
  };
}

function resolvePermissionState(permissionRecord = {}) {
  const canAccess = Boolean(permissionRecord.can_access_admin ?? permissionRecord.canAccessAdmin ?? false);
  if (canAccess) {
    return {
      accessAllowed: true,
      permissionLabel: 'Granted',
      statusClass: 'online',
    };
  }

  return {
    accessAllowed: false,
    permissionLabel: permissionRecord.permission_granted_at ? 'Revoked' : 'Not granted',
    statusClass: 'offline',
  };
}

async function hydrateEmployeePermissionsFromSupabase() {
  const client = getSupabaseClient();
  if (!client) {
    state.employeePermissions = [];
    return [];
  }

  try {
    const { data, error } = await client
      .from('employee_permissions')
      .select('*');

    if (error) {
      throw error;
    }

    state.employeePermissions = Array.isArray(data) ? data : [];
    return state.employeePermissions;
  } catch (error) {
    console.warn('Unable to load employee permissions from Supabase.', error);
    state.employeePermissions = [];
    return [];
  }
}

async function getEmployeePermissionRecord(employeeId) {
  const client = getSupabaseClient();
  if (!client || !employeeId) return null;

  try {
    const { data, error } = await client
      .from('employee_permissions')
      .select('*')
      .eq('employee_id', employeeId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data || null;
  } catch (error) {
    console.warn('Unable to look up employee permission.', error);
    return null;
  }
}

async function getCurrentUserEmployeeRecord() {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const sessionUser = getCurrentSessionUser();
    const email = String(sessionUser?.email || '').trim().toLowerCase();
    if (!email) {
      return null;
    }

    const { data, error } = await client
      .from('employees')
      .select('id, email, auth_user_id, role, account_role, is_active')
      .eq('email', email)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data || null;
  } catch (error) {
    console.warn('Unable to load the current employee profile.', error);
    return null;
  }
}

async function currentSessionHasAdminAccessPermission() {
  const employee = await getCurrentUserEmployeeRecord();
  if (!employee) return false;
  if (employee.is_active === false) return false;

  const roleName = String(employee.account_role || employee.role || '').trim();
  if (roleName === 'Administrator') {
    return true;
  }

  const permission = await getEmployeePermissionRecord(employee.id);
  return Boolean(permission && permission.can_access_admin === true);
}

async function updateEmployeeAdminAccessPermission(employeeId, canAccessAdmin) {
  const client = getSupabaseClient();
  if (!client || !employeeId) {
    throw new Error('No active Supabase session or employee was selected.');
  }

  const currentEmployee = await getCurrentUserEmployeeRecord();
  if (!currentEmployee) {
    throw new Error('The current admin user profile could not be resolved.');
  }

  const targetEmployee = state.employees.find((employee) => employee.id === employeeId) || null;
  if (!targetEmployee) {
    throw new Error('The target employee could not be found.');
  }

  if (targetEmployee.is_active === false || targetEmployee.isActive === false) {
    throw new Error('Only active employees may receive Admin UI access.');
  }

  if (currentEmployee.id === targetEmployee.id && canAccessAdmin) {
    throw new Error('Employees cannot grant Admin UI access to themselves.');
  }

  const existingPermission = await getEmployeePermissionRecord(targetEmployee.id);
  const nextPermission = buildEmployeePermissionRecord({
    employeeId: targetEmployee.id,
    canAccessAdmin,
    permissionGrantedBy: canAccessAdmin ? currentEmployee.id : existingPermission?.permission_granted_by || null,
    permissionGrantedAt: canAccessAdmin ? (existingPermission?.permission_granted_at || new Date().toISOString()) : (existingPermission?.permission_granted_at || null),
    updatedAt: new Date().toISOString(),
  });

  const { error } = await client
    .from('employee_permissions')
    .upsert(nextPermission, { onConflict: 'employee_id' });

  if (error) {
    throw error;
  }

  await hydrateEmployeePermissionsFromSupabase();
  return nextPermission;
}

function ensureAccountSecurityState() {
  state.security = state.security || {};
  state.security.passwordHashes = state.security.passwordHashes || {};
  state.security.accountPasswords = state.security.accountPasswords || {};
}

async function linkEmployeeToSupabaseAuth(employeeRecord, passwordOverride = '') {
  const client = getSupabaseClient();
  if (!client) {
    return null;
  }

  const normalizedEmail = String(employeeRecord?.email || '').trim().toLowerCase();
  const normalizedPassword = String(passwordOverride || employeeRecord?.password || '').trim();
  const normalizedRole = normalizeAccountRole(employeeRecord?.accountRole || employeeRecord?.role) || 'Employee';
  const normalizedName = String(employeeRecord?.name || '').trim();
  const normalizedSurname = String(employeeRecord?.surname || '').trim();
  const employeeKey = String(employeeRecord?.employeeId || employeeRecord?.employee_id || '').trim();

  if (!normalizedEmail || !normalizedPassword) {
    return null;
  }

  try {
    const employeeLookup = await client
      .from('employees')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (employeeLookup.error && employeeLookup.error.code !== 'PGRST116') {
      throw employeeLookup.error;
    }

    const employeeUpsertPayload = {
      email: normalizedEmail,
      name: normalizedName,
      surname: normalizedSurname,
      department: String(employeeRecord?.department || '').trim(),
      role: getEmployeeRoleCategory(employeeRecord),
      account_role: normalizedRole,
      is_active: true,
    };

    if (employeeKey) {
      employeeUpsertPayload.employee_id = employeeKey;
    }

    if (employeeLookup.data?.id) {
      employeeUpsertPayload.id = employeeLookup.data.id;
    }

    const employeeUpdate = await client.from('employees').upsert(employeeUpsertPayload, { onConflict: 'email' });
    if (employeeUpdate.error) {
      throw employeeUpdate.error;
    }

    return { password: normalizedPassword };
  } catch (error) {
    console.warn('Unable to sync the employee credential record.', error);
    return null;
  }
}

function getBuiltInAdminAccount() {
  return {
    email: DEFAULT_ADMIN_EMAIL,
    password: DEFAULT_ADMIN_PASSWORD,
    role: 'Administrator',
    is_active: true,
  };
}

async function ensureDefaultAdminAccount() {
  const adminEmail = DEFAULT_ADMIN_EMAIL;
  const defaultPassword = DEFAULT_ADMIN_PASSWORD;

  state.security = state.security || {};
  state.security.accountPasswords = state.security.accountPasswords || {};
  state.security.passwordHashes = state.security.passwordHashes || {};
  state.security.accountPasswords[adminEmail] = defaultPassword;
  state.security.passwordHashes[adminEmail] = await secureHashString(defaultPassword);

  const client = getSupabaseClient();
  if (!client) return;

  try {
    const employeeLookup = await client
      .from('employees')
      .select('id')
      .eq('email', adminEmail)
      .maybeSingle();

    if (employeeLookup.error && employeeLookup.error.code !== 'PGRST116') {
      throw employeeLookup.error;
    }

    if (!employeeLookup.data) {
      const createdEmployee = await client
        .from('employees')
        .upsert({
          employee_id: 'EMP-ADMIN-001',
          name: 'System Administrator',
          surname: '',
          email: adminEmail,
          department: 'Administration',
          role: 'Admin',
          account_role: 'Administrator',
          is_active: true,
        }, { onConflict: 'email' })
        .select('id')
        .maybeSingle();

      if (createdEmployee.error) {
        throw createdEmployee.error;
      }
    }

    await syncUserCredentialRecord(adminEmail, defaultPassword, 'Administrator', true);
  } catch (error) {
    console.warn('Unable to sync the default admin account to Supabase.', error);
  }
}

async function syncUserCredentialRecord(email, password, role = 'Employee', isActive = true) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedPassword = String(password || '').trim();
  const normalizedRole = normalizeAccountRole(role) || 'Employee';

  if (!normalizedEmail || !normalizedPassword) {
    return null;
  }

  const client = getSupabaseClient();
  if (!client) return null;

  try {
    let employeeLookup = await client
      .from('employees')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (employeeLookup.error && employeeLookup.error.code !== 'PGRST116') {
      throw employeeLookup.error;
    }

    if (!employeeLookup.data) {
      const createdEmployee = await client
        .from('employees')
        .upsert({
          employee_id: `EMP-${normalizedRole.toUpperCase().replace(/[^A-Z0-9]+/g, '-') || 'USER'}-${Date.now().toString().slice(-6)}`,
          name: 'Auto',
          surname: 'Created',
          email: normalizedEmail,
          department: 'Administration',
          role: normalizeAccountRole(normalizedRole) === 'Administrator' ? 'Admin' : normalizeAccountRole(normalizedRole) || 'Employee',
          account_role: normalizedRole,
          is_active: true,
        }, { onConflict: 'email' })
        .select('id')
        .maybeSingle();

      if (createdEmployee.error) {
        throw createdEmployee.error;
      }

      employeeLookup = createdEmployee;
    }

    const passwordHash = await secureHashString(normalizedPassword);
    const payload = {
      email: normalizedEmail,
      employee_id: employeeLookup.data?.id || null,
      password_hash: passwordHash,
      role: normalizedRole,
      is_active: Boolean(isActive),
    };

    const response = await client.from('user_credentials').upsert(payload, { onConflict: 'email' });
    if (response.error) {
      throw response.error;
    }

    return payload;
  } catch (error) {
    console.warn('Unable to sync the user credential record.', error);
    return null;
  }
}

function getCurrentSessionUser() {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

function resolveActiveAccountEmail() {
  const sessionUser = getCurrentSessionUser();
  if (sessionUser && typeof sessionUser.email === 'string' && sessionUser.email.trim()) {
    return sessionUser.email.trim().toLowerCase();
  }

  const configuredAdminEmail = String(state.settings?.adminEmail || '').trim().toLowerCase();
  if (configuredAdminEmail) {
    return configuredAdminEmail;
  }

  return '';
}

state = loadState();
hydrateStateFromSupabase().catch((error) => {
  console.warn('Supabase state hydration failed.', error);
});
ensureAccountSecurityState();
ensureDefaultAdminAccount().catch((error) => {
  console.warn('Default admin account bootstrap failed.', error);
});
normalizeEmployeeRoles();

function getCurrentUserRole() {
  return getCurrentSessionUser()?.role || 'Administrator';
}

function enforceAuthRoute() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const isIndexPage = currentPage.toLowerCase() === 'index.html';
  const isLoginPage = currentPage.toLowerCase() === 'login.html';

  const hasValidSession = isAuthenticated();

  if (isIndexPage && !hasValidSession) {
    window.location.replace('login.html');
    return false;
  }

  if (isLoginPage && hasValidSession) {
    window.location.replace('index.html');
    return false;
  }

  return true;
}

function canManageEmployeeRoles() {
  return getCurrentUserRole() === 'Administrator';
}

function canAccessSecuritySettings() {
  return ['Administrator', 'IT Staff'].includes(getCurrentUserRole());
}

async function verifyPasswordForUser(email, password) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const client = getSupabaseClient();

  if (client && normalizedEmail) {
    const backendUser = await getSupabaseLoginAccount(normalizedEmail);
    if (!backendUser) return false;
    const enteredHash = await secureHashString(password || '');
    const storedHash = String(backendUser.password_hash || '').trim().toLowerCase();
    const rawPasswordMatch = String(backendUser.password_hash || '').trim() === String(password || '').trim();
    return Boolean((storedHash && storedHash === enteredHash.toLowerCase()) || rawPasswordMatch);
  }

  const hash = state.security?.passwordHashes?.[normalizedEmail];
  if (hash) {
    const value = await secureHashString(password || '');
    return value === hash;
  }

  const rawPassword = state.security?.accountPasswords?.[normalizedEmail];
  if (rawPassword !== undefined) {
    return String(rawPassword || '').trim() === String(password || '').trim();
  }

  return false;
}

function mergeTicketLists(primaryTickets = [], secondaryTickets = []) {
  const merged = [...(Array.isArray(primaryTickets) ? primaryTickets : []), ...(Array.isArray(secondaryTickets) ? secondaryTickets : [])];
  const ticketMap = new Map();

  merged.forEach((ticket) => {
    if (!ticket || !ticket.id) return;
    const existing = ticketMap.get(ticket.id) || {};
    ticketMap.set(ticket.id, {
      ...existing,
      ...ticket,
      messages: Array.isArray(ticket.messages) && ticket.messages.length
        ? ticket.messages
        : Array.isArray(existing.messages)
          ? existing.messages
          : [],
    });
  });

  return Array.from(ticketMap.values()).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
}

function normalizeSharedTicket(ticket) {
  if (!ticket || typeof ticket !== 'object') return null;

  const normalized = { ...ticket };
  normalized.messages = Array.isArray(ticket.messages) ? ticket.messages.map((message) => ({
    ...message,
    sender: (message && message.sender) || 'employee',
    text: String(message && message.text ? message.text : ''),
    createdAt: message && message.createdAt ? message.createdAt : new Date().toISOString(),
  })) : [];

  if (!normalized.id) {
    normalized.id = `tk-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  if (!normalized.createdAt) {
    normalized.createdAt = new Date().toISOString();
  }

  return normalized;
}

function loadSharedTickets() {
  try {
    const raw = localStorage.getItem(SHARED_TICKETS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const normalized = Array.isArray(parsed)
      ? parsed.map(normalizeSharedTicket).filter(Boolean)
      : [];
    return normalized;
  } catch (error) {
    return [];
  }
}

function persistSharedTickets(tickets) {
  try {
    const normalized = (Array.isArray(tickets) ? tickets : []).map(normalizeSharedTicket).filter(Boolean);
    localStorage.setItem(SHARED_TICKETS_KEY, JSON.stringify(normalized));
    return normalized;
  } catch (error) {
    return [];
  }
}

function getSupabaseClient() {
  const runtimeConfig = typeof window !== 'undefined' && window.__APP_CONFIG__ && typeof window.__APP_CONFIG__ === 'object'
    ? window.__APP_CONFIG__
    : {};

  if (runtimeConfig.supabaseClient && typeof runtimeConfig.supabaseClient.from === 'function') {
    return runtimeConfig.supabaseClient;
  }

  if (window.supabase && typeof window.supabase.createClient === 'function') {
    const config = getStoredSupabaseConfig();
    if (config.url && config.anonKey) {
      window.__APP_CONFIG__ = window.__APP_CONFIG__ || {};
      window.__APP_CONFIG__.supabaseClient = window.supabase.createClient(config.url, config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
      return window.__APP_CONFIG__.supabaseClient;
    }
  }

  return null;
}

function getSecureSyncEndpoint() {
  const runtimeConfig = typeof window !== 'undefined' && window.__APP_CONFIG__ && typeof window.__APP_CONFIG__ === 'object'
    ? window.__APP_CONFIG__
    : {};

  const candidate = String(runtimeConfig.apiBaseUrl || runtimeConfig.serverSyncUrl || '/api/supabase-sync' || '').trim();
  if (!candidate) return '';
  return candidate.startsWith('http://') || candidate.startsWith('https://') || candidate.startsWith('/')
    ? candidate
    : `/${candidate}`;
}

async function hydrateStateFromSupabase() {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const tableQueries = [
      ['settings', 'settings', true],
      ['employees', 'employees', false],
      ['devices', 'devices', false],
      ['replacements', 'replacements', false],
      ['policies', 'policies', false],
      ['schedules', 'schedules', false],
      ['usage', 'usage', false],
      ['analytics_snapshot', 'analytics_snapshot', true],
      ['incognito_control', 'incognito_control', true],
      ['notifications', 'notifications', false],
      ['ticket_settings', 'ticket_settings', true],
      ['tickets', 'tickets', false],
      ['changelog', 'changelog', false],
    ];

    const results = await Promise.all(tableQueries.map(async ([frontendName, tableName, singleRow]) => {
      const response = await client.from(tableName).select('*');
      if (response.error) {
        throw response.error;
      }

      const rows = Array.isArray(response.data) ? response.data : [];
      return { frontendName, rows, singleRow };
    }));

    const mapped = {};
    results.forEach(({ frontendName, rows, singleRow }) => {
      if (singleRow) {
        mapped[frontendName] = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
        return;
      }
      mapped[frontendName] = Array.isArray(rows) ? rows : [];
    });

    await hydrateEmployeePermissionsFromSupabase();

    const baseState = JSON.parse(JSON.stringify(demoState));
    const mergedState = {
      ...baseState,
      ...mapped,
      settings: {
        ...(baseState.settings || {}),
        ...((mapped.settings && typeof mapped.settings === 'object') ? mapped.settings : {}),
      },
      ticketSettings: {
        ...(baseState.ticketSettings || {}),
        ...((mapped.ticket_settings && typeof mapped.ticket_settings === 'object') ? mapped.ticket_settings : {}),
      },
      analytics: {
        ...(baseState.analytics || {}),
        ...((mapped.analytics_snapshot && typeof mapped.analytics_snapshot === 'object') ? mapped.analytics_snapshot : {}),
      },
    };

    const remapped = mapBackendStateToFrontend({
      settings: mapped.settings,
      employees: mapped.employees,
      devices: mapped.devices,
      replacements: mapped.replacements,
      policies: mapped.policies,
      schedules: mapped.schedules,
      usage: mapped.usage,
      analytics_snapshot: mapped.analytics_snapshot,
      notifications: mapped.notifications,
      ticket_settings: mapped.ticket_settings,
      tickets: mapped.tickets,
      changelog: mapped.changelog,
    });

    const finalState = {
      ...baseState,
      ...mergedState,
      ...remapped,
      settings: {
        ...(baseState.settings || {}),
        ...((remapped.settings && typeof remapped.settings === 'object') ? remapped.settings : {}),
      },
      ticketSettings: {
        ...(baseState.ticketSettings || {}),
        ...((remapped.ticketSettings && typeof remapped.ticketSettings === 'object') ? remapped.ticketSettings : {}),
      },
      analytics: {
        ...(baseState.analytics || {}),
        ...((remapped.analytics && typeof remapped.analytics === 'object') ? remapped.analytics : {}),
      },
      features: {
        ...(baseState.features || {}),
        ...((mapped.settings?.features && typeof mapped.settings.features === 'object') ? mapped.settings.features : {}),
        incognitoBlocker: Boolean(mapped.incognito_control?.enabled ?? mapped.settings?.features?.incognitoBlocker ?? baseState.features?.incognitoBlocker),
      },
      changelog: normalizeChangelogEntries(remapped.changelog || mergedState.changelog || baseState.changelog),
    };

    state = mergeHydratedStateWithLocalState(loadState(), finalState);
    normalizeEmployeeRoles();
    const sanitizedState = JSON.parse(JSON.stringify(state));
    delete sanitizedState.security;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizedState));
    return finalState;
  } catch (error) {
    console.warn('Supabase state hydration failed. Falling back to local storage.', error);
    return null;
  }
}

async function persistStateToSupabase() {
  const secureEndpoint = getSecureSyncEndpoint();
  if (secureEndpoint) {
    try {
      const response = await fetch(secureEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ state: mapFrontendStateToBackend(state) }),
      });

      if (!response.ok) {
        throw new Error(`Secure backend sync returned ${response.status}.`);
      }

      return true;
    } catch (error) {
      console.warn('Secure backend sync failed; local storage remains authoritative.', error);
    }
  }

  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const payload = mapFrontendStateToBackend(state);
    const tableOperations = [
      ['settings', payload.settings ? [payload.settings] : []],
      ['incognito_control', payload.incognito_control ? [payload.incognito_control] : []],
      ['employees', Array.isArray(payload.employees) ? payload.employees : payload.employees ? [payload.employees] : []],
      ['devices', Array.isArray(payload.devices) ? payload.devices : payload.devices ? [payload.devices] : []],
      ['replacements', Array.isArray(payload.replacements) ? payload.replacements : payload.replacements ? [payload.replacements] : []],
      ['policies', Array.isArray(payload.policies) ? payload.policies : payload.policies ? [payload.policies] : []],
      ['schedules', Array.isArray(payload.schedules) ? payload.schedules : payload.schedules ? [payload.schedules] : []],
      ['usage', Array.isArray(payload.usage) ? payload.usage : payload.usage ? [payload.usage] : []],
      ['analytics_snapshot', payload.analytics_snapshot ? [payload.analytics_snapshot] : []],
      ['notifications', Array.isArray(payload.notifications) ? payload.notifications : payload.notifications ? [payload.notifications] : []],
      ['ticket_settings', payload.ticket_settings ? [payload.ticket_settings] : []],
      ['ticket_category_settings', payload.ticket_category_settings ? [payload.ticket_category_settings] : []],
      ['tickets', Array.isArray(payload.tickets) ? payload.tickets : payload.tickets ? [payload.tickets] : []],
      ['changelog', Array.isArray(payload.changelog) ? payload.changelog : payload.changelog ? [payload.changelog] : []],
    ];

    for (const [tableName, rows] of tableOperations) {
      if (!rows || rows.length === 0) continue;
      const withId = rows.filter((row) => row && row.id);
      const withoutId = rows.filter((row) => row && !row.id);

      if (withId.length) {
        const response = await client.from(tableName).upsert(withId, { onConflict: 'id' });
        if (response.error) throw response.error;
      }
      if (withoutId.length) {
        const response = await client.from(tableName).insert(withoutId);
        if (response.error) throw response.error;
      }
    }

    return true;
  } catch (error) {
    console.warn('Supabase persistence failed.', error);
    return false;
  }
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    let parsedState = null;

    if (saved) {
      try {
        parsedState = JSON.parse(saved);
      } catch (error) {
        console.warn('Unable to parse saved state, using demo state.');
      }
    }

    const baseState = parsedState || JSON.parse(JSON.stringify(demoState));
    const versionChanged = baseState.appVersion?.current !== APP_VERSION;
    const releaseEntry = demoState.changelog.find((entry) => entry.version === APP_VERSION);
    const changelogEntries = Array.isArray(baseState.changelog) ? [...baseState.changelog] : [];
    if (versionChanged && releaseEntry && !changelogEntries.some((entry) => entry.version === APP_VERSION)) {
      changelogEntries.push(releaseEntry);
    }
    const sharedTickets = loadSharedTickets();
    const mergedTickets = mergeTicketLists(baseState.tickets || [], sharedTickets);
    const safeState = {
      ...JSON.parse(JSON.stringify(demoState)),
      ...baseState,
      appVersion: {
        ...(baseState.appVersion || {}),
        current: APP_VERSION,
        releasedAt: APP_RELEASE_DATE,
      },
      changelog: normalizeChangelogEntries(changelogEntries),
      tickets: mergedTickets,
      settings: {
        ...(JSON.parse(JSON.stringify(demoState)).settings || {}),
        ...(baseState.settings || {}),
      },
      ticketSettings: {
        ...(JSON.parse(JSON.stringify(demoState)).ticketSettings || {}),
        ...(baseState.ticketSettings || {}),
        categories: Array.isArray(baseState.ticketSettings?.categories)
          ? baseState.ticketSettings.categories
          : (JSON.parse(JSON.stringify(demoState)).ticketSettings.categories || []),
        statuses: Array.isArray(baseState.ticketSettings?.statuses)
          ? baseState.ticketSettings.statuses
          : (JSON.parse(JSON.stringify(demoState)).ticketSettings.statuses || []),
        cleanupHistory: Array.isArray(baseState.ticketSettings?.cleanupHistory)
          ? baseState.ticketSettings.cleanupHistory
          : [],
        notifications: {
          ...(JSON.parse(JSON.stringify(demoState)).ticketSettings.notifications || {}),
          ...((baseState.ticketSettings && baseState.ticketSettings.notifications) || {}),
        },
        workflow: {
          ...(JSON.parse(JSON.stringify(demoState)).ticketSettings.workflow || {}),
          ...((baseState.ticketSettings && baseState.ticketSettings.workflow) || {}),
        },
        security: {
          ...(JSON.parse(JSON.stringify(demoState)).ticketSettings.security || {}),
          ...((baseState.ticketSettings && baseState.ticketSettings.security) || {}),
        },
      },
    };

    if (!safeState.settings?.accentColor) {
      safeState.settings = safeState.settings || {};
      safeState.settings.accentColor = DEFAULT_ACCENT_COLOR;
    }

    if (!parsedState || versionChanged) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(safeState));
    }

    return safeState;
  } catch (error) {
    console.warn('Local storage is unavailable, using demo state only.');
    return JSON.parse(JSON.stringify(demoState));
  }
}

function saveState() {
  state.changelog = normalizeChangelogEntries(state.changelog);
  try {
    const sanitizedState = JSON.parse(JSON.stringify(state));
    delete sanitizedState.security;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizedState));
    persistSharedTickets(state.tickets || []);
  } catch (error) {
    console.warn('Unable to save state to local storage.');
  }

  const canAttemptSecureSync = typeof window !== 'undefined'
    && window.location.protocol !== 'file:'
    && Boolean(getSecureSyncEndpoint());
  if (getSupabaseClient() || canAttemptSecureSync) {
    return persistStateToSupabase().catch((error) => {
      console.warn('Deferred Supabase save failed.', error);
      return false;
    });
  }

  return Promise.resolve(false);
}

function isAuthenticated() {
  try {
    const isLoggedIn = localStorage.getItem(LOGIN_STORAGE_KEY) === 'true';
    if (!isLoggedIn) return false;

    const rawSession = localStorage.getItem(AUTH_SESSION_KEY);
    if (!rawSession) return false;

    const parsed = JSON.parse(rawSession);
    return Boolean(parsed && typeof parsed.email === 'string' && parsed.email.trim() && typeof parsed.role === 'string' && parsed.role.trim());
  } catch (error) {
    return false;
  }
}

function setAuthenticated(isLoggedIn, user = null) {
  try {
    localStorage.setItem(LOGIN_STORAGE_KEY, String(Boolean(isLoggedIn)));

    if (isLoggedIn) {
      const nextUser = user || getCurrentSessionUser() || {
        email: resolveActiveAccountEmail(),
        role: getCurrentUserRole() || 'Administrator',
      };

      if (nextUser && typeof nextUser.email === 'string' && nextUser.email.trim()) {
        localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(nextUser));
      } else {
        localStorage.removeItem(AUTH_SESSION_KEY);
      }
    } else {
      localStorage.removeItem(AUTH_SESSION_KEY);
    }
  } catch (error) {
    console.warn('Unable to persist login state.');
  }

  document.body?.classList?.toggle('logged-in', Boolean(isLoggedIn));
  const loginScreen = document.getElementById('login-screen');
  const appShell = document.querySelector('.app-shell');
  if (loginScreen) loginScreen.hidden = Boolean(isLoggedIn);
  if (appShell) appShell.style.display = Boolean(isLoggedIn) ? 'flex' : 'none';
}

async function getSupabaseLoginAccount(email) {
  const client = getSupabaseClient();
  if (!client || !email) return null;

  try {
    const { data, error } = await client
      .from('user_credentials')
      .select('email, password_hash, role, is_active')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      console.warn('Supabase login lookup failed.', error);
      return null;
    }

    if (!data || data.is_active === false) {
      return null;
    }

    return data;
  } catch (error) {
    console.warn('Supabase login lookup crashed.', error);
    return null;
  }
}

async function resolveSupabaseAuthRole(email, userId = null) {
  const client = getSupabaseClient();
  if (!client || !email) return '';

  const normalizedEmail = String(email || '').trim().toLowerCase();

  try {
    const employeeQuery = client
      .from('employees')
      .select('role, account_role, auth_user_id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    const employeeResult = await employeeQuery;
    if (!employeeResult.error && employeeResult.data) {
      const candidateRole = employeeResult.data.account_role || employeeResult.data.role || '';
      if (candidateRole) return String(candidateRole).trim();
    }

    if (userId) {
      const byUserId = await client
        .from('employees')
        .select('role, account_role')
        .eq('auth_user_id', userId)
        .maybeSingle();
      if (!byUserId.error && byUserId.data) {
        const candidateRole = byUserId.data.account_role || byUserId.data.role || '';
        if (candidateRole) return String(candidateRole).trim();
      }
    }

    const credentialsResult = await client
      .from('user_credentials')
      .select('role')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (!credentialsResult.error && credentialsResult.data?.role) {
      return String(credentialsResult.data.role).trim();
    }
  } catch (error) {
    console.warn('Unable to resolve the authenticated role from Supabase.', error);
  }

  return '';
}

async function loginUser(event) {
  event.preventDefault();

  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const errorBox = document.getElementById('login-error');
  const enteredEmail = (emailInput?.value || '').trim().toLowerCase();
  const enteredPassword = passwordInput?.value || '';
  const client = getSupabaseClient();

  const builtInAdmin = getBuiltInAdminAccount();
  if (enteredEmail.toLowerCase() === builtInAdmin.email && enteredPassword === builtInAdmin.password) {
    const hasAdminUiAccess = true;
    setAuthenticated(true, {
      email: builtInAdmin.email,
      role: builtInAdmin.role,
      canAccessAdmin: hasAdminUiAccess,
    });
    if (errorBox) errorBox.textContent = '';

    if (document.getElementById('summary-grid')) {
      renderDashboard();
      openChangelogModal(true);
    } else {
      sessionStorage.removeItem(CHANGELOG_SESSION_KEY);
      window.location.href = 'index.html';
    }
    return;
  }

  const supabaseAccount = enteredEmail ? await getSupabaseLoginAccount(enteredEmail) : null;
  if (!supabaseAccount) {
    if (errorBox) {
      errorBox.textContent = 'Invalid email or password.';
    }
    return;
  }

  const enteredHash = await secureHashString(enteredPassword);
  const storedHash = String(supabaseAccount.password_hash || '').trim().toLowerCase();
  const rawPasswordMatch = String(supabaseAccount.password_hash || '').trim() === String(enteredPassword || '').trim();

  if ((storedHash && storedHash === enteredHash.toLowerCase()) || rawPasswordMatch) {
    await hydrateEmployeePermissionsFromSupabase();
    const resolvedRole = await resolveSupabaseAuthRole(enteredEmail) || supabaseAccount.role || 'Employee';
    const hasAdminUiAccess = await currentSessionHasAdminAccessPermission();
    setAuthenticated(true, {
      email: supabaseAccount.email,
      role: resolvedRole,
      canAccessAdmin: hasAdminUiAccess,
    });
    if (errorBox) errorBox.textContent = '';

    if (document.getElementById('summary-grid')) {
      renderDashboard();
      openChangelogModal(true);
    } else {
      sessionStorage.removeItem(CHANGELOG_SESSION_KEY);
      window.location.href = 'index.html';
    }
    return;
  }

  if (errorBox) {
    errorBox.textContent = 'Invalid email or password.';
  }
}

function togglePasswordVisibility() {
  const passwordInput = document.getElementById('login-password');
  const toggleButton = document.getElementById('toggle-password');
  if (!passwordInput || !toggleButton) return;

  const willShow = passwordInput.type === 'password';
  passwordInput.type = willShow ? 'text' : 'password';
  toggleButton.dataset.visible = String(willShow);
  toggleButton.setAttribute('aria-label', willShow ? 'Hide password' : 'Show password');
  toggleButton.setAttribute('aria-pressed', String(willShow));
}

function logoutUser() {
  setAuthenticated(false);
  try {
    sessionStorage.removeItem(CHANGELOG_SESSION_KEY);
  } catch (error) {
    console.warn('Unable to clear changelog session preference.');
  }

  try {
    localStorage.removeItem(LOGIN_STORAGE_KEY);
    localStorage.removeItem(AUTH_SESSION_KEY);
  } catch (error) {
    console.warn('Unable to clear saved auth session.');
  }

  const loginForm = document.getElementById('login-form');
  if (loginForm) loginForm.reset();
  const errorBox = document.getElementById('login-error');
  if (errorBox) errorBox.textContent = '';

  window.location.href = 'login.html';
}

function getPasswordStrength(message) {
  const checks = {
    minLength: message.length >= 8,
    hasNumber: /\d/.test(message),
    hasUppercase: /[A-Z]/.test(message),
    hasSpecial: /[^A-Za-z0-9]/.test(message),
  };

  const score = Object.values(checks).filter(Boolean).length;

  if (!message) return { score: 0, label: 'No password entered', valid: false, checks };
  if (score <= 1) return { score, label: 'Weak', valid: false, checks };
  if (score === 2 || score === 3) return { score, label: 'Medium', valid: true, checks };
  return { score, label: 'Strong', valid: true, checks };
}

function showSettingsMessage(elementId, type, message) {
  const node = document.getElementById(elementId);
  if (!node) return;
  node.className = `settings-message ${type}`;
  node.textContent = message;
}

function updatePasswordStrengthIndicator() {
  const field = document.getElementById('new-password');
  const indicator = document.getElementById('password-strength-indicator');
  if (!field || !indicator) return;

  const value = field.value || '';
  const strength = getPasswordStrength(value);

  const labels = {
    Weak: 'Weak',
    Medium: 'Medium',
    Strong: 'Strong',
  };

  if (!value) {
    indicator.textContent = 'Not started';
    indicator.className = 'password-strength-indicator neutral';
    return;
  }

  const label = labels[strength.label] || 'Weak';
  indicator.textContent = label;
  indicator.className = `password-strength-indicator ${strength.label.toLowerCase()}`;
}

const activeToastRegistry = new Map();
let syncOperationInFlight = false;

function getStoredSupabaseConfig() {
  const runtimeConfig = typeof window !== 'undefined' && window.__APP_CONFIG__ && typeof window.__APP_CONFIG__ === 'object'
    ? window.__APP_CONFIG__
    : {};

  try {
    const urlFromStorage = localStorage.getItem('supabaseUrl') || '';
    const anonKeyFromStorage = localStorage.getItem('supabaseAnonKey') || '';
    const apiBaseUrlFromStorage = localStorage.getItem('apiBaseUrl') || '';
    const url = String(runtimeConfig.supabaseUrl || urlFromStorage || '').trim();
    const anonKey = String(runtimeConfig.supabaseAnonKey || anonKeyFromStorage || '').trim();
    const apiBaseUrl = String(runtimeConfig.apiBaseUrl || runtimeConfig.serverSyncUrl || apiBaseUrlFromStorage || '').trim();

    if (url && !urlFromStorage) {
      localStorage.setItem('supabaseUrl', url);
    }
    if (anonKey && !anonKeyFromStorage) {
      localStorage.setItem('supabaseAnonKey', anonKey);
    }
    if (apiBaseUrl && !apiBaseUrlFromStorage) {
      localStorage.setItem('apiBaseUrl', apiBaseUrl);
    }

    return {
      url,
      anonKey,
      apiBaseUrl,
    };
  } catch (error) {
    const url = String(runtimeConfig.supabaseUrl || '').trim();
    const anonKey = String(runtimeConfig.supabaseAnonKey || '').trim();
    const apiBaseUrl = String(runtimeConfig.apiBaseUrl || runtimeConfig.serverSyncUrl || '').trim();
    return { url, anonKey, apiBaseUrl };
  }
}

function detectBackendMode() {
  const config = getStoredSupabaseConfig();
  const secureEndpoint = getSecureSyncEndpoint();
  const hasLiveConfig = Boolean(config.url && config.url.startsWith('http') && config.anonKey);
  const hasServerMode = Boolean(secureEndpoint && secureEndpoint.length > 0);
  const mode = hasLiveConfig || hasServerMode ? 'live' : 'demo';

  if (document.body) {
    document.body.setAttribute('data-backend-mode', mode);
  }

  return {
    mode,
    hasLiveConfig,
    hasServerMode,
    config,
  };
}

function mergeHydratedStateWithLocalState(previousState, hydratedState) {
  const localState = previousState && typeof previousState === 'object' ? previousState : {};
  const nextState = hydratedState && typeof hydratedState === 'object' ? hydratedState : {};

  const arrayFields = ['employees', 'devices', 'replacements', 'policies', 'schedules', 'usage', 'notifications', 'tickets', 'changelog'];
  const mergedResult = { ...localState, ...nextState };

  arrayFields.forEach((fieldName) => {
    const localValue = Array.isArray(localState[fieldName]) ? localState[fieldName] : [];
    const remoteValue = Array.isArray(nextState[fieldName]) ? nextState[fieldName] : [];
    if (remoteValue.length === 0 && localValue.length > 0) {
      mergedResult[fieldName] = localValue;
    } else if (remoteValue.length > 0) {
      mergedResult[fieldName] = remoteValue;
    }
  });

  if (nextState.settings && typeof nextState.settings === 'object') {
    mergedResult.settings = {
      ...(localState.settings || {}),
      ...nextState.settings,
    };
  }

  if (nextState.ticketSettings && typeof nextState.ticketSettings === 'object') {
    mergedResult.ticketSettings = {
      ...(localState.ticketSettings || {}),
      ...nextState.ticketSettings,
    };
  }

  if (nextState.analytics && typeof nextState.analytics === 'object') {
    mergedResult.analytics = {
      ...(localState.analytics || {}),
      ...nextState.analytics,
    };
  }

  return mergedResult;
}

function warnIfDemoMode() {
  const status = detectBackendMode();

  if (status.mode !== 'live') {
    const message = 'This app is running in demo mode. No live Supabase URL and anon key were detected, so the dashboard is using local browser storage instead of a real backend. Configure the Supabase project credentials and reload the app to enable live data sync.';
    console.warn(message);
    showToast('error', 'Demo mode active', message, { id: 'backend-demo-warning' });
    return false;
  }

  console.info('Live Supabase backend detected.');
  return true;
}

function showToast(type = 'success', title, message, options = {}) {
  const container = document.getElementById('toast-container');
  if (!container || typeof container.appendChild !== 'function') return;

  const normalizedType = type === 'error' ? 'error' : 'success';
  const safeTitle = String(title || (normalizedType === 'success' ? 'Success' : 'Action failed')).trim();
  const safeMessage = String(message || 'Action completed successfully.').trim();
  const toastId = typeof options.id === 'string' && options.id ? options.id : `${normalizedType}:${safeTitle}:${safeMessage}`;

  if (activeToastRegistry.has(toastId)) {
    const cachedToast = activeToastRegistry.get(toastId);
    if (cachedToast && cachedToast.classList && typeof cachedToast.classList.add === 'function') {
      cachedToast.classList.add('visible');
    }
    return;
  }

  const existingToast = Array.from(container.querySelectorAll ? container.querySelectorAll('[data-toast-id]') : []).find((node) => node.dataset.toastId === toastId);
  if (existingToast) {
    if (existingToast.classList && typeof existingToast.classList.add === 'function') {
      existingToast.classList.add('visible');
    }
    return;
  }

  const toast = document.createElement('div');
  toast.dataset.toastId = toastId;
  toast.className = `toast toast--${normalizedType}`;
  toast.innerHTML = `
    <div class="toast-title">${safeTitle.replace(/</g, '&lt;')}</div>
    <div class="toast-message">${safeMessage.replace(/</g, '&lt;')}</div>
  `;

  if (typeof toast.remove !== 'function') {
    toast.remove = () => {};
  }

  activeToastRegistry.set(toastId, toast);
  container.appendChild(toast);

  requestAnimationFrame(() => {
    if (toast.classList && typeof toast.classList.add === 'function') {
      toast.classList.add('visible');
    }
  });

  setTimeout(() => {
    if (toast.classList && typeof toast.classList.remove === 'function') {
      toast.classList.remove('visible');
    }
    setTimeout(() => {
      if (typeof toast.remove === 'function') toast.remove();
      activeToastRegistry.delete(toastId);
    }, 240);
  }, 2800);
}

function togglePasswordFieldVisibility(fieldId, buttonId) {
  const field = document.getElementById(fieldId);
  const button = document.getElementById(buttonId);
  if (!field || !button) return;

  const willShow = field.type === 'password';
  field.type = willShow ? 'text' : 'password';
  button.dataset.visible = String(willShow);
  button.setAttribute('aria-label', willShow ? `Hide ${fieldId.replace(/-/g, ' ')}` : `Show ${fieldId.replace(/-/g, ' ')}`);
  button.setAttribute('aria-pressed', String(willShow));
}

async function handlePasswordChange(event) {
  event.preventDefault();

  const currentEmail = resolveActiveAccountEmail();
  const emailInput = document.getElementById('account-email');
  const newEmail = (emailInput?.value || '').trim().toLowerCase();
  const currentPassword = document.getElementById('current-password')?.value || '';
  const newPassword = document.getElementById('new-password')?.value || '';
  const confirmPassword = document.getElementById('confirm-password')?.value || '';
  const passwordChangeRequested = Boolean(newPassword || confirmPassword || currentPassword);

  if (!currentEmail) {
    showSettingsMessage('account-security-message', 'error', 'There is no active account to update.');
    return;
  }

  if (emailInput && !newEmail) {
    emailInput.value = currentEmail;
  }

  if (!currentPassword && (newEmail && newEmail !== currentEmail || passwordChangeRequested)) {
    showSettingsMessage('account-security-message', 'error', 'Please enter your current password to confirm the change.');
    return;
  }

  if (!currentPassword) {
    showSettingsMessage('account-security-message', 'error', 'Please enter your current password.');
    return;
  }

  const isCurrentPasswordValid = await verifyPasswordForUser(currentEmail, currentPassword);
  if (!isCurrentPasswordValid) {
    showSettingsMessage('account-security-message', 'error', 'The current password is incorrect.');
    return;
  }

  if (newEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    showSettingsMessage('account-security-message', 'error', 'Please enter a valid email address.');
    return;
  }

  if (newEmail && newEmail !== currentEmail) {
    const duplicateUser = newEmail ? await getSupabaseLoginAccount(newEmail) : null;
    if (duplicateUser && duplicateUser.email?.toLowerCase() !== currentEmail) {
      showSettingsMessage('account-security-message', 'error', 'That email address is already in use.');
      return;
    }
  }

  if (newPassword || confirmPassword) {
    if (!newPassword || !confirmPassword) {
      showSettingsMessage('account-security-message', 'error', 'Please complete all password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      showSettingsMessage('account-security-message', 'error', 'The new password and confirmation do not match.');
      return;
    }

    const passwordStrength = getPasswordStrength(newPassword);
    if (!passwordStrength.valid) {
      showSettingsMessage('account-security-message', 'error', 'Use a stronger password with at least 8 characters, a number, uppercase letter, and symbol.');
      return;
    }
  }

  const nextEmail = newEmail || currentEmail;
  const nextPassword = newPassword || currentPassword;

  await syncUserCredentialRecord(nextEmail, nextPassword, getCurrentUserRole() || 'Administrator', true);

  const updatedUser = { email: nextEmail, role: getCurrentUserRole() || 'Administrator' };
  setAuthenticated(true, updatedUser);
  saveState();

  const form = document.getElementById('account-security-form');
  if (form) form.reset();
  if (emailInput) emailInput.value = nextEmail;

  showSettingsMessage('account-security-message', 'success', nextEmail !== currentEmail ? 'Email and security settings updated successfully.' : 'Password updated successfully.');
  showToast('success', 'Account updated', nextEmail !== currentEmail ? `Your email was changed to ${nextEmail}.` : 'Your password was changed successfully.');
}

function renderEmployeeRoleRows() {
  const list = document.getElementById('role-assignment-list');
  const search = document.getElementById('role-assignment-search');
  if (!list) return;

  const query = (search?.value || '').trim().toLowerCase();
  const employees = Array.isArray(state.employees) ? state.employees : [];
  const filteredEmployees = employees.filter((employee) => {
    const haystack = [getEmployeeFullName(employee), employee.email, employee.department, employee.accountRole || 'Employee'].join(' ').toLowerCase();
    return haystack.includes(query);
  });

  if (!filteredEmployees.length) {
    list.innerHTML = '<div class="settings-empty-state">No employees match your search.</div>';
    return;
  }

  const assignedLaptop = (employee) => {
    const device = state.devices.find((item) => item.email === employee.email || getEmployeeFullName({ name: item.user, surname: item.surname }) === getEmployeeFullName(employee) || item.laptopId === employee.assignedLaptopId);
    return device?.laptopId || 'Not assigned';
  };

  const loginPassword = (employee) => {
    const roleName = employee.accountRole || employee.role || 'Employee';
    if (!isPrivilegedAccountRole(roleName)) {
      return 'No auth';
    }
    return state.security?.accountPasswords?.[employee.email] || 'Not generated';
  };

  const headerRow = `
    <div class="role-row role-row-header">
      <div class="role-user-meta">Employee</div>
      <div class="role-user-laptop">Laptop</div>
      <div class="role-user-email">Email</div>
      <div class="role-user-role">Role</div>
      <div class="role-user-auth">Auth / Password</div>
      <div class="role-user-action">Actions</div>
    </div>
  `;

  list.innerHTML = [headerRow].concat(filteredEmployees.map((employee) => `
    <div class="role-row">
      <div class="role-user-meta">
        <div class="role-user-main">
          <span class="role-user-name">${getEmployeeFullName(employee)}</span>
          <span class="status-pill online">Active</span>
        </div>
      </div>
      <div class="role-user-laptop">${assignedLaptop(employee)}</div>
      <div class="role-user-email">${employee.email}</div>
      <div class="role-user-role">${getEmployeeRoleCategory(employee)}</div>
      <div class="role-user-auth">${loginPassword(employee)}</div>
      <div class="role-user-action">
        <button type="button" class="secondary-button small-button" data-role-edit-id="${employee.id}">Edit</button>
        <button type="button" class="secondary-button small-button" data-role-assign-id="${employee.id}">Assign Role</button>
      </div>
    </div>
  `)).join('');
}

function openRoleAssignmentModal(employeeId) {
  const employee = state.employees.find((item) => item.id === employeeId);
  if (!employee) return;
  if (!canManageEmployeeRoles()) {
    showSettingsMessage('role-assignment-message', 'error', 'Only Administrators can assign roles.');
    return;
  }

  const modal = document.getElementById('role-assignment-modal');
  const nameField = document.getElementById('role-assignment-name');
  const emailField = document.getElementById('role-assignment-email');
  const roleField = document.getElementById('role-assignment-role');
  const employeeIdField = document.getElementById('role-assignment-employee-id');
  const passwordField = document.getElementById('role-assignment-password');
  const passwordButton = document.getElementById('generate-role-assignment-password');

  if (!modal || !nameField || !emailField || !roleField || !employeeIdField) return;

  nameField.textContent = getEmployeeFullName(employee);
  emailField.textContent = employee.email;
  const selectedRole = normalizeAccountRole(employee.accountRole) || getDefaultEmployeeAccessRole(employee);
  roleField.value = selectedRole;
  roleField.setAttribute('data-selected-role', selectedRole);
  employeeIdField.value = employee.id;

  const nextPassword = isPrivilegedAccountRole(selectedRole)
    ? (state.security?.accountPasswords?.[employee.email] || generateTemporaryEmployeePassword())
    : '';
  if (passwordField) {
    passwordField.value = nextPassword;
    passwordField.disabled = !isPrivilegedAccountRole(selectedRole);
  }
  if (passwordButton) {
    passwordButton.disabled = !isPrivilegedAccountRole(selectedRole);
  }

  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

function closeRoleAssignmentModal() {
  const modal = document.getElementById('role-assignment-modal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
}

async function saveRoleAssignment(event) {
  event.preventDefault();

  const modal = document.getElementById('role-assignment-modal');
  const employeeId = document.getElementById('role-assignment-employee-id')?.value;
  const selectedRole = document.getElementById('role-assignment-role')?.value;
  const generatedPasswordInput = document.getElementById('role-assignment-password');
  const currentUser = getCurrentSessionUser();

  if (!employeeId || !selectedRole) {
    showSettingsMessage('role-assignment-message', 'error', 'Please select an employee and role.');
    return;
  }

  if (!canManageEmployeeRoles()) {
    showSettingsMessage('role-assignment-message', 'error', 'You are not allowed to assign roles.');
    return;
  }

  const employee = state.employees.find((item) => item.id === employeeId);
  if (!employee) {
    showSettingsMessage('role-assignment-message', 'error', 'Employee record not found.');
    return;
  }

  if (currentUser?.email && currentUser.email === employee.email && selectedRole === 'Administrator') {
    showSettingsMessage('role-assignment-message', 'error', 'You cannot promote yourself to Administrator.');
    return;
  }

  const previousAccountRole = employee.accountRole;
  const previousRole = employee.role;
  employee.accountRole = selectedRole;
  employee.role = selectedRole === 'Administrator' ? 'Admin' : selectedRole;

  let nextPassword = '';
  if (isPrivilegedAccountRole(selectedRole)) {
    const previousPassword = state.security?.accountPasswords?.[employee.email];
    const previousHash = state.security?.passwordHashes?.[employee.email];
    nextPassword = (generatedPasswordInput?.value || '').trim() || state.security?.accountPasswords?.[employee.email] || generateTemporaryEmployeePassword();
    state.security = state.security || {};
    state.security.accountPasswords = state.security.accountPasswords || {};
    state.security.passwordHashes = state.security.passwordHashes || {};
    state.security.accountPasswords[employee.email] = nextPassword;
    const hash = await secureHashString(nextPassword);
    state.security.passwordHashes[employee.email] = hash;

    if (generatedPasswordInput) {
      generatedPasswordInput.value = nextPassword;
    }

    const credentialRecord = await syncUserCredentialRecord(employee.email, nextPassword, selectedRole, true);
    if (!credentialRecord) {
      employee.accountRole = previousAccountRole;
      employee.role = previousRole;
      if (previousPassword === undefined) {
        delete state.security.accountPasswords[employee.email];
      } else {
        state.security.accountPasswords[employee.email] = previousPassword;
      }
      if (previousHash === undefined) {
        delete state.security.passwordHashes[employee.email];
      } else {
        state.security.passwordHashes[employee.email] = previousHash;
      }
      showSettingsMessage('role-assignment-message', 'error', 'The role was not saved because its login credentials could not be synced.');
      return;
    }
  }

  const employeeFullName = getEmployeeFullName(employee);
  logAdminAction('Updated', 'Employee role', `${employeeFullName} -> ${selectedRole}`);
  const databaseSynced = await saveState();
  renderEmployeeRoleRows();
  if (modal) modal.classList.add('hidden');
  const roleMessage = isPrivilegedAccountRole(selectedRole)
    ? `Role updated for ${employeeFullName}. Generated login details for ${employee.email}.`
    : `Role updated for ${employeeFullName}.`;
  showSettingsMessage('role-assignment-message', databaseSynced ? 'success' : 'error', databaseSynced
    ? roleMessage
    : `${roleMessage} Saved locally, but the database sync failed.`);
  showToast(databaseSynced ? 'success' : 'error', databaseSynced ? 'Role updated' : 'Role saved locally', databaseSynced
    ? `${employeeFullName} now has ${selectedRole} access.`
    : 'The role change has not reached the database.');
}

function normalizeAccentColor(color) {
  const nextColor = typeof color === 'string' ? color.trim() : '';
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(nextColor) ? nextColor : DEFAULT_ACCENT_COLOR;
}

function saveGeneralSettings() {
  const incognitoToggle = document.getElementById('settings-incognito-toggle');
  const adminEmailInput = document.getElementById('admin-email');
  const accentPicker = document.getElementById('accent-picker');
  const disposalRetentionDaysInput = document.getElementById('disposal-retention-days');

  state.features = state.features || {};
  state.features.incognitoBlocker = Boolean(incognitoToggle?.checked) && isChromeOrEdgeBrowser();

  state.settings = state.settings || {};
  if (adminEmailInput) {
    state.settings.adminEmail = adminEmailInput.value.trim() || '';
  }
  if (accentPicker) {
    const nextAccentColor = normalizeAccentColor(accentPicker.value);
    state.settings.accentColor = nextAccentColor;
    setAccentColor(nextAccentColor);
  }
  if (disposalRetentionDaysInput) {
    const nextValue = Number(disposalRetentionDaysInput.value);
    state.settings.disposalRetentionDays = Number.isFinite(nextValue) && nextValue >= 0 ? nextValue : 30;
  }

  try {
    saveState();
    renderDashboard();
    showToast('success', 'General settings saved', 'Your general settings were updated successfully.');
  } catch (error) {
    console.error('Unable to save general settings.', error);
    showToast('error', 'Save failed', 'The theme color could not be saved. Please try again.');
  }
}

function saveSettingsNotifications() {
  const settings = getTicketSettings();
  settings.notifications = {
    ...(settings.notifications || {}),
    newTicket: Boolean(document.getElementById('settings-notify-new-ticket')?.checked),
    highPriority: Boolean(document.getElementById('settings-notify-high-priority')?.checked),
    newEmployeeMessage: Boolean(document.getElementById('settings-notify-new-employee-message')?.checked),
  };
  state.ticketSettings = settings;

  try {
    saveState();
    [
      ['ticket-notify-new-ticket', settings.notifications.newTicket],
      ['ticket-notify-high-priority', settings.notifications.highPriority],
      ['ticket-notify-new-employee-message', settings.notifications.newEmployeeMessage],
    ].forEach(([id, checked]) => {
      const input = document.getElementById(id);
      if (input) input.checked = checked;
    });
    showToast('success', 'Notification settings saved', 'Your notification preferences were updated.');
  } catch (error) {
    console.error('Unable to save notification settings.', error);
    showToast('error', 'Save failed', 'Notification preferences could not be saved. Please try again.');
  }
}

function initializeSettingsPage() {
  const settingsTabs = document.querySelectorAll('[data-settings-tab]');
  const settingsPanels = document.querySelectorAll('[data-settings-panel]');

  settingsTabs.forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.dataset.settingsTab;
      settingsTabs.forEach((tab) => {
        const isActive = tab === button;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', String(isActive));
      });

      settingsPanels.forEach((panel) => {
        panel.classList.toggle('active', panel.dataset.settingsPanel === target);
      });
    });
  });

  const generalSettingsSaveButton = document.getElementById('general-settings-save');
  if (generalSettingsSaveButton) {
    generalSettingsSaveButton.addEventListener('click', saveGeneralSettings);
  }

  const notificationSettingsSaveButton = document.getElementById('settings-notifications-save');
  if (notificationSettingsSaveButton) {
    notificationSettingsSaveButton.addEventListener('click', saveSettingsNotifications);
  }

  const securityForm = document.getElementById('account-security-form');
  if (securityForm) {
    const currentSessionEmail = resolveActiveAccountEmail();
    const accountEmailField = document.getElementById('account-email');
    if (accountEmailField) {
      accountEmailField.value = currentSessionEmail;
    }
    securityForm.addEventListener('submit', handlePasswordChange);
  }

  document.getElementById('toggle-current-password')?.addEventListener('click', () => togglePasswordFieldVisibility('current-password', 'toggle-current-password'));
  document.getElementById('toggle-new-password')?.addEventListener('click', () => togglePasswordFieldVisibility('new-password', 'toggle-new-password'));
  document.getElementById('toggle-confirm-password')?.addEventListener('click', () => togglePasswordFieldVisibility('confirm-password', 'toggle-confirm-password'));

  const passwordField = document.getElementById('new-password');
  if (passwordField) {
    passwordField.addEventListener('input', updatePasswordStrengthIndicator);
  }

  const roleSearch = document.getElementById('role-assignment-search');
  if (roleSearch) {
    roleSearch.addEventListener('input', renderEmployeeRoleRows);
  }

  const refreshRoleButton = document.getElementById('refresh-role-list');
  if (refreshRoleButton) {
    refreshRoleButton.addEventListener('click', () => {
      renderEmployeeRoleRows();
      showSettingsMessage('role-assignment-message', 'success', 'Employee roles refreshed.');
    });
  }

  const roleList = document.getElementById('role-assignment-list');
  if (roleList) {
    roleList.addEventListener('click', (event) => {
      const editButton = event.target.closest('[data-role-edit-id]');
      if (editButton) {
        const employee = state.employees.find((item) => item.id === editButton.dataset.roleEditId);
        if (!employee) return;

        const modal = document.getElementById('employee-modal');
        if (modal) {
          modal.classList.remove('hidden');
          modal.setAttribute('aria-hidden', 'false');
        }

        document.getElementById('employee-edit-id').value = employee.id;
        document.getElementById('employee-id').value = employee.employeeId || employee.id;
        document.getElementById('employee-name').value = getEmployeeFullName(employee);
        document.getElementById('employee-email').value = employee.email;
        document.getElementById('employee-department').value = employee.department;
        document.getElementById('employee-role').value = getEmployeeRoleCategory(employee);
        return;
      }

      const button = event.target.closest('[data-role-assign-id]');
      if (button) {
        openRoleAssignmentModal(button.dataset.roleAssignId);
      }
    });
  }

  const closeRoleModal = document.getElementById('role-assignment-close');
  if (closeRoleModal) {
    closeRoleModal.addEventListener('click', closeRoleAssignmentModal);
  }

  const roleModal = document.getElementById('role-assignment-modal');
  if (roleModal) {
    roleModal.addEventListener('click', (event) => {
      if (event.target.dataset.close === 'role-assignment-modal') {
        closeRoleAssignmentModal();
      }
    });
  }

  const roleForm = document.getElementById('role-assignment-form');
  if (roleForm) {
    roleForm.addEventListener('submit', saveRoleAssignment);
    roleForm.addEventListener('click', (event) => event.stopPropagation());
  }

  const roleSelect = document.getElementById('role-assignment-role');
  if (roleSelect) {
    roleSelect.addEventListener('change', () => {
      const passwordField = document.getElementById('role-assignment-password');
      const passwordButton = document.getElementById('generate-role-assignment-password');
      const selectedRole = roleSelect.value || 'Employee';
      const shouldGenerate = isPrivilegedAccountRole(selectedRole);
      roleSelect.setAttribute('data-selected-role', selectedRole);
      if (passwordField) {
        passwordField.disabled = !shouldGenerate;
        if (shouldGenerate && !passwordField.value) {
          const employeeEmail = document.getElementById('role-assignment-email')?.textContent?.trim();
          passwordField.value = employeeEmail ? (state.security?.accountPasswords?.[employeeEmail] || generateTemporaryEmployeePassword()) : generateTemporaryEmployeePassword();
        }
        if (!shouldGenerate) {
          passwordField.value = '';
        }
      }
      if (passwordButton) {
        passwordButton.disabled = !shouldGenerate;
      }
    });
    roleSelect.addEventListener('click', (event) => event.stopPropagation());
    roleSelect.addEventListener('mousedown', (event) => event.stopPropagation());
  }

  const rolePasswordToggle = document.getElementById('toggle-role-assignment-password');
  if (rolePasswordToggle) {
    rolePasswordToggle.addEventListener('click', () => togglePasswordFieldVisibility('role-assignment-password', 'toggle-role-assignment-password'));
  }

  const employeePasswordToggle = document.getElementById('toggle-employee-password');
  if (employeePasswordToggle) {
    employeePasswordToggle.addEventListener('click', () => togglePasswordFieldVisibility('employee-password', 'toggle-employee-password'));
  }

  const employeeConfirmPasswordToggle = document.getElementById('toggle-employee-confirm-password');
  if (employeeConfirmPasswordToggle) {
    employeeConfirmPasswordToggle.addEventListener('click', () => togglePasswordFieldVisibility('employee-confirm-password', 'toggle-employee-confirm-password'));
  }

  const generateRolePasswordButton = document.getElementById('generate-role-assignment-password');
  if (generateRolePasswordButton) {
    generateRolePasswordButton.addEventListener('click', () => {
      const passwordField = document.getElementById('role-assignment-password');
      const employeeEmail = document.getElementById('role-assignment-email')?.textContent?.trim();
      const newPassword = generateTemporaryEmployeePassword();
      if (passwordField) {
        passwordField.value = newPassword;
        passwordField.type = 'password';
      }
      if (employeeEmail) {
        state.security = state.security || {};
        state.security.accountPasswords = state.security.accountPasswords || {};
        state.security.accountPasswords[employeeEmail] = newPassword;
      }
    });
  }

  const generateEmployeePasswordButton = document.getElementById('generate-employee-password');
  if (generateEmployeePasswordButton) {
    generateEmployeePasswordButton.addEventListener('click', () => {
      const passwordField = document.getElementById('employee-password');
      const confirmPasswordField = document.getElementById('employee-confirm-password');
      const nextPassword = generateTemporaryEmployeePassword();
      if (passwordField) {
        passwordField.value = nextPassword;
        passwordField.type = 'password';
      }
      if (confirmPasswordField) {
        confirmPasswordField.value = nextPassword;
        confirmPasswordField.type = 'password';
      }
    });
  }

  const addAdminButton = document.getElementById('add-admin-button');
  if (addAdminButton) {
    addAdminButton.addEventListener('click', () => {
      openEmployeeModal();
      const employeeRoleField = document.getElementById('employee-role');
      const employeePasswordField = document.getElementById('employee-password');
      const employeeConfirmPasswordField = document.getElementById('employee-confirm-password');
      const generatedPassword = generateTemporaryEmployeePassword();
      if (employeeRoleField) {
        employeeRoleField.value = 'Admin';
      }
      if (employeePasswordField) {
        employeePasswordField.value = generatedPassword;
      }
      if (employeeConfirmPasswordField) {
        employeeConfirmPasswordField.value = generatedPassword;
      }
    });
  }

  const roleCancel = document.getElementById('role-assignment-cancel');
  if (roleCancel) {
    roleCancel.addEventListener('click', closeRoleAssignmentModal);
  }

  renderEmployeeRoleRows();
}

function isDeviceRegisteredForPolicy(device) {
  return Boolean(device) && device.isRegistered !== false && Boolean(device.email) && Boolean(device.macAddress);
}

function getCurrentVersionLabel() {
  return APP_VERSION;
}

function normalizeChangelogEntries(entries) {
  if (!Array.isArray(entries)) return [];

  const uniqueEntries = new Map();
  entries.forEach((entry) => {
    if (!entry || typeof entry !== 'object') return;
    const version = String(entry.version || '').trim();
    if (!version) return;
    uniqueEntries.set(version, { ...entry, id: version, version });
  });

  return Array.from(uniqueEntries.values())
    .sort((left, right) => String(right.date || '').localeCompare(String(left.date || ''))
      || String(right.version || '').localeCompare(String(left.version || ''), undefined, { numeric: true, sensitivity: 'base' }))
    .slice(0, MAX_CHANGELOG_ENTRIES);
}

function getVersionFromDate(dateValue) {
  const date = new Date(dateValue || Date.now());
  if (Number.isNaN(date.getTime())) return 'v1.0.0';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `v${year}.${month}.${day}`;
}

function renderSummary() {
  const totalDevices = state.devices.length;
  const registeredDevices = state.devices.filter(isDeviceRegisteredForPolicy).length;
  const workingDevices = state.devices.filter((device) => (device.status || '').toLowerCase() === 'working').length;
  const defectiveDevices = state.devices.filter((device) => (device.status || '').toLowerCase() === 'defective').length;
  const disposalDevices = state.devices.filter((device) => (device.status || '').toLowerCase() === 'disposal').length;
  const takenDevices = state.devices.filter((device) => isLaptopAssigned(device)).length;
  const availableDevices = state.devices.filter((device) => !isLaptopAssigned(device) && !['defective', 'disposal'].includes((device.status || '').toLowerCase())).length;
  const totalPolicies = state.policies.length;
  const totalSchedules = state.schedules.length;
  const totalTickets = state.tickets.length;

  const cards = [
    { label: 'Company Laptop Inventory', value: totalDevices, meta: `${workingDevices} working / ${defectiveDevices} defective / ${disposalDevices} disposal` },
    { label: 'Tickets received', value: totalTickets, meta: `${state.tickets.filter((ticket) => ticket.status === 'Open').length} open / ${state.tickets.filter((ticket) => ticket.status === 'In Progress').length} in progress` },
    { label: 'Registered devices', value: registeredDevices },
    { label: 'Available laptops', value: availableDevices },
    { label: 'Taken laptops', value: takenDevices },
    { label: 'Blocked websites', value: totalPolicies },
    { label: 'Active schedules', value: totalSchedules },
  ];

  document.getElementById('summary-grid').innerHTML = cards.map((card) => `
    <article class="summary-card ${card.label === 'Company Laptop Inventory' ? 'inventory-card' : ''}">
      <div class="summary-label">${card.label}</div>
      <div class="summary-value">${card.value}</div>
      ${card.meta ? `<div class="summary-meta">${card.meta}</div>` : ''}
    </article>
  `).join('');
}

function escapeDashboardText(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function renderDashboardAttention() {
  const list = document.getElementById('dashboard-attention-list');
  const count = document.getElementById('dashboard-attention-count');
  if (!list || !count) return;

  const priorityRank = { critical: 0, high: 1, medium: 3, low: 4 };
  const items = [
    ...(Array.isArray(state.tickets) ? state.tickets : [])
      .filter((ticket) => !['resolved', 'closed', 'completed'].includes(normalizeStatus(ticket.status)))
      .map((ticket) => ({
        type: 'ticket',
        severity: priorityRank[normalizeStatus(ticket.priority)] ?? 3,
        timestamp: new Date(ticket.createdAt || 0).getTime() || 0,
        title: `${ticket.priority || 'Medium'} priority ticket`,
        detail: [ticket.employee || 'Employee', ticket.laptopId || 'Laptop not specified', ticket.category || 'General'].join(' · '),
        action: 'Open ticket',
        ticketId: ticket.id || '',
      })),
    ...(Array.isArray(state.devices) ? state.devices : [])
      .filter((device) => normalizeStatus(device.status) === 'defective')
      .map((device) => ({
        type: 'device',
        severity: 2,
        timestamp: new Date(device.updatedAt || device.createdAt || 0).getTime() || 0,
        title: 'Defective laptop',
        detail: [device.laptopId || device.laptopName || 'Laptop ID unavailable', device.user && device.user !== 'Unassigned' ? device.user : 'Unassigned'].join(' · '),
        action: 'Review laptops',
        ticketId: '',
      })),
  ].sort((first, second) => first.severity - second.severity || first.timestamp - second.timestamp);

  count.textContent = items.length ? `${items.length} item${items.length === 1 ? '' : 's'} need review` : 'No urgent tickets or defective laptops';
  list.innerHTML = items.length ? items.slice(0, 6).map((item) => `
    <article class="dashboard-attention-row dashboard-attention-row--${item.type}">
      <div class="dashboard-attention-copy">
        <span class="dashboard-attention-type">${item.type === 'ticket' ? 'Support ticket' : 'Device alert'}</span>
        <h3>${escapeDashboardText(item.title)}</h3>
        <p>${escapeDashboardText(item.detail)}</p>
      </div>
      <button class="secondary-button dashboard-attention-action" type="button" data-attention-type="${item.type}" data-ticket-id="${escapeDashboardText(item.ticketId)}">${item.action}</button>
    </article>
  `).join('') : '<p class="dashboard-attention-empty">Everything is up to date.</p>';
}

function normalizeStatus(status) {
  return String(status || '').trim().toLowerCase();
}

function isLaptopAssigned(device) {
  if (!device) return false;
  const normalizedStatus = normalizeStatus(device.status);
  if (normalizedStatus === 'taken') return true;
  return Boolean(device.user && device.user !== 'Unassigned' && device.email);
}

function isActiveAssignedDevice(device) {
  if (!device) return false;
  return Boolean(device.laptopId) && Boolean(device.user) && device.user !== 'Unassigned' && Boolean(device.email);
}

function statusClass(status) {
  const normalized = normalizeStatus(status);
  if (normalized === 'working' || normalized === 'available' || normalized === 'taken') return 'online';
  if (normalized === 'defective') return 'pending';
  if (normalized === 'disposal') return 'offline';
  if (normalized === 'online') return 'online';
  if (normalized === 'offline') return 'offline';
  return 'pending';
}

function getSortedDevices() {
  const sortDirection = window.deviceSortDirection === 'desc' ? -1 : 1;
  const sorted = [...state.devices];

  sorted.sort((a, b) => {
    const valueA = (a.surname || a.user || '').toLowerCase();
    const valueB = (b.surname || b.user || '').toLowerCase();
    return valueA.localeCompare(valueB, undefined, { numeric: true, sensitivity: 'base' }) * sortDirection;
  });

  return sorted;
}

function getDeviceSearchTerm() {
  return document.getElementById('device-search')?.value.trim().toLowerCase() || '';
}

function getEmployeeSearchTerm() {
  return document.getElementById('employee-search')?.value.trim().toLowerCase() || '';
}

function openDeviceModalById(deviceId) {
  const device = state.devices.find((item) => item.id === deviceId);
  if (device) openDeviceModal(device);
}

function deleteDeviceById(deviceId) {
  const device = state.devices.find((item) => item.id === deviceId);
  if (!device) return;

  const employee = state.employees.find((item) => item.assignedLaptopId === device.laptopId || item.email === device.email);
  if (employee) {
    delete employee.assignedLaptopId;
  }

  logAdminAction('Deleted', 'Device', `${device.laptopId || device.id}`);
  state.devices = state.devices.filter((item) => item.id !== deviceId);
  saveState();
  renderDashboard();
}

function renderDevices() {
  const table = document.getElementById('devices-table');
  const searchTerm = getDeviceSearchTerm();
  const statusSelect = document.getElementById('device-status-filter');
  const registeredDevices = getSortedDevices().filter(isActiveAssignedDevice);
  const selectedStatus = statusSelect?.value || 'all';
  const statuses = [...new Set(registeredDevices.map((device) => normalizeStatus(device.status || 'available')))]
    .filter(Boolean)
    .sort((first, second) => first.localeCompare(second));

  if (statusSelect) {
    statusSelect.innerHTML = `<option value="all">All status</option>${statuses.map((status) => {
      const label = status.charAt(0).toUpperCase() + status.slice(1);
      return `<option value="${escapeDashboardText(status)}">${escapeDashboardText(label)}</option>`;
    }).join('')}`;
    statusSelect.value = statuses.includes(selectedStatus) ? selectedStatus : 'all';
  }

  const statusFilter = statusSelect?.value || 'all';
  const filtered = registeredDevices.filter((device) => {
    if (statusFilter !== 'all' && normalizeStatus(device.status || 'available') !== statusFilter) {
      return false;
    }

    const haystack = [device.user, device.surname, device.email, device.employeeId, device.macAddress, device.laptopName, device.laptopId].join(' ').toLowerCase();
    return haystack.includes(searchTerm);
  });

  if (!filtered.length) {
    table.innerHTML = `<tr><td colspan="8">${registeredDevices.length ? 'No registered devices match these filters.' : 'No registered devices to display.'}</td></tr>`;
    return;
  }

  table.innerHTML = filtered.map((device) => {
    const statusText = normalizeStatus(device.status) === 'taken' ? 'Taken' : (device.status || 'Available');

    return `
      <tr>
        <td>${device.employeeId || 'Not added'}</td>
        <td>${device.laptopId || 'Not added'}</td>
        <td>${device.user} ${device.surname || ''}</td>
        <td>${device.laptopName || 'Not added'}</td>
        <td>${device.macAddress || 'Not added'}</td>
        <td>${device.email || 'Not added'}</td>
        <td><span class="status-pill ${statusClass(device.status)}">${statusText}</span></td>
        <td>
          <div class="table-actions">
            <button class="table-action" type="button" data-edit-id="${device.id}" onclick="openDeviceModalById('${device.id}')">Edit</button>
            <button class="table-action danger-action" type="button" data-delete-device-id="${device.id}" onclick="deleteDeviceById('${device.id}')">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openLaptopModalById(laptopId) {
  const laptop = state.devices.find((item) => item.id === laptopId);
  if (laptop) openLaptopModal(laptop);
}

function renderLaptops() {
  const table = document.getElementById('laptops-table');
  if (!table) return;

  const searchTerm = (document.getElementById('laptop-search')?.value || '').trim().toLowerCase();
  const statusFilter = document.getElementById('laptop-status-filter')?.value || 'all';
  const filtered = state.devices.filter((device) => {
    const status = isLaptopAssigned(device) ? 'taken' : normalizeStatus(device.status || 'available');
    if (statusFilter !== 'all' && status !== statusFilter) return false;

    const haystack = [device.user, device.surname, device.brand, device.specs, device.macAddress, device.purchasedAt, device.laptopName, device.laptopId, device.status].join(' ').toLowerCase();
    return haystack.includes(searchTerm);
  });

  table.innerHTML = filtered.map((device) => {
    const isTaken = isLaptopAssigned(device);
    const statusText = isTaken ? 'Taken' : (normalizeStatus(device.status) === 'available' ? 'Available' : (device.status || 'Available'));
    return `
      <tr>
        <td>${device.laptopId || 'Not set'}</td>
        <td>${device.brand || 'Not set'}</td>
        <td>${device.specs || 'Not set'}</td>
        <td>${device.macAddress || 'Not set'}</td>
        <td>${device.purchasedAt ? new Date(device.purchasedAt).toLocaleDateString() : 'Not set'}</td>
        <td>${device.laptopName || 'Not set'}</td>
        <td><span class="status-pill ${statusClass(isTaken ? 'taken' : device.status)}">${statusText}</span></td>
        <td>
          <button class="table-action" type="button" data-laptop-edit-id="${device.id}" onclick="openLaptopModalById('${device.id}')">Edit</button>
        </td>
      </tr>
    `;
  }).join('');
}

function openEmployeeModalById(employeeId) {
  const employee = state.employees.find((item) => item.id === employeeId);
  if (employee) openEmployeeModal(employee);
}

function deleteEmployeeById(employeeId) {
  const employee = state.employees.find((item) => item.id === employeeId);
  if (!employee) return;

  logAdminAction('Deleted', 'Employee', getEmployeeFullName(employee));
  state.employees = state.employees.filter((item) => item.id !== employeeId);
  saveState();
  renderDashboard();
}

function updateEmployeeFilterOptions(selectId, fieldName, allLabel) {
  const select = document.getElementById(selectId);
  if (!select) return;

  const selectedValue = select.value || 'all';
  const options = new Map();
  state.employees.forEach((employee) => {
    const label = String(employee[fieldName] || '').trim();
    const value = label.toLowerCase();
    if (value && !options.has(value)) options.set(value, label);
  });

  const sortedOptions = [...options.entries()].sort((first, second) => first[1].localeCompare(second[1]));
  select.innerHTML = `<option value="all">${allLabel}</option>${sortedOptions.map(([value, label]) => `
    <option value="${escapeDashboardText(value)}">${escapeDashboardText(label)}</option>
  `).join('')}`;
  select.value = options.has(selectedValue) ? selectedValue : 'all';
}

function renderEmployees() {
  const table = document.getElementById('employees-table');
  if (!table) return;

  updateEmployeeFilterOptions('employee-department-filter', 'department', 'All departments');
  updateEmployeeFilterOptions('employee-role-filter', 'role', 'All roles');
  const searchTerm = getEmployeeSearchTerm();
  const statusFilter = document.getElementById('employee-status-filter')?.value || 'all';
  const departmentFilter = document.getElementById('employee-department-filter')?.value || 'all';
  const roleFilter = document.getElementById('employee-role-filter')?.value || 'all';
  const permissionRecords = new Map((state.employeePermissions || []).map((record) => [String(record.employee_id), record]));
  const canManageAccess = canManageEmployeeRoles();
  const filtered = state.employees.filter((employee) => {
    const status = employee.is_active === false || employee.isActive === false ? 'inactive' : 'active';
    if (statusFilter !== 'all' && status !== statusFilter) return false;
    if (departmentFilter !== 'all' && String(employee.department || '').trim().toLowerCase() !== departmentFilter) return false;
    if (roleFilter !== 'all' && getEmployeeRoleCategory(employee).toLowerCase() !== roleFilter) return false;

    const haystack = [employee.employeeId || employee.id, getEmployeeFullName(employee), employee.email, employee.department, getEmployeeRoleCategory(employee)].join(' ').toLowerCase();
    return haystack.includes(searchTerm);
  });

  table.innerHTML = filtered.map((employee) => {
    const permissionRecord = permissionRecords.get(String(employee.id)) || permissionRecords.get(String(employee.employeeId)) || null;
    const permissionState = resolvePermissionState(permissionRecord || {});
    const isAccessEnabled = Boolean(permissionRecord && permissionRecord.can_access_admin);
    const statusText = employee.is_active === false || employee.isActive === false ? 'Inactive' : 'Active';
    const statusClass = employee.is_active === false || employee.isActive === false ? 'offline' : 'online';

    return `
      <tr>
        <td>${employee.employeeId || employee.id}</td>
        <td>${getEmployeeFullName(employee)}</td>
        <td>${employee.email}</td>
        <td>${employee.department}</td>
        <td>${employee.role}</td>
        <td>
          <span class="status-pill ${statusClass}">${statusText}</span>
        </td>
        <td>
          <span class="status-pill ${permissionState.statusClass}">${permissionState.permissionLabel}</span>
        </td>
        <td>
          <label class="switch" aria-label="Admin UI access for ${getEmployeeFullName(employee)}">
            <input type="checkbox" data-admin-access-toggle-id="${employee.id}" ${isAccessEnabled ? 'checked' : ''} ${canManageAccess ? '' : 'disabled'} />
            <span class="slider"></span>
          </label>
        </td>
        <td>
          <div class="table-actions">
            <button class="table-action" type="button" data-edit-employee-id="${employee.id}" onclick="openEmployeeModalById('${employee.id}')">Edit</button>
            <button class="table-action danger-action" type="button" data-delete-employee-id="${employee.id}" onclick="deleteEmployeeById('${employee.id}')">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  table.querySelectorAll('[data-admin-access-toggle-id]').forEach((toggle) => {
    toggle.addEventListener('change', async (event) => {
      const employeeId = event.target.dataset.adminAccessToggleId;
      const nextValue = event.target.checked;
      try {
        if (!employeeId) {
          throw new Error('No employee was selected for admin access changes.');
        }
        await updateEmployeeAdminAccessPermission(employeeId, nextValue);
        renderEmployees();
      } catch (error) {
        event.target.checked = !nextValue;
        alert(error.message || 'Unable to update Admin UI access.');
      }
    });
  });
}

function getReplacementStatusClass(status) {
  const normalized = (status || 'Pending').toLowerCase();
  if (normalized === 'approved') return 'online';
  if (normalized === 'rejected') return 'offline';
  return 'pending';
}

function renderReplacements() {
  const table = document.getElementById('replacement-table');
  table.innerHTML = state.replacements.map((replacement) => `
    <tr>
      <td>${replacement.employee}</td>
      <td>${replacement.oldLaptopId}</td>
      <td>${replacement.newLaptopId}</td>
      <td>${replacement.reason}</td>
      <td><span class="status-pill ${getReplacementStatusClass(replacement.status)}">${replacement.status || 'Pending'}</span></td>
    </tr>
  `).join('');
}

function createTicketMessage(sender, text) {
  return {
    id: `${sender}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    sender,
    text: String(text || '').trim(),
    createdAt: new Date().toISOString(),
  };
}

function renderTickets() {
  const table = document.getElementById('tickets-table');
  if (!table) return;

  table.innerHTML = state.tickets.map((ticket) => {
    const messages = Array.isArray(ticket.messages) ? ticket.messages : [];
    const lastMessage = messages[messages.length - 1];
    const issueDate = ticket.createdAt ? new Date(ticket.createdAt) : new Date();
    const issueDateText = Number.isNaN(issueDate.getTime())
      ? '—'
      : issueDate.toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric' });

    return `
      <tr>
        <td>${ticket.employee}</td>
        <td>${ticket.laptopId}</td>
        <td>${ticket.category}</td>
        <td>${issueDateText}</td>
        <td><span class="status-pill ${ticket.priority === 'Critical' ? 'offline' : ticket.priority === 'High' ? 'pending' : 'online'}">${ticket.priority}</span></td>
        <td>
          <select class="ticket-status-select" data-ticket-status-id="${ticket.id}">
            <option value="Open" ${ticket.status === 'Open' ? 'selected' : ''}>Open</option>
            <option value="In Progress" ${ticket.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
            <option value="Resolved" ${ticket.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
          </select>
        </td>
        <td>
          <div class="table-actions">
            <button class="table-action" type="button" data-ticket-message-id="${ticket.id}">${lastMessage ? 'Messages' : 'Message'}</button>
            <button class="table-action" type="button" data-laptop-change-ticket-id="${ticket.id}">Laptop change</button>
            <button class="table-action" type="button" data-email-ticket-id="${ticket.id}">Email</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderPolicies() {
  const table = document.getElementById('policy-table');
  const searchInput = document.getElementById('policy-search');
  const query = (searchInput?.value || '').trim().toLowerCase();

  const filteredPolicies = state.policies.filter((policy) => {
    const matchesStatus = policy.enabled === (policyStatusFilter === 'active');
    if (!matchesStatus) return false;
    if (!query) return true;

    const scopeLabel = policy.scope === 'specific' ? 'Specific users' : 'All users';
    const names = (policy.userIds || []).map((employeeId) => {
      const employee = state.employees.find((item) => item.id === employeeId);
      return employee ? getEmployeeFullName(employee) : employeeId;
    });
    const appliesTo = policy.scope === 'specific' ? (names.length ? names.join(', ') : 'No users selected') : 'Every registered user';
    const scheduleData = policy.schedule || { type: 'daily', start: '08:00', end: '17:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] };
    const scheduleLabel = scheduleData.type === 'weekly'
      ? `Weekly ${scheduleData.days?.join(', ') || 'Mon-Fri'} ${scheduleData.start}-${scheduleData.end}`
      : `${scheduleData.start}-${scheduleData.end}`;

    const haystack = [policy.domain, scopeLabel, appliesTo, policy.category, scheduleLabel].join(' ').toLowerCase();
    return haystack.includes(query);
  });

  if (!table) return;

  if (!filteredPolicies.length) {
    const emptyMessage = query
      ? `No ${policyStatusFilter} blocking rules match "${query}".`
      : `No ${policyStatusFilter} blocking rules found.`;

    table.innerHTML = `
      <tr>
        <td colspan="7">${emptyMessage}</td>
      </tr>
    `;
    return;
  }

  table.innerHTML = filteredPolicies.map((policy) => {
    const scopeLabel = policy.scope === 'specific' ? 'Specific users' : 'All users';
    const names = (policy.userIds || []).map((employeeId) => {
      const employee = state.employees.find((item) => item.id === employeeId);
      return employee ? getEmployeeFullName(employee) : employeeId;
    });
    const appliesTo = policy.scope === 'specific' ? (names.length ? names.join(', ') : 'No users selected') : 'Every registered user';
    const scheduleData = policy.schedule || { type: 'daily', start: '08:00', end: '17:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] };
    const scheduleLabel = scheduleData.type === 'weekly'
      ? `Weekly ${scheduleData.days?.join(', ') || 'Mon-Fri'} ${scheduleData.start}-${scheduleData.end}`
      : `${scheduleData.start}-${scheduleData.end}`;
    const categoryLabel = String(policy.category || 'Custom');

    return `
      <tr>
        <td class="domain-cell"><span class="domain-badge">🌐</span>${policy.domain}</td>
        <td>${scopeLabel}</td>
        <td>${appliesTo}</td>
        <td><span class="policy-category-badge ${String(policy.category || 'custom').toLowerCase().replace(/\s+/g, '-')}">${categoryLabel}</span></td>
        <td>
          <button type="button" class="policy-toggle-switch ${policy.enabled ? 'on' : 'off'}" data-policy-toggle-id="${policy.id}" aria-label="${policy.enabled ? 'Disable' : 'Enable'} ${policy.domain}" title="${policy.enabled ? 'Active' : 'Inactive'}">
            <span class="policy-toggle-knob"></span>
          </button>
        </td>
        <td>${scheduleLabel}</td>
        <td>
          <div class="table-actions-inline">
            <button class="table-menu-button" type="button" data-policy-edit-id="${policy.id}" aria-label="Edit blocking rule" title="Edit">⋮</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  table.querySelectorAll('[data-policy-edit-id]').forEach((button) => {
    button.onclick = () => openPolicyFromEditButton(button);
  });

  table.querySelectorAll('[data-policy-toggle-id]').forEach((button) => {
    button.onclick = () => {
      const policyId = button.dataset.policyToggleId;
      const policy = state.policies.find((item) => item.id === policyId);
      if (!policy) return;

      policy.enabled = !policy.enabled;
      saveState();
      renderPolicies();
    };
  });
}

function updateBlockingSchedulePreview() {
  const startTime = document.getElementById('schedule-start-time')?.value || '08:00';
  const endTime = document.getElementById('schedule-end-time')?.value || '17:00';
  const selectedType = ['weekly', 'daily'].includes(document.querySelector('input[name="schedule-type"]:checked')?.value || '')
    ? (document.querySelector('input[name="schedule-type"]:checked')?.value || 'daily')
    : 'daily';
  const previewText = document.getElementById('schedule-preview-text');
  const previewRange = document.getElementById('schedule-preview-range');
  const weeklyRow = document.getElementById('schedule-weekly-row');
  document.querySelectorAll('.schedule-card .schedule-option').forEach((option) => {
    const radio = option.querySelector('input[name="schedule-type"]');
    option.classList.toggle('selected', Boolean(radio?.checked));
  });

  if (weeklyRow) {
    weeklyRow.classList.toggle('hidden', selectedType !== 'weekly');
  }

  const selectedDays = [...document.querySelectorAll('.day-pill.selected')].map((button) => button.dataset.day);

  if (selectedType === 'weekly') {
    const label = selectedDays.length ? selectedDays.join(', ') : 'Every day';
    if (previewText) previewText.textContent = `Every ${label}`;
  } else {
    if (previewText) previewText.textContent = 'Every day';
  }

  if (previewRange) {
    previewRange.textContent = `${startTime}-${endTime}`;
  }
}

function getTicketSettings() {
  const source = state.ticketSettings || {};
  const base = (demoState && demoState.ticketSettings) || {};
  return {
    ...(JSON.parse(JSON.stringify(base))),
    ...(JSON.parse(JSON.stringify(source))),
    categories: Array.isArray(source.categories) ? source.categories : (base.categories || []),
    priorities: Array.isArray(source.priorities) ? source.priorities : (base.priorities || []),
    statuses: Array.isArray(source.statuses) ? source.statuses : (base.statuses || []),
    cleanupHistory: Array.isArray(source.cleanupHistory) ? source.cleanupHistory : [],
    notifications: { ...(base.notifications || {}), ...(source.notifications || {}) },
    workflow: { ...(base.workflow || {}), ...(source.workflow || {}) },
    security: { ...(base.security || {}), ...(source.security || {}) },
  };
}

function normalizeRetentionDays(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function getTicketHistoryRetentionDays() {
  const settings = getTicketSettings();
  return normalizeRetentionDays(settings.historyRetentionDays, 90);
}

function getTicketMessageRetentionDays() {
  const settings = getTicketSettings();
  if (settings.keepMessagesIndefinitely) return null;
  return normalizeRetentionDays(settings.messageRetentionDays, 30);
}

function isTicketProtectedForMessageCleanup(ticket) {
  const status = (ticket && ticket.status) || '';
  return ['Open', 'In Progress', 'Waiting for Employee'].includes(status);
}

function getTicketCleanupPreviewCount() {
  const retentionDays = getTicketMessageRetentionDays();
  if (retentionDays === null) return 0;

  const cutoffMs = retentionDays * 24 * 60 * 60 * 1000;
  let count = 0;

  state.tickets.forEach((ticket) => {
    if (!ticket || isTicketProtectedForMessageCleanup(ticket)) return;
    const messages = Array.isArray(ticket.messages) ? ticket.messages : [];
    messages.forEach((message) => {
      if (!message || !message.createdAt || message.deletedAt) return;
      const time = new Date(message.createdAt).getTime();
      if (Number.isFinite(time) && Date.now() - time > cutoffMs) {
        count += 1;
      }
    });
  });

  return count;
}

function isTicketMessageExpired(message, ticket) {
  if (!message || !message.createdAt) return false;
  if (message.deletedAt) return true;

  const retentionDays = getTicketMessageRetentionDays();
  if (retentionDays === null || isTicketProtectedForMessageCleanup(ticket)) return false;

  const timestamp = new Date(message.createdAt).getTime();
  if (!Number.isFinite(timestamp)) return false;

  return Date.now() - timestamp > retentionDays * 24 * 60 * 60 * 1000;
}

function getVisibleTicketMessages(ticket) {
  const messages = Array.isArray(ticket?.messages) ? ticket.messages : [];
  return messages.filter((message) => !isTicketMessageExpired(message, ticket));
}

function createDefaultTicketCleanupHistory() {
  const now = Date.now();
  return [
    { date: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(), count: 24, status: 'Completed', manual: false, reason: 'scheduled' },
    { date: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(), count: 12, status: 'Completed', manual: true, reason: 'manual' },
    { date: new Date(now - 18 * 24 * 60 * 60 * 1000).toISOString(), count: 31, status: 'Completed', manual: false, reason: 'scheduled' },
  ];
}

function ensureTicketCleanupHistorySeed() {
  const settings = getTicketSettings();
  if (!Array.isArray(settings.cleanupHistory) || settings.cleanupHistory.length === 0) {
    settings.cleanupHistory = createDefaultTicketCleanupHistory();
    state.ticketSettings = settings;
    if (typeof saveState === 'function') {
      saveState();
    }
  }
  return settings.cleanupHistory;
}

function pruneTicketCleanupHistory() {
  const settings = getTicketSettings();
  const history = ensureTicketCleanupHistorySeed();
  const retentionDays = getTicketHistoryRetentionDays();
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const filtered = (history || []).filter((entry) => {
    if (!entry || !entry.date) return false;
    const recorded = new Date(entry.date).getTime();
    return Number.isFinite(recorded) && (Date.now() - recorded) <= cutoff + (24 * 60 * 60 * 1000);
  });

  settings.cleanupHistory = filtered;
  state.ticketSettings = settings;
  return settings.cleanupHistory;
}

function applyTicketMessageRetentionPolicy({ manual = false, reason = 'automatic' } = {}) {
  const settings = getTicketSettings();
  if (!settings.autoCleanupEnabled && !manual) {
    return { count: 0, status: 'skipped' };
  }

  const retentionDays = getTicketMessageRetentionDays();
  const cutoffMs = retentionDays === null ? null : retentionDays * 24 * 60 * 60 * 1000;
  const executionKey = `${reason}-${Math.floor(Date.now() / 60000)}`;
  let affected = 0;

  state.tickets.forEach((ticket) => {
    if (!ticket || isTicketProtectedForMessageCleanup(ticket)) return;
    const messages = Array.isArray(ticket.messages) ? ticket.messages : [];

    messages.forEach((message) => {
      if (!message || !message.createdAt || message.deletedAt || cutoffMs === null) return;
      const timestamp = new Date(message.createdAt).getTime();
      if (!Number.isFinite(timestamp) || Date.now() - timestamp <= cutoffMs) return;
      message.deletedAt = new Date().toISOString();
      message.archived = true;
      affected += 1;
    });
  });

  settings.lastCleanupDate = new Date().toISOString();
  settings.nextScheduledCleanup = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  settings.cleanupHistory = Array.isArray(settings.cleanupHistory) ? settings.cleanupHistory : [];

  if (settings.lastCleanupExecutionKey === executionKey) {
    state.ticketSettings = settings;
    return { count: affected, status: affected > 0 ? 'Completed' : 'skipped' };
  }

  if (affected > 0) {
    settings.cleanupHistory.unshift({
      date: new Date().toISOString(),
      count: affected,
      status: 'Completed',
      manual,
      reason,
    });
  }

  settings.lastCleanupExecutionKey = executionKey;
  settings.cleanupHistory = settings.cleanupHistory.slice(0, 20);
  state.ticketSettings = settings;
  pruneTicketCleanupHistory();
  saveState();
  return { count: affected, status: affected > 0 ? 'Completed' : 'skipped' };
}

function renderTicketSettings() {
  const settings = getTicketSettings();
  const enabledToggle = document.getElementById('ticket-settings-enabled');
  const defaultStatus = document.getElementById('ticket-default-status');
  const defaultPriority = document.getElementById('ticket-default-priority');
  const ticketIdFormat = document.getElementById('ticket-id-format');
  const defaultAssignment = document.getElementById('ticket-default-assignment');
  const supportInstructions = document.getElementById('ticket-support-instructions');
  const retentionInput = document.getElementById('ticket-message-retention-days');
  const closedTicketRetentionInput = document.getElementById('ticket-closed-retention-days');
  const keepForever = document.getElementById('ticket-keep-messages-indefinitely');
  const autoCleanupToggle = document.getElementById('ticket-auto-cleanup-enabled');
  const cleanupPreview = document.getElementById('ticket-cleanup-preview');
  const cleanupHistory = document.getElementById('ticket-cleanup-history');
  const historyRetentionSelect = document.getElementById('ticket-history-retention-days');
  const categoryList = document.getElementById('ticket-category-list');
  const ticketNotifications = document.getElementById('ticket-notify-new-ticket');
  const ticketNotifyCritical = document.getElementById('ticket-notify-high-priority');
  const ticketNotifyEmployee = document.getElementById('ticket-notify-new-employee-message');

  if (enabledToggle) enabledToggle.checked = Boolean(settings.enabled);
  if (defaultStatus) defaultStatus.value = settings.defaultStatus || 'Open';
  if (defaultPriority) defaultPriority.value = settings.defaultPriority || 'Medium';
  if (ticketIdFormat) ticketIdFormat.value = settings.ticketIdFormat || 'TKT-2026-0001';
  if (defaultAssignment) defaultAssignment.value = settings.defaultAssignment || 'IT Support';
  if (supportInstructions) supportInstructions.value = settings.supportInstructions || 'Contact the IT support desk...';
  if (retentionInput) retentionInput.value = String(settings.messageRetentionDays || 30);
  if (closedTicketRetentionInput) closedTicketRetentionInput.value = String(getTicketRetentionDays());
  if (historyRetentionSelect) historyRetentionSelect.value = String(getTicketHistoryRetentionDays());
  if (keepForever) keepForever.checked = Boolean(settings.keepMessagesIndefinitely);
  if (autoCleanupToggle) autoCleanupToggle.checked = Boolean(settings.autoCleanupEnabled);
  document.querySelectorAll('[data-ticket-priority]').forEach((input) => {
    input.checked = (settings.priorities || []).includes(input.dataset.ticketPriority);
  });
  const workflow = settings.workflow || {};
  [
    ['ticket-allow-employee-reopen', 'allowEmployeeReopen'],
    ['ticket-allow-admin-reopen', 'allowITReopen'],
    ['ticket-require-resolution-notes', 'requireResolutionNotes'],
  ].forEach(([id, key]) => {
    const input = document.getElementById(id);
    if (input) input.checked = Boolean(workflow[key]);
  });
  const security = settings.security || {};
  [
    ['ticket-admin-only-settings', 'adminOnlySettings'],
    ['ticket-restrict-management-by-role', 'restrictManagementByRole'],
  ].forEach(([id, key]) => {
    const input = document.getElementById(id);
    if (input) input.checked = Boolean(security[key]);
  });
  if (cleanupPreview) cleanupPreview.textContent = `${getTicketCleanupPreviewCount()} message(s) eligible for cleanup`;
  if (cleanupHistory) {
    const history = pruneTicketCleanupHistory();
    const searchInput = document.getElementById('ticket-cleanup-search');
    const filterButtons = document.querySelectorAll('.segment-btn');
    const selectedFilter = document.querySelector('.segment-btn.active')?.dataset.historyFilter || 'all';
    const query = (searchInput?.value || '').trim().toLowerCase();

    const filteredHistory = history.filter((entry) => {
      const mode = entry.manual ? 'manual' : 'scheduled';
      const matchesFilter = selectedFilter === 'all' || mode === selectedFilter;
      const haystack = [entry.date, entry.status, entry.manual ? 'manual' : 'scheduled', String(entry.count ?? '')].join(' ').toLowerCase();
      const matchesQuery = !query || haystack.includes(query);
      return matchesFilter && matchesQuery;
    });

    const totalMessagesRemoved = history.reduce((sum, entry) => sum + Number(entry.count || 0), 0);
    const lastCleanup = history[0]?.date ? new Date(history[0].date).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'N/A';

    const runsCount = document.getElementById('retention-runs-count');
    const removedCount = document.getElementById('retention-removed-count');
    const lastCleanupValue = document.getElementById('retention-last-cleanup');
    const resultsSummary = document.getElementById('retention-results-summary');

    if (runsCount) runsCount.textContent = String(history.length);
    if (removedCount) removedCount.textContent = String(totalMessagesRemoved);
    if (lastCleanupValue) lastCleanupValue.textContent = lastCleanup;
    if (resultsSummary) resultsSummary.textContent = `Showing ${filteredHistory.length} of ${history.length} record${history.length === 1 ? '' : 's'}`;

    if (!filteredHistory.length) {
      cleanupHistory.innerHTML = '<tr><td colspan="4" class="retention-empty-state">No retention history to display.</td></tr>';
    } else {
      cleanupHistory.innerHTML = filteredHistory.map((entry) => `
        <tr>
          <td>${entry.date ? new Date(entry.date).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'N/A'}</td>
          <td>${entry.count ?? 0}</td>
          <td><span class="history-status-pill ${((entry.status || 'Completed').toLowerCase() === 'completed') ? 'success' : 'neutral'}">${entry.status || 'Completed'}</span></td>
          <td><span class="history-mode-pill">${entry.manual ? 'Manual' : 'Scheduled'}</span></td>
        </tr>
      `).join('');
    }
  }

  if (categoryList) {
    const categoryEntries = Array.isArray(settings.categories) ? settings.categories : [];

    categoryList.innerHTML = `
      <div class="ticket-category-table">
        <div class="ticket-category-header">
          <span>Category Name</span>
          <span>Status</span>
          <span>Actions</span>
        </div>
        ${categoryEntries.map((category, index) => {
          const categoryName = String(category.name || '').trim() || `Category ${index + 1}`;
          const isActive = Boolean(category.active);
          return `
            <div class="ticket-category-row">
              <div class="ticket-category-name-cell">
                <input type="text" class="ticket-category-name-input" aria-label="Category name" value="${escapeDashboardText(categoryName)}" />
              </div>
              <div class="ticket-category-status-cell">
                <label class="switch ticket-category-switch" aria-label="${isActive ? 'Disable' : 'Enable'} ${escapeDashboardText(categoryName)} category">
                  <input type="checkbox" class="ticket-category-active" data-ticket-category-active-index="${index}" ${isActive ? 'checked' : ''} />
                  <span class="slider"></span>
                </label>
                <span class="ticket-category-status-text">${isActive ? 'Active' : 'Inactive'}</span>
              </div>
              <div class="ticket-category-action-cell">
                <button type="button" class="remove-button small-button" data-ticket-category-delete-index="${index}">Remove</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  if (ticketNotifications) ticketNotifications.checked = Boolean(settings.notifications?.newTicket);
  if (ticketNotifyCritical) ticketNotifyCritical.checked = Boolean(settings.notifications?.highPriority);
  if (ticketNotifyEmployee) ticketNotifyEmployee.checked = Boolean(settings.notifications?.newEmployeeMessage);
  [
    ['settings-notify-new-ticket', 'newTicket'],
    ['settings-notify-high-priority', 'highPriority'],
    ['settings-notify-new-employee-message', 'newEmployeeMessage'],
  ].forEach(([id, key]) => {
    const input = document.getElementById(id);
    if (input) input.checked = Boolean(settings.notifications?.[key]);
  });

  renderIssueCategoryOptions();
}

function bindTicketSettingsControls() {
  const saveSettingsButton = document.getElementById('ticket-settings-save');
  const runCleanupButton = document.getElementById('ticket-run-cleanup');
  const addCategoryButton = document.getElementById('ticket-add-category');
  const categoryList = document.getElementById('ticket-category-list');
  const cleanupSearch = document.getElementById('ticket-cleanup-search');
  const historyFilterButtons = document.querySelectorAll('.segment-btn');
  const ticketTabs = document.querySelectorAll('.ticket-settings-tab');

  ticketTabs.forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.dataset.ticketTab;
      ticketTabs.forEach((tab) => {
        const isActive = tab === button;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', String(isActive));
      });

      document.querySelectorAll('.ticket-settings-panel').forEach((panel) => {
        panel.classList.toggle('active', panel.dataset.ticketPanel === target);
      });
    });
  });

  if (cleanupSearch) {
    if (cleanupSearch.dataset.cleanupSearchBound !== 'true') {
      cleanupSearch.dataset.cleanupSearchBound = 'true';
      cleanupSearch.addEventListener('input', () => renderTicketSettings());
    }
  }

  historyFilterButtons.forEach((button) => {
    if (button.dataset.historyFilterBound === 'true') return;
    button.dataset.historyFilterBound = 'true';
    button.addEventListener('click', () => {
      historyFilterButtons.forEach((item) => item.classList.toggle('active', item === button));
      renderTicketSettings();
    });
  });

  const applySettingsFromInputs = async () => {
    const settings = getTicketSettings();
    const selectedCategories = Array.from(document.querySelectorAll('.ticket-category-row')).map((row) => {
      const categoryName = row.querySelector('.ticket-category-name-input');
      const activeInput = row.querySelector('.ticket-category-active');
      const name = String(categoryName?.value || '').trim();
      if (!name) return null;
      return {
        id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `category-${Date.now()}`,
        name,
        active: activeInput ? activeInput.checked : true,
      };
    }).filter(Boolean);

    settings.enabled = document.getElementById('ticket-settings-enabled')?.checked ?? settings.enabled;
    settings.defaultStatus = document.getElementById('ticket-default-status')?.value || settings.defaultStatus;
    settings.defaultPriority = document.getElementById('ticket-default-priority')?.value || settings.defaultPriority;
    settings.ticketIdFormat = document.getElementById('ticket-id-format')?.value || settings.ticketIdFormat;
    settings.defaultAssignment = document.getElementById('ticket-default-assignment')?.value || settings.defaultAssignment;
    settings.supportInstructions = document.getElementById('ticket-support-instructions')?.value || settings.supportInstructions;
    settings.messageRetentionDays = normalizeRetentionDays(document.getElementById('ticket-message-retention-days')?.value, settings.messageRetentionDays ?? 30);
    settings.historyRetentionDays = normalizeRetentionDays(document.getElementById('ticket-history-retention-days')?.value, settings.historyRetentionDays ?? 90);
    settings.resolvedTicketRetentionDays = normalizeRetentionDays(document.getElementById('ticket-closed-retention-days')?.value, settings.resolvedTicketRetentionDays ?? getTicketRetentionDays());
    settings.keepMessagesIndefinitely = document.getElementById('ticket-keep-messages-indefinitely')?.checked ?? settings.keepMessagesIndefinitely;
    settings.autoCleanupEnabled = document.getElementById('ticket-auto-cleanup-enabled')?.checked ?? settings.autoCleanupEnabled;
    settings.categories = selectedCategories;
    settings.priorities = Array.from(document.querySelectorAll('[data-ticket-priority]:checked'))
      .map((input) => input.dataset.ticketPriority);
    state.settings = state.settings || {};
    state.settings.ticketRetentionDays = settings.resolvedTicketRetentionDays;
    settings.notifications = { ...(settings.notifications || {}), newTicket: document.getElementById('ticket-notify-new-ticket')?.checked ?? true, highPriority: document.getElementById('ticket-notify-high-priority')?.checked ?? true, newEmployeeMessage: document.getElementById('ticket-notify-new-employee-message')?.checked ?? true };
    settings.workflow = {
      ...(settings.workflow || {}),
      allowEmployeeReopen: document.getElementById('ticket-allow-employee-reopen')?.checked ?? true,
      allowITReopen: document.getElementById('ticket-allow-admin-reopen')?.checked ?? true,
      requireResolutionNotes: document.getElementById('ticket-require-resolution-notes')?.checked ?? false,
    };
    settings.security = {
      ...(settings.security || {}),
      adminOnlySettings: document.getElementById('ticket-admin-only-settings')?.checked ?? true,
      restrictManagementByRole: document.getElementById('ticket-restrict-management-by-role')?.checked ?? true,
    };

    state.ticketSettings = settings;
    const databaseSynced = await saveState();
    renderIssueCategoryOptions();
    renderTicketSettings();
    showToast(databaseSynced ? 'success' : 'error', databaseSynced ? 'Ticket settings updated' : 'Saved locally only',
      databaseSynced ? 'Your ticket settings are saved and synced.' : 'The database did not sync; the extension will not receive these changes yet.');
  };

  if (saveSettingsButton) {
    saveSettingsButton.addEventListener('click', applySettingsFromInputs);
  }

  if (addCategoryButton && categoryList) {
    addCategoryButton.addEventListener('click', () => {
      const categoryTable = categoryList.querySelector('.ticket-category-table');
      const nextIndex = categoryTable ? categoryTable.querySelectorAll('.ticket-category-row').length : 0;
      const newCategory = document.createElement('div');
      newCategory.className = 'ticket-category-row';
      newCategory.innerHTML = `
        <div class="ticket-category-name-cell">
          <input type="text" class="ticket-category-name-input" aria-label="Category name" value="New category" />
        </div>
        <div class="ticket-category-status-cell">
          <label class="switch ticket-category-switch" aria-label="Enable category">
            <input type="checkbox" class="ticket-category-active" data-ticket-category-active-index="${nextIndex}" checked />
            <span class="slider"></span>
          </label>
          <span class="ticket-category-status-text">Active</span>
        </div>
        <div class="ticket-category-action-cell">
          <button type="button" class="remove-button small-button" data-ticket-category-delete-index="${nextIndex}">Remove</button>
        </div>
      `;
      if (categoryTable) {
        categoryTable.appendChild(newCategory);
      } else {
        categoryList.appendChild(newCategory);
      }
      newCategory.querySelector('.ticket-category-name-input')?.select();
    });
  }

  if (categoryList) {
    categoryList.addEventListener('click', (event) => {
      const removeButton = event.target.closest('[data-ticket-category-delete-index]');
      if (!removeButton) return;
      const row = removeButton.closest('.ticket-category-row');
      if (row) row.remove();
    });
  }

  if (runCleanupButton) {
    runCleanupButton.addEventListener('click', () => {
      const shouldRun = window.confirm('This will archive expired ticket messages only. Ticket records and assignment data will remain intact. Continue?');
      if (!shouldRun) return;
      const result = applyTicketMessageRetentionPolicy({ manual: true, reason: 'manual' });
      const summary = result?.count ? `${result.count} expired message(s) archived.` : 'No expired messages were found.';
      window.alert(summary);
      renderTicketSettings();
      renderDashboard();
    });
  }
}

function renderIssueCategoryOptions() {
  const issueCategorySelect = document.getElementById('issue-category');
  if (!issueCategorySelect) return;

  const categories = (getTicketSettings().categories || []).filter((category) => category && category.active !== false && String(category.name || '').trim());
  issueCategorySelect.disabled = categories.length === 0;
  const options = categories.length
    ? categories.map((category) => `<option value="${escapeDashboardText(category.name)}">${escapeDashboardText(category.name)}</option>`).join('')
    : '<option value="" selected disabled>No active categories</option>';
  issueCategorySelect.innerHTML = options;
}

function renderUpdateLogs() {
  const wrap = document.getElementById('changelog-list');
  const modalWrap = document.getElementById('changelog-modal-list');
  const changelog = Array.isArray(state.changelog) && state.changelog.length ? state.changelog : [];
  const makeMarkup = () => {
    if (!changelog.length) {
      return '<div class="ticket-message-empty">No change logs yet.</div>';
    }

    return changelog.map((entry) => `
      <article class="changelog-item">
        <div class="changelog-head">
          <span class="changelog-version">${escapeDashboardText(entry.version || getVersionFromDate(entry.date))}</span>
          <span class="changelog-date">${escapeDashboardText(entry.date || 'N/A')}</span>
        </div>
        <h4>${escapeDashboardText(entry.title || 'System update')}</h4>
        <ul>
          ${(Array.isArray(entry.changes) ? entry.changes : []).map((change) => `<li>${escapeDashboardText(change)}</li>`).join('')}
        </ul>
      </article>
    `).join('');
  };

  const markup = makeMarkup();
  if (wrap) wrap.innerHTML = markup;
  if (modalWrap) modalWrap.innerHTML = markup;

  const versionBadge = document.getElementById('open-changelog-modal');
  if (versionBadge) {
    versionBadge.textContent = getCurrentVersionLabel();
  }
  const sidebarVersion = document.getElementById('sidebar-version');
  if (sidebarVersion) {
    sidebarVersion.textContent = getCurrentVersionLabel();
  }
}

function openChangelogModal(force = false) {
  const modal = document.getElementById('changelog-modal');
  const checkbox = document.getElementById('changelog-dont-show');
  const sessionFlag = sessionStorage.getItem(CHANGELOG_SESSION_KEY) === 'true';

  if (!modal) return;
  if (!force && sessionFlag) {
    closeChangelogModal();
    return;
  }

  if (checkbox) checkbox.checked = false;
  renderUpdateLogs();
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
  modal.setAttribute('aria-hidden', 'false');
}

function closeChangelogModal() {
  const modal = document.getElementById('changelog-modal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.style.display = 'none';
  modal.setAttribute('aria-hidden', 'true');
}

function handleChangelogClose() {
  const checkbox = document.getElementById('changelog-dont-show');
  if (checkbox && checkbox.checked) {
    suppressChangelogForSession();
  }
  closeChangelogModal();
}

function suppressChangelogForSession() {
  try {
    sessionStorage.setItem(CHANGELOG_SESSION_KEY, 'true');
  } catch (error) {
    console.warn('Unable to save changelog session preference.');
  }
}

function logAdminAction(action, entity, detail) {
  const actions = Array.isArray(state.notifications) ? state.notifications : [];
  const entry = {
    id: `act-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    action: String(action || 'Updated'),
    entity: String(entity || 'System'),
    detail: String(detail || 'Admin action performed'),
    timestamp: new Date().toISOString(),
  };

  actions.unshift(entry);
  state.notifications = actions.slice(0, 8);
  saveState();
  showToast('success', `${entry.action} ${entry.entity}`, entry.detail);
}

function renderAdminActivity() {
  const tables = document.querySelectorAll('[data-admin-activity-table]');
  const entries = Array.isArray(state.notifications) && state.notifications.length ? state.notifications : [];

  tables.forEach((table) => {
    table.innerHTML = entries.length
      ? entries.map((entry) => `
          <tr>
            <td>${entry.action}</td>
            <td>${entry.entity}</td>
            <td>${entry.detail}</td>
            <td>${new Date(entry.timestamp || Date.now()).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="4">No recent admin actions yet.</td></tr>';
  });
}

function renderUsage() {
  const table = document.getElementById('usage-table');
  if (!table) return;

  table.innerHTML = state.usage.map((entry) => `
    <tr>
      <td>${entry.user}</td>
      <td>${entry.laptop}</td>
      <td>${entry.mbUsed} MB</td>
      <td>${entry.onlineHours} hrs</td>
    </tr>
  `).join('');
}

function buildWebsiteAnalyticsData() {
  const usageEntries = Array.isArray(state.usage) ? state.usage : [];
  const activePolicies = Array.isArray(state.policies) ? state.policies.filter((policy) => policy && policy.enabled !== false) : [];
  const registeredDevices = Array.isArray(state.devices) ? state.devices.filter((device) => device && device.isRegistered !== false) : [];

  const totalVisits = usageEntries.reduce((sum, entry) => sum + Math.max(1, Math.round((Number(entry.mbUsed || 0) / 35) + (Number(entry.onlineHours || 0) * 8))), 0);
  const totalHours = usageEntries.reduce((sum, entry) => sum + Number(entry.onlineHours || 0), 0);
  const blockedAttempts = activePolicies.length > 0 ? activePolicies.length * 26 + usageEntries.length * 8 : usageEntries.length * 6;
  const activeDeviceCount = registeredDevices.filter((device) => device.status !== 'offline' && device.status !== 'disposal').length;
  const totalDeviceCount = Math.max(registeredDevices.length, 1);

  const domainCounts = {};
  activePolicies.forEach((policy) => {
    if (!policy?.domain) return;
    domainCounts[policy.domain] = (domainCounts[policy.domain] || 0) + (policy.enabled ? 32 : 12);
  });

  usageEntries.forEach((entry) => {
    const domain = entry.laptop || 'general-usage';
    domainCounts[domain] = (domainCounts[domain] || 0) + Math.max(1, Number(entry.mbUsed || 0) / 28);
  });

  const mostVisited = Object.entries(domainCounts)
    .map(([domain, value]) => ({ domain, value: Math.round(Number(value) || 0) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const blockedDomains = activePolicies.length
    ? activePolicies
        .map((policy) => ({ domain: policy.domain, value: 22 + Math.round((policy.category?.length || 4) * 8) + (policy.scope === 'all' ? 18 : 0) }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)
    : [{ domain: 'No blocked domains', value: 0 }];

  const recentActivity = [
    ...usageEntries.map((entry) => ({
      device: entry.laptop || 'Unassigned',
      user: entry.user || 'Unknown user',
      domain: entry.laptop || 'website-activity',
      category: 'Activity',
      status: 'Allowed',
      duration: `${Math.max(1, Number(entry.onlineHours || 0)).toFixed(2)}h`,
    })),
    ...state.tickets.map((ticket) => ({
      device: ticket.laptopId || 'Unassigned',
      user: ticket.employee || 'Unknown user',
      domain: ticket.category ? `${ticket.category.toLowerCase()}.company` : 'support.company',
      category: ticket.category || 'Support',
      status: ticket.status === 'Open' ? 'Allowed' : 'Blocked',
      duration: `${Math.min(2, Math.max(0.1, (ticket.priority === 'High' ? 1.5 : 0.7))).toFixed(2)}h`,
    }))
  ].slice(0, 6);

  return {
    totalVisits,
    totalHours,
    blockedAttempts,
    activeDeviceCount,
    totalDeviceCount,
    mostVisited,
    blockedDomains,
    recentActivity,
  };
}

function renderAnalyticsOverview() {
  const analyticsData = buildWebsiteAnalyticsData();
  const statCards = document.querySelectorAll('#analytics-overview-panel .analytics-stat-card');
  if (statCards.length >= 4) {
    statCards[0].querySelector('.analytics-stat-value').textContent = `${analyticsData.totalVisits.toLocaleString()}`;
    statCards[0].querySelector('small').textContent = `${analyticsData.mostVisited[0]?.domain || 'No domains'} tracked`;

    statCards[1].querySelector('.analytics-stat-value').textContent = `${Number(analyticsData.totalHours).toFixed(1)}h`;
    statCards[1].querySelector('small').textContent = `${analyticsData.activeDeviceCount} devices active`;

    statCards[2].querySelector('.analytics-stat-value').textContent = `${analyticsData.blockedAttempts.toLocaleString()}`;
    statCards[2].querySelector('small').textContent = `${analyticsData.blockedDomains[0]?.domain || 'No domains'} blocked`;

    statCards[3].querySelector('.analytics-stat-value').textContent = `${analyticsData.activeDeviceCount} / ${analyticsData.totalDeviceCount}`;
    statCards[3].querySelector('small').textContent = `${Math.max(0, analyticsData.totalDeviceCount - analyticsData.activeDeviceCount)} offline`;
  }

  const websiteLists = document.querySelectorAll('#analytics-website-activity-panel .rank-list');
  if (websiteLists.length >= 2) {
    const mostVisitedHtml = analyticsData.mostVisited.map((entry, index) => {
      const iconMap = ['fb', 'yt', 'tt', 'g', 'ig'];
      const label = entry.domain.split('.')[0].slice(0, 2).toUpperCase() || 'W';
      return `
        <li>
          <div class="site-name"><span class="site-icon ${iconMap[index] || 'g'}">${label}</span><span>${entry.domain}</span></div>
          <strong>${entry.value.toLocaleString()}</strong>
          <em>${Math.max(4, Math.round((entry.value / Math.max(analyticsData.totalVisits, 1)) * 100))}%</em>
        </li>
      `;
    }).join('');
    websiteLists[0].innerHTML = mostVisitedHtml || '<li><span>No website activity yet.</span></li>';

    const blockedHtml = analyticsData.blockedDomains.map((entry, index) => {
      const iconMap = ['fb', 'yt', 'sc', 'ig', 'nf'];
      const label = entry.domain.split('.')[0].slice(0, 2).toUpperCase() || 'B';
      return `
        <li>
          <div class="site-name"><span class="site-icon ${iconMap[index] || 'g'}">${label}</span><span>${entry.domain}</span></div>
          <strong>${entry.value}</strong>
          <em>${Math.max(5, Math.min(99, Math.round((entry.value / Math.max(analyticsData.blockedAttempts, 1)) * 100)))}%</em>
        </li>
      `;
    }).join('');
    websiteLists[1].innerHTML = blockedHtml || '<li><span>No blocked domains yet.</span></li>';
  }

  const activityTables = document.querySelectorAll('[data-admin-activity-table]');
  activityTables.forEach((table) => {
    const rows = analyticsData.recentActivity.length
      ? analyticsData.recentActivity.map((entry) => `
          <tr>
            <td>${entry.device}</td>
            <td>${entry.user}</td>
            <td>${entry.domain}</td>
            <td>${entry.category}</td>
            <td><span class="status-pill ${entry.status === 'Blocked' ? 'offline' : 'online'}">${entry.status}</span></td>
            <td>${entry.duration}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="6">No website activity yet.</td></tr>';
    table.innerHTML = rows;
  });
}

function renderAnalyticsMbUsage() {
  const mbUsageElement = document.getElementById('analytics-mb-total');
  if (!mbUsageElement) return;

  const totalMbUsed = state.usage.reduce((sum, entry) => sum + Number(entry.mbUsed || 0), 0);
  mbUsageElement.textContent = `${totalMbUsed.toLocaleString()} MB`;
}

function syncUserActivityAnalytics() {
  const activityMap = new Map();

  const getUserKey = (userName, email) => {
    const normalizedName = (userName || '').trim();
    const normalizedEmail = (email || '').trim().toLowerCase();

    if (normalizedEmail) return normalizedEmail;

    const normalizedNameLower = normalizedName.toLowerCase();
    const deviceMatch = state.devices.find((device) => {
      const fullName = `${device.user || ''} ${device.surname || ''}`.trim().toLowerCase();
      return fullName === normalizedNameLower && Boolean(device.email);
    });

    if (deviceMatch?.email) return deviceMatch.email.toLowerCase();

    const employeeMatch = state.employees.find((employee) => {
      const fullName = getEmployeeFullName(employee).toLowerCase();
      return fullName === normalizedNameLower || (employee.email && employee.email.toLowerCase() === normalizedNameLower);
    });

    if (employeeMatch?.email) return employeeMatch.email.toLowerCase();
    return normalizedNameLower || 'unknown user';
  };

  const addActivity = (key, userName, laptopName, mbUsed = 0, onlineHours = 0) => {
    if (!key) return;

    const existing = activityMap.get(key) || {
      user: userName || 'Unknown user',
      laptop: laptopName || 'Unknown laptop',
      mbUsed: 0,
      onlineHours: 0,
      recordedAt: new Date().toISOString(),
    };

    activityMap.set(key, {
      ...existing,
      user: existing.user || userName || 'Unknown user',
      laptop: existing.laptop || laptopName || 'Unknown laptop',
      mbUsed: Number(existing.mbUsed || 0) + Number(mbUsed || 0),
      onlineHours: Number(existing.onlineHours || 0) + Number(onlineHours || 0),
      recordedAt: new Date().toISOString(),
    });
  };

  state.devices.forEach((device) => {
    if (!device || device.user === 'Unassigned' || !device.email) return;

    const userKey = getUserKey(`${device.user || ''} ${device.surname || ''}`.trim(), device.email);
    const userName = `${device.user || ''} ${device.surname || ''}`.trim() || device.email;
    addActivity(userKey, userName, device.laptopName || device.laptopId || 'Laptop', 0, 0);
  });

  state.usage.forEach((entry) => {
    const userName = entry.user || 'Unknown user';
    const userKey = getUserKey(userName, entry.email || '');
    const laptopName = entry.laptop || 'Laptop';
    const mbUsed = Number(entry.mbUsed || 0);
    const onlineHours = Number(entry.onlineHours || 0);

    addActivity(userKey, userName, laptopName, mbUsed, onlineHours);
  });

  state.tickets.forEach((ticket) => {
    if (!ticket || !ticket.employee) return;

    const userKey = getUserKey(ticket.employee, ticket.email || '');
    const laptopName = ticket.laptopId || 'Laptop';
    const mbUsed = ['High', 'Critical'].includes(ticket.priority) ? 120 : 60;
    const onlineHours = ['High', 'Critical'].includes(ticket.priority) ? 1.5 : 0.8;

    addActivity(userKey, ticket.employee, laptopName, mbUsed, onlineHours);
  });

  const nextUsage = Array.from(activityMap.values())
    .map((entry) => ({
      user: entry.user,
      laptop: entry.laptop,
      mbUsed: Number(entry.mbUsed || 0).toFixed(0),
      onlineHours: Number(entry.onlineHours || 0).toFixed(1),
      recordedAt: entry.recordedAt || new Date().toISOString(),
    }))
    .sort((a, b) => a.user.localeCompare(b.user));

  state.usage = nextUsage;

  const weeklyUsage = Array.from({ length: 7 }, (_, index) => {
    const factor = [0.8, 1.1, 0.9, 1.3, 1.5, 1.2, 1.4][index];
    const total = nextUsage.reduce((sum, entry) => sum + Number(entry.mbUsed || 0), 0);
    return Math.max(120, Math.round((total / Math.max(nextUsage.length, 1)) * factor));
  });

  state.analytics = state.analytics || {};
  state.analytics.weeklyUsage = weeklyUsage;
  return state.usage;
}

function refreshLiveUsageData() {
  if (!Array.isArray(state.usage)) return;

  state.usage = state.usage.map((entry) => {
    const nextMbUsed = Math.max(50, Number(entry.mbUsed || 0) + (Math.random() * 30 - 15));
    const nextOnlineHours = Math.max(0.5, Number(entry.onlineHours || 0) + (Math.random() * 0.8 - 0.4));

    return {
      ...entry,
      mbUsed: Number(nextMbUsed.toFixed(0)),
      onlineHours: Number(nextOnlineHours.toFixed(1)),
      recordedAt: new Date().toISOString(),
    };
  });

  syncUserActivityAnalytics();
  saveState();
  renderUsage();
  renderAnalyticsMbUsage();
}

function isChromeOrEdgeBrowser() {
  const userAgent = navigator.userAgent || '';
  const brands = navigator.userAgentData?.brands?.map((brand) => brand.brand).join(' ') || '';
  const edgeMatch = /Edg\//i.test(userAgent) || /EdgA\//i.test(userAgent) || /Edg/i.test(brands);
  const chromeMatch = /Chrome\//i.test(userAgent) || /CriOS\//i.test(userAgent) || /Chrome/i.test(brands);
  return edgeMatch || chromeMatch;
}

function renderIncognitoStatus() {
  const toggle = document.getElementById('incognito-toggle');
  const settingsToggle = document.getElementById('settings-incognito-toggle');
  const status = document.getElementById('incognito-status');
  const supported = isChromeOrEdgeBrowser();
  const enabled = supported && Boolean(state.features?.incognitoBlocker);

  if (toggle) {
    toggle.disabled = !supported;
    toggle.checked = enabled;
  }

  if (settingsToggle) {
    settingsToggle.disabled = !supported;
    settingsToggle.checked = enabled;
  }

  if (status) {
    if (!supported) {
      status.textContent = 'Chrome / Edge only';
      status.classList.add('disabled');
      status.classList.remove('enabled');
    } else {
      status.textContent = enabled
        ? (incognitoControlSyncSucceeded === false
          ? 'Enabled locally — not synced'
          : incognitoControlSyncSucceeded === true
            ? 'Enabled — closes tabs when extension access is allowed'
            : 'Enabled — sync pending')
        : 'Disabled';
      status.classList.toggle('enabled', enabled);
      status.classList.toggle('disabled', !enabled);
    }
  }
}

function renderCharts() {
  if (!window.Chart) {
    return;
  }

  const canvases = ['daily-chart', 'category-chart', 'usage-bar-chart', 'status-radar-chart'];
  const totalCharts = canvases.filter((canvasId) => document.getElementById(canvasId)).length;
  if (totalCharts === 0) {
    return;
  }

  Object.keys(window).forEach((key) => {
    if (key.endsWith('ChartInstance')) {
      const instance = window[key];
      if (instance && typeof instance.destroy === 'function') {
        instance.destroy();
      }
    }
  });

  const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--brand').trim() || '#6d5efc';
  const dailyContext = document.getElementById('daily-chart')?.getContext('2d');
  const categoryContext = document.getElementById('category-chart')?.getContext('2d');
  const usageBarContext = document.getElementById('usage-bar-chart')?.getContext('2d');
  const statusRadarContext = document.getElementById('status-radar-chart')?.getContext('2d');

  if (dailyContext) {
    window.dailyChartInstance = new Chart(dailyContext, {
      type: 'line',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
          label: 'Visits',
          data: state.analytics.daily,
          borderColor: accentColor,
          backgroundColor: accentColor + '20',
          borderWidth: 3,
          tension: 0.35,
          fill: true,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: 12 },
        plugins: {
          legend: { display: false },
        },
      },
    });
  }

  if (categoryContext) {
    window.categoryChartInstance = new Chart(categoryContext, {
      type: 'doughnut',
      data: {
        labels: ['Social', 'Entertainment', 'Gaming', 'Custom'],
        datasets: [{
          data: state.analytics.categories,
          backgroundColor: [accentColor, '#47b6a2', '#ff7b72', '#f2b84b'],
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: 12 },
        plugins: {
          legend: { position: 'bottom' },
        },
      },
    });
  }

  if (usageBarContext) {
    window.usageBarChartInstance = new Chart(usageBarContext, {
      type: 'bar',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
          label: 'MB used',
          data: state.analytics.weeklyUsage,
          backgroundColor: [accentColor, '#7ca7ff', '#47b6a2', '#f2b84b', '#ff7b72', DEFAULT_ACCENT_COLOR, '#8b9dff'],
          borderRadius: 8,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: 12 },
        plugins: {
          legend: { display: false },
        },
      },
    });
  }

  if (statusRadarContext) {
    window.statusRadarChartInstance = new Chart(statusRadarContext, {
      type: 'radar',
      data: {
        labels: ['Working', 'Defective', 'Disposal', 'Available'],
        datasets: [{
          label: 'Asset status',
          data: state.analytics.assetStatus,
          backgroundColor: accentColor + '25',
          borderColor: accentColor,
          pointBackgroundColor: accentColor,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: 12 },
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
          },
        },
      },
    });
  }
}

function getTicketRetentionDays() {
  const ticketSettings = getTicketSettings();
  const configuredDays = Number.isFinite(Number(ticketSettings.resolvedTicketRetentionDays))
    ? Number(ticketSettings.resolvedTicketRetentionDays)
    : Number(state.settings?.ticketRetentionDays);
  return Number.isFinite(configuredDays) && configuredDays >= 0 ? configuredDays : 3;
}

function getDisposalRetentionDays() {
  const configuredDays = Number(state.settings?.disposalRetentionDays);
  return Number.isFinite(configuredDays) && configuredDays >= 0 ? configuredDays : 30;
}

function autoCleanupResolvedTickets() {
  const days = getTicketRetentionDays();
  const cutoffMs = days * 24 * 60 * 60 * 1000;
  const beforeCount = state.tickets.length;

  state.tickets = state.tickets.filter((ticket) => {
    const isResolved = ['Resolved', 'Closed', 'Completed'].includes(ticket.status || '');
    if (!isResolved) {
      return true;
    }

    const resolvedAt = ticket.resolvedAt ? new Date(ticket.resolvedAt).getTime() : new Date(ticket.createdAt || Date.now()).getTime();
    return Date.now() - resolvedAt < cutoffMs;
  });

  if (beforeCount !== state.tickets.length) {
    saveState();
  }
}

function renderDashboard() {
  autoCleanupResolvedTickets();
  applyTicketMessageRetentionPolicy({ manual: false, reason: 'dashboard-sync' });
  syncUserActivityAnalytics();
  renderSummary();
  renderDashboardAttention();
  renderDevices();
  renderLaptops();
  renderPolicies();
  renderUsage();
  renderAnalyticsOverview();
  renderAnalyticsMbUsage();
  renderEmployees();
  renderReplacements();
  renderTickets();
  renderTicketSettings();
  renderAdminActivity();
  renderIncognitoStatus();
  renderCharts();
  const sidebarVersion = document.getElementById('sidebar-version');
  if (sidebarVersion) {
    sidebarVersion.textContent = getCurrentVersionLabel();
  }
}

function populateBlockingUserOptions() {
  const target = document.getElementById('block-user-target');
  if (!target) return;

  target.innerHTML = state.employees.map((employee) => `
    <option value="${employee.id}">${getEmployeeFullName(employee)}</option>
  `).join('');

  const blockScope = document.getElementById('block-scope');
  const targetWrap = document.getElementById('block-target-wrap');
  const isSpecific = blockScope?.value === 'specific';

  if (targetWrap) {
    targetWrap.style.display = isSpecific ? 'block' : 'none';
  }
  target.disabled = !isSpecific;
}

function getBlockingScheduleState() {
  const selectedType = ['weekly', 'daily'].includes(document.querySelector('input[name="schedule-type"]:checked')?.value || '')
    ? (document.querySelector('input[name="schedule-type"]:checked')?.value || 'daily')
    : 'daily';
  const start = document.getElementById('schedule-start-time')?.value || '08:00';
  const end = document.getElementById('schedule-end-time')?.value || '17:00';
  const days = [...document.querySelectorAll('.day-pill.selected')].map((button) => button.dataset.day).filter(Boolean);

  return {
    type: selectedType,
    start,
    end,
    days: selectedType === 'weekly' ? (days.length ? days : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']) : days,
    label: selectedType === 'weekly' ? (days.length ? days.join(', ') : 'Every day') : 'Every day',
  };
}

function addBlocklistEntry(event) {
  event.preventDefault();
  const domain = document.getElementById('block-domain').value.trim();
  const category = document.getElementById('block-category').value;
  const scope = document.getElementById('block-scope').value || 'all';
  const userIds = [...(document.getElementById('block-user-target')?.selectedOptions || [])].map((option) => option.value);
  const schedule = getBlockingScheduleState();

  if (!domain) {
    return;
  }

  state.policies.push({
    id: `block-${Date.now()}`,
    domain,
    category,
    enabled: true,
    scope,
    userIds: scope === 'specific' ? userIds : [],
    schedule,
  });

  logAdminAction('Added', 'Blocked website', `${domain} (${category})`);
  document.getElementById('blocklist-form').reset();
  populateBlockingUserOptions();
  saveState();
  renderDashboard();
}

function getNextLaptopId() {
  const usedIds = state.devices.map((device) => Number((device.laptopId || '').replace(/\D/g, ''))).filter(Boolean);
  const maxNumber = usedIds.length ? Math.max(...usedIds) : 0;
  return `LT-${String(maxNumber + 1).padStart(3, '0')}`;
}

function syncDeviceRegistrationDetails() {
  const employeeId = document.getElementById('device-employee-id')?.value.trim() || '';
  const laptopId = document.getElementById('device-laptop-id')?.value.trim() || '';
  const employee = state.employees.find((item) => {
    return (item.employeeId || item.id || '').toLowerCase() === employeeId.toLowerCase() || item.id === employeeId;
  });
  const laptop = state.devices.find((item) => item.laptopId === laptopId);

  const previewName = document.getElementById('device-preview-name');
  const previewEmail = document.getElementById('device-preview-email');
  const previewLaptop = document.getElementById('device-preview-laptop');
  const previewMac = document.getElementById('device-preview-mac');

  if (previewName) {
    previewName.value = employee ? getEmployeeFullName(employee) : '';
  }

  if (previewEmail) {
    previewEmail.value = employee ? employee.email : '';
  }

  if (previewLaptop) {
    previewLaptop.value = laptop ? (laptop.laptopName || laptop.name || '') : '';
  }

  if (previewMac) {
    previewMac.value = laptop ? (laptop.macAddress || '') : '';
  }
}

function fillDeviceForm(device) {
  const employee = state.employees.find((entry) => {
    const matchId = (entry.employeeId || entry.id || '').toLowerCase();
    const nameMatch = `${entry.name} ${entry.surname}`.trim().toLowerCase();
    return matchId === String(device.employeeId || '').toLowerCase() || nameMatch === `${device.user || ''} ${device.surname || ''}`.trim().toLowerCase();
  });

  document.getElementById('device-edit-id').value = device.id;
  document.getElementById('device-employee-id').value = employee ? (employee.employeeId || employee.id) : (device.employeeId || device.user || '');
  document.getElementById('device-laptop-id').value = device.laptopId || getNextLaptopId();
  syncDeviceRegistrationDetails();
}

function resetDeviceForm() {
  const form = document.getElementById('device-register-form');
  form.reset();
  document.getElementById('device-edit-id').value = '';
  document.getElementById('device-employee-id').value = '';
  document.getElementById('device-laptop-id').value = '';
  const previewName = document.getElementById('device-preview-name');
  const previewEmail = document.getElementById('device-preview-email');
  const previewLaptop = document.getElementById('device-preview-laptop');
  const previewMac = document.getElementById('device-preview-mac');
  if (previewName) previewName.value = '';
  if (previewEmail) previewEmail.value = '';
  if (previewLaptop) previewLaptop.value = '';
  if (previewMac) previewMac.value = '';
}

function fillLaptopForm(laptop) {
  document.getElementById('laptop-edit-id').value = laptop.id;
  document.getElementById('laptop-brand').value = laptop.brand || '';
  document.getElementById('laptop-name').value = laptop.laptopName || '';
  document.getElementById('laptop-specs').value = laptop.specs || '';
  document.getElementById('laptop-mac').value = laptop.macAddress || '';
  document.getElementById('laptop-purchased-at').value = laptop.purchasedAt || '';
  document.getElementById('laptop-status').value = (laptop.status || 'working').toLowerCase();
  document.getElementById('laptop-laptop-id').value = laptop.laptopId || getNextLaptopId();
}

function resetLaptopForm() {
  const form = document.getElementById('laptop-register-form');
  form.reset();
  document.getElementById('laptop-edit-id').value = '';
  document.getElementById('laptop-status').value = 'available';
  document.getElementById('laptop-laptop-id').value = getNextLaptopId();
}

function openDeviceModal(device = null) {
  const modal = document.getElementById('device-modal');
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');

  if (device) {
    fillDeviceForm(device);
  } else {
    resetDeviceForm();
  }
}

function closeDeviceModal() {
  const modal = document.getElementById('device-modal');
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
  resetDeviceForm();
}

function openLaptopModal(laptop = null) {
  const modal = document.getElementById('laptop-modal');
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');

  if (laptop) {
    fillLaptopForm(laptop);
  } else {
    resetLaptopForm();
  }
}

function closeLaptopModal() {
  const modal = document.getElementById('laptop-modal');
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
  resetLaptopForm();
}

function registerLaptop(event) {
  event.preventDefault();

  const brand = document.getElementById('laptop-brand').value.trim();
  const laptopName = document.getElementById('laptop-name').value.trim();
  const specs = document.getElementById('laptop-specs').value.trim();
  const macAddress = document.getElementById('laptop-mac').value.trim();
  const purchasedAt = document.getElementById('laptop-purchased-at').value;
  const status = document.getElementById('laptop-status').value || 'available';
  const laptopId = document.getElementById('laptop-laptop-id').value.trim() || getNextLaptopId();
  const editingId = document.getElementById('laptop-edit-id').value;

  if (!brand || !laptopName || !specs || !macAddress || !purchasedAt) {
    return;
  }

  if (editingId) {
    state.devices = state.devices.map((device) => device.id === editingId ? {
      ...device,
      brand,
      specs,
      macAddress,
      purchasedAt,
      laptopName,
      laptopId,
      status,
      lastSync: new Date().toISOString(),
    } : device);
    logAdminAction('Edited', 'Laptop', `${laptopName} (${laptopId})`);
  } else {
    const newId = `dev-${String(state.devices.length + 1).padStart(3, '0')}`;
    state.devices.push({
      id: newId,
      user: 'Unassigned',
      surname: '',
      email: '',
      brand,
      specs,
      macAddress,
      purchasedAt,
      laptopName,
      laptopId,
      status: status || 'available',
      lastSync: new Date().toISOString(),
      policyVersion: 1,
    });
    logAdminAction('Added', 'Laptop', `${laptopName} (${laptopId})`);
  }

  closeLaptopModal();
  saveState();
  renderDashboard();
}

function registerDevice(event) {
  event.preventDefault();

  const employeeId = document.getElementById('device-employee-id').value.trim();
  const laptopId = document.getElementById('device-laptop-id').value.trim();
  const macAddress = document.getElementById('device-preview-mac')?.value.trim() || '';
  const editingId = document.getElementById('device-edit-id').value;

  if (!employeeId || !laptopId) {
    return;
  }

  const employee = state.employees.find((item) => {
    return (item.employeeId || item.id || '').toLowerCase() === employeeId.toLowerCase() || item.id === employeeId;
  });

  const existingLaptop = state.devices.find((device) => device.laptopId === laptopId && device.id !== editingId);
  const assignedLaptop = existingLaptop && isLaptopAssigned(existingLaptop);
  if (assignedLaptop && !editingId) {
    return;
  }

  const currentDevice = editingId ? state.devices.find((device) => device.id === editingId) : null;
  if (currentDevice && isLaptopAssigned(currentDevice)) {
    return;
  }

  const user = employee ? getEmployeeFullName(employee) : (existingLaptop?.user || 'Unassigned');
  const surname = employee ? '' : (existingLaptop?.surname || '');
  const email = employee ? employee.email : (existingLaptop?.email || '');
  const finalMacAddress = macAddress || existingLaptop?.macAddress || '';
  const laptopName = existingLaptop?.laptopName || '';
  const nextStatus = 'taken';
  const duplicateDevice = state.devices.find((device) => device.id !== editingId && (
    device.laptopId === laptopId ||
    (employeeId && String(device.employeeId || '').toLowerCase() === employeeId.toLowerCase()) ||
    (email && device.email && device.email.toLowerCase() === email.toLowerCase())
  ));

  if (duplicateDevice) {
    state.devices = state.devices.map((device) => device.id === duplicateDevice.id ? {
      ...device,
      employeeId,
      user,
      surname,
      email,
      macAddress: finalMacAddress,
      laptopName,
      laptopId,
      status: nextStatus,
      lastSync: new Date().toISOString(),
      isRegistered: true,
    } : device);
    logAdminAction('Updated', 'Device registration', `${user} ${surname} assigned ${laptopId}`);
  } else if (editingId) {
    state.devices = state.devices.map((device) => device.id === editingId ? {
      ...device,
      user,
      surname,
      email,
      macAddress: finalMacAddress,
      laptopName,
      employeeId,
      laptopId,
      status: nextStatus,
      lastSync: new Date().toISOString(),
      isRegistered: true,
    } : device);
    logAdminAction('Edited', 'Device registration', `${user} ${surname} updated ${laptopId}`);
  } else {
    const newId = `dev-${String(state.devices.length + 1).padStart(3, '0')}`;
    state.devices.push({
      id: newId,
      employeeId,
      user,
      surname,
      email,
      macAddress: finalMacAddress,
      laptopName,
      laptopId,
      status: nextStatus,
      lastSync: new Date().toISOString(),
      policyVersion: 1,
      isRegistered: true,
    });
    logAdminAction('Added', 'Device registration', `${user} ${surname} assigned ${laptopId}`);
  }

  closeDeviceModal();
  saveState();
  renderDashboard();
}

function syncPolicy() {
  if (syncOperationInFlight) {
    return;
  }

  const syncOperationId = `sync-policy-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  syncOperationInFlight = true;

  try {
    state.devices = state.devices.map((device) => {
      const isRegistered = isDeviceRegisteredForPolicy(device);
      return {
        ...device,
        status: isRegistered ? (device.status === 'offline' ? 'pending' : 'online') : 'offline',
        lastSync: new Date().toISOString(),
        policyVersion: isRegistered ? device.policyVersion + 1 : device.policyVersion,
        isRegistered,
      };
    });

    syncUserActivityAnalytics();
    saveState();
    renderDashboard();
    showToast('success', 'Sync complete', 'Policy changes were synced successfully.', { id: `sync-policy-success:${syncOperationId}` });
  } finally {
    syncOperationInFlight = false;
  }
}

function setTheme(theme) {
  if (!document.querySelector('.app-shell')) return;

  const safeTheme = theme === 'dark' ? 'dark' : 'light';

  document.body.dataset.theme = safeTheme;

  if (state?.settings?.accentColor) {
    setAccentColor(state.settings.accentColor);
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, safeTheme);
  } catch (error) {
    console.warn('Unable to save theme preference.');
  }

  const toggle = document.getElementById('theme-toggle');
  const icon = toggle?.querySelector('.theme-icon');
  if (icon) icon.textContent = safeTheme === 'dark' ? '☀️' : '🌙';
  if (toggle) {
    toggle.setAttribute('aria-label', safeTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }
}

function setLoginTheme(theme) {
  if (!document.getElementById('login-screen')) return;

  const safeTheme = theme === 'dark' ? 'dark' : 'light';
  document.body.dataset.theme = safeTheme;

  try {
    localStorage.setItem(LOGIN_THEME_STORAGE_KEY, safeTheme);
  } catch (error) {
    console.warn('Unable to save login theme preference.');
  }

  const toggle = document.getElementById('login-theme-toggle');
  const icon = toggle?.querySelector('.theme-icon');
  if (icon) icon.textContent = safeTheme === 'dark' ? '☀️' : '🌙';
  if (toggle) {
    toggle.setAttribute('aria-label', safeTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }
}

function getStoredTheme() {
  try {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    return savedTheme === 'dark' ? 'dark' : 'light';
  } catch (error) {
    return 'light';
  }
}

function getStoredLoginTheme() {
  try {
    return localStorage.getItem(LOGIN_THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch (error) {
    return 'light';
  }
}

function setAccentColor(color) {
  const safeColor = normalizeAccentColor(color);
  const rgb = hexToRgb(safeColor);
  const isDarkTheme = document.body?.dataset.theme === 'dark';
  const softColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${isDarkTheme ? 0.24 : 0.14})`;
  const luminance = [rgb.r, rgb.g, rgb.b]
    .map((channel) => {
      const normalizedChannel = channel / 255;
      return normalizedChannel <= 0.04045
        ? normalizedChannel / 12.92
        : ((normalizedChannel + 0.055) / 1.055) ** 2.4;
    })
    .reduce((total, channel, index) => total + channel * [0.2126, 0.7152, 0.0722][index], 0);

  state.settings = state.settings || {};
  state.settings.accentColor = safeColor;

  if (document.body) {
    document.body.style.setProperty('--brand', safeColor);
    document.body.style.setProperty('--brand-strong', safeColor);
    document.body.style.setProperty('--brand-soft', softColor);
    document.body.style.setProperty('--brand-contrast', luminance > 0.179 ? '#202a27' : '#fff');
  }

  if (document.getElementById('accent-picker')) {
    document.getElementById('accent-picker').value = safeColor;
  }

  if (typeof renderCharts === 'function') {
    renderCharts();
  }
}

function applySavedAccentColor() {
  const configuredColor = normalizeAccentColor(state.settings?.accentColor || DEFAULT_ACCENT_COLOR);
  const savedColor = configuredColor.toLowerCase() === '#8e6a5e' ? DEFAULT_ACCENT_COLOR : configuredColor;
  if (state.settings && state.settings.accentColor !== savedColor) {
    state.settings.accentColor = savedColor;
  }
  const accentPicker = document.getElementById('accent-picker');
  if (accentPicker) {
    accentPicker.value = savedColor;
  }
  setAccentColor(savedColor);
}

function hexToRgb(hex) {
  const normalized = hex.replace('#', '');
  const safeHex = normalized.length === 3
    ? normalized.split('').map((char) => char + char).join('')
    : normalized;

  const bigint = parseInt(safeHex, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function getSiteIconInfo(domain) {
  const normalized = (domain || '').toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .split(':')[0]
    .trim();

  if (!normalized) {
    return { className: 'default', text: 'W' };
  }

  if (normalized.includes('facebook')) return { className: 'fb', text: 'f' };
  if (normalized.includes('youtube')) return { className: 'yt', text: '▶' };
  if (normalized.includes('tiktok')) return { className: 'tt', text: '♪' };
  if (normalized.includes('google')) return { className: 'g', text: 'G' };
  if (normalized.includes('instagram')) return { className: 'ig', text: '◎' };
  if (normalized.includes('netflix')) return { className: 'nf', text: 'N' };
  if (normalized.includes('steamcommunity')) return { className: 'sc', text: 'S' };

  const firstLetter = normalized.split('.')[0]?.charAt(0)?.toUpperCase() || 'W';
  return { className: 'default', text: firstLetter };
}

function applyWebsiteIcons() {
  document.querySelectorAll('.site-name').forEach((row) => {
    const label = row.querySelector('span:last-child')?.textContent?.trim() || row.textContent.trim();
    const icon = row.querySelector('.site-icon') || document.createElement('span');
    const info = getSiteIconInfo(label);

    if (!row.querySelector('.site-icon')) {
      row.prepend(icon);
    }

    icon.className = `site-icon ${info.className}`;
    icon.textContent = info.text;
  });
}

function activateAnalyticsTab(tabName) {
  document.querySelectorAll('.analytics-tab').forEach((button) => {
    const active = button.dataset.analyticsTab === tabName;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', active ? 'true' : 'false');
  });

  document.querySelectorAll('.analytics-tab-panel').forEach((panel) => {
    const active = panel.id === `analytics-${tabName}-panel`;
    panel.classList.toggle('active', active);
  });

  applyWebsiteIcons();
}

function activateSection(sectionId) {
  document.querySelectorAll('.nav-link').forEach((button) => {
    button.classList.toggle('active', button.dataset.section === sectionId);
  });

  document.querySelectorAll('.content-section').forEach((section) => {
    section.classList.toggle('active', section.id === sectionId);
  });
}

function getNextEmployeeId() {
  const usedIds = state.employees
    .map((employee) => Number((employee.employeeId || employee.id || '').replace(/\D/g, '')))
    .filter(Number.isFinite);
  const maxNumber = usedIds.length ? Math.max(...usedIds) : 0;
  return `EMP-${String(maxNumber + 1).padStart(3, '0')}`;
}

async function saveEmployee(event) {
  event.preventDefault();

  const employeeId = document.getElementById('employee-id').value.trim() || getNextEmployeeId();
  const name = document.getElementById('employee-name').value.trim();
  const surname = '';
  const email = document.getElementById('employee-email').value.trim();
  const department = document.getElementById('employee-department').value.trim();
  const role = document.getElementById('employee-role').value.trim();
  const password = document.getElementById('employee-password')?.value.trim() || '';
  const confirmPassword = document.getElementById('employee-confirm-password')?.value.trim() || '';
  const editId = document.getElementById('employee-edit-id').value;

  if (!name || !email || !department || !['Admin', 'Employee', 'IT Staff'].includes(role) || !employeeId) {
    return;
  }

  const accountRole = role === 'Admin' ? 'Administrator' : role;
  const shouldCreateAuthUser = Boolean(password) || isPrivilegedAccountRole(accountRole);
  const effectivePassword = shouldCreateAuthUser ? (password || generateTemporaryEmployeePassword()) : '';

  if (shouldCreateAuthUser && password && confirmPassword && password !== confirmPassword) {
    alert('The confirmation password does not match the first password entered.');
    return;
  }

  const employeeRecord = {
    employeeId,
    name,
    surname,
    email,
    department,
    role,
    accountRole,
  };
  const authEmployeeRecord = {
    ...employeeRecord,
    password: effectivePassword,
  };

  if (editId) {
    state.employees = state.employees.map((employee) => employee.id === editId ? { ...employee, ...employeeRecord } : employee);
    logAdminAction('Edited', 'Employee', name);
  } else {
    state.employees.push({
      id: `emp-${Date.now()}`,
      ...employeeRecord,
    });
    logAdminAction('Added', 'Employee', name);
  }

  if (shouldCreateAuthUser) {
    const nextPassword = effectivePassword || generateTemporaryEmployeePassword();
    state.security = state.security || {};
    state.security.accountPasswords = state.security.accountPasswords || {};
    state.security.accountPasswords[email] = nextPassword;
    const hash = await secureHashString(nextPassword);
    state.security.passwordHashes = state.security.passwordHashes || {};
    state.security.passwordHashes[email] = hash;
    await linkEmployeeToSupabaseAuth(authEmployeeRecord, nextPassword);
    syncUserCredentialRecord(email, nextPassword, accountRole, true).catch((error) => {
      console.warn('Unable to sync privileged employee credential record.', error);
    });
  }

  const assignedDevice = state.devices.find((device) => device.email === email || getEmployeeFullName({ name: device.user, surname: device.surname }) === name);
  if (assignedDevice) {
    assignedDevice.status = 'taken';
  }

  document.getElementById('employee-form').reset();
  document.getElementById('employee-edit-id').value = '';
  document.getElementById('employee-modal').classList.add('hidden');
  saveState();
  renderDashboard();
}

function saveReplacement(event) {
  event.preventDefault();

  const employeeName = document.getElementById('replacement-employee').value;
  const oldLaptopId = document.getElementById('replacement-old-id').value.trim();
  const newLaptopId = document.getElementById('replacement-new-id').value.trim();
  const reason = document.getElementById('replacement-reason').value.trim();
  const status = document.getElementById('replacement-status').value || 'Pending';

  if (!employeeName || !oldLaptopId || !newLaptopId || !reason) {
    return;
  }

  const employee = state.employees.find((item) => `${item.name} ${item.surname}` === employeeName) || state.employees[0];
  const employeeKey = employee ? (employee.employeeId || employee.id || '').toLowerCase() : '';
  const oldLaptop = state.devices.find((device) => device.laptopId === oldLaptopId);
  const newLaptop = state.devices.find((device) => device.laptopId === newLaptopId);
  const currentEmployeeDevice = state.devices.find((device) => {
    if (!employee) return false;
    const deviceEmployeeKey = String(device.employeeId || '').toLowerCase();
    return deviceEmployeeKey === employeeKey || device.email === employee.email || (getEmployeeFullName({ name: device.user, surname: device.surname }) === getEmployeeFullName(employee));
  });
  const targetDevice = newLaptop || currentEmployeeDevice;
  const isApproved = normalizeStatus(status) === 'approved';

  if (isApproved) {
    if (oldLaptop && oldLaptop !== targetDevice) {
      oldLaptop.status = 'defective';
      oldLaptop.user = 'Unassigned';
      oldLaptop.surname = '';
      oldLaptop.email = '';
      oldLaptop.employeeId = '';
      oldLaptop.lastSync = new Date().toISOString();
    }

    if (currentEmployeeDevice && currentEmployeeDevice !== targetDevice && currentEmployeeDevice !== oldLaptop) {
      currentEmployeeDevice.status = 'available';
      currentEmployeeDevice.user = 'Unassigned';
      currentEmployeeDevice.surname = '';
      currentEmployeeDevice.email = '';
      currentEmployeeDevice.employeeId = '';
      currentEmployeeDevice.lastSync = new Date().toISOString();
    }

    if (oldLaptop && oldLaptop === currentEmployeeDevice && !newLaptop) {
      oldLaptop.status = 'defective';
      oldLaptop.user = 'Unassigned';
      oldLaptop.surname = '';
      oldLaptop.email = '';
      oldLaptop.employeeId = '';
      oldLaptop.lastSync = new Date().toISOString();
    }

    if (targetDevice) {
      const targetLaptop = targetDevice;
      targetLaptop.status = 'taken';
      targetLaptop.user = employee?.name || targetLaptop.user || 'Unassigned';
      targetLaptop.surname = employee?.surname || targetLaptop.surname || '';
      targetLaptop.email = employee?.email || targetLaptop.email || '';
      targetLaptop.employeeId = employee?.employeeId || employee?.id || targetLaptop.employeeId || '';
      targetLaptop.lastSync = new Date().toISOString();

      if (newLaptop) {
        targetLaptop.laptopId = newLaptopId;
        targetLaptop.laptopName = newLaptop.laptopName || targetLaptop.laptopName || 'Laptop';
        targetLaptop.macAddress = newLaptop.macAddress || targetLaptop.macAddress || '';
        targetLaptop.brand = newLaptop.brand || targetLaptop.brand || '';
        targetLaptop.specs = newLaptop.specs || targetLaptop.specs || '';
        targetLaptop.purchasedAt = newLaptop.purchasedAt || targetLaptop.purchasedAt || '';
        targetLaptop.isRegistered = true;
      } else if (oldLaptop && oldLaptop !== targetLaptop) {
        targetLaptop.laptopId = newLaptopId;
      }
    }

    if (newLaptop && newLaptop !== targetDevice) {
      newLaptop.status = 'taken';
      newLaptop.user = employee?.name || newLaptop.user || 'Unassigned';
      newLaptop.surname = employee?.surname || newLaptop.surname || '';
      newLaptop.email = employee?.email || newLaptop.email || '';
      newLaptop.employeeId = employee?.employeeId || employee?.id || newLaptop.employeeId || '';
      newLaptop.lastSync = new Date().toISOString();
    }

    if (employee) {
      employee.assignedLaptopId = newLaptopId;
      employee.employeeId = employee.employeeId || employee.id;
    }
  }

  state.replacements.push({
    id: `rep-${Date.now()}`,
    employee: employeeName,
    oldLaptopId,
    newLaptopId,
    reason,
    status,
  });

  document.getElementById('replacement-form').reset();
  document.getElementById('replacement-status').value = 'Pending';
  document.getElementById('replacement-modal').classList.add('hidden');
  saveState();
  renderDashboard();
}

function closeEmployeeModal() {
  const modal = document.getElementById('employee-modal');
  const form = document.getElementById('employee-form');
  if (modal) {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
  }
  if (form) {
    form.reset();
    const editId = document.getElementById('employee-edit-id');
    if (editId) editId.value = '';
    const employeeIdInput = document.getElementById('employee-id');
    if (employeeIdInput) employeeIdInput.value = getNextEmployeeId();
  }
}

function openEmployeeModal(employee = null) {
  const modal = document.getElementById('employee-modal');
  const form = document.getElementById('employee-form');
  if (modal) {
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
  }

  if (employee) {
    document.getElementById('employee-edit-id').value = employee.id;
    document.getElementById('employee-id').value = employee.employeeId || employee.id;
    document.getElementById('employee-name').value = getEmployeeFullName(employee);
    document.getElementById('employee-email').value = employee.email;
    document.getElementById('employee-department').value = employee.department;
    document.getElementById('employee-role').value = getEmployeeRoleCategory(employee);
    document.getElementById('employee-password').value = state.security?.accountPasswords?.[employee.email] || '';
    document.getElementById('employee-confirm-password').value = state.security?.accountPasswords?.[employee.email] || '';
  } else if (form) {
    form.reset();
    const editId = document.getElementById('employee-edit-id');
    if (editId) editId.value = '';
    const employeeIdInput = document.getElementById('employee-id');
    if (employeeIdInput) employeeIdInput.value = getNextEmployeeId();
    const employeePasswordInput = document.getElementById('employee-password');
    const employeeConfirmPasswordInput = document.getElementById('employee-confirm-password');
    if (employeePasswordInput) employeePasswordInput.value = '';
    if (employeeConfirmPasswordInput) employeeConfirmPasswordInput.value = '';
  }
}

function populateReplacementEmployeeOptions() {
  const select = document.getElementById('replacement-employee');
  if (!select) return;
  select.innerHTML = state.employees.map((employee) => `
    <option value="${getEmployeeFullName(employee)}">${getEmployeeFullName(employee)}</option>
  `).join('');
}

function openReplacementFromTicket(ticket) {
  populateReplacementEmployeeOptions();
  const employeeSelect = document.getElementById('replacement-employee');
  const oldLaptopInput = document.getElementById('replacement-old-id');
  const statusSelect = document.getElementById('replacement-status');

  if (employeeSelect) {
    const employeeValue = `${ticket.employee}`;
    employeeSelect.value = employeeValue;
  }

  if (oldLaptopInput) {
    oldLaptopInput.value = ticket.laptopId || '';
  }

  if (statusSelect) {
    statusSelect.value = 'Approved';
  }

  const modal = document.getElementById('replacement-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
  }
}

function getAutoAssignedTicketContext() {
  const assignedDevice = state.devices
    .filter((device) => isActiveAssignedDevice(device) && device.email && device.laptopId)
    .sort((a, b) => new Date(b.lastSync || 0).getTime() - new Date(a.lastSync || 0).getTime())[0];

  if (!assignedDevice) {
    return null;
  }

  const employee = state.employees.find((item) => {
    const sameEmail = item.email && assignedDevice.email && item.email.toLowerCase() === assignedDevice.email.toLowerCase();
    const sameName = getEmployeeFullName(item).toLowerCase() === getEmployeeFullName({ name: assignedDevice.user, surname: assignedDevice.surname }).toLowerCase();
    return sameEmail || sameName;
  });

  return {
    deviceId: assignedDevice.id || '',
    employeeId: employee ? employee.id : assignedDevice.employeeId || '',
    employeeName: employee ? getEmployeeFullName(employee) : getEmployeeFullName({ name: assignedDevice.user, surname: assignedDevice.surname }),
    employeeEmail: employee ? employee.email : assignedDevice.email || 'unknown@company.com',
    laptopId: assignedDevice.laptopId || '',
    laptopName: assignedDevice.laptopName || 'Laptop',
  };
}

function populateIssueTicketContext() {
  const employeeInput = document.getElementById('issue-employee');
  const laptopInput = document.getElementById('issue-laptop');
  const deviceIdInput = document.getElementById('issue-device-id');
  const ticketContext = getAutoAssignedTicketContext();

  if (employeeInput) {
    employeeInput.value = ticketContext ? ticketContext.employeeName : 'No assigned employee';
  }

  if (laptopInput) {
    laptopInput.value = ticketContext ? ticketContext.laptopId : 'Not available';
  }

  if (deviceIdInput) {
    deviceIdInput.value = ticketContext ? ticketContext.deviceId : '';
  }
}

function openPolicyFromEditButton(button) {
  if (!button) return;
  const policy = state.policies.find((item) => item.id === button.dataset.policyEditId);
  if (policy) {
    openPolicyModal(policy);
  }
}

function openPolicyModal(policy = null) {
  const modal = document.getElementById('policy-modal');
  if (!modal) return;

  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');

  const form = document.getElementById('policy-form');
  const policyTarget = document.getElementById('policy-user-target');
  const policyScope = document.getElementById('policy-scope');
  const policyEnabled = document.getElementById('policy-enabled');

  if (policyTarget) {
    policyTarget.innerHTML = state.employees.map((employee) => `
      <option value="${employee.id}">${getEmployeeFullName(employee)}</option>
    `).join('');
    if (policy) {
      const selected = policy.userIds || [];
      Array.from(policyTarget.options).forEach((option) => {
        option.selected = selected.includes(option.value);
      });
    }
  }

  if (form && policy) {
    document.getElementById('policy-edit-id').value = policy.id;
    document.getElementById('policy-domain').value = policy.domain || '';
    document.getElementById('policy-scope').value = policy.scope || 'all';
    document.getElementById('policy-category').value = policy.category || 'social';
    document.getElementById('policy-enabled').value = String(Boolean(policy.enabled));
  } else if (form) {
    form.reset();
    document.getElementById('policy-edit-id').value = '';
    document.getElementById('policy-scope').value = 'all';
    document.getElementById('policy-category').value = 'social';
    document.getElementById('policy-enabled').value = 'true';
  }

  if (policyScope) {
    const targetWrap = document.getElementById('policy-target-wrap');
    const visible = policyScope.value === 'specific';
    if (targetWrap) targetWrap.style.display = visible ? 'block' : 'none';
    if (policyTarget) policyTarget.disabled = !visible;
  }

  if (policyEnabled) {
    policyEnabled.value = policy ? String(Boolean(policy.enabled)) : 'true';
  }
}

function closePolicyModal() {
  const modal = document.getElementById('policy-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
  }
  const form = document.getElementById('policy-form');
  if (form) form.reset();
}

function savePolicyFromModal(event) {
  event.preventDefault();

  const policyId = document.getElementById('policy-edit-id').value;
  const domain = document.getElementById('policy-domain').value.trim();
  const scope = document.getElementById('policy-scope').value || 'all';
  const category = document.getElementById('policy-category').value || 'social';
  const enabled = document.getElementById('policy-enabled').value === 'true';
  const userIds = [...(document.getElementById('policy-user-target')?.selectedOptions || [])].map((option) => option.value);

  if (!domain) return;

  const existing = state.policies.find((policy) => policy.id === policyId);

  if (existing) {
    existing.domain = domain;
    existing.scope = scope;
    existing.category = category;
    existing.enabled = enabled;
    existing.userIds = scope === 'specific' ? userIds : [];
    logAdminAction('Edited', 'Website policy', `${domain} (${scope})`);
  } else {
    state.policies.push({
      id: `block-${Date.now()}`,
      domain,
      category,
      enabled,
      scope,
      userIds: scope === 'specific' ? userIds : [],
      schedule: { type: 'daily', start: '08:00', end: '17:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
    });
    logAdminAction('Added', 'Website policy', `${domain} (${scope})`);
  }

  closePolicyModal();
  saveState();
  renderDashboard();
}

function openIssueModal() {
  populateIssueTicketContext();
  const modal = document.getElementById('issue-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
  }
}

function closeIssueModal() {
  const modal = document.getElementById('issue-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
  }
  const form = document.getElementById('issue-form');
  if (form) {
    form.reset();
    populateIssueTicketContext();
  }
}

function getAdminEmail() {
  return (state.settings && state.settings.adminEmail) ? state.settings.adminEmail : '';
}

function getRetentionDateValue() {
  return (state.settings && state.settings.retentionDate) || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function deleteOldUsageData() {
  const input = document.getElementById('retention-date');
  if (!input || !input.value) {
    return;
  }

  const cutoff = new Date(`${input.value}T00:00:00`).getTime();
  const beforeCount = state.tickets.length;

  state.tickets = state.tickets.filter((ticket) => {
    const createdAt = ticket.createdAt ? new Date(ticket.createdAt).getTime() : Date.now();
    const isClosedTicket = ['Resolved', 'Closed', 'Completed'].includes(ticket.status || '');
    return !(isClosedTicket && createdAt < cutoff);
  });

  state.settings = state.settings || {};
  state.settings.retentionDate = input.value;
  saveState();
  renderDashboard();

  const removedCount = beforeCount - state.tickets.length;
  if (removedCount > 0) {
    window.alert(`Deleted ${removedCount} old resolved ticket(s) before ${input.value}. Employee and laptop records were kept.`);
  } else {
    window.alert(`No resolved or closed tickets were older than ${input.value}. Employee and laptop records were kept.`);
  }
}

function deleteOldDisposalLaptops() {
  const days = getDisposalRetentionDays();
  const cutoffMs = days * 24 * 60 * 60 * 1000;
  const beforeCount = state.devices.length;

  const disposalLaptopIdsToRemove = state.devices
    .filter((device) => normalizeStatus(device.status) === 'disposal')
    .filter((device) => {
      const dateValue = device.lastSync || device.purchasedAt || new Date().toISOString();
      const timestamp = new Date(dateValue).getTime();
      return Number.isFinite(timestamp) && Date.now() - timestamp >= cutoffMs;
    })
    .map((device) => device.laptopId)
    .filter(Boolean);

  state.devices = state.devices.filter((device) => !disposalLaptopIdsToRemove.includes(device.laptopId));

  state.employees.forEach((employee) => {
    if (employee.assignedLaptopId && disposalLaptopIdsToRemove.includes(employee.assignedLaptopId)) {
      delete employee.assignedLaptopId;
    }
  });

  state.settings = state.settings || {};
  state.settings.disposalRetentionDays = days;
  saveState();
  renderDashboard();

  const removedCount = beforeCount - state.devices.length;
  if (removedCount > 0) {
    window.alert(`Deleted ${removedCount} disposal laptop record(s) older than ${days} day(s). Active employee and non-disposal records were kept.`);
  } else {
    window.alert(`No disposal laptop records were older than ${days} day(s).`);
  }
}

function buildIssueMailto(ticket) {
  const subject = encodeURIComponent(`IT Support Request - ${ticket.laptopId} - ${ticket.priority}`);
  const body = encodeURIComponent(
    `Hello IT Manager,\n\n` +
    `Employee: ${ticket.employee}\n` +
    `Email: ${ticket.email}\n` +
    `Laptop ID: ${ticket.laptopId}\n` +
    `Category: ${ticket.category}\n` +
    `Priority: ${ticket.priority}\n\n` +
    `Issue description:\n${ticket.description}\n\n` +
    `Please review and update the ticket status.`
  );
  return `mailto:${getAdminEmail()}?subject=${subject}&body=${body}`;
}

function submitIssue(event) {
  event.preventDefault();

  const category = document.getElementById('issue-category').value;
  const priority = document.getElementById('issue-priority').value;
  const description = document.getElementById('issue-description').value.trim();
  const context = getAutoAssignedTicketContext();

  if (!context) {
    window.alert('No assigned laptop was found for this MINDLOCK installation. Please contact your administrator before reporting an issue.');
    return;
  }

  if (!description) {
    return;
  }

  const settings = getTicketSettings();
  const ticket = {
    id: `tk-${Date.now()}`,
    employee: context.employeeName,
    employeeId: context.employeeId,
    deviceId: context.deviceId,
    email: context.employeeEmail,
    laptopId: context.laptopId,
    category,
    priority: priority || settings.defaultPriority || 'Medium',
    description,
    status: settings.defaultStatus || 'Open',
    createdAt: new Date().toISOString(),
    messages: [createTicketMessage('employee', description)],
  };

  state.tickets.unshift(ticket);
  state.tickets = mergeTicketLists(state.tickets, []);
  persistSharedTickets(state.tickets);
  logAdminAction('Submitted', 'Support ticket', `${ticket.employee} - ${ticket.laptopId}`);
  closeIssueModal();
  saveState();
  renderDashboard();

  const supportMail = buildIssueMailto(ticket);
  window.location.href = supportMail;
}

function openTicketMessageModal(ticketId) {
  const ticket = state.tickets.find((item) => item.id === ticketId);
  const modal = document.getElementById('ticket-message-modal');
  const thread = document.getElementById('ticket-thread-body');
  const hiddenInput = document.getElementById('ticket-message-id');
  const textarea = document.getElementById('ticket-reply-text');

  if (!ticket || !modal || !thread || !hiddenInput || !textarea) return;

  const visibleMessages = getVisibleTicketMessages(ticket);
  const expiredMessages = Array.isArray(ticket.messages) ? ticket.messages.filter((message) => isTicketMessageExpired(message, ticket)) : [];

  hiddenInput.value = ticket.id;
  thread.innerHTML = visibleMessages.length
    ? visibleMessages.map((message) => `
      <div class="ticket-message-row ${message.sender === 'admin' ? 'admin' : 'employee'}">
        <div class="ticket-message-header">${message.sender === 'admin' ? 'Admin' : 'Employee'}</div>
        <div class="ticket-message-text">${String(message.text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
      </div>
    `).join('')
    : '<div class="ticket-message-empty">No conversation yet.</div>';

  if (expiredMessages.length) {
    const retentionNotice = document.createElement('div');
    retentionNotice.className = 'ticket-message-empty';
    retentionNotice.textContent = `${expiredMessages.length} older message(s) were archived by the ticket retention policy.`;
    thread.prepend(retentionNotice);
  }

  textarea.value = '';
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

function submitTicketReply(event) {
  event.preventDefault();

  const modal = document.getElementById('ticket-message-modal');
  const ticketId = document.getElementById('ticket-message-id')?.value;
  const textarea = document.getElementById('ticket-reply-text');
  const messageText = textarea?.value.trim();

  if (!ticketId || !messageText) return;

  const ticket = state.tickets.find((item) => item.id === ticketId);
  if (!ticket) return;

  ticket.messages = Array.isArray(ticket.messages) ? ticket.messages : [];
  ticket.messages.push(createTicketMessage('admin', messageText));
  ticket.status = ticket.status === 'Open' ? 'In Progress' : ticket.status;
  logAdminAction('Replied', 'Support ticket', `${ticket.employee} - ${ticket.laptopId}`);
  saveState();
  renderDashboard();

  if (modal) {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
  }

  if (textarea) textarea.value = '';
}

function bindGlobalActionFallbacks() {
  if (document.body && document.body.dataset.globalActionsBound === 'true') {
    return;
  }

  const actionMap = {
    'open-register-modal': () => openDeviceModal(),
    'open-laptops-modal': () => openLaptopModal(),
    'open-employee-modal': () => openEmployeeModal(),
    'open-issue-modal': () => openIssueModal(),
    'open-replacement-modal': () => {
      populateReplacementEmployeeOptions();
      const replacementModal = document.getElementById('replacement-modal');
      if (replacementModal) replacementModal.classList.remove('hidden');
    },
    'open-changelog-modal': () => openChangelogModal(true),
    'theme-toggle': () => {
      const nextTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
      setTheme(nextTheme);
    },
    'sync-button': () => syncPolicy(),
    'logout-button': () => logoutUser(),
    'sidebar-toggle': () => {
      const appShell = document.querySelector('.app-shell');
      if (!appShell) return;
      const sidebarToggle = document.getElementById('sidebar-toggle');
      const isCollapsed = appShell.classList.toggle('sidebar-collapsed');
      if (sidebarToggle) {
        sidebarToggle.setAttribute('aria-label', isCollapsed ? 'Expand sidebar' : 'Collapse sidebar');
        sidebarToggle.textContent = isCollapsed ? '❯' : '❮';
      }
    },
    'close-employee-modal': () => closeEmployeeModal(),
    'close-laptop-modal': () => closeLaptopModal(),
    'close-device-modal': () => closeDeviceModal(),
    'close-issue-modal': () => closeIssueModal(),
    'close-policy-modal': () => closePolicyModal(),
  };

  Object.entries(actionMap).forEach(([id, handler]) => {
    const button = document.getElementById(id);
    if (!button) return;
    if (button.dataset.actionBound === 'true') return;
    button.addEventListener('click', (event) => {
      if (button.type === 'submit') {
        return;
      }
      event.preventDefault();
      handler();
    });
    button.dataset.actionBound = 'true';
  });

  if (document.body && document.body.dataset.globalClickBound !== 'true') {
    document.body.addEventListener('click', (event) => {
      const sectionButton = event.target.closest('[data-section]');
      if (sectionButton) {
        activateSection(sectionButton.dataset.section);
      }

      const analyticsButton = event.target.closest('[data-analytics-tab]');
      if (analyticsButton) {
        activateAnalyticsTab(analyticsButton.dataset.analyticsTab);
      }

      const ticketTabButton = event.target.closest('[data-ticket-tab]');
      if (ticketTabButton) {
        document.querySelectorAll('.ticket-settings-tab').forEach((tab) => {
          const isActive = tab === ticketTabButton;
          tab.classList.toggle('active', isActive);
          tab.setAttribute('aria-selected', String(isActive));
        });

        document.querySelectorAll('.ticket-settings-panel').forEach((panel) => {
          panel.classList.toggle('active', panel.dataset.ticketPanel === ticketTabButton.dataset.ticketTab);
        });
        return;
      }

      const retentionTabButton = event.target.closest('[data-retention-tab]');
      if (retentionTabButton) {
        document.querySelectorAll('.retention-subtab').forEach((tab) => {
          const isActive = tab === retentionTabButton;
          tab.classList.toggle('active', isActive);
          tab.setAttribute('aria-selected', String(isActive));
        });

        document.querySelectorAll('.retention-subpanel').forEach((panel) => {
          panel.classList.toggle('active', panel.dataset.retentionPanel === retentionTabButton.dataset.retentionTab);
        });
        return;
      }

      const historyFilterButton = event.target.closest('[data-history-filter]');
      if (historyFilterButton) {
        document.querySelectorAll('.segment-btn').forEach((button) => {
          button.classList.toggle('active', button === historyFilterButton);
        });
        renderTicketSettings();
        return;
      }

      const closeTarget = event.target.closest('[data-close]');
      const closeButton = event.target.closest('.close-modal, .close-employee-modal, .close-laptop-modal, .close-device-modal, .close-issue-modal, .close-policy-modal, .close-replacement-modal, .close-ticket-message-modal, .close-changelog-modal');
      const policyFilterButton = event.target.closest('[data-policy-filter]');

      if (policyFilterButton) {
        setPolicyFilter(policyFilterButton.dataset.policyFilter || 'active');
        return;
      }

      if (closeTarget || closeButton) {
        const modal = closeButton?.closest('.modal') || document.getElementById(closeTarget?.dataset.close || '');
        if (modal && modal.classList.contains('modal')) {
          modal.classList.add('hidden');
          modal.setAttribute('aria-hidden', 'true');
        }
      }
    }, { passive: true });
    document.body.dataset.globalClickBound = 'true';
  }

  if (document.body) {
    document.body.dataset.globalActionsBound = 'true';
  }
}

window.addEventListener('DOMContentLoaded', () => {
  if (!enforceAuthRoute()) {
    return;
  }

  warnIfDemoMode();

  const requiredRoot = document.getElementById('summary-grid');
  const loginForm = document.getElementById('login-form');
  const passwordToggle = document.getElementById('toggle-password');
  const logoutButton = document.getElementById('logout-button');

  bindGlobalActionFallbacks();

  document.querySelectorAll('.nav-link').forEach((button) => {
    button.addEventListener('click', () => activateSection(button.dataset.section));
  });

  const dashboardAttentionList = document.getElementById('dashboard-attention-list');
  if (dashboardAttentionList) {
    dashboardAttentionList.addEventListener('click', (event) => {
      const button = event.target.closest('[data-attention-type]');
      if (!button) return;

      if (button.dataset.attentionType === 'ticket' && button.dataset.ticketId) {
        openTicketMessageModal(button.dataset.ticketId);
        return;
      }

      activateSection('laptops-section');
    });
  }

  document.querySelectorAll('.analytics-tab').forEach((button) => {
    button.addEventListener('click', () => activateAnalyticsTab(button.dataset.analyticsTab));
  });

  const syncButton = document.getElementById('sync-button');
  const themeToggle = document.getElementById('theme-toggle');
  const loginThemeToggle = document.getElementById('login-theme-toggle');

  if (syncButton && syncButton.dataset.actionBound !== 'true' && syncButton.dataset.syncListenerBound !== 'true') {
    syncButton.addEventListener('click', syncPolicy);
    syncButton.dataset.syncListenerBound = 'true';
  }

  if (themeToggle && themeToggle.dataset.actionBound !== 'true' && themeToggle.dataset.themeListenerBound !== 'true') {
    themeToggle.addEventListener('click', () => {
      const nextTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
      setTheme(nextTheme);
    });
    themeToggle.dataset.themeListenerBound = 'true';
  }

  if (loginThemeToggle && loginThemeToggle.dataset.themeListenerBound !== 'true') {
    loginThemeToggle.addEventListener('click', () => {
      const nextTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
      setLoginTheme(nextTheme);
    });
    loginThemeToggle.dataset.themeListenerBound = 'true';
  }

  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  if (emailInput && passwordInput && !emailInput.value && !passwordInput.value) {
    emailInput.value = DEFAULT_ADMIN_EMAIL;
    passwordInput.value = DEFAULT_ADMIN_PASSWORD;
  }

  if (loginForm) {
    loginForm.addEventListener('submit', loginUser);
  }

  if (passwordToggle) {
    passwordToggle.addEventListener('click', togglePasswordVisibility);
  }

  if (logoutButton) {
    logoutButton.addEventListener('click', logoutUser);
  }

  if (requiredRoot) {
    const authenticated = isAuthenticated();
    if (!authenticated) {
      window.location.href = 'login.html';
      return;
    }

    setAuthenticated(true);
    renderDashboard();
    renderTicketSettings();
    bindTicketSettingsControls();
    initializeSettingsPage();
    openChangelogModal();
  }

  const blocklistForm = document.getElementById('blocklist-form');
  if (blocklistForm) {
    blocklistForm.addEventListener('submit', addBlocklistEntry);
    const blockScope = document.getElementById('block-scope');
    if (blockScope) {
      blockScope.addEventListener('change', populateBlockingUserOptions);
    }
    populateBlockingUserOptions();
  }

  const policyForm = document.getElementById('policy-form');
  if (policyForm) policyForm.addEventListener('submit', savePolicyFromModal);

  const policyScope = document.getElementById('policy-scope');
  if (policyScope) {
    policyScope.addEventListener('change', () => {
      const targetWrap = document.getElementById('policy-target-wrap');
      const target = document.getElementById('policy-user-target');
      const visible = policyScope.value === 'specific';
      if (targetWrap) targetWrap.style.display = visible ? 'block' : 'none';
      if (target) target.disabled = !visible;
    });
  }

  const policySearchInput = document.getElementById('policy-search');
  if (policySearchInput) {
    policySearchInput.addEventListener('input', renderPolicies);
  }

  document.querySelectorAll('[data-policy-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      setPolicyFilter(button.dataset.policyFilter || 'active');
    });
  });

  syncPolicyFilterButtons(policyStatusFilter);

  document.querySelectorAll('input[name="schedule-type"]').forEach((radio) => {
    radio.addEventListener('change', updateBlockingSchedulePreview);
  });

  document.getElementById('schedule-start-time')?.addEventListener('input', updateBlockingSchedulePreview);
  document.getElementById('schedule-end-time')?.addEventListener('input', updateBlockingSchedulePreview);

  document.querySelectorAll('.day-pill').forEach((button) => {
    button.addEventListener('click', () => {
      button.classList.toggle('selected');
      updateBlockingSchedulePreview();
    });
  });

  const defaultDays = document.querySelectorAll('.day-pill');
  defaultDays.forEach((day) => {
    if (['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(day.dataset.day)) {
      day.classList.add('selected');
    }
  });
  updateBlockingSchedulePreview();

  const deviceForm = document.getElementById('device-register-form');
  if (deviceForm) {
    deviceForm.addEventListener('submit', registerDevice);
    const employeeIdInput = document.getElementById('device-employee-id');
    const laptopIdInput = document.getElementById('device-laptop-id');
    if (employeeIdInput) employeeIdInput.addEventListener('input', syncDeviceRegistrationDetails);
    if (laptopIdInput) laptopIdInput.addEventListener('input', syncDeviceRegistrationDetails);
  }

  const employeeForm = document.getElementById('employee-form');
  if (employeeForm) employeeForm.addEventListener('submit', saveEmployee);

  const replacementForm = document.getElementById('replacement-form');
  if (replacementForm) replacementForm.addEventListener('submit', saveReplacement);

  const issueForm = document.getElementById('issue-form');
  if (issueForm) issueForm.addEventListener('submit', submitIssue);

  const openRegisterModalButton = document.getElementById('open-register-modal');
  if (openRegisterModalButton) openRegisterModalButton.addEventListener('click', () => openDeviceModal());

  const openLaptopsModalButton = document.getElementById('open-laptops-modal');
  if (openLaptopsModalButton) openLaptopsModalButton.addEventListener('click', () => openLaptopModal());

  const laptopForm = document.getElementById('laptop-register-form');
  if (laptopForm) laptopForm.addEventListener('submit', registerLaptop);

  const openEmployeeModalButton = document.getElementById('open-employee-modal');
  if (openEmployeeModalButton) openEmployeeModalButton.addEventListener('click', () => openEmployeeModal());

  const openIssueModalButton = document.getElementById('open-issue-modal');
  if (openIssueModalButton) openIssueModalButton.addEventListener('click', openIssueModal);

  const openReplacementModalButton = document.getElementById('open-replacement-modal');
  if (openReplacementModalButton) {
    openReplacementModalButton.addEventListener('click', () => {
      populateReplacementEmployeeOptions();
      const modal = document.getElementById('replacement-modal');
      if (modal) {
        modal.classList.remove('hidden');
      }
    });
  }

  document.querySelectorAll('.close-modal').forEach((button) => {
    button.addEventListener('click', closeDeviceModal);
  });

  document.querySelectorAll('.close-laptop-modal').forEach((button) => {
    button.addEventListener('click', closeLaptopModal);
  });

  document.querySelectorAll('.close-employee-modal').forEach((button) => {
    button.addEventListener('click', closeEmployeeModal);
  });

  document.querySelectorAll('.close-replacement-modal').forEach((button) => {
    button.addEventListener('click', () => {
      const modal = document.getElementById('replacement-modal');
      if (modal) modal.classList.add('hidden');
    });
  });

  const deviceModal = document.getElementById('device-modal');
  if (deviceModal) {
    deviceModal.addEventListener('click', (event) => {
      if (event.target.dataset.close === 'modal') {
        closeDeviceModal();
      }
    });
  }

  const employeeModal = document.getElementById('employee-modal');
  if (employeeModal) {
    employeeModal.addEventListener('click', (event) => {
      if (event.target.dataset.close === 'employee-modal') {
        employeeModal.classList.add('hidden');
      }
    });
  }

  const replacementModal = document.getElementById('replacement-modal');
  if (replacementModal) {
    replacementModal.addEventListener('click', (event) => {
      if (event.target.dataset.close === 'replacement-modal') {
        replacementModal.classList.add('hidden');
      }
    });
  }

  const issueModal = document.getElementById('issue-modal');
  if (issueModal) {
    issueModal.addEventListener('click', (event) => {
      if (event.target.dataset.close === 'issue-modal') {
        closeIssueModal();
      }
    });
  }

  const laptopModal = document.getElementById('laptop-modal');
  if (laptopModal) {
    laptopModal.addEventListener('click', (event) => {
      if (event.target.dataset.close === 'laptop-modal') {
        closeLaptopModal();
      }
    });
  }

  document.querySelectorAll('.close-policy-modal').forEach((button) => {
    button.addEventListener('click', closePolicyModal);
  });

  const ticketMessageForm = document.getElementById('ticket-message-form');
  if (ticketMessageForm) ticketMessageForm.addEventListener('submit', submitTicketReply);

  document.querySelectorAll('.close-issue-modal').forEach((button) => {
    button.addEventListener('click', closeIssueModal);
  });

  const openChangelogButton = document.getElementById('open-changelog-modal');
  if (openChangelogButton) {
    openChangelogButton.addEventListener('click', () => openChangelogModal(true));
  }

  document.querySelectorAll('.close-changelog-modal').forEach((button) => {
    button.addEventListener('click', handleChangelogClose);
  });

  const changelogModal = document.getElementById('changelog-modal');
  if (changelogModal) {
    changelogModal.addEventListener('click', (event) => {
      if (event.target.dataset.close === 'changelog-modal') {
        handleChangelogClose();
      }
    });
  }

  document.querySelectorAll('.close-ticket-message-modal').forEach((button) => {
    button.addEventListener('click', () => {
      const modal = document.getElementById('ticket-message-modal');
      if (modal) {
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
      }
    });
  });

  const policyModal = document.getElementById('policy-modal');
  if (policyModal) {
    policyModal.addEventListener('click', (event) => {
      if (event.target.dataset.close === 'policy-modal') {
        closePolicyModal();
      }
    });
  }

  const devicesTable = document.getElementById('devices-table');
  if (devicesTable) {
    devicesTable.addEventListener('click', (event) => {
      const editButton = event.target.closest('[data-edit-id]');
      if (editButton) {
        const device = state.devices.find((item) => item.id === editButton.dataset.editId);
        if (device) {
          openDeviceModal(device);
        }
        return;
      }

      const deleteButton = event.target.closest('[data-delete-device-id]');
      if (deleteButton) {
        const device = state.devices.find((item) => item.id === deleteButton.dataset.deleteDeviceId);
        if (!device) return;

        const employee = state.employees.find((item) => item.assignedLaptopId === device.laptopId || item.email === device.email);
        if (employee) {
          delete employee.assignedLaptopId;
        }

        logAdminAction('Deleted', 'Device', `${device.laptopId || device.id}`);
        state.devices = state.devices.filter((item) => item.id !== deleteButton.dataset.deleteDeviceId);
        saveState();
        renderDashboard();
      }
    });
  }

  const laptopsTable = document.getElementById('laptops-table');
  if (laptopsTable) {
    laptopsTable.addEventListener('click', (event) => {
      const button = event.target.closest('[data-laptop-edit-id]');
      if (!button) return;

      const laptop = state.devices.find((item) => item.id === button.dataset.laptopEditId);
      if (laptop) {
        openLaptopModal(laptop);
      }
    });
  }

  const employeesTable = document.getElementById('employees-table');
  if (employeesTable) {
    employeesTable.addEventListener('click', (event) => {
      const editButton = event.target.closest('[data-edit-employee-id]');
      if (editButton) {
        const employee = state.employees.find((item) => item.id === editButton.dataset.editEmployeeId);
        if (employee) {
          openEmployeeModal(employee);
        }
        return;
      }

      const deleteButton = event.target.closest('[data-delete-employee-id]');
      if (deleteButton) {
        const employee = state.employees.find((item) => item.id === deleteButton.dataset.deleteEmployeeId);
        if (employee) {
          logAdminAction('Deleted', 'Employee', getEmployeeFullName(employee));
        }
        state.employees = state.employees.filter((item) => item.id !== deleteButton.dataset.deleteEmployeeId);
        saveState();
        renderDashboard();
      }
    });
  }

  const policyTable = document.getElementById('policy-table');
  if (policyTable) {
    policyTable.addEventListener('click', (event) => {
      const editButton = event.target.closest('[data-policy-edit-id]');
      if (editButton) {
        openPolicyFromEditButton(editButton);
        return;
      }

      const toggleButton = event.target.closest('[data-policy-toggle-id]');
      if (toggleButton) {
        const policy = state.policies.find((item) => item.id === toggleButton.dataset.policyToggleId);
        if (policy) {
          policy.enabled = !policy.enabled;
          saveState();
          renderDashboard();
        }
      }
    });
  }

  const ticketsTable = document.getElementById('tickets-table');
  if (ticketsTable) {
    ticketsTable.addEventListener('click', (event) => {
      const messageButton = event.target.closest('[data-ticket-message-id]');
      if (messageButton) {
        openTicketMessageModal(messageButton.dataset.ticketMessageId);
        return;
      }

      const laptopChangeButton = event.target.closest('[data-laptop-change-ticket-id]');
      if (laptopChangeButton) {
        const ticket = state.tickets.find((item) => item.id === laptopChangeButton.dataset.laptopChangeTicketId);
        if (ticket) {
          openReplacementFromTicket(ticket);
        }
        return;
      }

      const emailButton = event.target.closest('[data-email-ticket-id]');
      if (!emailButton) return;

      const ticket = state.tickets.find((item) => item.id === emailButton.dataset.emailTicketId);
      if (!ticket) return;

      window.location.href = buildIssueMailto(ticket);
    });

    ticketsTable.addEventListener('change', (event) => {
      const select = event.target.closest('[data-ticket-status-id]');
      if (!select) return;

      const ticket = state.tickets.find((item) => item.id === select.dataset.ticketStatusId);
      if (!ticket) return;

      ticket.status = select.value;
      if (['Resolved', 'Closed', 'Completed'].includes(ticket.status)) {
        ticket.resolvedAt = new Date().toISOString();
        const linkedDevice = state.devices.find((device) => device.email === ticket.email || device.user === ticket.employee.split(' ')[0]);
        if (linkedDevice) {
          linkedDevice.status = 'available';
        }
      } else {
        delete ticket.resolvedAt;
      }
      logAdminAction('Updated', 'Ticket', `${ticket.employee} - ${ticket.status}`);
      saveState();
      renderTickets();
      renderDashboard();
    });
  }

  const deviceSearch = document.getElementById('device-search');
  if (deviceSearch) deviceSearch.addEventListener('input', renderDevices);
  const deviceStatusFilter = document.getElementById('device-status-filter');
  if (deviceStatusFilter) deviceStatusFilter.addEventListener('change', renderDevices);
  const deviceSurnameSort = document.getElementById('device-surname-sort');
  if (deviceSurnameSort) {
    deviceSurnameSort.addEventListener('change', () => {
      window.deviceSortDirection = deviceSurnameSort.value === 'desc' ? 'desc' : 'asc';
      renderDevices();
    });
  }

  const employeeSearch = document.getElementById('employee-search');
  if (employeeSearch) employeeSearch.addEventListener('input', renderEmployees);
  const employeeStatusFilter = document.getElementById('employee-status-filter');
  if (employeeStatusFilter) employeeStatusFilter.addEventListener('change', renderEmployees);
  const employeeDepartmentFilter = document.getElementById('employee-department-filter');
  if (employeeDepartmentFilter) employeeDepartmentFilter.addEventListener('change', renderEmployees);
  const employeeRoleFilter = document.getElementById('employee-role-filter');
  if (employeeRoleFilter) employeeRoleFilter.addEventListener('change', renderEmployees);

  const laptopSearch = document.getElementById('laptop-search');
  if (laptopSearch) laptopSearch.addEventListener('input', renderLaptops);
  const laptopStatusFilter = document.getElementById('laptop-status-filter');
  if (laptopStatusFilter) laptopStatusFilter.addEventListener('change', renderLaptops);

  const incognitoToggle = document.getElementById('incognito-toggle');
  const settingsIncognitoToggle = document.getElementById('settings-incognito-toggle');

  [incognitoToggle, settingsIncognitoToggle].forEach((toggle) => {
    if (!toggle) return;
    toggle.addEventListener('change', () => {
      if (!isChromeOrEdgeBrowser()) {
        toggle.checked = false;
        renderIncognitoStatus();
        return;
      }

      state.features = state.features || {};
      state.features.incognitoBlocker = toggle.checked;
      saveState().then((synced) => {
        incognitoControlSyncSucceeded = synced;
        renderIncognitoStatus();
        if (!synced) {
          showToast('error', 'Incognito policy not synced', 'The setting was saved locally, but the extension has not received it. Configure the secure sync backend and database policies.');
        }
      });
    });
  });

  const adminEmailInput = document.getElementById('admin-email');
  if (adminEmailInput) {
    adminEmailInput.value = getAdminEmail();
    adminEmailInput.addEventListener('change', () => {
      state.settings = state.settings || {};
      state.settings.adminEmail = adminEmailInput.value.trim() || '';
      saveState();
      renderDashboard();
    });
  }

  const accentPicker = document.getElementById('accent-picker');
  if (accentPicker) {
    accentPicker.value = normalizeAccentColor(state.settings?.accentColor || DEFAULT_ACCENT_COLOR);
    accentPicker.addEventListener('input', (event) => {
      setAccentColor(event.target.value);
    });
  }

  const ticketRetentionDaysInput = document.getElementById('ticket-retention-days');
  if (ticketRetentionDaysInput) {
    ticketRetentionDaysInput.value = String(getTicketRetentionDays());
    ticketRetentionDaysInput.addEventListener('change', () => {
      const nextValue = Number(ticketRetentionDaysInput.value);
      state.settings = state.settings || {};
      state.settings.ticketRetentionDays = Number.isFinite(nextValue) && nextValue >= 0 ? nextValue : 3;
      saveState();
      renderDashboard();
    });
  }

  const retentionDateInput = document.getElementById('retention-date');
  if (retentionDateInput) {
    retentionDateInput.value = getRetentionDateValue();
    retentionDateInput.addEventListener('change', () => {
      state.settings = state.settings || {};
      state.settings.retentionDate = retentionDateInput.value || getRetentionDateValue();
      saveState();
    });
  }

  const deleteOldDataButton = document.getElementById('delete-old-data');
  if (deleteOldDataButton) {
    deleteOldDataButton.addEventListener('click', deleteOldUsageData);
  }

  const disposalRetentionDaysInput = document.getElementById('disposal-retention-days');
  if (disposalRetentionDaysInput) {
    disposalRetentionDaysInput.value = String(getDisposalRetentionDays());
    disposalRetentionDaysInput.addEventListener('change', () => {
      const nextValue = Number(disposalRetentionDaysInput.value);
      state.settings = state.settings || {};
      state.settings.disposalRetentionDays = Number.isFinite(nextValue) && nextValue >= 0 ? nextValue : 30;
      saveState();
      renderDashboard();
    });
  }

  const deleteOldDisposalLaptopsButton = document.getElementById('delete-old-disposal-laptops');
  if (deleteOldDisposalLaptopsButton) {
    deleteOldDisposalLaptopsButton.addEventListener('click', deleteOldDisposalLaptops);
  }

  document.querySelectorAll('.nav-link').forEach((button) => {
    button.addEventListener('click', () => activateSection(button.dataset.section));
  });

  document.querySelectorAll('.analytics-tab').forEach((button) => {
    button.addEventListener('click', () => activateAnalyticsTab(button.dataset.analyticsTab));
  });

  document.querySelectorAll('.ticket-settings-tab').forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.dataset.ticketTab;
      document.querySelectorAll('.ticket-settings-tab').forEach((tab) => {
        const isActive = tab === button;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', String(isActive));
      });

      document.querySelectorAll('.ticket-settings-panel').forEach((panel) => {
        panel.classList.toggle('active', panel.dataset.ticketPanel === target);
      });
    });
  });

  document.querySelectorAll('.retention-subtab').forEach((button) => {
    if (button.dataset.retentionTabBound === 'true') return;
    button.dataset.retentionTabBound = 'true';
    button.addEventListener('click', () => {
      const target = button.dataset.retentionTab;
      document.querySelectorAll('.retention-subtab').forEach((tab) => {
        const isActive = tab === button;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', String(isActive));
      });

      document.querySelectorAll('.retention-subpanel').forEach((panel) => {
        panel.classList.toggle('active', panel.dataset.retentionPanel === target);
      });
    });
  });

  applyWebsiteIcons();
  setInterval(() => {
    refreshLiveUsageData();
  }, 6000);

  if (requiredRoot) {
    applySavedAccentColor();
    setTheme(getStoredTheme());
  } else if (loginForm) {
    setLoginTheme(getStoredLoginTheme());
  }
});
