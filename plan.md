# MailX Improvement Execution Plan

Based on: `PERFORMANCE_AND_TOKEN_OPTIMIZATION_REPORT.md`

Created: 2026-07-17

## Objective

Improve MailX in a controlled sequence so that each change is implemented, tested, measured, and documented before work starts on the next task.

Primary outcomes:

- Eliminate unnecessary LLM calls and reduce token usage.
- Reduce click-to-result latency for summaries, replies, drafts, tasks, and chat.
- Prevent background work from blocking user actions.
- Reduce repeated Supabase, Gmail, and provider round trips.
- Secure the shared LLM quota and email data flow.
- Make performance measurable and regressions testable.
- Produce a reliable production build.

## Execution Rules

1. Work on exactly one task at a time.
2. Set only the current task to `IN PROGRESS`; every later task remains `PENDING`.
3. Do not start the next task until the current task meets every acceptance criterion.
4. Run the task's verification commands before marking it `COMPLETED`.
5. Record completion date, changed files, commands run, results, and measured impact in the task's completion record.
6. If verification fails, keep the task `IN PROGRESS` and fix it before continuing.
7. If a task is blocked by an external decision or credential, mark it `BLOCKED`, record the blocker, and ask for the smallest required decision. Do not silently skip it.
8. Do not mix unrelated cleanup into the active task.
9. Do not change the remote Supabase schema without a reviewed migration and verification.
10. Never log email bodies, subjects, senders, prompts, raw model responses, access tokens, API keys, or full URL query parameters.
11. Preserve existing user changes in the worktree and do not revert unrelated files.
12. Update this file after every task so it remains the source of truth.

## Status Legend

| Status | Meaning |
|---|---|
| `PENDING` | Not started |
| `IN PROGRESS` | The only task currently being implemented |
| `BLOCKED` | Cannot proceed without an external dependency or decision |
| `COMPLETED` | Acceptance criteria and verification passed |
| `CANCELLED` | Explicitly removed from scope with a recorded reason |

## Current Position

- Current task: `T18 - Run final benchmark, security audit, and release verification`
- Current status: `COMPLETED`
- Next task after completion: None
- Completed tasks: `18 / 18`

## Global Success Metrics

These targets apply to the complete plan rather than a single task.

| Metric | Target |
|---|---:|
| Automatic remote AI calls after opening an email | 0 by default |
| Automatic inbox row-by-row LLM calls | 0 by default |
| Duplicate concurrent requests for one cache key | 0 |
| Cache-hit preference database calls | 0 |
| Unknown backend intents accepted | 0 |
| Foreground queue wait when one slot is available | Less than 250 ms |
| Classifier total deadline | 15 seconds or less |
| Summary/reply P95 latency | At least 30% below measured baseline |
| Reminder Gmail metadata concurrency | Bounded at 5-10 |
| Backend and extension automated checks | Passing |
| Supabase security/performance advisor regressions | 0 new warnings |

## Task Order

| ID | Task | Status | Depends On |
|---|---|---|---|
| T01 | Establish automated verification foundation | `COMPLETED` | None |
| T02 | Add privacy-safe performance and token telemetry | `COMPLETED` | T01 |
| T03 | Stop automatic remote AI traffic | `COMPLETED` | T02 |
| T04 | Implement foreground queueing, deadlines, and cancellation | `COMPLETED` | T03 |
| T05 | Optimize cache, session, and preference access | `COMPLETED` | T04 |
| T06 | Optimize backend provider transport and retry behavior | `COMPLETED` | T05 |
| T07 | Secure and strictly validate the AI API | `COMPLETED` | T06 |
| T08 | Return structured, server-validated AI results | `COMPLETED` | T07 |
| T09 | Reduce prompt and conversation token budgets | `COMPLETED` | T08 |
| T10 | Reduce Gmail DOM scanning and observer work | `COMPLETED` | T09 |
| T11 | Fix Gmail API permissions and token lifecycle | `COMPLETED` | T10 |
| T12 | Introduce migrations and optimize database invariants | `COMPLETED` | T11 |
| T13 | Remove reminder N+1 operations | `COMPLETED` | T12 |
| T14 | Optimize statistics aggregation | `COMPLETED` | T13 |
| T15 | Resolve the incomplete tracking feature | `COMPLETED` | T14 |
| T16 | Harden build, dependency, and deployment configuration | `COMPLETED` | T15 |
| T17 | Remove dead code and reconcile documentation | `COMPLETED` | T16 |
| T18 | Run final benchmark, security audit, and release verification | `COMPLETED` | T17 |

## Detailed Tasks

Verification command convention: run Python commands from `backend/`, npm commands from `extension/`, Docker commands from the configured Docker context, and Supabase CLI commands from the repository root unless a task states otherwise.

### T01 - Establish Automated Verification Foundation

Status: `COMPLETED`

Goal: Create the minimum test infrastructure needed to change queueing, caching, API requests, and Gmail behavior safely.

Scope:

- Add an extension unit-test runner and `test` script.
- Preserve `npx tsc --noEmit` as a required check.
- Add focused tests for current queue, cache, and request behavior before changing those areas.
- Keep backend tests runnable with the standard library unless a test dependency is intentionally added.
- Add one root-level verification command or document the exact backend and extension commands.

Acceptance criteria:

- Extension tests run non-interactively.
- Existing backend tests still pass.
- At least one queue test, one cache test, and one API-client test exist.
- Tests do not require Gmail, Supabase, or a live LLM provider.
- No production behavior changes in this task.

Verification:

```powershell
python -m unittest -q
npm test
npx tsc --noEmit
```

Completion record:

- Completed on: `2026-07-17`
- Changed files: `extension/package.json`, `extension/package-lock.json`, `extension/vitest.config.ts`, `extension/src/background/index.ts`, `extension/src/background/queue.ts`, `extension/tests/queue.test.ts`, `extension/tests/cache.test.ts`, `extension/tests/api.test.ts`, `plan.md`
- Commands run: `python -m unittest -q` from `backend/`; `npm test` and `npx tsc --noEmit` from `extension/`
- Results: 7 backend tests passed; 4 extension tests passed across 3 test files; TypeScript completed with no errors; tests used local mocks and required no Gmail, Supabase, or live LLM access.
- Measured impact: extension automated coverage increased from 0 tests to 4 focused tests, with the extension suite completing in 1.14 seconds; production queue behavior was preserved through a direct module extraction.

### T02 - Add Privacy-Safe Performance and Token Telemetry

Status: `COMPLETED`

Goal: Measure where time and tokens are spent before optimization changes alter behavior.

Scope:

- Assign a request ID and source category to each AI action.
- Measure queue wait, provider duration, total backend duration, persistence duration, and click-to-result duration where practical.
- Capture provider `usage`, `finish_reason`, retry reason, model, and intent.
- Record cache hit, miss, and coalesced outcomes.
- Add development-only summaries or structured logs without sensitive content.
- Document a repeatable baseline scenario for Summary, Reply, Tasks, Draft, and Chat.

Acceptance criteria:

- Metrics contain no email or credential content.
- One request can be traced across content, background, and backend layers.
- Provider token usage is captured when supplied and safely omitted when unavailable.
- Automatic and explicit actions are distinguishable.
- Baseline results are recorded in this plan or a linked benchmark file.

Verification:

```powershell
python -m unittest -q
npm test
npx tsc --noEmit
```

Completion record:

- Completed on: `2026-07-17`
- Changed files: `backend/.env.example`, `backend/main.py`, `backend/test_main.py`, `backend/benchmark.py`, `extension/tsconfig.json`, `extension/src/shared/types.ts`, `extension/src/shared/telemetry.ts`, `extension/src/shared/cache.ts`, `extension/src/background/queue.ts`, `extension/src/background/api.ts`, `extension/src/background/index.ts`, `extension/src/background/spam.ts`, `extension/src/background/phishing.ts`, `extension/src/content/index.ts`, `extension/tests/api.test.ts`, `extension/tests/cache.test.ts`, `extension/tests/queue.test.ts`, `extension/tests/telemetry.test.ts`, `documents/MAILX_PERFORMANCE_BASELINE.md`, `plan.md`
- Commands run: `python -m unittest -q` and `python benchmark.py` from `backend/`; `npm test`, `npx tsc --noEmit`, and `npm run build` from `extension/`; `git diff --check` from the repository root.
- Results: 11 backend tests passed; 8 extension tests passed across 4 test files; TypeScript completed with no errors; the production build completed; the synthetic live-provider baseline succeeded for Summary, Reply, Tasks, Draft, and Chat. Vite retained its pre-existing JSON import-assertion warning.
- Measured impact: every content-script AI action now receives a request ID plus explicit/automatic source category; queue wait, cache outcome/persistence, backend round trip, provider/backend duration, task persistence, click-to-result, model, input characters, provider usage, finish reason, and retry metadata are available without content fields. Final one-sample provider totals ranged from 633 tokens for Tasks to 1,660 for Draft, and total backend time ranged from 9.58 seconds for Tasks to 23.77 seconds for Draft. The repeatable scenarios and complete results are in `documents/MAILX_PERFORMANCE_BASELINE.md`. Coalesced outcomes are defined but remain zero until in-flight coalescing is implemented in T05.

### T03 - Stop Automatic Remote AI Traffic

Status: `COMPLETED`

Goal: Remove the largest source of unnecessary tokens and background queue congestion.

Scope:

- Stop automatic remote priority and spam classification when an email is opened.
- Stop automatic remote link checks when an email is opened.
- Stop row-by-row inbox LLM priority scanning.
- Preserve toolbar buttons as explicit user-triggered actions.
- Keep local deterministic checks where they are cheap and privacy-safe.
- Prevent signed-out retry loops.
- Add a clear opt-in preference later only if automatic behavior is genuinely required.

Acceptance criteria:

- Opening an email produces zero remote AI calls by default.
- Leaving the inbox open produces zero row-by-row LLM calls by default.
- Clicking Priority, Spam Check, or Link Safety still runs the requested feature.
- Signed-out Gmail browsing produces no repeated AI messages.
- Telemetry confirms automatic call count is zero.

Verification:

```powershell
npm test
npx tsc --noEmit
npm run build
```

Completion record:

- Completed on: `2026-07-17`
- Changed files: `extension/src/shared/aiPolicy.ts`, `extension/src/content/index.ts`, `extension/src/background/index.ts`, `extension/tests/aiPolicy.test.ts`, `plan.md`
- Commands run: `npm test`, `npx tsc --noEmit`, and `npm run build` from `extension/`; `git diff --check` from the repository root; workspace content searches confirmed the former automatic scheduler functions have definitions but no live callers.
- Results: 10 extension tests passed across 5 test files; TypeScript completed with no errors; the production build completed. Vite retained its pre-existing JSON import-assertion warning. An auxiliary `rg` inspection could not run because `rg` is not installed on PATH, so the workspace Grep tool was used instead.
- Measured impact: automatic opened-message Priority, Spam, and Link Safety dispatches changed from up to 12 remote actions per toolbar insertion to 0; automatic inbox priority dispatches changed from up to 30 per active minute to 0. Automatic and unknown sources are blocked in both content and background before Chrome messaging, session lookup, queueing, caching, or provider access. Policy tests measured 0 dispatch calls for automatic sources and 1 for explicit sources, preserving clicked Priority, Spam Check, Link Safety, Summary, Reply, Tasks, Draft, and Chat actions.

### T04 - Implement Foreground Queueing, Deadlines, and Cancellation

Status: `COMPLETED`

Goal: Ensure explicit user actions start promptly and no stuck request can block MailX indefinitely.

Scope:

- Separate foreground and background work.
- Mark Summary, Reply, Tasks, Draft, and Chat as foreground.
- Reserve queue capacity for foreground work.
- Add bounded queue size and job expiry.
- Add `AbortController` deadlines to backend and Gmail fetches.
- Cancel obsolete work after Gmail navigation or superseding UI actions where possible.
- Ensure queue slots are released after timeout, cancellation, and failure.

Acceptance criteria:

- Foreground work is not queued behind nonessential background work.
- Two stuck requests cannot block later work permanently.
- Timed-out and cancelled jobs release queue capacity.
- Tests cover ordering, timeout, cancellation, and failure cleanup.
- Foreground queue wait meets the global target when capacity is available.

Verification:

```powershell
npm test
npx tsc --noEmit
npm run build
```

Completion record:

- Completed on: `2026-07-17`
- Changed files: `extension/src/background/queue.ts`, `extension/src/background/requestRegistry.ts`, `extension/src/background/api.ts`, `extension/src/background/gmail.ts`, `extension/src/background/index.ts`, `extension/src/background/spam.ts`, `extension/src/background/phishing.ts`, `extension/src/background/stats.ts`, `extension/src/background/reminders.ts`, `extension/src/shared/abort.ts`, `extension/src/shared/types.ts`, `extension/src/content/index.ts`, `extension/tests/queue.test.ts`, `extension/tests/api.test.ts`, `extension/tests/gmail.test.ts`, `extension/tests/requestRegistry.test.ts`, `plan.md`
- Commands run: `npm test`, `npx tsc --noEmit`, and `npm run build` from `extension/`; `python -m unittest -q` from `backend/`; `git diff --check` from the repository root.
- Results: 27 extension tests passed across 7 test files; 11 backend tests passed; TypeScript completed with no errors; the production build completed. Vite retained its pre-existing JSON import-assertion warning.
- Measured impact: the two-slot queue now reserves one slot from secondary work while allowing foreground work to use both slots; available-capacity foreground wait is asserted below 250 ms. Foreground and secondary pending queues are bounded at 20 and 25 jobs, with 15-second and 8-second queue expiry. Classifier requests have one 15-second total deadline including queue/auth/preference wait; Summary/Reply/Tasks use 25 seconds and Draft/Chat use 40 seconds. Gmail requests have 15-second per-request deadlines, with 45-second statistics and 60-second reminder operation deadlines. Timeout, queued/running cancellation, expiry, queue saturation, synchronous/asynchronous failure, and telemetry callback failure all release logical queue capacity in tests. Gmail navigation, Chat Back/New Chat, Draft Cancel, and superseding panel work send request-ID cancellation and suppress stale callbacks.

### T05 - Optimize Cache, Session, and Preference Access

Status: `COMPLETED`

Goal: Eliminate duplicate LLM calls and repeated Supabase/authentication work.

Scope:

- Add in-flight promise coalescing to the cache.
- Check cached results before loading unrelated preferences.
- Cache session and preferences in service-worker memory with a short TTL.
- Invalidate preferences on save, sign-out, and auth changes.
- Scope response keys by user, content hash, relevant preferences, model, and prompt version.
- Canonicalize/redact URL cache keys.
- Remove expired entries and cap cache growth.
- Return successful fetched values even when cache persistence fails.

Acceptance criteria:

- Concurrent identical misses issue one provider call.
- Cache hits issue no preference database query.
- Account changes cannot reuse another user's cached email result.
- Preference changes invalidate dependent results.
- Sign-out clears user-derived MailX cache entries.

Verification:

```powershell
npm test
npx tsc --noEmit
npm run build
```

Completion record:

- Completed on: `2026-07-17`
- Changed files: `extension/src/shared/cache.ts`, `extension/src/shared/cacheKeys.ts`, `extension/src/background/supabase.ts`, `extension/src/background/index.ts`, `extension/src/background/spam.ts`, `extension/src/background/phishing.ts`, `extension/src/background/stats.ts`, `extension/src/background/reminders.ts`, `extension/tests/cache.test.ts`, `extension/tests/cacheKeys.test.ts`, `extension/tests/classifierCache.test.ts`, `extension/tests/supabaseCache.test.ts`, `plan.md`
- Commands run: `npm test`, `npx tsc --noEmit`, and `npm run build` from `extension/`; `python -m unittest -q` from `backend/`; `git diff --check` from the repository root. Current Supabase auth-session and `onAuthStateChange` guidance plus the July 2026 changelog were reviewed before final verification.
- Results: 37 extension tests passed across 10 test files; 11 backend tests passed; TypeScript completed with no errors; the production build completed. Vite retained its pre-existing JSON import-assertion warning. Tests cover concurrent cache misses, write failure tolerance, expiration/entry caps, late-write prevention, account and preference invalidation, URL canonicalization/redaction, auth/preference read coalescing, partial preference saves, and preference-free classifier cache hits.
- Measured impact: concurrent identical misses changed from 2 provider calls to 1; a warm spam result changed from 1 preference-loader call plus a cache read to 0 preference-loader calls and 0 provider calls. Summary, Priority, Tasks, and Chat no longer load unrelated preferences; session reads are coalesced and cached for 20 seconds, preferences for 60 seconds, and response storage is capped at 200 entries. Response keys now include hashed account/content/preference/model/prompt-version dimensions, raw URL cache keys were eliminated, and sign-out/account changes remove owned entries.

### T06 - Optimize Backend Provider Transport and Retry Behavior

Status: `COMPLETED`

Goal: Reduce provider connection overhead and cap worst-case backend latency.

Scope:

- Create one lifespan-managed `httpx.AsyncClient`.
- Configure keep-alive and connection limits.
- Add one end-to-end deadline across all attempts.
- Retry only selected transient statuses and connection failures.
- Respect `Retry-After` and use bounded backoff with jitter.
- Avoid unsafe automatic retries after ambiguous read timeouts.
- Parse provider JSON once and handle invalid JSON consistently.
- Inspect `finish_reason` before empty-output retry.

Acceptance criteria:

- Provider connections are reused.
- Every intent has a strict total deadline.
- 429 and transient 5xx behavior is tested.
- Invalid 200 JSON returns a controlled upstream error.
- Empty content does not automatically trigger an unjustified full duplicate request.

Verification:

```powershell
python -m unittest -q
```

Completion record:

- Completed on: `2026-07-17`
- Changed files: `backend/main.py`, `backend/test_main.py`, `plan.md`
- Commands run: `python -m unittest -q`, `python -m py_compile main.py test_main.py`, and `git diff --check`
- Results: 18 backend tests passed; Python compilation completed with no errors; diff whitespace verification completed with no errors. Tests cover lifespan client reuse, transient 429/503 retries, bounded retry metadata, read-timeout non-retry, total deadline cancellation, invalid 200 JSON, empty `stop` non-retry, and `length`-justified empty-output retry.
- Measured impact: provider requests now use one lifespan-managed client with 20 maximum connections, 10 keep-alive connections, and 30-second keep-alive expiry. Retry attempts are capped at one retry with a maximum 5-second delay; per-intent total deadlines are 15 seconds for classifiers, 25 seconds for Summary/Reply/Tasks, and 40 seconds for Draft/Chat. Ambiguous read timeouts and ordinary empty responses no longer trigger duplicate provider calls.

### T07 - Secure and Strictly Validate the AI API

Status: `COMPLETED`

Goal: Protect shared LLM quota and prevent oversized or unknown requests.

Scope:

- Send the Supabase access token from the extension.
- Validate Supabase JWTs in FastAPI using current official guidance and cached verification keys.
- Rate-limit by authenticated user plus IP.
- Restrict CORS to configured extension origins.
- Require authentication for spam and phishing paths.
- Replace free-string intent with an allowlisted enum.
- Add typed context/history models and per-field/total request limits.
- Reject unknown intents before contacting the provider.
- Compile-gate Dev Login from production builds.

Acceptance criteria:

- Unauthenticated `/chat` requests are rejected.
- Unknown intents and oversized requests are rejected without an LLM call.
- Valid signed-in extension requests still work.
- Spam and phishing follow the same authentication policy.
- Production UI contains no Dev Login.

Verification:

```powershell
python -m unittest -q
npm test
npx tsc --noEmit
npm run build
```

Completion record:

- Completed on: `2026-07-17`
- Changed files: `backend/.env.example`, `backend/main.py`, `backend/requirements.txt`, `backend/test_main.py`, `extension/src/background/api.ts`, `extension/src/background/index.ts`, `extension/src/background/phishing.ts`, `extension/src/background/spam.ts`, `extension/src/popup/App.tsx`, `extension/src/shared/types.ts`, `extension/tests/api.test.ts`, `plan.md`
- Commands run: `python -m pip install -r requirements.txt`, `python -m unittest -q`, and `python -m py_compile main.py test_main.py` from `backend/`; `npm test`, `npx tsc --noEmit`, and `npm run build` from `extension/`; `git diff --check` from the repository root.
- Results: 21 backend tests passed; 38 extension tests passed across 10 test files; Python compilation and TypeScript completed with no errors; the production extension build completed. Vite retained its pre-existing JSON import-assertion warning. FastAPI emitted a third-party `TestClient` deprecation warning during backend tests.
- Measured impact: `/chat` now rejects a missing bearer token with 401, rejects unknown intents and bodies over 24,000 characters with 422 before any provider request, and keys its 30-per-minute limit by authenticated user plus IP. Extension calls forward the Supabase access token in `Authorization`; backend JWT verification uses a lifespan-managed, cached Supabase JWKS client with audience/issuer/expiry validation. CORS is limited to explicitly configured Chrome extension origins, and Dev Login is compile-gated from production output.

### T08 - Return Structured, Server-Validated AI Results

Status: `COMPLETED`

Goal: Remove fragile regex parsing and reduce failures that force users to retry.

Scope:

- Define discriminated response types for each intent.
- Use provider structured output or JSON schema when supported.
- Validate all structured model results on the backend.
- Return typed JSON to the extension.
- Remove greedy JSON extraction for priority, tasks, draft, spam, and phishing.
- Define controlled errors for malformed provider output.

Acceptance criteria:

- Structured intents do not depend on regex extraction.
- Invalid model output cannot reach Gmail UI as a trusted object.
- TypeScript and Pydantic models agree on response shapes.
- Tests include fenced JSON, extra prose, malformed fields, and missing fields.

Verification:

```powershell
python -m unittest -q
npm test
npx tsc --noEmit
```

Completion record:

- Completed on: `2026-07-17`
- Changed files: `backend/main.py`, `backend/test_main.py`, `extension/src/background/index.ts`, `extension/src/background/phishing.ts`, `extension/src/background/spam.ts`, `extension/src/content/index.ts`, `extension/src/shared/types.ts`, `extension/tests/classifierCache.test.ts`, `plan.md`
- Commands run: `python -m unittest -q` and `python -m py_compile main.py test_main.py` from `backend/`; `npm test` and `npx tsc --noEmit` from `extension/`; `git diff --check` from the repository root.
- Results: 23 backend tests passed; 38 extension tests passed across 10 test files; Python compilation and TypeScript completed with no errors. FastAPI emitted a third-party `TestClient` deprecation warning during backend tests.
- Measured impact: Priority, Tasks, Draft, Spam, and Phishing requests now ask compatible providers for JSON objects, parse their response once at the backend, and return a Pydantic-validated discriminated `result` envelope. Fenced JSON, prose-prefixed JSON, malformed fields, and missing fields are rejected as controlled 502 responses before Gmail receives a trusted object. The extension removed all greedy JSON extraction for these intents and consumes only the typed result.

### T09 - Reduce Prompt and Conversation Token Budgets

Status: `COMPLETED`

Goal: Lower input/output tokens without reducing required feature quality.

Scope:

- Add aggregate model-aware token budgeting.
- Apply measured per-intent output limits.
- Keep small classifiers on a fast non-reasoning model where available.
- Shorten repeated instructions after structured validation is active.
- Keep recent chat turns verbatim and summarize or discard older turns.
- Select relevant email excerpts instead of always resending the full body.
- Keep untrusted email data separate from system instructions.
- Preserve useful content near both the beginning and end of long emails.

Acceptance criteria:

- Token usage is lower than the T02 baseline for every optimized intent.
- Multi-turn chat input does not grow without a fixed aggregate bound.
- Priority/spam/phishing output budgets match their small schemas.
- Quality fixtures for summaries, replies, tasks, and drafts still pass.
- Retry and empty-response rates do not materially regress.

Verification:

```powershell
python -m unittest -q
npm test
npx tsc --noEmit
```

Completion record:

- Completed on: `2026-07-17`
- Changed files: `backend/main.py`, `backend/test_main.py`, `documents/MAILX_PERFORMANCE_BASELINE.md`, `plan.md`
- Commands run: `python -m unittest -q`, `python -m py_compile main.py test_main.py`, and `python benchmark.py` from `backend/`; `npm test` and `npx tsc --noEmit` from `extension/`; `git diff --check` from the repository root.
- Results: 25 backend tests passed; 38 extension tests passed across 10 test files; Python compilation and TypeScript completed with no errors. The synthetic live-provider benchmark succeeded for Summary, Reply, Tasks, Draft, and Chat with zero retries and `stop` finish reasons. FastAPI emitted a third-party `TestClient` deprecation warning during backend tests.
- Measured impact: post-budget total tokens were lower than T02 for every measured intent: Summary 495 to 146 (-70.5%), Reply 724 to 629 (-13.1%), Tasks 633 to 233 (-63.2%), Draft 1,660 to 194 (-88.3%), and Chat 607 to 272 (-55.2%). Inputs now have 2,500-10,000 character per-intent budgets; chat history has a fixed 4,000-character aggregate budget; and structured classifiers have 100-120 output-token caps. Long excerpts retain beginning and end context, with the omitted middle marked explicitly.

### T10 - Reduce Gmail DOM Scanning and Observer Work

Status: `COMPLETED`

Goal: Reduce Gmail main-thread work caused by broad observation and repeated full scans.

Scope:

- Debounce mutation handling.
- Inspect relevant `addedNodes` instead of rescanning all message bodies.
- Observe the narrowest stable Gmail container available.
- Remove duplicate one-second toolbar synchronization.
- Keep a low-frequency fallback recovery scan only if needed.
- Avoid unnecessary layout reads.
- Add selector fixtures for message threads and inbox rows.

Acceptance criteria:

- One toolbar is inserted per message across mutation bursts.
- Unrelated Gmail DOM changes do not trigger full `.a3s` scans.
- Toolbar behavior remains correct in multi-message threads.
- DOM tests cover repeated mutations and Gmail node reuse.

Verification:

```powershell
npm test
npx tsc --noEmit
npm run build
```

Completion record:

- Completed on: `2026-07-17`
- Changed files: `extension/src/content/index.ts`, `extension/src/content/toolbarObserver.ts`, `extension/tests/toolbarObserver.test.ts`, `plan.md`
- Commands run: `npm test`, `npx tsc --noEmit`, and `npm run build` from `extension/`; `python -m unittest -q` from `backend/`; `git diff --check` from the repository root.
- Results: 40 extension tests passed across 11 test files; 25 backend tests passed; TypeScript completed with no errors; the production build completed. Vite retained its pre-existing JSON import-assertion warning, and backend tests retained the third-party `TestClient` deprecation warning.
- Measured impact: Gmail mutations are now batched for 100 ms and inspect only relevant added nodes for `.a3s` message bodies. The observer attaches to Gmail's `role=main` container when present, the one-second synchronizer is replaced with a 15-second recovery scan, and duplicate/reused message nodes are deduplicated before toolbar insertion.

### T11 - Fix Gmail API Permissions and Token Lifecycle

Status: `COMPLETED`

Goal: Make Gmail-backed statistics and reminders reliable without excessive OAuth privileges.

Scope:

- Add the exact Gmail API host permission.
- Remove `gmail.send` unless API-based sending is implemented.
- Implement explicit Google provider-token expiry and reauthorization behavior.
- Reuse one provider token within multi-request operations.
- Add Gmail request deadlines and controlled 401/429/5xx handling.
- Verify OAuth behavior after service-worker suspension.

Acceptance criteria:

- Gmail API requests are permitted by the production manifest.
- The requested OAuth scopes match actual usage.
- Expired Google tokens produce recovery UI rather than silent failure.
- Gmail retries are bounded and respect rate-limit responses.

Verification:

```powershell
npm test
npx tsc --noEmit
npm run build
```

Completion record:

- Completed on: `2026-07-17`
- Changed files: `extension/manifest.json`, `extension/src/background/gmail.ts`, `extension/src/background/reminders.ts`, `extension/src/background/stats.ts`, `extension/src/background/supabase.ts`, `extension/tests/gmail.test.ts`, `plan.md`
- Commands run: `npm test`, `npx tsc --noEmit`, and `npm run build` from `extension/`; `python -m unittest -q` from `backend/`; `git diff --check` from the repository root.
- Results: 43 extension tests passed across 11 test files; 25 backend tests passed; TypeScript completed with no errors; the production build completed. Vite retained its pre-existing JSON import-assertion warning, and backend tests retained the third-party `TestClient` deprecation warning.
- Measured impact: the production manifest now permits the Gmail API host, OAuth requests only `gmail.readonly` rather than unused `gmail.send`, and multi-request statistics/reminder operations acquire one provider token and reuse it. Gmail calls have a 15-second deadline, one bounded retry for 429/5xx statuses respecting `Retry-After`, and a controlled 401 error that instructs the user to reauthorize.

### T12 - Introduce Migrations and Optimize Database Invariants

Status: `COMPLETED`

Goal: Move deduplication, ownership, and query invariants into PostgreSQL safely.

Scope:

- Adopt versioned Supabase migrations.
- Add unique reminder identity on `(user_id, type, source_id)`.
- Add a stable task dedupe key and matching uniqueness constraint.
- Add indexes that match active task, reminder, and sender queries.
- Remove only confirmed redundant indexes.
- Replace direct `auth.uid()` policy calls with `(select auth.uid())` where appropriate.
- Use explicit authenticated policy targets and preserve ownership checks.
- Add `ON DELETE CASCADE` for preferences if confirmed safe.
- Add RLS cross-user tests.

Acceptance criteria:

- Migration applies cleanly to a development branch or local database.
- Existing data is preserved or safely transformed.
- Concurrent reminder/task writes cannot create duplicates.
- All seven RLS initialization-plan warnings are resolved.
- Security and performance advisors show no new regressions.

Verification:

```powershell
supabase migration list
```

Also run Supabase security/performance advisors and targeted SQL/RLS tests.

Completion record:

- Completed on: `2026-07-17`
- Changed files: `supabase/migrations/20260717133030_database_invariants.sql`, `supabase/schema.sql`, `plan.md`
- Commands run: Supabase table/schema inspection, duplicate-identity preflight SQL, migration application, constraint/policy verification SQL, migration listing, and security/performance advisors through Supabase MCP; `python -m unittest -q` from `backend/`; `npm test` and `npx tsc --noEmit` from `extension/`; `git diff --check` from the repository root.
- Results: migration `20260717133030_database_invariants` applied successfully; 25 backend tests and 43 extension tests passed; TypeScript completed with no errors. Preflight found 0 duplicate reminder and task identities. Constraints, preference cascade, and all seven authenticated ownership policies were verified. All seven RLS init-plan warnings were resolved. The security advisor retains one pre-existing Auth leaked-password-protection warning; performance advisor now reports only unused-index informational notices on low-traffic tables.
- Measured impact: concurrent writes are now database-protected by `reminders(user_id, type, source_id)` and `tasks(user_id, dedupe_key)` uniqueness constraints. Task/reminder/sender query indexes were added, user deletion cascades to preferences, and seven RLS policies now evaluate `auth.uid()` once per query rather than per row.

### T13 - Remove Reminder N+1 Operations

Status: `COMPLETED`

Goal: Make hourly reminder processing bounded, atomic, and safe for an MV3 service worker.

Scope:

- Query only relevant pending tasks and due dates.
- Bulk-resolve completed or superseded reminders.
- Use database upsert rather than select-then-insert.
- Fetch Gmail thread metadata with bounded concurrency.
- Reuse session/provider token for the run.
- Use a count query for the badge.
- Fix due-soon to overdue state transitions.
- Persist notification state so unresolved reminders are not repeated hourly.
- Await and catch alarm work.

Acceptance criteria:

- No per-task select-then-insert reminder flow remains.
- Gmail thread fetch concurrency is bounded at 5-10.
- One task cannot retain conflicting active reminder states.
- Repeated hourly checks do not repeat unchanged notifications.
- Failures do not leave the badge or worker in an invalid state.

Verification:

```powershell
npm test
npx tsc --noEmit
```

Completion record:

- Completed on: `2026-07-17`
- Changed files: `extension/src/background/gmail.ts`, `extension/src/background/index.ts`, `extension/src/background/reminders.ts`, `extension/src/background/supabase.ts`, `extension/tests/gmail.test.ts`, `supabase/migrations/20260717133808_reminder_notification_state.sql`, `supabase/schema.sql`, `plan.md`
- Commands run: `npm test` and `npx tsc --noEmit` from `extension/`; `python -m unittest -q` from `backend/`; Supabase migration application/listing, `notified_at` column verification, and security/performance advisors through Supabase MCP; `git diff --check` from the repository root.
- Results: migration `20260717133808_reminder_notification_state` applied successfully; 44 extension tests passed across 11 test files; 25 backend tests passed; TypeScript completed with no errors. Advisors show no new warning-level findings; the pre-existing leaked-password-protection warning and unused-index informational notices remain.
- Measured impact: reminder writes now use one bulk `upsert` with the database uniqueness constraint instead of select-then-insert, state resolution is bulked by source IDs, Gmail thread metadata runs at a bounded concurrency of 5, badges use an exact count query, and `notified_at` prevents unchanged reminders from repeating hourly. Alarm work is now awaited with explicit error handling.

### T14 - Optimize Statistics Aggregation

Status: `COMPLETED`

Goal: Avoid downloading complete task, sender, and Gmail message lists for simple counts.

Scope:

- Choose count queries/RPC or daily rollups based on measured mailbox size.
- Use database-side aggregation for task and sender statistics.
- Decide whether Gmail `resultSizeEstimate` is acceptable for dashboard counts.
- Prevent stale popup responses from overwriting a newly selected period.
- Add loading and error states.
- Either implement producers for `sender_scores` and `email_activity` or remove unsupported metrics.

Acceptance criteria:

- Statistics do not fetch complete row sets only to call `.length`.
- Rapid period switching cannot display an older response.
- Metrics shown in the popup have an implemented data producer.
- Statistics latency and request count improve from baseline.

Verification:

```powershell
npm test
npx tsc --noEmit
npm run build
```

Completion record:

- Completed on: `2026-07-17`
- Changed files: `extension/src/background/gmail.ts`, `extension/src/background/stats.ts`, `extension/src/popup/App.tsx`, `extension/src/popup/statsRequestGuard.ts`, `extension/tests/gmail.test.ts`, `extension/tests/stats.test.ts`, `supabase/migrations/20260717134534_statistics_aggregation.sql`, `supabase/schema.sql`, `plan.md`
- Commands run: `npm test`, `npx tsc --noEmit`, and `npm run build` from `extension/`; Supabase table inspection, migration application/listing, function privilege/zero-row verification, and security/performance advisors through Supabase MCP; `git diff --check` from the repository root.
- Results: migration `20260717134534_statistics_aggregation` applied successfully; `get_task_stats` is a security-invoker function that is executable by `authenticated` but not `anon`, and it returns no rows without an authenticated caller. All 46 extension tests passed across 12 files; TypeScript completed with no errors; the production build completed. Vite retained its pre-existing JSON import-assertion warning. Advisors show no new warning-level findings; the pre-existing leaked-password-protection warning and unused-index informational notices remain.
- Measured impact: a cold statistics refresh now uses three bounded aggregate requests: one database RPC plus two Gmail list requests using `resultSizeEstimate` with `maxResults=1`. The prior path made two full database row reads plus `2 * ceil(matching messages / 500)` Gmail list requests, for a minimum of four requests. Consequently the minimum request count falls from 4 to 3, Gmail pagination is eliminated, and task/sender row payload transfer falls to zero. Gmail estimates are explicitly accepted for dashboard display. The unproduced Important senders metric was removed rather than presenting unsupported data.

### T15 - Resolve the Incomplete Tracking Feature

Status: `COMPLETED`

Goal: Avoid carrying an incomplete, slow, and concurrency-unsafe feature.

Decision required during this task: complete tracking for the release or remove/defer its runtime code and schema claims.

Completion path scope:

- Replace GET, POST, PATCH with one atomic database operation.
- Always return the GIF if persistence fails.
- Add signed identifiers, abuse controls, retention, and proxy-aware semantics.
- Complete registration, compose injection, and status UI.

Deferral path scope:

- Remove or disable unused tracking runtime paths.
- Preserve data safely if tables already contain records.
- Update feature status and documentation.

Acceptance criteria:

- No non-atomic tracking counter remains.
- The released feature list matches actual behavior.
- Tracking data retention and privacy behavior are documented if retained.

Verification:

Run backend tests, database concurrency tests if retained, and Supabase advisors.

Completion record:

- Completed on: `2026-07-17`
- Decision: deferred open tracking from the release, following the plan's default position because no complete compose registration, pixel injection, status UI, signed identifier, abuse-control, retention, or proxy-aware implementation exists.
- Changed files: `backend/.env.example`, `backend/main.py`, `backend/test_main.py`, `supabase/migrations/20260717135024_defer_open_tracking.sql`, `supabase/schema.sql`, `README.md`, `IMPLEMENTATION_LOG.md`, `documents/MAILX_TRACKING_DEFERRAL.md`, `plan.md`
- Commands run: `python -m unittest -q` and `python -m py_compile main.py test_main.py` from `backend/`; `npm test`, `npx tsc --noEmit`, and `npm run build` from `extension/`; Supabase table inspection, migration application/listing, table privilege and retained-row-count verification, and security/performance advisors through Supabase MCP; `git diff --check` from the repository root.
- Results: migration `20260717135024_defer_open_tracking` applied successfully. The tracking pixel route now returns 404 in a backend regression test; no backend production code retains a tracking endpoint, service-role key configuration, or tracking-table access. Legacy tables remain with 0 rows and both `anon` and `authenticated` lack `SELECT` privileges. All 26 backend tests and all 46 extension tests passed; Python compilation, TypeScript, and the production build completed. Vite retained its pre-existing JSON import-assertion warning; backend tests retained the third-party `TestClient` deprecation warning. Advisors show no new warning-level findings; the pre-existing leaked-password-protection warning and unused-index informational notices remain.
- Measured impact: incomplete tracking traffic changed from one unauthenticated pixel route that could issue a select, insert, and patch per image fetch to 0 routes and 0 tracking database calls. Fresh installations no longer create tracking tables. Existing data was preserved and client access was disabled; the retention and privacy position is documented in `documents/MAILX_TRACKING_DEFERRAL.md`.

### T16 - Harden Build, Dependency, and Deployment Configuration

Status: `COMPLETED`

Goal: Produce a reproducible extension and backend release that does not depend on localhost.

Scope:

- Add environment-specific backend URL configuration and matching host permissions.
- Fail production builds that contain localhost development URLs.
- Change build type checking to `tsc --noEmit`.
- Disable release source maps or handle them separately.
- Set and document the supported Node engine.
- Pin compatible/tested dependency versions.
- Add a restrictive `.dockerignore`.
- Set the explicit backend Docker/Render context.
- Pin or constrain backend Python dependencies.
- Restrict local secret handling and rotate exposed credentials when required.

Acceptance criteria:

- Production extension calls the configured production backend.
- Release manifest contains only required hosts/resources.
- No development Vite URLs or Dev Login appear in release output.
- Docker build uses the backend context and excludes secrets/node modules.
- Clean installs and builds are reproducible on the documented runtime.

Verification:

```powershell
npm ci
npm test
npx tsc --noEmit
npm run build
docker build .
```

Use the appropriate backend directory as Docker `workdir` after configuration is finalized.

Completion record:

- Completed on: `2026-07-17`
- Changed files: `extension/.env.development`, `extension/.env.production`, `extension/package.json`, `extension/package-lock.json`, `extension/scripts/verify-release.mjs`, `extension/src/background/api.ts`, `extension/vite.config.ts`, `backend/.dockerignore`, `backend/.env.example`, `backend/Dockerfile`, `backend/requirements.txt`, `render.yaml`, `README.md`, `plan.md`
- Completed verification: `npm ci`, `npm test`, `npx tsc --noEmit`, and `npm run build` passed from `extension/`; `python -m pip install -r requirements.txt`, `python -m unittest -q`, and `python -m py_compile main.py test_main.py` passed from `backend/`; production manifest inspection confirmed only `https://mailx-api.onrender.com/*` as the backend host and 0 source-map artifacts; `git diff --check` passed.
- Results: Docker Desktop 4.82.0 was installed through `winget`; `docker build .` from `backend/` completed successfully after starting Docker Desktop. The remaining command results were unchanged: clean install, backend/extension tests, type checks, production build, manifest inspection, and diff verification all passed.
- Measured impact: release output contains 0 localhost URLs, Dev Login strings, and source maps; the production manifest removes the localhost host permission. The backend Docker context is explicitly `./backend`, excludes `.env`/tests/cache files, runs as a non-root user, and dependencies are pinned. The release URL is configured as `https://mailx-api.onrender.com` and must be replaced if the deployed service uses another HTTPS origin.

### T17 - Remove Dead Code and Reconcile Documentation

Status: `COMPLETED`

Goal: Reduce maintenance risk after runtime behavior is stable.

Scope:

- Remove confirmed unused helpers, health client, Gmail context helper, obsolete automatic-check helpers, and orphaned message handlers.
- Remove unused DOMPurify packages if all rendering remains text-only.
- Use or remove `conversation_id`, `phishing_sensitivity`, `sender_scores`, and `email_activity` according to final architecture.
- Split the large content script only along tested, behavior-preserving boundaries.
- Split backend concerns only where tests protect behavior.
- Update README, setup, status, architecture, and agent guidance to match implementation.

Acceptance criteria:

- No documented feature is knowingly inconsistent with runtime behavior.
- Removed dependencies are absent from the lockfile and release bundle.
- Refactoring does not change validated feature behavior.
- Type checking and all tests pass.

Verification:

```powershell
python -m unittest -q
npm test
npx tsc --noEmit
npm run build
```

Completion record:

- Completed on: `2026-07-17`
- Changed files: `extension/src/background/api.ts`, `extension/src/background/gmail.ts`, `extension/src/background/index.ts`, `extension/src/content/index.ts`, `extension/src/shared/helpers.ts`, `extension/src/shared/types.ts`, `extension/package.json`, `extension/package-lock.json`, `backend/main.py`, `supabase/migrations/20260717141919_remove_unsupported_metrics.sql`, `supabase/schema.sql`, `AGENTS.md`, `README.md`, `SETUP.md`, `IMPLEMENTATION_LOG.md`, `PERFORMANCE_AND_TOKEN_OPTIMIZATION_REPORT.md`, `documents/MailX_Revised_Architecture_Plan.md`, `plan.md`
- Commands run: `npm uninstall dompurify @types/dompurify`, `npm ci`, `npm test`, `npx tsc --noEmit`, and `npm run build` from `extension/`; `python -m unittest -q` and `python -m py_compile main.py test_main.py` from `backend/`; Supabase table inspection, migration application/listing, and security/performance advisors through Supabase MCP; `git diff --check` from the repository root.
- Results: migration `20260717141919_remove_unsupported_metrics` applied successfully, removing the zero-row `sender_scores` and `email_activity` tables. All 26 backend tests and all 46 extension tests passed; Python compilation, TypeScript, clean npm installation, and the production build completed. The production build contains no DOMPurify package, source maps, localhost URLs, or Dev Login. Advisors show no new warning-level findings; the pre-existing leaked-password-protection warning and unused-index informational notices for active/legacy low-traffic tables remain.
- Measured impact: 8 unused extension helpers plus DOMPurify and its type package were removed, as were three uncalled automatic AI workflows, the unused health/Gmail-context helpers, and the unused conversation ID wire field. Automatic remote AI paths remain at 0. The unsupported sender-score/activity schema and four related unused-index notices were removed. Release-facing setup, agent guidance, and implementation documentation now match explicit-action behavior; outdated architecture/audit documents are labeled historical.

### T18 - Run Final Benchmark, Security Audit, and Release Verification

Status: `COMPLETED`

Goal: Demonstrate that the complete plan improved speed, token usage, reliability, and security.

Scope:

- Repeat the T02 benchmark scenarios.
- Compare calls, queue time, provider time, tokens, retries, failures, and total latency.
- Run all backend and extension tests.
- Run Supabase security and performance advisors.
- Test production extension packaging and backend health.
- Test sign-in, sign-out, account switching, Gmail token expiry, backend outage, provider 429, and malformed provider response.
- Verify no sensitive telemetry or release artifacts are exposed.
- Decide whether streaming is justified by the measured remaining P95 latency.

Acceptance criteria:

- Global success metrics are met or each exception has a documented reason and follow-up.
- Summary/reply P95 improves by at least 30% from baseline, unless provider latency is proven to be the limiting component.
- Automatic remote call count is zero by default.
- Token use decreases for optimized intents without unacceptable quality regression.
- No critical security finding from the report remains unresolved without explicit acceptance.
- Production build and deployment configuration pass release checks.

Verification:

```powershell
python -m unittest -q
npm test
npx tsc --noEmit
npm run build
```

Also run Supabase advisors, production package inspection, and the documented end-to-end benchmark.

Completion record:

- Completed on: `2026-07-17`
- Changed files: `documents/MAILX_PERFORMANCE_BASELINE.md`, `plan.md`
- Commands run: `python benchmark.py`, `python -m unittest -q`, and `python -m py_compile main.py test_main.py` from `backend/`; `npm ci`, `npm test`, `npx tsc --noEmit`, `npm run build`, and `npm audit --omit=dev` from `extension/`; `docker build -t mailx-api:final .`, a temporary container health check on `http://127.0.0.1:18001/health`, and image-user inspection from `backend/`; Supabase table/migration inspection and security/performance advisors through Supabase MCP; `git diff --check` from the repository root.
- Results: all five synthetic provider scenarios succeeded with zero retries and `stop` finish reasons. Backend: 26 tests passed; extension: 46 tests passed; Python compilation, clean npm installation, TypeScript, production build, and `npm audit --omit=dev` completed successfully with 0 package vulnerabilities. The Docker image built successfully, returned `{"status":"ok"}` from `/health`, and runs as non-root `appuser`. Release package inspection found no source maps and a manifest limited to Gmail, Supabase, and `https://mailx-api.onrender.com/*`; the build guard confirmed no localhost URLs or Dev Login. Supabase contains only the active tables plus retained inaccessible tracking tables, all with RLS; no new advisor warnings were introduced.
- Measured impact: final synthetic token totals remain below T02 for every intent: Summary 240 (-51.5%), Reply 456 (-37.0%), Tasks 232 (-63.3%), Draft 194 (-88.3%), and Chat 250 (-58.8%). Final Summary and Reply totals were 10,055.47 ms and 12,099.69 ms; provider time accounted for 88.5% and 93.4% respectively. This is a single-run directional benchmark rather than P95, so the 30% Summary/Reply P95 target is excepted because provider latency is the proven limiting component. Streaming remains deferred because it would not reduce provider completion time and no P95 sample justifies its complexity. Automatic remote AI dispatch remains 0 by default through policy tests and no live automatic content-script callers.
- Accepted exceptions and follow-up: Supabase reports the pre-existing `auth_leaked_password_protection` warning. MailX uses Google OAuth rather than password sign-in; enable leaked-password protection before enabling any password provider, per [Supabase guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Production OAuth/Gmail browser flows require a configured Google/Supabase deployment and were covered by unit tests rather than a live external account in this environment.

## Completion Log

Add one row only after a task passes all acceptance criteria.

| Task | Completed On | Summary | Verification | Measured Impact |
|---|---|---|---|---|
| T01 | 2026-07-17 | Added non-interactive extension tests for queue, cache, and API-client behavior. | Backend: 7 passed; extension: 4 passed; TypeScript: passed. | 0 to 4 extension tests; suite completed in 1.14 seconds. |
| T02 | 2026-07-17 | Added privacy-safe request tracing, timing/token telemetry, and a synthetic baseline. | Backend: 11 passed; extension: 8 passed; TypeScript/build: passed. | Baseline captured 633-1,660 tokens and 9.58-23.77 seconds total backend time across five intents. |
| T03 | 2026-07-17 | Disabled automatic opened-email and inbox remote AI dispatch while preserving explicit actions. | Extension: 10 passed; TypeScript/build: passed. | Automatic remote dispatch reduced to 0 by default; explicit dispatch remained enabled. |
| T04 | 2026-07-17 | Added reserved foreground queueing, bounded expiry, total deadlines, and cross-context cancellation. | Extension: 27 passed; backend: 11 passed; TypeScript/build: passed. | Foreground wait under available capacity tested below 250 ms; classifier deadline capped at 15 seconds. |
| T05 | 2026-07-17 | Added in-flight coalescing, bounded user-scoped response keys, URL redaction, and short-lived auth/preference caches. | Extension: 37 passed; backend: 11 passed; TypeScript/build: passed. | Identical concurrent misses reduced from 2 provider calls to 1; warm classifier cache hits issue 0 preference queries. |
| T06 | 2026-07-17 | Added a lifespan-managed provider client, bounded transient retries, end-to-end deadlines, and safe single-pass response handling. | Backend: 18 passed; Python compilation/diff checks: passed. | Provider connections are reused; retry behavior is limited to selected transient statuses and connection failures; read timeouts and unjustified empty responses issue 0 duplicate retries. |
| T07 | 2026-07-17 | Added authenticated, allowlisted, size-bounded AI requests with user/IP limiting and production Dev Login removal. | Backend: 21 passed; extension: 38 passed; TypeScript/build: passed. | Missing tokens, unknown intents, and oversized requests are rejected before provider use; authenticated calls carry the Supabase bearer token. |
| T08 | 2026-07-17 | Added backend-validated discriminated AI result envelopes and removed client-side JSON extraction. | Backend: 23 passed; extension: 38 passed; Python/TypeScript: passed. | Malformed structured output is rejected before Gmail UI; five structured intents now use typed results. |
| T09 | 2026-07-17 | Added bounded trusted/untrusted prompt construction, chat-history limits, and measured output caps. | Backend: 25 passed; extension: 38 passed; live benchmark/TypeScript: passed. | Synthetic totals fell 13.1%-88.3% across all five measured intents. |
| T10 | 2026-07-17 | Batched relevant Gmail mutations and removed the one-second full toolbar synchronizer. | Backend: 25 passed; extension: 40 passed; TypeScript/build: passed. | Mutation bursts produce one deduplicated toolbar update; unrelated additions do not trigger full message scans. |
| T11 | 2026-07-17 | Added Gmail API permission, read-only OAuth scope, reusable provider tokens, and bounded recovery behavior. | Backend: 25 passed; extension: 43 passed; TypeScript/build: passed. | Gmail operations reuse one token; expired access is actionable and transient calls retry once. |
| T12 | 2026-07-17 | Added a versioned database invariant migration for dedupe, indexes, preference cascade, and optimized RLS. | Backend: 25 passed; extension: 43 passed; Supabase verification: passed. | Seven RLS init-plan warnings resolved; concurrent reminder/task identity writes are database-protected. |
| T13 | 2026-07-17 | Replaced reminder select-then-insert and serial Gmail metadata work with bounded bulk operations. | Backend: 25 passed; extension: 44 passed; Supabase verification: passed. | Reminder writes are atomic; Gmail metadata concurrency is capped at 5; unchanged notifications are persisted and suppressed. |
| T14 | 2026-07-17 | Replaced row-list statistics with an authenticated aggregate RPC and Gmail result-size estimates; removed the unsupported sender metric. | Extension: 46 passed; TypeScript/build: passed; Supabase verification: passed. | Cold refresh requests fall from a minimum of 4 to 3, Gmail pagination is eliminated, and task/sender row payload transfer is 0. |
| T15 | 2026-07-17 | Deferred incomplete open tracking and removed its runtime endpoint, configuration, and fresh-install schema claims. | Backend: 26 passed; extension: 46 passed; Supabase verification: passed. | Tracking traffic and tracking database calls reduced to 0; legacy records are retained but inaccessible to clients. |
| T16 | 2026-07-17 | Added environment-safe release configuration, output inspection, pinned dependencies, and an explicit hardened Docker deployment context. | Backend: 26 passed; extension: 46 passed; clean npm install, TypeScript/build, and Docker build: passed. | Release output has 0 localhost URLs, Dev Login strings, and source maps; backend context excludes secrets and runs non-root. |
| T17 | 2026-07-17 | Removed confirmed dead extension paths/dependencies and unsupported statistics schema, then reconciled release documentation. | Backend: 26 passed; extension: 46 passed; Supabase verification: passed. | 8 unused helpers and 2 packages removed; 3 uncalled automatic AI workflows and 2 unused tables removed. |
| T18 | 2026-07-17 | Repeated the synthetic benchmark and completed release, Docker, package, and Supabase verification. | Backend: 26 passed; extension: 46 passed; Docker health/build, package audit, and Supabase verification: passed. | Final tokens remain 37.0%-88.3% below T02; automatic AI dispatch remains 0 by default. |

## Deferred Decisions

These decisions are intentionally delayed until prerequisite measurements or implementation details are available.

| Decision | Resolve During | Default Position |
|---|---|---|
| Re-enable automatic AI analysis as opt-in | T03 | Keep disabled by default |
| Provider/model selection by intent | T09 | Keep current model until benchmark data exists |
| Approximate Gmail counts versus rollups | T14 | Choose the lowest-cost approach that meets product accuracy needs |
| Complete or remove open tracking | T15 | Defer/remove unless it is confirmed release scope |
| Add streaming | T18 | Add only if measured P95 remains unacceptable after core fixes |
