# SUMA Sub-proyecto A — Fundación + Pipeline de Gastos por Texto — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the foundation of SUMA (Next.js + SQLite) and a complete, working vertical
slice for registering expenses via text/chat: natural-language input → AI extraction
(Claude) → deterministic date resolution → validation → user review/edit → save →
visible in Dashboard and History.

**Architecture:** Next.js App Router (Server Components for reads, Server Actions for
writes) on top of a SQLite database accessed via Prisma. A shared, framework-agnostic
extraction pipeline (`lib/expenses.ts`) combines Claude tool-use extraction
(`lib/ai/extract.ts`), Zod validation (`lib/validation.ts`), and deterministic date
resolution (`lib/dates.ts`, via `chrono-node`) — this pipeline is designed so
Sub-proyecto B can feed it voice transcripts and receipt-derived text without changes.
UI logic and business logic are kept in separate files so the business logic can be unit
and integration tested without a browser.

**Tech Stack:** Next.js (App Router) + TypeScript, Prisma + SQLite, `@anthropic-ai/sdk`
(model `claude-sonnet-5`, tool use), Zod, `chrono-node`, Vitest, plain CSS (no UI
framework).

**Spec:** `docs/superpowers/specs/2026-08-29-suma-subproject-a-expense-pipeline-design.md`

## Global Constraints

- Default currency is `MXN` when the user does not specify one (spec §2, examples use MXN).
- `category` must always resolve to one of: `food`, `groceries`, `transportation`,
  `shopping`, `housing`, `bills`, `health`, `entertainment`, `travel`, `education`,
  `personal`, `subscriptions`, `other` — unknown categories fall back to `other` and are
  flagged as uncertain (spec §10).
- Date resolution is deterministic (`chrono-node`), never computed by the LLM (spec §9,
  design doc §2).
- AI output is untrusted input: always validated (Zod) before it is shown to the user and
  again before it is persisted (spec §23).
- Never silently create or modify a financial record when a field is uncertain — the user
  must always review and confirm first (spec §24, design doc §4).
- The user's original typed input must be preserved on any error — never cleared (spec §22).
- The app must be responsive from mobile to desktop and meet the accessibility baseline
  in the design doc §7 (semantic HTML, full keyboard operability, no color-only meaning,
  visible focus states).
- No authentication; single local user (design doc §2).
- Out of scope for this plan: voice input, receipt photo input, chat Q&A/financial
  guidance, financial profile, goals, insights, onboarding (design doc §9 — these belong
  to Sub-proyectos B and C).

---

### Task 1: Project scaffold (Next.js + TypeScript, no UI framework)

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `app/layout.tsx`,
  `app/page.tsx`, `app/globals.css`, `.gitignore`

**Interfaces:**
- Produces: a running Next.js dev server on `http://localhost:3000`, path alias `@/*` →
  project root.

- [ ] **Step 1: Initialize the package and install core dependencies**

```bash
npm init -y
npm install next@latest react@latest react-dom@latest
npm install -D typescript@latest @types/node@latest @types/react@latest @types/react-dom@latest
```

- [ ] **Step 2: Add npm scripts**

Edit `package.json`, add under `"scripts"`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

Note: the first `npm run dev` may automatically add a couple of fields Next.js requires
(e.g. `next-env.d.ts` reference) — if it prints a message about updating `tsconfig.json`,
that's expected and safe.

- [ ] **Step 4: Create `next.config.mjs`**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
```

- [ ] **Step 5: Create `app/globals.css`**

```css
:root {
  color-scheme: light dark;
  --color-bg: #faf9f7;
  --color-text: #1f2933;
  --color-primary: #2f6f5e;
  --color-primary-contrast: #ffffff;
  --color-border: #d8d3cb;
  --color-uncertain-bg: #fff4e0;
  --color-uncertain-border: #a9660a;
  --space-2: 0.5rem;
  --space-3: 1rem;
  --space-4: 1.5rem;
  --radius: 0.5rem;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  background: var(--color-bg);
  color: var(--color-text);
  line-height: 1.5;
}

a:focus-visible,
button:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  outline: 3px solid var(--color-primary);
  outline-offset: 2px;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

main {
  max-width: 60rem;
  margin: 0 auto;
  padding: var(--space-4);
}

.btn {
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius);
  border: 1px solid var(--color-border);
  background: white;
  cursor: pointer;
  font-size: 1rem;
}

.btn--primary {
  background: var(--color-primary);
  color: var(--color-primary-contrast);
  border-color: var(--color-primary);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: var(--space-3);
}

.field--uncertain {
  background: var(--color-uncertain-bg);
  border: 1px solid var(--color-uncertain-border);
  border-radius: var(--radius);
  padding: var(--space-2);
}

.field__hint {
  font-size: 0.875rem;
}
```

- [ ] **Step 6: Create `app/layout.tsx`**

```tsx
import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "SUMA",
  description:
    "Lleva el control de tus gastos hablando, escribiendo o con una foto.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        <main id="main-content">{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 7: Create `app/page.tsx` (placeholder, replaced in Task 12)**

```tsx
export default function Home() {
  return <h1>SUMA</h1>;
}
```

- [ ] **Step 8: Create `.gitignore`**

```
node_modules
.next
.env
.env.local
*.db
*.db-journal
```

- [ ] **Step 9: Manually verify the dev server**

Run: `npm run dev`

Open `http://localhost:3000` in a browser. Expected: a page showing the heading "SUMA".
Stop the server (Ctrl+C).

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.mjs app .gitignore
git commit -m "chore: scaffold Next.js project"
```

---

### Task 2: Prisma schema, SQLite database, and Prisma client singleton

**Files:**
- Create: `prisma/schema.prisma`, `lib/db.ts`, `.env.example`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: nothing.
- Produces: `prisma` client singleton exported from `lib/db.ts` with models
  `prisma.expense` and `prisma.receiptItem` (fields as defined below), used by every
  later task that reads or writes expenses.

- [ ] **Step 1: Install Prisma**

```bash
npm install @prisma/client@latest
npm install -D prisma@latest
```

- [ ] **Step 2: Initialize Prisma with SQLite**

```bash
npx prisma init --datasource-provider sqlite
```

This creates `prisma/schema.prisma` and a `.env` file with `DATABASE_URL="file:./dev.db"`.

- [ ] **Step 3: Replace the contents of `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Expense {
  id           String   @id @default(cuid())
  amount       Float
  currency     String   @default("MXN")
  description  String
  category     String
  date         String
  createdAt    DateTime @default(now())
  inputMethod  String

  rawInput     String?
  receiptImage String?
  confidence   Float?

  locationName String?
  latitude     Float?
  longitude    Float?

  tax          Float?
  tip          Float?

  items        ReceiptItem[]
}

model ReceiptItem {
  id          String  @id @default(cuid())
  description String
  quantity    Float?
  amount      Float
  expenseId   String
  expense     Expense @relation(fields: [expenseId], references: [id], onDelete: Cascade)
}
```

- [ ] **Step 4: Create the initial migration**

```bash
npx prisma migrate dev --name init
```

Expected: output ending in "Your database is now in sync with your schema." and a new
`prisma/migrations/` directory.

- [ ] **Step 5: Create `lib/db.ts`**

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 6: Create `.env.example` and update `.gitignore`**

`.env.example`:

```
DATABASE_URL="file:./dev.db"
ANTHROPIC_API_KEY=""
```

Confirm `.gitignore` already lists `.env` and `*.db` (added in Task 1). `.env` (with the
real values) must never be committed; `.env.example` is the committed template.

- [ ] **Step 7: Verify the schema is valid**

Run: `npx prisma validate`
Expected: "The schema at prisma/schema.prisma is valid 🚀"

- [ ] **Step 8: Commit**

```bash
git add prisma lib/db.ts .env.example .gitignore
git commit -m "feat: add Prisma schema and SQLite database for expenses"
```

---

### Task 3: Category list and Zod validation for extracted candidates

**Files:**
- Create: `lib/categories.ts`, `lib/validation.ts`, `vitest.config.ts`
- Test: `tests/unit/validation.test.ts`
- Modify: `package.json` (add `test` script)

**Interfaces:**
- Consumes: nothing.
- Produces: `EXPENSE_CATEGORIES: readonly string[]`, `type ExpenseCategory`,
  `normalizeCategory(rawCategory: string): { category: ExpenseCategory; wasNormalized: boolean }`,
  `extractedCandidateSchema: ZodSchema`, `type ExtractedCandidate` — used by
  `lib/expenses.ts` (Task 7) and `lib/ai/extract.ts` types (Task 6).

- [ ] **Step 1: Install Vitest and Zod**

```bash
npm install zod@latest
npm install -D vitest@latest
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
  test: {
    environment: "node",
  },
});
```

- [ ] **Step 3: Add the `test` script**

Edit `package.json`, add to `"scripts"`:

```json
"test": "vitest run"
```

- [ ] **Step 4: Write the failing test — `tests/unit/validation.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import {
  normalizeCategory,
  extractedCandidateSchema,
} from "@/lib/validation";

describe("normalizeCategory", () => {
  it("matches a known category case-insensitively", () => {
    expect(normalizeCategory("Groceries")).toEqual({
      category: "groceries",
      wasNormalized: false,
    });
  });

  it("falls back to other for unknown categories", () => {
    expect(normalizeCategory("pets")).toEqual({
      category: "other",
      wasNormalized: true,
    });
  });
});

describe("extractedCandidateSchema", () => {
  it("accepts a valid candidate", () => {
    const result = extractedCandidateSchema.safeParse({
      amount: 180,
      currency: "MXN",
      description: "Costco",
      category: "groceries",
      dateExpression: "ayer",
      confidence: 0.9,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a negative amount", () => {
    const result = extractedCandidateSchema.safeParse({
      amount: -5,
      currency: "MXN",
      description: "Costco",
      category: "groceries",
      dateExpression: "ayer",
      confidence: 0.9,
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 5: Run the test and verify it fails**

Run: `npx vitest run tests/unit/validation.test.ts`
Expected: FAIL — cannot find module `@/lib/validation`.

- [ ] **Step 6: Create `lib/categories.ts`**

```ts
export const EXPENSE_CATEGORIES = [
  "food",
  "groceries",
  "transportation",
  "shopping",
  "housing",
  "bills",
  "health",
  "entertainment",
  "travel",
  "education",
  "personal",
  "subscriptions",
  "other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
```

- [ ] **Step 7: Create `lib/validation.ts`**

```ts
import { z } from "zod";
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@/lib/categories";

export const extractedCandidateSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().min(1).max(6),
  description: z.string().min(1),
  category: z.string().min(1),
  dateExpression: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

export type ExtractedCandidate = z.infer<typeof extractedCandidateSchema>;

export function normalizeCategory(rawCategory: string): {
  category: ExpenseCategory;
  wasNormalized: boolean;
} {
  const match = EXPENSE_CATEGORIES.find(
    (c) => c === rawCategory.trim().toLowerCase()
  );
  if (match) return { category: match, wasNormalized: false };
  return { category: "other", wasNormalized: true };
}
```

- [ ] **Step 8: Run the test and verify it passes**

Run: `npx vitest run tests/unit/validation.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 9: Commit**

```bash
git add lib/categories.ts lib/validation.ts vitest.config.ts tests/unit/validation.test.ts package.json
git commit -m "feat: add expense category list and Zod validation for AI candidates"
```

---

### Task 4: Deterministic date resolution

**Files:**
- Create: `lib/dates.ts`
- Test: `tests/unit/dates.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `resolveDateExpression(expression: string, referenceDate: Date): { date: string; resolved: boolean }`,
  `formatDateYYYYMMDD(date: Date): string` — used by `lib/expenses.ts` (Task 7) and
  `lib/metrics.ts` (Task 5).

- [ ] **Step 1: Install chrono-node**

```bash
npm install chrono-node@latest
```

- [ ] **Step 2: Write the failing test — `tests/unit/dates.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { resolveDateExpression } from "@/lib/dates";

const reference = new Date("2026-08-28T10:00:00");

describe("resolveDateExpression", () => {
  it('resolves "hoy" to the reference date', () => {
    expect(resolveDateExpression("hoy", reference)).toEqual({
      date: "2026-08-28",
      resolved: true,
    });
  });

  it('resolves "ayer" to the day before the reference date', () => {
    expect(resolveDateExpression("ayer", reference)).toEqual({
      date: "2026-08-27",
      resolved: true,
    });
  });

  it("resolves an explicit date phrase", () => {
    expect(resolveDateExpression("20 de agosto", reference)).toEqual({
      date: "2026-08-20",
      resolved: true,
    });
  });

  it("marks an unresolvable phrase as not resolved", () => {
    const result = resolveDateExpression("blah blah not a date", reference);
    expect(result.resolved).toBe(false);
  });
});
```

- [ ] **Step 3: Run the test and verify it fails**

Run: `npx vitest run tests/unit/dates.test.ts`
Expected: FAIL — cannot find module `@/lib/dates`.

- [ ] **Step 4: Create `lib/dates.ts`**

```ts
import * as chrono from "chrono-node";

export function resolveDateExpression(
  expression: string,
  referenceDate: Date
): { date: string; resolved: boolean } {
  const parsers = [chrono.es, chrono.en, chrono.casual];
  for (const parser of parsers) {
    const results = parser.parse(expression, referenceDate, {
      forwardDate: false,
    });
    if (results.length > 0) {
      return {
        date: formatDateYYYYMMDD(results[0].start.date()),
        resolved: true,
      };
    }
  }
  return { date: formatDateYYYYMMDD(referenceDate), resolved: false };
}

export function formatDateYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
```

If `chrono.es` / `chrono.en` / `chrono.casual` are not the correct export names for the
installed `chrono-node` version, the test run in Step 3/5 will show a clear "is not a
function" or "undefined" error — check `node_modules/chrono-node/README.md` for the
current export names and adjust the import/usage accordingly, then re-run the test.

- [ ] **Step 5: Run the test and verify it passes**

Run: `npx vitest run tests/unit/dates.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/dates.ts tests/unit/dates.test.ts package.json package-lock.json
git commit -m "feat: add deterministic natural-language date resolution"
```

---

### Task 5: Deterministic metrics module

**Files:**
- Create: `lib/metrics.ts`, `vitest.setup.ts`
- Test: `tests/unit/metrics.test.ts`
- Modify: `vitest.config.ts`

**Interfaces:**
- Consumes: `prisma` from `lib/db.ts` (Task 2), `formatDateYYYYMMDD` from `lib/dates.ts`
  (Task 4).
- Produces: `getTotalForPeriod(start: string, end: string): Promise<number>`,
  `getSpendingByCategory(start: string, end: string): Promise<CategoryBreakdown[]>`,
  `type CategoryBreakdown = { category: string; total: number; percentage: number }`,
  `getWeekRange(referenceDate: Date): { start: string; end: string }`,
  `getMonthRange(referenceDate: Date): { start: string; end: string }` — used by the
  Dashboard page (Task 12).

- [ ] **Step 1: Install dotenv and wire it into Vitest**

```bash
npm install -D dotenv@latest
```

Create `vitest.setup.ts`:

```ts
import { config } from "dotenv";

config();
```

Edit `vitest.config.ts`, add `setupFiles` inside `test`:

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
  },
});
```

- [ ] **Step 2: Write the failing test — `tests/unit/metrics.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import {
  getTotalForPeriod,
  getSpendingByCategory,
  getWeekRange,
  getMonthRange,
} from "@/lib/metrics";

beforeEach(async () => {
  await prisma.expense.deleteMany();
});

afterEach(async () => {
  await prisma.expense.deleteMany();
});

describe("getWeekRange", () => {
  it("returns Monday-Sunday for a mid-week reference date", () => {
    // 2026-08-28 is a Friday
    expect(getWeekRange(new Date("2026-08-28T10:00:00"))).toEqual({
      start: "2026-08-24",
      end: "2026-08-30",
    });
  });
});

describe("getMonthRange", () => {
  it("returns the first and last day of the month", () => {
    expect(getMonthRange(new Date("2026-08-28T10:00:00"))).toEqual({
      start: "2026-08-01",
      end: "2026-08-31",
    });
  });
});

describe("getTotalForPeriod", () => {
  it("sums amounts within the date range", async () => {
    await prisma.expense.createMany({
      data: [
        { amount: 100, description: "A", category: "groceries", date: "2026-08-20", inputMethod: "text" },
        { amount: 50, description: "B", category: "food", date: "2026-08-25", inputMethod: "text" },
        { amount: 999, description: "Out of range", category: "food", date: "2026-07-01", inputMethod: "text" },
      ],
    });

    const total = await getTotalForPeriod("2026-08-01", "2026-08-31");
    expect(total).toBe(150);
  });
});

describe("getSpendingByCategory", () => {
  it("groups totals by category with percentages", async () => {
    await prisma.expense.createMany({
      data: [
        { amount: 75, description: "A", category: "groceries", date: "2026-08-20", inputMethod: "text" },
        { amount: 25, description: "B", category: "food", date: "2026-08-21", inputMethod: "text" },
      ],
    });

    const breakdown = await getSpendingByCategory("2026-08-01", "2026-08-31");
    expect(breakdown).toEqual([
      { category: "groceries", total: 75, percentage: 75 },
      { category: "food", total: 25, percentage: 25 },
    ]);
  });
});
```

- [ ] **Step 3: Run the test and verify it fails**

Run: `npx vitest run tests/unit/metrics.test.ts`
Expected: FAIL — cannot find module `@/lib/metrics`.

- [ ] **Step 4: Create `lib/metrics.ts`**

```ts
import { prisma } from "@/lib/db";
import { formatDateYYYYMMDD } from "@/lib/dates";

export type CategoryBreakdown = {
  category: string;
  total: number;
  percentage: number;
};

export async function getTotalForPeriod(
  start: string,
  end: string
): Promise<number> {
  const result = await prisma.expense.aggregate({
    _sum: { amount: true },
    where: { date: { gte: start, lte: end } },
  });
  return result._sum.amount ?? 0;
}

export async function getSpendingByCategory(
  start: string,
  end: string
): Promise<CategoryBreakdown[]> {
  const expenses = await prisma.expense.findMany({
    where: { date: { gte: start, lte: end } },
    select: { category: true, amount: true },
  });

  const totals = new Map<string, number>();
  let grandTotal = 0;
  for (const expense of expenses) {
    totals.set(expense.category, (totals.get(expense.category) ?? 0) + expense.amount);
    grandTotal += expense.amount;
  }

  return Array.from(totals.entries())
    .map(([category, total]) => ({
      category,
      total,
      percentage: grandTotal > 0 ? Math.round((total / grandTotal) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export function getWeekRange(referenceDate: Date): { start: string; end: string } {
  const day = referenceDate.getDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(referenceDate);
  monday.setDate(referenceDate.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: formatDateYYYYMMDD(monday), end: formatDateYYYYMMDD(sunday) };
}

export function getMonthRange(referenceDate: Date): { start: string; end: string } {
  const first = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const last = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
  return { start: formatDateYYYYMMDD(first), end: formatDateYYYYMMDD(last) };
}
```

- [ ] **Step 5: Run the test and verify it passes**

Run: `npx vitest run tests/unit/metrics.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/metrics.ts vitest.setup.ts vitest.config.ts tests/unit/metrics.test.ts package.json package-lock.json
git commit -m "feat: add deterministic spending metrics"
```

---

### Task 6: Claude extraction module

**Files:**
- Create: `lib/ai/extract.ts`
- Test: `tests/unit/extract.test.ts`

**Interfaces:**
- Consumes: nothing (talks to Anthropic directly).
- Produces: `extractExpenseFromText(rawInput: string): Promise<RawExtractedCandidate>`,
  `type RawExtractedCandidate = { amount: number; currency: string; description: string; category: string; dateExpression: string; confidence: number }`
  — used by `lib/expenses.ts` (Task 7).

- [ ] **Step 1: Install the Anthropic SDK**

```bash
npm install @anthropic-ai/sdk@latest
```

- [ ] **Step 2: Write the failing test — `tests/unit/extract.test.ts`**

```ts
import { describe, it, expect, vi } from "vitest";

vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [
            {
              type: "tool_use",
              name: "extract_expense",
              input: {
                amount: 180,
                currency: "MXN",
                description: "Costco",
                category: "groceries",
                dateExpression: "ayer",
                confidence: 0.92,
              },
            },
          ],
        }),
      },
    })),
  };
});

import { extractExpenseFromText } from "@/lib/ai/extract";

describe("extractExpenseFromText", () => {
  it("returns the tool_use input from Claude", async () => {
    const result = await extractExpenseFromText("Ayer gasté 180 pesos en Costco");
    expect(result).toEqual({
      amount: 180,
      currency: "MXN",
      description: "Costco",
      category: "groceries",
      dateExpression: "ayer",
      confidence: 0.92,
    });
  });
});
```

- [ ] **Step 3: Run the test and verify it fails**

Run: `npx vitest run tests/unit/extract.test.ts`
Expected: FAIL — cannot find module `@/lib/ai/extract`.

- [ ] **Step 4: Create `lib/ai/extract.ts`**

```ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export type RawExtractedCandidate = {
  amount: number;
  currency: string;
  description: string;
  category: string;
  dateExpression: string;
  confidence: number;
};

const EXTRACT_EXPENSE_TOOL = {
  name: "extract_expense",
  description:
    "Extract structured expense data from natural language text describing a purchase.",
  input_schema: {
    type: "object" as const,
    properties: {
      amount: {
        type: "number",
        description: "The numeric amount spent, always positive",
      },
      currency: {
        type: "string",
        description:
          "ISO currency code, e.g. MXN, USD. Default to MXN if the user did not specify a currency.",
      },
      description: {
        type: "string",
        description: "The merchant, item, or purpose of the expense",
      },
      category: {
        type: "string",
        description:
          "Best-guess category: food, groceries, transportation, shopping, housing, bills, health, entertainment, travel, education, personal, subscriptions, or other",
      },
      dateExpression: {
        type: "string",
        description:
          'The date exactly as the user expressed it (e.g. "ayer", "yesterday", "last friday"). Use "hoy" if no date was mentioned.',
      },
      confidence: {
        type: "number",
        description: "Confidence from 0 to 1 that every field above is correct",
      },
    },
    required: [
      "amount",
      "currency",
      "description",
      "category",
      "dateExpression",
      "confidence",
    ],
  },
};

export async function extractExpenseFromText(
  rawInput: string
): Promise<RawExtractedCandidate> {
  const message = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1024,
    tools: [EXTRACT_EXPENSE_TOOL],
    tool_choice: { type: "tool", name: "extract_expense" },
    messages: [{ role: "user", content: rawInput }],
  });

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse) {
    throw new Error("Claude did not return a tool_use block");
  }
  return toolUse.input as RawExtractedCandidate;
}
```

- [ ] **Step 5: Run the test and verify it passes**

Run: `npx vitest run tests/unit/extract.test.ts`
Expected: PASS (1 test).

- [ ] **Step 6: Commit**

```bash
git add lib/ai/extract.ts tests/unit/extract.test.ts package.json package-lock.json
git commit -m "feat: add Claude tool-use expense extraction"
```

---

### Task 7: `extractExpense` / `saveExpense` — the unified pipeline entry points

**Files:**
- Create: `lib/expenses.ts`, `app/agregar/actions.ts`
- Test: `tests/integration/expenses.test.ts`

**Interfaces:**
- Consumes: `extractExpenseFromText` (Task 6), `extractedCandidateSchema`,
  `normalizeCategory` (Task 3), `resolveDateExpression` (Task 4), `prisma` (Task 2).
- Produces:
  - `type ExpenseCandidate = { amount: number; currency: string; description: string; category: string; date: string; rawInput?: string; inputMethod: "voice" | "text" | "receipt"; confidence: number; uncertainFields: string[] }`
  - `extractExpense(rawInput: string, referenceDateISO: string): Promise<{ ok: true; candidate: ExpenseCandidate } | { ok: false; error: string }>`
  - `saveExpense(candidate: Omit<ExpenseCandidate, "uncertainFields">): Promise<{ ok: true; id: string } | { ok: false; error: string }>`
  - `extractExpenseAction`, `saveExpenseAction` (thin `"use server"` wrappers) — used by
    `components/ExpenseCapture.tsx` (Task 10).

- [ ] **Step 1: Write the failing test — `tests/integration/expenses.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/db";

vi.mock("@/lib/ai/extract", () => ({
  extractExpenseFromText: vi.fn(),
}));

import { extractExpenseFromText } from "@/lib/ai/extract";
import { extractExpense, saveExpense } from "@/lib/expenses";

beforeEach(async () => {
  await prisma.expense.deleteMany();
});

afterEach(async () => {
  await prisma.expense.deleteMany();
});

describe("extractExpense", () => {
  it("resolves a valid candidate with no uncertain fields", async () => {
    vi.mocked(extractExpenseFromText).mockResolvedValue({
      amount: 180,
      currency: "mxn",
      description: "Costco",
      category: "groceries",
      dateExpression: "ayer",
      confidence: 0.95,
    });

    const result = await extractExpense(
      "Ayer gasté 180 en Costco",
      "2026-08-28T10:00:00"
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.candidate).toMatchObject({
        amount: 180,
        currency: "MXN",
        description: "Costco",
        category: "groceries",
        date: "2026-08-27",
      });
      expect(result.candidate.uncertainFields).toEqual([]);
    }
  });

  it("flags an unknown category as uncertain and falls back to other", async () => {
    vi.mocked(extractExpenseFromText).mockResolvedValue({
      amount: 50,
      currency: "MXN",
      description: "Vet visit",
      category: "pets",
      dateExpression: "hoy",
      confidence: 0.9,
    });

    const result = await extractExpense(
      "Gasté 50 en el veterinario",
      "2026-08-28T10:00:00"
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.candidate.category).toBe("other");
      expect(result.candidate.uncertainFields).toContain("category");
    }
  });

  it("returns a friendly error when extraction throws", async () => {
    vi.mocked(extractExpenseFromText).mockRejectedValue(new Error("API down"));

    const result = await extractExpense("algo", "2026-08-28T10:00:00");
    expect(result.ok).toBe(false);
  });
});

describe("saveExpense", () => {
  it("persists a valid candidate and it is retrievable", async () => {
    const result = await saveExpense({
      amount: 180,
      currency: "MXN",
      description: "Costco",
      category: "groceries",
      date: "2026-08-27",
      rawInput: "Ayer gasté 180 en Costco",
      inputMethod: "text",
      confidence: 0.95,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const saved = await prisma.expense.findUnique({ where: { id: result.id } });
      expect(saved?.amount).toBe(180);
    }
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npx vitest run tests/integration/expenses.test.ts`
Expected: FAIL — cannot find module `@/lib/expenses`.

- [ ] **Step 3: Create `lib/expenses.ts`**

```ts
import { z } from "zod";
import { extractExpenseFromText } from "@/lib/ai/extract";
import { extractedCandidateSchema, normalizeCategory } from "@/lib/validation";
import { resolveDateExpression } from "@/lib/dates";
import { prisma } from "@/lib/db";

export type ExpenseCandidate = {
  amount: number;
  currency: string;
  description: string;
  category: string;
  date: string;
  rawInput?: string;
  inputMethod: "voice" | "text" | "receipt";
  confidence: number;
  uncertainFields: string[];
};

export type ExtractResult =
  | { ok: true; candidate: ExpenseCandidate }
  | { ok: false; error: string };

const GENERIC_EXTRACTION_ERROR =
  "No pude entender ese gasto claramente. ¿Puedes reformularlo o ingresar el monto manualmente?";

export async function extractExpense(
  rawInput: string,
  referenceDateISO: string
): Promise<ExtractResult> {
  try {
    const raw = await extractExpenseFromText(rawInput);
    const parsed = extractedCandidateSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, error: GENERIC_EXTRACTION_ERROR };
    }

    const uncertainFields: string[] = [];

    const { category, wasNormalized } = normalizeCategory(parsed.data.category);
    if (wasNormalized) uncertainFields.push("category");

    const { date, resolved } = resolveDateExpression(
      parsed.data.dateExpression,
      new Date(referenceDateISO)
    );
    if (!resolved) uncertainFields.push("date");

    if (parsed.data.confidence < 0.6) {
      uncertainFields.push("amount", "description");
    }

    return {
      ok: true,
      candidate: {
        amount: parsed.data.amount,
        currency: parsed.data.currency.toUpperCase(),
        description: parsed.data.description,
        category,
        date,
        rawInput,
        inputMethod: "text",
        confidence: parsed.data.confidence,
        uncertainFields,
      },
    };
  } catch {
    return { ok: false, error: GENERIC_EXTRACTION_ERROR };
  }
}

const expenseToSaveSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().min(1).max(6),
  description: z.string().min(1),
  category: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  inputMethod: z.enum(["voice", "text", "receipt"]),
  rawInput: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export type SaveResult = { ok: true; id: string } | { ok: false; error: string };

export async function saveExpense(
  candidate: Omit<ExpenseCandidate, "uncertainFields">
): Promise<SaveResult> {
  const parsed = expenseToSaveSchema.safeParse(candidate);
  if (!parsed.success) {
    return { ok: false, error: "No se pudo guardar el gasto: datos inválidos." };
  }
  try {
    const created = await prisma.expense.create({ data: parsed.data });
    return { ok: true, id: created.id };
  } catch {
    return { ok: false, error: "No se pudo guardar el gasto. Intenta de nuevo." };
  }
}
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `npx vitest run tests/integration/expenses.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Create `app/agregar/actions.ts` (thin server-action wrapper)**

```ts
"use server";

import { revalidatePath } from "next/cache";
import {
  extractExpense as extractExpenseImpl,
  saveExpense as saveExpenseImpl,
  type ExpenseCandidate,
} from "@/lib/expenses";

export async function extractExpenseAction(
  rawInput: string,
  referenceDateISO: string
) {
  return extractExpenseImpl(rawInput, referenceDateISO);
}

export async function saveExpenseAction(
  candidate: Omit<ExpenseCandidate, "uncertainFields">
) {
  const result = await saveExpenseImpl(candidate);
  if (result.ok) {
    revalidatePath("/");
    revalidatePath("/expenses");
  }
  return result;
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/expenses.ts app/agregar/actions.ts tests/integration/expenses.test.ts
git commit -m "feat: add unified extractExpense/saveExpense pipeline"
```

---

### Task 8: `listExpenses` / `updateExpense` / `deleteExpense`

**Files:**
- Modify: `lib/expenses.ts`
- Create: `app/expenses/actions.ts`
- Test: `tests/integration/expenses-list.test.ts`

**Interfaces:**
- Consumes: `prisma` (Task 2), `ExpenseCandidate` type (Task 7).
- Produces:
  - `type ExpenseFilters = { search?: string; category?: string; dateFrom?: string; dateTo?: string; sortBy?: "date" | "amount"; sortDir?: "asc" | "desc" }`
  - `listExpenses(filters?: ExpenseFilters): Promise<Expense[]>` (Prisma `Expense` rows)
  - `updateExpense(id: string, candidate: Omit<ExpenseCandidate, "uncertainFields" | "rawInput">): Promise<SaveResult>`
  - `deleteExpense(id: string): Promise<{ ok: true } | { ok: false; error: string }>`
  - `updateExpenseAction`, `deleteExpenseAction` (`"use server"` wrappers) — used by
    `components/ExpenseTable.tsx` (Task 13).

- [ ] **Step 1: Write the failing test — `tests/integration/expenses-list.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import { listExpenses, updateExpense, deleteExpense } from "@/lib/expenses";

beforeEach(async () => {
  await prisma.expense.deleteMany();
  await prisma.expense.createMany({
    data: [
      { amount: 100, description: "Costco", category: "groceries", date: "2026-08-20", inputMethod: "text" },
      { amount: 50, description: "Cine", category: "entertainment", date: "2026-08-22", inputMethod: "text" },
    ],
  });
});

afterEach(async () => {
  await prisma.expense.deleteMany();
});

describe("listExpenses", () => {
  it("filters by search text", async () => {
    const result = await listExpenses({ search: "Costco" });
    expect(result).toHaveLength(1);
    expect(result[0].description).toBe("Costco");
  });

  it("filters by category", async () => {
    const result = await listExpenses({ category: "entertainment" });
    expect(result).toHaveLength(1);
    expect(result[0].description).toBe("Cine");
  });

  it("returns all expenses with no filters, sorted by date desc by default", async () => {
    const result = await listExpenses();
    expect(result.map((e) => e.description)).toEqual(["Cine", "Costco"]);
  });
});

describe("updateExpense", () => {
  it("updates an existing expense", async () => {
    const [existing] = await listExpenses({ search: "Costco" });
    const result = await updateExpense(existing.id, {
      amount: 120,
      currency: "MXN",
      description: "Costco",
      category: "groceries",
      date: "2026-08-20",
      inputMethod: "text",
      confidence: 1,
    });
    expect(result.ok).toBe(true);
    const updated = await prisma.expense.findUnique({ where: { id: existing.id } });
    expect(updated?.amount).toBe(120);
  });
});

describe("deleteExpense", () => {
  it("removes an existing expense", async () => {
    const [existing] = await listExpenses({ search: "Cine" });
    const result = await deleteExpense(existing.id);
    expect(result.ok).toBe(true);
    const remaining = await listExpenses();
    expect(remaining).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npx vitest run tests/integration/expenses-list.test.ts`
Expected: FAIL — `listExpenses` is not exported from `@/lib/expenses`.

- [ ] **Step 3: Append to `lib/expenses.ts`**

```ts
export type ExpenseFilters = {
  search?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: "date" | "amount";
  sortDir?: "asc" | "desc";
};

export async function listExpenses(filters: ExpenseFilters = {}) {
  return prisma.expense.findMany({
    where: {
      ...(filters.search
        ? { description: { contains: filters.search } }
        : {}),
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.dateFrom || filters.dateTo
        ? {
            date: {
              ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
              ...(filters.dateTo ? { lte: filters.dateTo } : {}),
            },
          }
        : {}),
    },
    orderBy: { [filters.sortBy ?? "date"]: filters.sortDir ?? "desc" },
  });
}

export async function updateExpense(
  id: string,
  candidate: Omit<ExpenseCandidate, "uncertainFields" | "rawInput">
): Promise<SaveResult> {
  const parsed = expenseToSaveSchema.omit({ rawInput: true }).safeParse(candidate);
  if (!parsed.success) {
    return { ok: false, error: "No se pudo actualizar el gasto: datos inválidos." };
  }
  try {
    await prisma.expense.update({ where: { id }, data: parsed.data });
    return { ok: true, id };
  } catch {
    return { ok: false, error: "No se pudo actualizar el gasto." };
  }
}

export async function deleteExpense(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await prisma.expense.delete({ where: { id } });
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo eliminar el gasto." };
  }
}
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `npx vitest run tests/integration/expenses-list.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Create `app/expenses/actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import {
  updateExpense,
  deleteExpense,
  type ExpenseCandidate,
} from "@/lib/expenses";

export async function updateExpenseAction(
  id: string,
  candidate: Omit<ExpenseCandidate, "uncertainFields" | "rawInput">
) {
  const result = await updateExpense(id, candidate);
  if (result.ok) {
    revalidatePath("/expenses");
    revalidatePath("/");
  }
  return result;
}

export async function deleteExpenseAction(id: string) {
  const result = await deleteExpense(id);
  if (result.ok) {
    revalidatePath("/expenses");
    revalidatePath("/");
  }
  return result;
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/expenses.ts app/expenses/actions.ts tests/integration/expenses-list.test.ts
git commit -m "feat: add listExpenses/updateExpense/deleteExpense for history"
```

---

### Task 9: `ExpenseReviewCard` component

**Files:**
- Create: `components/ExpenseReviewCard.tsx`
- Modify: `app/globals.css` (form styles)

**Interfaces:**
- Consumes: `ExpenseCandidate` type (Task 7), `EXPENSE_CATEGORIES` (Task 3).
- Produces: `ExpenseReviewCard` component with props
  `{ candidate: ExpenseCandidate; onConfirm: (edited: Omit<ExpenseCandidate, "uncertainFields">) => void; onCancel?: () => void; submitLabel?: string }`
  — used by `components/ExpenseCapture.tsx` (Task 10) and `components/ExpenseTable.tsx`
  (Task 13).

- [ ] **Step 1: Create `components/ExpenseReviewCard.tsx`**

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { EXPENSE_CATEGORIES } from "@/lib/categories";
import type { ExpenseCandidate } from "@/lib/expenses";

type Props = {
  candidate: ExpenseCandidate;
  onConfirm: (edited: Omit<ExpenseCandidate, "uncertainFields">) => void;
  onCancel?: () => void;
  submitLabel?: string;
};

export function ExpenseReviewCard({
  candidate,
  onConfirm,
  onCancel,
  submitLabel = "Guardar",
}: Props) {
  const [amount, setAmount] = useState(String(candidate.amount));
  const [currency, setCurrency] = useState(candidate.currency);
  const [description, setDescription] = useState(candidate.description);
  const [category, setCategory] = useState(candidate.category);
  const [date, setDate] = useState(candidate.date);

  const isUncertain = (field: string) => candidate.uncertainFields.includes(field);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onConfirm({
      amount: Number(amount),
      currency: currency.toUpperCase(),
      description,
      category,
      date,
      rawInput: candidate.rawInput,
      inputMethod: candidate.inputMethod,
      confidence: candidate.confidence,
    });
  }

  return (
    <form onSubmit={handleSubmit} aria-labelledby="review-heading">
      <h2 id="review-heading">Entendí:</h2>

      <div className={`field ${isUncertain("amount") ? "field--uncertain" : ""}`}>
        <label htmlFor="review-amount">Monto</label>
        <input
          id="review-amount"
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          aria-describedby={isUncertain("amount") ? "amount-hint" : undefined}
        />
        {isUncertain("amount") && (
          <span id="amount-hint" className="field__hint">
            ¿Es correcto este monto?
          </span>
        )}
      </div>

      <div className="field">
        <label htmlFor="review-currency">Moneda</label>
        <input
          id="review-currency"
          type="text"
          maxLength={6}
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          required
        />
      </div>

      <div className={`field ${isUncertain("description") ? "field--uncertain" : ""}`}>
        <label htmlFor="review-description">Descripción</label>
        <input
          id="review-description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          aria-describedby={isUncertain("description") ? "description-hint" : undefined}
        />
        {isUncertain("description") && (
          <span id="description-hint" className="field__hint">
            ¿Es correcta esta descripción?
          </span>
        )}
      </div>

      <div className={`field ${isUncertain("category") ? "field--uncertain" : ""}`}>
        <label htmlFor="review-category">Categoría</label>
        <select
          id="review-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-describedby={isUncertain("category") ? "category-hint" : undefined}
        >
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {isUncertain("category") && (
          <span id="category-hint" className="field__hint">
            No encontré una categoría exacta. ¿Cuál es correcta?
          </span>
        )}
      </div>

      <div className={`field ${isUncertain("date") ? "field--uncertain" : ""}`}>
        <label htmlFor="review-date">Fecha</label>
        <input
          id="review-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          aria-describedby={isUncertain("date") ? "date-hint" : undefined}
        />
        {isUncertain("date") && (
          <span id="date-hint" className="field__hint">
            No pude entender la fecha con certeza. ¿Es correcta?
          </span>
        )}
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn--primary">
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn" onClick={onCancel}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Add form-actions styles to `app/globals.css`**

```css
.form-actions {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-3);
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/ExpenseReviewCard.tsx app/globals.css
git commit -m "feat: add ExpenseReviewCard for reviewing AI-extracted expenses"
```

---

### Task 10: Text-capture flow (`/agregar`)

**Files:**
- Create: `app/agregar/page.tsx`, `components/ExpenseCapture.tsx`
- Modify: `app/globals.css` (textarea/status styles)

**Interfaces:**
- Consumes: `extractExpenseAction`, `saveExpenseAction` (Task 7), `ExpenseReviewCard`
  (Task 9), `ExpenseCandidate` type (Task 7).
- Produces: a working page at `/agregar` — the full capture flow described in the design
  doc §4.

- [ ] **Step 1: Create `components/ExpenseCapture.tsx`**

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { ExpenseReviewCard } from "@/components/ExpenseReviewCard";
import { extractExpenseAction, saveExpenseAction } from "@/app/agregar/actions";
import type { ExpenseCandidate } from "@/lib/expenses";

type Status = "idle" | "extracting" | "review" | "saving" | "saved" | "error";

export function ExpenseCapture() {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [candidate, setCandidate] = useState<ExpenseCandidate | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleExtract(event: FormEvent) {
    event.preventDefault();
    setStatus("extracting");
    setErrorMessage("");
    const referenceDateISO = new Date().toISOString();
    const result = await extractExpenseAction(input, referenceDateISO);
    if (result.ok) {
      setCandidate(result.candidate);
      setStatus("review");
    } else {
      setErrorMessage(result.error);
      setStatus("error");
    }
  }

  async function handleConfirm(edited: Omit<ExpenseCandidate, "uncertainFields">) {
    setStatus("saving");
    const result = await saveExpenseAction(edited);
    if (result.ok) {
      setStatus("saved");
      setInput("");
      setCandidate(null);
    } else {
      setErrorMessage(result.error);
      setStatus("error");
    }
  }

  return (
    <section aria-labelledby="capture-heading">
      <h1 id="capture-heading">Agregar gasto</h1>

      {status !== "review" && (
        <form onSubmit={handleExtract}>
          <label htmlFor="expense-input">Cuéntame en qué gastaste</label>
          <textarea
            id="expense-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ej. Ayer gasté 180 pesos en Costco en el súper"
            required
            rows={3}
          />
          <button
            type="submit"
            className="btn btn--primary"
            disabled={status === "extracting" || input.trim() === ""}
          >
            {status === "extracting" ? "Entendiendo..." : "Continuar"}
          </button>
        </form>
      )}

      <div role="status" aria-live="polite">
        {status === "saving" && "Guardando..."}
        {status === "saved" && "Gasto guardado."}
        {status === "error" && errorMessage}
      </div>

      {status === "review" && candidate && (
        <ExpenseReviewCard
          candidate={candidate}
          submitLabel="Guardar"
          onConfirm={handleConfirm}
          onCancel={() => {
            setStatus("idle");
            setCandidate(null);
          }}
        />
      )}
    </section>
  );
}
```

- [ ] **Step 2: Create `app/agregar/page.tsx`**

```tsx
import { ExpenseCapture } from "@/components/ExpenseCapture";

export default function AgregarPage() {
  return <ExpenseCapture />;
}
```

- [ ] **Step 3: Add textarea styles to `app/globals.css`**

```css
textarea,
input[type="text"],
input[type="number"],
input[type="date"],
input[type="search"],
select {
  font: inherit;
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  width: 100%;
  max-width: 30rem;
}
```

- [ ] **Step 4: Manually verify the full flow in the browser**

Prerequisite: put a real `ANTHROPIC_API_KEY` in `.env` (copy from `.env.example` if `.env`
doesn't have it yet).

Run: `npm run dev`

1. Open `http://localhost:3000/agregar`.
2. Type "Ayer gasté 180 pesos en Costco en el súper" and click "Continuar".
3. Confirm the review card shows amount 180, currency MXN, a description containing
   "Costco", category "groceries", and yesterday's date.
4. Change the category to something else, then click "Guardar".
5. Confirm the page shows "Gasto guardado." and the textarea is cleared.
6. Run `npx prisma studio`, open the `Expense` table, and confirm the row was saved with
   the edited category.
7. Reload `/agregar`, tab through the form using only the keyboard (no mouse), and
   confirm every control receives a visible focus outline and the tab order is logical.
8. Temporarily set `ANTHROPIC_API_KEY=""` in `.env`, restart `npm run dev`, submit the
   form again, and confirm the friendly error message appears and the typed text is
   still in the textarea. Restore the real key afterward and restart the server.

- [ ] **Step 5: Commit**

```bash
git add app/agregar/page.tsx components/ExpenseCapture.tsx app/globals.css
git commit -m "feat: add text-based expense capture flow at /agregar"
```

---

### Task 11: Responsive navigation

**Files:**
- Create: `components/Nav.tsx`
- Modify: `app/layout.tsx`, `app/globals.css`

**Interfaces:**
- Consumes: nothing.
- Produces: `Nav` component rendered in the root layout, present on every page.

- [ ] **Step 1: Create `components/Nav.tsx`**

```tsx
export function Nav() {
  return (
    <nav aria-label="Principal" className="nav">
      <ul className="nav__list">
        <li>
          <a href="/">Dashboard</a>
        </li>
        <li>
          <a href="/agregar">Agregar gasto</a>
        </li>
        <li>
          <a href="/expenses">Historial</a>
        </li>
      </ul>
    </nav>
  );
}
```

Note: this uses plain `<a>` tags rather than `next/link` to keep the component free of
extra imports; if `next/link` is preferred for client-side transitions it can be swapped
in without changing markup structure or accessibility.

- [ ] **Step 2: Modify `app/layout.tsx` to render `Nav`**

```tsx
import type { ReactNode } from "react";
import "./globals.css";
import { Nav } from "@/components/Nav";

export const metadata = {
  title: "SUMA",
  description:
    "Lleva el control de tus gastos hablando, escribiendo o con una foto.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Nav />
        <main id="main-content">{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Add responsive nav styles to `app/globals.css`**

```css
.nav__list {
  list-style: none;
  display: flex;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
  margin: 0;
  border-bottom: 1px solid var(--color-border);
}

.nav__list a {
  color: var(--color-text);
  text-decoration: none;
  padding: var(--space-2);
}

@media (max-width: 640px) {
  .nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: white;
    border-top: 1px solid var(--color-border);
    border-bottom: none;
    z-index: 10;
  }

  .nav__list {
    justify-content: space-around;
    padding: var(--space-2);
    border-bottom: none;
  }

  main {
    padding-bottom: 4rem;
  }
}
```

- [ ] **Step 4: Manually verify responsiveness**

Run: `npm run dev`, open `http://localhost:3000`.

1. At desktop width, confirm the nav is a horizontal bar at the top.
2. Resize the browser (or use devtools device toolbar) to a mobile width (< 640px) and
   confirm the nav becomes a fixed bottom bar and page content isn't hidden behind it.
3. Using only the keyboard (Tab), confirm all three nav links are reachable and show a
   visible focus outline.
4. With a screen reader (or the browser's accessibility inspector), confirm the nav is
   announced as a "navigation" landmark labeled "Principal".

- [ ] **Step 5: Commit**

```bash
git add components/Nav.tsx app/layout.tsx app/globals.css
git commit -m "feat: add responsive navigation"
```

---

### Task 12: Dashboard page

**Files:**
- Modify: `app/page.tsx`
- Create: `components/CategoryChart.tsx`, `components/RecentExpenses.tsx`

**Interfaces:**
- Consumes: `getTotalForPeriod`, `getSpendingByCategory`, `getWeekRange`, `getMonthRange`,
  `CategoryBreakdown` type (Task 5), `prisma` (Task 2).
- Produces: the Dashboard at `/`.

- [ ] **Step 1: Create `components/CategoryChart.tsx`**

```tsx
import type { CategoryBreakdown } from "@/lib/metrics";

export function CategoryChart({ breakdown }: { breakdown: CategoryBreakdown[] }) {
  if (breakdown.length === 0) {
    return null;
  }

  return (
    <table>
      <caption>Gasto por categoría (este mes)</caption>
      <thead>
        <tr>
          <th scope="col">Categoría</th>
          <th scope="col">Total</th>
          <th scope="col">Porcentaje</th>
        </tr>
      </thead>
      <tbody>
        {breakdown.map((row) => (
          <tr key={row.category}>
            <th scope="row">{row.category}</th>
            <td>${row.total.toFixed(2)}</td>
            <td>
              <div className="category-bar">
                <div
                  className="category-bar__fill"
                  style={{ width: `${row.percentage}%` }}
                />
                <span>{row.percentage}%</span>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 2: Create `components/RecentExpenses.tsx`**

```tsx
type Expense = {
  id: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  date: string;
};

export function RecentExpenses({ expenses }: { expenses: Expense[] }) {
  return (
    <div>
      <h2>Transacciones recientes</h2>
      <ul>
        {expenses.map((expense) => (
          <li key={expense.id}>
            {expense.description} — {expense.currency} {expense.amount.toFixed(2)} —{" "}
            {expense.category} — {expense.date}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 3: Replace `app/page.tsx`**

```tsx
import { getTotalForPeriod, getSpendingByCategory, getWeekRange, getMonthRange } from "@/lib/metrics";
import { prisma } from "@/lib/db";
import { CategoryChart } from "@/components/CategoryChart";
import { RecentExpenses } from "@/components/RecentExpenses";

export default async function DashboardPage() {
  const now = new Date();
  const week = getWeekRange(now);
  const month = getMonthRange(now);

  const [weekTotal, monthTotal, categoryBreakdown, recentExpenses] = await Promise.all([
    getTotalForPeriod(week.start, week.end),
    getTotalForPeriod(month.start, month.end),
    getSpendingByCategory(month.start, month.end),
    prisma.expense.findMany({ orderBy: { date: "desc" }, take: 8 }),
  ]);

  if (recentExpenses.length === 0) {
    return (
      <section aria-labelledby="dashboard-heading">
        <h1 id="dashboard-heading">¿Cómo voy con mi dinero?</h1>
        <p>
          Aún no has registrado gastos. <a href="/agregar">Agrega tu primer gasto</a>.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="dashboard-heading">
      <h1 id="dashboard-heading">¿Cómo voy con mi dinero?</h1>
      <dl className="totals">
        <div>
          <dt>Esta semana</dt>
          <dd>${weekTotal.toFixed(2)}</dd>
        </div>
        <div>
          <dt>Este mes</dt>
          <dd>${monthTotal.toFixed(2)}</dd>
        </div>
      </dl>
      <CategoryChart breakdown={categoryBreakdown} />
      <RecentExpenses expenses={recentExpenses} />
    </section>
  );
}
```

- [ ] **Step 4: Add chart/totals styles to `app/globals.css`**

```css
.totals {
  display: flex;
  gap: var(--space-4);
  margin: var(--space-4) 0;
}

.totals dt {
  font-size: 0.875rem;
  color: #52606d;
}

.totals dd {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.category-bar {
  position: relative;
  background: var(--color-border);
  border-radius: var(--radius);
  height: 1.25rem;
  min-width: 8rem;
  display: flex;
  align-items: center;
}

.category-bar__fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: var(--color-primary);
  border-radius: var(--radius);
}

.category-bar span {
  position: relative;
  padding: 0 var(--space-2);
  font-size: 0.75rem;
}
```

- [ ] **Step 5: Manually verify in the browser**

1. With an empty database (`npx prisma studio` → delete all rows, or a fresh `dev.db`),
   open `http://localhost:3000` and confirm the empty state message and link to
   `/agregar` appear.
2. Add 3-4 expenses across at least two categories via `/agregar`.
3. Reload `/` and confirm the week/month totals, the category table (with visible bars
   and percentages), and the recent transactions list all reflect what was entered.
4. Resize to mobile width and confirm the table and totals remain readable without
   horizontal scrolling of the page (the table itself may scroll internally if very
   narrow).

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx components/CategoryChart.tsx components/RecentExpenses.tsx app/globals.css
git commit -m "feat: add Dashboard with totals, category breakdown, and recent expenses"
```

---

### Task 13: History page (`/expenses`)

**Files:**
- Create: `app/expenses/page.tsx`, `components/ExpenseTable.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `listExpenses`, `ExpenseFilters` type (Task 8), `EXPENSE_CATEGORIES`
  (Task 3), `updateExpenseAction`, `deleteExpenseAction` (Task 8), `ExpenseReviewCard`
  (Task 9).
- Produces: the History page at `/expenses` with search, filters, edit, and delete.

- [ ] **Step 1: Create `components/ExpenseTable.tsx`**

```tsx
"use client";

import { useState } from "react";
import { ExpenseReviewCard } from "@/components/ExpenseReviewCard";
import { updateExpenseAction, deleteExpenseAction } from "@/app/expenses/actions";

type ExpenseRow = {
  id: string;
  amount: number;
  currency: string;
  description: string;
  category: string;
  date: string;
  inputMethod: string;
};

export function ExpenseTable({ expenses }: { expenses: ExpenseRow[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (expenses.length === 0) {
    return <p>No se encontraron gastos con estos filtros.</p>;
  }

  return (
    <table>
      <caption className="visually-hidden">Lista de gastos registrados</caption>
      <thead>
        <tr>
          <th scope="col">Descripción</th>
          <th scope="col">Monto</th>
          <th scope="col">Categoría</th>
          <th scope="col">Fecha</th>
          <th scope="col">Entrada</th>
          <th scope="col">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {expenses.map((expense) =>
          editingId === expense.id ? (
            <tr key={expense.id}>
              <td colSpan={6}>
                <ExpenseReviewCard
                  candidate={{
                    amount: expense.amount,
                    currency: expense.currency,
                    description: expense.description,
                    category: expense.category,
                    date: expense.date,
                    inputMethod: expense.inputMethod as "voice" | "text" | "receipt",
                    confidence: 1,
                    uncertainFields: [],
                  }}
                  submitLabel="Guardar cambios"
                  onConfirm={async (edited) => {
                    await updateExpenseAction(expense.id, edited);
                    setEditingId(null);
                  }}
                  onCancel={() => setEditingId(null)}
                />
              </td>
            </tr>
          ) : (
            <tr key={expense.id}>
              <td>{expense.description}</td>
              <td>
                {expense.currency} {expense.amount.toFixed(2)}
              </td>
              <td>{expense.category}</td>
              <td>{expense.date}</td>
              <td>{expense.inputMethod}</td>
              <td>
                <button className="btn" onClick={() => setEditingId(expense.id)}>
                  Editar
                </button>{" "}
                {deletingId === expense.id ? (
                  <span>
                    ¿Eliminar?{" "}
                    <button
                      className="btn"
                      onClick={async () => {
                        await deleteExpenseAction(expense.id);
                      }}
                    >
                      Sí, eliminar
                    </button>{" "}
                    <button className="btn" onClick={() => setDeletingId(null)}>
                      Cancelar
                    </button>
                  </span>
                ) : (
                  <button className="btn" onClick={() => setDeletingId(expense.id)}>
                    Eliminar
                  </button>
                )}
              </td>
            </tr>
          )
        )}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 2: Create `app/expenses/page.tsx`**

```tsx
import { listExpenses } from "@/lib/expenses";
import { EXPENSE_CATEGORIES } from "@/lib/categories";
import { ExpenseTable } from "@/components/ExpenseTable";

type SearchParams = {
  search?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
};

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const filters = await searchParams;
  const expenses = await listExpenses(filters);

  return (
    <section aria-labelledby="history-heading">
      <h1 id="history-heading">Historial de gastos</h1>
      <form method="get">
        <label htmlFor="search">Buscar</label>
        <input id="search" type="search" name="search" defaultValue={filters.search ?? ""} />

        <label htmlFor="category">Categoría</label>
        <select id="category" name="category" defaultValue={filters.category ?? ""}>
          <option value="">Todas</option>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <label htmlFor="dateFrom">Desde</label>
        <input id="dateFrom" type="date" name="dateFrom" defaultValue={filters.dateFrom ?? ""} />

        <label htmlFor="dateTo">Hasta</label>
        <input id="dateTo" type="date" name="dateTo" defaultValue={filters.dateTo ?? ""} />

        <button type="submit" className="btn btn--primary">
          Filtrar
        </button>
      </form>

      <ExpenseTable expenses={expenses} />
    </section>
  );
}
```

Note on `searchParams`: this assumes the installed Next.js version treats `searchParams`
as a `Promise` (true for recent Next.js major versions). If `npx tsc --noEmit` or
`next dev` reports a type mismatch (e.g. `searchParams` is a plain object, not a
`Promise`), remove `Promise<SearchParams>` and the `await` — the compiler error will name
the actual expected type.

- [ ] **Step 3: Add filter-form layout styles to `app/globals.css`**

```css
.field-inline {
  display: inline-flex;
  flex-direction: column;
  margin-right: var(--space-3);
  margin-bottom: var(--space-3);
}
```

(Optional: wrap each label/input pair in the filter `<form>` with
`<div className="field-inline">` for tidier layout — functional either way.)

- [ ] **Step 4: Manually verify in the browser**

1. With several expenses across categories and dates (from Task 12's verification),
   open `http://localhost:3000/expenses`.
2. Search by a substring of a description, confirm only matching rows show.
3. Filter by category, confirm only that category's rows show.
4. Filter by a date range, confirm only rows within range show.
5. Click "Editar" on a row, change a field, click "Guardar cambios", confirm the row
   updates and matches what you entered.
6. Click "Eliminar" on a row, confirm the "¿Eliminar?" prompt appears, click
   "Sí, eliminar", confirm the row disappears.
7. Using only the keyboard, operate the filter form and one edit/delete cycle end to end.

- [ ] **Step 5: Commit**

```bash
git add app/expenses/page.tsx components/ExpenseTable.tsx app/globals.css
git commit -m "feat: add expense History page with search, filters, edit, and delete"
```

---

### Task 14: Full verification pass

**Files:** none (bug fixes only, if any issues are found).

**Interfaces:** none — this task validates the definition of done from the design doc §10.

- [ ] **Step 1: Run the full automated test suite**

Run: `npm run test`
Expected: all unit and integration tests pass.

- [ ] **Step 2: Type-check the whole project**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual end-to-end walkthrough**

Run: `npm run dev`. Starting from an empty database:

1. Register an expense via `/agregar` using a relative date ("ayer") and confirm the
   saved date is correct.
2. Register a second expense with an explicit date ("20 de agosto") and confirm it
   resolves correctly.
3. Confirm both appear immediately on `/` (Dashboard) and `/expenses` (History).
4. Edit one from `/expenses` and confirm the Dashboard totals update after revisiting `/`.
5. Delete one from `/expenses` and confirm it disappears from both pages.
6. Repeat steps 1-3 with the browser window resized to a tablet width (~768px) and a
   mobile width (~375px), confirming the layout adapts (single column on mobile, nav as
   a bottom bar) without any feature becoming unusable.

- [ ] **Step 4: Accessibility pass**

1. Navigate the entire app (capture, review, dashboard, history, edit, delete) using only
   the keyboard. Confirm every interactive element is reachable and shows a visible focus
   indicator.
2. Confirm no information is conveyed by color alone (category bars have numeric labels;
   uncertain fields have text hints, not just a colored background).
3. Confirm all form inputs have associated `<label>` elements (inspect via browser
   devtools accessibility tree if unsure).

- [ ] **Step 5: Fix any issues found, then commit**

If Steps 1-4 surface any bugs, fix them in the relevant file(s) and re-run the affected
verification steps. Once everything passes:

```bash
git add -A
git commit -m "fix: address issues found in Sub-proyecto A verification pass"
```

If no issues were found, no commit is needed for this task.
