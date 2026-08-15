# MailX Project Status

Last updated: July 14, 2026

## Completed Implementation

### AI Email Features

| Requirement | Status | Implemented behavior |
|---|---|---|
| FR1: Email Summarization | Implemented | Generates concise bullet-point summaries from the newest visible Gmail message. |
| FR2: Smart Reply | Implemented | Produces three separate replies, each with Copy and Insert controls. Insert opens Gmail Reply when available and asks before replacing existing text. |
| FR4: Priority Detection | Implemented | Classifies visible inbox rows as High, Medium, or Low using a paced queue and confidence threshold. |
| FR5: Task and Deadline Extraction | Implemented | Extracts task JSON, parses due dates and priorities, persists tasks for signed-in users, and renders task checkboxes. |
| FR6: Follow-Up Reminders | Implemented | Checks task deadlines and sent threads without replies, updates the extension badge, creates notifications, and exposes reminders in the popup. |
| FR9: Draft Generation | Implemented | Uses an inline MailX prompt field, shows a formatted draft, copies formatted content, and inserts the JSON subject/body fields into Gmail. |
| FR10: Mail Statistics | Implemented | Displays sent/received counts, task status counts, and important-sender count for 7, 30, and 90 day periods. |

### Extension Experience

- MailX panel is visible throughout Gmail.
- Draft is available everywhere in Gmail.
- Email-specific actions appear only when an email is open.
- The panel supports drag, minimize/expand animation, idle minimization after 45 seconds, and saved minimized state.
- AI results render inside the expanded MailX panel.
- Backend calls are authenticated, rate-limited, and use session caching where response reuse is safe.

### Backend and Data Layer

- FastAPI `POST /chat` supports summary, reply, priority, tasks, and draft intents.
- Zen defaults to `mimo-v2.5-free` for faster short-form responses; `ZEN_MODEL` can override it.
- Gmail API wrapper supports message context, message counts, and sent-thread checks.
- Supabase operations exist for preferences, tasks, reminders, and sender scores.
- Chrome alarms and notifications support follow-up reminders.

## Verification Completed

The following checks have passed locally:

- `npm run build` in `extension`
- `python -m py_compile main.py` in `backend`
- Backend health endpoint at `http://localhost:8001/health`
- Synthetic API checks for summarization, Smart Reply, priority classification, task extraction, and draft generation

## Required Before Full End-to-End Use

### 1. Keep the Backend Running

```powershell
cd backend
uvicorn main:app --host 0.0.0.0 --port 8001
```

### 2. Supabase Database

A Supabase owner/admin must run `supabase/schema.sql` in the SQL Editor. This creates the required tables and row-level security policies.

### 3. Enable Google OAuth in Supabase

This is currently the primary external blocker for real sign-in. A Supabase owner/admin must:

1. Enable Google under **Authentication -> Providers -> Google**.
2. Add the Google OAuth Client ID and Client Secret.
3. Save the provider configuration.
4. Add the Chrome callback URL in **Authentication -> URL Configuration**:

```text
https://YOUR_EXTENSION_ID.chromiumapp.org/
```

### 4. Configure Google Cloud

The Google Cloud OAuth project must:

1. Enable Gmail API.
2. Configure the OAuth consent screen.
3. Add team Gmail accounts as test users while the app is in testing.
4. Register this authorized redirect URI:

```text
https://akespqwzlrsajibjheqg.supabase.co/auth/v1/callback
```

### 5. Browser Validation

After OAuth is working, test these behaviors with a real Gmail account:

- Google sign-in and token refresh.
- Gmail message extraction for multi-message threads.
- Smart Reply copy, reply insertion, and replace-text confirmation.
- Draft subject and body insertion into Gmail Compose.
- Inbox priority badges across a real inbox.
- Supabase task persistence and completion toggles.
- Sent-no-reply reminders, task-due reminders, and Chrome notifications.
- Statistics based on real Gmail and Supabase data.

## Recommended Next Work

1. Add automated tests for prompt parsing, task parsing, priority parsing, and Supabase message handlers.
2. Add browser-based end-to-end tests for Gmail DOM selectors because Gmail can change its markup.
3. Add a Settings control for choosing the LLM model and backend URL without code changes.
4. Add user-facing loading/error states to Stats and Follow-Ups when Google OAuth or Supabase is unavailable.
5. Review and remove generated `extension/.agents/` files from the working tree if they are not intended for version control.

## Deferred Scope

FR3 Open Tracking, FR7 Spam Detection, and FR8 Phishing Detection remain outside the MVP scope.

## Reference

Use [SETUP.md](SETUP.md) for teammate installation and configuration instructions.
