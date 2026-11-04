# Supabase setup for MINDLOCK

## 1) Inspect the current app and database assumptions

The current project is not a React or Vite app. It is a static browser dashboard and a Chrome extension that use Supabase plus browser storage. The dashboard persists settings, roles, devices, policies, schedules, ticket configuration, tickets, analytics, notifications, and the update log. The extension reads blocking policies and the public issue-category snapshot.

- settings
- incognito_control
- employees
- devices
- replacements
- policies
- schedules
- usage
- analytics_snapshot
- notifications
- ticket_settings
- tickets
- changelog
- ticket_category_settings
- user_credentials
- admin_access_assignments
- blocking_policies
- usage_events

The base MINDLOCK schema migration is now included in this checkout. No live Supabase project is available to inspect; review any existing table definitions before applying it to a populated project.

## 2) Create a new Supabase project

1. Open the intended MINDLOCK Supabase project and back it up before applying schema changes.
2. Review whether the project already has tables with these names. The base migration creates missing tables and adds missing application columns, but does not convert incompatible column types or deduplicate existing records. Resolve existing duplicate employee emails, credential emails, employee-permission keys, and registered laptop IDs before running it; unique indexes intentionally make duplicate registrations fail rather than silently create more.
3. Run [`supabase/migrations/20261104160000_system_backend.sql`](../supabase/migrations/20261104160000_system_backend.sql) in the SQL editor.
4. Run [`supabase/migrations/20261104172000_incognito_blocking.sql`](../supabase/migrations/20261104172000_incognito_blocking.sql) in the SQL editor.
5. Run [`supabase/migrations/20261106120000_changelog_retention.sql`](../supabase/migrations/20261106120000_changelog_retention.sql) to add the update-log retention settings.
6. Confirm the tables exist, RLS is enabled, and administrator records and credentials were provisioned through a trusted process.

The employee form stores the full name in `employees.name` and leaves the legacy `surname` column blank. The visible role `Admin` is stored as the canonical `Administrator` value in `account_role` so existing authorization checks remain compatible.

The existing Incognito blocker retains a compatibility value in `incognito_control`, but the row is backend-only. The browser extension and Windows agent retrieve policy from the authenticated management API. Run [`supabase/migrations/20261104172000_incognito_blocking.sql`](../supabase/migrations/20261104172000_incognito_blocking.sql) after the base schema migration. It creates `system_policies` and `device_agent_credentials` with RLS enabled and no client-access policies; only the backend service role can access them. The initial global setting is seeded from `incognito_control`; subsequent administrator changes are upserted to `system_policies` directly by the authenticated backend.

The current dashboard uses its custom `user_credentials` table and does not create Supabase Auth users. The management API validates credentials and administrator roles against those tables before issuing its short-lived session. Newly provisioned passwords use scrypt; an existing SHA-256 or plaintext credential is upgraded to scrypt after a successful administrator login. Do not seed the built-in demo password into a production database.

The base migration revokes browser-client access to system tables and grants the backend service role access. This is intentional because the dashboard uses custom sessions rather than Supabase Auth JWTs. Dashboard state hydration, state saves, employee account changes, and employee-permission management use authenticated management API endpoints. Employee profile, credential, and email changes are written transactionally so they do not create duplicate registrations or leave credentials half-updated.

Bootstrap administrator credentials are provisioned with the trusted backend CLI described below; dashboard JavaScript contains no hardcoded credentials, client-side password generator, or password hashing. Passwords explicitly entered in the authenticated account form are sent to the management API for server-side hashing and are never saved in dashboard state or local storage. Existing browser state is sanitized to remove legacy password and hash fields.

## Database-backed issue categories

Ticket Settings saves category names and active states to `ticket_settings` and mirrors only that category list to the `ticket_category_settings` singleton. The extension reads this limited table using its anon key; RLS allows public reads of the category snapshot, while writes remain restricted to the service-role backend. To allow extension requests, save the Supabase URL in extension settings and approve the host-access prompt.

The schema also includes `changelog` for update-log entries and fields for the ticket settings used by the dashboard. Singleton records use stable IDs so repeated saves update existing rows instead of creating duplicates.

## Update-log retention

The Settings → General Settings panel stores `changelog_retention_days` and
`changelog_auto_cleanup_enabled` in the `settings` table. Apply the retention
migration above before saving these controls. Automatic cleanup runs after an
administrator successfully loads dashboard data; the **Clean up now** action
uses the same authenticated backend endpoint. A retention value of `0` keeps
all update-log entries. Cleanup deletes only `changelog` rows older than the
selected period and does not alter tickets, website policies, or analytics.

## Database coverage notes

- Dashboard settings and feature flags use `settings`; role records use `employees`, `user_credentials`, and `employee_permissions`; devices, replacements, blocking policies, schedules, usage, analytics, notifications, ticket settings, tickets, and update logs have corresponding tables.
- Extension-created issue reports are currently kept in extension-local storage and opened in the configured mail client. Although the `tickets` table exists, those popup reports are not yet inserted into it or shared across devices.
- No production admin-seed SQL is included. Provision administrator credentials through a trusted backend process; do not make a public SQL insert containing a reusable default password.

## 3) Add the required environment variables

Set these values in the backend process environment or a local, Git-ignored `.env.local`:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your_publishable_key
SUPABASE_SECRET_KEY=server_only_secret_key
ADMIN_SESSION_SECRET=a_random_secret_at_least_32_characters
ALLOWED_ORIGINS=https://admin.example.com,chrome-extension://your-extension-id
PORT=3000
API_BASE_URL=http://localhost:3000/api/supabase-sync
```

Keep `SUPABASE_SECRET_KEY` and `ADMIN_SESSION_SECRET` in the backend process environment only; never put them in browser code or extension storage. The extension may use `SUPABASE_PUBLISHABLE_KEY` for its public ticket-category read. Set `ALLOWED_ORIGINS` to the exact dashboard origin and, when the extension calls the API directly, its `chrome-extension://<extension-id>` origin. Start the API with `npm run start:backend` and configure the dashboard's `apiBaseUrl` to reach `/api/supabase-sync` (or proxy that path to the API). The API validates custom dashboard credentials against `user_credentials` and the administrator role against `employees`, issues a short-lived HMAC-signed admin session, and rechecks active administrator status for protected operations. Deploy the API behind HTTPS and rate limiting.

The dashboard's local browser login alone is not API authentication. Only the server-issued signed session can authorize privileged writes.
The static dashboard reads runtime values from `window.__APP_CONFIG__` before `dashboard/config.js` loads, or from the existing `localStorage` entries `supabaseUrl`, `supabaseAnonKey`, and `apiBaseUrl`. It does not read a backend `.env.local` file. Known previous default Supabase settings are migrated to the current project; user-specified custom URLs and keys are preserved.

## Provision an administrator

After applying both migrations and configuring the backend's Supabase URL and
secret key, create or reset an administrator from a trusted machine. Run the
command in an interactive terminal; the provisioner prompts for the password
without echoing it and stores only a scrypt hash:

```powershell
$env:ADMIN_EMAIL = "admin@your-company.com"
npm run provision:admin
```

Run this from the repository root on the backend host, with `SUPABASE_URL` and
`SUPABASE_SECRET_KEY` configured in its environment or `.env.local`. On Windows,
if PowerShell blocks `npm.ps1`, run
`& 'C:\Program Files\nodejs\npm.cmd' run provision:admin` instead. Do not
commit the entered password or a password hash to SQL or source control.

## 4) Configure the extension

Open the Chrome extension options page and enter:

- the HTTPS management API base URL
- the Supabase URL
- the anonymous publishable key
- the device ID
- the device secret

The device ID and secret are provisioned for a registered, assigned laptop. The secret is a per-device token and must not be shared. The Supabase URL and publishable key are only used by the extension's public ticket-category read; browser policy and usage synchronization use the management API. The extension origin must be included in `ALLOWED_ORIGINS` if it calls the API directly.

## 5) Post-setup verification checklist

After running the SQL in Supabase, confirm that:

- the tables exist in the database explorer
- RLS is enabled on the protected tables
- authorized administrator records exist in `employees` with the expected roles
- matching active credentials exist in `user_credentials`
- the administrator dashboard can read and update the global policy through its authenticated backend API
- browser clients cannot directly read or write protected system tables
- the management API rejects unauthenticated requests and non-administrator sessions for administrator endpoints
- blocked domains are written to `blocking_policies`
- usage rows are inserted into `usage_events`
- `system_policies` and `device_agent_credentials` have RLS enabled and no anon/authenticated access policies

## 6) Important security note

The project intentionally uses custom credential checks stored in `user_credentials`; password verification and administrator authorization happen in the backend, not in browser JavaScript.

The migration protects the new global policy and agent credentials from direct client access. The API validates administrators through the custom credential table and employee role records. Do not add broad client policies to make direct dashboard reads succeed.
