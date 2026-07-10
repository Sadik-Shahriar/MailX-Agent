# MailX — AI Email Assistant

**Revised Architecture & Implementation Plan (MVP)**

CSE412 Software Engineering, Section 5, Summer 2026
East West University

**Team A:** Raquib Uddin Sarkar, Md. Sadik Shahriar, Chayan Das, Shahriar Mahabub Oishik

**Last Updated:** July 10, 2026

---

## Table of Contents

1. Project Overview
2. MVP Feature Set (7 Functional Requirements)
3. Technology Stack
4. Architecture Overview
5. Supabase Integration
6. Data Flow
7. Project Structure
8. Implementation Plan (3 Sprints)
9. Key Design Decisions
10. Per-FR Design Summaries

---

## 1. Project Overview

MailX is an AI-powered browser extension that enhances Gmail productivity through intelligent automation. It provides email summarization, smart reply suggestions, priority detection, task extraction, follow-up reminders, AI draft generation, and mail statistics — all powered by a low-cost API-based LLM (DeepSeek V4 Flash) with Supabase for authentication and data persistence.

The extension integrates directly into Gmail's UI via a shadow DOM overlay and toolbar buttons, offering two interaction paths: one-click toolbar actions and a natural-language chat interface.

---

## 2. MVP Feature Set (7 Functional Requirements)

| ID | Feature | Description |
| :-- | :------ | :---------- |
| **FR1** | AI Email Summarization | Condenses lengthy emails into 2-3 concise bullet points |
| **FR2** | Smart Reply Suggestions | Generates 3 context-aware reply options for the open email |
| **FR4** | Priority Detection | Labels inbox emails as High/Medium/Low with color badges |
| **FR5** | Task & Deadline Extraction | Extracts action items and dates from email text into a checklist |
| **FR6** | Follow-Up Reminder System | Chrome alarms notify user when follow-up is needed (no reply or task due) |
| **FR9** | AI Email Draft Generation | Generates complete email drafts from natural language prompts |
| **FR10** | Mail Statistics Analysis | Dashboard showing email patterns, response times, task completion, priority breakdown |

**Deferred to future:** FR3 (Open Tracking), FR7 (Spam Detection), FR8 (Phishing Detection)

---

## 3. Technology Stack

| Layer | Technology | Version | Why |
| :---- | :---------- | :------ | :-- |
| **Extension** | Vite + React 18 + TypeScript | Latest | Fast build, strict typing |
| **Extension toolkit** | CRXJS | Latest | Manifest V3, HMR for development |
| **LLM** | DeepSeek V4 Flash API | — | $0.14/M tokens input, 1M context, no local hardware needed |
| **Backend** | FastAPI (Python) | 0.115+ | Thin proxy — only routes requests to DeepSeek API |
| **Auth** | Supabase Auth (Google OAuth) | — | Built-in Google login, PKCE, session management |
| **Database** | Supabase PostgreSQL | — | Tasks, preferences, sender scores, stats |
| **Client cache** | chrome.storage.session | — | Session-level TTL cache to avoid redundant API calls |
| **Preferences sync** | chrome.storage.sync | — | Cross-device preference sync (backup to Supabase) |
| **Charts** | CSS-only (no chart library) | — | Zero-dependency bar/donut charts for FR10 |

### Cost Breakdown

| Service | Cost | Notes |
| :------ | :--- | :---- |
| Supabase (Free tier) | $0 | 500 MB DB, 50K MAU, 2 GB bandwidth |
| DeepSeek V4 Flash | ~$0.14 / M input tokens | 5M free tokens on signup. MVP usage << 1M tokens |
| FastAPI backend | Free | Deploy on Railway/Render free tier or any VM |
| **Total** | **~$0** | Negligible cost for development and demo |

---

## 4. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Chrome Extension                             │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Content Script (Gmail DOM Injection)                       │   │
│  │  ┌──────────────┐  ┌───────────────┐  ┌─────────────────┐  │   │
│  │  │ ChatOverlay   │  │ GmailToolbar  │  │ ConversationMgr │  │   │
│  │  │ (shadow DOM)  │  │ (buttons)     │  │ (history)       │  │   │
│  │  └──────┬───────┘  └───────┬───────┘  └────────┬────────┘  │   │
│  └─────────┼──────────────────┼───────────────────┼────────────┘   │
│            │                  │                   │                │
│  ┌─────────┴──────────────────┴───────────────────┴────────────┐   │
│  │  Service Worker (background)                                │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │   │
│  │  │ api.ts   │  │ supabase │  │ reminders│  │ stats.ts   │  │   │
│  │  │ (LLM)    │  │ (auth+db)│  │ (FR6)    │  │ (FR10 agg) │  │   │
│  │  └────┬─────┘  └────┬─────┘  └──────────┘  └────────────┘  │   │
│  └───────┼─────────────┼────────────────────────────────────────┘   │
│          │             │                                            │
│  ┌───────┴─────────────┴────────────────────────────────────────┐   │
│  │  Popup (React)                                              │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │   │
│  │  │ Settings │  │ Stats    │  │ Follow-  │                   │   │
│  │  │          │  │ (FR10)   │  │ Ups (FR6)│                   │   │
│  │  └──────────┘  └──────────┘  └──────────┘                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
         │                              │
         │ HTTPS                        │ HTTPS
         ▼                              ▼
┌─────────────────┐          ┌──────────────────────┐
│   FastAPI        │          │     Supabase          │
│   (LLM Proxy)    │          │                        │
│                  │          │  ┌──────────────────┐  │
│  POST /chat      │          │  │ PostgreSQL       │  │
│    → DeepSeek API│          │  │ - tasks          │  │
│                  │          │  │ - preferences    │  │
│  Only endpoint   │          │  │ - sender_scores  │  │
│  ~50 lines total │          │  └──────────────────┘  │
└────────┬─────────┘          │                        │
         │                    │  ┌──────────────────┐  │
         ▼                    │  │ Auth (Google)    │  │
┌─────────────────┐          │  │ - OAuth 2.0      │  │
│  DeepSeek V4     │          │  │ - PKCE           │  │
│  Flash API       │          │  │ - Session mgmt   │  │
│  api.deepseek.com│          │  └──────────────────┘  │
└─────────────────┘          └──────────────────────────┘
```

### Key Design Change: Thin Backend

The original design had a heavy FastAPI backend with Ollama, SQLite, plugin registry, intent routing, and multiple endpoints. The revised backend is:

- **A single endpoint** (`POST /chat`) that forwards requests to DeepSeek
- **~50 lines of Python** — no database, no plugin registry, no intent routing
- Intent classification is handled by the LLM itself (DeepSeek is good enough)
- No local model to serve or tune

The complexity moves to where it matters: the extension and the database.

---

## 5. Supabase Integration

### 5.1 Authentication Flow

```
User opens extension
  → Clicks "Sign in with Google"
  → chrome.identity.launchWebAuthFlow() opens Google consent screen
  → Supabase handles OAuth + PKCE
  → User grants Gmail scopes (openid, email, profile, gmail.readonly)
  → Supabase returns session with access_token + refresh_token
  → Extension stores session in chrome.storage.local
  → Now has both Supabase auth AND Gmail API access
```

**Why this matters:** The Google OAuth token from Supabase is reused for Gmail API calls. No separate `chrome.identity.getAuthToken()` flow needed.

### 5.2 Database Schema

```sql
-- Managed by Supabase Auth (auto-created)
-- auth.users: id, email, created_at, last_sign_in_at, ...

-- 1. User Preferences (FR4, FR9, FR6)
create table public.preferences (
  user_id uuid references auth.users primary key,
  reply_tone text not null default 'professional'
    check (reply_tone in ('formal', 'casual', 'professional')),
  phishing_sensitivity text not null default 'default'
    check (phishing_sensitivity in ('low', 'default', 'high')),
  reminder_delay_days int not null default 3,
  reminder_notify_before bool not null default true,
  reminder_notify_due bool not null default true,
  reminder_notify_overdue bool not null default false,
  updated_at timestamptz not null default now()
);

-- 2. Sender Scores (FR4 — behavioral learning)
create table public.sender_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  sender_email text not null,
  sender_name text,
  score int not null default 50
    check (score >= 0 and score <= 100),
  reply_count int not null default 0,
  open_count int not null default 0,
  median_response_minutes int,
  last_interaction_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, sender_email)
);

-- 3. Tasks (FR5)
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  email_id text,
  email_subject text,
  email_sender text,
  description text not null,
  assignee text not null default 'me',
  due_date date,
  priority text not null default 'medium'
    check (priority in ('high', 'medium', 'low')),
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'dismissed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- 4. Follow-Up Reminders (FR6)
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  type text not null
    check (type in ('sent_no_reply', 'task_due_soon', 'task_overdue')),
  source_id text not null,
  subject text not null,
  recipient_name text,
  sent_date timestamptz,
  dismissed bool not null default false,
  resolved bool not null default false,
  created_at timestamptz not null default now()
);

-- 5. Email Activity Log (FR10 — stats aggregation)
create table public.email_activity (
  id bigint primary key generated always as identity,
  user_id uuid not null references auth.users on delete cascade,
  date date not null,
  emails_sent int not null default 0,
  emails_received int not null default 0,
  replies_sent int not null default 0,
  unique (user_id, date)
);

-- Row Level Security (RLS)
alter table public.preferences enable row level security;
alter table public.sender_scores enable row level security;
alter table public.tasks enable row level security;
alter table public.reminders enable row level security;
alter table public.email_activity enable row level security;

-- Policies: users can only see their own data
create policy "Users own their preferences"
  on public.preferences for all
  using (auth.uid() = user_id);

create policy "Users own their sender scores"
  on public.sender_scores for all
  using (auth.uid() = user_id);

create policy "Users own their tasks"
  on public.tasks for all
  using (auth.uid() = user_id);

create policy "Users own their reminders"
  on public.reminders for all
  using (auth.uid() = user_id);

create policy "Users own their activity"
  on public.email_activity for all
  using (auth.uid() = user_id);
```

### 5.3 Why Supabase Instead of chrome.storage

| Concern | chrome.storage only | With Supabase DB |
| :------ | :------------------ | :--------------- |
| **FR10 (Stats)** | Must aggregate from 5+ storage keys manually | `SELECT count(*) FROM tasks GROUP BY status` |
| **Cross-device sync** | chrome.storage.sync (100KB per item cap) | Infinite, real-time |
| **Data loss risk** | Uninstalling extension clears data | Data persists in cloud |
| **Querying** | Must load entire storage and filter in JS | SQL filtering, sorting, pagination |
| **FR4 sender scores** | Must load all scores and compute in memory | `WHERE sender_email = ? AND score > 80` |

chrome.storage.session is still used as a **read cache** to avoid redundant network calls within a browser session.

---

## 6. Data Flow

### 6.1 AI Feature Flow (FR1, FR2, FR4, FR5, FR9)

```
User clicks [Summarize] toolbar button
  → Content script extracts email_id from Gmail DOM
  → Sends { type: "SUMMARIZE", email_id } to Service Worker
  → SW checks chrome.storage.session cache (key: "summary:{email_id}")
  → Cache hit → return instantly
  → Cache miss → SW fetches email body from Gmail API
  → SW calls POST /chat on FastAPI:
      {
        "intent": "summarize",
        "email_context": { id, sender, subject, body },
        "preferences": { reply_tone: "professional" }
      }
  → FastAPI builds prompt and calls DeepSeek V4 Flash API
  → DeepSeek returns: { intent: "summarize", response: "• ...", actions: [...] }
  → SW caches in chrome.storage.session
  → Content script renders result in overlay
```

### 6.2 Auth Flow

```
Extension starts
  → Check chrome.storage.local for Supabase session
  → Valid session? → Use existing tokens
  → No session / expired → Show login screen
  → User clicks "Sign in with Google"
  → chrome.identity.launchWebAuthFlow(supabase OAuth URL)
  → User approves in Google popup
  → Supabase redirects back with code
  → SW exchanges code for session
  → Store session in chrome.storage.local
  → Now authorized for both Supabase AND Gmail API
```

### 6.3 Stats Flow (FR10)

```
User opens popup → clicks [Stats] tab
  → SW reads chrome.storage.session "stats_cache"
  → If < 5 min old → render from cache
  → If expired → run three parallel fetches:
      1. Supabase: SELECT count(*) FROM tasks WHERE user_id = ?
      2. Supabase: SELECT sender_email, score FROM sender_scores
      3. Gmail API: GET messages?q=in:sent after:date
  → Aggregate all data
  → Write to chrome.storage.session (5 min TTL)
  → Render dashboard
```

---

## 7. Project Structure

```
mailx/
├── extension/                    # Chrome Extension (Vite + React)
│   ├── manifest.json             # Manifest V3
│   ├── vite.config.ts            # CRXJS config
│   ├── tsconfig.json
│   ├── package.json
│   ├── public/
│   │   └── icons/
│   └── src/
│       ├── background/           # Service Worker
│       │   ├── index.ts          # Message router
│       │   ├── api.ts            # → FastAPI (LLM calls)
│       │   ├── supabase.ts       # Supabase client (auth + db)
│       │   ├── gmail.ts          # Gmail API wrapper
│       │   ├── reminders.ts      # FR6 - Chrome alarms
│       │   └── stats.ts          # FR10 - data aggregation
│       ├── content/              # Gmail injection
│       │   ├── index.ts          # Entry point, detect Gmail
│       │   ├── Overlay.tsx       # Shadow DOM container
│       │   ├── ChatOverlay.tsx   # Chat messages + input
│       │   ├── GmailToolbar.tsx  # Toolbar button injection
│       │   └── ConversationManager.ts
│       ├── popup/
│       │   ├── index.tsx
│       │   ├── App.tsx
│       │   └── views/
│       │       ├── Settings.tsx
│       │       ├── Stats.tsx     # FR10 dashboard
│       │       └── FollowUps.tsx # FR6 reminders list
│       └── shared/
│           ├── types.ts
│           ├── helpers.ts
│           └── cache.ts          # chrome.storage.session wrapper
│
├── backend/                      # FastAPI (thin LLM proxy)
│   ├── main.py                   # Single /chat endpoint
│   ├── requirements.txt
│   └── .env.example              # DEEPSEEK_API_KEY
│
├── supabase/
│   ├── schema.sql                # Full DB schema + RLS
│   └── seed.sql                  # Sample data for testing
│
└── README.md
```

---

## 8. Implementation Plan — 3 Sprints

### Sprint 1: Foundation (Week 1)
**Goal:** Working end-to-end pipeline: Extension → FastAPI → DeepSeek API

| Day | Task | Deliverable |
| :-- | :--- | :---------- |
| 1 | FastAPI project setup + `/chat` endpoint | `curl localhost:8000/chat` returns DeepSeek response |
| 2 | Supabase project + DB schema + RLS policies | Tables created, RLS working |
| 3 | Extension scaffold (Vite + CRXJS + React) | Chrome loads extension with popup |
| 4 | Supabase Auth integration (Google OAuth via chrome.identity) | Login flow works end-to-end |
| 5 | Gmail API wrapper — fetch email by ID | SW can fetch email body from Gmail |

**Verify:** User logs in with Google → extension shows "Logged in" → API call returns summary from DeepSeek.

---

### Sprint 2: Core Features (Week 2)
**Goal:** All 7 FRs functional

| Day | Task | FRs |
| :-- | :--- | :-: |
| 1 | Content script injection + shadow DOM overlay + Gmail detection | — |
| 2 | Chat overlay UI + ConversationManager | — |
| 3 | Summarize (FR1) + Smart Reply (FR2) + Draft (FR9) | FR1, FR2, FR9 |
| 4 | Priority Detection (FR4) + Task Extraction (FR5) | FR4, FR5 |
| 5 | Follow-Up Reminders (FR6) — Chrome alarms | FR6 |

**Verify:** All toolbar buttons and chat commands return correct results.

---

### Sprint 3: Polish & Stats (Week 3)
**Goal:** Dashboard, error handling, security, README

| Day | Task | FRs |
| :-- | :--- | :-: |
| 1 | Supabase DB operations for tasks, preferences, sender scores | FR4, FR5 |
| 2 | Stats Dashboard (FR10) + CSS charts | FR10 |
| 3 | Error states (offline, timeout, API error) + Loading skeletons | All |
| 4 | Security audit (CSP, DOMPurify, input sanitization) | All |
| 5 | README + Demo video + Submission | — |

**Verify:** Full test pass — every FR verified against its acceptance criteria.

---

## 9. Key Design Decisions

| Decision | Chosen | Reason |
| :------- | :----- | :----- |
| **LLM Provider** | DeepSeek V4 Flash API | $0.14/M tokens, 1M context, no local hardware. 5M free tokens on signup |
| **Backend** | Thin FastAPI proxy (~50 lines) | Only needs to forward to DeepSeek. No database, no plugin registry, no SQLite |
| **Auth** | Supabase Auth (Google OAuth) | Built-in PKCE, session management. Google token reused for Gmail API |
| **Database** | Supabase PostgreSQL | Tasks, preferences, sender scores, stats. RLS for security. SQL for FR10 |
| **Client cache** | chrome.storage.session | Avoids redundant API calls within a browser session. Cleared on browser close |
| **UI integration** | Shadow DOM overlay + Toolbar buttons | Two independent paths. Buttons for speed, chat for context-rich personalization |
| **Charts** | CSS-only (no library) | Zero dependencies. Simple horizontal bars + donut charts |
| **Deferred features** | FR3, FR7, FR8 | High effort, lower value for MVP. Gmail already does spam/phishing well |

---

## 10. Per-FR Design Summaries

### FR1: AI Email Summarization

- **Trigger:** Toolbar [Summarize] button or chat "Summarize this"
- **Flow:** Extension fetches email body via Gmail API → sends to DeepSeek via FastAPI → returns 2-3 bullet points
- **Cache:** chrome.storage.session keyed by email_id (session lifetime)
- **Edge cases:** Empty body, image-only, >4000 tokens, Gmail API rate limit

### FR2: Smart Reply Suggestions

- **Trigger:** Toolbar [Reply] button or chat "Suggest replies"
- **Flow:** Same as FR1 but with reply prompt → returns 3 options → user clicks to inject into reply textarea
- **Refinement:** Chat follow-ups like "Make it more formal" → DeepSeek revises with conversation history
- **Edge cases:** No reply textarea open, auto-confirmation email, empty body

### FR4: Priority Detection

- **Trigger:** Inbox load/scroll → classify by sender, subject, snippet
- **Flow:** Batch up to 3 uncached emails → send to DeepSeek for classification → render color badges
- **Learning:** Sender scores (0-100) stored in Supabase. Updates based on user actions (replies, re-classifications)
- **Rules:** User-defined overrides in Supabase preferences (e.g., "always Low from noreply@")
- **Edge cases:** No badge if confidence < 0.6, offline shows cached only, spam overrides priority

### FR5: Task & Deadline Extraction

- **Trigger:** Toolbar [Tasks] button or chat "What are my tasks?"
- **Flow:** Send email body to DeepSeek → returns JSON array → store in Supabase → render checklist
- **Storage:** Supabase `tasks` table with status, due_date, priority, assignee
- **Edge cases:** No tasks found, "I'll handle it" (assignee = sender, not "me"), relative date resolution

### FR6: Follow-Up Reminder System

- **Trigger:** Chrome alarm every 60 minutes
- **Two scenarios:**
  - Sent email with no reply after N days (check via Gmail API thread)
  - FR5 task due within 24h or overdue
- **Storage:** Supabase `reminders` table
- **UI:** Chrome notification (grouped summary) + popup tab + badge count
- **Edge cases:** Auto-reply/OOO detection, browser closed for hours, Gmail API quota exceeded

### FR9: AI Email Draft Generation

- **Trigger:** Toolbar [Draft] button (opens input modal) or chat "Draft an email to..."
- **Flow:** User prompt → DeepSeek generates subject + greeting + body + sign-off → [Insert] injects into compose box
- **Tone:** Formal / Casual / Professional (default from preferences)
- **Edge cases:** Empty prompt, sensitive content detection, no compose box open, regenerate

### FR10: Mail Statistics Analysis

- **Trigger:** Popup → Stats tab
- **Data sources:**
  - Gmail API: sent/received counts, response times, top senders, busiest day/hour
  - Supabase: task completion rate, priority breakdown, reminder resolution rate
  - FR4 sender scores: top senders by importance
- **UI States:** Loading (skeleton), Loaded (full dashboard), Empty (new user), Error (retry)
- **Period filter:** Last 7/30/90 days
- **Charts:** CSS-only horizontal bar charts, donut charts, scorecards

---

## Appendix A: FastAPI Backend (main.py)

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import httpx
import os

app = FastAPI()
DEEPSEEK_API_KEY = os.environ["DEEPSEEK_API_KEY"]

class ChatRequest(BaseModel):
    intent: str
    email_context: dict | None = None
    preferences: dict | None = None
    prompt: str | None = None
    conversation_id: str | None = None

class ChatResponse(BaseModel):
    intent: str
    response: str | list
    actions: list

SYSTEM_PROMPTS = {
    "summarize": "Summarize this email in 2-3 bullet points. Be factual and concise.\n\n{body}",
    "reply": "Suggest 3 reply options labeled R1, R2, R3.\n\n{body}",
    "priority": "Classify as high/medium/low priority.\n\nFrom: {sender}\nSubject: {subject}\nSnippet: {snippet}",
    "tasks": "Extract tasks as JSON array.\n\n{body}",
    "draft": "Write a complete email draft.\n\nUser request: {prompt}",
}

@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    system_prompt = SYSTEM_PROMPTS.get(req.intent, "")
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": req.prompt or req.email_context.get("body", "")}
    ]

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.deepseek.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {DEEPSEEK_API_KEY}"},
            json={"model": "deepseek-chat", "messages": messages}
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="LLM API error")

    return ChatResponse(
        intent=req.intent,
        response=resp.json()["choices"][0]["message"]["content"],
        actions=[]
    )
```

---

## Appendix B: API Contract (Extension ↔ Backend)

### POST /chat

**Request:**
```json
{
  "intent": "summarize",
  "email_context": {
    "id": "192abc",
    "sender": "john@acme.com",
    "subject": "Q3 Budget Review",
    "body": "Full email text here...",
    "snippet": "Preview text..."
  },
  "preferences": {
    "reply_tone": "professional"
  },
  "prompt": null,
  "conversation_id": null
}
```

**Response:**
```json
{
  "intent": "summarize",
  "response": "• Q3 budget approved for $50K\n• Deadline extended to Aug 15\n• Team meeting rescheduled to Friday",
  "actions": [
    { "label": "Copy", "action": "copy" },
    { "label": "Regenerate", "action": "regenerate" }
  ]
}
```

---

## Appendix C: Security Considerations

| Concern | Mitigation |
| :------ | :--------- |
| DeepSeek API key leak | Stored in backend env var only. Never in extension bundle |
| User email data in transit | HTTPS + TLS 1.3 (extension ↔ backend ↔ DeepSeek) |
| User email data on backend | No persistent storage. Process, forward, discard |
| Supabase API key exposure | Anonymous key with RLS — no DB access without user auth |
| XSS via LLM output | DOMPurify before rendering in shadow DOM |
| Gmail API token | Stored in chrome.storage.local (inaccessible to content scripts) |
| Rate limiting | Backend rate-limits by IP. DeepSeek has built-in rate limits |
| Auth token hijacking | chrome.identity.launchWebAuthFlow handles PKCE. No manual token handling |

---

## Appendix D: Verification Checklist

| FR | Test | Expected |
| :- | :--- | :------- |
| **FR1** | Click [Summarize] on a long email | 2-3 bullet points appear |
| **FR1** | "Summarize focusing on deadlines" via chat | Summary highlights deadline info |
| **FR2** | Click [Reply] → 3 options shown → select one | Reply text injected into textarea |
| **FR2** | "Make it more formal" in chat | Regenerated with formal tone |
| **FR4** | Open Gmail inbox | Color badges appear within 2s |
| **FR4** | Reply to same sender 3 times fast | Sender score rises, auto-High |
| **FR5** | Click [Tasks] on email with "Send report by Friday" | 1 task: "Send report", due = Friday |
| **FR5** | Check a task checkbox | Strikethrough, counter decreases |
| **FR6** | Send email, no reply for 3 days | Chrome notification appears |
| **FR6** | Reply arrives | Reminder auto-dismisses at next check |
| **FR9** | Click [Draft] → "Follow-up about Q3 budget" → [Generate] | Full draft with subject, body, sign-off |
| **FR9** | Click [Insert] | Draft injected into Gmail compose |
| **FR10** | Open popup → Stats tab | Charts render within 1s |
| **FR10** | Switch to "Last 30 days" | Data re-fetches, dashboard updates |
| **All** | Offline / no internet | Cached data shown. Error states for uncached |
| **All** | Google OAuth expired | Silent refresh via Supabase |
