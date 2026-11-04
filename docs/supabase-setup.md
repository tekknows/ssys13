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

This checkout does not contain the legacy base-schema or seed files, and no live Supabase project is available to inspect. Apply the organization's existing MINDLOCK schema and RLS scripts first.

## 2) Create a new Supabase project

1. Open the existing MINDLOCK Supabase project.
2. Confirm its existing base schema, RLS configuration, and administrator accounts are set up.
3. Confirm that `devices`, `incognito_control`, `employees`, `user_credentials`, and `employee_permissions` exist.
4. Run [`supabase/migrations/20261104172000_incognito_blocking.sql`](../supabase/migrations/20261104172000_incognito_blocking.sql) in the SQL editor.
5. Confirm each administrator has an active account and role in `employees` and an active credential in `user_credentials`.

The employee form stores the full name in `employees.name` and leaves the legacy `surname` column blank. The visible role `Admin` is stored as the canonical `Administrator` value in `account_role` so existing authorization policies remain compatible; the employee `role` column is constrained to `Admin`, `Employee`, or `IT Staff`.

The existing Incognito blocker retains a compatibility value in `incognito_control`. For centralized Windows enforcement, also run [`supabase/migrations/20261104172000_incognito_blocking.sql`](../supabase/migrations/20261104172000_incognito_blocking.sql) after the existing schema and RLS scripts. It creates `system_policies` and `device_agent_credentials` with RLS enabled and no client-access policies; only the backend service role can access them. It seeds the global row from `incognito_control` and adds a service-role-only RPC that updates both policy records atomically.

The existing dashboard uses its custom `user_credentials` table and does not create Supabase Auth users. The management API validates credentials and administrator roles against the existing tables before issuing its short-lived session.

## Database-backed issue categories

Ticket Settings saves category names and active states to `ticket_settings` and mirrors only that category list to the `ticket_category_settings` singleton. The extension reads this limited table using its anon key; RLS allows public reads of the category snapshot, while writes remain restricted to the service-role backend. To allow extension requests, save the Supabase URL in extension settings and approve the host-access prompt.

The schema also includes `changelog` for update-log entries and fields for the ticket settings used by the dashboard. Singleton records use stable IDs so repeated saves update existing rows instead of creating duplicates.

## Database coverage notes

- Dashboard settings and feature flags use `settings`; role records use `employees`, `user_credentials`, and `employee_permissions`; devices, replacements, blocking policies, schedules, usage, analytics, notifications, ticket settings, tickets, and update logs have corresponding tables.
- Extension-created issue reports are currently kept in extension-local storage and opened in the configured mail client. Although the `tickets` table exists, those popup reports are not yet inserted into it or shared across devices.
- The default admin must be created by running `admin-seed.sql` in the Supabase SQL editor. No live database credentials are available in this workspace, so the seed has not been run remotely.

## 3) Add the required environment variables

Set these values in the backend process environment or a local, Git-ignored `.env.local`:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your_publishable_key
SUPABASE_SECRET_KEY=server_only_secret_key
ADMIN_SESSION_SECRET=a_random_secret_at_least_32_characters
ALLOWED_ORIGINS=https://admin.example.com
PORT=3000
API_BASE_URL=http://localhost:3000/api/supabase-sync
```

Keep `SUPABASE_SECRET_KEY` and `ADMIN_SESSION_SECRET` in the backend process environment only; never put them in browser code or extension storage. The dashboard and extension may use `SUPABASE_PUBLISHABLE_KEY`. Set `ALLOWED_ORIGINS` to the exact dashboard origin(s). Start the API with `npm run start:backend` and configure the dashboard's `apiBaseUrl` to reach `/api/supabase-sync` (or proxy that path to the API). The API validates custom dashboard credentials against `user_credentials` and the administrator role against `employees`, issues a short-lived HMAC-signed admin session, and rechecks active administrator status for protected policy and sync operations. Deploy the API behind HTTPS and rate limiting.

The dashboard's local browser login alone is not API authentication. Only the server-issued signed session can authorize privileged writes.
The static dashboard reads runtime values from `window.__APP_CONFIG__` before `dashboard/config.js` loads, or from the existing `localStorage` entries `supabaseUrl`, `supabaseAnonKey`, and `apiBaseUrl`. It does not read a backend `.env.local` file. Known previous default Supabase settings are migrated to the current project; user-specified custom URLs and keys are preserved.

## 4) Configure the extension

Open the Chrome extension options page and enter:

- the Supabase URL
- the anonymous publishable key
- the device ID
- the device secret

This matches the current extension logic in [extension/background.js](../extension/background.js) and [extension/options.js](../extension/options.js).

## 5) Post-setup verification checklist

After running the SQL in Supabase, confirm that:

- the tables exist in the database explorer
- RLS is enabled on the protected tables
- authorized administrator records exist in `employees` with the expected roles
- matching active credentials exist in `user_credentials`
- the administrator dashboard can read and update the global policy through its authenticated backend API
- IT staff can read supported records but not elevate permissions
- employees can access only their own tickets and records
- blocked domains are written to `blocking_policies`
- usage rows are inserted into `usage_events`
- `system_policies` and `device_agent_credentials` have RLS enabled and no anon/authenticated access policies

## 6) Important security note

The project intentionally uses browser-side configuration and custom credential checks stored in `user_credentials`. It validates the email and password hash directly in the app, which keeps the login flow password-based rather than Supabase-Auth-based.

The migration protects the new global policy and agent credentials from direct client access. The API continues to validate users through the existing custom credential table and administrator role records.
