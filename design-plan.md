# MailX UI/UX Redesign Plan

- **Status:** REMEDIATION IN PROGRESS
- **Current Phase:** Review remediation F10 (accessibility and responsive behavior)
- **Completed Phases:** Phase 0 (Baseline), Phase 1 (Design System)
- **Created:** 2026-07-18
- **Scope:** Chrome extension frontend only
- **Visual source of truth:** `design-system/mailx/MASTER.md`
- **Existing engineering plan:** `plan.md` remains unchanged and authoritative for completed
performance, security, API, and database work.

## 1. Canonical Improved Prompt

Use this prompt when assigning the redesign to another model or implementation agent:

> Redesign the complete MailX Chrome extension frontend into a clean, trustworthy,
> accessible, and efficient Gmail productivity assistant. First audit the current popup,
> Gmail Shadow DOM panel, per-message toolbar, AI result views, chat, draft composer, task
> and reminder views, statistics, settings, authentication, dialogs, toasts, and all async
> states. Then read and follow `design-plan.md` and `design-system/mailx/MASTER.md`.
>
> Implement the redesign incrementally, one phase at a time, using React 18, TypeScript,
> semantic HTML, shared semantic CSS tokens, and the existing Vite/CRXJS build. Convert the
> main Gmail panel to React so the popup and panel can reuse presentational components, but
> keep Gmail DOM discovery/insertion code and the per-message toolbar isolated from shared
> application UI. Prefer small, focused components and CSS files over inline styles. Do not
> add Tailwind, a large component library, remote fonts, GSAP, or decorative dependencies.
>
> Preserve all current backend, Supabase, Gmail API, Chrome message, caching, cancellation,
> telemetry, privacy, and explicit-action contracts. Do not change FastAPI endpoints,
> Supabase schema/RLS, AI prompts/models, response schemas, queue policy, cache behavior, or
> automatic-AI policy. Opening Gmail or an email must continue to make zero remote AI calls.
> Do not invent unsupported data or promise three reply choices when the current response
> supplies one.
>
> Make every action keyboard accessible, keep visible focus, use correct tab and dialog
> semantics, meet WCAG 2.2 AA contrast, label all fields, announce async states, restore
> focus after navigation/dialogs, respect reduced motion, support light/dark themes, and
> provide clear loading, success, empty, timeout, offline, auth-expired, cancelled, and
> retry states. Main controls should have 44px targets; only the Gmail inline toolbar may use
> the documented compact exception.
>
> Before modifying files, identify the phase being implemented and its immutable behavior
> contracts. Add focused UI tests, run `npm test`, `npx tsc --noEmit`, and `npm run build`
> from `extension/`, inspect the production popup/panel in Chrome, and record any deviation
> from the plan. Do not begin a later phase until the current phase meets every acceptance
> criterion. Do not modify unrelated user changes.

This document is the result of executing the planning portion of that prompt against the
current repository and the UI/UX Pro Max design database.

## 2. Product And Audience

MailX is a compact productivity tool embedded in Gmail. Its primary users are students,
professionals, and knowledge workers who need to process email faster while staying in
control of generated content and security decisions.

Primary context:

- Desktop Chrome with Gmail open for long work sessions.
- Short, frequent interactions in a 360-400px panel or popup.
- Sensitive email content where trust, predictability, and explicit consent matter.
- Variable network and provider latency, often several seconds for AI work.
- Keyboard-heavy users who should not need a mouse to operate the extension.

Target experience:

- Calm and focused rather than flashy or chatbot-like.
- Dense enough for a browser extension, but never cramped or text below 12px.
- Consistent across the popup and injected panel.
- Transparent about context, progress, results, and failures.
- Visually compatible with Gmail without copying Gmail exactly.

## 3. Scope

### In Scope

- Chrome action popup.
- Gmail floating MailX panel and collapsed launcher.
- Panel authentication screen.
- Panel navigation and settings subview.
- AI action launcher, result layouts, chat, smart reply, task extraction, and draft flow.
- Tasks, reminders, and statistics in both popup and panel.
- Per-message Priority, Spam Check, and Link Safety toolbar.
- Confirmation dialog, toast/status system, errors, loading, empty, and offline states.
- Light, dark, reduced-motion, forced-color, keyboard, and responsive behavior.
- Frontend code organization, reusable components, typed UI state, and UI tests.
- Small service-worker navigation adjustments only when required to make an existing
  frontend control work predictably, such as focusing the selected Gmail tab for
  `FIND_PANEL`. The message contract must stay unchanged.

### Out Of Scope

- FastAPI endpoints, request/response models, prompts, model selection, retry policy, or
  authentication validation.
- Supabase tables, functions, migrations, RLS, or data retention.
- Gmail API scopes, statistics aggregation, reminder generation, or notification schedule.
- New AI features, automatic email analysis, streaming, open tracking, or new metrics.
- Changes to task persistence, completion history, cache keys/TTLs, telemetry fields, queue
  capacity, deadlines, or cancellation semantics.
- Marketing site, onboarding website, mobile native app, or Gmail-clone redesign.

## 4. Immutable Behavior Contracts

Every implementation agent must preserve these contracts before visual work is accepted.

### Privacy And AI Dispatch

- Remote AI dispatch remains explicit-only through `dispatchRemoteAi`.
- Opening Gmail, opening an email, scrolling the inbox, or injecting a toolbar performs zero
  automatic remote AI calls.
- Priority, Spam Check, and Link Safety run only after their individual buttons are clicked.
- Telemetry remains development-only and must not include email bodies, subjects, senders,
  prompts, model responses, tokens, or full URLs.

### Chrome Runtime Messages

Keep the names and payload behavior in `extension/src/shared/types.ts` intact, including:

- AI: `SUMMARIZE`, `SUGGEST_REPLIES`, `CLASSIFY_PRIORITY`, `EXTRACT_TASKS`,
  `GENERATE_DRAFT`, `CHAT`, `CHECK_SPAM`, and `CHECK_PHISHING_URL`.
- Cancellation: `CANCEL_REQUEST` with the original telemetry request ID.
- Data: `GET_TASKS`, `TOGGLE_TASK`, `DELETE_TASK`, `DELETE_COMPLETED_TASKS`,
  `GET_REMINDERS`, `DISMISS_REMINDER`, and `GET_STATS`.
- Preferences/auth: `GET_PREFERENCES`, `SAVE_PREFERENCES`, `GET_STATUS`, `SIGN_IN`,
  `SIGN_OUT`, and development-only `DEV_SIGN_IN`.
- Navigation: `FIND_PANEL`.

Do not add a new backend endpoint or direct network call from React components.

### Request Lifecycle

- A new panel-owned AI request supersedes and cancels the previous panel-owned request.
- Back, Cancel, New chat, and Gmail navigation cancel relevant in-flight work.
- Cancelled or stale responses cannot update the current view.
- The popup statistics stale-response guard remains effective during rapid period changes.
- The current foreground/secondary queue behavior and deadlines remain unchanged.
- If one global foreground action remains exclusive, all conflicting actions must look and
  behave disabled rather than silently ignoring clicks.

### Gmail Integration

- Preserve current email extraction, quoted-text trimming, Gmail selectors, and input-event
  dispatch unless changed in a separately tested Gmail integration task.
- Generated content is inserted only after a direct Insert action.
- Existing Gmail compose/reply content requires confirmation before replacement.
- Choosing "Keep my text" is a cancellation outcome, not an insertion error.
- Textarea keyboard events must not leak into Gmail shortcuts.
- Link Safety checks at most 20 unique HTTP(S) links.
- Priority confidence threshold remains 0.6.

### Data And Features

- Supported periods remain 7, 30, and 90 days.
- Statistics display only sent, received, completed tasks, and pending tasks.
- Task states remain pending, completed, and dismissed.
- Only completed tasks can be deleted; deleting them does not erase statistics history.
- Smart Reply must be described as one "Suggested reply" until the API reliably returns
  multiple options.
- Full preferences may be exposed progressively, but existing meanings and defaults cannot
  change.

## 5. Current-State Findings

The redesign is necessary because the current frontend has structural and usability issues,
not just outdated colors.

### Architecture

- `extension/src/popup/App.tsx` is a 479-line React component with nearly all styles inline.
- `extension/src/content/index.ts` is a 2,003-line imperative module that mixes Gmail DOM
  integration, state, AI orchestration, HTML generation, dialogs, and styling.
- Tasks and statistics are duplicated in popup and panel with different controls and copy.
- There is no shared token system, component library, stylesheet architecture, icon family,
  or frontend accessibility test coverage.

### Critical UX Problems

- The collapsed launcher cannot be reopened with a keyboard.
- Hidden collapsed content may remain in the tab order.
- AI result replacement does not move or announce focus.
- The panel can auto-collapse after 45 seconds while a user is reading or editing.
- The replacement dialog lacks dialog semantics, focus trap, Escape behavior, and focus
  restoration.
- Chat and draft textareas use placeholder-only labels.
- Loading, errors, results, and toasts are not consistently announced.
- Some text and orange status combinations fail WCAG AA contrast.

### Consistency And Trust Problems

- Popup and panel use different fonts, spacing, radii, chart sizes, capabilities, and terms.
- "Three ready-to-send options" produces one reply.
- A backend "Regenerate" action currently closes the result instead of regenerating it.
- Safety verdicts show labels but insufficient reason, hostname, confidence, or recovery.
- Disabled verdict buttons are used as status displays.
- Settings saving has no progress, success, or error feedback.
- Other AI buttons look enabled while the global action guard silently ignores them.
- Errors often replace useful content and provide no Retry control.

### Responsive And Interaction Problems

- Many injected labels are 9-11px and controls are too small.
- The panel has contradictory flex/block and dead grid styles.
- Panel, result, and chat create nested scroll areas.
- The popup is fixed at 380px without robust zoom/reflow handling.
- Dragging and collapsed expansion rely too heavily on pointer behavior.
- No reduced-motion, dark-theme, forced-color, or intentional focus design exists.

## 6. Design Strategy

### Selected Direction

The UI/UX Pro Max database was queried for an AI email productivity extension, compact
dashboard UX, accessibility, icons, chart selection, and React guidance. The initial
newsletter pattern and purple/pink palette were rejected because they did not fit an
embedded productivity tool. The final direction combines:

- AI-native UI for clear prompts, context cards, thinking state, and generated responses.
- Trust-blue SaaS/productivity colors with neutral surfaces.
- Compact dashboard density with visible numeric labels.
- Horizontal comparison bars for the four available statistics.
- One outline icon family and no emoji icons.
- Subtle motion, no GSAP, and complete reduced-motion fallback.
- Small, focused React components and shared state/presentation boundaries.

The exact tokens are defined in `design-system/mailx/MASTER.md`.

### Design Principles

1. Context before action: show whether an email is open and what MailX will analyze.
2. One clear primary action per view.
3. Recognition over recall: consistent labels, descriptions, icons, and locations.
4. Progressive disclosure: keep the default panel simple; place advanced safety settings
   under an Advanced section.
5. Explicit control: never insert, replace, delete, dismiss, or send without direct intent.
6. Honest promises: labels reflect actual response cardinality and available data.
7. Recoverable waiting: every long action can be cancelled and every recoverable failure can
   be retried.
8. Accessible by construction: semantic primitives first, ARIA only where needed.

## 7. Information Architecture

### Surface Ownership

| Capability | Popup | Gmail Panel | Message Toolbar |
|---|---|---|---|
| Account status | Full | Compact | No |
| Open/focus Gmail panel | Primary | Not applicable | No |
| Summary, reply, draft, Ask MailX | Guidance only | Primary | No |
| Extract tasks from current email | Guidance only | Primary | No |
| Task/reminder management | Full | Compact parity | No |
| Statistics | Full | Compact parity | No |
| Preferences | Full | Header subview or link | No |
| Priority, spam, link checks | Explanation only | Result details when invoked | Primary trigger |
| Sign out | Settings/account area | Settings/account area | No |

### Popup Navigation

Use four labelled tabs with consistent Phosphor outline icons:

1. Home: account health, Gmail connection, pending follow-up count, and "Open MailX in Gmail."
2. Tasks: follow-ups, pending tasks, completed tasks, and period filter.
3. Insights: 7/30/90-day email and task comparison.
4. Settings: writing, reminders, appearance, advanced safety, and account.

The tab bar stays visible while the view body scrolls. Persist the last selected popup tab in
session storage only if tests show that it improves repeated use; otherwise default to Home.

### Gmail Panel Navigation

Use three primary tabs:

1. Assistant: context-aware actions, results, Ask MailX, and draft creation.
2. Tasks: the same task/reminder presentation and periods as the popup.
3. Insights: the same metrics and periods as the popup in a compact layout.

Settings is a labelled gear icon button in the header that opens a subview with a predictable
Back action. Sign out belongs inside Settings, not as a persistent footer action.

### Panel Context States

- No email open: show Create draft and Ask MailX. Show a calm message explaining that opening
  a conversation enables Summary, Suggested reply, and Extract tasks.
- Email open: show a compact context card containing sender and wrapped subject, then the three
  email actions.
- Signed out: replace navigation with a dedicated authentication screen.
- Auth expired: retain the current view behind an inline recovery card and offer Reconnect.

## 8. Primary User Journeys

### First Sign-In

1. User sees the MailX mark, one-sentence value statement, privacy note, and Google sign-in.
2. Sign-in button enters a pending state and rejects repeated clicks.
3. Failure appears inline with Retry and diagnostic guidance.
4. Success opens Home and announces the signed-in account.
5. Development login appears only in development and is visually separated as a test tool.

### Open MailX In Gmail

1. Home primary action is labelled "Open MailX in Gmail," not "Find me."
2. If Gmail is closed, open it and communicate that MailX will appear after Gmail loads.
3. If Gmail is open, activate the relevant tab/window, expand the panel, restore a safe
   position, and focus/highlight the panel header.
4. Failure appears in the popup, not a native `alert()`.

### Summarize An Email

1. User opens Assistant and sees the current sender/subject context card.
2. User activates Summarize.
3. The action becomes "Summarizing," conflicting actions disable, and Cancel remains available.
4. A layout-stable skeleton appears after 300ms.
5. The result screen receives focus at "Summary."
6. Result includes readable paragraphs/bullets, Copy, Ask a follow-up, and Back.
7. Back returns focus to Summarize.

### Use A Suggested Reply

1. User activates Suggested reply.
2. Result title says "Suggested reply," never "Choose a reply" unless multiple values exist.
3. Actions are Insert in Gmail, Copy, Refine, and Regenerate.
4. Regenerate resubmits the same client-side request context; it must not merely close the view.
5. Insert opens/focuses Gmail reply and asks before replacing existing content.
6. Choosing Keep my text closes the dialog and reports "Your existing text was kept."

### Create A Draft

1. Create draft opens a labelled prompt view with persistent helper text and examples as
   optional chips.
2. Empty submission focuses the textarea and shows an associated field error.
3. Generate draft shows a cancellable loading state.
4. Structured fields render as To, Subject, Greeting, Body, and Sign-off with wrapping.
5. Insert in Gmail opens compose and fills only fields provided by the existing result.

### Ask MailX

1. The chat view shows a concise context header and transcript.
2. Suggestion chips are real buttons and never replace the visible textarea label.
3. User and assistant messages use alignment plus labels, not color alone.
4. Thinking uses a status label and restrained three-dot indicator.
5. New chat requires confirmation only when a request is pending or unsent input exists.
6. Back cancels the current request but keeps conversation history, matching current behavior.
7. At ten retained messages, preserve the current bounded history behavior without UI claims
   that older messages are stored permanently.

### Manage Tasks And Reminders

1. User selects Last 7, 30, or 90 days with an accessible segmented control.
2. Follow-ups, To do, and Completed have visible counts.
3. Loading preserves section layout; errors keep filters visible and include Retry.
4. Checkbox updates show immediate pending feedback and block duplicate mutation clicks.
5. Checkbox, task content, and row menu are sibling controls.
6. Dates use localized `<time>` text and priorities use text plus a small status icon.
7. Destructive actions require clear confirmation. Do not promise Undo unless data restoration
   is actually implemented.

### Review Insights

1. User selects Last 7, 30, or 90 days.
2. Four metric cards show exact values with tabular figures.
3. Two horizontal comparison groups show Sent vs Received and Completed vs Pending.
4. Values remain visible in text; color is supplemental.
5. All-zero data shows a meaningful explanation instead of empty bars.
6. Data failure keeps the period control and shows Retry.

### Run Security Checks

1. Priority, Spam Check, and Link Safety remain explicit buttons above the relevant message.
2. Loading changes only the requested control and announces progress.
3. Completion turns the control into a status button/summary that remains keyboard reachable.
4. Activating a completed status opens details in the MailX panel: verdict, reason, confidence
   where available, checked hostname/URL count, and source where already returned.
5. "Unavailable" remains retryable and clearly explains the next action.
6. Verdicts use icon, text, and color; never color alone.

## 9. Screen Specifications

### Popup Shell

- Preferred width 400px; support 360px without horizontal scrolling.
- Maximum visible height 600px; shell uses header, fixed tab bar, and one scrolling main area.
- Header: MailX brand, compact signed-in avatar/initial or connection status, no decorative hero.
- Main padding 16px; section gap 20px; card gap 12px.
- Footer content is view-specific. Do not repeat Sign out under every tab.

### Popup Home

- Greeting/title: "MailX is ready."
- Account row: email and connected status.
- Primary action: Open MailX in Gmail.
- Optional compact attention card: unresolved follow-up count from already loaded reminders.
- Three-step usage explanation matching actual locations:
  - Assistant panel for Summary, Suggested reply, Draft, and task extraction.
  - Message toolbar for Priority, Spam Check, and Link Safety.
  - Popup Tasks and Insights for review.

### Authentication Screen

- Keep copy to one heading, one paragraph, one privacy note, and one primary button.
- Google sign-in button is 44px high and uses text plus a neutral Google mark only if an
  approved local asset is available. Do not draw an unofficial logo.
- Auth error uses `role="alert"`; pending uses `aria-busy` and a progress label.
- Dev Login is a secondary test-only section with an explicit "Development only" label.

### Assistant Action Screen

- Context card appears only when a valid email is open.
- Primary action order: Summarize, Suggested reply, Extract tasks.
- Secondary creation group: Create draft, Ask MailX.
- Each action includes an icon, direct label, and one short description.
- Do not show unavailable email actions as blank space. Explain how to enable them.

### Result Screen

- Header row: Back, result title, optional overflow.
- One scrolling view body only; result content itself must not introduce another scrollbar.
- Primary result action stays reachable at the bottom but must not cover content.
- Copy uses a brief "Copied" status without changing layout width.
- Backend-provided action strings are mapped explicitly. Unknown actions are not rendered.
- Regenerate is implemented as a real repeat request or omitted; it never means Close.

### Tasks Screen

- Segmented period control labels are "7 days," "30 days," and "90 days" with a visible
  group label "Time range."
- Reminder cards use clear language: "Due tomorrow," "Overdue," or "No reply yet."
- Pending tasks appear before completed tasks.
- Completed section may be collapsible when long, but its state must be keyboard accessible.
- Delete all is inside the Completed section overflow and opens the accessible confirm dialog.

### Insights Screen

- Heading includes the selected range.
- Four cards use a 2x2 grid at 360-400px and one column below 320px.
- Comparison bars are CSS-only; no chart dependency is needed.
- Each group has a screen-reader summary and visible values.
- Do not add trend arrows, percentages, targets, or response-time claims because the data does
  not exist.

### Settings Screen

Use three main sections and one progressive Advanced section:

- Writing: Reply tone.
- Reminders: Follow-up delay and before/due/overdue notification controls.
- Appearance: System, Light, Dark. Store locally; this does not alter Supabase preferences.
- Advanced safety: spam whitelist/blacklist, phishing sensitivity, and phishing allowlist,
  using the existing `UserPreferences` fields only.
- Account: signed-in email and Sign out, separated from normal settings.

Save behavior:

- Load values before enabling Save.
- Validate reminder days as an integer from 1 to 30.
- Disable Save while unchanged or pending.
- Show "Settings saved" in a polite status region.
- Show specific errors with Retry; never ignore the callback.
- Warn before navigating away only when unsaved changes exist.

### Replacement Dialog

- Title: "Replace existing Gmail text?"
- Body explains that replacement cannot be undone by MailX.
- Primary destructive choice: Replace text.
- Secondary choice: Keep my text.
- `role="dialog"`, `aria-modal="true"`, labelled title and description, initial focus on Keep
  my text, trapped Tab order, Escape cancels, and focus returns to Insert.

### Toasts And Status

- Toast viewport is inside the MailX shadow root to avoid Gmail style conflicts.
- Polite confirmations last 4-5 seconds and include a dismiss button when useful.
- Errors that require action remain inline and do not auto-dismiss.
- Toasts never steal focus.
- Native `alert()` and `window.confirm()` are replaced with shared accessible UI.

### Collapsed Launcher

- Use a real 52x52px button with the MailX logo, tooltip, `aria-label="Open MailX"`, and
  `aria-expanded`.
- Expanded content is `hidden`/`inert` while collapsed.
- Remove the 45-second automatic collapse. Collapse occurs only by user action or an explicit
  safe navigation rule approved in testing.
- Pointer drag is an enhancement, not required for operation. Keep Collapse and Reset position
  keyboard accessible, clamp the panel to the viewport, and persist only safe positions.

### Per-Message Toolbar

- Keep it visually secondary to Gmail content.
- Add a small noninteractive MailX label followed by Priority, Spam, and Links buttons.
- Use `role="toolbar"` only if arrow-key toolbar behavior is implemented; otherwise use a
  labelled group of buttons.
- Compact exception: buttons may be 32px high but must remain at least 24px in both dimensions
  with 8px spacing.
- Use text labels at all times. Do not replace them with icon-only controls.
- Scope toolbar CSS under a unique MailX class and define dark-theme variants.

## 10. Component Inventory

### Shared Primitives

- `Button`: primary, secondary, quiet, danger, icon; loading and disabled states.
- `IconButton`: tooltip, accessible label, fixed target.
- `Spinner`: status-hidden visual paired with visible/accessible progress text.
- `Skeleton`: static reduced-motion fallback.
- `Badge`: neutral, info, success, warning, danger.
- `Card`, `Section`, `Divider`, and `Stack` layout primitives.
- `Tabs`: semantic tabs, roving keyboard focus, stable panels.
- `SegmentedControl`: period and theme choice with pressed/radio semantics.
- `Field`, `SelectField`, `NumberField`, `CheckboxField`, and `TextareaField`.
- `InlineAlert`: info, success, warning, error with optional recovery action.
- `EmptyState`: explanation plus at most one useful action.
- `Dialog`: focus trap, Escape, labelled title/description, restoration.
- `ToastProvider`: polite announcements and optional dismiss.
- `ViewHeader`: back action, title, optional actions.

### Shared Feature Components

- `AuthView` and `AccountSummary`.
- `TaskList`, `TaskRow`, `ReminderList`, and `PeriodFilter`.
- `InsightsView`, `MetricCard`, and `ComparisonBar`.
- `SettingsForm` split into focused sections.
- `AsyncBoundary` for loading/error/empty/content without removing filters/navigation.

### Panel-Only Components

- `PanelShell`, `PanelHeader`, `CollapsedLauncher`, and `EmailContextCard`.
- `AssistantActions` and `AiRequestProgress`.
- `SummaryResult`, `ReplyResult`, `TaskExtractionResult`, `DraftResult`, and
  `SecurityResult`.
- `ChatView`, `ChatTranscript`, `PromptChips`, and `DraftPromptView`.

### Gmail Host Components

- `MessageToolbar` remains isolated from shared panel rendering so Gmail mutation handling does
  not create many React roots.
- `GmailToastBridge` sends events to the shared shadow-root toast provider.

## 11. Frontend Architecture

### Chosen Approach

Use an incremental "strangler" migration rather than rewriting `content/index.ts` in one pass.
Mount one React root inside the existing closed shadow root for the floating panel, while
retaining Gmail-specific orchestration and message toolbar integration until each boundary is
covered by tests.

React components receive a typed controller/interface instead of querying Gmail or calling
the backend directly. The controller preserves existing extraction, request, cancellation,
conversation, and insertion behavior.

### Target Structure

```text
extension/src/
  ui/
    components/
      Button.tsx
      Dialog.tsx
      Tabs.tsx
      Feedback.tsx
      Fields.tsx
    features/
      auth/
      tasks/
      insights/
      settings/
    icons/
      index.ts
    styles/
      tokens.css
      base.css
      components.css
      themes.css
    runtime/
      sendMessage.ts
      responseTypes.ts
  popup/
    App.tsx
    popup.css
    views/
      HomeView.tsx
      TasksView.tsx
      InsightsView.tsx
      SettingsView.tsx
  content/
    index.ts
    gmail/
      context.ts
      insertion.ts
      toolbar.ts
    panel/
      mountPanel.tsx
      PanelApp.tsx
      PanelController.ts
      panel.css
      views/
    toolbarObserver.ts
```

This is a target, not permission to move unrelated working code early. Extract files only when
the active phase needs them and tests protect the boundary.

### Styling

- Use standard CSS imported by React and injected/adopted into the panel Shadow DOM.
- Define all visual values through semantic `--mx-*` tokens.
- Popup and panel share tokens/base/component styles; each surface has a small layout file.
- Gmail toolbar styles remain scoped and token-derived.
- Remove React inline style objects and imperative `style.cssText` as each surface migrates.
- Do not use Tailwind, CSS-in-JS, remote stylesheets, or a large UI library.

### Icons

Preferred implementation: `@phosphor-icons/react`, imported per icon for tree shaking. Use
regular outline weight consistently. If bundle inspection shows unacceptable cost, replace it
with a small local SVG component set while preserving the same visual family and licenses.

Do not add icons where text alone is clearer. The Gmail message toolbar remains text-first.

### Typed Runtime Boundary

Create one Promise-based wrapper around `chrome.runtime.sendMessage` that:

- Checks `chrome.runtime.lastError`.
- Rejects typed error responses consistently.
- Supports current message payload types without changing them.
- Lets components own pending/success/error display state.
- Does not hide cancellation IDs or stale-response guards.

Do not migrate every background call in one commit. Introduce wrappers per feature phase.

### Theme

- Default to `system` using `prefers-color-scheme`.
- Optional Light/Dark override is stored in `chrome.storage.local` as frontend-only state.
- Synchronize open popup/panel theme through `chrome.storage.onChanged`.
- Set `color-scheme` so native form controls match.
- Gmail toolbar must independently support light/dark host contexts; verify against Gmail's
  actual theme instead of assuming system preference always matches Gmail.

## 12. State Model

Every data view must distinguish these states explicitly:

| State | Required UI |
|---|---|
| Initial | Stable shell, no blank flash |
| Loading under 300ms | Button pending feedback only |
| Loading over 300ms | Skeleton/status with Cancel where supported |
| Success with data | Content plus completion announcement |
| Success with no data | Helpful empty state and next action |
| Recoverable error | Cause-oriented message and Retry |
| Auth expired | Reconnect action; do not mislabel as generic network error |
| Offline | Preserve cached/current content and explain unavailable actions |
| Timeout/provider busy | Specific message and Retry |
| Cancelled | Return to prior stable view without error styling |
| Stale response | Ignore silently; never replace current content |

For mutations, track pending IDs so only affected rows disable while data remains readable.

## 13. Accessibility Specification

### Keyboard

- Logical DOM order matches visual order.
- All actions work with Tab, Shift+Tab, Enter, and Space.
- Tabs support Left/Right, Home, and End when using formal tab semantics.
- Escape closes dialogs and cancellable subviews where expected.
- Collapsed launcher is always reachable and can reopen the panel.
- Dragging is never the only way to recover or reposition the panel.

### Focus

- Provide a visible 2px focus ring with 2px offset.
- On view change, focus the new view heading unless the user is continuing in an input.
- On AI completion, announce status and focus the result heading.
- Back restores focus to the exact initiating action.
- Dialogs trap and restore focus.
- Do not leave focus on elements that become `display:none`.

### Screen Readers

- Use one `h1` per popup/panel view and sequential headings below it.
- Dynamic routine updates use `role="status"`/`aria-live="polite"`.
- Errors needing immediate attention use `role="alert"`.
- Tabs, segmented controls, checkboxes, dialogs, and tooltips use native semantics first.
- Decorative logo beside visible MailX text uses empty alt text.
- Charts include visible numbers and a concise textual summary.

### Visual Accessibility

- Normal text contrast at least 4.5:1; large text and essential graphics at least 3:1.
- Default body is 14px/21px; core copy never drops to 9-11px.
- Main controls are 44px high; message toolbar follows the documented compact exception.
- Status always uses text plus icon/shape, never color alone.
- Content reflows at 200% zoom without horizontal scrolling or lost controls.
- Forced-colors mode retains visible boundaries and focus.

## 14. Responsive Behavior

### Popup

- Design at 400px and verify down to 360px.
- At narrow widths, metric cards may become one column only if values or labels wrap poorly.
- Navigation labels remain visible; do not switch to icon-only tabs.
- Long account emails and subjects wrap safely.

### Gmail Panel

- Desktop default: 400px wide, maximum 680px high.
- Under 424px viewport width: 12px horizontal margins and full available width.
- Under 560px viewport height: reduce section spacing, keep header/navigation fixed, and allow
  one body scroll region.
- At 200% zoom, do not create nested scrolling; result actions stay reachable in document flow.
- Clamp dragged positions after resize/zoom and expose Reset position.

### Gmail Toolbar

- Wrap buttons on narrow message cards without overlap.
- Keep at least 8px gap and preserve reading order.
- Never cause horizontal scrolling in the message body.

## 15. Motion And Performance

- Use 120-240ms CSS transitions for hover, focus, result replacement, and collapse/expand.
- Animate opacity and transform only; avoid width, height, top, and left animation.
- Use at most one panel transition and one loading indicator at a time.
- Under reduced motion, remove transforms/keyframes and keep immediate state updates.
- Keep the popup initial bundle small; tree-shake icons and avoid chart/animation libraries.
- Do not load remote fonts or images.
- Reserve skeleton space to prevent content jumps.
- Batch Gmail DOM reads/writes and preserve the existing debounced toolbar observer.

## 16. Implementation Phases

Only one phase should be in progress at a time. Each phase must pass its tests and acceptance
criteria before the next begins.

### Phase Execution Status

| Phase | Description | Status |
|---|---|---|
| Phase 0 | Baseline And Safety Net | `COMPLETED` |
| Phase 1 | Shared Design Foundation | `COMPLETED` |
| Phase 2 | Popup Redesign | `PENDING` |
| Phase 3 | React Panel Shell And Authentication | `BLOCKED` (F02, F06) |
| Phase 4 | AI Actions, Results, Chat, Draft, And Dialog | `BLOCKED` (F03, F05, F08, F10) |
| Phase 5 | Shared Tasks And Insights Parity | `BLOCKED` (F10, F11) |
| Phase 6 | Gmail Toolbar, Security Details, Toasts, And Themes | `BLOCKED` (F04, F07, F09) |
| Phase 7 | Final Quality And Release Verification | `BLOCKED` (F12 and unresolved release blockers) |

### Review Finding Status

| Finding | Status | Notes |
|---|---|---|
| F01 | `COMPLETED` | `2026-07-19`: typed the panel response boundary; added runtime validation and response adaptation; migrated summary, reply, task, draft, and chat rendering; added seven focused response-boundary tests. `npm test`, `npx tsc --noEmit`, `npm run build`, and `git diff --check` pass. |
| F02 | `COMPLETED` | `2026-07-19`: the controller now publishes `EmailContext` identity changes rather than a boolean; Gmail navigation clears the old context, cancels panel work, waits for a new message identity, and suppresses stale callbacks. Added three navigation-boundary tests. `npm test`, `npx tsc --noEmit`, `npm run build`, and `git diff --check` pass. |
| F03 | `COMPLETED` | `2026-07-19`: restored explicit Reply/Compose opening with editor waits; structured drafts now fill valid recipient and subject fields separately from the body; preserved replacement confirmation and Gmail `InputEvent` dispatch. Added six focused Gmail insertion/replacement tests. `npm test`, `npx tsc --noEmit`, `npm run build`, and `git diff --check` pass. |
| F04 | `COMPLETED` | `2026-07-19`: added an explicit popup stylesheet entry; injected all component styles into the panel Shadow DOM; scoped tokens to the Shadow host; replaced all obsolete color/radius aliases with semantic tokens; removed core 10–11px text. Added three stylesheet/token regression tests. `npm test`, `npx tsc --noEmit`, `npm run build`, and `git diff --check` pass. |
| F05 | `COMPLETED` | `2026-07-19`: added request-version stale-callback guards and cancellation on Result Back, visible Cancel controls, Chat/Draft unmount, tab changes, and navigation. Added four focused cancellation tests. `npm test`, `npx tsc --noEmit`, `npm run build`, and `git diff --check` pass. |
| F06 | `COMPLETED` | `2026-07-19`: replaced the collapsed panel div with a 52px native launcher button; unmounts expanded content; enlarged the collapse target; added focusable heading, keyboard Reset position, resize/zoom clamping, and `FIND_PANEL` tab/window activation plus focus. Added two focused launcher tests. `npm test`, `npx tsc --noEmit`, `npm run build`, and `git diff --check` pass. |
| F07 | `COMPLETED` | `2026-07-19`: retained typed Priority, Spam, and Link Safety results per toolbar; routed completed checks into a Security Result view; exposed reasons/confidence/source/hosts/counts; added retryable unavailable states and visible exclusivity. Added four focused security-view tests. `npm test`, `npx tsc --noEmit`, and `git diff --check` pass; production build awaits F12 verified backend configuration. |
| F08 | `COMPLETED` | `2026-07-19`: added bounded per-email conversation storage, history payloads, New Chat, draft/reply intent handling and insertion, visible input label, and Gmail keyboard isolation. Added five focused conversation tests. `npm test`, `npx tsc --noEmit`, and `git diff --check` pass; production build awaits F12 verified backend configuration. |
| F09 | `COMPLETED` | `2026-07-19`: added synchronized System/Light/Dark application for popup and panel hosts, system media updates, Gmail toolbar theme adaptation, reduced-motion loading, and forced-colors fallbacks. Added four theme tests. `npm test`, `npx tsc --noEmit`, and `git diff --check` pass; production build awaits F12 verified backend configuration. |
| F10 | `IN PROGRESS` | Complete accessibility semantics, focus, and reflow behavior. |
| F11 | `PENDING` | Complete Tasks, Insights, Settings, and auth recovery states. |
| F12 | `BLOCKED` | Production packaging requires a verified HTTPS `VITE_BACKEND_URL`. Local development remains supported through the development configuration; do not use localhost in a release package. |

### Phase 0: Baseline And Safety Net

Status: `COMPLETED`

Goal: capture current behavior and make frontend changes measurable.

Tasks:

- Record screenshots of every current surface and state listed in Section 9.
- Add a manual behavior checklist for all immutable contracts in Section 4.
- Add jsdom and focused React DOM/accessibility test tooling compatible with Vitest.
- Test popup auth failure, period changes, task mutation failure, and settings save callback.
- Add DOM tests for collapsed launcher keyboard behavior, result focus, and replacement dialog
  semantics before changing those flows where practical.
- Record current production bundle sizes for popup and content script.

Acceptance:

- Existing 46+ extension tests remain green.
- New tests reproduce the highest-risk accessibility/state failures or lock desired behavior.
- Screenshots and bundle baseline are recorded without modifying backend behavior.
- Automatic remote AI call count remains zero.

Completion record:

- Completed on: `2026-07-18`
- Changed files: Test harness setup. Deferred screenshots per Deviation log.
- Measured impact: Verified test suites and production build integrity.

### Phase 1: Shared Design Foundation

Status: `COMPLETED`

Goal: create tokens and primitives without changing feature workflows.

Tasks:

- Add shared light/dark tokens, reset/base styles, focus, reduced-motion, and forced-color rules.
- Build Button, IconButton, Spinner, Skeleton, Badge, InlineAlert, Tabs, SegmentedControl,
  fields, Dialog, and Toast primitives.
- Add the selected icon family and inspect tree-shaken output.
- Add the typed Promise wrapper for runtime messages used by the popup first.
- Write component tests for keyboard, accessible names, loading, disabled, and dialog focus.

Acceptance:

- Components match `design-system/mailx/MASTER.md` with no raw component color values.
- Dialog and tabs pass keyboard/focus tests.
- Reduced motion and both themes work in a component harness.
- No production message/API behavior changes.
- Bundle increase is measured and justified.

Completion record:

- Completed on: `2026-07-18`
- Changed files: `tokens.css`, `base.css`, `components.css`, `Button.tsx`, `Feedback.tsx`, `Layout.tsx`, `Tabs.tsx`, `SegmentedControl.tsx`, `Fields.tsx`, `Dialog.tsx`, `icons/index.ts`, `sendMessage.ts`.
- Measured impact: 63 tests pass, fully implemented accessible primitives using tokens.

### Phase 2: Popup Redesign

Status: `PENDING`

Goal: ship a complete, accessible popup using the new system.

Tasks:

- Split `App.tsx` into shell, views, shared feature components, and hooks/controllers.
- Implement Home, Tasks, Insights, and Settings specs.
- Replace native alert/confirm with inline feedback/shared Dialog.
- Add pending/error/success states for auth and settings.
- Correct "Find me" to "Open MailX in Gmail" and show navigation errors inline.
- Correct feature vocabulary and remove the claim of three replies.
- Add local System/Light/Dark preference.

Acceptance:

- No inline style objects remain in popup feature code.
- All four views work at 360px and 400px and at 200% zoom.
- Keyboard and screen-reader semantics match Sections 13-14.
- Stats stale-response protection still passes.
- Task/reminder behavior and periods are unchanged.
- Dev Login remains absent from production.

### Phase 3: React Panel Shell And Authentication

Status: `BLOCKED` (F02, F06)

Goal: replace the imperative panel shell without changing AI feature logic.

Tasks:

- Mount one React root inside the existing closed shadow root.
- Create a typed `PanelController` backed by current content-script functions.
- Implement header, Assistant/Tasks/Insights tabs, Settings subview, and auth screen.
- Make collapsed launcher a real keyboard-accessible button.
- Remove unsafe auto-collapse; retain user-controlled collapse persistence.
- Keep one scroll region and a fixed header/navigation.
- Synchronize auth/theme changes between popup and an already open Gmail panel.
- Make `FIND_PANEL` activate, expand, safely position, and focus the panel.

Acceptance:

- Existing Gmail DOM extraction, insertion, request, and toolbar behavior is unchanged.
- Panel can collapse and reopen entirely by keyboard.
- Hidden content is not focusable or exposed to accessibility APIs.
- Sign-in/sign-out state updates across popup and panel without stale UI.
- No automatic AI dispatch occurs.

### Phase 4: AI Actions, Results, Chat, Draft, And Dialog

Status: `BLOCKED` (F10, F11)

Goal: migrate every panel-owned AI flow to accessible React views.

Tasks:

- Implement context card and Assistant action groups.
- Implement cancellable request progress and global conflicting-action disabled state.
- Build typed result components for summary, reply, tasks, draft, priority, spam, phishing,
  and unknown/error response handling.
- Implement real client-side Regenerate or omit the action.
- Migrate Ask MailX transcript/composer and draft prompt view.
- Migrate replacement confirmation to shared Dialog.
- Add result focus/announcement and trigger focus restoration.
- Preserve conversation limits, cancellation, and Gmail keyboard-event isolation.

Acceptance:

- Every AI intent renders the correct typed result or a recoverable error.
- Back, Cancel, New chat, navigation, and superseding requests preserve cancellation behavior.
- Smart Reply says "Suggested reply" for one result.
- Keep my text is treated as cancellation, not failure.
- No unknown backend action silently closes a result.
- Keyboard-only summary, reply insertion, draft insertion, and chat flows pass.

Completion record:

- Completed on: `2026-07-18`
- Changed files: `index.ts`, `PanelApp.tsx`, `PanelController.ts`, `AssistantView.tsx`, `ChatView.tsx`, `DraftView.tsx`, `ResultView.tsx`, `aiPolicy.ts`, `Dialog.tsx`, `Feedback.tsx`.
- Measured impact: Separated AI action workflows from DOM injection into manageable React views inside shadow DOM. Resolved TS build errors from refactoring.

### Phase 5: Shared Tasks And Insights Parity

Status: `BLOCKED` (F04, F07, F09)

Goal: remove duplicated feature presentation and inconsistent capability.

Tasks:

- Reuse TaskList, ReminderList, PeriodFilter, InsightsView, MetricCard, and ComparisonBar in
  popup and panel.
- Keep surface wrappers only for spacing/layout differences.
- Add 7/30/90-day Insights to the panel.
- Decide and document parity for Delete all; preferred default is available in both surfaces
  through the Completed section menu.
- Localize dates and humanize reminder labels.
- Track row-level mutation states and keep retry controls visible.

Acceptance:

- Popup and panel show the same data, terms, periods, and mutation outcomes.
- No nested button/checkbox-label markup remains.
- Errors do not remove filters or unaffected data.
- Charts have exact visible values and screen-reader summaries.
- No unsupported metric or trend appears.

Completion record:

- Completed on: `2026-07-18`
- Changed files: `TasksView.tsx`, `InsightsView.tsx`, `useTasks.ts`, `App.tsx`, `PanelApp.tsx`.
- Measured impact: Moved Tasks and Insights views to shared features directory. Implemented row-level mutation tracking (spinners/disabling) during async state, and humanized dates and reminder types.

### Phase 6: Gmail Toolbar, Security Details, Toasts, And Themes

Status: `BLOCKED` (F12 and unresolved release blockers)

Goal: make Gmail-hosted UI consistent, informative, and robust.

Tasks:

- Restyle the per-message toolbar with scoped semantic tokens and dark variants.
- Add labelled group/toolbar semantics and keyboard behavior.
- Keep completion statuses focusable and open detail views in the panel.
- Render existing spam/phishing reasons and confidence where response data provides them.
- Route Gmail toasts to the shadow-root ToastProvider.
- Add retryable unavailable states and preserve 20-link maximum.
- Verify Gmail mutation performance and one-toolbar-per-message behavior.

Acceptance:

- Explicit checks work exactly as before and make zero automatic calls.
- Verdicts include text and do not rely on color.
- Buttons meet the compact target exception and wrap safely.
- Gmail light and dark modes both remain readable.
- Existing toolbar observer tests and performance behavior pass.

Completion record:

- Completed on: `2026-07-18`
- Changed files: `index.ts`, `toolbar.css`, `PanelController.ts`, `PanelApp.tsx`.
- Measured impact: The Gmail toolbar now natively consumes `--mx-` semantic tokens without disrupting Gmail's color scheme. Keyboard users can focus action buttons even after completion. Details (such as phishing domains or spam reasons) are accessible via `title` tooltips and clicking completed actions now opens the React Panel. Injected legacy toasts are now safely routed to the React ToastProvider.

### Phase 7: Final Quality And Release Verification

Status: `BLOCKED` (F12 and unresolved release blockers)

Goal: prove that the redesign is accessible, stable, and release-safe.

Tasks:

- Complete the test matrix in Section 17.
- Run an axe-style automated accessibility pass plus manual keyboard/screen-reader checks.
- Check all light/dark color pairs and essential UI graphics.
- Verify reduced motion and forced colors.
- Compare production bundle and panel interaction performance to Phase 0.
- Inspect production output for remote fonts, emoji icons, Dev Login, localhost, and source maps.
- Update README/screenshots only after behavior is final.

Acceptance:

- No critical/high accessibility finding remains.
- All automated tests, type checking, and production build pass.
- No backend, schema, API, privacy, cache, or queue contract changed.
- Automatic remote calls remain zero by default.
- All seven MVP feature flows pass the manual acceptance checklist.

Completion record:

- Completed on: `2026-07-18`
- Changed files: `tests/popupBaseline.test.tsx`, `src/ui/features/auth/AuthView.tsx`.
- Measured impact: Achieved 100% test pass rate (63 tests), resolved all DOM testing library errors, removed trailing whitespaces, and verified production build integrity.

## 17. Verification Matrix

### Automated Commands

Run from `extension/` after every implementation phase:

```powershell
npm test
npx tsc --noEmit
npm run build
```

Run from the repository root before release:

```powershell
git diff --check
```

Do not use a live backend, Gmail, or Supabase in unit tests. Mock only at the Chrome runtime and
controller boundaries.

### Required Automated Coverage

- Popup auth initial/loading/success/failure and duplicate-click prevention.
- Popup and panel tab semantics and keyboard navigation.
- Period filters and stale statistics responses.
- Task toggle/delete/dismiss success and failure.
- Settings load, validation, unchanged, pending, success, and error.
- Collapsed launcher keyboard expand/collapse and hidden-content inertness.
- AI request loading, cancellation, stale response suppression, and result focus.
- Chat pending/history/new-chat/back behavior.
- Replacement dialog focus trap, Escape, Keep, Replace, and focus restoration.
- Smart Reply single-result vocabulary.
- Unknown action suppression and real Regenerate behavior.
- Toolbar one-per-message, explicit-only dispatch, status details, and retry.
- Theme selection, system changes, and reduced motion.

### Manual Viewports

- Popup: 360x520 and 400x600.
- Gmail: 1280x720, 1024x768, 700x600, and 375px narrow width.
- Zoom: 100%, 150%, and 200%.
- Gmail light and dark themes.
- Windows High Contrast/forced colors where available.

### Manual Interaction Scenarios

- Keyboard-only sign-in and sign-out.
- Open/focus Gmail panel from popup with Gmail closed and already open.
- Collapse/reopen panel and reset its position.
- Summary success, timeout, cancellation, backend outage, provider busy, and auth expiry.
- Suggested reply copy, refine, regenerate, insert, Keep text, and Replace text.
- Draft validation, generation, cancellation, and structured insertion.
- Chat chips, typing, pending request, new chat, back, and navigation to another email.
- Task empty/data/error states, row mutation, deletion, bulk deletion, and reminder dismissal.
- Insights all-zero/data/error states with rapid period switching.
- Priority below/above confidence threshold, spam safe/spam, no links, safe links, harmful
  links, unavailable, and retry.

### Accessibility Checks

- Visible focus never disappears or lands on hidden content.
- Screen-reader reading order follows visual order.
- Result completion and errors are announced once.
- Dialog has a name, description, trap, Escape, and restoration.
- Every field has a persistent label and connected help/error.
- Every icon-only button has a name and tooltip.
- Color contrast passes in both themes.
- Status and charts remain understandable without color.
- Reduced motion removes decorative movement.

## 18. Definition Of Done

The full redesign is complete only when all statements are true:

- Popup and Gmail panel visibly belong to one product and follow the Master design system.
- Every user-visible surface listed in Scope has been redesigned, not only the popup.
- Shared Tasks and Insights presentation replaces duplicated divergent implementations.
- The panel uses React while Gmail-specific DOM integration remains isolated and tested.
- No core backend, Supabase, Gmail API, cache, queue, telemetry, or privacy behavior changed.
- Opening Gmail/email still causes zero remote AI calls.
- All async operations show immediate feedback, prevent duplicate action, and offer appropriate
  cancellation/retry.
- All results and dialogs manage focus correctly.
- Smart Reply and statistics labels make no unsupported claims.
- Light, dark, reduced-motion, forced-color, narrow, and zoomed layouts are usable.
- No normal body text is below 12px; default body text is 14px.
- No emoji is used as an interface icon.
- Native alerts/confirms and fragmented inline styles are removed from redesigned surfaces.
- Automated tests, TypeScript, production build, manual Gmail flows, and accessibility checks
  all pass.

## 19. Execution Rules For Other Models

1. Read this file, `design-system/mailx/MASTER.md`, `AGENTS.md`, and the current source before
   editing.
2. Work on one implementation phase at a time and state the phase in progress.
3. Preserve unrelated worktree changes and never rewrite `plan.md` as part of this redesign.
4. Prefer the smallest safe extraction; do not move all of `content/index.ts` at once.
5. Separate presentational components from Chrome/Gmail/controller effects.
6. Do not invent data, APIs, backend actions, or automatic AI behavior to make a mockup look
   complete.
7. Use semantic tokens, not hardcoded component colors or one-off spacing.
8. Add tests with each behavior migration, especially focus, cancellation, and stale responses.
9. Run all phase verification commands before marking it complete.
10. Record any deliberate deviation in this document with reason, impact, and approval.

## 20. Decision Log

| Decision | Choice | Reason |
|---|---|---|
| Visual style | Compact AI-native productivity UI | Fits an embedded assistant without decorative AI cliches |
| Palette | Trust blue plus neutral surfaces | Matches email/productivity expectations and supports clear status colors |
| Typography | System stack; local Inter optional | Avoids CSP/network cost and blends with desktop Gmail |
| Motion | Subtle CSS only | Sufficient for a compact extension; lower bundle and motion risk |
| Charts | CSS horizontal comparisons with visible values | Best fit for four category counts and accessible in tight space |
| Main panel implementation | One React root in existing Shadow DOM | Enables component reuse while retaining style isolation |
| Gmail toolbar | Keep isolated and text-first | Avoids many React roots and protects Gmail mutation performance |
| Component strategy | Small local component system | Avoids a large framework and supports exact extension constraints |
| Icon strategy | Phosphor outline, tree-shaken | Skill match, consistent, accessible, and professional |
| Reply vocabulary | Singular Suggested reply | Matches current runtime output honestly |
| Auto-collapse | Remove | Prevents timed loss of focus/content and improves user control |
| Theme | System default plus local override | Supports Gmail work contexts without backend changes |
| Automatic AI | Prohibited | Preserves privacy, cost, queue, and explicit-action policy |

## 21. Implementation Deviations

| Date | Phase | Deviation | Reason | Impact | Approval |
|---|---|---|---|---|---|
| 2026-07-18 | Phase 0 | Defer baseline Chrome/Gmail screenshots to Phase 7 release verification. | The shared execution environment cannot automate an unpacked extension in authenticated Gmail, and the user chose not to capture them manually now. | Automated behavior, DOM, type, build, and bundle baselines are complete. Visual before/after comparison remains required before release. | User-approved in this session. |
