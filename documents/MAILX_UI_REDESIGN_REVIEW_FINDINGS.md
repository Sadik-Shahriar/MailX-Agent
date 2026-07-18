# MailX UI Redesign Review Findings

- **Review date:** 2026-07-19
- **Status:** RELEASE BLOCKED
- **Scope:** Chrome extension frontend, its service-worker contracts, and release packaging
- **Design references:** `design-plan.md` and `design-system/mailx/MASTER.md`
- **Purpose:** Implementation handoff for another model to fix the redesign safely

## 1. Fix Prompt

Use this prompt with the model implementing the fixes:

> Fix the MailX redesign defects documented in
> `documents/MAILX_UI_REDESIGN_REVIEW_FINDINGS.md`. Read the complete findings file,
> `design-plan.md`, `design-system/mailx/MASTER.md`, `AGENTS.md`, and the current source before
> editing. Work through findings in dependency order, starting with F01. Do not mark a finding
> complete until all of its acceptance criteria and required tests pass.
>
> Preserve all FastAPI, Supabase, Gmail API, Chrome runtime message, cache, queue, deadline,
> telemetry, privacy, and explicit-only AI contracts. Opening Gmail, opening an email, and
> injecting message toolbars must continue to produce zero automatic remote AI requests.
> Do not change backend response schemas to accommodate incorrect frontend assumptions;
> adapt the frontend to the existing typed `ChatResponse` contract.
>
> Use small, behavior-preserving changes. Do not rewrite the entire content script in one
> operation. Remove temporary migration scripts and dead code only after replacement behavior
> is tested. Add focused tests for every repaired boundary, then run `npm test`,
> `npx tsc --noEmit`, `npm run build`, `node scripts/verify-release.mjs`, backend tests, and
> `git diff --check`. Do not modify unrelated user changes.

## 2. Overall Verdict

The redesign is not correctly implemented and is not ready for release. The repository now
contains useful shared React components and a React panel foundation, but several core feature
flows are broken at runtime.

The highest-risk problems are:

- AI result views consume a response structure that MailX never returns.
- The panel can keep and analyze the previous email after Gmail navigation.
- Suggested Reply and Create Draft lost required Gmail compose behavior.
- Popup and panel styles use undefined tokens or fail to enter the closed Shadow DOM.
- The collapsed panel cannot be reopened with a keyboard.
- Production output is configured to use localhost.

Passing TypeScript and unit tests do not prove these flows work because the relevant redesign
boundaries currently have little or no test coverage.

## 3. Required Execution Order

| Order | Finding | Reason |
|---:|---|---|
| 1 | F01 | Every AI result depends on the response adapter. |
| 2 | F02 | Prevents sending the wrong email content to AI. |
| 3 | F03 | Restores primary reply and draft workflows. |
| 4 | F04 | Makes the UI visually deterministic and testable. |
| 5 | F05 | Restores request cancellation and stable navigation. |
| 6 | F06 | Restores keyboard access to the panel. |
| 7 | F07 | Repairs security-result interaction. |
| 8 | F08 | Restores chat behavior and Gmail shortcut isolation. |
| 9 | F09 | Makes theme, reduced motion, and forced colors operational. |
| 10 | F10 | Completes focus, semantics, labels, and responsive behavior. |
| 11 | F11 | Completes tasks, insights, settings, and auth states. |
| 12 | F12 | Produces a valid production package and truthful completion record. |

Do not start with visual polish while F01-F06 remain unresolved.

## 4. Findings

### F01 - AI Views Use The Wrong Response Contract

- **Severity:** Critical
- **Release blocker:** Yes

#### Evidence

The actual response contract is `ChatResponse`:

- `extension/src/shared/types.ts:88-95`
- `extension/src/background/index.ts:136-166`
- `extension/src/content/index.ts:81-89`

The actual successful response has these fields:

```ts
interface ChatResponse {
  intent: string;
  response: string | string[];
  result?: StructuredAiResult;
  actions: ActionButton[];
  email_id?: string;
  telemetry?: ResponseTelemetry;
}
```

Background failures are returned as:

```ts
{ error: string }
```

The redesigned components instead expect `status` and `data`:

- `extension/src/ui/features/assistant/ResultView.tsx:41-50`
- `extension/src/ui/features/assistant/ResultView.tsx:60-100`
- `extension/src/ui/features/assistant/DraftView.tsx:58-74`
- `extension/src/ui/features/assistant/DraftView.tsx:113-126`
- `extension/src/ui/features/assistant/ChatView.tsx:46-53`

#### Impact

- Summary can crash while reading `result.data.markdown`.
- Suggested Reply can crash and cannot copy or insert its result.
- Extract Tasks can crash instead of showing persisted tasks.
- Draft generation can crash while reading `result.data.kind`.
- Chat appends a blank assistant message because it ignores `res.response`.
- `{ error }` is not recognized as an error and can be rendered as a successful response.
- TypeScript does not catch the mismatch because panel callbacks use `any`.

#### Required Fix

- Type `PanelHost.sendAiMessage` with the actual success/error response union.
- Add a small frontend adapter only if view-specific data is required.
- Do not change the backend response schema.
- Render `response.response` for summary, reply, and chat text.
- Render `response.result` through its discriminated `kind` for priority, tasks, draft, spam,
  and phishing.
- Treat a runtime `{ error }` response as an error before rendering.
- Handle `string[]` safely where the `response` type permits it.
- Map each supported result type explicitly.
- Do not render unknown backend actions.
- Do not offer Insert for extracted task results.

#### Acceptance Criteria

- Summary renders text and supports Copy and Back.
- Suggested Reply renders one suggestion and supports Copy, Insert, Refine or omission, and
  real Regenerate or omission.
- Extract Tasks renders typed task rows and never inserts task prose into Gmail.
- Draft renders To, Subject, Greeting, Body, and Sign-off separately.
- Chat renders the assistant response from `ChatResponse.response`.
- `{ error }`, undefined, malformed, and unexpected responses produce recoverable errors.
- No component reads `response.data` unless an explicitly typed adapter creates that field.

#### Required Tests

- Summary `ChatResponse` rendering.
- Single Suggested Reply rendering and insertion text.
- Task-result rendering.
- Structured draft rendering.
- Chat response rendering.
- `{ error }` response handling.
- Undefined and malformed response handling.
- Unknown action suppression.

### F02 - Panel Retains The Previous Gmail Email Context

- **Severity:** Critical
- **Release blocker:** Yes
- **Privacy risk:** Yes

#### Evidence

`PanelController` publishes only a boolean:

- `extension/src/content/panel/PanelController.ts:1-25`

It suppresses updates when `hasOpenEmail` remains unchanged:

- `extension/src/content/panel/PanelController.ts:21-24`

`syncActionPanel` reports only whether `.a3s` exists:

- `extension/src/content/index.ts:188-191`

`AssistantView` refreshes email context only when that boolean changes:

- `extension/src/ui/features/assistant/AssistantView.tsx:25-31`

Navigating directly from Email A to Email B is a `true -> true` transition, so the React state
can retain Email A.

#### Impact

- Actions opened on Email B can send Email A to the AI provider.
- Extracted tasks can be associated with the wrong email ID.
- Sender and subject displayed in the panel can be stale.
- This violates user expectations and the explicit current-email contract.

#### Required Fix

- Publish a stable email/navigation identity, not only a boolean.
- Refresh `EmailContext` whenever Gmail navigation changes to another thread or message.
- Clear old context immediately while the new email context is being resolved.
- Cancel the old request using the existing request ID lifecycle.
- Prevent responses for Email A from updating the view after navigation to Email B.
- Preserve existing quote/signature trimming in `content/index.ts`.

#### Acceptance Criteria

- Navigating Email A -> Email B updates sender, subject, body, and email ID.
- An action on Email B never sends Email A context.
- A late Email A response cannot render after navigation.
- Navigating to inbox/no open email clears the context and disables email-only actions.

#### Required Tests

- Email A -> Email B context update while `hasOpenEmail` stays true.
- Navigation cancellation and stale-response suppression.
- Open email -> inbox context clearing.
- Extract Tasks associates results with the current email ID.

### F03 - Gmail Reply And Draft Insertion Regressed

- **Severity:** Critical
- **Release blocker:** Yes

#### Evidence

The new host only searches for an already-visible contenteditable:

- `extension/src/content/index.ts:171-182`
- `extension/src/content/index.ts:698-708`

It no longer opens Reply or Compose and waits for Gmail controls.

Draft formatting includes To and Subject as body text:

- `extension/src/shared/aiPolicy.ts:27-34`
- `extension/src/ui/features/assistant/DraftView.tsx:58-74`

#### Impact

- Suggested Reply insertion fails unless Reply is already open.
- Create Draft insertion fails unless Compose is already open.
- Recipient and subject fields are not populated.
- `To:` and `Subject:` can be inserted into the body.
- The redesign violates the immutable Gmail insertion contract.

#### Required Fix

- Restore the tested helper that opens Reply or Compose and waits for the editor.
- Restore separate recipient, subject, and body insertion.
- Keep the replacement confirmation before modifying nonempty content.
- Treat Keep my text as cancellation, not an insertion failure.
- Continue dispatching Gmail-compatible `InputEvent` events.
- Keep direct insertion explicit-only.
- Use structured draft fields rather than flattening recipient and subject into body content.

#### Acceptance Criteria

- Suggested Reply opens/focuses Reply when no editor is open.
- Create Draft opens/focuses Compose when no editor is open.
- Draft recipient fills Gmail's recipient field when valid.
- Draft subject fills Gmail's subject field.
- Only greeting, body, and sign-off enter the body editor.
- Existing content requires confirmation.
- Keep my text reports cancellation/successful preservation rather than failure.

#### Required Tests

- Open Reply and insert text.
- Open Compose and insert structured draft.
- Recipient and subject insertion.
- Existing body Keep and Replace outcomes.
- Missing Gmail controls and timeout recovery.
- Gmail `InputEvent` dispatch.

### F04 - Design Tokens And Stylesheets Are Not Applied Correctly

- **Severity:** High
- **Release blocker:** Yes

#### Evidence

The popup imports no token or base stylesheet:

- `extension/src/popup/index.tsx:1-6`
- `extension/src/popup/index.html:7-17`

The source contains 89 references to undefined legacy token names such as:

- `--mx-color-text-subtle`
- `--mx-color-text-strong`
- `--mx-color-surface-base`
- `--mx-color-border-subtle`
- `--mx-color-primary-base`
- `--mx-radius-xl`

Examples:

- `extension/src/popup/App.tsx:68-86`
- `extension/src/content/panel/panel.css:12-18`
- `extension/src/ui/features/assistant/AssistantView.tsx:98-160`
- `extension/src/ui/features/assistant/ChatView.tsx:67-129`
- `extension/src/ui/features/insights/InsightsView.tsx:51-103`

The valid tokens are defined at:

- `extension/src/ui/styles/tokens.css:50-127`

The panel uses a closed Shadow DOM but does not inject all component styles:

- `extension/src/content/panel/mountPanel.tsx:7-26`

Missing from the Shadow DOM injection are:

- `Button.css`
- `Tabs.css`
- `Feedback.css`
- `Fields.css`
- `Dialog.css`

#### Impact

- Text, backgrounds, borders, focus, and status colors can become invalid or transparent.
- Chat user messages can become white text on an undefined/white background.
- The popup and panel do not reliably share one visual system.
- Accessibility contrast and visible focus cannot be guaranteed.

#### Required Fix

- Create one explicit stylesheet entry for the popup.
- Import `tokens.css`, `base.css`, component styles, and popup layout styles.
- Inject every required component stylesheet into the panel Shadow DOM.
- Replace all undefined `--mx-color-*` aliases with the semantic tokens from `MASTER.md`.
- Replace `--mx-radius-xl` with a valid radius token.
- Remove raw component colors where semantic status tokens exist.
- Replace feature-level inline style objects with focused CSS classes as each view is repaired.

#### Acceptance Criteria

- A static search finds zero undefined `--mx-color-*` variables.
- Popup and panel use the same semantic tokens.
- Buttons, tabs, fields, alerts, dialogs, and toasts are styled inside the closed Shadow DOM.
- Light and dark contrast can be verified from deterministic token values.
- No core body text is below 12px; default body remains 14px.

#### Required Tests

- Popup stylesheet entry is included in production output.
- Panel Shadow DOM contains required component styles.
- Light and dark token application.
- Focus styles remain visible for buttons, links, fields, and tabs.

### F05 - Request Cancellation And React State Are Incomplete

- **Severity:** High
- **Release blocker:** Yes

#### Evidence

`AssistantView` stores a cancellation function but never invokes it:

- `extension/src/ui/features/assistant/AssistantView.tsx:20-23`
- `extension/src/ui/features/assistant/AssistantView.tsx:68-86`

Panel tab changes unmount views without cancellation:

- `extension/src/content/panel/PanelApp.tsx:252-269`

Chat and Draft cancel only through their Back controls, not through effect cleanup:

- `extension/src/ui/features/assistant/ChatView.tsx:59-64`
- `extension/src/ui/features/assistant/DraftView.tsx:44-47`

Gmail navigation cancels lower-level requests but does not reset React loading/result state:

- `extension/src/content/index.ts:112-129`

#### Impact

- Back can leave a remote request running.
- Switching tabs can leave requests running.
- Gmail navigation can leave Result, Chat, or Draft stuck in a loading state.
- Late callbacks can update an unmounted or unrelated view.

#### Required Fix

- Cancel active requests on Back, Cancel, New Chat, tab change, view unmount, and Gmail navigation.
- Clear loading state when cancellation is confirmed locally.
- Keep lower-level request-ID cancellation unchanged.
- Ignore callbacks for cancelled, stale, or superseded view requests.
- Show a visible Cancel action for long-running requests.
- Treat cancellation as a neutral return to the prior stable state.

#### Acceptance Criteria

- Every panel-owned request has one reachable Cancel path.
- Back cancels active work before returning.
- Tab changes do not leave orphaned work.
- Navigation cancellation clears React pending state.
- Cancelled responses never update the view.

#### Required Tests

- Result Back cancellation.
- Chat/Draft unmount cancellation.
- Tab-change cancellation.
- Gmail-navigation cancellation.
- Superseding request and stale callback suppression.

### F06 - Collapsed Launcher And Find Panel Are Not Keyboard Accessible

- **Severity:** High
- **Release blocker:** Yes
- **WCAG:** 2.1.1 Keyboard, 4.1.2 Name Role Value

#### Evidence

The collapsed launcher is a `<div role="button">` without `tabIndex` or keyboard handling:

- `extension/src/content/panel/PanelApp.tsx:191-204`

The collapse button is only 28x28px:

- `extension/src/content/panel/PanelApp.tsx:223-235`

`FIND_PANEL` neither activates Gmail nor focuses the panel:

- `extension/src/background/index.ts:220-225`
- `extension/src/content/panel/PanelApp.tsx:63-83`

The planned test remains TODO:

- `extension/tests/panelAccessibilityBaseline.test.ts:4`

#### Required Fix

- Use a real `<button>` for the collapsed launcher.
- Set `aria-label="Open MailX"` and `aria-expanded`.
- Keep at least a 48x48px launcher target.
- Make the collapse control at least 40x40px.
- Hide or unmount expanded content while collapsed.
- Make `FIND_PANEL` activate the selected Gmail tab/window, expand MailX, safely clamp its
  position, and focus a labelled panel heading/container.
- Add a keyboard-accessible Reset position action.
- Re-clamp stored positions after resize and zoom.

#### Acceptance Criteria

- Keyboard users can collapse and reopen MailX.
- `FIND_PANEL` moves the user to the correct Gmail tab and focuses MailX.
- Stored or centered panel positions remain inside the viewport.
- Hidden panel content is not in the tab order.

#### Required Tests

- Launcher Tab, Enter, and Space behavior.
- Collapsed content hidden/inert behavior.
- Find Panel expand/focus behavior.
- Position clamp and reset.

### F07 - Security Toolbar Details And Exclusivity Are Broken

- **Severity:** High
- **Release blocker:** Yes

#### Evidence

Completed Spam and Link Safety controls request unsupported panel actions:

- `extension/src/content/index.ts:340-378`

`AssistantView` has no `spam` or `safety` mapping:

- `extension/src/ui/features/assistant/AssistantView.tsx:58-66`

Priority completion disables the control:

- `extension/src/content/index.ts:466-476`

Link details incorrectly read `verdict.details` instead of `verdict.reason`:

- `extension/src/content/index.ts:358-362`
- `extension/src/shared/types.ts:62-69`

The global action guard silently ignores apparently enabled controls:

- `extension/src/content/index.ts:346-347`
- `extension/src/content/index.ts:380-381`
- `extension/src/content/index.ts:396-400`

#### Required Fix

- Retain completed priority/spam/link result data in a typed structure.
- Route completed controls to a real Security Result panel view.
- Display verdict, reason, confidence, source, hostname or checked URL count where available.
- Keep completed statuses keyboard reachable.
- Use Retry for unavailable results.
- Disable all mutually exclusive controls visibly while the global guard is active, or remove
  the global guard if independent requests are intentionally supported.
- Do not rely on `title` tooltips for required detail.
- Use a labelled group unless full toolbar arrow-key behavior is implemented.

#### Acceptance Criteria

- Completed Priority, Spam, and Links controls open correct detail content.
- No completed action opens an infinite loading screen.
- Unavailable states remain retryable.
- Other blocked controls visibly appear disabled and explain pending work.
- Verdicts use text plus status icon/shape and color.
- Link Safety remains capped at 20 unique HTTP(S) links.

#### Required Tests

- Priority detail opening.
- Spam reason/confidence/source detail.
- Link result reason/hostname/count detail.
- No-link, safe, harmful, unavailable, and Retry states.
- Global exclusivity visual and semantic behavior.
- Explicit-only dispatch assertion.

### F08 - Chat Behavior Was Disconnected

- **Severity:** High
- **Release blocker:** Yes for Ask MailX

#### Evidence

Chat requests omit `history` and always send `CHAT`:

- `extension/src/ui/features/assistant/ChatView.tsx:33-55`

The old bounded conversation state is now unused:

- `extension/src/content/index.ts:23-32`
- `extension/src/content/index.ts:532-570`

The input is placeholder-only and does not isolate Gmail shortcuts:

- `extension/src/ui/features/assistant/ChatView.tsx:112-128`

#### Required Fix

- Restore per-email conversation state.
- Send bounded `history` through the existing message contract.
- Preserve maximum three conversations and ten retained messages.
- Restore draft-like prompt routing to `GENERATE_DRAFT`.
- Restore insertion actions for reply-like or draft-like chat results.
- Add New Chat behavior and cancellation rules.
- Add a persistent visible label for the input.
- Stop relevant composed keyboard events from reaching Gmail shortcuts.
- Keep Back behavior predictable and preserve history.

#### Acceptance Criteria

- Follow-up prompts include recent history.
- Back and return preserve the current email conversation.
- New Chat clears the current conversation after required confirmation.
- History never exceeds the current bounds.
- Typing in Chat does not trigger Gmail keyboard shortcuts.
- Draft/reply-like chat responses expose valid Gmail insertion.

#### Required Tests

- History payload and retention.
- Three-conversation and ten-message limits.
- New Chat behavior.
- Back persistence.
- Draft intent routing.
- Gmail keyboard-event isolation.

### F09 - Theme, Reduced Motion, And Forced Colors Are Not Operational

- **Severity:** High

#### Evidence

Settings reads and stores `mailx_theme`:

- `extension/src/ui/features/settings/SettingsForm.tsx:24-35`
- `extension/src/ui/features/settings/SettingsForm.tsx:47-60`

No application code sets `data-theme` or listens for theme changes:

- Search results show `data-theme` only in `tokens.css`.

Reduced-motion rules exist only in `base.css`:

- `extension/src/ui/styles/base.css:42-49`

The popup does not import `base.css`, and the Gmail toolbar receives only tokens and toolbar
CSS:

- `extension/src/popup/index.tsx:1-6`
- `extension/src/content/index.ts:199-204`

No `forced-colors` rules exist.

#### Required Fix

- Apply System, Light, and Dark to the popup root and panel Shadow DOM root.
- Synchronize changes through `chrome.storage.onChanged`.
- Keep native `color-scheme` aligned with the selected theme.
- Detect or adapt to Gmail's actual light/dark theme for the message toolbar.
- Ensure reduced-motion styles load in popup, panel, and toolbar.
- Add forced-colors support for focus, inputs, custom checkboxes, segments, dialogs, and status.

#### Acceptance Criteria

- Theme selection changes both open surfaces immediately.
- System theme follows `prefers-color-scheme`.
- Gmail toolbar remains readable when Gmail theme differs from OS theme.
- Reduced motion removes nonessential animation.
- Forced-colors mode retains boundaries, focus, and selected states.

#### Required Tests

- Theme persistence and application.
- Cross-surface theme synchronization.
- System media-query change.
- Reduced-motion CSS inclusion.
- Forced-colors semantic fallback.

### F10 - Accessibility And Responsive Requirements Are Incomplete

- **Severity:** High
- **WCAG:** 1.3.1, 1.4.10, 1.4.11, 2.4.3, 2.4.6, 2.4.7, 3.3.2, 4.1.2, 4.1.3

#### Evidence

Back buttons lack accessible names:

- `extension/src/ui/features/assistant/ResultView.tsx:69-74`
- `extension/src/ui/features/assistant/ChatView.tsx:68-73`
- `extension/src/ui/features/assistant/DraftView.tsx:81-86`

Chat uses placeholder-only input labelling:

- `extension/src/ui/features/assistant/ChatView.tsx:112-124`

Draft label is not associated with its textarea:

- `extension/src/ui/features/assistant/DraftView.tsx:92-106`

Inputs remove focus outlines:

- `extension/src/ui/features/assistant/ChatView.tsx:118-122`
- `extension/src/ui/features/assistant/DraftView.tsx:100-104`
- `extension/src/ui/components/Fields.css:38-42`

Results have no heading focus or live announcement:

- `extension/src/ui/features/assistant/ResultView.tsx:62-91`

Tabs reference panels that do not exist:

- `extension/src/ui/components/Tabs.tsx:38-60`
- `extension/src/popup/App.tsx:85-102`
- `extension/src/content/panel/PanelApp.tsx:251-269`

Dialog focus handling uses `document.activeElement`, which is unreliable inside the closed
Shadow DOM:

- `extension/src/ui/components/Dialog.tsx:17-60`

Popup remains fixed at 380px:

- `extension/src/popup/index.html:9-16`

Panel content and Assistant subviews create nested scroll regions:

- `extension/src/content/panel/PanelApp.tsx:262-269`
- `extension/src/ui/features/assistant/ResultView.tsx:78`
- `extension/src/ui/features/assistant/ChatView.tsx:80`
- `extension/src/ui/features/assistant/DraftView.tsx:90`

Several labels remain 10-11px.

#### Required Fix

- Add visible labels and associated control IDs.
- Add accessible names to every icon-only button.
- Restore visible 2px focus indicators.
- Make view titles semantic headings.
- Focus result headings after completion and restore trigger focus on Back.
- Add `role="status"`, `aria-live`, `aria-busy`, and `role="alert"` where appropriate.
- Render valid `tabpanel` elements matching each tab's `aria-controls`.
- Make Dialog focus trapping Shadow DOM-aware and restore the actual trigger.
- Remove nested scrolling and keep one panel body scroll region.
- Support popup widths from 360px to 400px and 200% zoom.
- Keep main targets 44px and toolbar targets within the documented compact exception.
- Remove body copy below 12px.

#### Acceptance Criteria

- Every feature can be completed by keyboard only.
- Focus never lands on hidden or removed content.
- Results and errors are announced exactly once.
- Dialog trap, Escape, initial focus, and restoration work inside Shadow DOM.
- Popup and panel reflow without horizontal scrolling at 200% zoom.
- Screen-reader tab and panel relationships are valid.

#### Required Tests

- Accessible input labels.
- Icon-button accessible names.
- Result focus and Back restoration.
- Live status/error announcements.
- Tab/tabpanel relationships.
- Dialog focus trap/restoration inside Shadow DOM.
- Popup 360px and 200% reflow checks.

### F11 - Tasks, Insights, Settings, And Auth Remain Partial

- **Severity:** Medium

#### Tasks

Evidence:

- No stale-response guard: `extension/src/ui/features/tasks/useTasks.ts:19-40`.
- Errors have no Retry action: `extension/src/ui/features/tasks/TasksView.tsx:47-60`.
- Dates are not semantic `<time>` elements.
- Individual deletion has no confirmation.
- Empty states provide no useful next action.

Required outcome:

- Add a request guard for rapid 7/30/90 switching.
- Keep filters and existing content visible during recoverable errors.
- Add Retry.
- Use localized `<time datetime>` output.
- Confirm destructive deletion consistently.

#### Insights

Evidence:

- No selected-range heading: `extension/src/ui/features/insights/InsightsView.tsx:15-31`.
- No chart screen-reader summary.
- No all-zero explanation.
- No Retry.
- Old data remains visible while another period loads.
- Width is animated despite the transform/opacity rule:
  `extension/src/ui/features/insights/InsightsView.tsx:96-104`.

Required outcome:

- Add selected-range heading and summaries.
- Show an explicit loading state during period change.
- Add all-zero and error recovery states.
- Avoid width animation or disable it under reduced motion.

#### Settings

Evidence:

- Missing spam whitelist, spam blacklist, and phishing allowlist fields:
  `extension/src/shared/types.ts:12-22` and
  `extension/src/ui/features/settings/SettingsForm.tsx:79-147`.
- Reminder validation depends only on native min/max.
- Load/save errors are transient toasts without Retry.
- No unsaved-change warning.

Required outcome:

- Expose all existing preference fields through progressive Advanced disclosure.
- Add explicit 1-30 integer validation.
- Keep errors inline with recovery.
- Warn before losing unsaved changes.

#### Authentication

Evidence:

- Pending state lacks `aria-busy` and specific progress copy.
- No privacy note or auth-expired Reconnect state.
- Popup does not emit `mailx_auth_sync` after sign-in/out:
  `extension/src/popup/App.tsx:22-49`.
- Panel listens only for that storage key:
  `extension/src/content/panel/PanelApp.tsx:94-105`.

Required outcome:

- Synchronize auth changes across popup and panel.
- Distinguish initial signed-out, pending, failure, and expired/reconnect states.
- Preserve current content behind an auth-expired recovery card where safe.

#### Acceptance Criteria

- Rapid Tasks and Insights period changes cannot display stale data.
- Errors retain filters/content and include Retry.
- All existing preferences are editable and validated.
- Theme and auth changes synchronize between open surfaces.
- Auth failures have clear recovery guidance.

### F12 - Production Build And Completion Records Are Invalid

- **Severity:** High for release, Medium for implementation process
- **Release blocker:** Yes

#### Evidence

Production configuration uses localhost:

- `extension/.env.production:1-3`

Generated production manifest contains localhost:

- `extension/dist/manifest.json:13-18`

The release verifier fails:

```text
Error: Release output contains a forbidden development value: dist\manifest.json
```

The build script does not run the existing release verifier:

- `extension/package.json:6-10`
- `extension/scripts/verify-release.mjs:1-15`

The implementation status is contradictory:

- `design-plan.md:3-5` says Phases 2-6 are completed.
- `design-plan.md:746` marks Phase 2 pending.
- `design-plan.md:838` marks Phase 3 pending.
- `design-plan.md:955-983` marks final verification completed.
- `extension/tests/panelAccessibilityBaseline.test.ts:3-6` still contains three TODO tests.

An untracked migration helper remains:

- `extension/rewrite.py`

#### Required Fix

- Set the production backend URL to the real HTTPS deployment.
- Ensure production manifest contains only approved hosts.
- Make release verification part of the production build or release command.
- Confirm production output contains no localhost, Dev Login, source map reference, or remote
  font import.
- Remove `rewrite.py` after confirming no workflow depends on it.
- Update phase statuses and completion records truthfully.
- Do not mark Phase 7 complete while TODO tests or critical/high findings remain.

#### Acceptance Criteria

- `node scripts/verify-release.mjs` passes.
- Production output contains no localhost or `127.0.0.1`.
- The production backend URL is HTTPS and correct.
- Phase statuses match actual acceptance results.
- Temporary rewrite scripts and dead migration artifacts are removed.

## 5. Preserved Contracts

The following behavior is currently preserved and must remain preserved during fixes:

- Remote AI dispatch remains explicit-only through `dispatchRemoteAi`.
- Background processing also rejects automatic/unknown remote AI requests.
- Opening Gmail or an email currently has no live automatic AI caller.
- Link Safety checks at most 20 unique HTTP(S) URLs.
- Priority confidence threshold remains 0.6.
- Chrome runtime message names and primary payload fields remain intact.
- New panel-owned requests cancel the previous lower-level panel request.
- Cancellation uses the original telemetry request ID.
- Cancelled lower-level callbacks are suppressed.
- Email extraction and quoted/signature trimming remain implemented.
- Supported periods remain 7, 30, and 90 days.
- Statistics remain limited to sent, received, completed tasks, and pending tasks.
- Statistics stale-response protection remains implemented.
- Task states remain pending, completed, and dismissed.
- Only completed tasks expose deletion behavior.
- Smart Reply vocabulary is singular.
- Dev Login remains development-only.
- Native `alert()` and `confirm()` have been removed from redesigned surfaces.

Do not regress these contracts while repairing the UI.

## 6. Verification Results From Review

The following commands were run during review:

| Command | Result |
|---|---|
| `npm test` | 63 passed, 3 TODO |
| `npx tsc --noEmit` | Passed |
| `npm run build` | Passed, but produced invalid localhost release output |
| `python -m unittest -q` | 28 passed |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `git diff --check` | Passed; line-ending warnings only |
| `node scripts/verify-release.mjs` | Failed on `dist/manifest.json` localhost value |

The passing tests do not cover:

- Actual `ChatResponse` rendering in redesigned Assistant views.
- Email A -> Email B context refresh.
- Gmail Reply/Compose opening and structured insertion.
- Panel cancellation on Back, tab change, unmount, or navigation.
- Security-detail routing.
- Theme application or synchronization.
- Collapsed launcher keyboard operation.
- Result focus and Back restoration.
- Dialog focus trapping inside the closed Shadow DOM.

## 7. Final Verification Checklist

Run these commands after all findings are resolved.

From `extension/`:

```powershell
npm test
npx tsc --noEmit
npm run build
node scripts/verify-release.mjs
npm audit --omit=dev
```

From `backend/`:

```powershell
python -m unittest -q
```

From the repository root:

```powershell
git diff --check
```

Manual Chrome verification must cover:

- Popup at 360x520 and 400x600.
- Gmail at 1280x720, 1024x768, 700x600, and 375px narrow width.
- Browser zoom at 100%, 150%, and 200%.
- Gmail light and dark themes.
- Reduced motion and Windows forced-colors/high-contrast mode.
- Keyboard-only sign-in, panel opening, collapse/reopen, tabs, results, dialog, insertion,
  tasks, insights, settings, and sign-out.
- Summary success/error/cancel/retry.
- Suggested Reply Copy/Insert/Keep/Replace.
- Structured Draft generation and Compose insertion.
- Chat history, New Chat, Back, cancellation, and Gmail navigation.
- Email A -> Email B navigation while the panel remains open.
- Priority, Spam, and Link Safety success/unavailable/detail/retry states.
- Backend outage, provider busy, timeout, auth expiry, offline, and stale response behavior.

## 8. Definition Of Resolved

This review can be closed only when:

- F01-F12 satisfy all acceptance criteria.
- No critical or high finding remains.
- All redesigned AI intents use the actual typed runtime response contract.
- The current Gmail email identity is always reflected in panel context.
- Reply and Draft insertion preserve recipient, subject, body, replacement, and event behavior.
- Popup and panel use valid semantic tokens and fully loaded styles.
- All panel functionality is keyboard accessible.
- Result focus, Back restoration, dialog trapping, and status announcements work.
- Tasks, Insights, Settings, and Auth include required loading/error/retry states.
- Theme, reduced motion, and forced colors are operational.
- Production release verification passes.
- The TODO panel accessibility tests are implemented and passing.
- `design-plan.md` phase statuses match reality.
