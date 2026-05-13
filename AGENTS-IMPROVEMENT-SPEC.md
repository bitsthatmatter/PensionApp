# AGENTS.md Improvement Spec

Audit date: 2026-05-13  
Auditor: Ona

---

## Audit summary

No `AGENTS.md` existed. No `.ona/skills/`, `.cursor/rules/`, or `.cursorrules` files were found.  
`AGENTS.md` was created from scratch during this session. This document records what was found, what was written, and what still needs to be done.

---

## What is good (already captured in AGENTS.md)

| Area | Finding |
|---|---|
| Domain isolation | `app/domain/` contains pure functions with no Vue/Pinia imports — easy to test and reason about. Captured as an architecture rule. |
| Eurocent convention | Consistent use of integer eurocents throughout domain layer. Documented as a hard rule. |
| Test coverage | Two domain test files exist with meaningful assertions against actuarial reference values. Test location convention documented. |
| Pinia composition style | All stores use the composition API form consistently. Documented. |
| localStorage guard | All stores guard `localStorage` with `import.meta.server` checks. Documented. |
| Feature-grouped components | Components are grouped by feature subdirectory. Documented. |
| Single type file | `app/types/financial.ts` is the sole source of shared interfaces. Documented. |
| Package manager | pnpm is used consistently (pnpm-lock.yaml present). Documented. |

---

## What is missing from AGENTS.md (gaps to fill)

### 1. No data-flow diagram or store dependency map

**Problem:** There are five stores with non-obvious dependencies (`scenarios` → `profile` + `financial` + `pension`; `annuity` is standalone). An agent editing stores risks creating circular dependencies or duplicating state.

**Spec:** Add a "Store dependency graph" section to AGENTS.md:

```
profile  ──┐
financial ──┼──► scenarios (read-only consumers)
pension  ──┘

annuity  (standalone — no store dependencies)
```

Also note that `scenarios` store does **not** persist to localStorage (scenarios are ephemeral; recalculated on load).

---

### 2. No description of the MijnPensioenoverzicht JSON schema

**Problem:** `pension.ts` parses a specific Dutch government pension JSON format (`StatusCode`, `Totalen`, `Details`, `OuderdomsPensioenTotalen`, etc.). An agent asked to extend pension parsing has no schema reference and will guess field names.

**Spec:** Add a "Pension file format" section to AGENTS.md describing:
- Top-level shape: `{ StatusCode, Totalen, Details }`
- `StatusCode === '000'` means success
- Key nested paths: `Totalen.OuderdomsPensioenTotalen.OuderdomsPensioenTotaal[]`, `Details.OuderdomsPensioenDetails.OuderdomsPensioen[]`, `Totalen.PartnerPensioenTotalen.PartnerPensioenTotaal[]`
- Age objects: `{ Jaren: number, Maanden: number }` → mapped to `Age { years, months }`

---

### 3. No description of the transaction XLS format

**Problem:** `useTransactions.ts` maps Dutch column names (`Rekeningnummer`, `Muntsoort`, `Transactiedatum`, etc.) from an ING bank export. An agent extending transaction parsing has no reference for expected columns or date format (`YYYYMMDD`).

**Spec:** Add a "Transaction file format" section to AGENTS.md listing the expected XLS columns and the `YYYYMMDD` → ISO date conversion rule.

---

### 4. No page-level routing documentation

**Problem:** There are four pages (`index`, `income`, `expenses`, `scenarios`) but no description of what each page does or which stores/components it uses. An agent adding a new page or feature has no map.

**Spec:** Add a "Pages" section to AGENTS.md:

| Route | Purpose | Key stores |
|---|---|---|
| `/` | Dashboard — profile setup, overview cards, quick links | profile, financial, pension |
| `/income` | Upload pension JSON, configure income streams, AOW age | pension, financial, profile |
| `/expenses` | Upload bank transactions, manage budgeted costs | financial (budgetedCosts), useTransactions |
| `/scenarios` | Add/compare retirement age scenarios, timeline chart | scenarios, annuity |

---

### 5. No description of the `Age` type and month-arithmetic convention

**Problem:** `Age { years: number, months: number }` is used pervasively but its semantics (months is 0–11, total months = years×12 + months) are implicit. Agents may construct `Age` objects incorrectly (e.g., `{ years: 67, months: 15 }`).

**Spec:** Add to the "Types" section:
- `Age.months` is always in range `[0, 11]`.
- Use `ageToMonths(age)` / `monthsToAge(n)` from `~/domain/age` for arithmetic — never compute `age.years * 12 + age.months` inline.

---

### 6. No devcontainer automation

**Problem:** `.devcontainer/devcontainer.json` uses the 10 GB universal image with no `postCreateCommand`, no port forwarding, and no `automations.yaml`. Every new environment requires manual `pnpm install` and `pnpm dev`.

**Spec:** Update `.devcontainer/devcontainer.json` to:
- Add `"postCreateCommand": "pnpm install"` so dependencies install on environment creation.
- Add `"forwardPorts": [3000]` with `"portsAttributes": { "3000": { "label": "Dev server" } }`.
- Consider switching from the universal image to `mcr.microsoft.com/devcontainers/javascript-node:22` for faster startup.
- Add an `automations.yaml` with a `dev` service that runs `pnpm dev`.

---

### 7. No linting or formatting configuration

**Problem:** There is no ESLint, Prettier, or `@nuxt/eslint` config. Agents will produce code in varying styles (trailing commas, quote style, semicolons). The existing code uses no semicolons and single quotes — this is not enforced.

**Spec:** 
- Add `@nuxt/eslint` and configure it in `nuxt.config.ts` (Nuxt's recommended approach).
- Add a `pnpm lint` script to `package.json`.
- Document the lint command in AGENTS.md under "Development commands".
- Until linting is added, document the style convention explicitly: no semicolons, single quotes, 2-space indent.

---

### 8. No guidance on when to add tests

**Problem:** AGENTS.md says "every domain file with non-trivial logic must have a test file" but gives no guidance on what counts as non-trivial, and gives no guidance on component or store testing.

**Spec:** Clarify in AGENTS.md:
- "Non-trivial" means: any function with branching logic, financial arithmetic, or date math.
- `age.ts` currently has no test file — it should (edge cases: month boundary, leap year).
- Store tests are out of scope for now (require Nuxt test environment setup).
- Component tests are out of scope for now.

---

## What is wrong (issues in the codebase itself)

### W1. `annualBenefitEurocents` consistency assertion fails

In `annuity-domain.test.ts` line ~155:
```ts
expect(r.annualBenefitEurocents).toBe(r.monthlyBenefitEurocents * 12)
```
`annualBenefit` is computed as `Math.round(capital / factor)` and `monthlyBenefit` as `Math.round(annualBenefit / 12)`. Due to double rounding, `monthly * 12 ≠ annual` in general. This test will fail for certain inputs.

**Fix:** Either compute `annualBenefitEurocents = monthlyBenefitEurocents * 12` (monthly is primary), or change the assertion to `toBeCloseTo` with a tolerance of ±12 eurocents.

---

### W2. `retirement-projection.ts` — partner AOW double-counts

In `projectRetirementTimeline`, when `hasPartner` is true and the partner has reached AOW age, the code adds `pensionData.aow.samenwonend / 12` again (line ~80). But the primary person's AOW (`alleenstaand` vs `samenwonend`) is already selected based on `hasPartner`. The partner's own AOW benefit should not be added to the primary person's income stream — it belongs to the partner's separate budget.

**Fix:** Remove the partner AOW addition block, or document clearly that this is intentional (household income model). If intentional, add a comment and a test that asserts the expected household total.

---

### W3. `retirement-projection.ts` — `expenseStreams` uses `Math.abs` but amounts may be positive

`expenseStreams` are filtered as `type === 'expense'` streams. In `useTransactions` and the financial store, expense `monthlyAmount` values appear to be stored as negative numbers (e.g., `-2000`). The projection uses `Math.abs(s.monthlyAmount)` for the baseline, which works, but the test in `retirement-projection.test.ts` passes `-2000` and `-500` and expects `2500` — this is consistent. However, `IncomeStreamForm` or other entry points may store positive values for expenses. The sign convention is not documented.

**Fix:** Document in AGENTS.md and in `types/financial.ts` that `FinancialStream.monthlyAmount` for `type === 'expense'` is stored as a **negative number**. Enforce this in the form layer.

---

### W4. `package.json` has no `test` script

`vitest.config.ts` exists but `package.json` has no `"test"` script. Running `pnpm test` works because pnpm falls back to `vitest`, but this is implicit.

**Fix:** Add `"test": "vitest run"` and `"test:watch": "vitest"` to `package.json` scripts.

---

### W5. `package.json` `name` is `"t"`

The package name is a placeholder. This is cosmetic but will cause confusion in monorepo tooling or if the package is ever published.

**Fix:** Change to `"name": "pension-app"` or similar.

---

## Priority order for improvements

| Priority | Item | Effort |
|---|---|---|
| High | W1 — fix rounding assertion in annuity tests | 5 min |
| High | W4 — add `test` script to package.json | 2 min |
| High | Gap 6 — devcontainer automation (postCreate + port) | 15 min |
| Medium | W2 — clarify/fix partner AOW double-count | 30 min |
| Medium | Gap 2 — document pension JSON schema in AGENTS.md | 20 min |
| Medium | Gap 4 — document pages in AGENTS.md | 10 min |
| Medium | Gap 5 — document Age convention in AGENTS.md | 5 min |
| Medium | W3 — document expense sign convention | 10 min |
| Low | Gap 7 — add ESLint config | 45 min |
| Low | Gap 3 — document transaction XLS format | 10 min |
| Low | Gap 1 — add store dependency graph to AGENTS.md | 10 min |
| Low | Gap 8 — clarify test guidance | 5 min |
| Low | W5 — fix package name | 2 min |
