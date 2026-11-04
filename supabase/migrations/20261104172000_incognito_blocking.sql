begin;

create table if not exists public.incognito_control (
  id integer primary key,
  enabled boolean not null default false
);

insert into public.incognito_control (id, enabled)
values (1, false)
on conflict (id) do nothing;

alter table public.incognito_control enable row level security;
revoke all on public.incognito_control from anon;
revoke all on public.incognito_control from authenticated;
revoke all on public.incognito_control from PUBLIC;
grant select, insert, update, delete on public.incognito_control to service_role;

create table if not exists public.system_policies (
  id uuid primary key default gen_random_uuid(),
  policy_name text not null unique,
  is_enabled boolean not null default false,
  updated_by text,
  updated_at timestamptz not null default now()
);

alter table public.system_policies enable row level security;
revoke all on public.system_policies from anon;
revoke all on public.system_policies from authenticated;
revoke all on public.system_policies from PUBLIC;
grant select, insert, update, delete on public.system_policies to service_role;

insert into public.system_policies (policy_name, is_enabled, updated_at)
values (
  'incognito_blocking',
  coalesce((select enabled from public.incognito_control where id = 1), false),
  now()
)
on conflict (policy_name) do nothing;

create table if not exists public.device_agent_credentials (
  device_id text primary key,
  token_hash text not null,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.device_agent_credentials enable row level security;
revoke all on public.device_agent_credentials from anon;
revoke all on public.device_agent_credentials from authenticated;
revoke all on public.device_agent_credentials from PUBLIC;
grant select, insert, update, delete on public.device_agent_credentials to service_role;
