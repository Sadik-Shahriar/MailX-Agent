# MailX Phase 0 Baseline

Captured: 2026-07-18

This directory records the pre-redesign frontend baseline. It intentionally documents current
behavior and gaps; it is not an approval of the legacy interface.

## Screenshot Manifest

The production extension must be loaded from `extension/dist/` in Chrome before capture. Record
each image at 100% zoom with a neutral Gmail inbox unless the state says otherwise. Use the
filenames below when adding the captures.

| File | Surface and state | Capture status |
|---|---|---|
| `popup-signed-out.png` | Popup authentication, including auth error | Deferred by user approval |
| `popup-home.png` | Signed-in popup Inbox tab | Deferred by user approval |
| `popup-tasks.png` | Tasks data, empty, and mutation-error states | Deferred by user approval |
| `popup-stats.png` | Statistics for 7 and 30 days | Deferred by user approval |
| `popup-settings.png` | Settings default and save action | Deferred by user approval |
| `panel-expanded-no-email.png` | Gmail panel with no open email | Deferred by user approval |
| `panel-expanded-email.png` | Gmail panel with an open email | Deferred by user approval |
| `panel-collapsed.png` | Collapsed Gmail panel launcher | Deferred by user approval |
| `panel-result.png` | AI result state | Deferred by user approval |
| `panel-chat.png` | Chat composer and pending state | Deferred by user approval |
| `panel-draft.png` | Draft composer and validation error | Deferred by user approval |
| `message-toolbar.png` | Priority, Spam Check, and Link Safety toolbar | Deferred by user approval |

Automated rendering is not used for these captures because extension pages require the Chrome
runtime and Gmail-host integration. On 2026-07-18, the user approved deferring all Phase 0
screenshots. Capture them during Phase 7 release verification before a release candidate is
accepted.

## Bundle Baseline

Run after `npm run build` from `extension/` and record the generated popup and content-script
asset sizes in `bundle-sizes.txt`. The build output is the source of truth because CRXJS hashes
asset filenames.

## Known Accessibility And State Gaps

- The collapsed panel uses a header `div`, so keyboard users cannot reopen it; collapsed content
  is visually hidden but not `hidden` or `inert`.
- The panel automatically collapses after 45 seconds of inactivity.
- AI result replacement does not announce or programmatically move focus to a labelled heading.
- The Gmail replacement confirmation has no dialog semantics, focus trap, Escape handling, or
  focus restoration.
- Popup sign-in does not currently expose pending or duplicate-click prevention.
- Settings save now supplies a runtime callback for measurable completion, but has no visible
  pending, success, or error feedback until Phase 2.

## Immutable Behavior Checklist

- [x] AI dispatch is gated by `dispatchRemoteAi`; automatic and unknown sources are blocked by
  `tests/aiPolicy.test.ts`.
- [x] Popup load/navigation makes no AI runtime request, covered by
  `tests/popupBaseline.test.tsx`.
- [x] Existing Chrome message names and payload types remain defined in `src/shared/types.ts`.
- [x] Panel-owned requests preserve their request ID cancellation path in `src/content/index.ts`.
- [x] Gmail extraction, insertion, toolbar observation, link cap, and priority threshold remain
  unchanged in Phase 0.
- [x] Supported periods remain 7, 30, and 90 days; period request coverage is in
  `tests/popupBaseline.test.tsx`.
- [x] Task mutation failures remain visible, covered by `tests/popupBaseline.test.tsx`.
- [x] Authentication failure remains visible, covered by `tests/popupBaseline.test.tsx`.
- [x] Settings save passes a callback, covered by `tests/popupBaseline.test.tsx`.
- [ ] Collapsed launcher keyboard behavior, result focus, and replacement-dialog semantics are
  tracked as explicit Phase 3/4 TODO tests because the current private closed-shadow imperative
  panel has no testable DOM boundary. They must be implemented before their behavior migration.
