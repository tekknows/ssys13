function resolveSupabaseConfig(env = process.env) {
  const url = String(env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').trim();
  const serviceRoleKey = String(env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE || '').trim();
  const apiBaseUrl = String(env.API_BASE_URL || env.VITE_API_BASE_URL || '/api/supabase-sync').trim();

  if (!url) {
    throw new Error('SUPABASE_URL is required.');
  }

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY is required for secure backend writes.');
  }

  return {
    url,
    serviceRoleKey,
    apiBaseUrl,
  };
}

function normalizeRecords(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function createSyncRequestPayload(input = {}) {
  const state = input && input.state ? input.state : input;
  const ticketSettings = state.ticketSettings || state.ticket_settings || {};
  const analyticsSnapshot = state.analytics || state.analytics_snapshot || {};
  const settings = state.settings || {};
  const features = state.features || settings.features || {};

  return {
    settings: {
      ...settings,
      features,
      id: settings.id || '10000000-0000-4000-8000-000000000001',
    },
    employees: normalizeRecords(state.employees),
    devices: normalizeRecords(state.devices),
    replacements: normalizeRecords(state.replacements),
    policies: normalizeRecords(state.policies),
    schedules: normalizeRecords(state.schedules),
    usage: normalizeRecords(state.usage),
    analytics_snapshot: { ...analyticsSnapshot, id: analyticsSnapshot.id || '10000000-0000-4000-8000-000000000002' },
    notifications: normalizeRecords(state.notifications),
    ticket_settings: {
      ...ticketSettings,
      id: ticketSettings.id || '10000000-0000-4000-8000-000000000003',
    },
    ticket_category_settings: {
      id: 1,
      categories: Array.isArray(ticketSettings.categories) ? ticketSettings.categories : [],
    },
    tickets: normalizeRecords(state.tickets),
    changelog: normalizeRecords(state.changelog).map((entry) => ({
      ...entry,
      id: entry.id || entry.version,
    })),
  };
}

module.exports = {
  resolveSupabaseConfig,
  createSyncRequestPayload,
};
