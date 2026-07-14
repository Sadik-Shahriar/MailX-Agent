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
│       └── shared/          # Types, helpers, cache
├── supabase/
│   └── schema.sql
├── documents/
│   ├── MailX_Revised_Architecture_Plan.md
│   ├── MailX_All_10_FRs_Design_Document.md
│   └── Team_A_SRS.md
├── AGENTS.md
└── .gitignore
```

## MVP Features (7 FRs)

| FR | Feature | Status |
|----|---------|--------|
| FR1 | AI Email Summarization | ✅ Working |
| FR2 | Smart Reply Suggestions | ✅ Working |
| FR4 | Priority Detection | ✅ Working |
| FR5 | Task & Deadline Extraction | ✅ Working |
| FR6 | Follow-Up Reminder System | ✅ Implemented; requires Google OAuth/Gmail API configuration |
| FR9 | AI Email Draft Generation | ✅ Working |
| FR10 | Mail Statistics Analysis | ✅ Implemented; requires Google OAuth/Gmail API configuration |

## Setup for New Team Members

### Prerequisites
- Node.js 18+
- Python 3.10+
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
npm install
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
```bash
# Terminal 1: Backend
cd backend && uvicorn main:app --reload --host 0.0.0.0 --port 8001

# Terminal 2: Extension dev server
cd extension && npm run dev
```

### 5. Load Extension in Chrome
1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select `extension/dist/`
4. Open Gmail → click MailX icon → **Dev Login**

## Commands

- `cd extension && npm run dev` — Start extension dev server (builds to dist/)
- `cd extension && npm run build` — Production build
- `cd backend && uvicorn main:app --reload --port 8001` — Start backend on port 8001
- `pip install -r backend/requirements.txt` — Install Python deps

## Deferred

FR3 (Open Tracking), FR7 (Spam), FR8 (Phishing) — cut from MVP scope.

## Supabase Project

Connected via MCP. Tables: preferences, sender_scores, tasks, reminders, email_activity. All with RLS.
Project ref: `akespqwzlrsajibjheqg`
