# MailX \- AI Email Assistant

**Complete Design Document — All 10 Functional Requirements**

CSE412 Software Engineering, Section 5, Summer 2026

East West University

Team A: Raquib Uddin Sarkar, Md. Sadik Shahriar, Chayan Das, Shahriar Mahabub Oishik

Last Updated: June 30, 2026

# **Table of Contents**

  1\.  Architecture Overview

  2\.  FR1: AI Email Summarization

  3\.  FR2: Smart Reply Suggestions

  4\.  FR3: Email Open Tracking

  5\.  FR4: Priority Detection

  6\.  FR5: Task & Deadline Extraction

  7\.  FR6: Follow-Up Reminder System

  8\.  FR7: Spam Detection

  9\.  FR8: Phishing Link Detection

  10\.  FR9: AI Email Draft Generation

  11\.  FR10: Mail Statistics Analysis

# Architecture Overview

# **MailX — Design v1**

**Date**: June 27, 2026  
**Team**: Team-A (CSE412, Section 5, Summer 2026, East West University)

────────────────────────────────────────────────────────────

**1\. Architecture Overview**

**No user API keys** — the development team controls the backend and its LLM.

Extension (React/TS) ← HTTPS \+ auth token → FastAPI Backend ← Ollama ← open-source LLM (Phi-3-mini / Gemma 2B)

*   
  **No backend is required unless AI features need a proxy** — but in this design, the backend hosts the free open-source LLM.  
*   
  **Chrome Manifest V3** extension.  
*   
  **Backend**: Python FastAPI \+ Ollama for serving the LLM.  
* 

  ────────────────────────────────────────────────────────────

**2\. Features (10 Functional Requirements)**

────────────────────────────────────────────────────────────

| \# | Feature | How It Works |
| :---- | :---- | :---- |
| **FR1** | AI Email Summarization | Condenses lengthy emails into 2-3 bullet points |
| **FR2** | Smart Reply Suggestions | Generates 2-3 context-aware reply options |
| **FR3** | Email Open Tracking | Tracking pixel to detect when recipient opens an email |
| **FR4** | Priority Detection | Labels emails as High / Medium / Low automatically |
| **FR5** | Task & Deadline Extraction | Extracts action items and dates from email text |
| **FR6** | Follow-Up Reminder System | Chrome alarms notify user when follow-up is needed |
| **FR7** | Spam Detection | AI classifies incoming emails as spam or not |
| **FR8** | Phishing Link Detection | Scans URLs against blocklist \+ AI pattern check |
| **FR9** | AI Email Draft Generation | Generates full email drafts from user prompts |
| **FR10** | Mail Statistics Analysis | Dashboard of email patterns, response times, top senders |

**3\. User Interface**

Two independent interaction paths that call the same backend:

**3.1 Gmail Toolbar Buttons (Quick Actions)**

Injected directly into Gmail's toolbar. Each button makes a one-click API call. Works without chat.

Also injected:  
\- **Priority badges** (red/yellow/green) on inbox rows  
\- **Spam warnings** on spam-classified emails  
\- **Phishing toasts** when dangerous links detected

| Button | Action |
| :---- | :---- |
| **\[Summarize\]** | Summarizes the currently open email |
| **\[Reply\]** | Shows 3 suggested replies |
| **\[Draft\]** | Opens prompt input → generates draft |
| **\[Priority\]** | Re-classifies email priority |
| **\[Tasks\]** | Extracts tasks from email |
| **\[Track\]** | Toggles tracking pixel on outgoing email |
| **\[Mark Spam\]** | Flags email as spam \+ saves preference |
| **\[Not Spam\]** | Marks as safe \+ saves preference |

**3.2 Floating Chat Overlay**

A draggable chat sidebar rendered in a **closed shadow DOM** (isolated from Gmail's JS). User types natural language requests. Supports full conversation context.

**3.3 Extension Popup**

| User says | What happens |
| :---- | :---- |
| **"Summarize this"** | Instant summary |
| **"Summarize focusing on deadlines"** | Personalized summary |
| **"Draft a reply saying I'll be late and reschedule to Thursday"** | Tailored draft gen |
| **"These weekly newsletters are not spam"** | Preference saved |
| **"Be more aggressive with short links"** | Phishing sensitivity updated |

Standard Chrome popup with:  
\- **Settings**: Backend URL only (no API keys)  
\- **Stats Dashboard**: Charts showing email activity patterns

────────────────────────────────────────────────────────────

**4\. Backend**

**4.1 Stack**

**4.2 Endpoints**

| Component | Technology | License |
| :---- | :---- | :---- |
| **API framework** | FastAPI (Python) | MIT |
| **Model server** | Ollama | MIT |
| **LLM** | Phi-3-mini (3.8B) or Gemma 2B | MIT / Gemma license |

**4.3 Intent Routing**

| Endpoint | Purpose |
| :---- | :---- |
|  | Unified chat endpoint. Buttons call with ; chatbot sends full conversation. |
|  | Health check |

The unified  endpoint uses the LLM itself to classify intent from the user's message:

**4.4 Plugin Architecture**

User message \+ email context \+ conversation history \+ user preferences  
        │  
        ▼  
LLM classifies intent (summarize / reply / draft / spam / phish / priority / tasks / preference\_update)  
        │  
        ▼  
Routes to the appropriate plugin handler  
        │  
        ▼  
Returns structured response \+ action buttons

Each plugin registers its own route, prompt template, and validation. Adding a feature \= new folder \+ one import.

backend/plugins/  
├── chat/handler.py        \# Unified endpoint  
├── summarize/handler.py \+ prompts.py  
├── reply/handler.py \+ prompts.py  
├── draft/handler.py \+ prompts.py  
├── priority/handler.py \+ prompts.py  
├── tasks/handler.py \+ prompts.py  
├── spam/handler.py \+ prompts.py  
├── phishing/handler.py \+ prompts.py  
└── tracking/handler.py

────────────────────────────────────────────────────────────

**5\. Extension Frontend**

**5.1 Stack**

**5.2 File Structure**

| Component | Technology |
| :---- | :---- |
| **Build tool** | Vite \+ CRXJS |
| **Language** | TypeScript (strict mode) |
| **UI framework** | React 18 |
| **Styling** | CSS-in-JS (inline styles or vanilla CSS in shadow DOM) |
| **Storage** | chrome.storage.session (cache), chrome.storage.sync (preferences) |

────────────────────────────────────────────────────────────

extension/  
├── manifest.json  
├── vite.config.ts  
├── tsconfig.json  
├── package.json  
├── public/icons/  
└── src/  
    ├── background/        \# Service Worker  
    │   ├── index.ts       \# Message router  
    │   ├── api.ts         \# Backend HTTP client  
    │   ├── tracking.ts    \# Pixel injection \+ open detection  
    │   ├── reminders.ts   \# Chrome alarms  
    │   └── stats.ts       \# Email usage aggregation  
    ├── content/           \# Gmail injection  
    │   ├── index.ts       \# Entry point, detect Gmail  
    │   ├── Overlay.tsx    \# Floating container (shadow DOM, closed mode)  
    │   ├── ChatOverlay.tsx \# Chat messages \+ input  
    │   ├── GmailToolbar.tsx \# Toolbar button injection  
    │   └── ConversationManager.ts \# History \+ context  
    ├── popup/  
    │   ├── index.tsx  
    │   ├── App.tsx  
    │   └── views/  
    │       ├── Settings.tsx  
    │       └── Stats.tsx  
    └── shared/  
        ├── types.ts       \# Message contracts  
        ├── utils.ts  
        └── preferences.ts \# Spam/phish prefs (chrome.storage.sync)

**6\. Data Flow (End to End)**

**Example: Summarize via Toolbar Button**

**Example: Chat with Context**

User clicks \[Summarize\]  
  → Content script extracts email body (plain text)  
  → Sends message to Service Worker  
  → SW calls POST /api/v1/chat  
    Body: { message: "summarize this", email\_context: {...}, history: \[\], conversation\_id: "..." }  
    Header: Authorization: Bearer \<built-in-token\>  
  → Backend validates token, rate-limits, builds system prompt (includes user preferences)  
  → LLM classifies intent → routes to summarize plugin  
  → Summarize plugin calls Ollama with prompt: "Summarize this email in 2-3 bullets: {text}"  
  → Returns { intent: "summarize", response: "• Q3 budget approved\\n• Deadline: Aug 15", actions: \[...\] }  
  → SW caches result in chrome.storage.session  
  → Content script renders summary in overlay or popup

────────────────────────────────────────────────────────────

User types in chat: "Draft a reply saying I'll be late and reschedule to Thursday"  
  → ConversationManager attaches: email\_context \+ last 6 messages \+ user preferences  
  → POST /api/v1/chat with full history  
  → Backend sees intent \= "draft\_compose" \+ user's specific instructions  
  → Returns draft text \+ \[Send\] \[Copy\] \[Edit\] \[Regenerate\] action buttons

**7\. Scalability (Plugin Architecture)**

**Plugin registry** on both frontend () and backend ()

*   
  New feature \= new folder \+ register in registry. No changes to existing code.  
*   
  **AI adapter** interface allows swapping Ollama for any other provider via one class  
*   
  **Platform adapter** interface allows future support for Outlook, ProtonMail, etc.  
*   
  **Tiered storage**: chrome.storage.session → chrome.storage.local → IndexedDB (future)  
* 

  ────────────────────────────────────────────────────────────

**8\. Security**

**Manifest Permissions (Minimum)**

| Concern | Mitigation |
| :---- | :---- |
| **User API key leak** | No API keys on client side — team controls backend |
| **Extension auth token leak** | Baked into build, rotatable per deployment |
| **Email data in transit** | HTTPS only |
| **Backend data retention** | No persistent storage of email content (process and discard) |
| **Abuse / scraping** | Rate limiting (IP \+ token-level), request size limits |
| **LLM prompt injection** | Input sanitization on backend before LLM call |
| **XSS via email body** | Shadow DOM (closed mode), DOMPurify on all email content and AI output |
| **Content Script isolation** | Closed shadow DOM — Gmail JS cannot access MailX DOM |
| **CSP** | ; no ; no external CDN scripts |
| **Open-source model safety** | Phi-3 / Gemma have safety fine-tuning |

No , , or .

{  
  "permissions": \["storage", "alarms", "notifications"\],  
  "host\_permissions": \[  
    "https://mail.google.com/\*",  
    "\<backend-url\>/\*"  
  \]  
}

────────────────────────────────────────────────────────────

**9\. Personalization**

User teaches preferences via chat: *"mark this sender as safe"*, *"be more aggressive with short links"*

*   
  Preferences stored in  → synced across devices  
*   
  Injected into every LLM system prompt automatically  
* 

  **Preference Data Structure**

────────────────────────────────────────────────────────────

interface UserPreferences {  
  spam\_whitelist: string\[\];       // email addresses/senders  
  spam\_blacklist: string\[\];  
  phishing\_whitelist: string\[\];   // domains  
  phishing\_sensitivity: "low" | "default" | "high";  
  reply\_tone: "formal" | "casual" | "professional";  
}

**10\. Implementation Plan**

**Sprint 1: Backend Scaffold \+ Ollama**

FastAPI project setup

1.   
   Ollama installation \+ Phi-3-mini config  
2.   
   LLM client abstraction  
3.   
   Auth middleware \+ rate limiting  
4.   
   Unified  endpoint  
5.   
   Summarize plugin  
6.   
   Health check  
7.   
   **Verify**: curl returns summary  
8. 

   **Sprint 2: Extension Scaffold**

Vite \+ React \+ CRXJS setup

9.   
   Manifest V3 config  
10.   
    Service Worker skeleton  
11.   
    Content script injector (Gmail detection)  
12.   
    Floating overlay (shadow DOM)  
13.   
    Gmail toolbar button injection  
14.   
    Popup with settings  
15.   
    **Verify**: extension loads in Chrome  
16. 

    **Sprint 3: Chat UI \+ Core Features**

Chat interface in overlay

17.   
    Conversation manager  
18.   
    Wire toolbar buttons to API  
19.   
    Wire chat to API  
20.   
    Intent classification  
21.   
    Reply \+ Draft plugins  
22.   
    Priority \+ Tasks plugins  
23.   
    **Verify**: button and chat both work  
24. 

    **Sprint 4: Spam \+ Phishing \+ Personalization**

Spam classification plugin

25.   
    Phishing URL check plugin  
26.   
    Preference system  
27.   
    Preference sync via chrome.storage.sync  
28.   
    Inject preferences into system prompt  
29.   
    "Mark Spam" / "Not Spam" buttons  
30.   
    Spam badges on inbox  
31.   
    **Verify**: preferences persist and apply  
32. 

    **Sprint 5: Tracking \+ Follow-Ups \+ Stats**

Tracking pixel endpoint

33.   
    Pixel injection on sent emails  
34.   
    Follow-up reminder system (Chrome alarms)  
35.   
    Stats aggregation  
36.   
    Stats dashboard in popup  
37.   
    **Verify**: end-to-end tracking flow  
38. 

    **Sprint 6: Polish \+ Security Audit**

DOMPurify integration

39.   
    CSP hardening  
40.   
    Rate limit tuning  
41.   
    Error handling (timeout, network, model overload)  
42.   
    Loading states \+ retry buttons  
43.   
    README with setup instructions  
44. 

    ────────────────────────────────────────────────────────────

**11\. Key Design Decisions**

| Decision | Chosen | Reason |
| :---- | :---- | :---- |
| **AI Provider** | Free open-source LLM via Ollama (Phi-3-mini) | No API keys, no licensing fees, fully open-source |
| **Backend** | FastAPI \+ Ollama | Hosts LLM so users don't need API keys |
| **UI Integration** | Floating overlay (shadow DOM) \+ Gmail toolbar buttons | Two independent paths; buttons are fallback-safe |
| **Chat vs Buttons** | Both exist | Buttons \= quick one-click; Chat \= context-rich personalization |
| **Plugin Architecture** | Plugin registry on both frontend and backend | Scalable — new feature \= new folder |
| **User Preferences** | chrome.storage.sync | Roams across devices |
| **Auth** | Baked-in token per build | Simple, no user accounts needed for MVP |
| **Storage Strategy** | Tiered: session → local → IndexedDB (future) | Grows with data size |

# FR1: AI Email Summarization

# **FR1 — AI Email Summarization**

**Design Decision Date:** June 27, 2026  
**Status:** Approved

────────────────────────────────────────────────────────────

**Goal**

Condense the currently open email into 2-3 concise bullet points.

────────────────────────────────────────────────────────────

**Triggers**

────────────────────────────────────────────────────────────

| Path | Input |
| :---- | :---- |
| **Gmail toolbar \[Summarize\] button** | One-click on the open email |
| **Chat overlay** | "Summarize this" or "Summarize focusing on deadlines" |

**Architecture**

────────────────────────────────────────────────────────────

User clicks \[Summarize\]  
  → GmailToolbar.tsx triggers message to Service Worker  
  → SW checks OAuth token (refresh if expired)  
  → SW calls Gmail API: GET /gmail/v1/users/me/messages/{id}?format=full  
  → Extracts body from payload.parts\[\].body.data (base64 decoded)  
  → SW sends POST /api/v1/chat  
      Body: { message: "summarize", email\_context, history: \[\], conversation\_id }  
      Header: Authorization: Bearer \<built-in-token\>  
  → Backend validates token, rate-limits, builds system prompt  
  → LLM classifies intent → routes to summarize plugin  
  → Plugin calls Ollama with summarize prompt  
  → Returns { intent: "summarize", response: "• ...", actions: \[...\] }  
  → SW caches in chrome.storage.session (keyed by email\_id)  
  → Content script renders bullets in overlay or popup

**Component Details**

**Frontend**

**Backend**

| Component | File | Responsibility |
| :---- | :---- | :---- |
| **Toolbar Button** |  | Injects \[Summarize\] button into Gmail toolbar |
| **Email Fetcher** |  | Calls Gmail API to fetch full email body by ID |
| **Service Worker** |  | Message router: content script ↔ backend |
| **Chat Overlay** |  | Sends chat message with email\_context \+ history |
| **Cache** |  | Stores result in chrome.storage.session |

────────────────────────────────────────────────────────────

| Component | File | Responsibility |
| :---- | :---- | :---- |
| **Router** |  | Validates auth, rate-limits, routes to plugin |
| **Intent Classifier** | LLM call within chat handler | Classifies intent as "summarize" |
| **Plugin** |  | Builds prompt with email text \+ preferences |
| **Prompt Template** |  | "Summarize this email in 2-3 bullets: {body}" |
| **Response** | — | Structured JSON with response text \+ action buttons |

**Gmail API Usage**

────────────────────────────────────────────────────────────

| Detail | Value |
| :---- | :---- |
| **Scope** |  |
| **Endpoint** |  |
| **Auth flow** | with OAuth 2.0 |
| **Body extraction** | Decode  (base64url) or  for plain text |
| **Fallback** | If full body exceeds 5KB, fetch  and use snippet |

**Prompt Template**

────────────────────────────────────────────────────────────

System: You are MailX, an AI email assistant. Summarize the email concisely.  
User preferences: {reply\_tone, spam\_whitelist, phishing\_sensitivity}

User: Summarize this email in 2-3 bullet points.

From: {sender}  
Subject: {subject}  
Date: {date}  
Body:  
{email\_body}

Return ONLY bullet points, each starting with "•". Be factual and concise.

**Response Format**

────────────────────────────────────────────────────────────

{  
  "intent": "summarize",  
  "response": "• Q3 budget approved for $50K\\n• Deadline extended to Aug 15\\n• Team meeting rescheduled to Friday",  
  "email\_id": "192abc",  
  "actions": \[  
    { "label": "Copy", "action": "copy" },  
    { "label": "Regenerate", "action": "regenerate" }  
  \]  
}

**Caching Strategy**

────────────────────────────────────────────────────────────

| Layer | Key | TTL | Purpose |
| :---- | :---- | :---- | :---- |
| **chrome.storage.session** |  | Session (browser close) | Avoid re-summarizing same email |
| **Backend (optional)** |  | 5 minutes | Reduce Ollama calls for repeated requests |

**Edge Cases**

────────────────────────────────────────────────────────────

| Case | Handling |
| :---- | :---- |
| **Email body \> 4000 tokens** | Truncate to model context window, append |
| **Empty / welcome email** | Return: "This email contains no substantial content to summarize." |
| **Gmail API rate limit (403)** | Retry with exponential backoff (max 3 attempts) |
| **OAuth token expired** | with  for silent refresh |
| **Network timeout (\> 5s)** | Show error state with \[Retry\] button |
| **Ollama overload (503)** | Show: "AI server is busy. Please try again." |
| **Image-only email** | Extract alt text; if none, return: "No text content to summarize." |
| **Multipart email** | Parse text/plain part first; fallback to text/html stripped of tags |

**Security Considerations**

────────────────────────────────────────────────────────────

| Concern | Mitigation |
| :---- | :---- |
| **Email content in transit** | HTTPS \+ TLS 1.3 |
| **Email content on backend** | Process and discard — no persistent storage |
| **OAuth token leak** | Stored in chrome.storage.local (not accessible by content scripts) |
| **LLM prompt injection** | Input sanitization on backend before LLM call |
| **XSS via rendered summary** | DOMPurify on AI output before rendering in shadow DOM |

**Verification**

| Test | Expected |
| :---- | :---- |
| **Click \[Summarize\] on a long email** | 2-3 bullet points appear in overlay |
| **Type "Summarize this" in chat** | Same result via chat path |
| **Click \[Summarize\] on the same email twice** | Cached result (no API call to backend) |
| **Click \[Regenerate\]** | New API call with same email context |
| **Offline / no internet** | Error state with \[Retry\] shown |

# FR2: Smart Reply Suggestions

# **FR2 — Smart Reply Suggestions**

**Design Decision Date:** June 27, 2026  
**Status:** Approved

────────────────────────────────────────────────────────────

**Goal**

Generate 2-3 context-aware reply options for the currently open email. User selects one → text is injected into the Gmail reply textarea.

────────────────────────────────────────────────────────────

**Triggers**

────────────────────────────────────────────────────────────

| Path | Input |
| :---- | :---- |
| **Gmail toolbar \[Reply\] button** | One-click on the open email (email body fetched via Gmail API) |
| **Chat overlay** | "Suggest replies", "Reply saying I'll be late and reschedule", or "Make it more formal" |

**User Flow**

────────────────────────────────────────────────────────────

User opens email  
  → Clicks Gmail's native \[Reply\] button → inline reply textarea opens  
  → Clicks MailX \[Reply\] toolbar button  
  → 3 reply option cards appear in the shadow DOM overlay  
  → User clicks \[Select\] on one option  
  → Content script injects reply text into the open reply textarea  
  → User edits if needed → clicks Gmail \[Send\]

**Architecture**

────────────────────────────────────────────────────────────

User clicks MailX \[Reply\]  
  → Content script gets current email ID from Gmail DOM  
  → Service Worker checks OAuth token (refresh if expired)  
  → SW calls Gmail API: GET /gmail/v1/users/me/messages/{id}?format=full  
  → SW sends POST /api/v1/chat  
      Body: { message: "suggest\_replies", email\_context, history: \[\], conversation\_id }  
      Header: Authorization: Bearer \<built-in-token\>  
  → Backend validates token, rate-limits  
  → LLM classifies intent → routes to reply plugin  
  → Reply plugin builds prompt with email \+ preferences → calls AI adapter  
  → Returns { intent: "reply", responses: \["...", "...", "..."\], actions: \[...\] }  
  → SW caches in chrome.storage.session (key: reply\_{email\_id})  
  → Content script renders 3 cards in overlay

**Component Details**

**Frontend**

**Backend (via AI Adapter)**

| Component | File | Responsibility |
| :---- | :---- | :---- |
| **Toolbar Button** |  | Injects \[Reply\] button into Gmail toolbar |
| **Email Fetcher** |  | Calls Gmail API for full email body |
| **Service Worker** |  | Message router \+ OAuth management |
| **Reply Inserter** |  | Injects reply text into Gmail's reply textarea |
| **Chat Overlay** |  | Sends messages with conversation history |

────────────────────────────────────────────────────────────

| Component | File | Responsibility |
| :---- | :---- | :---- |
| **Router** |  | Unified entry point, auth, rate-limit |
| **Intent Classifier** | LLM call | Classifies intent as "reply" or "refine\_reply" |
| **Plugin Handler** |  | Builds prompt, calls adapter, parses response |
| **Prompt Template** |  | Reply generation prompt with tone preference |

**Gmail API Usage**

────────────────────────────────────────────────────────────

| Detail | Value |
| :---- | :---- |
| **Scope** | (same as FR1) |
| **Endpoint** |  |
| **Fetch only if needed** | Check cache first — if already fetched for FR1, reuse |
| **Reply injection** | No API call — pure DOM injection into reply textarea |

**DOM Injection Target**

The textarea is already open when user clicks Gmail's native Reply before triggering MailX. No new compose box creation needed. To, Subject, and thread context are handled by Gmail natively.

Selector: div\[role="textbox"\]\[aria-label\*="Reply"\]  
Action:   element.innerHTML \= reply\_text

────────────────────────────────────────────────────────────

**Prompt Template**

────────────────────────────────────────────────────────────

System: You are MailX, an email assistant. Generate 2-3 reply options.  
User preference: reply\_tone \= {formal|casual|professional}

Email from: {sender}  
Subject: {subject}  
Body:  
{email\_body}

Suggest 3 reply options labeled R1, R2, R3. Vary slightly in tone.  
Return as:  
R1: \<first option\>  
R2: \<second option\>  
R3: \<third option\>

**Response Format**

────────────────────────────────────────────────────────────

{  
  "intent": "reply",  
  "email\_id": "192abc",  
  "responses": \[  
    "Thank you for the update. I'll review and get back to you by Friday.",  
    "Got it, thanks\! I'll take a look and let you know.",  
    "Thanks for the heads up. Let me check and revert by Friday."  
  \],  
  "actions": \[  
    { "label": "Select", "action": "select" },  
    { "label": "Regenerate", "action": "regenerate" }  
  \]  
}

**Chat Refinement Flow**

────────────────────────────────────────────────────────────

User: "Make the second one more formal"  
  → SW sends POST /api/v1/chat with:  
      \- history: previous conversation (up to 5 turns)  
      \- message: "Make the second reply more formal"  
      \- email\_context: original email  
  → Backend classifies intent \= "refine\_reply"  
  → Regenerates the selected option with tone override  
  → Returns updated reply text

| Constraint | Value |
| :---- | :---- |
| **Max follow-up turns** | 5, then reset conversation |
| **Context included** | Last 6 messages \+ email body \+ preferences |
| **History reset trigger** | New email opened or manual clear |

**Caching**

────────────────────────────────────────────────────────────

| Layer | Key | TTL | Purpose |
| :---- | :---- | :---- | :---- |
| **chrome.storage.session** |  | Session | Avoid regenerating for same email |

**Edge Cases**

────────────────────────────────────────────────────────────

| Case | Handling |
| :---- | :---- |
| **No reply textarea open** | Show warning: "Please open Gmail's Reply first" |
| **Email is an auto-confirmation** | Return: "This appears to be automated — no reply needed." |
| **User replies to own email** | Include context: "This is a sent email, not received." |
| **Email body empty** | Return: "Cannot generate reply — email body is empty." |
| **Gmail API rate limit** | Retry with exponential backoff (max 3\) |
| **\[Regenerate\] clicked** | New API call with same context \+ fresh randomness |
| **Chat refinement exceeds 5 turns** | Reset history, inform user: "Starting fresh — please rephrase." |

**AI Adapter**

The reply plugin calls the **AIAdapter interface**, not Ollama directly. Switching providers requires zero changes to this plugin.

────────────────────────────────────────────────────────────

\# backend/plugins/reply/handler.py  
class ReplyPlugin(BasePlugin):  
    def \_\_init\_\_(self, adapter: AIAdapter):  
        self.adapter \= adapter

    async def handle(self, request):  
        prompt \= self.build\_prompt(request.email\_context, request.preferences)  
        response \= await self.adapter.generate(prompt, {"email\_id": request.email\_id})  
        return self.parse\_replies(response)

**Security**

| Concern | Mitigation |
| :---- | :---- |
| **Reply text injected into wrong email** | Inject only into textarea within the currently viewed email thread |
| **XSS via reply text** | DOMPurify on AI output before injection |
| **No Gmail compose scope needed** | DOM injection avoids broader OAuth permissions |

# FR3: Email Open Tracking

# **FR3 — Email Open Tracking**

**Design Decision Date:** June 30, 2026  
**Status:** Approved

────────────────────────────────────────────────────────────

**Goal**

Track whether a recipient has opened an email sent by the user. Show real-time open status (✓ sent / ✓✓ opened) next to every email in Gmail's Sent folder. Notify the user when an open event occurs.

────────────────────────────────────────────────────────────

**Triggers**

────────────────────────────────────────────────────────────

| Path | Input |
| :---- | :---- |
| **Gmail toolbar \[Track\] toggle** | Toggles tracking pixel injection on the outgoing email |
| **Sent folder auto-render** | Content script renders status icons automatically when user visits Sent Mail |
| **Automatic on Send** | If \[Track\] is ON, pixel is injected when user clicks Gmail's \[Send\] button |

**Status Icons in Sent Folder**

Hover tooltip: *"Opened 3 times • Last opened: Jun 30, 2026 at 2:15 PM"*

| Icon | Meaning | Backend Condition |
| :---- | :---- | :---- |
| **(no icon)** | Tracking was OFF when sent | No entry in |
| **✓ (gray)** | Sent, waiting for open | , |
| **✓✓ (blue)** | Recipient opened | , |
| **✓✓ (blue) \+  badge** | Opened multiple times |  |

────────────────────────────────────────────────────────────

**Architecture**

**Sent Folder Polling Flow**

User composes email (tracking toggled ON)  
  → Content script detects compose window \+ Send click  
  → Background SW generates:  
      tid \= uuid\_v4()  
      ts  \= Date.now()  
      sig \= HMAC-SHA256(secret, tid \+ ":" \+ ts)  
  → Content script injects into email body HTML:  
      \<img src="https://backend/api/v1/track/pixel?tid={tid}\&sig={sig}\&ts={ts}"  
           width="1" height="1" style="display:none" alt="" /\>  
  → SW stores { tid, email\_id, recipient, subject } in chrome.storage.session  
  → SW sends POST to backend to register the tracked email

Recipient opens email (images load)  
  → Gmail image proxy (or directly) fetches the pixel  
  → Backend validates: sig, ts replay window, dedup window  
  → Backend logs OpenEvent with confidence tier \+ source fingerprint  
  → Backend returns 1×1 transparent GIF with anti-cache headers

**Self-View Detection Flow**

User opens Gmail Sent Mail folder  
  → Content script MutationObserver detects email rows  
  → Content script reads data-message-id from each row  
  → Sends { type: "GET\_STATUS", email\_ids: \[...\] } to SW  
  → SW checks chrome.storage.session cache  
  → On miss: SW fetches GET /api/v1/track/status?ids=id1,id2  
  → SW returns statuses → content script renders ✓/✓✓ icons  
  → chrome.alarms (30s interval) polls for new opens  
  → On new open: chrome.notifications.create() \+ storage update

────────────────────────────────────────────────────────────

User opens their own sent email  
  → Content script scans thread images for pixel URLs  
  → Extracts tid from matched URL  
  → Compares sender with logged-in Gmail user  
  → If match: POST /api/v1/track/self-view { tid }  
  → Backend marks that OpenEvent as is\_self\_view \= 1  
  → Self-view events are excluded from open\_count

**Pixel URL Architecture (Signed)**

**URL Format**

**Token Generation (Extension Side)**

GET /api/v1/track/pixel?tid={uuid}\&sig={hmac}\&ts={unix\_ms}

**Backend Validation**

function generatePixelUrl(emailId, secret):  
  tid \= crypto.randomUUID()  
  ts  \= Date.now()  
  sig \= hmacSha256(secret, \`${tid}:${ts}\`)  
  return \`/api/v1/track/pixel?tid=${tid}\&sig=${sig}\&ts=${ts}\`

────────────────────────────────────────────────────────────

1\. Parse query params: tid, sig, ts  
2\. Reject if |ts \- now| \> 5 minutes (replay window)  
3\. Recompute sig \= HMAC-SHA256(secret, tid \+ ":" \+ ts)  
4\. Use constant-time comparison (hash\_equals)  
5\. Reject if mismatch → 403  
6\. Check dedup: skip if same tid logged within last 3 min  
7\. Fingerprint source (UA, IP range) → assign confidence tier  
8\. Log OpenEvent  
9\. Serve 1×1 GIF with anti-cache headers

**Component Details**

**Frontend**

**Backend**

| Component | File | Responsibility |
| :---- | :---- | :---- |
| **Compose Detector** |  | MutationObserver on compose window, intercept Send |
| **Toolbar Toggle** |  | Injects \[Track\] toggle next to Gmail's Send |
| **Pixel Injector** |  | Generates , tells content to inject |
| **Status Renderer** | (or new ) | Injects ✓/✓✓ icons into Sent folder rows |
| **Self-View Detector** |  | Scans pixel URLs in opened thread, reports self-view |
| **Status Poller** |  | Polls  every 30s via , updates storage |
| **Notifier** |  | on new open event |
| **Popup** |  | List of tracked emails with status, filterable |
| **HTTP Client** |  | All backend HTTP calls (register, status, self-view) |

────────────────────────────────────────────────────────────

| Component | File | Responsibility |
| :---- | :---- | :---- |
| **Pixel Endpoint** |  | Signature validation, dedup, fingerprint, serve GIF |
| **Status Endpoint** |  | Return open status for one or more email\_ids |
| **Self-View Endpoint** |  | Mark OpenEvent as self-view, recalculate open\_count |
| **Database** |  | SQLite schema \+ queries |
| **Dedup Engine** |  | 3-min sliding window, per tid |
| **Fingerprinter** |  | Detect Gmail proxy, Apple MPP, enterprise gateways |

**Backend Endpoints**

────────────────────────────────────────────────────────────

| Method | Endpoint | Purpose | Request | Response |
| :---- | :---- | :---- | :---- | :---- |
|  |  | Serve tracking pixel, log open | Query: | (1×1 transparent PNG) |
|  |  | Get open status(es) | Query:  or |  |
|  |  | Report self-view | Body: |  |
|  |  | Register a new tracked email | Body: |  |

**Database Schema (SQLite)**

**Confidence Tier Scoring**

CREATE TABLE tracked\_emails (  
  id TEXT PRIMARY KEY,            \-- tid (uuid)  
  email\_id TEXT NOT NULL,         \-- Gmail message ID  
  user\_id TEXT NOT NULL,          \-- user hash (derived from token)  
  recipient TEXT,                 \-- To: address  
  subject TEXT,                   \-- email subject  
  status TEXT DEFAULT 'sent',     \-- sent | opened  
  open\_count INTEGER DEFAULT 0,  
  high\_confidence\_count INTEGER DEFAULT 0, \-- opens tier \>= 2  
  created\_at INTEGER,             \-- unix ms  
  updated\_at INTEGER  
);

CREATE TABLE open\_events (  
  id INTEGER PRIMARY KEY AUTOINCREMENT,  
  tid TEXT NOT NULL REFERENCES tracked\_emails(id),  
  timestamp INTEGER,              \-- unix ms  
  ip TEXT,  
  user\_agent TEXT,  
  source TEXT,                    \-- human | gmail\_proxy | apple\_mpp | enterprise\_gateway | unknown  
  confidence\_tier INTEGER DEFAULT 3,  \-- 1 (certain human) to 5 (certain bot)  
  is\_self\_view INTEGER DEFAULT 0,  
  UNIQUE(tid, timestamp)          \-- prevent exact duplicates  
);

CREATE INDEX idx\_open\_events\_tid ON open\_events(tid);  
CREATE INDEX idx\_tracked\_emails\_user ON tracked\_emails(user\_id);

────────────────────────────────────────────────────────────

| Tier | Meaning | Signals |
| :---- | :---- | :---- |
| **1** | Certain human | Non-proxy UA, non-proxy IP, no pre-fetch headers |
| **2** | Likely human | Non-proxy UA, non-proxy IP, but timing is suspicious |
| **3** | Unknown (default) | No fingerprint match |
| **4** | Likely proxy | UA matches  or  MPP UA |
| **5** | Certain bot/scan | Known proxy IP range \+ proxy UA \+ delivery-time fetch |

**DOM Injection Targets**

**Sent Folder Status Icons**

**Compose Pixel Injection**

Folder:      Gmail Sent Mail (/\#sent)  
Row target:  div\[role="main"\] table\[role="list"\] tr\[data-message-id\]  
Inject into: td.yW (sender column) or td.xY (recipient column)  
Insert:      \<span class="mailx-status"   
                   title="Opened 2 times"   
                   data-status="opened"\>✓✓\</span\>

**Self-View Detection**

Target:   div\[role="dialog"\]\[aria-label\*="Compose"\] div\[contenteditable="true"\]  
Action:   Append \<img\> element as last child before Send

────────────────────────────────────────────────────────────

Target:   div\[role="main"\] div\[data-message-id\] img\[src\*="/track/pixel"\]  
Action:   Extract tid from src → compare sender → POST /self-view

**Notification Format**

────────────────────────────────────────────────────────────

{  
  type: "basic",  
  iconUrl: "icons/icon-48.png",  
  title: "📬 Email Opened",  
  message: "John Doe opened: 'Q3 Budget Review'",  
  contextMessage: "Opened 2 times • Desktop" // optional source  
}

**Caching Strategy**

────────────────────────────────────────────────────────────

| Layer | Key | TTL | Purpose |
| :---- | :---- | :---- | :---- |
| **chrome.storage.session** |  | Session | Sent folder status cache |
| **chrome.storage.session** |  | 30s | Avoid duplicate polls |
| **Backend SQLite** |  | Permanent | Open count \+ history |
| **Backend in-memory** | dedup set | 3 min sliding | Recent tid per recipient |

**Edge Cases**

────────────────────────────────────────────────────────────

| Case | Handling |
| :---- | :---- |
| **Images blocked by recipient** | Tracking won't work — show note in UI: "Open tracking requires image loading" |
| **Gmail image proxy pre-fetch** | Detect  UA \+ Google IP range → Tier 4-5. Exclude from high-confidence count |
| **Apple Mail Privacy Protection** | Detect  MPP UA \+ pre-fetch timing → Tier 4\. Exclude from high-confidence count |
| **Enterprise gateway sandbox** | Detect Proofpoint/Mimecast/Defender IPs → Tier 5\. Exclude entirely |
| **User opens own sent email** | Self-view detection via content script → marked  in DB |
| **Recipient opens multiple times** | Each open logged;  incremented. Dedup window prevents double-counts within 3 min |
| **Recipient forwards email** | Forwarder's client loads pixel → logged as additional open (different IP/UA) |
| **Pixel URL replayed / forged** | HMAC signature prevents forgery; ts replay window (5 min) prevents reuse |
| **Gmail plain text mode** | HTML is stripped — pixel not injected. Show warning in toolbar: "Tracking requires HTML mode" |
| **Email sent without \[Track\] toggle** | No pixel injected, no  entry. No icon shown in sent folder |
| **Backend unavailable at pixel load** | Recipient sees broken image. Acceptable — no open logged |
| **Very long email body** | No impact — pixel is a single  tag |
| **No reply textarea open** | Not applicable (FR3 is about sent tracking, not reply) |

**Security**

────────────────────────────────────────────────────────────

| Concern | Mitigation |
| :---- | :---- |
| **Forged open events** | HMAC-SHA256 signature on pixel URL. Reject invalid sigs before any DB write |
| **Replay attack** | Timestamp window (5 min). Duplicate  rejected via UNIQUE constraint |
| **TID enumeration** | UUIDv4 (128-bit random). 2^122 possible values |
| **IP logging / recipient privacy** | Log IP only for confidence scoring. Hash after 30 days |
| **Extension auth token leak** | Baked into build, rotatable per deployment |
| **Email data in transit** | HTTPS \+ TLS 1.3 |
| **XSS via rendered status icons** | Status text is server-controlled enum (/). No raw strings rendered |
| **Data retention** | No email body stored. Only metadata (tid, email\_id, status, recipient, subject) |
| **Abuse / scraping** | Rate limit: 100 pixel requests/min per IP. 403 on invalid sigs |

**Verification**

────────────────────────────────────────────────────────────

| Test | Expected |
| :---- | :---- |
| **Toggle \[Track\] ON, send email → inspect email body HTML** | tag with valid  present |
| **Open sent email from another account** | Open event logged in Backend, |
| **Open same email 3 times** | , 3 events in |
| **Visit Sent folder** | ✓✓ (blue) icon appears next to opened email, ✓ (gray) next to pending |
| **Hover over ✓✓ icon** | Tooltip shows "Opened 3 times • Last opened: ..." |
| **User opens own sent email** | Self-view event logged,  NOT incremented |
| **Polling: wait 30s after opening** | Chrome notification appears with recipient name \+ subject |
| **Send email with \[Track\] OFF** | No pixel in body, no status icon in sent folder |
| **Forge pixel URL with wrong sig** | Backend returns 403, no DB write |
| **Replay pixel URL after 5 min** | Rejected (ts out of window) |
| **Recipient with images blocked** | No open logged (expected limitation) |
| **Gmail proxy pre-fetch** | Logged as Tier 4, excluded from high-confidence count |

**Dependencies Between FRs**

────────────────────────────────────────────────────────────

| FR | Relationship |
| :---- | :---- |
| **FR6 (Follow-Up Reminders)** | Consumes FR3's  data — if email opened but no reply in 3 days, trigger reminder |
| **FR10 (Mail Statistics)** | Consumes FR3's  for "open rate" and "best time to send" analytics |
| **FR4 (Priority Detection)** | Opens from an important sender may influence priority score |

**Implementation Plan (within Sprint 5\)**

| Step | Task | Depends on |
| :---- | :---- | :---- |
| **1** | Create SQLite schema ( \+  tables) | — |
| **2** | Implement pixel endpoint with HMAC validation \+ anti-cache headers \+ serve GIF | Step 1 |
| **3** | Implement confidence-tier fingerprinting (Gmail proxy, Apple MPP, etc.) | Step 2 |
| **4** | Implement status query endpoint () | Step 1 |
| **5** | Implement self-view endpoint () | Step 1 |
| **6** | Extension: generate signed pixel URL in background SW | — |
| **7** | Extension: inject  into compose body on Send | Step 6 |
| **8** | Extension: sent folder status icons (MutationObserver \+ injection) | Step 4 |
| **9** | Extension: status polling via  (30s) | Step 4 |
| **10** | Extension: self-view detection \+ report | Step 5 |
| **11** | Extension: Chrome notifications on new open | Step 9 |
| **12** | Verify: end-to-end: send → open → status icon → notification | All steps |

# FR4: Priority Detection

# **FR4 — AI Priority Detection**

**Design Decision Date:** June 30, 2026  
**Status:** Approved

────────────────────────────────────────────────────────────

**Goal**

Automatically label every email in your Gmail inbox as **High (red)**, **Medium (yellow)**, or **Low (green)** priority so you instantly know what needs attention.

Badges appear on inbox rows (like Gmail's importance marker) and update as the AI learns your preferences.

────────────────────────────────────────────────────────────

**What It Looks Like**

Each badge is a small colored dot or letter injected next to the sender name in Gmail's inbox list.

| Priority | Badge Color | Meaning |
| :---- | :---- | :---- |
| **High** | 🔴 Red | Needs attention today — urgent deadline, direct question, important sender |
| **Medium** | 🟡 Yellow | Worth reading this week — informational but may need a response |
| **Low** | 🟢 Green | Can wait — newsletter, notification, automated, no reply needed |

────────────────────────────────────────────────────────────

**How It Works (Plain English)**

**Step-by-step flow**

**What the AI looks at to decide priority**

1\. You open Gmail inbox  
2\. Extension reads each email's sender, subject, and preview (NOT full body)  
3\. Checks cache — already classified? Show badge immediately  
4\. Not cached? Sends batch to MailX backend AI  
5\. AI classifies: High / Medium / Low  
6\. Color badge appears on each inbox row  
7\. As you scroll, newly visible emails get classified too  
8\. If you disagree → click \[Priority\] button → re-classifies with full email body

────────────────────────────────────────────────────────────

| Signal | High Priority Example | Low Priority Example |
| :---- | :---- | :---- |
| **Who sent it** | Your boss, a client, someone you reply to quickly | noreply@, newsletter, automated system |
| **Urgency words** | "Deadline", "ASAP", "by EOD", "urgent" | "Weekly update", "thought you'd like" |
| **What they want** | "Please respond", "Can you review?" | FYI, informational, no reply needed |
| **Follow-up pattern** | "Following up again", 3rd message | First contact, cold email |
| **Your role** | "To:" you, direct question | "CC:" you, broadcast |

**Two Stage Pipeline**

Research shows best results come from a two-step process:

**Why two stages?** An FYI from the CEO is important but not urgent (High importance, Low urgency). A client asking "please fix by 3pm" is both important and urgent. Separating the two gives better results.

Stage 1 — Category (what type of email?)  
  → Action Required | FYI | Scheduling | Follow-Up | Newsletter/Spam

Stage 2 — Priority (how urgent is it?)  
  → High | Medium | Low

**For MVP:** The system does both in one LLM call for speed. The category is stored internally for future use (FR10 statistics) but not displayed yet.

────────────────────────────────────────────────────────────

**Learning From You (Behavioral Feedback)**

This is the key improvement over a simple AI prompt. The system watches your behavior and gets smarter over time.

**What it tracks per sender**

**Sender importance score**

| Data Point | How It's Used |
| :---- | :---- |
| **How many times you've replied to this sender** | More replies \= higher importance score |
| **How fast you typically reply** | Replying within minutes \= auto-promote to High |
| **How often you open their emails right away** | Immediate open \= important sender signal |
| **When you re-classify their email** | "I said Low, but you said High" \= update sender score |

The score updates after every action you take. No manual work needed.

Each sender gets a score from 0-100:  
  50 \= default (new sender)  
  80+ \= auto-High (you reply fast, often)  
  30- \= auto-Low (you archive unread, never reply)

**Static rules still supported**

User can also set fixed rules in settings:

"Always High from boss@company.com"

*   
  "Always Low from noreply@\*"  
*   
  "Always Low from newsletters@"  
* 

  Rules override the AI score.

────────────────────────────────────────────────────────────

**Triggers**

────────────────────────────────────────────────────────────

| Path | Input | What Happens |
| :---- | :---- | :---- |
| **Inbox load** | All visible email rows | Sender \+ subject \+ snippet sent to AI. Badges appear |
| **Scroll** | New rows enter viewport | Same as above (lazy load) |
| **Toolbar \[Priority\] button** | Currently open email | Full body sent to AI for re-classification |
| **Chat overlay** | "Why is this High?" or "Mark this Low" | Re-classifies \+ updates sender score |
| **Sender rule change** | User edits rules in settings | Re-classifies matching emails immediately |

**Architecture**

**Frontend**

**Backend**

| Component | File | Responsibility |
| :---- | :---- | :---- |
| **Inbox Scanner** |  | MutationObserver watches inbox rows → extracts , sender, subject, snippet |
| **Badge Renderer** |  | Injects colored badge into sender column () |
| **Toolbar Button** |  | \[Priority\] button → re-classifies open email with full body |
| **Batch Classifier** |  | Collects uncached emails → sends batch to backend (max 3 per call) |
| **Cache** |  | Stores  in |
| **Sender Tracker** | or new | Tracks reply count, response time per sender in |
| **User Rules** |  | Sender override rules stored in |

**Data Flow**

| Component | File | Responsibility |
| :---- | :---- | :---- |
| **Plugin Handler** |  | Builds prompt, calls AI adapter, parses JSON response |
| **Prompt Template** |  | System prompt with category \+ priority definitions |
| **Sender Score Injection** |  | Merges sender importance score \+ user rules into prompt |

────────────────────────────────────────────────────────────

Inbox rows visible  
  → Content script: \[{ id, sender, subject, snippet }, ...\]  
  → Background SW: check cache → collect uncached  
  → POST /api/v1/chat  
      Body: {  
        intent: "priority",  
        emails: \[max 3\],  
        sender\_scores: { "boss@c": 90, "noreply@x": 10 }  
      }  
  → Backend routes to priority plugin  
  → LLM returns: \[{ id, category, priority, confidence }\]  
  → Cache in chrome.storage.session  
  → Render badges

**Backend Endpoint (Reuses Unified Chat)**

No new route needed — follows the existing plugin architecture.

| Method | Endpoint | Purpose |
| :---- | :---- | :---- |
|  |  | Unified endpoint. Intent  dispatches to priority plugin |

────────────────────────────────────────────────────────────

**Prompt Template**

────────────────────────────────────────────────────────────

System: You are MailX, an email assistant.

Step 1 — Classify the email category:  
\- action\_required: needs a response or decision  
\- fyi: informational, no reply needed  
\- scheduling: meeting requests, calendar invites  
\- follow\_up: second+ message on a thread you haven't answered  
\- newsletter: automated, marketing, promotional  
\- transaction: receipt, notification, account activity

Step 2 — Assign priority (high / medium / low):  
HIGH \= needs attention today, urgent deadline, direct question  
MEDIUM \= read this week, may need response  
LOW \= can wait, newsletter, automated, no action needed

Sender: {sender}  
Subject: {subject}  
Snippet: {snippet}  
Sender importance score: {score}/100  
Thread: age={days}d, messages={count}, you\_owe\_reply={yes/no}  
User rules: {rules}

Return JSON:  
{ "category": "...", "priority": "high"|"medium"|"low", "confidence": 0.0-1.0 }

**Caching**

────────────────────────────────────────────────────────────

| Layer | Key | TTL | Purpose |
| :---- | :---- | :---- | :---- |
| **chrome.storage.session** |  | Session (browser close) | Avoid re-classifying same email |
| **chrome.storage.sync** |  | Permanent | Per-sender importance score, synced across devices |
| **chrome.storage.sync** |  | Permanent | User's static sender override rules |

**Edge Cases**

────────────────────────────────────────────────────────────

| Case | Handling |
| :---- | :---- |
| **No badge shown** | Confidence \< 0.6 → no badge (better than wrong badge) |
| **New sender, no history** | Default score 50 → let AI decide from content alone |
| **User re-classifies** | Update cache \+ update sender score \+ store as training signal |
| **50 emails in inbox** | Classify first 20 visible rows only. Lazy-classify on scroll |
| **Offline / no backend** | Show badges from cache only. If none cached, show nothing |
| **Same email in multiple folders** | Cache keyed by  → single classification |
| **Gmail labels change** | Badges re-render when MutationObserver detects DOM change |
| **Sender in user rules** | Skip LLM entirely. Return rule value immediately |
| **LLM returns bad JSON** | Retry once. Fallback: |
| **Spam detected (FR7)** | Priority badge hidden — spam overrides priority |

**User Preferences (chrome.storage.sync)**

────────────────────────────────────────────────────────────

interface PriorityPreferences {  
  senderRules: {  
    \[email\_or\_domain: string\]: "high" | "medium" | "low" | "default"  
  },  
  senderScores: {  
    \[email: string\]: {  
      score: number,           // 0-100  
      replyCount: number,  
      medianResponseMs: number,  
      lastInteraction: number  // epoch ms  
    }  
  },  
  showConfidence: boolean,     // default false  
  autoHighThreshold: number    // score above this \= auto-High, default 80  
}

**Verification**

────────────────────────────────────────────────────────────

| Test | Expected |
| :---- | :---- |
| **Open Gmail inbox** | Color badges appear on inbox rows within 2 seconds |
| **Hover over red badge** | Tooltip: "High priority" |
| **Scroll down in inbox** | Newly visible rows get badges within 1 second |
| **Open email → click \[Priority\]** | Badge updates (may differ from initial) |
| **Reply to same sender 3 times fast** | Sender score rises → future emails auto-High |
| **Add rule "always Low from noreply@"** | Emails from noreply@ show green badge immediately (no API call) |
| **Re-open Gmail (same session)** | Badges load from cache (no re-classification) |
| **Close and reopen browser** | Badges re-fetched from backend (session cleared) |
| **Offline mode** | No badges for uncached emails. Rule-based ones still work |
| **Mark a High email as Low** | Sender score decreases → future emails from same sender score lower |

**Dependencies**

| FR | Relationship |
| :---- | :---- |
| **FR7 (Spam Detection)** | If FR7 marks email as spam, FR4 badge is hidden |
| **FR10 (Mail Statistics)** | Consumes FR4's priority data for "priority breakdown" charts |
| **FR5 (Task Extraction)** | High-priority action-required emails likely contain tasks |

# FR5: Task & Deadline Extraction

# **FR5 — Task & Deadline Extraction**

**Design Decision Date:** June 30, 2026  
**Status:** Approved

────────────────────────────────────────────────────────────

**Goal**

Extract tasks, action items, and deadlines from email text. Present them as a checklist when the user clicks the **\[Tasks\]** toolbar button or asks via chat.

────────────────────────────────────────────────────────────

**What It Extracts**

**What It Does NOT Do (MVP)**

| Field | Example | How It's Detected |
| :---- | :---- | :---- |
| **Task description** | "Send Q3 revenue report" | Explicit: "Please send...", "Can you review...", "I need..." |
| **Assignee** | "me", "John", "team" | "@" mentions, "I'll", "you need to", "we should" |
| **Due date** | "2026-07-10" | Explicit date or relative ("by Friday", "EOD", "next week") |
| **Priority** | high / medium / low | Urgency language \+ sender importance |
| **Source email** | Gmail message ID | Link back to original email |
| **Status** | pending / completed | Toggled by user clicking checkbox |

❌ Sync to Google Tasks / Todoist / Notion

*   
  ❌ Parse PDF or image attachments for tasks  
*   
  ❌ Auto-create calendar events  
*   
  ❌ Detect tasks from your own sent emails (outgoing)  
* 

  ────────────────────────────────────────────────────────────

**Triggers**

────────────────────────────────────────────────────────────

| Path | Input | What Happens |
| :---- | :---- | :---- |
| **Toolbar \[Tasks\] button** | Currently open email | Sends full body \+ thread context → returns task list |
| **Chat overlay** | "What are my tasks?", "Extract tasks" | Same result visible in chat |
| **Auto (future)** | High-priority email (FR4) | Background extraction without user action |

**UI**

**Toolbar Button**

**Task Overlay (on click)**

\[Summarize\] \[Reply\] \[Draft\] \[Priority\] \[Tasks\] \[Track\] ...  
                                           ↑  
                                      Badge: "3"  (unresolved count)

Slide-in panel in the shadow DOM:

**Hover on any task** → tooltip shows source email subject \+ sender.

┌─────────────────────────────────────┐  
│ 📋 Tasks from this email (3)        │  
├─────────────────────────────────────┤  
│ ☐ Send Q3 report        Jul 10  🔴  │  
│ ☐ Schedule review meeting      🟡   │  
│ ☑ Confirm attendance       Jul 8  🟢│  
│                                     │  
│ \[+ Add to Google Tasks\] (future)    │  
└─────────────────────────────────────┘

| Element | Detail |
| :---- | :---- |
| **Checkbox** | Click to toggle  ↔ |
| **Description** | The task text |
| **Date badge** | Shows due date if present, otherwise nothing |
| **Priority dot** | 🔴 High / 🟡 Medium / 🟢 Low |
| **Strikethrough** | Crosses out completed tasks |

────────────────────────────────────────────────────────────

**Architecture**

────────────────────────────────────────────────────────────

User opens email → clicks \[Tasks\]  
  → Content script extracts:  
      \- email\_id, sender, subject, full body  
      \- last 3 messages from thread (for context)  
  → Sends to SW: { type: "EXTRACT\_TASKS", email\_context }  
  → SW calls POST /api/v1/chat  
      Body: {  
        intent: "tasks",  
        email\_context: { id, sender, subject, body, thread\_messages },  
        preferences: {},  
        today: "2026-07-02"  
      }  
  → Backend routes to tasks plugin  
  → LLM returns JSON array of tasks  
  → SW stores in chrome.storage.local  
      Key: "tasks" → StoredTask\[\]  
  → Updates toolbar badge count  
  → Content script renders checklist in overlay

User checks a task  
  → Content script sends { type: "TOGGLE\_TASK", task\_id }  
  → SW updates chrome.storage.local  
  → Badge count recalculated

**Prompt Template**

────────────────────────────────────────────────────────────

System: You are MailX, an email assistant. Extract tasks from emails.  
Today's date is {today}.

Extract action items that require the reader to do something.

For each task return:  
\- description: what needs to be done (specific and concrete)  
\- assignee: "me" if directed at reader, otherwise the person's name  
\- dueDate: absolute date YYYY-MM-DD. Convert relative dates   
           ("by Friday", "EOD", "next week") using today's date.  
           null if no deadline.  
\- priority: "high" | "medium" | "low"

Rules:  
\- "Please send..." → task for "me" with due date if mentioned  
\- "Can you review..." → task for "me"  
\- "I'll handle..." → task for sender (assignee \= sender name), not "me"  
\- "Following up on..." → existing task, not a new one  
\- Ignore signatures, footers, unsubscribe links, disclaimer blocks  
\- One item per distinct action. "Send report AND schedule meeting" \= 2 tasks  
\- Each item must be concrete. "Look into X" is not a task.  
  "Produce draft proposal for X by Friday" is.

Email from: {sender}  
Subject: {subject}  
Body:  
{body}

Return ONLY a JSON array. No markdown, no explanation.  
\[  
  {  
    "description": "string",  
    "assignee": "me" | "string",  
    "dueDate": "YYYY-MM-DD" | null,  
    "priority": "high" | "medium" | "low",  
    "status": "pending"  
  }  
\]

**Backend**

*Reuses unified  endpoint. Intent  routes here.*

| Component | File | Responsibility |
| :---- | :---- | :---- |
| **Plugin Handler** |  | Builds prompt, calls AI adapter, validates JSON array |
| **Prompt Template** |  | Task extraction system prompt |
| **Date Resolver** | (built into prompt) | LLM converts relative dates using  context |

────────────────────────────────────────────────────────────

**Frontend**

────────────────────────────────────────────────────────────

| Component | File | Responsibility |
| :---- | :---- | :---- |
| **Toolbar Button** |  | \[Tasks\] button with badge count |
| **Task Overlay** |  | Checklist UI with checkboxes |
| **Task Store** |  | chrome.storage.local CRUD |
| **Badge Counter** |  | Updates toolbar badge via |
| **Chat Integration** |  | "What are my tasks?" → returns pending tasks |

**Storage**

────────────────────────────────────────────────────────────

// chrome.storage.local — persists across browser restarts  
interface StoredTask {  
  id: string,                    // uuid v4  
  email\_id: string,              // Gmail message ID (source)  
  description: string,  
  assignee: string,              // "me" or person's name  
  dueDate: string | null,        // "YYYY-MM-DD"  
  priority: "high" | "medium" | "low",  
  status: "pending" | "completed" | "dismissed",  
  createdAt: number,             // epoch ms  
  completedAt: number | null,  
  sourceSubject: string,         // for tooltip display  
  sourceSender: string  
}

// Stored as a flat list: { tasks: StoredTask\[\] }  
// Maximum: 200 tasks (auto-clean completed tasks older than 30 days)

**Edge Cases**

────────────────────────────────────────────────────────────

| Case | Handling |
| :---- | :---- |
| **No tasks in email** | Return empty array. Show "No tasks found" in overlay |
| **Multiple explicit requests** | Each is a separate task item |
| **"I'll handle it" (sender does it)** | Include but , not "me" |
| **Cancelled / rescheduled** | Detect "cancel", "reschedule", "postpone" → skip that task |
| **Thread with 10 messages** | Send last 3 messages \+ the current one for context |
| **Relative date "by Friday"** | LLM resolves to absolute date using  in prompt |
| **Heavy email (20+ tasks)** | Cap at max 10 tasks per email |
| **Non-English email** | LLM may still work; MVP assumes English |
| **User checks a task** | Toggle status in chrome.storage.local. Persists on refresh |
| **Same email extracted twice** | De-duplicate by |
| **Task completed → dismissed** | Auto-purge after 30 days to keep storage small |
| **No internet** | Show cached tasks from chrome.storage.local. Extraction disabled |

**Dependencies**

────────────────────────────────────────────────────────────

| FR | Relationship |
| :---- | :---- |
| **FR4 (Priority)** | High-priority action-required emails should auto-extract tasks (future). Task priority color matches FR4 badge colors |
| **FR6 (Follow-Up Reminders)** | FR5's  \+  feeds FR6. Tasks due within 24h trigger a reminder |
| **FR10 (Statistics)** | Task completion rate, avg tasks per email, busiest senders |

**Verification**

| Test | Expected |
| :---- | :---- |
| **Open email with "Please send report by Friday" → click \[Tasks\]** | 1 task: "Send report", due date \= resolved Friday's date, priority medium |
| **Open email with 3 explicit requests** | 3 separate task items returned |
| **Open email with no action items** | "No tasks found" |
| **Open email with "Can you review the budget?"** | Task: "Review budget", assignee \= "me" |
| **Open email with "I'll handle the presentation"** | Task present, assignee \= sender's name, not "me" |
| **Click checkbox on a task** | Strikethrough appears. Badge count decreases |
| **Refresh Gmail → click \[Tasks\] on same email** | Task is still checked (persisted) |
| **Chat: "What are my tasks?"** | Returns list of all pending tasks across all emails |
| **\[Tasks\] button shows badge** | Badge \= number of tasks with status "pending" |
| **Extract tasks from same email twice** | No duplicate tasks in storage |

# FR6: Follow-Up Reminder System

# **FR6 — Follow-Up Reminder System**

**Design Decision Date:** June 30, 2026  
**Status:** Approved

────────────────────────────────────────────────────────────

**Goal**

Notify the user when follow-up is needed. Two scenarios:

────────────────────────────────────────────────────────────

| Scenario | Trigger | Source |
| :---- | :---- | :---- |
| **Sent, no reply** | You sent an email → N days passed → no response | Gmail API thread check |
| **Task deadline** | FR5 task is due within 24h or is overdue |  |

**How It Works (Plain English)**

────────────────────────────────────────────────────────────

Every hour, MailX checks two things:

1\. Your sent folder — any emails from last 30 days with no reply?  
   → For each, look at the thread. If the other person replied → skip.  
   → If no reply after 3+ days → create a reminder.

2\. Your FR5 tasks — any due soon?  
   → Tasks due tomorrow → "remind me".  
   → Tasks overdue → "you're late".

MailX shows a Chrome notification and a badge count on the extension icon.  
When a reply finally arrives, the reminder auto-disappears.

**Reply Detection (Gmail API)**

No header parsing needed — simpler check: thread has \>1 message with different sender.

Every hour (chrome.alarms):  
  1\. GET gmail/v1/users/me/messages?q=in:sent newer\_than:30d  
  2\. For each sent message, get its threadId  
  3\. GET gmail/v1/users/me/threads/{threadId}?format=minimal  
  4\. Check: does the thread have messages from someone other than me?  
  5\. Yes → reply exists → auto-dismiss reminder  
  6\. No  → no reply → create/show reminder if age \> threshold

────────────────────────────────────────────────────────────

**Reminder Types**

────────────────────────────────────────────────────────────

| Type | Condition | Notification Text |
| :---- | :---- | :---- |
|  | Sent \> N days ago, no reply detected | "john@ emailed 5 days ago — still no reply" |
|  | FR5 task with | "Task 'Send report' is due tomorrow" |
|  | FR5 task with | "Task 'Submit proposal' was due 2 days ago" |

**Triggers**

────────────────────────────────────────────────────────────

| Path | Action |
| :---- | :---- |
| **Chrome alarm (every 60 min)** | Background SW runs check → notifications \+ badge |
| **Extension icon click (popup)** | Shows current reminders list |
| **Reply arrives** | Auto-dismisses reminder at next alarm check |
| **Task checked complete** | Reminder auto-removed at next alarm check |

**Architecture**

────────────────────────────────────────────────────────────

chrome.alarms.create("followUpCheck", { periodInMinutes: 60 })

chrome.alarms.onAlarm.addListener(async (alarm) \=\> {  
  if (alarm.name \!== "followUpCheck") return;

  // Step 1: Sent emails with no reply  
  const sentThreads \= await gmailApi.getSentThreads(30); // last 30 days  
  for (const thread of sentThreads) {  
    const hasReply \= thread.messages.some(m \=\> m.from \!== me);  
    if (\!hasReply && daysSince(thread.lastSentDate) \>= reminderDays) {  
      createReminder("sent\_no\_reply", thread);  
    }  
    if (hasReply) {  
      dismissReminder(thread.id);  
    }  
  }

  // Step 2: FR5 tasks due  
  const tasks \= await chrome.storage.local.get("tasks");  
  for (const task of tasks.filter(t \=\> t.status \=== "pending")) {  
    if (task.dueDate \=== tomorrow) {  
      createReminder("task\_due\_soon", task);  
    }  
    if (task.dueDate \< today) {  
      createReminder("task\_overdue", task);  
    }  
    if (task.status \=== "completed") {  
      dismissReminder(task.id);  
    }  
  }

  // Step 3: Show notifications for new reminders  
  // Step 4: Update badge count  
  await updateNotifications();  
  await updateBadge();  
});

**Storage**

────────────────────────────────────────────────────────────

// chrome.storage.local  
interface FollowUpItem {  
  id: string,                    // uuid  
  type: "sent\_no\_reply" | "task\_due\_soon" | "task\_overdue",  
  sourceId: string,              // email\_id or task\_id  
  subject: string,               // email subject / task description  
  recipientName: string,         // who to follow up with  
  sentDate: number,              // epoch ms  
  daysWaiting: number,  
  lastNotified: number | null,   // epoch ms — avoid re-notifying  
  dismissed: boolean,  
  resolved: boolean              // true if reply detected / task completed  
}

// Stored as: { followUps: FollowUpItem\[\] }  
// Auto-clean resolved items older than 7 days

**UI**

**Extension Badge**

Number on the extension icon \= unresolved follow-up count (max 99, shows "99+").

**Chrome Notification**

One summary notification listing ALL new items (not one per item — avoids spam):

**Follow-Ups View (in Extension Popup)**

┌──────────────────────────────────┐  
│ MailX \- Follow-up Reminder       │  
│                                  │  
│ 3 emails need follow-up:         │  
│ • Q3 Budget Review — 5 days ago  │  
│ • Meeting Request — 3 days ago   │  
│ • Invoice \#104 — 4 days ago      │  
│                                  │  
│ 📋 1 task overdue                │  
└──────────────────────────────────┘

A tab showing all active reminders:

────────────────────────────────────────────────────────────

┌──────────────────────────────────┐  
│ Inbox   Stats   Follow-Ups (4)   │  
├──────────────────────────────────┤  
│ ⏳ Q3 Budget Review     5 days   │  
│    John \<john@acme.com\>          │  
│                                  │  
│ ⏳ Meeting Request       3 days   │  
│    Sarah \<sarah@co.com\>          │  
│                                  │  
│ ⏳ Invoice \#104          4 days   │  
│    client@billing.com            │  
│                                  │  
│ ⏳ Send Q3 report      Due today │  
│    \[from Tasks\]                  │  
│                                  │  
│ \[Dismiss All\]                    │  
└──────────────────────────────────┘

| Element | Meaning |
| :---- | :---- |
| **⏳** | Waiting — no reply yet |
| **✅** | Resolved — reply detected, auto-dismissed |
| **\[Dismiss\]** | User clicked to hide this reminder permanently |

**Frontend Components**

────────────────────────────────────────────────────────────

| Component | File | Responsibility |
| :---- | :---- | :---- |
| **Alarm Setup** |  | Creates  on install, one-time |
| **Sent Scanner** |  | Gmail API thread check for reply detection |
| **Task Reader** |  | Reads FR5 tasks from |
| **Dedup Engine** |  | Avoids re-notifying same item |
| **Notifier** |  | — grouped summary |
| **Badge Updater** |  |  |
| **Popup Tab** | (new) | List of active reminders |
| **Settings** |  | "Remind after N days" slider |

**Backend**

No new backend endpoint needed — reply detection runs entirely client-side via the Gmail API (same OAuth scope as FR1/FR2).

FR3 open events stored on the backend can optionally be consumed here: if the email was opened but no reply, mark the reminder with higher priority.

────────────────────────────────────────────────────────────

**Settings**

Default: 3 days. Range: 1–14 days.

┌──────────────────────────────┐  
│ Follow-up Reminders          │  
│                              │  
│ Remind me after \[3\] days     │  
│    without a reply      \[-\]  │  
│                              │  
│ Notify for task deadlines    │  
│    \[✓\] 1 day before          │  
│    \[✓\] On due date           │  
│    \[ \] When overdue          │  
│                              │  
│ \[Show badge count\]    \[✓\]    │  
└──────────────────────────────┘

────────────────────────────────────────────────────────────

**Edge Cases**

────────────────────────────────────────────────────────────

| Case | Handling |
| :---- | :---- |
| **Email to yourself** | Skip — own address filtered out |
| **Auto-reply / OOO** | Detect via subject containing "Out of Office", "Auto Reply", "Automatic reply" → skip |
| **Bulk / mailing list** | Skip if  list has \> 5 recipients |
| **User already replied** | Thread has reply from user after the sent email → resolved |
| **Browser closed for 8 hours** | with . Missed alarms fire on wake |
| **Gmail API quota exceeded** | Skip this cycle, try again next hour |
| **OAuth expired** | for silent refresh |
| **User dismisses** | . Won't re-notify for same |
| **FR5 task completed** | Auto-dismiss at next alarm check |
| **Same email triggers hourly** | dedup — only one notification per sourceId per session |
| **No tracked sent emails** | No reminders shown. Only task reminders fire |
| **User has 50+ unanswered emails** | Only show top 10 by age. Cap badge at "99+" |

**Dependencies**

────────────────────────────────────────────────────────────

| FR | Relationship |
| :---- | :---- |
| **FR3 (Open Tracking)** | If email opened but no reply → priority boost: shorten reminder window by 1 day |
| **FR5 (Task Extraction)** | Primary data source for task-based reminders. Consumes  \+ |
| **FR4 (Priority Detection)** | High-priority sent emails get shorter reminder window (2 days instead of 3\) |
| **FR10 (Mail Statistics)** | Consumes reminder resolution rate, avg response time per contact |

**Verification**

| Test | Expected |
| :---- | :---- |
| **Send email to a test account → wait 3 days** | Chrome notification: "test@ emailed 3 days ago — no reply" |
| **Reply to that email from test account** | At next hourly check, reminder auto-dismisses. Badge count decreases |
| **FR5 task with due date tomorrow** | Notification: "Task 'Send report' is due tomorrow" |
| **FR5 task due date passes without completion** | Notification: "Task 'Submit proposal' was due 2 days ago" |
| **Complete the FR5 task** | At next check, task reminder auto-dismissed |
| **Dismiss a reminder** | It disappears. Badge count decreases. Won't reappear |
| **Open popup → Follow-Ups tab** | Lists all active reminders with days waiting |
| **Change "Remind after" to 5 days** | Emails \< 5 days old are ignored |
| **Open notification** | (Future) Opens the specific email thread |
| **No pending reminders** | Badge is hidden (not "0") |
| **100+ unanswered emails** | Badge shows "99+". Popup shows top 10 |

# FR7: Spam Detection

# **FR7 — Spam Detection**

**Design Decision Date:** June 30, 2026  
**Status:** Approved

────────────────────────────────────────────────────────────

**Goal**

Detect spam, bulk marketing, and unwanted emails that slip past Gmail's filter. Show visual warnings on inbox rows and inside opened emails. Learn from user feedback (\[Mark Spam\] / \[Not Spam\]) to personalize detection over time.

────────────────────────────────────────────────────────────

**What It Detects**

────────────────────────────────────────────────────────────

| Type | Example | Detection Method |
| :---- | :---- | :---- |
| **Bulk / Newsletter** | Marketing blasts, promotions you never signed for | Sender frequency \+ LLM content check |
| **Impersonation** | "Your boss" from a lookalike domain | Sender domain analysis \+ LLM |
| **User-defined spam** | That specific mailing list you hate | Blacklist rules (instant) |
| **Gmail false negatives** | Emails past Gmail's filter but still spammy | LLM content analysis |

**How It Works (Plain English)**

────────────────────────────────────────────────────────────

Inbox open → check each visible email:  
  → Sender on your blacklist? → 🔴 Spam badge. Done.  
  → Sender on your whitelist? → 🟢 Safe. Done.  
  → Unknown sender? → Send subject \+ sender to AI for quick check  
  → AI says spam? → 🔴 Badge. Says safe? → No badge.

Email opened → full scan:  
  → Full body sent to AI  
  → If spam → red warning banner at top of email  
  → If safe → subtle green checkmark (or nothing)  
  → Both show a short reason: "Looks like a bulk promotion"

User clicks \[Mark Spam\]:  
  → Sender added to blacklist  
  → Future emails from them get 🔴 badge automatically

User clicks \[Not Spam\]:  
  → Sender added to whitelist  
  → Future emails from them skip AI scan

**Triggers**

────────────────────────────────────────────────────────────

| Path | Input | What Happens |
| :---- | :---- | :---- |
| **Inbox load** | Visible email rows | Sender check (rules only) \+ optional quick LLM scan |
| **Email opened** | Full body \+ sender \+ subject | Full LLM scan → warning banner |
| **\[Mark Spam\] button** | Currently open email | Add to blacklist, report feedback to backend |
| **\[Not Spam\] button** | Currently open email | Add to whitelist, report feedback to backend |

**UI**

**Inbox Row Badges**

**Warning Banner (inside opened email)**

| Badge | Location | Meaning |
| :---- | :---- | :---- |
| **(none)** | Next to sender | Looks clean |
| **🔴 red dot** | Next to sender | Likely spam |
| **🟠 orange dot** | Next to sender | Suspicious — unknown sender, unusual patterns |
| **🟢 green dot (subtle)** | Next to sender | Confirmed safe (whitelisted or previously marked Not Spam) |

Injected between Gmail's header and the email body:

**Toolbar Buttons**

┌──────────────────────────────────────────────────┐  
│ ⚠️ MailX flagged this as spam                    │  
│                                                  │  
│ Looks like a bulk marketing email from a sender  │  
│ you've never engaged with.                       │  
│                                                  │  
│ \[Not Spam — whitelist sender\]   \[Dismiss\]        │  
└──────────────────────────────────────────────────┘

Buttons appear inside the Gmail toolbar when an email is open.

| Button | Action |
| :---- | :---- |
| **\[Mark Spam\]** | Flags email \+ adds sender to blacklist |
| **\[Not Spam\]** | Clears flag \+ adds sender to whitelist |

────────────────────────────────────────────────────────────

**Architecture**

**Two-Stage Detection**

**Data Flow**

Stage 1 — Rules (instant, no backend call)  
  → Sender in whitelist? → "not\_spam", skip Stage 2  
  → Sender in blacklist? → "spam", skip Stage 2  
  → Sender domain known-clean (google.com, your company)? → "not\_spam"

Stage 2 — LLM (if Stage 1 is inconclusive)  
  → POST /api/v1/chat { intent: "spam", sender, subject, body }  
  → Backend routes to spam plugin  
  → LLM returns verdict \+ confidence \+ reason  
  → Cache result in chrome.storage.session

────────────────────────────────────────────────────────────

Email opened  
  → Content script extracts: email\_id, sender, subject, body  
  → Checks chrome.storage.session cache  
  → Cache miss? → check local rules (whitelist/blacklist)  
  → Rule miss? → send to SW → POST backend  
  → LLM returns verdict  
  → Cache result  
  → Content script renders banner or confirmation

**Prompt Template**

────────────────────────────────────────────────────────────

System: You are MailX, a spam detection assistant.  
Classify this email as "spam" or "not\_spam".

SPAM \= unsolicited bulk marketing, deceptive sender,   
       promotional content from unknown sender,   
       suspicious or impersonation patterns

NOT\_SPAM \= personal email, work email, transactional   
           receipt, newsletter user likely subscribed to

Sender: {sender}  
Subject: {subject}  
Body:  
{body}

User's preferences:  
\- whitelisted senders: {whitelist}  
\- blacklisted senders: {blacklist}

Return JSON:  
{  
  "verdict": "spam" | "not\_spam",  
  "confidence": 0.0-1.0,  
  "reason": "one short sentence explaining why",  
  "category": "bulk" | "impersonation" | "newsletter" | "normal" | "transactional"  
}

**Backend**

*Reuses unified  endpoint with intent .*

| Component | File | Responsibility |
| :---- | :---- | :---- |
| **Plugin Handler** |  | Builds prompt, calls AI adapter, parses verdict |
| **Prompt Template** |  | Spam classification system prompt |

────────────────────────────────────────────────────────────

**Frontend**

────────────────────────────────────────────────────────────

| Component | File | Responsibility |
| :---- | :---- | :---- |
| **Inbox Badge Renderer** |  | Injects 🔴/🟠/🟢 badges into inbox rows |
| **Warning Banner** |  | Red/green banner inside opened email |
| **Toolbar Buttons** |  | \[Mark Spam\] / \[Not Spam\] |
| **Spam Checker** | (new) | Rule check \+ backend call \+ cache |
| **Preferences** |  | \+  in chrome.storage.sync |

**Storage (chrome.storage.sync)**

Synced across devices.

interface SpamPreferences {  
  spam\_whitelist: string\[\],    // email addresses or domains  
  spam\_blacklist: string\[\],    // email addresses or domains  
}

────────────────────────────────────────────────────────────

**Edge Cases**

────────────────────────────────────────────────────────────

| Case | Handling |
| :---- | :---- |
| **Sender on whitelist** | Skip LLM. Always "not\_spam" |
| **Sender on blacklist** | Skip LLM. Always "spam" |
| **Gmail already marked as spam** | Respect Gmail's verdict. Don't override |
| **First email from new sender** | Full LLM scan with body |
| **Newsletter user always reads** | User clicks \[Not Spam\] → whitelisted permanently |
| **User marks as Spam** | Add to blacklist. Report to backend |
| **User marks as Not Spam** | Add to whitelist. Report to backend |
| **False positive (MailX says spam, user disagrees)** | \[Not Spam\] fixes it. Whitelist persists |
| **No internet** | Rule-based only (whitelist/blacklist). No LLM scan |
| **Empty body** | Classify on sender \+ subject alone |
| **Known domain (, )** | Skip LLM. Treat as trusted |
| **Spam in inbox \+ same email in spam folder** | Trust Gmail's folder placement |

**Relationship with FR8 (Phishing)**

Separate pipelines, separate banners. An email can be flagged by both (phishing email is also spam).

| FR | Scope | Banner Color |
| :---- | :---- | :---- |
| **FR7 (Spam)** | Unwanted / bulk / promotional | ⚠️ Orange / Red |
| **FR8 (Phishing)** | Dangerous / malicious / credential theft | 🚨 Red with security icon |

────────────────────────────────────────────────────────────

**Verification**

| Test | Expected |
| :---- | :---- |
| **Open a marketing email from unknown sender** | 🔴 Spam badge \+ red warning banner with reason |
| **Open a known clean email (from whitelist)** | 🟢 Green badge (or no badge). No warning |
| **Click \[Not Spam\] on a flagged email** | Badge removed. Sender added to whitelist |
| **Click \[Mark Spam\] on a clean email** | Sender added to blacklist. Badge appears |
| **Open Gmail fresh (new session)** | Whitelist/blacklist loaded from chrome.storage.sync |
| **Offline: open email from unknown sender** | No badge (can't reach LLM). Rule-based still works |
| **Unknown sender, subject looks normal** | No badge. LLM gave "not\_spam" with high confidence |
| **Same email opened twice** | Cached result. No second API call |

# FR8: Phishing Link Detection

# **FR8 — Phishing Link Detection**

**Design Decision Date:** June 30, 2026  
**Status:** Approved

────────────────────────────────────────────────────────────

**Goal**

Scan links inside emails and warn the user when a URL looks like a phishing attempt — brand impersonation, typosquatting, homograph attack, or known malicious domain.

────────────────────────────────────────────────────────────

**What It Detects**

────────────────────────────────────────────────────────────

| Threat | Example | Detection Method |
| :---- | :---- | :---- |
| **Known phishing domain** | Domain reported to PhishTank/OpenPhish | Blocklist lookup (instant) |
| **Typosquatting** | → | Edit distance \+ brand list |
| **Homograph / IDN** | (Cyrillic letters look like Latin) | Mixed-script detection |
| **IP-based URL** |  | Raw IP in hostname check |
| **URL shortener** | → hidden destination | Known shortener domains |
| **Brand in path, wrong domain** |  | Brand name in path ≠ brand domain |
| **Suspicious keywords** | , , ,  on unfamiliar domain | Keyword pattern match |
| **Suspicious TLD** | , , , | TLD blocklist |

**How It Works (Plain English)**

────────────────────────────────────────────────────────────

Email opened → MailX scans every link:  
  Layer 1 — Blocklist: Is this domain a known phishing site?   
    → Yes? 🔴 Warning. Done.  
    → No? Move to Layer 2\.

  Layer 2 — Heuristics: Does the URL look suspicious?  
    → "arnazon.com" (typosquat)? IP-based? Homograph? Shortener?  
    → No issues? ✅ Safe. Done.  
    → Something fishy? Move to Layer 3\.

  Layer 3 — AI: Send URL to MailX AI for deeper check  
    → AI checks: "Is this trying to look like PayPal?"  
    → Returns: phishing / suspicious / clean \+ explanation

  → Show red banner if any link is dangerous.  
  → Show green on hover if safe.  
  → Show warning toast if user tries to click a bad link.

**Three Detection Layers**

────────────────────────────────────────────────────────────

| Layer | Method | Speed | Accuracy | Privacy |
| :---- | :---- | :---- | :---- | :---- |
| **1 — Blocklist** | PhishTank \+ OpenPhish (downloaded locally) | Instant (\<1ms) | High for known sites | Zero data leaves device |
| **2 — Heuristic** | Pattern rules (typosquat, homograph, IP, TLD) | Instant (\<50ms) | Medium (some false positives) | Zero data leaves device |
| **3 — AI (LLM)** | Ollama on backend — brand impersonation check | \~2s | High for novel attacks | URL \+ brand sent to backend |

**Triggers**

────────────────────────────────────────────────────────────

| Path | Input | What Happens |
| :---- | :---- | :---- |
| **Email opened** | Full email HTML | Extract all  → run all 3 layers → show banner |
| **Link hover** | Hovered URL | Replace browser tooltip with real URL \+ safety status |
| **Link click** | Clicked URL | Intercept → if dangerous, show toast confirmation |

**UI**

**Warning Banner (inside opened email)**

Injected between Gmail header and email body, only when phishing links detected:

**Per-Link Indicator**

┌──────────────────────────────────────────────────────┐  
│ 🚨 Phishing links detected in this email             │  
│                                                      │  
│ 2 suspicious links found:                            │  
│ • paypa1.com — looks like a fake PayPal site         │  
│ • secure-amazon-login.xyz — suspicious domain        │  
│                                                      │  
│ \[Mark as safe\] \[Dismiss\]                             │  
└──────────────────────────────────────────────────────┘

Injected next to every link in the email body:

**Tooltip on Hover**

Safe:        ✅ amazon.com — trusted  
Suspicious:  ⚠️ arnazon.com — looks like a fake Amazon site  
Dangerous:   🚨 paypa1.com — known phishing domain

Replaces browser's default tooltip:

**Click Confirmation Toast**

Actual destination: https://paypa1.com/login  
MailX: 🚨 Known phishing domain — do not click

When user clicks a dangerous link:

────────────────────────────────────────────────────────────

┌─────────────────────────────────────────────┐  
│ 🚨 Suspicious Link Warning                  │  
│                                             │  
│ https://paypa1.com/login                    │  
│ This looks like a fake PayPal login page.   │  
│                                             │  
│ \[Go back (recommended)\] \[I understand risk\] │  
└─────────────────────────────────────────────┘

**Blocklist Management**

**Sources**

On install \+ every 24 hours (chrome.alarms):  
  → Fetch PhishTank feed (CSV)  
  → Fetch OpenPhish feed (text)  
  → Extract hostnames  
  → Store Set\<string\> in chrome.storage.local  
  → \~50,000 domains, \~200KB compressed

On URL check:  
  → Parse hostname from URL  
  → Check hostname in Set  
  → Match? → 🔴 verdict

────────────────────────────────────────────────────────────

| Source | URL | Format | Update |
| :---- | :---- | :---- | :---- |
| **PhishTank** |  | CSV | Every 24h |
| **OpenPhish** |  | Text (one per line) | Every 24h |

**Heuristic Rules**

**Brand List (15)**

| Check | Rule | Example |
| :---- | :---- | :---- |
| **Homograph** | Hostname has non-ASCII characters | (Cyrillic) |
| **Typosquat** | Levenshtein distance ≤ 2 to a brand domain | → Amazon |
| **IP host** | Hostname is a raw IP address |  |
| **Excessive subdomains** | More than 4 subdomain levels |  |
| **URL shortener** | Domain is a known shortener | , , , |
| **Brand in path** | Brand name appears in path, domain ≠ brand domain | → brand=paypal, domain≠paypal.com |
| **Suspicious TLD** | Domain uses high-risk TLD | , , , , , , |
| **Suspicious keywords** | Path contains phishing keywords | , , , , , |

────────────────────────────────────────────────────────────

Google, Microsoft, Apple, PayPal, Amazon, Netflix,  
GitHub, Coinbase, Binance, Facebook, Instagram,  
LinkedIn, Twitter/X, WhatsApp, Dropbox

**Prompt Template (Layer 3 — LLM)**

────────────────────────────────────────────────────────────

System: You are MailX, a phishing detection assistant.

A URL was flagged as suspicious by heuristic checks.  
Determine if this URL is trying to impersonate a known brand.

URL: {url}  
Matched heuristics: {heuristic\_list}  
Matched brand: {brand}

Return JSON:  
{  
  "verdict": "phishing" | "suspicious" | "clean",  
  "confidence": 0.0-1.0,  
  "reason": "one short sentence explaining why"  
}

**Architecture**

────────────────────────────────────────────────────────────

Email opened  
  → Content script extracts all \<a href="..."\> from email body  
  → For each URL:  
      1\. Parse hostname → check blocklist in chrome.storage.local  
         → match? → 🔴 marked as phishing, skip rest  
      2\. Run heuristic checks  
         → no issues? → ✅ safe  
         → suspicious? → 🟠 mark, send to Layer 3  
      3\. If 🟠 → POST /api/v1/chat { intent: "phishing", url, brand }  
         → LLM returns verdict  
         → Cache result in chrome.storage.session  
  → Aggregate all link verdicts  
  → Render warning banner if any 🔴 or 🚨  
  → Inject per-link indicators next to each \<a\>

User hovers over link  
  → Content script intercepts hover event  
  → Shows tooltip with real URL \+ safety icon

User clicks link  
  → Content script intercepts click  
  → If safe → let through normally  
  → If threat → show confirmation toast dialog  
  → If user clicks "I understand risk" → let through once  
  → If "Go back" → prevent navigation

**Backend**

*Reuses unified  endpoint with intent .*

| Component | File | Responsibility |
| :---- | :---- | :---- |
| **Plugin Handler** |  | Receives URL \+ brand, calls LLM, returns verdict |
| **Prompt Template** |  | Brand impersonation detection prompt |

────────────────────────────────────────────────────────────

**Frontend**

────────────────────────────────────────────────────────────

| Component | File | Responsibility |
| :---- | :---- | :---- |
| **Link Extractor** |  | Scans email DOM for  tags |
| **Blocklist Check** | (new) | Local blocklist lookup in chrome.storage.local |
| **Heuristic Engine** |  | Pattern checks \+ brand matching |
| **LLM Checker** |  | Sends ambiguous URLs to backend |
| **Warning Banner** |  | Red banner inside opened email |
| **Link Hover** |  | Replace tooltip with safety info |
| **Click Interceptor** |  | Intercept link click → toast |
| **Cache** |  | chrome.storage.session for URL verdicts |

**Storage**

────────────────────────────────────────────────────────────

// chrome.storage.local (persistent)  
interface PhishingStorage {  
  phishing\_domains: string\[\],     // updated daily from feeds  
  whitelisted\_domains: string\[\],  // user says "this is safe"  
  last\_fetch: number              // epoch ms  
}

// chrome.storage.session (per session)  
interface UrlVerdict {  
  url: string,  
  verdict: "safe" | "suspicious" | "phishing",  
  confidence: number,  
  checkedAt: number  
}

**Edge Cases**

────────────────────────────────────────────────────────────

| Case | Handling |
| :---- | :---- |
| **HTTPS URL** | Not a safety signal — phishing sites use HTTPS too |
| **Brand in subdomain** | → flag.  → clean |
| **Multiple links, one bad** | Banner shows count. Bad link gets per-link warning |
| **No links in email** | No banner shown. No check needed |
| **User whitelists a domain** | Skip all checks for that domain |
| **Blocklist update fails** | Continue with heuristic \+ LLM only. Retry next hour |
| **LLM offline** | Fall back to heuristic-only verdict |
| **Zero-day phishing (unreported domain)** | Blocklist misses → heuristic \+ LLM catches via brand impersonation |
| **Shortened URL** | Flag as suspicious. Can't determine destination without expanding |
| **Relative URL** | Can't check without base URL. Flag: "unable to verify" |
| **Same URL checked twice** | Return cached verdict from chrome.storage.session |
| **User clicks dangerous link** | Toast confirmation. User must explicitly approve |

**Security**

────────────────────────────────────────────────────────────

| Concern | Mitigation |
| :---- | :---- |
| **Blocklist poisoning** | Only fetch from trusted sources (PhishTank, OpenPhish) |
| **False positive (safe site flagged)** | User clicks \[Mark as safe\] → whitelisted permanently |
| **False negative (phishing missed)** | Heuristic \+ LLM catches what blocklist misses |
| **LLM prompt injection via URL** | URL is sanitized before being inserted into prompt |
| **Data sent to backend** | Only URL \+ brand name. Never full email body |

**Relationship with FR7 (Spam)**

Separate pipelines. An email can be flagged by both. When both fire, FR8's UI takes priority (more severe).

| FR | Scope | UI |
| :---- | :---- | :---- |
| **FR7 (Spam)** | Unwanted / bulk / promotional | 🟠 Orange badge \+ banner |
| **FR8 (Phishing)** | Dangerous / credential theft | 🚨 Red banner \+ toast \+ per-link warnings |

────────────────────────────────────────────────────────────

**Verification**

| Test | Expected |
| :---- | :---- |
| **Open email with a known phishing URL (from blocklist)** | 🔴 Red banner: "Phishing links detected". Per-link 🚨 next to URL |
| **Open email with  link (typosquat)** | Layer 2 catches it → Layer 3 confirms → red banner |
| **Open email with clean links (google.com, amazon.com)** | No banner. ✅ shown on hover |
| **Hover over a clean link** | Tooltip: "Actual destination: https://... MailX: ✅ safe" |
| **Hover over a phishing link** | Tooltip: "Actual destination: https://... MailX: 🚨 Known phishing domain" |
| **Click a dangerous link** | Toast appears: "Go back" / "I understand risk" |
| **Click "Go back"** | Navigation prevented |
| **Click "I understand risk"** | Navigation allowed once |
| **User clicks \[Mark as safe\]** | Domain added to whitelist. Banner dismissed |
| **Same URL checked twice** | Second check returns cached result (no API call) |
| **Blocklist updated daily** | New phishing domains detected within 24h |
| **Email with no links** | No banner, no warnings, no checks |

# FR9: AI Email Draft Generation

# **FR9 — AI Email Draft Generation**

**Design Decision Date:** June 30, 2026  
**Status:** Approved

────────────────────────────────────────────────────────────

**Goal**

Generate complete email drafts from user prompts. User describes what they want in plain English, the AI writes the full email (subject \+ body), and it's injected into Gmail's compose box ready to send.

────────────────────────────────────────────────────────────

**FR9 vs FR2 (Smart Reply)**

────────────────────────────────────────────────────────────

| Feature | FR2 (Smart Reply) | FR9 (Draft Generation) |
| :---- | :---- | :---- |
| **Input** | Click button → 3 suggested replies | Type what you want → full custom draft |
| **Flexibility** | Fixed 3 options from email context | Any email you can describe |
| **Use case** | Quick reply to the open email | New email, custom reply, anything |
| **Output** | 3 short options, pick one | Full email with subject, body, greeting, sign-off |

**What User Inputs**

Simplest input: user types what they want in natural language. That's it.

| Field | Example | Required |
| :---- | :---- | :---- |
| **Prompt** | "Write a follow-up about the Q3 budget" | ✅ Yes |
| **Tone** | Formal / Casual / Professional | ❌ No — defaults to saved preference |
| **Email context** | (auto-attached if replying to an email) | ❌ No |

────────────────────────────────────────────────────────────

**Triggers**

────────────────────────────────────────────────────────────

| Path | Input | What Happens |
| :---- | :---- | :---- |
| **Toolbar \[Draft\] button** | Prompt text \+ optional tone | Opens input modal → generates → shows preview |
| **Chat overlay** | "Draft an email to Sarah saying I'm running late" | Generates → shows preview with \[Insert\] button |

**Architecture**

────────────────────────────────────────────────────────────

User clicks \[Draft\]  
  → Input modal opens: text area \+ tone selector  
  → User types prompt → clicks \[Generate\]  
  → Content script sends to SW:  
      { type: "GENERATE\_DRAFT", prompt, tone, email\_context? }  
  → SW calls POST /api/v1/chat  
      Body: {  
        intent: "draft",  
        prompt: "Write a follow-up about Q3 budget",  
        tone: "professional",  
        email\_context: { subject, sender, body } // only if replying  
      }  
  → Backend routes to draft plugin  
  → LLM returns JSON: { subject, greeting, body, signOff }  
  → SW returns result to content script  
  → Content script shows preview with action buttons  
  → User clicks \[Insert\] → draft injected into compose box  
  → User clicks \[Regenerate\] → new API call with same prompt

**Prompt Template**

────────────────────────────────────────────────────────────

System: You are MailX, an email drafting assistant.  
Generate a complete email draft based on the user's request.

Tone: {tone} (formal / casual / professional)  
Today's date: {date}

User request: {prompt}  
{Optional: Replying to this email:  
  From: {sender}  
  Subject: {subject}  
  Body:  
  {email\_body}}

Rules:  
\- Write a clear subject line  
\- Start with appropriate greeting  
\- Write the body in {tone} tone  
\- End with appropriate sign-off  
\- Keep it concise. No fluff.  
\- Do NOT use: "I hope this email finds you well",  
  "I'm writing to", "Just wanted to", "circling back"  
\- Do not speculate about facts not provided  
\- If replying, reference specific points from the original email

Return JSON only:  
{  
  "subject": "string",  
  "greeting": "string",  
  "body": "string",  
  "signOff": "string"  
}

**UI**

**Input Modal (on \[Draft\] click)**

**Preview (after generation)**

┌─────────────────────────────────────┐  
│ ✏️ Compose with AI                  │  
│                                     │  
│ Prompt:                             │  
│ ┌─────────────────────────────────┐ │  
│ │ Draft a follow-up about the Q3  │ │  
│ │ budget report for the client    │ │  
│ └─────────────────────────────────┘ │  
│                                     │  
│ Tone: \[Professional ▼\]              │  
│                                     │  
│            \[Generate\]               │  
└─────────────────────────────────────┘

**In Chat Overlay**

┌─────────────────────────────────────┐  
│ ✅ Draft ready                      │  
│                                     │  
│ Subject: Q3 Budget Report Follow-Up │  
│ ─────────────────────────────────── │  
│ Hi John,                            │  
│                                     │  
│ I'm following up on the Q3 budget   │  
│ report we discussed last week.      │  
│ Please let me know when you have    │  
│ the updated numbers.                │  
│                                     │  
│ Best regards,                       │  
│ \[Your Name\]                         │  
│                                     │  
│ \[Insert\]  \[Regenerate\]  \[Copy\]     │  
└─────────────────────────────────────┘

────────────────────────────────────────────────────────────

User: Draft an email to Sarah saying I'm running late  
        and reschedule to Thursday

MailX: ┌──────────────────────────────┐  
       │ Subject: Running Late —      │  
       │ Reschedule to Thursday?      │  
       │                              │  
       │ Hey Sarah,                   │  
       │ I'm running behind today.    │  
       │ Can we move to Thursday?     │  
       │ Let me know what time works. │  
       │                              │  
       │ \[Insert into compose\]        │  
       └──────────────────────────────┘

**Action Buttons**

────────────────────────────────────────────────────────────

| Button | Action |
| :---- | :---- |
| **\[Insert\]** | Injects draft into Gmail compose box. Opens new compose if none open |
| **\[Regenerate\]** | New API call with same prompt. Different result (temperature variation) |
| **\[Copy\]** | Copies full email (subject \+ body) to clipboard |

**Backend**

*Reuses unified  endpoint with intent .*

| Component | File | Responsibility |
| :---- | :---- | :---- |
| **Plugin Handler** |  | Builds prompt, calls AI adapter, validates JSON |
| **Prompt Template** |  | Draft generation system prompt |

────────────────────────────────────────────────────────────

**Frontend**

────────────────────────────────────────────────────────────

| Component | File | Responsibility |
| :---- | :---- | :---- |
| **Toolbar Button** |  | \[Draft\] button in toolbar |
| **Input Modal** |  | Prompt text input \+ tone dropdown |
| **Preview UI** |  | Shows draft with action buttons |
| **Draft Inserter** |  | Injects into compose DOM () |
| **Chat Integration** |  | "Draft an email..." via chat |

**Tone Options**

User's saved preference in  auto-selects the default tone.

| Tone | Style | Example Greeting | Example Body |
| :---- | :---- | :---- | :---- |
| **Formal** | Polite, structured, full sentences | "Dear Mr. Smith," | "I am writing to follow up regarding..." |
| **Casual** | Relaxed, conversational | "Hey Sarah," | "Just checking in on the budget..." |
| **Professional (default)** | Balanced, clear, direct | "Hi John," | "Following up on the Q3 budget report..." |

────────────────────────────────────────────────────────────

**Security**

────────────────────────────────────────────────────────────

| Concern | Mitigation |
| :---- | :---- |
| **Sensitive data in prompt** | Local scan for passwords, OTPs, credit card numbers → block \+ warn before API call |
| **Email context sent to backend** | Only when replying. User can opt out |
| **Data retention** | Backend processes and discards. No persistent storage |
| **Prompt injection** | Input sanitized before LLM call |

**Edge Cases**

────────────────────────────────────────────────────────────

| Case | Handling |
| :---- | :---- |
| **Empty prompt** | Show error: "Please describe what you want to write" |
| **Very short prompt ("Hello")** | Still generates a full email — greeting \+ brief body |
| **Sensitive content detected** | Block generation. Show warning: "Your prompt contains sensitive info" |
| **No compose box open** | Insert triggers Gmail to open new compose window, then injects |
| **Replying to an email** | Original email context auto-attached to LLM prompt |
| **User clicks Regenerate** | New API call with same prompt \+ different random seed |
| **LLM returns invalid JSON** | Retry once. Show error on second failure |
| **Offline / no backend** | Error: "AI is unavailable. Please try again." |
| **Very long prompt (\>500 chars)** | Truncated with  suffix |
| **Prompt asks for harmful content** | LLM safety fine-tuning rejects. Fallback: "I can't generate that" |

**Verification**

| Test | Expected |
| :---- | :---- |
| **Click \[Draft\] → type "Follow-up about Q3 budget" → \[Generate\]** | Subject, greeting, body, sign-off returned |
| **Select tone "Casual" → \[Generate\]** | Body is casual, greeting is "Hey" |
| **Click \[Insert\]** | Draft injected into Gmail compose box |
| **Click \[Regenerate\]** | New version with different wording, same prompt |
| **Click \[Copy\]** | Full draft text copied to clipboard |
| **Chat: "Draft an email to Sarah saying I'm running late"** | Draft shown in chat with \[Insert\] button |
| **Empty prompt → \[Generate\]** | Error shown |
| **Prompt contains "password: mypass123" → \[Generate\]** | Blocked. Warning shown |
| **No compose box open → \[Insert\]** | New compose window opens, draft inserted |
| **Same prompt twice** | Both generations differ slightly |

# FR10: Mail Statistics Analysis

# **FR10 — Mail Statistics Analysis**

**Design Decision Date:** June 30, 2026  
**Status:** Approved

────────────────────────────────────────────────────────────

**Goal**

A statistics dashboard inside the extension popup that shows insights about the user's email behavior: emails sent/received, average response time, busiest days, top senders, and metrics from all other FRs in one place.

────────────────────────────────────────────────────────────

**What It Shows**

────────────────────────────────────────────────────────────

| Metric | Source | Display |
| :---- | :---- | :---- |
| **Emails sent (today / week / month)** | Gmail API | Scorecard number |
| **Emails received** | Gmail API | Scorecard number |
| **Average response time** | Gmail API — thread timestamps | Scorecard with trend |
| **Busiest day of week** | Gmail API — send timestamps by day | Horizontal bar chart |
| **Busiest hour of day** | Gmail API — send timestamps by hour | Horizontal bar chart |
| **Top 5 senders** | Gmail API — inbox email count by sender | Horizontal bar chart |
| **Open rate (tracked)** | FR3 — open events | Scorecard \+ donut chart |
| **Priority breakdown** | FR4 — H/M/L classification count | Donut chart |
| **Tasks completed vs pending** | FR5 — task store | Scorecard \+ progress bar |
| **Follow-ups resolved** | FR6 — reminder store | Scorecard |
| **Spam flagged** | FR7 — spam verdicts | Small scorecard |
| **Phishing blocked** | FR8 — phishing detections | Small scorecard |

**Dashboard Layout (Extension Popup)**

────────────────────────────────────────────────────────────

┌──────────────────────────────────────────┐  
│  Inbox  │  Follow-Ups  │  Stats          │  
├──────────────────────────────────────────┤  
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌───────────┐│  
│ │ 24   │ │ 156  │ │ 3.2h │ │ 68%       ││  
│ │ Sent │ │ Recv │ │ Resp │ │ Open rate ││  
│ │ today│ │ today│ │ time │ │           ││  
│ └──────┘ └──────┘ └──────┘ └───────────┘│  
│                                          │  
│ Activity                    \[Last 7d ▼\]  │  
│  ████░░░░░░░░░░░░░  Mon                  │  
│  ██████░░░░░░░░░░░░  Tue                 │  
│  █████░░░░░░░░░░░░░  Wed                 │  
│  ████████░░░░░░░░░░  Thu                 │  
│  ██████░░░░░░░░░░░░  Fri                 │  
│  ██░░░░░░░░░░░░░░░░  Sat                 │  
│  █░░░░░░░░░░░░░░░░░  Sun                 │  
│                                          │  
│ Top Senders                              │  
│ • john@acme.com     ████████░░  24       │  
│ • sarah@co.com      ██████░░░░  18       │  
│ • newsletter@x.com  ████░░░░░░  12       │  
│ • boss@company.com  ███░░░░░░░   9       │  
│ • slack@notif.com   ██░░░░░░░░   6       │  
│                                          │  
│ Priority            │  Tasks             │  
│ ┌──────────────────┐│ ┌─────────────────┐│  
│ │ ● High    25%    ││ │ Pending   2     ││  
│ │ ● Medium  45%    ││ │ Complete  8     ││  
│ │ ● Low     30%    ││ │ ████████░░ 80%  ││  
│ └──────────────────┘│ └─────────────────┘│  
│                     │                    │  
│ Spam: 12  │  Phish: 3   │  F/up: 5/8    │  
└──────────────────────────────────────────┘

**Data Sources**

────────────────────────────────────────────────────────────

| FR | Data Used | Storage |
| :---- | :---- | :---- |
| **FR3** | Open rate: opens per tracked email | Backend SQLite (fetched via API) |
| **FR4** | Priority counts: High / Medium / Low | chrome.storage.session |
| **FR5** | Tasks: pending vs completed count | chrome.storage.local |
| **FR6** | Follow-ups: resolved vs total | chrome.storage.local |
| **FR7** | Spam flags count | chrome.storage.session |
| **FR8** | Phishing detections count | chrome.storage.session |
| **Gmail API** | Sent count, received count, response times, top senders | Live fetch |

**Gmail API Queries**

────────────────────────────────────────────────────────────

Sent count (last 7 days):  
  GET gmail/v1/users/me/messages?q=in:sent after:2026/06/23

Received count (last 7 days):  
  GET gmail/v1/users/me/messages?q=in:inbox after:2026/06/23

Response time calculation:  
  For each received email in period where you replied:  
    1\. Get thread by threadId  
    2\. Find the received message (from: someone else)  
    3\. Find your reply (from: you, after received message)  
    4\. Response time \= yourReply.internalDate \- receivedMsg.internalDate  
    5\. Convert to hours. Average across all replies.

Top senders:  
  GET gmail/v1/users/me/messages?q=in:inbox after:date\&maxResults=500  
  → Extract unique from addresses → count → sort top 5

Busiest day/hour:  
  GET gmail/v1/users/me/messages?q=in:sent after:date\&maxResults=500  
  → Extract internalDate → map to day-of-week and hour → count

**Architecture**

────────────────────────────────────────────────────────────

User opens popup → clicks \[Stats\] tab  
  → Step 1: Load local data (immediate — no network)  
      → FR3 open rate from chrome.storage.session  
      → FR4 priority counts from chrome.storage.session  
      → FR5 tasks from chrome.storage.local  
      → FR6 follow-ups from chrome.storage.local  
      → FR7 spam / FR8 phishing counts from chrome.storage.session  
  → Step 2: Fetch Gmail API data (async — may take 1-2s)  
      → sent count, received count, response times, top senders  
      → Cache in chrome.storage.session (5 min TTL)  
  → Step 3: Aggregate all data → render charts  
  → Show loading skeleton for Gmail API data while fetching

**Frontend Components**

────────────────────────────────────────────────────────────

| Component | File | Responsibility |
| :---- | :---- | :---- |
| **Stats Tab** |  | Main dashboard layout |
| **Scorecard** |  | Single-number KPI display |
| **Bar Chart** |  | CSS-based horizontal bars |
| **Donut Chart** |  | CSS-based priority / open rate |
| **Progress Bar** |  | Task completion bar |
| **Data Fetcher** |  | Calls Gmail API \+ reads storage |
| **Time Range Filter** |  | Dropdown: 7d / 30d / 90d |

**Data Flow on Popup Open**

────────────────────────────────────────────────────────────

onPopupOpen:  
  → Read chrome.storage.session "stats\_{period}"  
  → If cached \< 5 min old → render from cache  
  → If cache expired:  
      1\. Read FR3-FR8 data from chrome.storage (local)  
      2\. Fetch Gmail API data (async)  
      3\. Write combined data to chrome.storage.session  
      4\. Render

**Period Filter**

Default: **Last 7 days**. User changes via dropdown → re-fetch \+ re-render.

| Option | Gmail API Query | Data Range |
| :---- | :---- | :---- |
| **Last 7 days** |  | 7 days of email data |
| **Last 30 days** |  | 30 days |
| **Last 90 days** |  | 90 days |

────────────────────────────────────────────────────────────

**UI States**

────────────────────────────────────────────────────────────

| State | What User Sees |
| :---- | :---- |
| **Loading** | Grey skeleton bars where charts will be |
| **Loaded** | Full dashboard with all charts |
| **Empty (new user)** | "Start using MailX to see your stats" with buttons to main features |
| **Error (Gmail API fail)** | "Could not fetch latest data" with \[Retry\] button. Local FR data still shows |
| **Partial data** | FR3 data not available? That section shows "No data" instead of blocking whole page |

**Edge Cases**

────────────────────────────────────────────────────────────

| Case | Handling |
| :---- | :---- |
| **New user, no emails** | Empty state: "Send your first email with MailX to see stats" |
| **Gmail API rate limit** | Show cached data from last successful fetch. \[Retry\] button |
| **No tracked emails (FR3)** | Open rate section: "Track an email to see open rates" |
| **No tasks (FR5)** | Tasks section: 0/0 — "No tasks yet. Extract tasks from emails." |
| **Very large inbox (10k+)** | Limit Gmail API fetch to last 500 messages per period |
| **Gmail API OAuth expired** | Silent refresh via chrome.identity. If fails, show error |
| **Time range switch** | Re-fetch \+ re-render. Show loading skeleton during fetch |
| **No previous period for comparison** | Show "N/A" for trend arrows |

**Security**

────────────────────────────────────────────────────────────

| Concern | Mitigation |
| :---- | :---- |
| **Gmail API scope** | Same  used by FR1/FR2 — no new permissions needed |
| **Data in popup** | All local. No data sent externally for statistics |
| **Response time shows email partners** | Aggregated counts only. No email content or subjects shown |

**Verification**

────────────────────────────────────────────────────────────

| Test | Expected |
| :---- | :---- |
| **Open popup → \[Stats\] tab** | Dashboard renders within 1s with skeleton for Gmail data |
| **Gmail API data loads** | Scorecards update with live numbers. Charts render |
| **Switch to "Last 30 days"** | Data re-fetches. Dashboard updates with larger range |
| **New user, no emails** | Empty state with CTA buttons |
| **Click \[Retry\] after error** | Re-fetches Gmail API data |
| **FR5 tasks: complete one** | Next popup open: task progress bar updates |
| **Open FR3 tracked email** | Next popup open: open rate updates |
| **Fast switch between tabs** | Stats cached. No re-fetch for same period within 5 min |

**Dependencies**

| FR | Relationship |
| :---- | :---- |
| **FR3** | Open rate from tracking data |
| **FR4** | Priority breakdown counts |
| **FR5** | Task completion stats |
| **FR6** | Follow-up resolution stats |
| **FR7** | Spam detection count |
| **FR8** | Phishing detection count |

