Listed directory CSE412
Listed directory backend
Listed directory extension
Listed directory src
Listed directory background
Listed directory content
Listed directory gmail
Listed directory panel
Listed directory popup
Listed directory views
Listed directory shared
Listed directory ui
Listed directory components
Listed directory features
Listed directory assistant
Listed directory auth
Listed directory insights
Listed directory settings
Listed directory tasks
Listed directory icons
Listed directory runtime
Listed directory styles
Listed directory scripts
Listed directory tests
Listed directory supabase
Listed directory website
Listed directory design-system
Listed directory documents
Viewed main.py:1-100
Searched for "@app."
Viewed manifest.json:1-50
Viewed index.ts:1-100
Viewed index.ts:1-100
Listed directory migrations
Listed directory design-baselines

Here is an exhaustive, module-by-module and file-by-file breakdown of the entire **MailX** codebase.

---

# 🏗️ High-Level System Architecture

MailX consists of four main architectural tiers:
1. **Chrome Extension (`/extension`)**: Manifest V3 extension featuring Gmail DOM content scripts, background service worker, slide-out React sidepanel, and popup dashboard.
2. **FastAPI Backend Proxy (`/backend`)**: Thin, high-performance Python API that validates authentication via Supabase JWKS, rate-limits requests, and proxies prompts to LLM providers (OpenCode Zen, Groq Cloud, DeepSeek).
3. **Database & Auth (`/supabase`)**: PostgreSQL hosted on Supabase providing Google OAuth, Row-Level Security (RLS), user preferences, task tracking, and follow-up reminders.
4. **Landing Webpage (`/website`)**: Showcase and distribution site built with React & Vite.

```
┌─────────────────────────────────────────────────────────────┐
│                       Chrome Browser                        │
│  ┌───────────────────────┐       ┌───────────────────────┐  │
│  │ Gmail Content Script  │       │ Extension Popup View  │  │
│  │ (DOM Toolbar & Panel) │       │ (Dashboard & Settings)│  │
│  └───────────┬───────────┘       └───────────┬───────────┘  │
│              └───────────────┬───────────────┘              │
│                              ▼                              │
│              ┌───────────────────────────────┐              │
│              │ Background Service Worker     │              │
│              │ (Cache, Queue, Alarms, Auth)  │              │
│              └───────┬───────────────┬───────┘              │
└──────────────────────┼───────────────┼──────────────────────┘
                       │               │
        Bearer JWT Auth│               │ OAuth & Sync
                       ▼               ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│    FastAPI Backend Proxy     │ │     Supabase Database      │
│  - JWT & Rate Limit Check    │ │  - User Preferences        │
│  - Structured JSON Prompts   │ │  - Tasks & Deadlines       │
│  - Multi-LLM Provider Engine │ │  - Reminders & Alarms      │
└──────────────┬───────────────┘ └────────────────────────────┘
               ▼
┌──────────────────────────────┐
│  LLM Providers (Zen/Groq)    │
└──────────────────────────────┘
```

---

# 1. Backend Module (`/backend`)

The backend acts as a secure, stateless gateway between the extension and external AI LLM models.

| File | Path | Purpose & Responsibilities |
| :--- | :--- | :--- |
| **`main.py`** | [main.py](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/backend/main.py) | **Core FastAPI Application**: <br>• Manages HTTP connection pools & lifespan.<br>• Validates Supabase JWTs via JWKS endpoint.<br>• Implements rate limiting per user (30 req/min).<br>• Dispatches AI intents (`summarize`, `reply`, `priority`, `tasks`, `draft`, `spam`, `phishing`, `chat`) to LLMs (Zen, Groq, DeepSeek).<br>• Enforces strict Pydantic JSON schemas and parsing.<br>• Exposes `/chat`, `/models/status`, and `/health` endpoints. |
| **`test_main.py`** | [test_main.py](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/backend/test_main.py) | **Backend Test Suite**: Pytest test suite testing JWT auth, dev tokens, rate limiter, Pydantic schemas, prompt builders, provider failover, and endpoint responses. |
| **`benchmark.py`** | [benchmark.py](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/backend/benchmark.py) | **Performance & Token Benchmarking**: Script to measure LLM latency, token counts, and performance metrics across different prompts and intents. |
| **`requirements.txt`** | [requirements.txt](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/backend/requirements.txt) | **Python Dependencies**: Defines packages including `fastapi`, `uvicorn`, `httpx`, `python-dotenv`, `pydantic`, `pyjwt`, and `cryptography`. |
| **`Dockerfile`** | [Dockerfile](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/backend/Dockerfile) | Container definition for deploying the FastAPI backend on container platforms (e.g. Render, Fly.io, Cloud Run). |
| **`.env.example`** | [.env.example](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/backend/.env.example) | Environment variable template documenting required keys (`ZEN_API_KEY`, `GROQ_API_KEY`, `DEEPSEEK_API_KEY`, `SUPABASE_URL`, `MAILX_DEV_MODE`, etc.). |

---

# 2. Chrome Extension (`/extension`)

## 2.1 Configuration & Build Setup
| File | Path | Purpose & Responsibilities |
| :--- | :--- | :--- |
| **`manifest.json`** | [manifest.json](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/manifest.json) | **Chrome Extension Manifest (MV3)**: Declares permissions (`storage`, `alarms`, `notifications`, `identity`, `clipboardWrite`), host permissions, background service worker, and content scripts for `mail.google.com`. |
| **`vite.config.ts`** | [vite.config.ts](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/vite.config.ts) | Vite build configuration with `@crxjs/vite-plugin`. Pinned to port `5174` for hot reloading. |
| **`package.json`** | [package.json](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/package.json) | Declares frontend dependencies (React 18, `@supabase/supabase-js`, Lucide icons, Vitest). |
| **`tsconfig.json`** | [tsconfig.json](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/tsconfig.json) | TypeScript compiler options for DOM & ESNext. |

---

## 2.2 Background Service Worker (`/extension/src/background`)
The background script handles long-running services, background tasks, network requests, and external APIs.

| File | Path | Purpose & Responsibilities |
| :--- | :--- | :--- |
| **`index.ts`** | [index.ts](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/background/index.ts) | **Extension Message Router**: Listens for Chrome runtime messages (`chrome.runtime.onMessage`), enforces AI consent policies, dispatches requests through queues and caches, and coordinates background modules. |
| **`api.ts`** | [api.ts](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/background/api.ts) | **Backend HTTP Client**: Sends authenticated requests to the FastAPI `/chat` and `/models/status` endpoints with timeout management and error wrapping. |
| **`supabase.ts`** | [supabase.ts](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/background/supabase.ts) | **Supabase Client & Auth**: Handles Google OAuth authentication via `chrome.identity.launchWebAuthFlow`, manages tokens in `chrome.storage.local`, and provides CRUD operations for user preferences, tasks, and reminders. |
| **`queue.ts`** | [queue.ts](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/background/queue.ts) | **Request Priority Queue**: Manages concurrent AI requests using priority lanes (`foreground` for active user interactions vs. `background` for lower-priority tasks) to avoid starvation. |
| **`requestRegistry.ts`** | [requestRegistry.ts](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/background/requestRegistry.ts) | **Cancellation Registry**: Tracks active `AbortController` instances by `request_id`, allowing users to cancel in-flight AI requests immediately. |
| **`reminders.ts`** | [reminders.ts](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/background/reminders.ts) | **Follow-up Reminders**: Uses `chrome.alarms` to schedule periodic reminder checks and triggers system desktop notifications via `chrome.notifications`. |
| **`stats.ts`** | [stats.ts](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/background/stats.ts) | **Mail Analytics Aggregation**: Interacts with Gmail data to aggregate email volume, sent/received ratios, and busy times. |
| **`gmail.ts`** | [gmail.ts](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/background/gmail.ts) | **Gmail API Integration**: Wrapper for Gmail REST API calls using OAuth tokens for reading threads and managing drafts. |
| **`spam.ts`** | [spam.ts](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/background/spam.ts) | **Spam Analysis**: Implements email heuristics and remote AI classification to detect spam patterns and deceptive indicators. |
| **`phishing.ts`** | [phishing.ts](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/background/phishing.ts) | **Phishing & URL Inspection**: Analyzes links and domain reputations to flag suspicious or spoofed URLs in emails. |

---

## 2.3 Gmail Content Scripts (`/extension/src/content`)
Injected directly into `https://mail.google.com/*` to interact with the Gmail DOM.

| File | Path | Purpose & Responsibilities |
| :--- | :--- | :--- |
| **`index.ts`** | [index.ts](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/content/index.ts) | **Content Script Orchestrator**: <br>• Detects email thread views and compose windows.<br>• Injects MailX action buttons (Summarize, Reply, Priority, Tasks, Phishing, Spam) into the Gmail top toolbar.<br>• Coordinates the sidepanel lifecycle and handles keyboard shortcuts. |
| **`toolbarObserver.ts`** | [toolbarObserver.ts](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/content/toolbarObserver.ts) | **Gmail DOM Observer**: Uses `MutationObserver` to detect when Gmail changes active views or toolbars and debounces thread body extraction. |
| **`toolbar.css`** | [toolbar.css](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/content/toolbar.css) | Styles for injected toolbar buttons, icons, and action badges inside the Gmail web interface. |
| **`gmail/insertion.ts`** | [insertion.ts](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/content/gmail/insertion.ts) | **DOM Insertion Helpers**: Directly reads from and injects AI-generated drafts/replies into Gmail’s `contentEditable` compose boxes while triggering input events to maintain Gmail internal state. |
| **`panel/mountPanel.tsx`** | [mountPanel.tsx](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/content/panel/mountPanel.tsx) | Mounts the React `PanelApp` into a dedicated container / Shadow DOM host inside Gmail. |
| **`panel/PanelHost.ts`** | [PanelHost.ts](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/content/panel/PanelHost.ts) | Creates and manages the DOM mount element for the sidepanel. |
| **`panel/PanelController.ts`** | [PanelController.ts](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/content/panel/PanelController.ts) | Imperative bridge between DOM toolbar triggers and the React sidepanel state (opening, closing, updating email context, displaying loading states). |
| **`panel/PanelApp.tsx`** | [PanelApp.tsx](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/content/panel/PanelApp.tsx) | **React Slide-out Sidepanel**: The primary in-Gmail interface featuring the AI Email Assistant, Smart Replies, Task Extractor, Draft Generator, Security Scanner, and Interactive Chat. |
| **`panel/panel.css`** | [panel.css](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/content/panel/panel.css) | Scoped CSS for the slide-out sidepanel. |

---

## 2.4 Popup UI (`/extension/src/popup`)
The standalone UI rendered when the user clicks the MailX extension icon in Chrome’s toolbar.

| File | Path | Purpose & Responsibilities |
| :--- | :--- | :--- |
| **`index.html`** | [index.html](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/popup/index.html) | HTML container for the extension popup. |
| **`index.tsx`** | [index.tsx](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/popup/index.tsx) | React root mounting point for the popup application. |
| **`App.tsx`** | [App.tsx](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/popup/App.tsx) | **Popup Root App**: Manages global tab navigation (Home, Tasks, Insights, Settings), user session state, and theme detection. |
| **`popup.css`** | [popup.css](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/popup/popup.css) | Window dimension and styling rules for the extension popup. |
| **`statsRequestGuard.ts`**| [statsRequestGuard.ts](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/popup/statsRequestGuard.ts) | Prevents redundant network calls when the popup opens rapidly. |
| **`views/HomeView.tsx`** | [HomeView.tsx](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/popup/views/HomeView.tsx) | **Dashboard View**: Displays user status, quick statistics, upcoming follow-up reminders, recent pending tasks, and quick actions. |
| **`views/SettingsView.tsx`**| [SettingsView.tsx](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/popup/views/SettingsView.tsx) | Settings screen rendering user preferences configuration. |

---

## 2.5 Reusable UI & Feature Modules (`/extension/src/ui`)
A modular design system and specialized feature components shared between the sidepanel and the popup.

### 🧩 UI Design System Components (`/src/ui/components`)
- **`Button.tsx` & `.css`** ([Button.tsx](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/ui/components/Button.tsx)): Standard button component supporting variants (`primary`, `secondary`, `ghost`, `danger`), sizes, and loading spinners.
- **`Dialog.tsx` & `.css`** ([Dialog.tsx](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/ui/components/Dialog.tsx)): Accessible modal dialog overlays and confirmation popups.
- **`Feedback.tsx` & `.css`** ([Feedback.tsx](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/ui/components/Feedback.tsx)): Alert banners, toast notifications, badges, and empty-state placeholders.
- **`Fields.tsx` & `.css`** ([Fields.tsx](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/ui/components/Fields.tsx)): Text inputs, multiline text areas, checkboxes, and select dropdowns.
- **`Layout.tsx` & `.css`** ([Layout.tsx](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/ui/components/Layout.tsx)): Structural layout primitives (Stacks, Flex rows, Cards, Sections).
- **`SegmentedControl.tsx` & `.css`** ([SegmentedControl.tsx](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/ui/components/SegmentedControl.tsx)): Segmented pill switches for mode selection.
- **`Tabs.tsx` & `.css`** ([Tabs.tsx](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/ui/components/Tabs.tsx)): Tab bar navigation components.

### 🚀 Feature Modules (`/src/ui/features`)
- **Assistant (`/features/assistant`)**:
  - `AssistantView.tsx` ([AssistantView.tsx](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/ui/features/assistant/AssistantView.tsx)): Unified AI assistant view displaying summarization, action points, priority, and reply options.
  - `ChatView.tsx` ([ChatView.tsx](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/ui/features/assistant/ChatView.tsx)): Interactive conversational AI chat interface with full email thread context.
  - `DraftView.tsx` ([DraftView.tsx](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/ui/features/assistant/DraftView.tsx)): AI Email Composer allowing users to select tone, length, and goals before generating and inserting drafts.
  - `ResultView.tsx` ([ResultView.tsx](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/ui/features/assistant/ResultView.tsx)): Structured presentation cards for key summary points, extracted tasks, and quick reply chips.
  - `SecurityResultView.tsx` ([SecurityResultView.tsx](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/ui/features/assistant/SecurityResultView.tsx)): Visual indicators for phishing and spam scan verdicts.
  - `conversation.ts` & `response.ts`: Utilities for chat history trimming and parsing raw AI output into view models.
- **Auth (`/features/auth`)**:
  - `AuthView.tsx` ([AuthView.tsx](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/ui/features/auth/AuthView.tsx)): Google OAuth login button and local development sign-in.
  - `AccountSummary.tsx` ([AccountSummary.tsx](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/ui/features/auth/AccountSummary.tsx)): User avatar, email address display, and sign-out controls.
- **Tasks (`/features/tasks`)**:
  - `TasksView.tsx` ([TasksView.tsx](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/ui/features/tasks/TasksView.tsx)): Task manager UI to view, check off, delete, and filter extracted deadlines and to-dos.
  - `useTasks.ts` ([useTasks.ts](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/ui/features/tasks/useTasks.ts)): Custom React hook managing task state and syncing with Supabase/cache.
- **Insights (`/features/insights`)**:
  - `InsightsView.tsx` ([InsightsView.tsx](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/ui/features/insights/InsightsView.tsx)): Analytics charts showing email volume, response rate, and productivity insights.
  - `useInsights.ts`: Data fetching hook for email metrics.
- **Settings (`/features/settings`)**:
  - `SettingsForm.tsx` ([SettingsForm.tsx](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/ui/features/settings/SettingsForm.tsx)): User preferences form for AI tone, default summary length, model selection, and auto-save options.

### 🎨 Styles & Runtime
- **`styles/tokens.css`** ([tokens.css](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/ui/styles/tokens.css)): CSS custom properties (color palette, spacing scale, border radii, elevation).
- **`styles/base.css`** & **`components.css`**: Global typography and base styling resets.
- **`runtime/theme.ts`** ([theme.ts](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/ui/runtime/theme.ts)): Light/dark theme detection and switching.
- **`runtime/sendMessage.ts`** ([sendMessage.ts](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/ui/runtime/sendMessage.ts)): Type-safe wrapper for `chrome.runtime.sendMessage`.

---

## 2.6 Shared Utilities (`/extension/src/shared`)
Common libraries shared across the background service worker, content scripts, and popup.

| File | Path | Purpose & Responsibilities |
| :--- | :--- | :--- |
| **`types.ts`** | [types.ts](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/shared/types.ts) | **TypeScript Definitions**: Central source of truth for all data models (`EmailContext`, `ExtensionMessage`, `StructuredAiResult`, `Task`, `Reminder`, `Preferences`, `TelemetryEvent`, etc.). |
| **`cache.ts`** | [cache.ts](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/shared/cache.ts) | **Two-Tier Caching System**: Combines in-memory LRU caching with `chrome.storage.session` persistence, TTL management, and stampede coalescing to avoid duplicate LLM queries. |
| **`cacheKeys.ts`** | [cacheKeys.ts](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/shared/cacheKeys.ts) | Stable deterministic hash generation for email contents, intents, and user preferences. |
| **`telemetry.ts`** | [telemetry.ts](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/shared/telemetry.ts) | Latency tracking, click-to-result timers, error logging, and performance telemetry. |
| **`aiPolicy.ts`** | [aiPolicy.ts](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/shared/aiPolicy.ts) | Enforces strict privacy policies: ensures remote AI calls only trigger upon explicit user actions. |
| **`abort.ts`** | [abort.ts](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/shared/abort.ts) | Timeout and cancellation utilities for `AbortSignal` management. |

---

# 3. Database & Migrations (`/supabase`)

MailX uses Supabase PostgreSQL for persistent cloud storage and synchronization.

| File | Path | Purpose & Responsibilities |
| :--- | :--- | :--- |
| **`schema.sql`** | [schema.sql](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/supabase/schema.sql) | **Database Schema Definition**: <br>• Tables: `preferences`, `tasks`, and `reminders`.<br>• Row Level Security (RLS) policies ensuring users only access their own data (`auth.uid() = user_id`).<br>• Automated timestamp triggers (`moddatetime`). |
| **`migrations/`** | [migrations/](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/supabase/migrations) | Versioned SQL migrations covering database invariants, reminder notification states, statistics aggregation, and task completion history. |

---

# 4. Landing & Showcase Website (`/website`)

Marketing and presentation website for MailX.

| File | Path | Purpose & Responsibilities |
| :--- | :--- | :--- |
| **`index.html`** | [index.html](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/website/index.html) | Main HTML entry point for the public website. |
| **`src/App.tsx`** | [App.tsx](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/website/src/App.tsx) | Landing page React component detailing features, benefits, screenshots, security architecture, team credits, and installation steps. |
| **`src/main.tsx` & `index.css`** | [main.tsx](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/website/src/main.tsx) | React bootstrapping and styling for the landing page. |
| **`vercel.json`** | [vercel.json](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/website/vercel.json) | Routing configuration for deployment on Vercel. |

---

# 5. Project Documentation & Specifications (`/documents` & Root)

| File | Path | Purpose & Responsibilities |
| :--- | :--- | :--- |
| **`AGENTS.md`** | [AGENTS.md](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/AGENTS.md) | **Developer & Agent Guidelines**: Operating instructions, team info, port mappings (`8001` backend, `5174` Vite dev server), test URLs, and setup rules. |
| **`README.md`** | [README.md](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/README.md) | Comprehensive project overview, installation guides, feature screenshots, and architecture overview. |
| **`SETUP.md`** | [SETUP.md](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/documents/SETUP.md) | Complete onboarding setup manual for developers (Node, Python, Supabase, API keys). |
| **`MailX_Revised_Architecture_Plan.md`** | [MailX_Revised_Architecture_Plan.md](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/documents/MailX_Revised_Architecture_Plan.md) | Detailed architecture plan including sequence diagrams, security threat models, and data flows. |
| **`PERFORMANCE_AND_TOKEN_OPTIMIZATION_REPORT.md`** | [PERFORMANCE_AND_TOKEN_OPTIMIZATION_REPORT.md](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/documents/PERFORMANCE_AND_TOKEN_OPTIMIZATION_REPORT.md) | In-depth engineering report analyzing prompt token reduction, caching efficacy, and latency measurements. |
| **`PROJECT_STATUS.md`** | [PROJECT_STATUS.md](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/documents/PROJECT_STATUS.md) | Milestone tracker, feature checklist, and status log for the project. |

---

### Summary Checklist of Key Workflows

- **Email Summary / Reply / Tasks**: User clicks toolbar button in Gmail $\to$ [content/index.ts](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/content/index.ts) opens [panel/PanelApp.tsx](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/content/panel/PanelApp.tsx) $\to$ sends message to [background/index.ts](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/background/index.ts) $\to$ checks [shared/cache.ts](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/shared/cache.ts) $\to$ calls FastAPI [backend/main.py](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/backend/main.py) $\to$ queries LLM $\to$ returns structured JSON $\to$ rendered in [ui/features/assistant/ResultView.tsx](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/ui/features/assistant/ResultView.tsx).
- **Inserting Draft into Gmail**: User clicks "Insert Draft" or "Insert Reply" $\to$ [gmail/insertion.ts](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/content/gmail/insertion.ts) injects text into Gmail's active compose box.
- **Task & Reminder Syncing**: Handled by [background/supabase.ts](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/background/supabase.ts) and displayed in [ui/features/tasks/TasksView.tsx](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/ui/features/tasks/TasksView.tsx) and [popup/views/HomeView.tsx](file:///c:/Users/Sadik/Documents/Google%20Antigravity/CSE412/extension/src/popup/views/HomeView.tsx).