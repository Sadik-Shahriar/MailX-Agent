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
