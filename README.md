# MailX — AI Email Assistant for Gmail

<div align="center">

**A native, privacy-conscious AI copilot injected directly into your Gmail workspace.**

*Built for CSE412: Software Engineering (Section 5, Summer 2026), Department of CSE, East West University.*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python: 3.13](https://img.shields.io/badge/Python-3.13-3776AB.svg?logo=python&logoColor=white)](https://python.org)
[![Node: 22+](https://img.shields.io/badge/Node.js-22%2B-339933.svg?logo=node.js&logoColor=white)](https://nodejs.org)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React 18](https://img.shields.io/badge/Frontend-React_18-61DAFB.svg?logo=react&logoColor=black)](https://reactjs.org)
[![Supabase](https://img.shields.io/badge/Database-Supabase_PostgreSQL-3ECF8E.svg?logo=supabase&logoColor=white)](https://supabase.com)
[![OpenCode Zen](https://img.shields.io/badge/AI_Engine-OpenCode_Zen_API-10B981.svg)](https://opencode.ai/zen)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Key Features (FR1–FR10)](#key-features-fr1fr10)
- [System Architecture](#system-architecture)
- [Repository Structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Quick Start & Local Setup](#quick-start--local-setup)
  - [1. Clone Repository](#1-clone-repository)
  - [2. Configure & Run Backend](#2-configure--run-backend)
  - [3. Configure & Run Extension](#3-configure--run-extension)
  - [4. Load Extension in Chrome](#4-load-extension-in-chrome)
  - [5. Run Marketing Website (Optional)](#5-run-marketing-website-optional)
- [Supabase & Google OAuth Configuration](#supabase--google-oauth-configuration)
- [Testing & Verification](#testing--verification)
- [Troubleshooting](#troubleshooting)
- [Engineering Team](#engineering-team)

---

## Overview

**MailX** is a modern Chrome extension that seamlessly augments Gmail with AI capabilities. Instead of switching tabs between email and external chat interfaces, MailX embeds action capsules directly into Gmail threads—enabling executive 3-bullet summarization, 1-click tailored replies, automated task extraction, priority triage, and link safety auditing.

### Privacy & Zero-Retention Architecture
- **Ephemeral Inference**: Email contents are processed in-memory for immediate inference and are **never** stored on server disks or used to train AI models.
- **Row Level Security (RLS)**: User preferences, task boards, and reminder schedules are strictly isolated per authenticated Google user in Supabase PostgreSQL.
- **Stateless Backend Proxy**: FastAPI backend (Port 8001) keeps API keys secure server-side rather than exposing them in client extension bundles.

---

## Key Features (FR1–FR10)

| Requirement | Feature | Description | Status |
|---|---|---|---|
| **FR1** | **3-Bullet Summaries** | Distills long or multi-party email threads into 3 crisp, executive takeaways in under 2 seconds. | ✅ Production Ready |
| **FR2** | **Smart Reply Suggestions** | Context-aware response options (Professional, Direct, Action-Oriented) ready to insert into Gmail reply with 1 click. | ✅ Production Ready |
| **FR4** | **Priority & Urgency Triage** | Explicitly classifies incoming email urgency and flags critical action items in Gmail headers. | ✅ Production Ready |
| **FR5** | **Task & Deadline Extraction** | Detects commitments, assignees, and calendar deadlines, syncing them to your Supabase task board. | ✅ Production Ready |
| **FR6** | **Follow-Up & Reminder System** | Tracks outgoing emails and schedules automated reminder nudges for pending replies. | ⚙️ Configurable (OAuth) |
| **FR9** | **AI Email Draft Studio** | Converts bullet points, rough notes, or short prompts into polished, complete email drafts. | ✅ Production Ready |
| **FR10** | **Thread Intelligence & Insights** | Analyzes communication frequency, thread velocity, and sender response habits. | ⚙️ Configurable (OAuth) |
| **SEC** | **Phishing & Link Safety Shield** | Inspects sender SPF/DKIM authentication and audits embedded links against deceptive phishing domains. | ✅ Production Ready |

*Note: FR3 (Email Open Tracking) is deferred to protect user privacy.*

---

## System Architecture

```mermaid
flowchart TD
    subgraph Browser ["Chrome Browser / Gmail Client"]
        GM[Gmail UI / mail.google.com]
        CS["MailX Content Script (DOM Injected Bar)"]
        PU["MailX Popup SPA (React 18)"]
        SW["Background Service Worker (Manifest V3)"]
        SS[("chrome.storage.session (Ephemeral Cache)")]
        
        GM <--> CS
        CS <--> SW
        PU <--> SW
        SW <--> SS
    end

    subgraph Backend ["Local / Cloud Infrastructure"]
        API["FastAPI Proxy Backend (Port 8001)"]
        ZEN["OpenCode Zen API (Free High-Speed Models)"]
        SUPA[("Supabase PostgreSQL (RLS + Auth)")]
        
        SW -->|POST /chat (Sanitized Request)| API
        API -->|Secure API Key Proxy| ZEN
        ZEN -->|Structured JSON Response| API
        API -->|Relay Inference Result| SW
        SW <-->|Google OAuth & Task Sync| SUPA
    end
```

---

## Repository Structure

```text
CSE412/
├── backend/                  # FastAPI Python proxy backend
│   ├── main.py               # REST API endpoints (/health, /chat)
│   ├── requirements.txt      # Python dependencies
│   ├── Dockerfile            # Container build specification
│   ├── test_main.py          # Automated backend test suite
│   ├── .env.example          # Template for backend environment variables
│   └── .env                  # Local secret keys (gitignored)
├── extension/                # Chrome Extension (CRXJS + React + Vite)
│   ├── manifest.json         # Manifest V3 configuration
│   ├── vite.config.ts        # Pinned to port 5174 for CRXJS loader
│   ├── package.json          # Extension dependencies
│   ├── src/
│   │   ├── background/       # Service worker & API relay
│   │   ├── content/          # Gmail DOM injection scripts & styles
│   │   ├── popup/            # React SPA extension popup window
│   │   ├── ui/               # Modular UI components & feature panels
│   │   └── shared/           # Types, constants & cache utilities
│   └── dist/                 # Compiled extension output (Load Unpacked)
├── website/                  # Marketing & Product Showcase Website
│   ├── src/                  # React 18 + Vite modern UI components
│   ├── public/               # Static assets & mailx-extension.zip
│   ├── scripts/              # Automated extension zip bundling script
│   ├── vercel.json           # Vercel deployment configuration
│   └── package.json          # Website scripts & dependencies
├── supabase/                 # Database schema & migrations
│   └── schema.sql            # PostgreSQL schema with Row Level Security
├── documents/                # Architecture specifications, logs & reports
│   ├── MailX_Revised_Architecture_Plan.md
│   ├── PROJECT_STATUS.md
│   ├── IMPLEMENTATION_LOG.md
│   └── PERFORMANCE_AND_TOKEN_OPTIMIZATION_REPORT.md
├── AGENTS.md                 # Agent and LLM workspace guide
└── README.md                 # Project documentation
```

---

## Prerequisites

Before starting, ensure your system has:
- **Node.js**: `v22.x` to `v24.x` (with `npm 10+`)
- **Python**: `3.13.x`
- **Google Chrome** (or Chromium-based browser: Edge, Brave, Opera)
- **OpenCode Zen API Key**: Free API key from [opencode.ai/zen](https://opencode.ai/zen) (or DeepSeek API key)

---

## Quick Start & Local Setup

### 1. Clone Repository

```bash
git clone https://github.com/Sadik-Shahriar/MailX-Agent.git
cd MailX-Agent
```

---

### 2. Configure & Run Backend

The backend runs on **Port `8001`**.

```powershell
# Open Terminal 1: Backend
cd backend

# Install dependencies
python -m pip install -r requirements.txt

# Create your .env file
cp .env.example .env
```

Edit `backend/.env` and paste your OpenCode Zen key:
```env
ZEN_API_KEY=sk-your-zen-api-key-here
```

Start the FastAPI backend:
```powershell
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8001
```

Verify backend health:
```powershell
Invoke-WebRequest http://127.0.0.1:8001/health -UseBasicParsing
```
*Expected response:* `{"status":"ok"}` with HTTP `200`.

---

### 3. Configure & Run Extension

The extension development server is pinned to **Port `5174`** (do not change this port as CRXJS loader requires it).

```powershell
# Open Terminal 2: Extension
cd extension

# Install dependencies
npm ci

# Start the Vite development server
npm run dev
```

Verify extension entry point:
```powershell
Invoke-WebRequest http://127.0.0.1:5174/src/popup/index.html -UseBasicParsing
```
*Expected response:* HTTP `200`.

---

### 4. Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions`.
2. Toggle on **Developer mode** in the top-right corner.
3. Click **Load unpacked** and select the folder:
   ```text
   MailX-Agent/extension/dist
   ```
4. Open [Gmail](https://mail.google.com) and refresh the page.
5. Click on any email thread to see the injected MailX action capsule, or open the extension popup.

---

### 5. Run Marketing Website (Optional)

The website runs on **Port `3000`** and includes automatic bundling of `mailx-extension.zip`.

```powershell
# Open Terminal 3: Website
cd website

# Install dependencies
npm ci

# Start dev server
npm run dev
```

Visit: [http://localhost:3000/](http://localhost:3000/)

---

## Supabase & Google OAuth Configuration

MailX uses Supabase PostgreSQL for optional cloud task synchronization and Google OAuth login.

### Database Setup
1. Open your Supabase Project Dashboard $\rightarrow$ **SQL Editor**.
2. Paste and run the entire contents of [`supabase/schema.sql`](supabase/schema.sql).
3. Confirm that tables `preferences`, `tasks`, and `reminders` are created with RLS enabled.

### Google Cloud OAuth Setup
1. In Google Cloud Console $\rightarrow$ **APIs & Services** $\rightarrow$ Enable **Gmail API**.
2. In **OAuth consent screen**, set user type to **External** and add your test Gmail accounts.
3. In **Credentials**, create an OAuth 2.0 Client ID (Web Application):
   - **Authorized redirect URI**:
     ```text
     https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback
     ```
4. In Supabase Dashboard $\rightarrow$ **Authentication** $\rightarrow$ **Providers** $\rightarrow$ **Google**:
   - Enable Google provider and enter your Client ID & Secret.
5. In Supabase Dashboard $\rightarrow$ **URL Configuration** $\rightarrow$ **Redirect URLs**, add:
   ```text
   https://<YOUR_CHROME_EXTENSION_ID>.chromiumapp.org/
   ```

---

## Testing & Verification

### Run Backend Tests
```powershell
cd backend
python -m pytest test_main.py -v
```

### Run Extension Tests
```powershell
cd extension
npm test
```

### Build Production Bundles
```powershell
# Production build of Extension
cd extension
npm run build

# Production build of Website & Extension ZIP
cd website
npm run build
```

---

## Troubleshooting

| Problem | Cause | Solution |
|---|---|---|
| `Failed to fetch` in extension | Backend is not running or blocked | Ensure `python -m uvicorn main:app --port 8001` is running and `http://127.0.0.1:8001/health` returns `200`. |
| `Cannot connect to http://localhost:5174` | Vite dev server stopped or wrong port | Start `npm run dev` in `extension/`, verify port is `5174`, and reload the extension in `chrome://extensions`. |
| `No API key configured` | Missing key in `backend/.env` | Add `ZEN_API_KEY=...` in `backend/.env` and restart the backend server. |
| Google OAuth redirect error | Mismatched extension ID | Copy extension ID from `chrome://extensions` and add `https://<ID>.chromiumapp.org/` to Supabase Redirect URLs. |
| UI elements not showing in Gmail | Gmail DOM changed or stale script | Refresh the Gmail tab; if persistent, click the reload icon in `chrome://extensions` and refresh Gmail. |

---

## Engineering Team

**Department of Computer Science & Engineering, East West University**  
*Course: CSE412 Software Engineering (Section 5), Summer 2026*

| Name | Role | Responsibilities |
|---|---|---|
| **Raquib Uddin Sarkar** | **Fullstack + Tester** | Backend API proxy, LLM integration, automated testing suites |
| **Md. Sadik Shahriar** | **DevOps & Fullstack** | CI/CD pipelines, Supabase RLS infrastructure, Extension core & website |
| **Shahriar Mahabub Oishik** | **System Architect** | Architectural modeling, sequence diagrams & integration pipelines |
| **Chayan Das** | **Product Manager** | Requirements engineering, user stories, feature verification & roadmaps |

---

<div align="center">

Made with ❤️ by the **MailX Team** &bull; East West University

</div>
