begin;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.settings (
  id text primary key default gen_random_uuid()::text,
  admin_email text,
  retention_date date,
  accent_color text,
  ticket_retention_days integer,
  disposal_retention_days integer,
  features jsonb not null default '{}'::jsonb,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employees (
  id text primary key default gen_random_uuid()::text,
  employee_id text,
  name text not null default '',
  surname text not null default '',
  email text not null unique,
  department text not null default '',
  role text not null default 'Employee',
  account_role text not null default 'Employee',
  auth_user_id uuid,
  is_active boolean not null default true,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_credentials (
  email text primary key,
  employee_id text,
  password_hash text not null,
  role text not null default 'Employee',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employee_permissions (
  employee_id text primary key,
  can_access_admin boolean not null default false,
  permission_granted_by text,
  permission_granted_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_access_assignments (
  id text primary key default gen_random_uuid()::text,
  employee_id text not null,
  assigned_by text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id)
);

create table if not exists public.devices (
  id text primary key default gen_random_uuid()::text,
  employee_id text,
  employee_name text,
  email text,
  user_name text,
  laptop_name text,
  laptop_id text,
  mac_address text,
  purchased_at date,
  last_sync timestamptz,
  policy_version text,
  is_registered boolean not null default false,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.replacements (
  id text primary key default gen_random_uuid()::text,
  old_laptop_id text,
  new_laptop_id text,
  employee_id text,
  replaced_at timestamptz,
  reason text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.policies (
  id text primary key default gen_random_uuid()::text,
  name text,
  domain text,
  url text,
  category text,
  is_enabled boolean not null default true,
  user_ids jsonb not null default '[]'::jsonb,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.blocking_policies (
  id text primary key default gen_random_uuid()::text,
  device_id text,
  version integer not null default 1,
  name text,
  enabled boolean not null default true,
  domains jsonb not null default '[]'::jsonb,
  schedule jsonb not null default '{}'::jsonb,
  category text,
  is_enabled boolean not null default true,
  user_ids jsonb not null default '[]'::jsonb,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.schedules (
  id text primary key default gen_random_uuid()::text,
  name text,
  policy_id text,
  employee_id text,
  user_ids jsonb not null default '[]'::jsonb,
  days jsonb not null default '[]'::jsonb,
  start_time time,
  end_time time,
  starts_at timestamptz,
  ends_at timestamptz,
  is_enabled boolean not null default true,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.usage (
  id text primary key default gen_random_uuid()::text,
  employee_id text,
  device_id text,
  user_name text,
  mb_used numeric(14, 3) not null default 0,
  online_hours numeric(10, 3) not null default 0,
  recorded_at timestamptz not null default now(),
  data jsonb not null default '{}'::jsonb
);

create table if not exists public.usage_events (
  id text primary key default gen_random_uuid()::text,
  employee_id text,
  device_id text,
  domain text,
  timestamp timestamptz,
  event_type text,
  duration_seconds integer,
  blocked boolean not null default false,
  policy_id text,
  recorded_at timestamptz not null default now(),
  data jsonb not null default '{}'::jsonb
);

create table if not exists public.analytics_snapshot (
  id text primary key default gen_random_uuid()::text,
  daily jsonb not null default '[]'::jsonb,
  categories jsonb not null default '[]'::jsonb,
  weekly_usage jsonb not null default '[]'::jsonb,
  asset_status jsonb not null default '[]'::jsonb,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id text primary key default gen_random_uuid()::text,
  title text,
  message text,
  type text,
  is_read boolean not null default false,
  employee_id text,
  created_at timestamptz not null default now(),
  data jsonb not null default '{}'::jsonb
);

create table if not exists public.ticket_settings (
  id text primary key default gen_random_uuid()::text,
  enabled boolean not null default true,
  default_status text,
  default_priority text,
  ticket_id_format text,
  default_assignment text,
  support_instructions text,
  message_retention_days integer,
  history_retention_days integer,
  resolved_ticket_retention_days integer,
  keep_messages_indefinitely boolean not null default false,
  auto_cleanup_enabled boolean not null default true,
  last_cleanup_date timestamptz,
  next_scheduled_cleanup timestamptz,
  last_cleanup_execution_key text,
  cleanup_history jsonb not null default '[]'::jsonb,
  categories jsonb not null default '[]'::jsonb,
  priorities jsonb not null default '[]'::jsonb,
  statuses jsonb not null default '[]'::jsonb,
  notifications jsonb not null default '{}'::jsonb,
  workflow jsonb not null default '{}'::jsonb,
  security jsonb not null default '{}'::jsonb,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.ticket_category_settings (
  id integer primary key,
  categories jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.tickets (
  id text primary key default gen_random_uuid()::text,
  ticket_number text,
  title text,
  description text,
  category text,
  priority text,
  status text,
  employee_id text,
  employee_email text,
  assigned_to text,
  laptop_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  messages jsonb not null default '[]'::jsonb,
  history jsonb not null default '[]'::jsonb,
  data jsonb not null default '{}'::jsonb
);

create table if not exists public.changelog (
  id text primary key,
  version text,
  date date,
  title text,
  changes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  data jsonb not null default '{}'::jsonb
);

create table if not exists public.incognito_control (
  id integer primary key,
  enabled boolean not null default false
);

alter table public.settings
  add column if not exists admin_email text,
  add column if not exists retention_date date,
  add column if not exists accent_color text,
  add column if not exists ticket_retention_days integer,
  add column if not exists disposal_retention_days integer,
  add column if not exists features jsonb not null default '{}'::jsonb;
alter table public.employees
  add column if not exists employee_id text,
  add column if not exists name text not null default '',
  add column if not exists surname text not null default '',
  add column if not exists email text,
  add column if not exists department text not null default '',
  add column if not exists role text not null default 'Employee',
  add column if not exists account_role text not null default 'Employee',
  add column if not exists auth_user_id uuid,
  add column if not exists is_active boolean not null default true;
alter table public.user_credentials
  add column if not exists email text,
  add column if not exists employee_id text,
  add column if not exists password_hash text,
  add column if not exists role text not null default 'Employee',
  add column if not exists is_active boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();
alter table public.employee_permissions
  add column if not exists employee_id text,
  add column if not exists can_access_admin boolean not null default false,
  add column if not exists permission_granted_by text,
  add column if not exists permission_granted_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();
alter table public.devices
  add column if not exists employee_id text,
  add column if not exists employee_name text,
  add column if not exists email text,
  add column if not exists user_name text,
  add column if not exists laptop_name text,
  add column if not exists laptop_id text,
  add column if not exists mac_address text,
  add column if not exists purchased_at date,
  add column if not exists last_sync timestamptz,
  add column if not exists policy_version text,
  add column if not exists is_registered boolean not null default false;
alter table public.replacements
  add column if not exists old_laptop_id text,
  add column if not exists new_laptop_id text,
  add column if not exists employee_id text,
  add column if not exists replaced_at timestamptz,
  add column if not exists reason text;
alter table public.policies
  add column if not exists name text,
  add column if not exists domain text,
  add column if not exists url text,
  add column if not exists category text,
  add column if not exists is_enabled boolean not null default true,
  add column if not exists user_ids jsonb not null default '[]'::jsonb;
alter table public.blocking_policies
  add column if not exists device_id text,
  add column if not exists version integer not null default 1,
  add column if not exists name text,
  add column if not exists enabled boolean not null default true,
  add column if not exists domains jsonb not null default '[]'::jsonb,
  add column if not exists schedule jsonb not null default '{}'::jsonb,
  add column if not exists category text,
  add column if not exists is_enabled boolean not null default true,
  add column if not exists user_ids jsonb not null default '[]'::jsonb;
alter table public.schedules
  add column if not exists name text,
  add column if not exists policy_id text,
  add column if not exists employee_id text,
  add column if not exists user_ids jsonb not null default '[]'::jsonb,
  add column if not exists days jsonb not null default '[]'::jsonb,
  add column if not exists start_time time,
  add column if not exists end_time time,
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz,
  add column if not exists is_enabled boolean not null default true;
alter table public.usage
  add column if not exists employee_id text,
  add column if not exists device_id text,
  add column if not exists user_name text,
  add column if not exists mb_used numeric(14, 3) not null default 0,
  add column if not exists online_hours numeric(10, 3) not null default 0,
  add column if not exists recorded_at timestamptz not null default now();
alter table public.usage_events
  add column if not exists employee_id text,
  add column if not exists device_id text,
  add column if not exists domain text,
  add column if not exists timestamp timestamptz,
  add column if not exists event_type text,
  add column if not exists duration_seconds integer,
  add column if not exists blocked boolean not null default false,
  add column if not exists policy_id text,
  add column if not exists recorded_at timestamptz not null default now();
alter table public.analytics_snapshot
  add column if not exists daily jsonb not null default '[]'::jsonb,
  add column if not exists categories jsonb not null default '[]'::jsonb,
  add column if not exists weekly_usage jsonb not null default '[]'::jsonb,
  add column if not exists asset_status jsonb not null default '[]'::jsonb;
alter table public.notifications
  add column if not exists title text,
  add column if not exists message text,
  add column if not exists type text,
  add column if not exists is_read boolean not null default false,
  add column if not exists employee_id text;
alter table public.ticket_settings
  add column if not exists enabled boolean not null default true,
  add column if not exists default_status text,
  add column if not exists default_priority text,
  add column if not exists ticket_id_format text,
  add column if not exists default_assignment text,
  add column if not exists support_instructions text,
  add column if not exists message_retention_days integer,
  add column if not exists history_retention_days integer,
  add column if not exists resolved_ticket_retention_days integer,
  add column if not exists keep_messages_indefinitely boolean not null default false,
  add column if not exists auto_cleanup_enabled boolean not null default true,
  add column if not exists last_cleanup_date timestamptz,
  add column if not exists next_scheduled_cleanup timestamptz,
  add column if not exists last_cleanup_execution_key text,
  add column if not exists cleanup_history jsonb not null default '[]'::jsonb,
  add column if not exists categories jsonb not null default '[]'::jsonb,
  add column if not exists priorities jsonb not null default '[]'::jsonb,
  add column if not exists statuses jsonb not null default '[]'::jsonb,
  add column if not exists notifications jsonb not null default '{}'::jsonb,
  add column if not exists workflow jsonb not null default '{}'::jsonb,
  add column if not exists security jsonb not null default '{}'::jsonb;
alter table public.ticket_category_settings
  add column if not exists categories jsonb not null default '[]'::jsonb;
alter table public.tickets
  add column if not exists ticket_number text,
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists category text,
  add column if not exists priority text,
  add column if not exists status text,
  add column if not exists employee_id text,
  add column if not exists employee_email text,
  add column if not exists assigned_to text,
  add column if not exists laptop_id text,
  add column if not exists resolved_at timestamptz,
  add column if not exists messages jsonb not null default '[]'::jsonb,
  add column if not exists history jsonb not null default '[]'::jsonb;
alter table public.changelog
  add column if not exists version text,
  add column if not exists date date,
  add column if not exists title text,
  add column if not exists changes jsonb not null default '[]'::jsonb;
alter table public.incognito_control
  add column if not exists enabled boolean not null default false;

create unique index if not exists employees_email_unique_idx on public.employees (email);
create unique index if not exists user_credentials_email_unique_idx on public.user_credentials (email);
create unique index if not exists employee_permissions_employee_id_unique_idx on public.employee_permissions (employee_id);
create unique index if not exists devices_registered_laptop_id_unique_idx
  on public.devices (laptop_id)
  where is_registered = true and nullif(btrim(laptop_id), '') is not null;

create or replace function public.save_employee_account(
  p_email text,
  p_previous_email text,
  p_employee_id text,
  p_name text,
  p_surname text,
  p_department text,
  p_role text,
  p_account_role text,
  p_password_hash text,
  p_is_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  employee public.employees%rowtype;
  credential_email text;
begin
  if p_previous_email is null then
    insert into public.employees (
      email, employee_id, name, surname, department, role, account_role, is_active
    )
    values (
      p_email, p_employee_id, coalesce(p_name, ''), coalesce(p_surname, ''),
      coalesce(p_department, ''), p_role, p_account_role, p_is_active
    )
    returning * into employee;
  else
    select *
    into employee
    from public.employees
    where email = p_previous_email
    limit 1
    for update;

    if employee.id is null then
      raise exception 'Employee profile not found' using errcode = 'P0002';
    end if;

    update public.employees
    set email = p_email,
        employee_id = coalesce(p_employee_id, employee_id),
        name = coalesce(p_name, name),
        surname = coalesce(p_surname, surname),
        department = coalesce(p_department, department),
        role = p_role,
        account_role = p_account_role,
        is_active = p_is_active,
        updated_at = now()
    where id = employee.id
    returning * into employee;
  end if;

  select email
  into credential_email
  from public.user_credentials
  where email = coalesce(p_previous_email, p_email)
  limit 1
  for update;

  if credential_email is not null then
    update public.user_credentials
    set email = p_email,
        employee_id = employee.id,
        password_hash = coalesce(p_password_hash, password_hash),
        role = p_account_role,
        is_active = p_is_active,
        updated_at = now()
    where email = credential_email;
  elsif p_password_hash is not null then
    insert into public.user_credentials (email, employee_id, password_hash, role, is_active)
    values (p_email, employee.id, p_password_hash, p_account_role, p_is_active);
  end if;

  return jsonb_build_object(
    'id', employee.id,
    'employee_id', employee.employee_id,
    'name', employee.name,
    'surname', employee.surname,
    'email', employee.email,
    'department', employee.department,
    'role', employee.role,
    'account_role', employee.account_role,
    'is_active', employee.is_active
  );
end;
$$;

revoke all on function public.save_employee_account(text, text, text, text, text, text, text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.save_employee_account(text, text, text, text, text, text, text, text, text, boolean) to service_role;

create or replace function public.update_administrator_account(
  p_current_email text,
  p_new_email text,
  p_password_hash text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  employee_rows integer;
  credential_rows integer;
begin
  update public.employees
  set email = p_new_email,
      updated_at = now()
  where email = p_current_email
    and (lower(coalesce(account_role, '')) in ('administrator', 'admin')
      or lower(coalesce(role, '')) in ('administrator', 'admin'))
    and is_active = true;
  get diagnostics employee_rows = row_count;

  if employee_rows <> 1 then
    raise exception 'Active administrator profile was not found';
  end if;

  update public.user_credentials
  set email = p_new_email,
      password_hash = p_password_hash,
      updated_at = now()
  where email = p_current_email
    and is_active = true;
  get diagnostics credential_rows = row_count;

  if credential_rows <> 1 then
    raise exception 'Active administrator credential was not found';
  end if;
end;
$$;

revoke all on function public.update_administrator_account(text, text, text) from public, anon, authenticated;
grant execute on function public.update_administrator_account(text, text, text) to service_role;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'settings',
    'employees',
    'devices',
    'replacements',
    'policies',
    'blocking_policies',
    'schedules',
    'usage',
    'usage_events',
    'analytics_snapshot',
    'notifications',
    'ticket_settings',
    'tickets',
    'changelog'
  ]
  loop
    execute format(
      'alter table public.%I add column if not exists data jsonb not null default ''{}''::jsonb',
      table_name
    );
  end loop;

  foreach table_name in array array[
    'settings',
    'employees',
    'admin_access_assignments',
    'devices',
    'policies',
    'blocking_policies',
    'schedules',
    'analytics_snapshot',
    'ticket_settings',
    'tickets'
  ]
  loop
    execute format(
      'alter table public.%I add column if not exists updated_at timestamptz not null default now()',
      table_name
    );
  end loop;
end;
$$;

create index if not exists devices_employee_id_idx on public.devices (employee_id);
create index if not exists devices_registered_idx on public.devices (is_registered);
create index if not exists policies_enabled_idx on public.policies (is_enabled);
create index if not exists schedules_enabled_idx on public.schedules (is_enabled);
create index if not exists usage_employee_recorded_idx on public.usage (employee_id, recorded_at desc);
create index if not exists usage_events_device_recorded_idx on public.usage_events (device_id, recorded_at desc);
create index if not exists tickets_employee_created_idx on public.tickets (employee_id, created_at desc);
create index if not exists tickets_status_idx on public.tickets (status);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'settings',
    'employees',
    'user_credentials',
    'employee_permissions',
    'admin_access_assignments',
    'devices',
    'replacements',
    'policies',
    'blocking_policies',
    'schedules',
    'usage',
    'usage_events',
    'analytics_snapshot',
    'notifications',
    'ticket_settings',
    'ticket_category_settings',
    'tickets',
    'changelog',
    'incognito_control'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from public, anon, authenticated', table_name);
    execute format('grant select, insert, update, delete on public.%I to service_role', table_name);
  end loop;
end;
$$;

grant select on public.ticket_category_settings to anon, authenticated;
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'ticket_category_settings'
      and policyname = 'ticket_category_settings_public_read'
  ) then
    create policy ticket_category_settings_public_read
      on public.ticket_category_settings
      for select
      to anon, authenticated
      using (true);
  end if;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'settings',
    'employees',
    'admin_access_assignments',
    'devices',
    'policies',
    'blocking_policies',
    'schedules',
    'analytics_snapshot',
    'ticket_settings',
    'tickets'
  ]
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', table_name);
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name
    );
  end loop;
end;
$$;

commit;
