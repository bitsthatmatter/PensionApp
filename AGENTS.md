# AGENTS.md — PensionApp

Agent guidance for working in this codebase.

---

## Project overview

A Dutch retirement planning web app built with **Nuxt 4 + Vue 3 + TypeScript**.  
Users upload a MijnPensioenoverzicht JSON file, enter income/expense streams, and compare retirement scenarios.

Key characteristics:
- All computation is **client-side only** — no backend, no API calls.
- Financial amounts are stored and computed in **eurocents** (integers). Convert to euros only for display.
- Domain logic lives in `app/domain/`. Stores in `app/stores/` are thin wrappers that wire domain functions to reactive state.
- UI is Dutch-language throughout (`nl-NL` locale).

---

## Repository layout

```
app/
  domain/          # Pure TypeScript — actuarial math, projection engine, age utils
  stores/          # Pinia stores (profile, financial, pension, annuity, scenarios)
  components/      # Vue SFCs, grouped by feature (income/, expenses/, scenarios/, …)
  pages/           # Nuxt file-based routes: index, income, expenses, scenarios
  composables/     # useFormatting, useTransactions
  types/           # Shared TypeScript interfaces (financial.ts)
  assets/css/      # Tailwind entry point
nuxt.config.ts
vitest.config.ts
```

---

## Tech stack

| Concern | Library |
|---|---|
| Framework | Nuxt 4 / Vue 3 |
| State | Pinia (`@pinia/nuxt`) |
| UI components | `@nuxt/ui` v4 |
| Styling | Tailwind CSS v4 (via `@tailwindcss/vite`) |
| Charts | `vue-chartjs` + `chart.js` |
| Spreadsheet parsing | `xlsx` |
| Testing | Vitest + `@nuxt/test-utils` |
| Icons | Heroicons (`@iconify-json/heroicons`) |

Package manager: **pnpm** (use `pnpm` for all install/run commands).

---

## Development commands

```bash
pnpm install        # install dependencies
pnpm dev            # start dev server (localhost:3000)
pnpm build          # production build
pnpm preview        # preview production build
pnpm test           # run Vitest unit tests (vitest run)
pnpm test:watch     # run Vitest in watch mode
pnpm lint           # ESLint via @nuxt/eslint (flat config)
pnpm lint:fix       # ESLint with auto-fix
```

---

## Pages

| Route | Purpose | Key stores used |
|---|---|---|
| `/` | Dashboard — profile setup, overview cards, quick links | `profile`, `financial`, `pension` |
| `/income` | Upload pension JSON, configure income streams, set AOW age | `pension`, `financial`, `profile` |
| `/expenses` | Upload bank transactions (XLS), manage budgeted costs | `financial` (budgetedCosts), `useTransactions` |
| `/scenarios` | Add/compare retirement age scenarios, timeline chart | `scenarios`, `annuity` |

---

## Architecture rules

### Domain layer (`app/domain/`)
- Must be **pure functions** — no Vue reactivity, no store imports, no side effects.
- All financial calculations use **eurocents** (integer arithmetic). Never pass raw euro floats into domain functions.
- `annuity-domain.ts` — actuarial annuity factor, AG2024 mortality tables, scenario calculations.
- `retirement-projection.ts` — month-by-month cashflow projection engine.
- `age.ts` — `Age` type helpers (`ageToMonths`, `monthsToAge`, `ageAtDate`, `addMonthsToDate`).
- Every domain file with non-trivial logic **must have a co-located `.test.ts` file**. Non-trivial means: any function with branching logic, financial arithmetic, or date math.

### Stores (`app/stores/`)
- Use Pinia composition API style (`defineStore('id', () => { … })`).
- Persist user data to `localStorage` using a namespaced key (`retirement-planner-*`).
- Guard all `localStorage` access with `if (import.meta.server) return`.
- Stores call domain functions; they do not contain business logic themselves.

#### Store dependency graph

```
profile  ──┐
financial ──┼──► scenarios  (read-only consumers; scenarios is NOT persisted to localStorage)
pension  ──┘

annuity  (standalone — no store dependencies)
```

`scenarios` store does not persist to localStorage. Scenarios are ephemeral and recalculated from the other stores on demand.

### Components (`app/components/`)
- Group by feature subdirectory (`income/`, `expenses/`, `scenarios/`, `layout/`, `profile/`, `transactions/`).
- Use `@nuxt/ui` primitives (`UCard`, `UButton`, `UInput`, etc.) — do not add raw HTML form elements when a UI component exists.
- Prefer `<script setup lang="ts">` with explicit type imports.

### Types (`app/types/financial.ts`)
- Single source of truth for shared interfaces (`Age`, `FinancialStream`, `PensionOverview`, etc.).
- Do not duplicate type definitions across files.

---

## Coding conventions

- **Eurocents everywhere**: domain functions accept and return eurocents. Display helpers (`formatEurocents`, `useFormatting`) convert for the UI.
- **Dutch labels**: user-facing strings are in Dutch. Code identifiers, comments, and this file are in English.
- **No `any`**: avoid TypeScript `any`. Use `unknown` and narrow explicitly.
- **ID generation**: use `Math.random().toString(36).slice(2, 9)` (see `scenarios.ts`) — no external UUID library.
- **Imports**: use the `~` alias for `app/` (e.g., `~/types/financial`, `~/domain/age`).
- **Code style**: no semicolons, single quotes, 2-space indent (no linter enforces this yet — match existing code).

### `Age` type and month arithmetic

`Age` is `{ years: number, months: number }` where `months` is always in range `[0, 11]`.

- Use `ageToMonths(age)` and `monthsToAge(n)` from `~/domain/age` for all arithmetic.
- Never compute `age.years * 12 + age.months` inline — use the helper.
- Never construct `Age` with `months >= 12` (e.g. `{ years: 67, months: 15 }` is invalid).

### `FinancialStream.monthlyAmount` sign convention

- For income stream types (`salary`, `savings`, `loan`, `pension`, `aow`, etc.): `monthlyAmount` is **positive**.
- For `type === 'expense'`: `monthlyAmount` is stored as entered by the user (positive in the form). The projection engine uses `Math.abs()` when summing expense streams into `baselineExpense`.
- `BudgetedCost.amount` is always **positive** (it represents a cost magnitude).

---

## Data formats

### MijnPensioenoverzicht JSON (pension file)

Uploaded via `/income`. The file is the official Dutch government pension overview export.

Top-level shape:
```
{
  StatusCode: string,   // '000' = success; any other value = error
  Totalen: { … },
  Details: { … }
}
```

Key paths used by `parsePensionJson` in `stores/pension.ts`:

| Path | Maps to |
|---|---|
| `Totalen.OuderdomsPensioenTotalen.OuderdomsPensioenTotaal[]` | `PensionOverview.ouderdomsPensioen` |
| `Totalen.PartnerPensioenTotalen.PartnerPensioenTotaal[]` | `PensionOverview.partnerPensioen` |
| `Details.OuderdomsPensioenDetails.OuderdomsPensioen[]` | individual `PensionProvider` entries |
| `period.Van.Leeftijd` / `period.Tot.Leeftijd` | `Age` — shape `{ Jaren: number, Maanden: number }` |
| `period.AOWSamenwonend` / `period.AOWAlleenstaand` | `PensionOverview.aow` |

Age objects in the JSON use `{ Jaren, Maanden }` (Dutch field names) and are mapped to `Age { years, months }` via `parseAge()`.

### Bank transaction XLS (ING export)

Uploaded via `/expenses`. Parsed by `useTransactions` composable using `xlsx`.

Expected columns (Dutch headers):

| Column | Type | Notes |
|---|---|---|
| `Rekeningnummer` | string | Account number |
| `Muntsoort` | string | Currency code (e.g. `EUR`) |
| `Transactiedatum` | string | Format `YYYYMMDD` → converted to `YYYY-MM-DD` |
| `Rentedatum` | string | Format `YYYYMMDD` → converted to `YYYY-MM-DD` |
| `Beginsaldo` | number | Opening balance |
| `Eindsaldo` | number | Closing balance |
| `Transactiebedrag` | number | Transaction amount (negative = debit) |
| `Omschrijving` | string | Description; excess whitespace is collapsed |

---

## Testing

- Test files live next to the module they test: `app/domain/annuity-domain.test.ts`.
- Run with `pnpm test` (Vitest, no browser environment needed for domain tests).
- Domain functions must be testable in isolation — no Nuxt/Vue context required.
- Write tests for any domain function with branching logic, financial arithmetic, or date math.
- `age.ts` should have a test file covering month-boundary and leap-year edge cases (not yet written).
- Store tests and component tests are out of scope for now (require Nuxt test environment setup).

---

## What agents should NOT do

- Do not add a backend or server routes unless explicitly requested.
- Do not introduce new npm packages without checking `package.json` first and confirming the addition is necessary.
- Do not store sensitive data (PII, financial data) anywhere other than `localStorage` — there is no server.
- Do not change the eurocent convention to floating-point euros in domain functions.
- Do not commit `node_modules`, `.nuxt`, `.output`, or `.data`.
- Do not model the partner's AOW as additional income in the projection — `samenwonend` is the per-person rate for cohabitants; the projection models the primary person's cashflow only.
