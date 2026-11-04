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

The repository includes idempotent schema scripts, but no live Supabase project is configured in this workspace.

## 2) Create a new Supabase project

1. Open your Supabase project.
2. In the SQL editor, run the contents of [supabase/schema.sql](../supabase/schema.sql).
3. Run [supabase/employee-role-migration.sql](../supabase/employee-role-migration.sql) to normalize existing employee names and role categories. Run it after the schema on both new and existing projects.
4. Run the contents of [supabase/rls.sql](../supabase/rls.sql).
5. Run [supabase/admin-seed.sql](../supabase/admin-seed.sql) to insert or update the default administrator in `employees`, `user_credentials`, and `admin_access_assignments`. This SQL script has not been applied to any live project from this workspace.
6. Confirm each employee has the expected email and role, and that the matching password hash exists in `user_credentials`.

The employee form stores the full name in `employees.name` and leaves the legacy `surname` column blank. The visible role `Admin` is stored as the canonical `Administrator` value in `account_role` so existing authorization policies remain compatible; the employee `role` column is constrained to `Admin`, `Employee`, or `IT Staff`.

The admin Incognito blocker setting is published through the read-only `incognito_control` table. The dashboard's secure sync backend must be configured and protected for admin changes to reach extensions. The extension also needs the browser's **Allow in Incognito** permission; without it, Chrome/Edge will not let the extension close Incognito tabs.

The default login provisioned by that script is `admin@sys13.com` with password `admin123`; change it immediately after setup. This project uses its custom `user_credentials` table, so the script does not create an account in Supabase `auth.users`.

## Database-backed issue categories

Ticket Settings saves category names and active states to `ticket_settings` and mirrors only that category list to the `ticket_category_settings` singleton. The extension reads this limited table using its anon key; RLS allows public reads of the category snapshot, while writes remain restricted to the service-role backend. To allow extension requests, save the Supabase URL in extension settings and approve the host-access prompt.

The schema also includes `changelog` for update-log entries and fields for the ticket settings used by the dashboard. Singleton records use stable IDs so repeated saves update existing rows instead of creating duplicates.

## Database coverage notes

- Dashboard settings and feature flags use `settings`; role records use `employees`, `user_credentials`, and `employee_permissions`; devices, replacements, blocking policies, schedules, usage, analytics, notifications, ticket settings, tickets, and update logs have corresponding tables.
- Extension-created issue reports are currently kept in extension-local storage and opened in the configured mail client. Although the `tickets` table exists, those popup reports are not yet inserted into it or shared across devices.
- The default admin must be created by running `admin-seed.sql` in the Supabase SQL editor. No live database credentials are available in this workspace, so the seed has not been run remotely.

## 3) Add the required environment variables

Create a local `.env` file (or use your deployment environment) and set:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your_publishable_key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
SUPABASE_SERVICE_ROLE_KEY=server_only_service_role_key
```

Keep `SUPABASE_SERVICE_ROLE_KEY` in the backend process environment only; never put it in browser code or extension storage. Start the API with `npm run start:backend` and configure the dashboard's `apiBaseUrl` to reach `/api/supabase-sync` (or proxy that path to the API). The category snapshot is written through this service-role backend.

The sync API uses the service-role key and must be placed behind an authenticated reverse proxy or private network before public deployment. The dashboard's custom browser login is not API authentication.

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
- the default admin record exists in `employees` with the expected email and role
- the matching password hash is present in `user_credentials`
- a root admin can read all tables
- IT staff can read supported records but not elevate permissions
- employees can access only their own tickets and records
- blocked domains are written to `blocking_policies`
- usage rows are inserted into `usage_events`

## 6) Important security note

The project intentionally uses browser-side configuration and custom credential checks stored in `user_credentials`. It validates the email and password hash directly in the app, which keeps the login flow password-based rather than Supabase-Auth-based.

The SQL above creates a secure baseline for the database, while the app itself continues to authenticate users through the custom credential table and role checks.
