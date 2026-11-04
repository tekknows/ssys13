const DEFAULTS = {
  supabaseUrl: 'https://owuottmockghwcysnfig.supabase.co',
  supabaseAnonKey: 'sb_publishable_dLvhzyFjokO9E6BnMsvblg_MmLaNNaR',
  apiBaseUrl: '',
  deviceId: '',
  deviceSecret: '',
  itManagerEmail: '',
};
const PREVIOUS_SUPABASE_URL = 'https://uwjsmxvdsdozzimukael.supabase.co';
const PREVIOUS_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_BU7kYL8KZuFAa06SglHykw_6U1044Ud';

const form = document.getElementById('settings-form');
const statusBox = document.getElementById('status');

function updateStatus(message, isError = false) {
  statusBox.textContent = message;
  statusBox.classList.toggle('error', isError);
}

async function loadSettings() {
  const data = await chrome.storage.local.get(Object.keys(DEFAULTS));
  const supabaseUrl = !data.supabaseUrl || data.supabaseUrl === PREVIOUS_SUPABASE_URL
    ? DEFAULTS.supabaseUrl
    : data.supabaseUrl;
  const supabaseAnonKey = !data.supabaseAnonKey || data.supabaseAnonKey === PREVIOUS_SUPABASE_PUBLISHABLE_KEY
    ? DEFAULTS.supabaseAnonKey
    : data.supabaseAnonKey;
  if (supabaseUrl !== data.supabaseUrl || supabaseAnonKey !== data.supabaseAnonKey) {
    await chrome.storage.local.set({ supabaseUrl, supabaseAnonKey });
  }
  document.getElementById('supabase-url').value = supabaseUrl;
  document.getElementById('supabase-anon-key').value = supabaseAnonKey;
  document.getElementById('api-base-url').value = data.apiBaseUrl || '';
  document.getElementById('device-id').value = data.deviceId || '';
  document.getElementById('device-secret').value = data.deviceSecret || '';
  document.getElementById('it-manager-email').value = data.itManagerEmail || '';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const data = {
    supabaseUrl: document.getElementById('supabase-url').value.trim(),
    supabaseAnonKey: document.getElementById('supabase-anon-key').value.trim(),
    apiBaseUrl: document.getElementById('api-base-url').value.trim().replace(/\/+$/, ''),
    deviceId: document.getElementById('device-id').value.trim(),
    deviceSecret: document.getElementById('device-secret').value.trim(),
    itManagerEmail: document.getElementById('it-manager-email').value.trim(),
  };

  try {
    const supabaseUrl = new URL(data.supabaseUrl);
    if (supabaseUrl.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(supabaseUrl.hostname)) {
      throw new Error('Use an HTTPS Supabase URL, or localhost for local development.');
    }
    const apiUrl = new URL(data.apiBaseUrl);
    if (apiUrl.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(apiUrl.hostname)) {
      throw new Error('Use an HTTPS management API URL, or localhost for local development.');
    }

    const originPatterns = [`${supabaseUrl.origin}/*`, `${apiUrl.origin}/*`];
    const alreadyGranted = await chrome.permissions.contains({ origins: originPatterns });
    if (!alreadyGranted) {
      const granted = await chrome.permissions.request({ origins: originPatterns });
      if (!granted) {
        throw new Error('Site access is required to synchronize categories and policies.');
      }
    }

    await chrome.storage.local.set(data);
    updateStatus('Saved. The extension will synchronize with the admin dashboard when it next refreshes policies.');
  } catch (error) {
    updateStatus(error.message || 'Unable to save settings.', true);
  }
});

loadSettings().catch((error) => {
  updateStatus(error.message || 'Unable to load settings.', true);
});
