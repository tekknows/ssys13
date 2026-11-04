begin;

create table if not exists public.incognito_control (
  id integer primary key,
  enabled boolean not null default false
);

insert into public.incognito_control (id, enabled)
values (1, false)
on conflict (id) do nothing;

alter table public.incognito_control enable row level security;
revoke all on public.incognito_control from public, anon, authenticated;
grant select, insert, update, delete on public.incognito_control to service_role;

create table if not exists public.system_policies (
  id uuid primary key default gen_random_uuid(),
  policy_name text not null unique,
  is_enabled boolean not null default false,
  updated_by text,
  updated_at timestamptz not null default now()
);

alter table public.system_policies enable row level security;
revoke all on public.system_policies from public, anon, authenticated;
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
revoke all on public.device_agent_credentials from public, anon, authenticated;
grant select, insert, update, delete on public.device_agent_credentials to service_role;

create or replace function public.set_incognito_blocking_policy(
  p_is_enabled boolean,
  p_updated_by text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  insert into public.system_policies (policy_name, is_enabled, updated_by, updated_at)
  values ('incognito_blocking', p_is_enabled, p_updated_by, now())
  on conflict (policy_name) do update
    set is_enabled = excluded.is_enabled,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at;

  insert into public.incognito_control (id, enabled)
  values (1, p_is_enabled)
  on conflict (id) do update
    set enabled = excluded.enabled;
end;
$$;

revoke all on function public.set_incognito_blocking_policy(boolean, text) from public, anon, authenticated;
grant execute on function public.set_incognito_blocking_policy(boolean, text) to service_role;

commit;
