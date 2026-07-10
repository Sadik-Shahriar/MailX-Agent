-- MailX Database Schema
-- Run this in Supabase SQL Editor

-- 1. User Preferences
create table if not exists public.preferences (
  user_id uuid references auth.users primary key,
  reply_tone text not null default 'professional'
    check (reply_tone in ('formal', 'casual', 'professional')),
  reminder_delay_days int not null default 3,
  reminder_notify_before bool not null default true,
  reminder_notify_due bool not null default true,
  reminder_notify_overdue bool not null default false,
  updated_at timestamptz not null default now()
);

-- 2. Sender Scores (FR4 behavioral learning)
create table if not exists public.sender_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  sender_email text not null,
  sender_name text,
  score int not null default 50
    check (score >= 0 and score <= 100),
  reply_count int not null default 0,
  median_response_minutes int,
  last_interaction_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, sender_email)
);

-- 3. Tasks (FR5)
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
  completed_at timestamptz
);

-- 4. Follow-Up Reminders (FR6)
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
  created_at timestamptz not null default now()
);

-- 5. Email Activity Log (FR10)
create table if not exists public.email_activity (
  id bigint primary key generated always as identity,
  user_id uuid not null references auth.users on delete cascade,
  date date not null,
  emails_sent int not null default 0,
  emails_received int not null default 0,
  replies_sent int not null default 0,
  unique (user_id, date)
);

-- Row Level Security
alter table public.preferences enable row level security;
alter table public.sender_scores enable row level security;
alter table public.tasks enable row level security;
alter table public.reminders enable row level security;
alter table public.email_activity enable row level security;

-- RLS Policies
create policy "Users own their preferences"
  on public.preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users own their sender scores"
  on public.sender_scores for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users own their tasks"
  on public.tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users own their reminders"
  on public.reminders for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users own their activity"
  on public.email_activity for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Indexes for performance
create index if not exists idx_sender_scores_user on public.sender_scores(user_id);
create index if not exists idx_tasks_user_status on public.tasks(user_id, status);
create index if not exists idx_reminders_user on public.reminders(user_id);
create index if not exists idx_email_activity_user_date on public.email_activity(user_id, date);
