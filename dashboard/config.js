window.__APP_CONFIG__ = window.__APP_CONFIG__ || {};

const envUrl = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL
  ? String(import.meta.env.VITE_SUPABASE_URL).trim()
  : '';
const envAnonKey = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  ? String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY).trim()
  : '';
const envApiBaseUrl = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL
  ? String(import.meta.env.VITE_API_BASE_URL).trim()
  : '';

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

window.__APP_CONFIG__.supabaseUrl = envUrl || storedUrl || 'https://uwjsmxvdsdozzimukael.supabase.co';
window.__APP_CONFIG__.supabaseAnonKey = envAnonKey || storedAnonKey || 'sb_publishable_BU7kYL8KZuFAa06SglHykw_6U1044Ud';
window.__APP_CONFIG__.apiBaseUrl = envApiBaseUrl || storedApiBaseUrl || '/api/supabase-sync';
window.__APP_CONFIG__.serverSyncUrl = window.__APP_CONFIG__.apiBaseUrl;

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
