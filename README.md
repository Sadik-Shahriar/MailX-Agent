# MailX

MailX is a Gmail Chrome extension with AI summaries, reply suggestions, drafting, priority classification, task extraction, follow-up reminders, and mail statistics.

## Local setup

1. In `backend`, copy `.env.example` to `.env` and add a Zen or DeepSeek API key.
2. Install backend dependencies with `pip install -r backend/requirements.txt`.
3. Install extension dependencies with `npm --prefix extension install`.
4. Apply `supabase/schema.sql` in the Supabase SQL Editor.
5. Run `uvicorn main:app --reload --host 0.0.0.0 --port 8001` from `backend`.
6. Run `npm run dev` from `extension`, then load `extension/dist` from `chrome://extensions` with Developer Mode enabled.

Configure Supabase Google OAuth with the Gmail `readonly` and `send` scopes before using Gmail-backed features.
