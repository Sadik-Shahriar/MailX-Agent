-- Preserve completion history after completed tasks are deleted from the task list.
create table if not exists public.task_completion_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  task_id uuid not null,
  completed_at timestamptz not null default now(),
  unique (user_id, task_id)
);

alter table public.task_completion_history enable row level security;

drop policy if exists "Users own task completion history" on public.task_completion_history;
create policy "Users own task completion history"
  on public.task_completion_history for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create index if not exists idx_task_completion_history_user_date
  on public.task_completion_history (user_id, completed_at desc);

-- Preserve history for tasks that were completed before this migration.
insert into public.task_completion_history (user_id, task_id, completed_at)
select user_id, id, coalesce(completed_at, created_at)
from public.tasks
where status = 'completed'
on conflict (user_id, task_id) do nothing;

create or replace function public.record_task_completion(p_task_id uuid)
returns void
language sql
volatile
security invoker
set search_path = public
as $$
  insert into public.task_completion_history (user_id, task_id, completed_at)
  select (select auth.uid()), t.id, now()
  from public.tasks t
  where t.id = p_task_id
    and t.user_id = (select auth.uid())
  on conflict (user_id, task_id) do nothing;
$$;

revoke execute on function public.record_task_completion(uuid) from public, anon;
grant execute on function public.record_task_completion(uuid) to authenticated;

create or replace function public.get_task_stats(since timestamptz)
returns table (completed_tasks bigint, pending_tasks bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select
    (select count(*)
     from public.task_completion_history h
     where h.user_id = (select auth.uid())
       and h.completed_at >= since) as completed_tasks,
    (select count(*)
     from public.tasks t
     where t.user_id = (select auth.uid())
       and t.status = 'pending'
       and t.created_at >= since) as pending_tasks;
$$;

revoke execute on function public.get_task_stats(timestamptz) from public, anon;
grant execute on function public.get_task_stats(timestamptz) to authenticated;
