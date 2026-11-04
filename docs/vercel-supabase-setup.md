# Connect MINDLOCK on Vercel to Supabase

This guide covers the current MINDLOCK setup: a static dashboard, a Supabase
project, and a separate Node.js management API. The Vercel deployment can host
the dashboard, but adding environment variables to Vercel alone does **not**
deploy the management API.

## 1. Prepare the Supabase project

1. Open the Supabase project used by MINDLOCK.
2. Back up the project and check for existing MINDLOCK tables with the same
   names. The base migration creates missing tables; it does not rewrite
   existing definitions or migrate existing data.
3. In **SQL Editor**, run
   [`supabase/migrations/20261104160000_system_backend.sql`](../supabase/migrations/20261104160000_system_backend.sql).
4. Then run
   [`supabase/migrations/20261104172000_incognito_blocking.sql`](../supabase/migrations/20261104172000_incognito_blocking.sql).
5. Confirm the policy migration created `system_policies` and
   `device_agent_credentials` with RLS enabled. Do not add public or
   authenticated-client write policies to these protected tables.

The base migration also protects system tables using RLS and permits only the
backend service role to read or write them, except for the public ticket-category
snapshot. The legacy Incognito compatibility row is also backend-only. Dashboard state,
employee-account changes, permission changes, and policy updates use
authenticated management API endpoints.

The migration must run against the same Supabase project used by the deployed
dashboard and management API.

## 2. Deploy the management API

The repository's API is a Node.js server started locally with
`npm run start:backend`. It implements administrator sessions, global policy
read/write, Windows agent policy checks, and dashboard state sync. The adapter
at [`api/[...path].js`](../api/[...path].js) exposes these existing backend
routes as a Vercel Node.js Function.

Choose one of these approaches:

- **Vercel deployment:** use the included adapter and configure all backend
  environment variables in the Vercel project. Ensure Vercel's project Root
  Directory is the repository root so it deploys `api/[...path].js`.
- **Separate backend host:** deploy the Node.js backend to a host that supports
  a persistent Node.js web service. Configure HTTPS and keep the service
  running. Its public URL will be the management API origin.

Do not point the dashboard at `localhost` in production. The API URL must be
reachable over HTTPS from the deployed dashboard and managed laptops.

## 3. Configure backend environment variables

In the hosting provider's environment settings for the **management API**, add:

| Variable | Value |
| --- | --- |
| `SUPABASE_URL` | The project URL from Supabase **Project Settings → API** |
| `SUPABASE_SECRET_KEY` | The server-side secret key for this project |
| `ADMIN_SESSION_SECRET` | A unique random secret of at least 32 characters |
| `ALLOWED_ORIGINS` | Exact comma-separated dashboard and extension origins; include `https://ssys13.vercel.app` and any custom dashboard origin |
| `PORT` | Set only if required by the backend host |

Use the secret key only on the backend. Never put it in Vercel variables exposed
to browser code, dashboard configuration, extension settings, or a committed
file. The dashboard and extension use the **publishable** key, which is not a
replacement for the backend secret.

Generate a signing secret locally if needed:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Because a Supabase secret key was previously pasted into chat, rotate that key
in Supabase and use the replacement in the backend host's environment. Then
redeploy/restart the backend. Do not reuse the exposed key.

## 4. Set the dashboard API URL

The dashboard must call the deployed management API, not
`http://localhost:3000/api/supabase-sync`.

The current dashboard reads `window.__APP_CONFIG__.apiBaseUrl` before
`dashboard/config.js` loads. For a fixed Vercel deployment, configure that
value in a script that runs before `config.js` in
[`dashboard/index.html`](../dashboard/index.html):

```html
<script>
  window.__APP_CONFIG__ = {
    ...(window.__APP_CONFIG__ || {}),
    apiBaseUrl: "https://your-management-api.example.com/api/supabase-sync"
  };
</script>
```

Replace the example with the real HTTPS URL of the deployed backend. Keep the
configuration before the existing `config.js` script tag, then redeploy the
dashboard to Vercel. The shared dashboard configuration currently defaults to
`https://ssys13.vercel.app/api/supabase-sync`; the login page derives its
`/api/admin/session` request from this API base URL. Do not add a Supabase secret
key here. The same endpoint is used for authenticated dashboard reads (`GET`)
and saves (`POST`).

For a one-browser test only, you can instead open the deployed dashboard,
open the browser developer console, and run:

```js
localStorage.setItem(
  "apiBaseUrl",
  "https://your-management-api.example.com/api/supabase-sync"
);
location.reload();
```

This browser-local setting is not a production-wide configuration method:
other administrators and browsers will not inherit it.

## 5. Configure and redeploy Vercel

1. In Vercel, set the project **Root Directory** to the repository root so the
   `api/` serverless function is included. Keep `dashboard` as the static output
   directory if that matches the current deployment.
2. If the dashboard is served at a custom domain, use that exact HTTPS origin
   in the backend's `ALLOWED_ORIGINS`, including the scheme and any non-default
   port. For this deployment, include `https://ssys13.vercel.app`; otherwise
   the backend rejects browser requests.
3. Commit and push the dashboard API URL configuration from Step 4, or deploy
   the equivalent runtime configuration through your existing build process.
4. Redeploy the Vercel project.
5. In the Vercel deployment, confirm
   `https://ssys13.vercel.app/api/health` returns
   `{"ok":true,"status":"ok"}`. Then check the dashboard's Network panel and
   confirm API requests go to `https://ssys13.vercel.app/api/...`, not
   `localhost`.

Vercel environment variables are available to build or server code according to
the framework and deployment configuration. They are **not automatically
injected** into this project's static browser JavaScript. Do not expose
`SUPABASE_SECRET_KEY` or `ADMIN_SESSION_SECRET` as client-side variables.

## 6. Verify dashboard and policy access

1. Confirm the backend is running and allows the dashboard origin.
2. Sign in with an active administrator account already present in
   `employees` and `user_credentials`.
3. Confirm the dashboard state loads through the authenticated management API.
4. In the existing Incognito blocker panel, enable the global setting.
5. Confirm the dashboard receives a successful response from
   `PUT /api/incognito-policy` and that the `incognito_blocking` row in
   `system_policies` is enabled.
6. Disable the setting and verify the row becomes disabled.
7. Confirm normal browsing and existing website schedules and analytics still
   work.

If requests fail, check the browser Network panel, backend logs, the configured
`ALLOWED_ORIGINS`, and that the dashboard is using the correct API URL.

## 7. Provision and verify Windows laptops

The backend must be reachable over HTTPS by each laptop before provisioning.
For each registered and assigned device, run on the backend host:

```bash
node backend/provision-agent.js <device-row-id>
```

Transfer the returned per-device token securely to the matching laptop. In an
elevated PowerShell session on that laptop, install the agent:

```powershell
.\Install-Mindlock-PolicyAgent.ps1 `
  -ApiBaseUrl "https://your-management-api.example.com" `
  -DeviceId "<device-row-id>"
```

Enter the one-time token when prompted. The installer configures the agent to
start automatically with Windows. Test a policy enable/disable, an offline
device reconnecting, Chrome Incognito, Edge InPrivate, and normal browsing.

See the [deployment guide](./deployment-guide.md) and
[Supabase setup guide](./supabase-setup.md) for additional deployment and
database details.
