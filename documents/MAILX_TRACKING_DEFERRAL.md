# MailX Open Tracking Deferral

Status: Deferred from the current release on 2026-07-17.

MailX does not register tracked messages, inject tracking pixels, expose a tracking endpoint, or display open-status metrics. The former pixel endpoint was removed because image retrieval is not a verified human open and its select-then-insert/update sequence was not atomic.

Existing `tracked_emails` and `open_events` records are retained in the connected Supabase project. They are not deleted by this deferral and are not available to extension clients. Rows remain associated with their original user and are deleted if that user is deleted through the existing foreign-key cascade.

No new tracking data is collected. Retained legacy data has no active product retention timer; delete it before any future reimplementation unless a reviewed privacy policy and retention period are approved. A future implementation must use signed identifiers, an atomic database operation, proxy-aware semantics, abuse controls, and end-to-end compose/status UI before it can be released.
