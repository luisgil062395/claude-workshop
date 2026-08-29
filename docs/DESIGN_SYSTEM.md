# SUMA Design System

Implementation reference for SUMA's visual and interaction system. The original
design document is `docs/designContext.pdf` (v1.0, es-MX, light mode).

This file summarizes the **rules that affect code**. It is not a copy of the PDF —
when the two disagree on intent, the PDF wins; where the PDF is internally
inconsistent, see [Deviations](#deviations) below.

**Tokens live in `frontend/src/styles/tokens.css`.** A raw hex value in a
component is a bug.

---

## Principles

Every component is justified against these six. A component that contradicts one
is wrong.

1. **Conversation first** — the thread is the primary surface. Financial data
   lives *inside* the conversation, not in parallel tabs.
2. **Calm financial UX** — no aggressive red/green. Spending is communicated
   with hierarchy and neutral ink; colour is reserved for real meaning.
3. **Minimal cognitive load** — one idea per screen, one primary action per
   view, progressive disclosure of detail.
4. **Human and approachable** — "tú", short phrases, zero accounting jargon.
   Intelligent without being condescending or childish.
5. **Understandable data** — every figure comes with a sentence explaining it.
   Never a chart without a conclusion.
6. **Voice is first-class** — every voice state has a visible text equivalent.
   The user never wonders whether SUMA heard them.

---

## Colour

Semantic names only. Dark mode is meant to be derived by reassigning tokens,
without touching components.

### Brand gradient — rare accent

`--brand-green #2E9E6B` → `--brand-deep #12314F` → `--brand-violet #5B34D6`

**Allowed:** SUMA identity mark, AI avatar, active voice control.
**Never:** page background, generic button background, card decoration.

### Action — neutral ink, not green

| Token | Value | Use |
|---|---|---|
| `--action-primary` | `#131A2A` | primary button fill |
| `--action-hover` | `#26313F` | hover |
| `--action-pressed` | `#0A121F` | pressed |
| `--action-subtle` | `#F1F2EF` | ghost button background |

Primary actions are neutral ink. This removes green's emotional bias and leaves
green free to mean "positive" without competing with buttons.

### Other tokens

| Group | Tokens |
|---|---|
| AI / positive | `--positive #0E7A55`, `--ai-accent #4A2BB5`, `--ai-subtle #EDE8FD`, `--disabled-fill #B7BDC6` |
| Surfaces | `--background #FBFBFA`, `--surface #FFFFFF`, `--surface-subtle #F4F5F3`, `--border #E4E6E1`, `--border-subtle #EFF0EC`, `--border-control` |
| Text | `--text-primary #131A2A`, `--text-secondary #5A6472`, `--text-tertiary`, `--text-disabled #B7BDC6` |
| System | `--success #0E7A55`, `--warning #9A5B00`, `--error #B3261E`, `--info #2A5CB8` |
| Data | `--chart-1`…`--chart-6` (colour-blind safe: every step shifts hue *and* luminosity) |

### The financial colour rule

**The amount is always in primary ink. Colour lives in the identifier — dot,
icon, label — never in the number.**

```
−$120.00   expense   neutral ink, NOT red. Spending is not an error.
+$18,400   income    green identifier + "+" sign + the word "Ingreso"
$3,250     savings   brand violet on the identifier only
```

Never colour amounts by category or sign: it creates visual noise and breaks
column reading. Financial meaning must never depend on colour alone — always
duplicate it with a sign, an icon, or text.

---

## Typography

`Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`

Inter is the open substitute for the licensed brand grotesque. It is loaded from
Google Fonts in `index.html`; the system stack means the app degrades gracefully
if that fails.

| Token | Size / line / weight | Tracking |
|---|---|---|
| `--text-display` | 40/44/600 | −3.5% |
| `--text-h1` | 30/36/600 | −3% |
| `--text-h2` | 24/30/600 | −2% |
| `--text-h3` | 19/26/600 | — |
| `--text-body-lg` | 18/28/400 | — |
| `--text-body` | 16/26/400 | — |
| `--text-body-sm` | 14/22/400 | — |
| `--text-label` | 13/17/600 | +2% |
| `--text-caption` | 12/16/500 | — |
| `--text-chat` | 16.5/27/400 | — |
| `--text-amount-lg` | 34/38/600 | tabular |
| `--text-amount` | 20/24/600 | tabular |

All financial figures use `font-variant-numeric: tabular-nums` so columns align.
Conversational text is capped at ~44 characters (`max-width: 44ch`).

---

## Spacing

Base-4 scale. Whitespace is part of the product language — do not compress it.

| Token | px | Use |
|---|---|---|
| `--space-1` | 4 | icon ↔ text inside a chip |
| `--space-2` | 8 | small sibling elements |
| `--space-3` | 12 | chip and dense-row padding |
| `--space-4` | 16 | base horizontal padding, mobile |
| `--space-5` | 20 | card padding |
| `--space-6` | 24 | between chat messages |
| `--space-8` | 32 | between content blocks |
| `--space-10` | 40 | breathing room before a primary action |
| `--space-12` | 48 | sections within a screen |
| `--space-16` | 64 | empty states, onboarding |

## Radius and elevation

`--radius-xs 4` tags · `sm 8` small inputs · `md 12` buttons/fields ·
`lg 16` cards · `xl 24` bubbles/sheets · `full 999` chips/voice/avatars

Hierarchy comes from **surface contrast, borders and spacing** — not shadows.
Shadow only for things that genuinely float: composer, modal, sheet, menu.
`--shadow-none | subtle | medium | high`.

---

## Icons

**Phosphor Icons** (`@phosphor-icons/react`) is the official library.

- **Regular** default · **Bold** active item · **Fill** persistent state ·
  **Duotone** empty states and onboarding only (32px+)
- 24px default on mobile, 20px in dense rows
- Icon-only buttons need a **44×44px** interactive area even when the glyph is 24px
- **The icon — not colour — is the primary identifier of a category**, so
  reading never depends on colour vision. Mapping: `frontend/src/categories.js`

---

## Buttons

Height 48 (mobile default), 40 (small), 56 (onboarding primary). Radius 12;
`full` for pills and voice. **One primary action visible per screen.**

| Class | Use |
|---|---|
| `.btn-primary` | neutral ink fill, white text |
| `.btn-secondary` | surface fill, 1px border |
| `.btn-ghost` | transparent, `--action-subtle` on hover |
| `.btn-destructive` | neutral until hover, then `--error` |

**The voice control is the only control that may use the brand gradient.**

## Inputs

Height 48, radius 12, 1px border. Focus is an ink ring. Errors add **icon +
explanatory text** — never a red border alone. **Never erase the user's input on
error.**

## Component state matrix

No interactive component is complete without these: `default`, `hover`,
`pressed` (scale 0.98, 120ms), `focused` (independent of hover), `selected`
(border + check, never background colour alone), `disabled` (explain why if it
blocks an action), `loading` (16px spinner inside, fixed width so nothing
jumps), `success` (check + text, fades after 5s), `error` (border + icon +
message below, preserves input).

---

## Conversational UI

> *"La conversación es la app."*

- **SUMA responds in free text directly on the background**, signed with the
  brand mark — so the reply reads as conversation, not as a card.
- The user's own messages may use bubbles (`--radius-xl`).
- **Cards are the exception, not the rule.**

**Use a card when:** the block is actionable as a unit (insight, recommendation,
goal); it groups heterogeneous data meant to be read together; it is a
structured financial result embedded in the thread.

**Avoid a card when:** it is a homogeneous list — use rows; it is SUMA's own
text — put it on the background; you would nest a card inside a card. **Never
two levels.**

---

## Voice

Ten states. Each has shape, motion **and visible text**. There is never
animation without a label: the state is understandable with the sound off, with
a screen reader, or without perceiving colour.

| # | State | Visible text |
|---|---|---|
| 1 | Listo | "Toca para hablar" |
| 2 | Escuchando | "Te escucho…" |
| 3 | Grabando | (bars, contained amplitude) |
| 4 | Procesando | minimal spinner, no percentage |
| 5 | Transcribiendo | partial text in grey |
| 6 | Interpretando | "Entendí $120 en Comida", editable |
| 7 | Guardando | optimistic row at 60% opacity |
| 8 | Guardado | check + "Deshacer" for 5s |
| 9 | Error | "No te escuché bien", offers typing |
| 10 | Cancelado | back to Listo, with no blame |

Canonical sequence: **Te escucho → Entendiendo → Guardando → Guardado**,
resolving in under ~2 perceived seconds.

Rules:
- Every voice screen offers **Cancelar** and **Escribirlo**.
- Microphone permission is requested **only when the user presses the control** —
  never on page load.
- Audio is never recorded or stored; transcription happens in the browser.
- `prefers-reduced-motion`: the pulse becomes a static border with a label.

*Implementation note:* states 3, 4 and 7 are not separately surfaced yet, because
the browser Speech API does not expose them as distinct phases. The states that
do exist map to the canonical labels above.

---

## Transactions

72px rows: category icon · merchant + metadata · amount right-aligned in a
tabular column. Income takes "+", expenses take "−", **both in neutral ink**.
**No dividers between rows of the same day.** Days are grouped under `HOY`,
`AYER`, then a date.

---

## Responsive

Mobile-first. Never scale a desktop UI down onto a phone.

| Breakpoint | Layout |
|---|---|
| **Mobile 360–428** | 16px margin, full-width thread, 56px header, composer respects the bottom safe area |
| **Tablet 768+** | 32px margin, content centred at 640px |
| **Desktop 1024+** | optional 280px sidebar, thread centred at max 720px — **content never spans the full width** |

## Navigation

**No permanent tab bar.** History and settings live behind the header, like an
assistant. Maximum two levels deep. Back always returns to the thread, never to
an intermediate menu. If something seems to need a tab, first ask whether SUMA
can answer it in the thread.

---

## Accessibility

WCAG 2.2 AA is the floor, not the goal. These are part of "done" for every
component.

- **Contrast** — normal text ≥ 4.5:1, large text and icons ≥ 3:1, **control
  borders ≥ 3:1**
- **Visible focus** — 2px ink ring, 3px offset. `outline: none` never appears
  without an accessible replacement
- **Touch targets** — minimum 44×44px with 8px separation, even when the glyph
  is 24px
- **Colour independence** — every meaning carried by colour also has an icon,
  sign or text
- **Keyboard and screen readers** — logical tab order, ARIA roles in chat
  (`log`, `status`), voice state announced with `aria-live="polite"`
- **Motion** — every animation respects `prefers-reduced-motion`; pulses and
  waves become static state changes with text

## Motion

Motion communicates status, never decorates.

`--motion-instant 120ms` control states · `--motion-quick 180ms` chips and
toasts · `--motion-base 240ms` message entry and save confirmation ·
`--motion-slow 320ms` sheets and screen transitions

`--ease-out cubic-bezier(.16,1,.3,1)` for entrances (arrives and settles, no
bounce) · `--ease-in-out cubic-bezier(.4,0,.2,1)` for voice loops.

---

## Deviations

Two documented departures from the PDF's literal values. In both cases the PDF
is **internally inconsistent** — its stated accessibility rules contradict its
own tokens — and the rule was followed over the value.

| Token | PDF value | Used | Why |
|---|---|---|---|
| `--text-tertiary` | `#767F8C`, documented as "4.6:1" | `#68717E` | The stated ratio is wrong: `#767F8C` measures **3.91:1** on `--background` and **3.70:1** on `--surface-subtle`, below the 4.5:1 the same document requires for normal text. Darkened to the nearest passing value (4.77:1 / 4.52:1), still clearly lighter than `--text-secondary`. |
| `--border-control` | *(none — `--border #E4E6E1`)* | `#90928D` | §18 requires "bordes de control ≥ 3:1", but `--border` measures **1.21:1** on `--background`. Interactive controls use the darker border so their boundary is identifiable (WCAG 1.4.11); cards and dividers keep the softer `--border`, which is decorative and exempt. |

Contrast for every token pair in use was computed, not assumed. Re-run that
check if you change a colour.

---

## Implemented since v1.0 of this document

- **Goals and runway** — goal cards with accessible progress bars, and scenario
  cards inside the thread. Amounts stay in `--fin-amount` (primary ink);
  `--ai-accent` violet appears only on identifiers (goal icon, progress fill,
  target scenario border), never on a number, per the financial colour rule.
  Progress is always paired with a "42% completado" text label.

## Not yet implemented

Present in the design document, absent from the current build — listed so nobody
assumes they exist:

- Charts and the data palette (`--chart-*` tokens are defined but unused)
- Income and balance components (SUMA records expenses only; there is no income
  ledger, so the `+$18,400` income pattern has nowhere to appear yet)
- Insight and recommendation cards
- Optimistic save at 60% opacity, and the "Deshacer" toast
- Conversation history, expense detail and settings screens
- Onboarding
- User message bubbles (SUMA has no chat input yet — only expense entry)
- Dark mode (derivable by reassigning tokens)
