# MailX Design System

> Source of truth for every MailX user interface. Before implementing a surface, check
> `design-system/mailx/pages/<surface>.md`; a page file may override this document only
> where it says so explicitly.

- **Project:** MailX
- **Product:** AI productivity assistant embedded in Gmail
- **Last curated:** 2026-07-18
- **Design dials:** Variance 3/10, motion 3/10, density 8/10

## Direction

MailX uses a compact AI-native productivity style with minimal chrome, strong information
hierarchy, one trust-blue accent, neutral surfaces, and explicit system feedback. It should
feel like a focused Gmail companion, not a separate social app or a generic AI chatbot.

Use:

- Content-first layouts and progressive disclosure.
- Flat surfaces with borders and one restrained floating-panel shadow.
- Clear action labels, visible status, and concise supporting copy.
- Consistent light and dark themes driven by semantic tokens.
- Subtle 150-240ms transitions that communicate state changes.

Avoid:

- Purple/pink "AI gradients," glassmorphism, glow, 3D effects, and decorative animation.
- Newsletter, landing-page, hero, or bento-grid patterns inside the extension.
- Emoji as interface icons.
- Hidden actions that depend on hover.
- Raw color values inside components.

## Product Principles

1. The current email and requested action must always be obvious.
2. AI work happens only after an explicit user action.
3. Waiting, completion, cancellation, failure, and recovery are always visible.
4. Generated text is reviewable and never inserted without a user command.
5. Security verdicts explain what was checked and never rely on color alone.
6. Popup and Gmail panel use the same vocabulary and component behavior.
7. Dense does not mean small: body text stays at least 14px and primary targets stay 44px.

## Color Tokens

### Light Theme

| Token | Value | Use |
|---|---:|---|
| `--mx-bg` | `#F8FAFC` | Application background |
| `--mx-surface` | `#FFFFFF` | Cards, panel, dialogs |
| `--mx-surface-subtle` | `#F1F5F9` | Selected and grouped areas |
| `--mx-surface-raised` | `#FFFFFF` | Floating content |
| `--mx-text` | `#0F172A` | Primary text |
| `--mx-text-secondary` | `#475569` | Supporting text |
| `--mx-text-tertiary` | `#64748B` | Metadata; do not use below 12px |
| `--mx-divider` | `#E2E8F0` | Nonessential dividers |
| `--mx-control-border` | `#64748B` | Essential control boundaries |
| `--mx-primary` | `#2563EB` | Primary action and active state |
| `--mx-on-primary` | `#FFFFFF` | Text/icon on primary |
| `--mx-primary-hover` | `#1D4ED8` | Primary hover |
| `--mx-primary-soft` | `#DBEAFE` | Selected or informational background |
| `--mx-on-primary-soft` | `#1E3A8A` | Text on primary-soft |
| `--mx-focus` | `#2563EB` | Focus ring |
| `--mx-success` | `#047857` | Success text/icon |
| `--mx-success-soft` | `#D1FAE5` | Success background |
| `--mx-warning` | `#B45309` | Warning text/icon |
| `--mx-warning-soft` | `#FEF3C7` | Warning background |
| `--mx-danger` | `#B91C1C` | Danger text/icon |
| `--mx-danger-soft` | `#FEE2E2` | Danger background |
| `--mx-scrim` | `rgba(15, 23, 42, 0.56)` | Dialog backdrop |

### Dark Theme

| Token | Value | Use |
|---|---:|---|
| `--mx-bg` | `#0B1220` | Application background |
| `--mx-surface` | `#111827` | Cards, panel, dialogs |
| `--mx-surface-subtle` | `#1E293B` | Selected and grouped areas |
| `--mx-surface-raised` | `#182235` | Floating content |
| `--mx-text` | `#F8FAFC` | Primary text |
| `--mx-text-secondary` | `#CBD5E1` | Supporting text |
| `--mx-text-tertiary` | `#94A3B8` | Metadata |
| `--mx-divider` | `#334155` | Dividers |
| `--mx-control-border` | `#64748B` | Essential control boundaries |
| `--mx-primary` | `#60A5FA` | Primary action and active state |
| `--mx-on-primary` | `#0B1220` | Text/icon on primary |
| `--mx-primary-hover` | `#93C5FD` | Primary hover |
| `--mx-primary-soft` | `#172554` | Selected or informational background |
| `--mx-on-primary-soft` | `#BFDBFE` | Text on primary-soft |
| `--mx-focus` | `#93C5FD` | Focus ring |
| `--mx-success` | `#6EE7B7` | Success text/icon |
| `--mx-success-soft` | `#064E3B` | Success background |
| `--mx-warning` | `#FCD34D` | Warning text/icon |
| `--mx-warning-soft` | `#78350F` | Warning background |
| `--mx-danger` | `#FCA5A5` | Danger text/icon |
| `--mx-danger-soft` | `#7F1D1D` | Danger background |
| `--mx-scrim` | `rgba(2, 6, 23, 0.72)` | Dialog backdrop |

Status colors always appear with a text verdict and, where space permits, a consistent icon.

## Typography

Use the local system stack to avoid remote font loading and extension CSP issues:

```css
font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

`Inter` may be first only if it is bundled locally. Do not import Google Fonts at runtime.

| Token | Size / line height | Weight | Use |
|---|---|---:|---|
| `--mx-type-xs` | `12px / 16px` | 400-600 | Metadata, never core body copy |
| `--mx-type-sm` | `13px / 18px` | 400-600 | Compact labels |
| `--mx-type-body` | `14px / 21px` | 400 | Default extension body |
| `--mx-type-label` | `14px / 20px` | 600 | Buttons and control labels |
| `--mx-type-title` | `16px / 22px` | 600 | Section and view titles |
| `--mx-type-heading` | `20px / 26px` | 700 | Top-level screen title |
| `--mx-type-metric` | `24px / 28px` | 700 | Statistics values |

Use tabular numbers for statistics and dates. Do not use all-caps text below 12px.

## Spacing And Geometry

| Token | Value |
|---|---:|
| `--mx-space-0-5` | `2px` |
| `--mx-space-1` | `4px` |
| `--mx-space-2` | `8px` |
| `--mx-space-3` | `12px` |
| `--mx-space-4` | `16px` |
| `--mx-space-5` | `20px` |
| `--mx-space-6` | `24px` |
| `--mx-space-8` | `32px` |

| Token | Value | Use |
|---|---:|---|
| `--mx-radius-sm` | `6px` | Chips and compact controls |
| `--mx-radius-md` | `10px` | Inputs and buttons |
| `--mx-radius-lg` | `14px` | Cards and panel |
| `--mx-radius-pill` | `999px` | Status badges only |
| `--mx-shadow-panel` | `0 16px 40px rgba(15, 23, 42, 0.18), 0 2px 8px rgba(15, 23, 42, 0.10)` | Gmail panel only |
| `--mx-shadow-dialog` | `0 24px 64px rgba(15, 23, 42, 0.28)` | Modal dialog only |

Popup content uses borders, not card shadows. The Gmail floating panel may use one shadow to
separate it from Gmail.

## Motion

| Token | Value | Use |
|---|---:|---|
| `--mx-duration-fast` | `120ms` | Press and hover feedback |
| `--mx-duration-base` | `180ms` | State changes |
| `--mx-duration-slow` | `240ms` | Panel/result transition |
| `--mx-ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Entering |
| `--mx-ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | Exiting |

Animate only opacity and transform. Do not add GSAP; CSS is sufficient for this compact UI.
Under `prefers-reduced-motion: reduce`, remove nonessential transitions and all keyframes.

## Core Components

### Buttons

- Primary: one per view, 44px minimum height, solid primary background.
- Secondary: 40-44px height, surface background, visible border.
- Quiet: 36-40px height for low-priority text actions.
- Icon button: 40x40px normally; collapsed panel launcher is at least 48x48px.
- Gmail inline toolbar is the only compact exception: at least 32px high and 24px wide,
  with at least 8px between controls.
- Every async button disables immediately, retains its width, shows progress, and changes its
  label to a specific verb such as "Summarizing" rather than "Loading."

### Focus

All interactive controls use:

```css
:focus-visible {
  outline: 2px solid var(--mx-focus);
  outline-offset: 2px;
}
```

Never remove focus without an equivalent replacement.

### Cards And Rows

- Cards group related information, not every line of content.
- Interactive cards must have button/link semantics.
- Task rows keep checkbox, content, and row actions as siblings. Never nest buttons inside a
  checkbox label.
- Long subjects, senders, and task text wrap with `overflow-wrap: anywhere`.

### Feedback

- Inline status regions stay near the triggering content.
- Toasts are reserved for brief cross-view confirmations and use `aria-live="polite"`.
- Errors include a recovery action whenever retry is possible.
- Skeletons preserve layout for requests expected to exceed 300ms.
- Empty states explain how the user can create data.

### Navigation

- Popup: Home, Tasks, Insights, Settings.
- Gmail panel: Assistant, Tasks, Insights. Settings is a header action/subview.
- Tabs expose `tablist`, `tab`, `aria-selected`, `aria-controls`, and keyboard arrow behavior.
- Back returns to the exact originating view and restores focus to the trigger.

### Icons

- Use one outline family, Phosphor regular at 18px or 20px, with 1.5-2px visual weight.
- Icon-only buttons require an accessible name and tooltip.
- Keep the official MailX logo at its authored proportions. Until an official vector exists,
  the current high-resolution PNG is an allowed brand exception.

## Surface Dimensions

- Popup: 400px preferred width; 360px minimum; viewport-safe maximum height of 600px.
- Gmail panel: 400px preferred width; `calc(100vw - 24px)` below 424px viewport width;
  maximum height `min(680px, calc(100dvh - 24px))`.
- Main panel header and navigation remain visible while only the view body scrolls.
- Avoid nested scroll containers inside the panel.

## Accessibility Baseline

- Meet WCAG 2.2 AA: text contrast 4.5:1, large text and essential UI graphics 3:1.
- All functionality works with keyboard only.
- Dynamic completion uses status/live regions; urgent errors use alerts.
- Results receive programmatic focus when they replace the initiating screen.
- Dialogs use `role="dialog"`, `aria-modal`, labelled title/description, focus trap, Escape,
  backdrop dismissal where safe, and focus restoration.
- Hidden/collapsed content is `hidden` or `inert`, not merely transparent.
- Forms have visible labels and connected helper/error text.
- Do not use color as the only state indicator.

## Required Validation

- Popup at 360px and 400px widths.
- Gmail panel in 1280x720, 1024x768, 700x600, and narrow 375px viewports.
- Browser zoom at 100%, 150%, and 200%.
- Keyboard-only use, reduced motion, light theme, dark theme, and forced colors.
- Empty, loading, success, recoverable error, auth-expired, offline, timeout, and cancelled states.
- Production build contains no remote font imports, emoji icons, localhost URL, or Dev Login.
