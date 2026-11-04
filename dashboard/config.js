window.__APP_CONFIG__ = window.__APP_CONFIG__ || {};

const DEFAULT_SUPABASE_URL = 'https://owuottmockghwcysnfig.supabase.co';
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_dLvhzyFjokO9E6BnMsvblg_MmLaNNaR';
const PREVIOUS_SUPABASE_URL = 'https://uwjsmxvdsdozzimukael.supabase.co';
const PREVIOUS_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_BU7kYL8KZuFAa06SglHykw_6U1044Ud';
const envUrl = String(window.__APP_CONFIG__.supabaseUrl || '').trim();
const envAnonKey = String(window.__APP_CONFIG__.supabaseAnonKey || '').trim();
const envApiBaseUrl = String(window.__APP_CONFIG__.apiBaseUrl || '').trim();

const storedUrl = (() => {
  try {
    return String(localStorage.getItem('supabaseUrl') || '').trim();
  } catch (error) {
    return '';
  }
})();

const storedAnonKey = (() => {
  try {
    return String(localStorage.getItem('supabaseAnonKey') || '').trim();
  } catch (error) {
    return '';
  }
})();

const storedApiBaseUrl = (() => {
  try {
    return String(localStorage.getItem('apiBaseUrl') || '').trim();
  } catch (error) {
    return '';
  }
})();

const resolvedUrl = envUrl || (storedUrl && storedUrl !== PREVIOUS_SUPABASE_URL ? storedUrl : DEFAULT_SUPABASE_URL);
const resolvedPublishableKey = envAnonKey || (storedAnonKey && storedAnonKey !== PREVIOUS_SUPABASE_PUBLISHABLE_KEY
  ? storedAnonKey
  : DEFAULT_SUPABASE_PUBLISHABLE_KEY);

window.__APP_CONFIG__.supabaseUrl = resolvedUrl;
window.__APP_CONFIG__.supabaseAnonKey = resolvedPublishableKey;
window.__APP_CONFIG__.apiBaseUrl = envApiBaseUrl || storedApiBaseUrl || 'http://localhost:3000/api/supabase-sync';
window.__APP_CONFIG__.serverSyncUrl = window.__APP_CONFIG__.apiBaseUrl;

try {
  if (storedUrl === PREVIOUS_SUPABASE_URL) localStorage.setItem('supabaseUrl', DEFAULT_SUPABASE_URL);
  if (storedAnonKey === PREVIOUS_SUPABASE_PUBLISHABLE_KEY) localStorage.setItem('supabaseAnonKey', DEFAULT_SUPABASE_PUBLISHABLE_KEY);
} catch (error) {
  console.warn('Unable to migrate saved Supabase browser configuration.', error);
}

window.__APP_CONFIG__.validateSupabaseConfig = function validateSupabaseConfig() {
  const url = String(window.__APP_CONFIG__.supabaseUrl || '').trim();
  const key = String(window.__APP_CONFIG__.supabaseAnonKey || '').trim();
  const apiBaseUrl = String(window.__APP_CONFIG__.apiBaseUrl || '').trim();
  const hasValidUrl = /^https:\/\/.+\.supabase\.co(\/)?$/i.test(url);
  const hasKey = key.length > 20 && !key.includes('service_role');
  return {
    url,
    anonKey: key,
    apiBaseUrl,
    isValid: hasValidUrl && hasKey,
    warnings: hasValidUrl && hasKey ? [] : ['Supabase URL and anonymous key are missing or invalid. Configure them before live database writes.'],
  };
};

if (window.supabase && typeof window.supabase.createClient === 'function') {
  window.__APP_CONFIG__.supabaseClient = window.supabase.createClient(
    window.__APP_CONFIG__.supabaseUrl,
    window.__APP_CONFIG__.supabaseAnonKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }
  );
}
