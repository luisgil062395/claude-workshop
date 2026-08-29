# SUMA — `manu-branch`

Implementation branch for SUMA. This README describes **what exists in this branch today**, so it can be compared against other implementation approaches.

The complete product requirements live in [`CLAUDE.md`](./CLAUDE.md). This file does not repeat them.

---

## 1. SUMA overview

SUMA is a responsive web application for tracking personal expenses without the friction of traditional budgeting tools. A user records an expense by speaking it, typing it, or photographing a receipt; AI interprets that unstructured input into a structured expense record (amount, currency, description, category, date), the user reviews and corrects the interpretation before anything is saved, and the confirmed expense then feeds a history view, a dashboard, metrics, and a conversational financial assistant. The guiding idea is that understanding your money should be as easy as telling someone what you spent.

---

## 2. What this branch proposes

A **deliberately small monolith**: one Django backend, one SQLite file, one React SPA, and one external API.

| Layer | Choice |
|---|---|
| Frontend | React 19 + Vite 7 |
| Backend | Django 6.1 + Django REST Framework 3.18 |
| Database | SQLite (single file) |
| AI | Anthropic Claude API — interpretation and extraction only |
| Infrastructure | None beyond the two dev processes |

**Why this shape.** The spec's core flow is *unstructured input → AI extraction → validation → user review → save → metrics*. That flow needs exactly two things the architecture must get right: a single validation gate that every expense passes through regardless of input method, and financial arithmetic that is reproducible rather than generated. Everything else is presentation. A single Django app with one serializer as that gate, plus a React client, delivers both without any distributed machinery.

The scope was chosen for an MVP/workshop, optimizing for a developer strongest in Python who wants to understand every layer. Explicitly **not** used: Docker, Redis, Celery or any queue, microservices, cloud services, a second database, an object store, a separate OCR engine, or a speech-to-text service. Total dependency count is **6 packages** (2 Python, 4 JavaScript).

Two small simplifications worth noting because they remove entire categories of configuration:

- **Vite's dev proxy forwards `/api` to Django**, so the browser sees one origin. No CORS, no `django-cors-headers`, no preflight handling, and no code change at deploy time.
- **Claude has vision**, so receipt reading (planned, Milestone 6) needs no Tesseract/OpenCV pipeline — the same model and the same code path handle text and images.

---

## 3. Architecture diagram

```
   User
     │  speaks / types / photographs
     ▼
┌─────────────────────────────────────────┐
│  React SPA  (Vite dev server, :5173)    │
│  forms · review · history · formatting  │
└────────────────┬────────────────────────┘
                 │  fetch()  JSON over /api/*
                 │  proxied → same origin, no CORS
                 ▼
┌─────────────────────────────────────────┐
│  Django + DRF  (:8000)                  │
│                                         │
│   views  →  ExpenseSerializer           │◄── the single validation gate
│              (validate · normalize)     │    every expense passes through
│                    │                    │
│         ┌──────────┴──────────┐         │
│         ▼                     ▼         │
└─────────┼─────────────────────┼─────────┘
          │                     │
          ▼                     ▼
    ┌───────────┐        ┌──────────────┐
    │  SQLite   │        │  Claude API  │
    │ db.sqlite3│        │              │
    │           │        │ interpretation
    │ source of │        │ ONLY — never  │
    │  truth    │        │ writes to DB  │
    └───────────┘        └──────────────┘
     all totals,          text/image →
     averages,            candidate fields
     filtering            (planned, M3+)
```

The load-bearing rule: **Claude's output is untrusted input.** It returns candidate fields to the validation layer; it never reaches the database directly, and it never performs arithmetic.

---

## 4. Current vertical slice

**Working end to end, browser → API → SQLite → browser:**

A user can manually create an expense (amount, description, category, date) in the React form, have it validated and normalized by the Django API, persisted to SQLite, and immediately rendered in the history table — and can delete it again.

This is the complete write path and read path. The AI extraction step is **not yet built**; expenses are entered by hand.

Verified through the Vite proxy (the same path the browser takes):

| Behaviour | Result |
|---|---|
| Create a valid expense | Saved, returned with UUID |
| `"  Costco  "` | Stored as `"Costco"` (trimmed) |
| `"mxn"` | Stored as `"MXN"` (uppercased) |
| `"Supermercado"` / `"Groceries"` | Both normalize to `"groceries"` |
| `"cripto"` | Rejected — *"Categoría desconocida"* |
| `amount: -5` | Rejected — *"El monto debe ser mayor que cero."* |
| `date: 2030-01-01` | Rejected — *"La fecha no puede estar en el futuro."* |
| List ordering | `-date, -created_at` |
| `npm run build` | Clean; 62 kB gzipped |

Category normalization is already tolerant of English slugs and Spanish labels specifically so that Milestone 3's Claude output can pass through the same serializer unchanged.

**API surface implemented:**

```
GET    /api/expenses/          list, newest first
POST   /api/expenses/          create (validated)
GET    /api/expenses/<uuid>/   retrieve
PATCH  /api/expenses/<uuid>/   update
DELETE /api/expenses/<uuid>/   delete
GET    /api/categories/        category vocabulary for the UI
```

**`Expense` model fields:** `id` (UUID), `amount` (`Decimal(12,2)`), `currency`, `description`, `category`, `date`, `created_at`, `input_method`, `raw_input`. Optional spec fields (`receipt_image`, `tax`, `tip`, `items`, `location`, `confidence`) are **not** modelled yet — each arrives with the milestone that uses it.

`date` (when the expense happened) and `created_at` (when it was recorded) are separate fields and neither overwrites the other, per `CLAUDE.md` §9.

---

## 5. Development status

### ✅ Working

- Django project + `expenses` app, migrations applied
- `Expense` model — `Decimal` money, UUID primary key, `date` ≠ `created_at`
- `ExpenseSerializer` — amount, currency, description, category, and date validation
- Category normalization (13 categories, English slugs + Spanish labels)
- REST API: list, create, retrieve, update, delete, categories
- Django admin registered for `Expense`
- React SPA: expense form with per-field error display, history table, delete
- Vite → Django proxy (no CORS configuration anywhere)
- Spanish UI; accessible markup from the start (labels, `aria-invalid`, `aria-describedby`, `role="status"`, table `scope`/`caption`, visible focus, `prefers-reduced-motion`)
- Responsive single-column → two-column layout
- Production build verified

### 🚧 In progress

- Nothing currently in flight. Milestone 3 (Claude text extraction) is the next unit of work.

### 📋 Planned

- Claude text extraction → unsaved draft (`POST /api/extract/`)
- Review/confirm screen for AI-extracted expenses
- Dashboard and metrics (`metrics.py`, deterministic aggregates)
- Receipt photo upload and extraction
- Voice input via the browser Web Speech API
- Chat assistant answering questions from computed facts
- Financial profile, goals, and scenario guidance
- Automated tests (`test_metrics.py`, `test_validation.py`) — **none exist yet**
- History search, filtering, and sorting
- Client-side routing (currently a single page; `react-router` not installed)
- Onboarding

---

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

**None are required to run this branch today.** There is no `.env` file and the `anthropic` package is not yet installed, because no AI feature has been implemented.

Milestone 3 will introduce one variable:

```
ANTHROPIC_API_KEY=...
```

It will be read from `backend/.env`, which is **already listed in `.gitignore`** along with `db.sqlite3` and `media/`. A committed `.env.example` will carry the key *name* with an empty value.

The key will be read and used **only in Django, server-side**. It is never sent to the browser, never embedded in the Vite bundle, and never committed. Do not place secrets anywhere under `frontend/` — Vite inlines environment variables into the client bundle at build time, which would publish them.

### Note on security

There is **no authentication** in this branch, and DRF is configured with `AllowAny`. It is safe on `localhost` and **must not be deployed publicly as-is.**

---

## 7. Repository structure

```
claude-workshop/
├── CLAUDE.md                     full product specification
├── README.md                     this file
├── .gitignore                    .venv, node_modules, db.sqlite3, media/, .env
│
├── backend/
│   ├── manage.py
│   ├── requirements.txt          django, djangorestframework
│   ├── db.sqlite3                (gitignored)
│   ├── suma/
│   │   ├── settings.py           DRF, es-mx, America/Mexico_City, no auth
│   │   └── urls.py               /admin/, /api/
│   └── expenses/                 the single domain app
│       ├── models.py             Expense
│       ├── categories.py         category enum + normalize()
│       ├── serializers.py        the validation gate
│       ├── views.py              thin DRF generic views
│       ├── urls.py
│       ├── admin.py
│       └── migrations/
│
└── frontend/
    ├── package.json              react, react-dom, vite, @vitejs/plugin-react
    ├── vite.config.js            the /api → :8000 proxy
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx               composes form + list
        ├── api.js                every fetch() in the app
        ├── styles.css            one stylesheet, mobile-first
        └── components/
            ├── ExpenseForm.jsx
            └── ExpenseList.jsx
```

Planned but not yet created: `backend/ai/` (Claude client, prompts, extraction), `backend/expenses/metrics.py`, `backend/expenses/tests/`, `frontend/src/pages/`.

---

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
- Financial correctness is testable in isolation: pure functions over fixtures, no network.
- Accessibility and responsiveness were built in from the first component, which is far cheaper than retrofitting.

**What would need to change for production**

| Concern | Current state | Production need |
|---|---|---|
| Authentication | None; API fully open | Sessions + `user` FK + row-level scoping. **Blocks any public deploy.** |
| Database | SQLite | Postgres, once there are concurrent writers, multiple processes, or an ephemeral filesystem |
| Receipt storage | Planned as local `media/` | Object storage — local files vanish on redeploy on most hosts |
| Secrets | `DEBUG=True`, checked-in dev `SECRET_KEY` | Environment-supplied secret key, `DEBUG=False`, `ALLOWED_HOSTS` |
| Serving | Two dev servers | Django serving the built bundle behind a real WSGI server |
| Claude call | Synchronous, in-request | Fine at this scale; a queue only if extraction volume or latency grows |
| Pagination | None — the list returns every expense | Pagination once history exceeds a few hundred rows |
| Tests | None yet | `metrics.py` and validation coverage before the money math is trusted |
| Multi-currency | Field stored, no conversion | FX rates and per-currency handling — see below |

**Known scope limitation.** Currency is stored per expense but nothing converts between currencies, and totals will assume a single currency (MXN). Real multi-currency support requires exchange rates, rate history, and a decision about historical versus current conversion — it would touch every metrics function. This was deferred deliberately rather than overlooked.

---

## 10. Next milestones

In priority order. Each milestone ends with something that demonstrably works.

1. **Claude text extraction** — `backend/ai/` (client, prompts, extraction) and `POST /api/extract/` returning an **unsaved, validated** draft. Passes today's date and timezone so relative dates ("ayer") resolve correctly. *Done when a typed Spanish sentence returns the right amount, category, and actual calendar date.* Introduces the `anthropic` dependency and `ANTHROPIC_API_KEY`.
2. **Review and confirm** — a review card with every field editable and uncertain fields flagged, then save through the existing endpoint. *Done when sentence → review → save → history works.* **This completes the spec's core vertical slice.**
3. **Dashboard and metrics** — `metrics.py` with deterministic aggregates, `GET /api/metrics/`, week/month totals, category breakdown as an accessible text table, plus the first unit tests.
4. **Receipt upload** — client-side image downscaling, multipart upload, same `/api/extract/` endpoint, same review card, same save path.
5. **Voice input** — browser Web Speech API transcribing into the same text field and the same pipeline; requires no backend changes and stores no audio.

---

## 11. Product specification

[`CLAUDE.md`](./CLAUDE.md) contains the complete SUMA product requirements: product vision, the unified extraction pipeline, the expense data model, date-handling rules, AI validation requirements, dashboard and metrics definitions, accessibility targets, privacy constraints, and the P0/P1/P2 scope split. Section references in this README point there.
