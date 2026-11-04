alter table public.settings
  add column changelog_retention_days integer not null default 365
    check (changelog_retention_days between 0 and 36500),
  add column changelog_auto_cleanup_enabled boolean not null default true;
