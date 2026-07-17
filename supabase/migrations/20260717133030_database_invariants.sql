-- MailX database invariants and query indexes.
-- Preflight on 2026-07-17 confirmed no duplicate reminder or task identities.

alter table public.preferences
  drop constraint if exists preferences_user_id_fkey,
  add constraint preferences_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.tasks
  add column if not exists dedupe_key text generated always as (
    lower(coalesce(email_id, '') || ':' || regexp_replace(btrim(description), '\s+', ' ', 'g'))
  ) stored;

alter table public.tasks
  alter column dedupe_key set not null;

alter table public.reminders
  add constraint reminders_user_type_source_key unique (user_id, type, source_id);

alter table public.tasks
  add constraint tasks_user_dedupe_key unique (user_id, dedupe_key);

create index if not exists idx_tasks_user_status_created
  on public.tasks (user_id, status, created_at desc);
create index if not exists idx_reminders_user_active_created
  on public.reminders (user_id, resolved, dismissed, created_at desc);
create index if not exists idx_sender_scores_user_score
  on public.sender_scores (user_id, score);

drop policy if exists "Users own their preferences" on public.preferences;
drop policy if exists "Users own their sender scores" on public.sender_scores;
drop policy if exists "Users own their tasks" on public.tasks;
drop policy if exists "Users own their reminders" on public.reminders;
drop policy if exists "Users own their activity" on public.email_activity;
drop policy if exists "Users own their tracked emails" on public.tracked_emails;
drop policy if exists "Users read their tracked open events" on public.open_events;

create policy "Users own their preferences" on public.preferences for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users own their sender scores" on public.sender_scores for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users own their tasks" on public.tasks for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users own their reminders" on public.reminders for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users own their activity" on public.email_activity for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users own their tracked emails" on public.tracked_emails for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users read their tracked open events" on public.open_events for select to authenticated
  using (exists (select 1 from public.tracked_emails t where t.tid = open_events.tid and t.user_id = (select auth.uid())));
