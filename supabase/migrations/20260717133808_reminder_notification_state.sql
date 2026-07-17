alter table public.reminders
  add column if not exists notified_at timestamptz;
