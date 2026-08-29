# SUMA — `manu-branch`

Implementation branch for SUMA. This README describes **what exists in this branch today**, so it can be compared against other implementation approaches.

The complete product requirements live in [`CLAUDE.md`](./CLAUDE.md). This file does not repeat them.

---

## 1. SUMA overview

SUMA is a responsive web application for tracking personal expenses without the friction of traditional budgeting tools. A user records an expense by speaking it, typing it, or photographing a receipt; AI interprets that unstructured input into a structured expense record (amount, currency, description, category, date), the user reviews and corrects the interpretation before anything is saved, and the confirmed expense then feeds a history view, a dashboard, metrics, and a conversational financial assistant. The guiding idea is that understanding your money should be as easy as telling someone what you spent.

---

## Design system

SUMA follows the design specification documented in
[`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md).

The original design reference is available at `docs/designContext.pdf`.

Tokens live in `frontend/src/styles/tokens.css` — colour, typography, spacing,
radius, elevation and motion. **A raw hex value in a component is a bug.** Two
tokens deviate from the PDF's literal values to satisfy the PDF's own WCAG
rules; both are documented under *Deviations*.

---

## 2. What this branch proposes

A **deliberately small monolith**: one Django backend, one SQLite file, one React SPA, and one external API.

| Layer | Choice |
|---|---|
| Frontend | React 19 + Vite 7, styled with the SUMA design system |
| Icons | Phosphor Icons (`@phosphor-icons/react`) — the design system's official library |
| Backend | Django 6.1 + Django REST Framework 3.18 |
| Database | SQLite (single file) |
| AI | Anthropic Claude API (`anthropic` SDK, model `claude-opus-5`) — interpretation only |
| Voice | Browser Web Speech API (`es-MX`) — no service, no dependency |
| Infrastructure | None beyond the two dev processes |

**Why this shape.** The spec's core flow is *unstructured input → AI extraction → validation → user review → save → metrics*. That flow needs exactly two things the architecture must get right: a single validation gate that every expense passes through regardless of input method, and financial arithmetic that is reproducible rather than generated. Everything else is presentation. A single Django app with one serializer as that gate, plus a React client, delivers both without any distributed machinery.

The scope was chosen for an MVP/workshop, optimizing for a developer strongest in Python who wants to understand every layer. Explicitly **not** used: Docker, Redis, Celery or any queue, microservices, cloud services, a second database, an object store, a separate OCR engine, or a speech-to-text service. Total dependency count is **8 packages** (3 Python, 5 JavaScript). Voice transcription added none: it uses the browser's built-in Web Speech API rather than a speech-to-text service.

Two small simplifications worth noting because they remove entire categories of configuration:

- **Vite's dev proxy forwards `/api` to Django**, so the browser sees one origin. No CORS, no `django-cors-headers`, no preflight handling, and no code change at deploy time.
- **Claude has vision**, so receipt reading (planned, Milestone 6) needs no Tesseract/OpenCV pipeline — the same model and the same code path handle text and images.

---

## 3. Architecture diagram

```
   User
     │  speaks (voice)  ·  types (manual)
     ▼
┌──────────────────────────────────────────────────────────┐
│  React SPA  (Vite dev server, :5173)                     │
│                                                          │
│  VoiceExpenseInput          ExpenseForm                  │
│  ├ Web Speech API           ├ every field editable       │
│  │  es-MX, in-browser       ├ uncertain fields flagged   │
│  ├ transcript shown         └ user clicks "Guardar"      │
│  │  and editable                       │                 │
│  └──── transcript ────┐                │                 │
│                       │                │                 │
│         both write to the SAME form state                │
└───────────────────────┼────────────────┼─────────────────┘
                        │                │
              POST /api/extract/   POST /api/expenses/
                        │                │
                        ▼                ▼
┌──────────────────────────────────────────────────────────┐
│  Django + DRF  (:8000)                                   │
│                                                          │
│   ai/extraction.py                                       │
│     ├ today + America/Mexico_City → prompt               │
│     └ Claude call ────────────────────────────┐          │
│              │  candidate fields (may be null)│          │
│              ▼                                │          │
│   ┌─────────────────────────┐                 │          │
│   │  ExpenseSerializer      │◄────────────────┼──────────┤
│   │  ONE validation gate    │  manual entry   │          │
│   │  for BOTH paths         │  arrives here   │          │
│   └───────────┬─────────────┘     too         │          │
│               │                               │          │
│    partial=True│           full validation    │          │
│    → draft     │           → .save()          │          │
│      (NO save) │                │             │          │
└────────────────┼────────────────┼─────────────┼──────────┘
                 │                │             │
                 ▼                ▼             ▼
          back to the form   ┌──────────┐  ┌──────────────┐
          for review/edit    │  SQLite  │  │  Claude API  │
                             └──────────┘  │ interpretation
                                           │ ONLY — never  │
                                           │ writes to DB  │
                                           └──────────────┘
```

Voice adds **no second persistence pipeline**. It produces text; that text becomes a draft; the draft lands in the existing form; the existing save endpoint persists it. `/api/extract/` never calls `.save()`, and `ai/` never imports `models`.

## 4. Current vertical slice

**Working end to end, browser → API → SQLite → browser, by two input methods:**

1. **Manual** — fill the form, save, see it in history.
2. **Voice** — press *Hablar*, say *"Ayer gasté 180 pesos en Costco en el súper"*, watch the transcript appear, have Claude interpret it into an unsaved draft, review and edit every field in the existing form, then save explicitly.

Nothing is persisted by speaking or by extraction. The only write happens when the user clicks **Guardar gasto**.

**API surface implemented:**

```
GET    /api/expenses/          list, newest first
POST   /api/expenses/          create (full validation) ← the only write path
GET    /api/expenses/<uuid>/   retrieve
PATCH  /api/expenses/<uuid>/   update
DELETE /api/expenses/<uuid>/   delete
GET    /api/categories/        category vocabulary for the UI
POST   /api/extract/           natural language → UNSAVED draft

GET    /api/goals/             savings goals, progress computed per request
POST   /api/goals/             create a goal
GET    /api/goals/<uuid>/      retrieve
PATCH  /api/goals/<uuid>/      update
DELETE /api/goals/<uuid>/      delete
GET    /api/runway/            plan + observed spending + scenarios
PUT    /api/runway/            update the plan inputs
POST   /api/ask/               a question → an explanation of computed figures
```

### Goals and financial runway

Two questions this answers: *"¿cuánto llevo de mi meta?"* and *"perdí mi trabajo,
¿cuánto me dura el dinero?"*

**Every number is computed in Python** (`expenses/finance.py`) from stored data.
Claude is not involved in any of it — financial arithmetic has to be
reproducible and auditable.

```
runway_months        = savings / (monthly_expenses − monthly_income)
max_monthly_spending = monthly_income + (savings / desired_runway_months)
```

`GET /api/runway/` returns the stored inputs plus everything derived: observed
spending from real expenses, and **exactly three scenarios** — current pace,
essential-only, and the target — because the design system asks for one idea at
a time, not a spreadsheet.

```jsonc
{
  "plan": { "current_savings": "45000.00", "monthly_income": "0.00", ... },
  "observed_spending": null,        // null = not enough history. Never fabricated.
  "scenarios": [
    { "key": "current",   "label": "Tu ritmo actual",  "monthly_spending": "14000.00", "months": "3.2", "source": "provided" },
    { "key": "essential", "label": "Solo lo esencial", "monthly_spending": "11000.00", "months": "4.1" },
    { "key": "target",    "label": "Que dure 6 meses", "monthly_spending": "7500.00",
      "difference": "6500.00", "allowance": { "weekly": "1724.93", "daily": "246.38" } }
  ]
}
```

**No `Infinity`, no `NaN`, no misleading figure.** Undefined cases return a
`status` instead of a number: `sustainable` (income covers spending — savings
aren't being consumed), `no_savings`, `no_expenses`, and `null` observed
spending when there is too little history. Spending limits round **down**;
descriptive figures round half-up. All money crosses the wire as a decimal
string, never a float.

**Existing expenses feed it.** With ≥5 expenses spanning ≥14 days, SUMA derives
the monthly average and splits it essential vs. discretionary, and the UI offers
those figures rather than asking the user to retype what SUMA already knows.
Below that threshold it says so plainly. Every figure is labelled *"Calculado de
tus gastos"* or *"Lo que tú indicaste"*.

### `POST /api/ask/` — conversational answers

```jsonc
// request
{ "question": "Perdí mi trabajo. ¿Cuánto debería gastar?" }

// response
{
  "answer": "Lamento lo del trabajo. Ahorita tienes $45,000 registrados …",
  "context": { /* every figure the answer was allowed to use */ },
  "source": "claude"          // or "no_data" when there is nothing to explain
}
```

The pipeline is strictly one-directional:

```
question → Django gathers the data → Python computes every figure
        → structured result → Claude turns THAT into a sentence
```

**Claude never does arithmetic.** It receives finished numbers, is told in the
prompt that it must not add, subtract, multiply, divide or estimate, and has no
database access — `ai/` imports no models, by design. The computed `context`
travels back with the answer so the UI can show the numbers behind it: the
explanation is auditable, not a black box.

The prompt requires answers to distinguish **facts** ("tienes $45,000
registrados"), **calculations** ("eso equivale a 3.2 meses"), **scenarios**
("si quisieras que durara 6 meses…") and **uncertainty** ("esto no incluye
gastos anuales ni deudas"), in a calm tone with no guilt language.

Verified live against questions whose answers are *deliberately absent* from
the context — "si gastara $5,000 al mes, ¿cuántos meses me duraría?" (needs
45000 ÷ 5000), "¿cuánto es eso en dólares?" (needs an FX rate), "¿cuánto gasté
en café?" (no such breakdown). It declined all three rather than computing or
inventing.

**Essential vs. discretionary is a default, not a judgment.** Defaults live in
`categories.py`; the user's disagreements are stored as `essential_overrides` on
the plan, so "is transport essential *for you*" stays their call.

### `POST /api/extract/`

```jsonc
// request
{ "text": "Ayer gasté 180 pesos en Costco en el súper.", "input_method": "voice" }

// response — a draft, not a record. No id, nothing written.
{
  "amount": "180.00",
  "currency": "MXN",
  "description": "Costco",
  "category": "groceries",
  "date": "2026-08-28",
  "input_method": "voice",
  "raw_input": "Ayer gasté 180 pesos en Costco en el súper.",
  "missing_fields": [],
  "notes": null
}
```

`input_method` and `raw_input` are set by the server from the request — the model cannot choose them. Fields Claude could not determine, **or that the serializer rejected**, are omitted and listed in `missing_fields`; the UI flags those for the user instead of inventing values. `502` means extraction failed upstream (missing key, API error, malformed output); the transcript and form are left untouched so nothing the user said is lost.

**`Expense`:** `id` (UUID), `amount` (`Decimal(12,2)`), `currency`, `description`, `category`, `date`, `created_at`, `input_method`, `raw_input`. Optional spec fields (`receipt_image`, `tax`, `tip`, `items`, `location`, `confidence`) are **not** modelled yet.

**`FinancialGoal`:** `id` (UUID), `name`, `target_amount`, `current_amount`, `target_date?`, `created_at`. Progress is **never stored** — it is derived on every read so a percentage cannot drift from the amounts behind it.

**`RunwayPlan`:** a **singleton** (one row — the MVP is one local user, and there is no auth). `current_savings`, `monthly_income`, `essential_expenses`, `other_expenses`, `desired_runway_months?`, `essential_overrides` (JSON). This doubles as `CLAUDE.md` §12's financial profile, because its fields *are* the profile; a separate model would add a join and an ambiguity about which copy is authoritative.

`date` (when the expense happened) and `created_at` (when it was recorded) are separate and neither overwrites the other, per `CLAUDE.md` §9.

### Verification status

| Verified how | What |
|---|---|
| 112 automated tests | Validation, category normalization, extraction parsing, draft behaviour, `/api/extract/` creating no `Expense`, and **all runway/goal arithmetic including every edge case** |
| Live HTTP against the running stack | Manual entry, save, list, delete; `/api/extract/` with a missing key, an invalid key, empty text, and a bad `input_method` |
| SDK type introspection | The Claude request shape matches `OutputConfigParam {effort, format{schema, type}}` |
| Live Claude calls | Real extraction (amount, currency, description, category, relative dates; zero rows created) **and** real conversational answers, including three adversarial questions whose figures were absent from the context — all three declined rather than computed |
| **Not yet verified** | **Browser speech recognition in a real browser.** The Web Speech API cannot be driven headlessly; the component builds clean and handles the documented error codes, but needs a manual click-through in Chrome, Edge or Safari. |

**Relative date resolution, verified live** (run on Saturday 2026-08-29):

| Said | Resolved date | |
|---|---|---|
| "Hoy gasté 50 pesos en café" | `2026-08-29` | `food`, 50.00 MXN |
| "Ayer gasté 180 pesos en Costco" | `2026-08-28` | `groceries`, 180.00 MXN |
| "Antier pagué 90 pesos de Uber" | `2026-08-27` | `transportation`, 90.00 MXN |
| "Hace dos días gasté 200 en la farmacia" | `2026-08-27` | `health`, 200.00 MXN |
| "El viernes pasado gasté 350 en el cine" | `2026-08-28` | `entertainment`, 350.00 MXN |
| "Two days ago I spent 45 dollars on lunch" | `2026-08-27` | `food`, 45.00 **USD** — currency detected |
| "Gasté 1200 en el dentista" (no date said) | `2026-08-29` | defaults to today, per spec |
| "Fui al super de Costco ayer" (no amount said) | `2026-08-28` | `missing_fields: ["amount"]` + a note — **null, not invented** |

Note on *"el viernes pasado"*: the prompt resolves it to the most recent Friday strictly before today, which on a Saturday means yesterday. That is deliberate and documented in `ai/prompts.py`; colloquially some speakers mean the Friday of the previous week.

## 5. Development status

### ✅ Working

- Django project + `expenses` app + `ai` package, migrations applied
- `Expense` model — `Decimal` money, UUID primary key, `date` ≠ `created_at`
- `ExpenseSerializer` — the single validation gate for every write path
- Category normalization (13 categories; English slugs and Spanish labels)
- REST API: list, create, retrieve, update, delete, categories
- **`POST /api/extract/`** — Claude interpretation → validated, unsaved draft
- **Voice input** — Web Speech API (`es-MX`), in-browser transcription, editable transcript, `Listo / Escuchando… / Transcribiendo… / Entendiendo… / Revisión` states, graceful handling of unsupported browsers, denied permission, no speech, cancellation and recognition errors
- **Relative date resolution** — prompt anchors on the server's local date in `America/Mexico_City`
- Draft review — extracted values populate the existing form; every field editable; undetermined fields flagged; **nothing saves without an explicit click**
- 112 automated tests (`manage.py test expenses`)
- React SPA: manual form, history table, delete
- Vite → Django proxy (no CORS configuration anywhere)
- Spanish UI; accessible markup (labels, `aria-invalid`, `aria-describedby`, `role="status"`, `aria-pressed`, table `scope`/`caption`, visible focus, state never signalled by colour alone, `prefers-reduced-motion`)
- **SUMA design system applied** — semantic tokens, Inter type scale, base-4 spacing, neutral-ink primary actions, gradient reserved for the voice control and brand mark, Phosphor category icons, 72px transaction rows with `HOY`/`AYER` grouping, amounts in neutral ink (never red)
- Mobile-first responsive layout: single thread, ≤640px tablet, ≤720px desktop
- Contrast verified by computation: **0 WCAG AA failures** across all token pairs in use
- **Savings goals** — create, list, delete; remaining amount, percentage, and required monthly contribution when a target date is set; accessible progress bar paired with a "42% completado" text label
- **Financial runway** — savings, income, essential and other expenses, optional target; current runway, maximum monthly spending for a target, and the current-vs-target difference
- **Observed spending from real expenses** — monthly average split essential/discretionary, offered as a suggestion; explicitly absent when history is too thin
- **Three scenarios** — current / essential-only / target, with weekly and daily reference guides
- **Conversational answers** (`POST /api/ask/`) — ask about your money in Spanish and get the computed figures explained; Claude phrases, Python calculates, and the numbers behind each answer are disclosable in the UI
- Production build verified

See **Verification status** in §4 for what was proven by tests versus what still needs a manual pass with a real API key and a real browser.

### 🚧 In progress

- Nothing currently in flight.

### 📋 Planned

- Dashboard and metrics (`metrics.py`, deterministic aggregates) — **not started**
- Receipt photo upload and extraction — **not started**; no image handling exists
- Chat assistant — **not started**
- History search, filtering and sorting
- Client-side routing (single page today; `react-router` not installed)
- Conversational correction of saved expenses
- Onboarding

## 6. How to run this branch

**Requirements:** Python **≥3.12** (required by Django 6.1) and Node **^20.19 or ≥22.12** (required by Vite 7). Built and verified on Python 3.14.6 and Node 24.20.

### Backend — port `8000`

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python manage.py migrate
.venv/bin/python manage.py runserver
```

Serves the API at `http://127.0.0.1:8000/api/` and the Django admin at `/admin/` (create a superuser with `.venv/bin/python manage.py createsuperuser` if you want it).

Run the test suite with:

```bash
.venv/bin/python manage.py test expenses
```

### Frontend — port `5173`

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

**Open `http://localhost:5173`.** Both servers must be running: Vite proxies `/api` to Django, so the backend on `:8000` is not accessed directly by the browser.

### Ports

| Port | Process |
|---|---|
| `5173` | Vite dev server — **this is the URL you open** |
| `8000` | Django API (reached through the proxy, not directly) |

### Environment variables

One variable is required for voice/AI extraction:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Set it up by copying the template and filling in your own key:

```bash
cp backend/.env.example backend/.env
# then edit backend/.env and paste your key
```

Get a key from the [Anthropic Console](https://console.anthropic.com/). `backend/.env` is **already gitignored** (verified with `git check-ignore`), and `.env.example` contains the variable *name* only, never a value.

`settings.py` loads `backend/.env` into the environment with a small built-in loader — deliberately **not** `python-dotenv`, because the project needs exactly one secret and a dependency to parse `KEY=value` isn't worth the install for a project whose goal is understanding what it runs. Real environment variables always win over the file, so `ANTHROPIC_API_KEY=... python manage.py runserver` also works and deployment configuration is never overridden.

**The rest of the application still runs without a key.** Manual expense entry, history and delete all work; only extraction returns a clear Spanish error telling the user to enter the expense by hand.

**The key is used only in Django, server-side.** It is never sent to the browser, never embedded in the Vite bundle, never included in an API response, and never logged. Do not place secrets anywhere under `frontend/` — Vite inlines environment variables into the client bundle at build time, which would publish them.

### Note on security

There is **no authentication** in this branch, and DRF is configured with `AllowAny`. It is safe on `localhost` and **must not be deployed publicly as-is.**

---

## 7. Repository structure

```
claude-workshop/
├── CLAUDE.md                     full product specification
├── README.md                     this file
├── docs/
│   ├── DESIGN_SYSTEM.md          implementation rules for the visual system
│   └── designContext.pdf         original design reference (17 pages)
├── .gitignore                    .venv, node_modules, db.sqlite3, media/, .env
│
├── backend/
│   ├── manage.py
│   ├── requirements.txt          django, djangorestframework, anthropic
│   ├── .env.example              ANTHROPIC_API_KEY name only, no value
│   ├── .env                      your key (gitignored, not committed)
│   ├── db.sqlite3                (gitignored)
│   ├── suma/
│   │   ├── settings.py           DRF, es-mx, America/Mexico_City, .env loader
│   │   └── urls.py               /admin/, /api/
│   ├── ai/                       Claude layer — imports no models by design
│   │   ├── client.py             API key handling, ExtractionError
│   │   ├── prompts.py            extraction prompt, date anchoring
│   │   └── extraction.py         JSON schema, API call, defensive parsing
│   └── expenses/                 the single domain app
│       ├── models.py             Expense
│       ├── categories.py         category enum + normalize()
│       ├── serializers.py        the validation gate
│       ├── views.py              CRUD + extract (never saves)
│       ├── urls.py  admin.py  migrations/
│       └── tests/
│           ├── test_validation.py    serializer + normalization rules
│           └── test_extraction.py    extraction boundary, draft, no-save
│
└── frontend/
    ├── package.json              react, react-dom, vite, @vitejs/plugin-react, @phosphor-icons/react
    ├── vite.config.js            the /api → :8000 proxy
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx               conversational shell; owns shared form state
        ├── api.js                every fetch() in the app
        ├── categories.js         category → Phosphor icon mapping
        ├── styles.css            global styles, all token-driven
        ├── styles/
        │   └── tokens.css        THE design system source of truth
        └── components/
            ├── VoiceExpenseInput.jsx   voice states, transcript, extraction
            ├── ExpenseForm.jsx         review + manual entry, shared by both
            └── ExpenseList.jsx         72px rows, HOY/AYER grouping
```

Planned but not yet created: `backend/expenses/metrics.py`, `frontend/src/pages/`.

## 8. Technical decisions

**React instead of Django templates.** Three P0 surfaces in the spec are stateful client-side experiences — the voice listening/transcribing/understanding sequence, the editable review card, and chat — and server-rendered templates fight all three. A JSON API also forces explicit thinking about serialization, validation, status codes, and contracts, which is more backend practice than `render()`, not less. The honest counterargument: Django templates would reach a demo faster and with one fewer process. That was weighed and rejected.

**Django + DRF for the backend.** Django supplies the ORM, migrations, and admin (a free data browser during development). DRF is used narrowly — serializers and two generic views, no ViewSets, routers, permissions, or pagination. It earns its place for one specific reason: `CLAUDE.md` §23 requires treating AI output as untrusted and validating it before persistence. A serializer *is* that validation, and the same `ExpenseSerializer` will validate both Claude's extraction output and the user's post-review edits. One code path, one set of guarantees, no duplicated rules.

**SQLite for the MVP.** Single-user expense tracking is a few thousand rows and a handful of aggregates; SQLite is faster here than a networked Postgres and requires no server, no credentials, and no container. Because everything goes through the ORM and uses `Decimal`, moving to Postgres later is a settings change plus `pip install psycopg`.

**Deterministic backend calculations instead of asking Claude.** All totals, averages, category breakdowns, and trends will be computed in Python via ORM aggregates (`metrics.py`, planned for Milestone 5) — never generated by the model. Financial figures must be reproducible and auditable; a language model doing arithmetic is neither. When the chat assistant answers "how much did I spend this week", Django computes the number and Claude only phrases it. `CLAUDE.md` §30 states this requirement directly. Money is `Decimal` everywhere, never `float`.

**Claude only for interpretation/extraction.** The model is used exactly where language understanding is genuinely required: turning a sentence or a receipt photo into candidate structured fields, and wording explanations. It does not store, calculate, filter, or decide what gets saved. Its output flows into the validation layer and is presented to the user for confirmation before persistence.

**No authentication yet.** The spec's P0 scope contains no accounts, login, or multi-user requirement. Adding auth now would mean login and registration screens, session/CSRF handling in React, and protected routes — all before a single expense had been saved. There is deliberately no `user` foreign key on `Expense`, not even a nullable placeholder. When auth is needed, the path is Django's built-in `contrib.auth` with **session authentication** (the app is same-origin, so sessions work directly — no JWT) plus a migration adding a nullable FK.

**No Docker, Redis, queues, microservices, or cloud infrastructure.** AI extraction takes roughly 1–3 seconds, which a normal HTTP request handles fine — that removes the usual justification for a queue and worker. There is one service, so there is nothing to orchestrate; one database, so there is nothing to cache; and one machine, so there is nothing to containerize. Each of these would add setup, failure modes, and concepts to debug, in exchange for capacity this application does not need.

---

## 9. Trade-offs

**What this architecture does well**

- Small enough to hold in your head: 6 dependencies, one app, one database file, ~10 backend source files.
- Two commands to run; no containers, no services, no credentials to obtain (today).
- The AI boundary is structural rather than conventional — extraction returns a plain dict and `ai/` will not import `models`, so raw model output *cannot* reach the database without passing validation.
- One expense pipeline for all three input methods, as §7 requires. Voice becomes a text-entry method and receipts become an image argument; neither is a second system.
- Voice cost nothing architecturally: it produces text, so it reuses the text pipeline whole. Receipts will attach the same way, as an image argument to the same endpoint.
- No audio is recorded, uploaded or stored — transcription happens in the browser, which satisfies the spec's privacy constraint by construction rather than by policy.
- Financial correctness is testable in isolation: pure functions over fixtures, no network.
- Accessibility and responsiveness were built in from the first component, which is far cheaper than retrofitting.

**What would need to change for production**

| Concern | Current state | Production need |
|---|---|---|
| Authentication | None; API fully open | Sessions + `user` FK + row-level scoping. **Blocks any public deploy.** |
| Database | SQLite | Postgres, once there are concurrent writers, multiple processes, or an ephemeral filesystem |
| Receipt storage | Not implemented | Object storage, when receipts are built |
| Secrets | `DEBUG=True`, checked-in dev `SECRET_KEY` | Environment-supplied secret key, `DEBUG=False`, `ALLOWED_HOSTS` |
| Serving | Two dev servers | Django serving the built bundle behind a real WSGI server |
| Claude call | Synchronous, in-request (~1–3 s, `effort: low`) | Fine at this scale; a queue only if extraction volume or latency grows |
| Pagination | None — the list returns every expense | Pagination once history exceeds a few hundred rows |
| Tests | 37, covering validation and the extraction boundary | Coverage for `metrics.py` once the money math exists; a browser test for the voice component |
| Multi-currency | Field stored, no conversion | FX rates and per-currency handling — see below |

**Known limitation — browser speech support.** The Web Speech API does not exist in Firefox, and Chrome's implementation sends audio to Google's servers for recognition. The mic button is hidden where unsupported and the typed path always remains, so no user is blocked; but cross-browser voice would need server-side transcription (record with `MediaRecorder`, POST the blob, transcribe in Django). That is a new endpoint, not a new architecture.

**Known scope limitation.** Currency is stored per expense but nothing converts between currencies, and totals will assume a single currency (MXN). Real multi-currency support requires exchange rates, rate history, and a decision about historical versus current conversion — it would touch every metrics function. This was deferred deliberately rather than overlooked.

---

## 10. Next milestones

In priority order. Each ends with something that demonstrably works.

1. **Browser click-through of the voice UI** — the one part of the feature automated tests cannot cover: press *Hablar* in Chrome or Safari and confirm the microphone prompt, the listening states and the transcript. Server-side extraction is already verified live (see §4).
2. **Dashboard and metrics** — `metrics.py` with deterministic ORM aggregates, `GET /api/metrics/`, week/month totals, category breakdown as an accessible text table, plus unit tests. The largest remaining P0 gap.
3. **Receipt upload** — client-side image downscaling, multipart upload to the *same* `/api/extract/` endpoint with an image block, same draft, same review, same save path.
4. **History search and filtering** — query parameters on the existing list endpoint, so mistakes are easy to find and correct.
5. **Chat assistant** — `metrics.py` computes the facts, Claude only phrases them; streaming response.

## 11. Product specification

[`CLAUDE.md`](./CLAUDE.md) contains the complete SUMA product requirements: product vision, the unified extraction pipeline, the expense data model, date-handling rules, AI validation requirements, dashboard and metrics definitions, accessibility targets, privacy constraints, and the P0/P1/P2 scope split. Section references in this README point there.
