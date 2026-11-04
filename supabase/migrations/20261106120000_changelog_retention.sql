begin;

alter table public.settings
  add column if not exists changelog_retention_days integer not null default 365,
  add column if not exists changelog_auto_cleanup_enabled boolean not null default true;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'settings_changelog_retention_days_check'
      and conrelid = 'public.settings'::regclass
  ) then
    alter table public.settings
      add constraint settings_changelog_retention_days_check
      check (changelog_retention_days between 0 and 36500);
  end if;
end;
$$;

commit;
