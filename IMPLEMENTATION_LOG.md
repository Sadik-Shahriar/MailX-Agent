# MailX Implementation Log

Updated: July 15, 2026

## Completed In This Iteration

### Authentication And Local Setup

- Added the missing `backend/.env.example` template.
- Corrected Supabase Auth to use PKCE, fixing the missing OAuth authorization-code flow.
- Reconciled `AGENTS.md` with the actual backend port and implemented feature status.
- Added `extension/.agents/` to `.gitignore`.

### AI Backend

- Added Zen/DeepSeek response retry handling for empty model output.
- Reduced task payload size and added task-specific retry budget handling.
- Added user-facing handling for upstream LLM rate limits: "The AI service is busy. Please try again shortly."
- Added `spam`, `phishing`, and contextual `chat` intents.
- Added prompt and response handling for structured drafts, including recipient, subject, greeting, body, and sign-off.
- Added validated, bounded chronological chat history.

### Gmail Extension

- Added message-level toolbars for Priority, Spam Check, and Link Safety.
- Added explicit Priority, Spam Check, and Link Safety actions for opened messages.
- Added safe retry behavior for unavailable toolbar verdicts.
- Added three Link Safety states: `NO LINK`, `HARMFUL`, and `SAFE`.
- Added bounded AI request queueing to prevent automatic checks from overwhelming the LLM provider.
- Added current-message Ask MailX chat with prompt chips, bounded in-memory conversations, Markdown bold rendering, reply refinement, and chat draft generation.
- Added Gmail insertion for generated replies and structured drafts, including recipient, subject, and body.
- Added readable task checklists instead of raw task JSON.
- Redesigned the floating panel as a stable single-column workspace with grouped Home actions, responsive body scrolling, Back actions, and no result-width expansion.
- Prevented the panel from auto-minimizing while a chat, draft, result, or error view is active.

### Data And Reminders

- Added spam/phishing preferences to Supabase preferences.
- Added task deduplication.
- Added reminder resolution for completed tasks and replied-to sent threads.
- Added reminder notification preference controls.
- Scoped statistics cache entries to the authenticated user.

### Tests And Verification

- Added backend unit tests for prompt construction, summary cleanup, reply normalization, chat context, and chat history validation.
- Verified `npm run build` in `extension`.
- Verified `python -m unittest -v test_main.py` and `python -m py_compile main.py` in `backend`.
- Verified local `/health` endpoint.
- Ran live local API checks for summary, reply, priority, tasks, draft, spam, phishing, and chat.

## External Or Browser-Only Work Remaining

- Apply the current `supabase/schema.sql` in Supabase SQL Editor.
- Keep Supabase Google OAuth and Google Cloud Gmail API configuration active.
- Validate Gmail DOM selectors, recipient insertion, toolbar placement, and multi-message conversation behavior with a real account.
- Add browser end-to-end tests for Gmail DOM behavior and integration tests for Supabase-backed operations.

## Intentional Scope Notes

- Email-open tracking is deferred from this release. The pixel endpoint, service-role configuration, and new-install schema claims were removed; any legacy tracking rows are retained only for existing owners and are not produced or displayed.
- Spam and Link Safety are advisory classifications. They do not move, delete, or modify Gmail messages.
- Chat history is retained only in the current content-script session and is not persisted to Supabase or the backend.
