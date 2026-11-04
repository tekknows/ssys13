window.__APP_CONFIG__ = window.__APP_CONFIG__ || {};

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

window.__APP_CONFIG__.supabaseUrl = envUrl || storedUrl || 'https://owuottmockghwcysnfig.supabase.co';
window.__APP_CONFIG__.supabaseAnonKey = envAnonKey || storedAnonKey || 'sb_publishable_dLvhzyFjokO9E6BnMsvblg_MmLaNNaR';
window.__APP_CONFIG__.apiBaseUrl = envApiBaseUrl || storedApiBaseUrl || 'http://localhost:3000/api/supabase-sync';
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
