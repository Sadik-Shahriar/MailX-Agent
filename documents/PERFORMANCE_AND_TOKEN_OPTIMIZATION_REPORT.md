# MailX Performance, Token Usage, and Architecture Audit

Date: 2026-07-17

> Status: historical pre-improvement audit. Findings describe the codebase before the execution plan in `plan.md`; use the plan completion records and current source for release behavior.

## Scope and Method

This audit covered all tracked human-authored source, configuration, schema, tests, and current architecture documents in the repository. Generated output, dependencies, binary icons, bytecode, local tool state, and lockfile internals were excluded except where build size or dependency metadata was relevant.

The audit included:

- Static tracing of every AI feature from Gmail UI to the LLM provider.
- Review of prompts, context limits, retries, output budgets, caching, queues, and response parsing.
- Review of Gmail DOM observation, Chrome messaging, authentication, Supabase calls, Gmail API calls, reminders, and statistics.
- Review of the FastAPI server, schema, RLS policies, indexes, deployment configuration, and tests.
- A live read-only check of the connected Supabase table metadata and database advisors.

No production LLM requests were made. Exact token cost and latency percentiles cannot currently be calculated because MailX does not retain provider `usage`, queue timing, cache outcomes, or end-to-end request timing. Findings labeled **Verified** follow directly from code or database metadata. Findings labeled **Likely** require runtime telemetry to quantify.

## Executive Summary

MailX is slow mainly because it performs too much automatic work and gives that work the same limited execution capacity as user actions.

The most important verified problems are:

1. Opening one email automatically starts priority, spam, and up to ten link jobs. This is up to 12 jobs before the user asks MailX to do anything (`extension/src/content/index.ts:385-431`).
2. Inbox scanning can submit one priority LLM request every two seconds, which is 30 requests per minute (`extension/src/content/index.ts:1431-1469`). That exactly matches the backend's entire per-IP rate limit of 30 requests per minute (`backend/main.py:26-28`, `341-348`).
3. Automatic jobs share a two-slot queue with summaries, replies, drafts, and task extraction. Only contextual chat is prioritized (`extension/src/background/index.ts:10-27`, `71-73`).
4. Two slow or stuck network requests can block the queue indefinitely because extension fetches have no deadline or cancellation (`extension/src/background/api.ts:5-20`).
5. Every ordinary AI request reads the session, then fetches preferences from Supabase, then checks the AI cache. Preference lookup itself reads the session again (`extension/src/background/index.ts:49-73`, `extension/src/background/supabase.ts:51-74`).
6. The backend creates a new HTTP client for every LLM request instead of reusing provider connections (`backend/main.py:423-426`).
7. Chat repeatedly sends the email body and up to ten prior messages on every turn (`backend/main.py:191-203`, `350-375`).
8. An empty provider response causes the entire prompt and history to be sent again with a larger output allowance (`backend/main.py:427-435`).
9. The backend accepts unbounded generic request fields and unknown intents, while only the email body is truncated (`backend/main.py:54-60`, `350-397`).
10. Reminder checks can perform more than 100 sequential Gmail requests plus many sequential Supabase requests (`extension/src/background/gmail.ts:69-88`, `extension/src/background/reminders.ts:29-74`).

The highest-value first release should:

- Stop automatic LLM calls for opened messages and inbox rows.
- Reserve queue capacity for explicit user actions.
- Add extension timeouts and cancellation.
- Reuse one backend HTTP client.
- Cache session/preferences and coalesce duplicate in-flight requests.
- Add token and timing telemetry before changing models or guessing at token limits.

These changes address the dominant causes without requiring a complete rewrite.

## Current Runtime Flow

```text
Gmail DOM or popup
  -> content script extracts email data
  -> chrome.runtime.sendMessage
  -> background session lookup
  -> background Supabase preference lookup
  -> session cache lookup, when enabled
  -> two-slot AI queue
  -> fetch http://localhost:8001/chat
  -> FastAPI builds a prompt
  -> new HTTPX client and provider request
  -> optional full retry for empty content
  -> string response
  -> extension regex/JSON parsing
  -> optional sequential Supabase persistence
  -> Gmail UI
```

This path contains avoidable waiting before the provider call, potentially long provider waiting, and additional persistence waiting after the provider call.

## Why Token Usage Is High

### 1. Automatic LLM Calls Are the Largest Multiplier

**Verified.** `runToolbarChecks` launches the following for each newly detected expanded message:

| Work | Maximum jobs per message | LLM call behavior |
|---|---:|---|
| Priority | 1 | Calls the LLM on cache miss |
| Spam | 1 | Calls the LLM unless a local sender rule or cache handles it |
| Link safety | 10 | Local heuristics handle normal links; suspicious links call the LLM |
| Total | 12 | Competes for the same two queue slots |

References: `extension/src/content/index.ts:322-350`, `385-431`; `extension/src/background/spam.ts:18-39`; `extension/src/background/phishing.ts:23-48`.

Inbox scanning adds up to 30 priority requests per minute while the inbox is open. Pacing reduces bursts but does not reduce total token consumption.

**Mitigation:** Make remote priority, spam, and link analysis user-triggered or opt-in. Run local deterministic checks first. If automatic inbox priority remains necessary, batch multiple rows into one structured request and cache by a content hash.

### 2. Chat Resends Large Context on Every Turn

**Verified.** A later chat turn can include approximately:

| Input | Current maximum |
|---|---:|
| Email body | 8,000 characters |
| Ten history entries | 20,000 characters |
| Latest prompt | 2,000 characters |
| Static instructions and metadata | Additional |

Reference: `backend/main.py:191-203`, `350-375`.

The same email is billed again on every turn. Character limits are not token limits, and Unicode or code-like content can tokenize very differently.

**Mitigation:** Apply one aggregate token budget. Keep the latest two to four turns verbatim, summarize older turns, and select only email excerpts relevant to the question. Do not place untrusted email body text inside a system message.

### 3. Empty Responses Can Double the Full Request

**Verified.** If a successful provider response contains no visible `content`, MailX repeats the complete input and increases `max_tokens` (`backend/main.py:427-435`). The retry can therefore duplicate both latency and input token cost.

| Intent | Initial output cap | Empty-response retry cap |
|---|---:|---:|
| Summary | 640 | 1,280 |
| Reply with default MiMo | 900 | 1,800 |
| Reply when model name contains `deepseek` | 4,096 | 8,192 |
| Priority | 180 | 1,200 |
| Tasks | 500 | 2,048 |
| Draft | 1,400 | 2,800 |
| Spam | 180 | 1,200 |
| Chat | 800 | 1,600 |

These are ceilings, not proof that all tokens are consumed. They are still unnecessarily large exposure for small JSON outputs.

**Mitigation:** Inspect `finish_reason`, provider error fields, and reasoning-output behavior before retrying. Retry only when the failure is recoverable. Use a model capability profile rather than checking whether the model name contains `deepseek`.

### 4. Output Budgets Exceed the Required Schema

**Verified.** Priority and spam need small JSON objects but can receive 1,200 output tokens on retry. Reply can receive 4,096 or 8,192 tokens based only on a model-name substring (`backend/main.py:385-435`).

Recommended starting output budgets, subject to measurement:

| Intent | Suggested visible-output budget |
|---|---:|
| Priority | 80-120 tokens |
| Spam | 100-150 tokens |
| Phishing | 100-150 tokens |
| Summary | 180-300 tokens |
| Tasks | 300-500 tokens |
| Replies | 450-700 tokens total |
| Chat | 500-800 tokens |
| Draft | 800-1,200 tokens |

If a provider uses hidden reasoning tokens, select a non-reasoning model for small classification tasks or configure reasoning separately when supported. Do not compensate for a mismatched model by giving every request thousands of output tokens.

### 5. Request Bounds Are Incomplete

**Verified.** `ChatRequest` accepts generic dictionaries/lists and a free-string intent. The body is truncated, but `prompt`, sender, subject, snippet, history list length before validation, and total request bytes are not constrained (`backend/main.py:54-60`, `350-353`). Unknown intents are forwarded with a default 1,000-token output cap (`backend/main.py:377-397`).

**Mitigation:** Use an intent enum and typed Pydantic models with per-field and total-size limits. Reject unknown intents. Enforce a model-aware aggregate token budget before contacting the provider.

### 6. Cache Misses Are Not Coalesced

**Verified.** `getOrSetCache` performs read, fetch, and write without an in-flight promise map (`extension/src/shared/cache.ts:30-39`). Concurrent identical misses can both reach the LLM.

**Mitigation:** Keep `Map<cacheKey, Promise<Result>>` in the service worker. Concurrent callers should await one request. Remove the promise in `finally`.

### 7. Cache Keys Do Not Represent the Actual Input

**Verified.** Summary/priority keys contain intent, message ID, and prompt. Spam uses message ID only. Phishing uses the raw URL (`extension/src/background/index.ts:60-72`, `spam.ts:26`, `phishing.ts:42`).

Missing dimensions include:

- Authenticated user ID.
- Email content hash.
- Relevant preference hash.
- Model and prompt-template version.
- Canonical URL without fragment and irrelevant tracking parameters.

This can produce both stale hits and unnecessary misses. Sign-out does not clear MailX session-cache entries (`extension/src/background/supabase.ts:237-242`).

### 8. Long Static Instructions Are Repeated

**Verified.** Every request repeats its complete prompt template. This is especially wasteful when automatic classification is invoked once per row or message (`backend/main.py:73-139`).

**Mitigation:** First eliminate excess calls, which has much larger impact than shortening instructions. Then simplify templates, use provider prompt caching if it is actually supported and measured, and move reliable validation into code rather than repeatedly explaining every formatting rule to the model.

### 9. No Token Telemetry Exists

**Verified.** The backend reads choices but discards provider `usage`, `finish_reason`, and provider request identifiers (`backend/main.py:427-452`). Without these data, token optimization is guesswork.

**Mitigation:** Record privacy-safe metrics for input tokens, output tokens, total tokens, model, intent, cache result, retry reason, and duration. Never log email text, prompts, model response text, tokens, or credentials.

## Why Features Feel Slow

### 1. Background Work Blocks Foreground Work

**Verified.** The service worker allows two jobs at a time. Only `CHAT` goes to the front of the queue. Summary, smart reply, draft, and task extraction wait behind automatic priority/spam/link jobs (`extension/src/background/index.ts:10-27`, `71-73`).

**Mitigation:** Use separate foreground and background queues. Reserve at least one slot for explicit actions. Mark Summary, Reply, Tasks, Draft, and Chat as foreground. Expire queued background work after navigation or a short deadline.

Do not simply increase concurrency without limits. A larger burst can make a free provider slower or trigger more 429 responses.

### 2. Fetches Have No Deadline or Cancellation

**Verified.** Extension LLM and Gmail fetches have no `AbortController` (`extension/src/background/api.ts:5-29`, `gmail.ts:6-17`). Two hung AI calls can occupy both slots indefinitely.

**Mitigation:** Add intent-specific deadlines and propagate cancellation. Suggested initial client deadlines are 15 seconds for classifiers, 25 seconds for summary/reply/tasks, and 40 seconds for chat/draft. Measure before finalizing.

### 3. Backend Retries Can Create Extreme Tail Latency

**Verified.** Most provider calls use a 60-second operation timeout, retry transport failures once, and can enter another complete phase after an empty response (`backend/main.py:405-435`). There is no strict total request deadline.

**Mitigation:** Add one end-to-end deadline around all attempts. Retry only selected 429/502/503/504 responses with bounded exponential backoff and `Retry-After`. Be cautious retrying read timeouts because the provider may already have generated and charged for the request.

### 4. Provider Connections Are Not Reused

**Verified.** Every `/chat` call creates and closes a new `httpx.AsyncClient` (`backend/main.py:423-426`). This prevents effective connection pooling and can repeat DNS, TCP, and TLS overhead.

**Mitigation:** Create one lifespan-managed `AsyncClient` with explicit keep-alive and connection limits, then reuse it for all provider calls.

### 5. Preferences Are Loaded Before Cache Lookup

**Verified.** Standard AI handling fetches preferences before `getOrSetCache`, even when a cached summary or priority result exists (`extension/src/background/index.ts:63-73`). `getPreferences` then reads the session and performs a Supabase query for a real user (`extension/src/background/supabase.ts:51-74`).

An opened message with ten links can cause roughly 13 session lookups and 12 preference retrievals across priority, spam, and link checks before cache/local-rule effects are considered.

**Mitigation:** Cache session and preferences in service-worker memory with a short TTL. Invalidate on save, sign-out, and auth changes. Check response caches before loading unrelated preferences. Load preferences once for a toolbar batch.

### 6. Gmail DOM Work Is Broad and Repeated

**Verified.** The content script combines a one-second poll with a document-wide subtree `MutationObserver`. Every observer callback scans all visible `.a3s` bodies (`extension/src/content/index.ts:43-49`, `322-350`).

**Mitigation:** Debounce observer work, inspect only `addedNodes`, observe the narrowest stable Gmail container available, and remove the duplicate one-second toolbar scan. Keep a periodic low-frequency recovery scan only as a fallback.

### 7. Non-Streaming Responses Delay First Feedback

**Verified.** The browser waits for the complete provider response. This affects long chat and draft generations more than small classifiers.

**Mitigation:** First fix queue wait and provider request overhead. Streaming can then improve perceived chat/draft latency, but it requires a larger change across FastAPI, extension messaging, and UI. It is not the first optimization to implement.

### 8. Task Persistence Extends AI Completion Time

**Verified.** Task extraction waits for parsing, deduplication query, and inserts before returning to the UI (`extension/src/background/index.ts:74-77`, `supabase.ts:96-119`).

**Mitigation:** Return validated tasks to the UI immediately, then persist in the background with visible save status, or use one atomic database upsert and return only required columns.

## Gmail, Supabase, and Reminder Performance

### Gmail API Configuration Defect

**Verified.** The service worker calls `https://gmail.googleapis.com`, but that origin is absent from `host_permissions` (`extension/src/background/gmail.ts:4-16`, `extension/manifest.json:13-17`). FR6 and FR10 can fail regardless of performance until this is fixed.

### Statistics Enumerate Every Gmail Message

**Verified.** `countMessages` paginates through all matching message IDs to calculate a count (`extension/src/background/gmail.ts:49-58`). Large mailboxes require many sequential requests.

**Mitigation:** Decide whether an approximate dashboard count using Gmail's `resultSizeEstimate` is acceptable. Otherwise store daily aggregates or perform incremental synchronization. Avoid downloading every ID for every popup period change.

### Reminder Checks Have N+1 Request Patterns

**Verified.** A reminder run lists up to 100 threads, fetches each thread serially, processes tasks serially, performs select-then-insert reminder operations, and fetches reminders again for the badge (`extension/src/background/gmail.ts:69-88`, `reminders.ts:14-77`, `supabase.ts:171-181`).

**Mitigation:**

1. Query only pending tasks with a due date at or before tomorrow.
2. Resolve completed reminders in one update.
3. Fetch Gmail thread metadata with bounded concurrency of approximately 5-10.
4. Add a unique reminder constraint and use true upsert.
5. Use a count query for the badge instead of returning all reminder rows.
6. Reuse one loaded provider token throughout the reminder run.

### Database Aggregation Happens in the Browser

**Verified.** Statistics fetch task and sender rows and count them in JavaScript (`extension/src/background/stats.ts:21-34`). `sender_scores` is never populated by current application code, and `email_activity` is never read or written.

**Mitigation:** Choose one coherent statistics architecture. Either use count-only queries/one aggregate RPC, or populate daily `email_activity` rollups. Remove unused metrics and tables if they are outside current scope.

### Live Supabase Advisor Results

The connected database currently has seven performance warnings because RLS policies call `auth.uid()` per row. Replace policy expressions such as `auth.uid() = user_id` with `(select auth.uid()) = user_id` where appropriate. The warnings affect `preferences`, `sender_scores`, `tasks`, `reminders`, `email_activity`, `tracked_emails`, and `open_events`.

Advisor remediation: <https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan>

The advisor also reports three currently unused indexes. Low row counts mean this is not yet a production bottleneck; do not remove indexes solely because they are unused in a nearly empty database. Review query plans after realistic usage.

The security advisor reports leaked-password protection is disabled. This is not a latency issue, but should be enabled if password authentication is allowed.

Security remediation: <https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection>

### Missing and Redundant Database Structures

Recommended structures after validating real query plans:

| Need | Suggested structure |
|---|---|
| Task list/statistics | Index `(user_id, created_at desc)` |
| Due reminder scan | Index `(user_id, status, due_date)` |
| Active reminders | Partial index `(user_id, created_at desc) WHERE NOT dismissed AND NOT resolved` |
| Atomic reminder upsert | Unique `(user_id, type, source_id)` |
| Sender threshold count | Index `(user_id, score)` |
| Task deduplication | Stable dedupe key plus unique `(user_id, email_id, dedupe_key)` |

`idx_sender_scores_user` is likely redundant because the unique `(user_id, sender_email)` index already starts with `user_id`. `idx_email_activity_user_date` duplicates the unique index on the same columns (`supabase/schema.sql:24-37`, `72-81`, `158-164`). Confirm with production query statistics before removal.

### Tracking Pixel Performs Three Sequential Database Calls

**Verified.** A pixel hit performs GET, POST, and PATCH before returning the image. The increment is a non-atomic read-modify-write (`backend/main.py:480-494`).

**Mitigation:** If tracking remains in scope, replace this with one atomic PostgreSQL function/RPC that inserts the event and increments counters in one transaction. Always return the GIF even when persistence fails. The current extension does not register tracked messages or inject pixels, so removing this incomplete feature is also a valid simplification.

## Correctness and Security Improvements

These are not the primary speed causes, but they materially affect safe optimization and deployment.

### Critical

- `/chat` has no server-side authentication. The extension sends no bearer token, and CORS accepts any Chrome extension origin (`backend/main.py:19-24`, `339-348`; `extension/src/background/api.ts:5-10`). This exposes shared LLM quota.
- `CHECK_SPAM` and `CHECK_PHISHING_URL` bypass even the extension's local session gate (`extension/src/background/index.ts:91-99`).
- Email bodies are automatically transmitted for spam classification without an explicit action (`extension/src/content/index.ts:385-413`).
- Generic request models and unknown intents make the backend a general-purpose LLM relay (`backend/main.py:54-60`, `377-397`).
- A provider credential exists in the local ignored environment file. Rotate it if it has been shared or captured. Add `.dockerignore`; `backend/Dockerfile` currently copies its whole build context.

### High

- Auth sessions and Google provider tokens are persisted in `chrome.storage.local`, and access is not restricted to trusted extension contexts (`extension/src/background/supabase.ts:10-31`).
- Google provider-token refresh is not implemented. Supabase session refresh does not guarantee refreshed Google provider tokens (`extension/src/background/gmail.ts:6-16`).
- OAuth requests `gmail.send`, but current code only reads Gmail API data and inserts drafts through the Gmail DOM (`extension/src/background/supabase.ts:184-192`). Remove the unused sensitive scope.
- Dev Login is exposed in the regular popup and creates a synthetic session. It should be compile-gated to development builds.
- Untrusted email content is embedded into the chat system message (`backend/main.py:132-139`, `372-375`). Keep system instructions separate from email data.

### Correctness

- Open-message priority context contains body but no snippet, while the backend priority prompt ignores body. The call often classifies only sender and subject (`extension/src/content/index.ts:385-403`; `backend/main.py:168-173`).
- Structured outputs are returned as strings and extracted with greedy regexes in several places. Use provider structured output, validate server-side, and return typed payloads.
- Cache entries are not scoped by user and survive sign-out for the browser session.
- Popup preference saves can reset hidden spam/phishing values because partial data is merged with defaults rather than the current stored row (`extension/src/background/supabase.ts:77-84`).
- Reminder select-then-insert operations are race-prone because there is no matching uniqueness constraint.
- Tracking counters can lose increments under concurrency.

## Build and Deployment Improvements

- The extension backend URL is hardcoded to localhost, and the manifest grants no production backend host (`extension/src/background/api.ts:3`, `extension/manifest.json:13-17`). Use environment-specific build configuration.
- Production source maps are always enabled (`extension/vite.config.ts:8-11`). Disable them for release or upload them separately.
- `tsc && vite build` emits TypeScript output that Vite rebuilds. Prefer `tsc --noEmit && vite build` (`extension/package.json:6-9`).
- The current Supabase dependency range resolves versions requiring newer Node versions than the documented Node 18 baseline. Pin a tested compatible release or update the documented/runtime engine requirement.
- The Docker/Render build context is ambiguous. Set the backend directory as the explicit Docker context and add a restrictive `.dockerignore`.
- Backend Python dependencies are unpinned. Use tested version ranges or a lock/constraints file for reproducible latency and behavior.

## Dead or Incomplete Runtime Paths

Removing unused code will not transform latency, but it reduces bundle size and makes optimization safer.

- `extension/src/shared/helpers.ts` is unused; DOMPurify is therefore also unused.
- `healthCheck` in `extension/src/background/api.ts` is unused.
- `getMessageContext` in `extension/src/background/gmail.ts` is unused.
- Several older automatic-check helpers in `extension/src/content/index.ts:810-935` are unused.
- `conversation_id` is transported but unused by the backend.
- `phishing_sensitivity` is stored but not applied.
- `sender_scores` is read but never written.
- `email_activity` is neither read nor written.
- Tracking tables and endpoint exist, but the extension has no complete registration/injection flow.
- `GET_TASKS` has no current UI caller.
- The content script listens for `RENDER_RESULT`, but the background does not send it.

## Prioritized Optimization Plan

### P0: Implement First

| Change | Expected result | Complexity |
|---|---|---:|
| Disable automatic remote priority/spam/link checks by default | Largest reduction in token use and queue wait | Medium |
| Stop or batch inbox priority scanning | Removes up to 30 LLM calls/minute | Medium |
| Prioritize all explicit AI actions and reserve a foreground slot | Immediate improvement in perceived responsiveness | Low-Medium |
| Add extension deadlines and cancellation | Prevents permanent queue blockage | Medium |
| Reuse a lifespan-managed backend HTTP client | Reduces connection overhead | Low-Medium |
| Cache session/preferences and check response cache first | Removes repeated Supabase/auth waits | Low-Medium |
| Add in-flight cache coalescing | Prevents concurrent duplicate LLM calls | Low-Medium |
| Record token usage and timing | Makes later optimization evidence-based | Medium |

### P1: High Value

| Change | Expected result | Complexity |
|---|---|---:|
| Typed request models, intent allowlist, and total token budget | Prevents oversized requests and quota abuse | Medium |
| Structured output with server-side validation | Fewer parse failures and user retries | Medium |
| Compact chat history and select relevant email excerpts | Large savings in multi-turn conversations | Medium |
| Bounded retry policy with one total deadline | Reduces tail latency and duplicate generation | Medium |
| Debounced, scoped Gmail DOM observation | Reduces Gmail main-thread work | Medium |
| Bounded Gmail thread concurrency and batched reminder writes | Large reminder speedup | Medium-High |
| Aggregate/count statistics queries | Reduces Gmail and Supabase round trips | Medium |
| Unique task/reminder keys and true upserts | Removes preflight queries and races | Medium |
| Fix all seven RLS initialization-plan warnings | Better database scaling | Low |

### P2: After Measurement

| Change | Expected result | Complexity |
|---|---|---:|
| Stream chat and draft responses | Faster perceived first response | High |
| Provider/model benchmark by intent | Selects the best latency/quality/cost combination | Medium |
| Daily statistics rollups | Faster dashboards for large mailboxes | Medium-High |
| Split the 1,674-line content script by responsibility | Safer maintenance and profiling | Medium |
| Remove dead/incomplete features and unused dependencies | Smaller, clearer release | Low-Medium |

## Recommended Target Architecture

```text
Gmail content script
  -> event-driven, debounced DOM adapter
  -> explicit user action
  -> typed message to service worker

Service worker
  -> cached authenticated session and preferences
  -> cache/in-flight dedupe before network
  -> foreground queue with reserved capacity
  -> cancellable request with deadline

FastAPI
  -> verified Supabase JWT
  -> typed intent-specific request validation
  -> aggregate token budget
  -> shared provider HTTP client
  -> bounded retry and total deadline
  -> structured validated result
  -> privacy-safe usage/timing metrics

Supabase/Gmail
  -> count/aggregate queries
  -> unique constraints and atomic upserts
  -> bounded Gmail concurrency
  -> no client-side N+1 processing
```

## Measurement Plan

Optimization should be validated against a small repeatable benchmark rather than judged only by feel.

Record these timestamps for every AI action:

- `ui_clicked_at`
- `message_received_at`
- `queue_started_at`
- `provider_started_at`
- `provider_finished_at`
- `persistence_finished_at`
- `ui_rendered_at`

Calculate:

- Queue wait.
- Supabase/preferences wait.
- Provider latency.
- Persistence latency.
- Total click-to-result latency.
- P50, P95, and failure rate by intent.

Record these token/call metrics:

- Intent and model.
- Input, output, and total tokens from provider `usage`.
- Input characters as a fallback.
- Cache hit, miss, and coalesced request.
- Retry count and reason.
- `finish_reason`.
- Automatic versus explicit request source.
- Calls per opened email and calls per active minute.

Suggested acceptance targets after P0/P1 work:

| Metric | Target |
|---|---:|
| Automatic remote AI calls after opening an email | 0 by default |
| Duplicate concurrent requests for the same key | 0 |
| Foreground queue wait with background work active | Less than 250 ms when one slot is available |
| Classifier total deadline | 15 seconds or less |
| Summary/reply P95 target | Establish baseline, then reduce by at least 30% |
| Cache-hit Supabase preference calls | 0 |
| Reminder Gmail thread concurrency | Bounded at 5-10 |
| Unknown backend intents accepted | 0 |

Do not log email body, subject, sender, prompt, raw model response, access token, API key, or full URL query parameters.

## Verification and Test Gaps

Current automated coverage is limited to seven backend helper/prompt tests. The extension has no test script.

Highest-priority additions:

1. Queue ordering, timeout release, cancellation, and foreground reservation tests.
2. In-flight cache deduplication and user/content/preference invalidation tests.
3. API request-size, intent allowlist, auth, timeout, retry, invalid JSON, and empty-output tests.
4. Token-budget tests including Unicode-heavy input.
5. Structured result validation for every intent.
6. Gmail observer tests that assert request counts per message and prevent signed-out retry loops.
7. Gmail 401, 429, pagination, and bounded thread-concurrency tests.
8. Reminder uniqueness, stale-state transition, and notification deduplication tests.
9. Supabase RLS cross-user isolation tests and migration tests.
10. Release checks that reject localhost URLs, development artifacts, missing Gmail API permissions, and release source maps.

## Codebase Improvements Beyond Performance

- Split `extension/src/content/index.ts` into Gmail selectors/adapters, toolbar, panel/chat, compose integration, and parsers. This file currently mixes CSS, DOM scanning, network orchestration, state, rendering, and compose mutation.
- Split `backend/main.py` into request models, prompt builders, provider client, output validators, and routes once behavior is protected by tests.
- Replace `any`, generic dictionaries, and stringly typed message results with discriminated TypeScript and Pydantic types.
- Adopt versioned Supabase migrations instead of manually rerunning `schema.sql` with `CREATE TABLE IF NOT EXISTS`.
- Reconcile `README.md`, `SETUP.md`, `PROJECT_STATUS.md`, `AGENTS.md`, and the revised architecture document with actual runtime behavior. Current documents disagree on model, authentication, deferred features, and data flow.

## Recommended Implementation Order

1. Add telemetry for queue time, provider time, provider usage, cache outcome, and retry reason.
2. Disable automatic remote analysis and stop inbox row-by-row LLM scanning.
3. Add foreground queue priority, deadlines, cancellation, and in-flight deduplication.
4. Cache session/preferences and move cache checks ahead of unrelated Supabase calls.
5. Reuse one backend HTTP client and enforce one total provider deadline.
6. Add typed request limits, intent allowlisting, JWT authentication, and structured output validation.
7. Compact chat context and tune per-intent token budgets from measured usage.
8. Fix Gmail permissions/token lifecycle, reminder N+1 behavior, and statistics aggregation.
9. Add database uniqueness/index/RLS migrations and integration tests.
10. Remove incomplete/dead features, fix release configuration, and update documentation.

## Final Assessment

The current model/provider may contribute to latency, especially because a free service can queue or throttle requests, but the codebase creates substantial delay before and around the provider. Changing models alone will not fix automatic request flooding, head-of-line blocking, repeated Supabase calls, missing deadlines, duplicate requests, repeated chat context, or N+1 Gmail operations.

The dominant token-saving action is to stop automatic per-message and per-row LLM work. The dominant perceived-speed actions are to protect foreground queue capacity, add deadlines/cancellation, avoid repeated auth/preferences calls, coalesce duplicate requests, and reuse backend connections. Instrumentation should then identify whether the provider/model remains the largest component and whether a paid or faster model is justified.
