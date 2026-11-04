const DEFAULTS = {
  supabaseUrl: '',
  supabaseAnonKey: '',
  deviceId: '',
  deviceSecret: '',
  itManagerEmail: '',
};

const form = document.getElementById('settings-form');
const statusBox = document.getElementById('status');

function updateStatus(message, isError = false) {
  statusBox.textContent = message;
  statusBox.classList.toggle('error', isError);
}

async function loadSettings() {
  const data = await chrome.storage.local.get(Object.keys(DEFAULTS));
  document.getElementById('supabase-url').value = data.supabaseUrl || '';
  document.getElementById('supabase-anon-key').value = data.supabaseAnonKey || '';
  document.getElementById('device-id').value = data.deviceId || '';
  document.getElementById('device-secret').value = data.deviceSecret || '';
  document.getElementById('it-manager-email').value = data.itManagerEmail || '';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const data = {
    supabaseUrl: document.getElementById('supabase-url').value.trim(),
    supabaseAnonKey: document.getElementById('supabase-anon-key').value.trim(),
    deviceId: document.getElementById('device-id').value.trim(),
    deviceSecret: document.getElementById('device-secret').value.trim(),
    itManagerEmail: document.getElementById('it-manager-email').value.trim(),
  };

  try {
    const supabaseUrl = new URL(data.supabaseUrl);
    if (supabaseUrl.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(supabaseUrl.hostname)) {
      throw new Error('Use an HTTPS Supabase URL, or localhost for local development.');
    }

    const originPattern = `${supabaseUrl.origin}/*`;
    const alreadyGranted = await chrome.permissions.contains({ origins: [originPattern] });
    if (!alreadyGranted) {
      const granted = await chrome.permissions.request({ origins: [originPattern] });
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
