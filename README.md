# MailX

MailX is a Gmail Chrome extension with AI summaries, reply suggestions, drafting, priority classification, task extraction, follow-up reminders, and mail statistics.

## Supported runtimes

- Node.js 22-24 with npm 10+
- Python 3.13

## Local setup

1. In `backend`, copy `.env.example` to `.env` and add a Zen or DeepSeek API key.
2. Install backend dependencies with `pip install -r backend/requirements.txt`.
3. Install extension dependencies with `npm --prefix extension ci`.
4. Apply `supabase/schema.sql` in the Supabase SQL Editor.
5. Run `uvicorn main:app --reload --host 0.0.0.0 --port 8001` from `backend`.
6. Run `npm run dev` from `extension`, then load `extension/dist` from `chrome://extensions` with Developer Mode enabled.

Configure Supabase Google OAuth with the Gmail `readonly` scope before using Gmail-backed features. Email-open tracking is deferred and not included in this release.

## Release build

`extension/.env.production` contains the public backend URL compiled into a release. Set it to the deployed HTTPS API origin before packaging. `npm --prefix extension run build` rejects release output containing localhost URLs, Dev Login, or source maps.

Build the backend from its explicit context with `docker build -t mailx-api ./backend`. Render uses the same context through `render.yaml`; configure `ZEN_API_KEY`, `SUPABASE_URL`, and `MAILX_EXTENSION_ORIGINS` in Render rather than committing them.
