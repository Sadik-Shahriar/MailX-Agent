-- Preserve legacy records while preventing the deferred feature from being read or written by clients.
revoke all on table public.open_events from anon, authenticated;
revoke all on table public.tracked_emails from anon, authenticated;
