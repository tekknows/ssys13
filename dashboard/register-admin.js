(() => {
  const form = document.getElementById('register-admin-form');
  const message = document.getElementById('register-admin-message');
  const submitButton = document.getElementById('register-admin-submit');
  const themeToggle = document.getElementById('register-theme-toggle');
  const sessionKey = 'mindlock-admin-api-session';
  const loginKey = 'site-blocker-admin-auth';
  const userKey = 'site-blocker-admin-session';

  function getApiUrl(path) {
    const config = window.__APP_CONFIG__ || {};
    const configured = String(config.apiBaseUrl || config.serverSyncUrl || '').trim();
    return configured.startsWith('http://') || configured.startsWith('https://')
      ? new URL(path, configured).toString()
      : path;
  }

  function hasAuthenticatedAdminSession() {
    try {
      const session = JSON.parse(localStorage.getItem(userKey) || 'null');
      return localStorage.getItem(loginKey) === 'true'
        && session?.role === 'Administrator'
        && Boolean(sessionStorage.getItem(sessionKey));
    } catch (error) {
      return false;
    }
  }

  function showMessage(text, isError = true) {
    message.textContent = text;
    message.classList.toggle('success', !isError);
    message.classList.toggle('error', isError);
  }

  if (!hasAuthenticatedAdminSession()) {
    form.hidden = true;
    showMessage('An active administrator session is required to register an administrator.');
    return;
  }

  try {
    const savedTheme = localStorage.getItem('site-blocker-admin-theme');
    if (savedTheme === 'dark') document.body.dataset.theme = 'dark';
  } catch (error) {
    console.warn('Unable to load the saved dashboard theme.');
  }

  themeToggle?.addEventListener('click', () => {
    const isDark = document.body.dataset.theme === 'dark';
    document.body.dataset.theme = isDark ? 'light' : 'dark';
    try {
      localStorage.setItem('site-blocker-admin-theme', isDark ? 'light' : 'dark');
    } catch (error) {
      console.warn('Unable to save the dashboard theme.');
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!hasAuthenticatedAdminSession()) {
      form.hidden = true;
      showMessage('Your administrator session has expired. Sign in to the dashboard, then reopen this page.');
      return;
    }

    const name = document.getElementById('register-admin-name').value.trim();
    const email = document.getElementById('register-admin-email').value.trim().toLowerCase();
    const department = document.getElementById('register-admin-department').value.trim();
    const passwordInput = document.getElementById('register-admin-password');
    const confirmInput = document.getElementById('register-admin-confirm-password');
    const password = passwordInput.value;
    const confirmPassword = confirmInput.value;

    if (!name || !email || !department) {
      showMessage('Complete all fields before submitting.');
      return;
    }
    if (password.length < 8 || password.length > 1024) {
      showMessage('Password must be between 8 and 1024 characters.');
      return;
    }
    if (password !== confirmPassword) {
      showMessage('The password confirmation does not match.');
      return;
    }

    submitButton.disabled = true;
    showMessage('Creating administrator account…', false);
    try {
      const response = await fetch(getApiUrl('/api/admin/employees'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem(sessionKey)}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          name,
          department,
          accountRole: 'Administrator',
          password,
          is_active: true,
        }),
      });
      let payload;
      try {
        payload = await response.json();
      } catch (error) {
        throw new Error(`Management API returned an invalid response (${response.status}).`);
      }
      if (!response.ok || payload?.ok !== true) {
        throw new Error(payload?.error || `Unable to register administrator (${response.status}).`);
      }

      passwordInput.value = '';
      confirmInput.value = '';
      form.reset();
      showMessage(`Administrator account created for ${email}.`, false);
    } catch (error) {
      showMessage(error.message || 'Unable to create the administrator account.');
    } finally {
      submitButton.disabled = false;
    }
  });
})();
