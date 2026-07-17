# MailX - AI Email Assistant

## Project Context

MailX is a Chrome extension that enhances Gmail with AI features. Built for CSE412 Software Engineering, Section 5, Summer 2026, East West University.

**Team:** Raquib Uddin Sarkar, Md. Sadik Shahriar, Chayan Das, Shahriar Mahabub Oishik

## Tech Stack

- **Extension:** Vite + React 18 + TypeScript + @crxjs/vite-plugin
- **Backend:** FastAPI (Python) - thin proxy to LLM API
- **LLM:** OpenCode Zen API (free, deepseek-v4-flash-free) or DeepSeek API (paid)
- **Auth:** Supabase Auth (Google OAuth)
- **DB:** Supabase PostgreSQL
- **Client cache:** chrome.storage.session

## Project Structure

```
mailx/
├── backend/
│   ├── main.py              # FastAPI /chat endpoint → LLM
│   ├── requirements.txt
│   ├── .env                 # API keys (gitignored)
│   └── .env.example         # Template for .env
├── extension/
│   ├── manifest.json
│   ├── vite.config.ts
│   ├── package.json
│   └── src/
│       ├── background/      # Service Worker
│       ├── content/         # Gmail DOM injection
│       ├── popup/           # React SPA
│       └── shared/          # Types, cache, telemetry
├── supabase/
│   └── schema.sql
├── documents/
│   ├── MailX_Revised_Architecture_Plan.md
│   └── Old Architecture/    # Historical proposals, not release docs
├── SETUP.md
├── AGENTS.md
└── .gitignore
```

## MVP Features (7 FRs)

| FR | Feature | Status |
|----|---------|--------|
| FR1 | AI Email Summarization | Working |
| FR2 | Smart Reply Suggestions | Working |
| FR4 | Priority Detection | Working on explicit action only |
| FR5 | Task & Deadline Extraction | Working |
| FR6 | Follow-Up Reminder System | Requires Google OAuth/Gmail API configuration |
| FR9 | AI Email Draft Generation | Working |
| FR10 | Mail Statistics Analysis | Requires Google OAuth/Gmail API configuration |

## Setup for New Team Members

### Prerequisites
- Node.js 22-24 with npm 10+
- Python 3.13
- Chrome browser
- OpenCode CLI (for AI assistance)

### 1. Clone & Install
```bash
git clone <repo-url>
cd mailx

# Backend
cd backend
pip install -r requirements.txt
cp .env.example .env   # Then edit .env with your API key

# Extension
cd ../extension
npm ci
```

### 2. Get an API Key
Get a **free** Zen API key: https://opencode.ai/zen
Put it in `backend/.env`:
```
ZEN_API_KEY=sk-your-key-here
```

### 3. Supabase MCP Setup (for OpenCode CLI)
Each teammate needs to install the Supabase MCP plugin and configure their own access:
```bash
npx skills add supabase/agent-skills
```
Then configure `~/.config/opencode/opencode.json` or project-level `.opencode/opencode.json` with your Supabase access token (not the anon key — use `supabase login` to generate one).

### 4. Run the Servers

Use two terminals. The backend always uses port `8001`. The CRXJS/Vite development server is pinned by `extension/vite.config.ts` to port `5174`; do not use port `5173` and do not start a second Vite process.

```bash
# Terminal 1: Backend
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8001

# Terminal 2: Extension dev server
cd extension
npm run dev
```

Verify both services before debugging the extension:

```powershell
Invoke-WebRequest http://127.0.0.1:8001/health -UseBasicParsing
Invoke-WebRequest http://127.0.0.1:5174/src/popup/index.html -UseBasicParsing
```

Both requests must return HTTP `200`. The backend health response should contain `{"status":"ok"}`. The Vite root URL may return `404`; use the popup URL above instead.

If `logs.txt` reports `Cannot connect to http://localhost:5174`, Vite is not running on the port expected by the CRXJS loader. Stop stale Vite processes, start one `npm run dev` process from `extension`, verify the popup URL, and reload the unpacked extension in `chrome://extensions`. Do not fix this by changing the port in only one place.

### 5. Load Extension in Chrome
1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select `extension/dist/`
4. After restarting Vite or changing the generated loader, click the extension reload icon.
5. Open Gmail and refresh the page.
6. Sign in with Google. Dev Login is available only in development builds.

## Commands

- `cd extension && npm run dev` — Start the extension dev server on `127.0.0.1:5174` and update `dist/`
- `cd extension && npm run build` — Production build
- `cd backend && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8001` — Start backend on port 8001
- `pip install -r backend/requirements.txt` — Install Python deps

## Deferred

FR3 (Open Tracking) is deferred. Spam Check and Link Safety are advisory explicit actions, not automatic Gmail analysis.

## Supabase Project

Connected via MCP. Active tables: preferences, tasks, and reminders. All have RLS.
Project ref: `akespqwzlrsajibjheqg`
