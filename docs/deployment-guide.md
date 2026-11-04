# Deployment guide

## Local testing

1. Back up the existing MINDLOCK Supabase project and inspect any existing tables with the same names.
2. Run [`supabase/migrations/20261104160000_system_backend.sql`](../supabase/migrations/20261104160000_system_backend.sql), [`supabase/migrations/20261104172000_incognito_blocking.sql`](../supabase/migrations/20261104172000_incognito_blocking.sql), and [`supabase/migrations/20261106120000_changelog_retention.sql`](../supabase/migrations/20261106120000_changelog_retention.sql), in the Supabase SQL editor.
3. Configure `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, a unique `ADMIN_SESSION_SECRET` (at least 32 characters), and exact dashboard/extension origins in `ALLOWED_ORIGINS` in the backend environment. Keep the Supabase secret key and signing secret on the backend only.
4. Serve the dashboard locally:

   ```bash
   cd d:/sys13
   python -m http.server 8000
   ```

5. For separate local ports, set `localStorage.setItem('apiBaseUrl', 'http://localhost:3000/api/supabase-sync')` in the dashboard origin's browser console, then reload. In production, serve the management API through the same HTTPS origin or configure the dashboard's `apiBaseUrl` to the API endpoint. The static dashboard reads injected `window.__APP_CONFIG__` values or its existing local browser config; it does not load `.env` files.
6. Open `http://localhost:8000/dashboard/` and sign in with an administrator account present in `user_credentials` and `employees`. The Incognito toggle lives in the existing Incognito blocker panel; the settings endpoint requires an active administrator session.
7. For each already registered and assigned laptop, run `node backend/provision-agent.js <device-row-id>` on the backend host. Send the one-time token securely to the matching laptop.
8. On the laptop, open elevated PowerShell in `windows-agent/` and run `.\Install-Mindlock-PolicyAgent.ps1 -ApiBaseUrl https://your-management-api.example -DeviceId <device-row-id>`. Enter the token at the prompt. The installer creates a SYSTEM startup task and the agent immediately checks the global policy.
9. Newly registered laptops do not need a per-laptop policy toggle; provision their agent once and they inherit the current global setting on their first successful check.

## Browser Web Store distribution

To distribute the extension through the Chrome Web Store:

- package the extension as a zip archive,
- create a Chrome Web Store developer account,
- upload the extension,
- configure permissions and listing details,
- publish after review.

## Enterprise-managed installation

The MINDLOCK agent applies the enterprise registry policies with administrator privileges. Where available, organizations may instead deploy equivalent policies with their approved Group Policy or device-management tooling. Avoid configuring both mechanisms with conflicting values.

Where supported, use Chrome enterprise policy to:

- force-install the extension,
- block removal by ordinary users,
- keep a controlled version across workstation fleets.

This is the recommended path when it must be enforced beyond developer testing.

The agent uses `HKLM\SOFTWARE\Policies\Google\Chrome\IncognitoModeAvailability` and `HKLM\SOFTWARE\Policies\Microsoft\Edge\InPrivateModeAvailability`. It records the prior values, checks the registry after each change, polls for updates while online, and starts at Windows startup. Existing browser processes may need to be restarted to reflect a newly applied browser policy.

## Post-deployment acceptance checks

1. Enable the global toggle and verify the backend policy row changes to `true`; verify both registry policy values become DWORD `1` on connected managed laptops.
2. Disable the toggle and verify each agent restores its prior value (or removes the value if it did not exist before MINDLOCK).
3. Register and assign another laptop, provision its agent, and confirm its first check receives the current global value without any laptop-specific policy configuration.
4. Disconnect an agent, change the global setting, reconnect it, and confirm the next poll applies the latest value.
5. Restart Chrome and Edge and verify Incognito/InPrivate is unavailable only while enabled; confirm ordinary windows and normal browsing still work.
6. Confirm scheduled website blocking and analytics continue to function independently.

## Developer mode note

Developer mode is appropriate for testing, but ordinary use should not rely on it. It should be disabled when the browser enters a production or managed environment.
