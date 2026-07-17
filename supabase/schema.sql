-- MailX Database Schema
-- Run this in Supabase SQL Editor

-- 1. User Preferences
create table if not exists public.preferences (
  user_id uuid references auth.users on delete cascade primary key,
  reply_tone text not null default 'professional'
    check (reply_tone in ('formal', 'casual', 'professional')),
  reminder_delay_days int not null default 3,
  reminder_notify_before bool not null default true,
  reminder_notify_due bool not null default true,
  reminder_notify_overdue bool not null default false,
  updated_at timestamptz not null default now()
);

-- Safe to run on an existing project created by an earlier MailX version.
alter table public.preferences
  add column if not exists spam_whitelist text[] not null default '{}',
  add column if not exists spam_blacklist text[] not null default '{}',
  add column if not exists phishing_sensitivity text not null default 'default'
    check (phishing_sensitivity in ('low', 'default', 'high')),
  add column if not exists phishing_allowlist text[] not null default '{}';

-- 2. Tasks (FR5)
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  email_id text,
  email_subject text,
  email_sender text,
  description text not null,
  assignee text not null default 'me',
  due_date date,
  priority text not null default 'medium'
    check (priority in ('high', 'medium', 'low')),
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'dismissed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  dedupe_key text generated always as (
    lower(coalesce(email_id, '') || ':' || regexp_replace(btrim(description), '\s+', ' ', 'g'))
  ) stored not null,
  unique (user_id, dedupe_key)
);

-- 3. Follow-Up Reminders (FR6)
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  type text not null
    check (type in ('sent_no_reply', 'task_due_soon', 'task_overdue')),
  source_id text not null,
  subject text not null,
  recipient_name text,
  sent_date timestamptz,
  dismissed bool not null default false,
  resolved bool not null default false,
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, type, source_id)
);

-- Row Level Security
alter table public.preferences enable row level security;
alter table public.tasks enable row level security;
alter table public.reminders enable row level security;

-- RLS Policies
drop policy if exists "Users own their preferences" on public.preferences;
drop policy if exists "Users own their tasks" on public.tasks;
drop policy if exists "Users own their reminders" on public.reminders;

create policy "Users own their preferences"
  on public.preferences for all
  to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users own their tasks"
  on public.tasks for all
  to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users own their reminders"
  on public.reminders for all
  to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Indexes for performance
create index if not exists idx_tasks_user_status on public.tasks(user_id, status);
create index if not exists idx_tasks_user_status_created on public.tasks(user_id, status, created_at desc);
create index if not exists idx_reminders_user on public.reminders(user_id);
create index if not exists idx_reminders_user_active_created on public.reminders(user_id, resolved, dismissed, created_at desc);

-- Aggregate task statistics without returning task rows to the popup.
create or replace function public.get_task_stats(since timestamptz)
returns table (completed_tasks bigint, pending_tasks bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select
    count(*) filter (where status = 'completed') as completed_tasks,
    count(*) filter (where status = 'pending') as pending_tasks
  from public.tasks
  where user_id = (select auth.uid())
    and created_at >= since;
$$;

revoke execute on function public.get_task_stats(timestamptz) from public, anon;
grant execute on function public.get_task_stats(timestamptz) to authenticated;
