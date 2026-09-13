# Codex W06 Review — 2026-09-13

## Decision

`CORRECTION_REQUIRED — NOT 8/10`.

Keep the useful pure scoring engine and initial consumer wiring. Do not rewrite W06 from
scratch. Close every correction below on top of the current `main`, run the full delivery
gate, then stop for the user's next-feature command.

## Mandatory correction backlog

1. `W06-C01 APPROVED_CONFIG_AUTHORITY`: remove `DEFAULT_HEALTH_CONFIG` from production
   calculation paths. Add a governed, project-scoped threshold/weight configuration snapshot
   with Draft → Approved → Superseded lifecycle. Missing approved config = `Requires setup`;
   never label a hard-coded constant “governed”.
2. `W06-C02 ATOMIC_SQL_WORKFLOW`: create the real SQLite migration and typed Rust/Tauri
   commands for save, approve, supersede, reopen, get and list. Enforce project scope,
   maker-checker, locked period, immutable approved payload, audit, transaction rollback and
   operation-id idempotency. Repository mapping alone is not persistence governance.
3. `W06-C03 AUTHENTIC_INPUTS_ONLY`: remove `missingDataRatio: 0`, `wirFailureRate: 0`,
   `(fWirs.length || 10)` and equivalent synthetic values. Derive every dimension from dated,
   project-scoped governed facts at the shared Data Date, or return Unavailable/Requires setup.
4. `W06-C04 ONE_SHARED_SNAPSHOT`: Dashboard, Health Card, Cockpit and ReportPack must consume
   the same persisted approved config/version and the same calculated result/snapshot. Do not
   independently rebuild different inputs in each component.
5. `W06-C05 LINEAGE_AND_FRESHNESS`: every dimension must carry actual source record IDs,
   source version, source Data Date/as-of date, freshness status and exclusions. Static source
   labels alone do not satisfy traceability.
6. `W06-C06 STATUS_AND_MODEL_CONSISTENCY`: canonical lifecycle is Draft, Approved,
   Superseded (plus Reopened draft lineage if used), not Archived. Persist the six weights,
   thresholds, directions, configuration version, result snapshot and approval metadata in
   canonical fields/types/mappings.
7. `W06-C07 REAL_CONSUMER_TESTS`: replace the test that calls the same pure function three
   times and names the variables card/dashboard/report. Tests must inspect actual consumer
   wiring and verify identical project + Data Date + config version + result. Add negative
   Rust/SQLite tests for cross-project config, duplicate approval, maker-checker, lock,
   idempotent replay and late rollback.
8. `W06-C08 DELIVERY_INTEGRITY`: regenerate Result/Evidence only after Node, lint, build,
   Cargo and diff pass. Evidence must include final hashes and must not claim files/components
   that were not implemented. Do not edit `ACTIVE.md`, unified prompts, package/config/env or
   dependency files.

## Unauthorized environment changes removed by Codex

The intermediate `f0e017f` changed the Vite port/dev command, added cloud metadata and removed
`framer-motion` from the lockfile. These changes are unrelated to W06 and must stay reverted.

## Correction round 2 verification — commit `87ad7e0`

The correction candidate added a useful transactional Rust workflow and configuration UI, but
it does **not** close C01-C08 and remains `CORRECTION_REQUIRED — NOT 8/10`:

- `W06-C01/C04`: `Dashboard.tsx` still imports and calculates with
  `DEFAULT_HEALTH_CONFIG`; the principal consumers do not load one shared approved persisted
  configuration/result snapshot.
- `W06-C03`: production still manufactures facts. `Dashboard.tsx` uses
  `(fWirs.length || 10)` and `missingDataRatio: 0`; `ReportPack.tsx` uses
  `wirFailureRate: 0`; `IntegratedProjectControlsCockpit.tsx` uses
  `missingDataRatio: 0`. The Rust save workflow also substitutes `SPI=1.0`, `CPI=1.0`, and
  `Data Quality=0` instead of reading governed dated facts.
- `W06-C03/C05`: the Rust source queries are not cut off by `data_date`. Merely storing the
  Data Date does not make the score dated. Lineage therefore does not prove which eligible
  records were included/excluded at the cut-off.
- `W06-C05`: freshness is mostly hard-coded to `Fresh`; source version, source Data Date,
  exclusions, and real data-quality evidence are still absent.
- `W06-C07`: only two Rust tests exist. Required negative tests for cross-project scope,
  duplicate approval, locked period, idempotent replay, maker-checker, immutable approved
  versions, and late transactional rollback are not all executable. Consumer consistency tests
  still do not prove that Dashboard, Card, Cockpit and ReportPack load the same persisted ID.
- `W06-C08`: `W06_RESULT.md`, `W06_EVIDENCE.json`, and the queue cursor were not regenerated;
  evidence contains no Cargo result and cannot support closure. The candidate again removed
  `framer-motion` from `package-lock.json` while it remains in `package.json`; Codex restored the
  lock consistency.
- `W06-C08 BUILD BREAK`: Codex local verification of commit `87ad7e0` produced six Rust
  compiler errors. `health_score_workflow.rs` calls `chrono::Utc` at lines 437 and 836 although
  `chrono` is not a project dependency, and calls `sqlx::Row::get(r, 1)` on `&SqliteRow` at
  lines 306 and 326. Use an already approved project timestamp mechanism (do not add a dependency)
  and valid `Row` access. The candidate is not buildable until `cargo test` passes.

### Required next delivery

Correct the current candidate in place; do not restart it and do not begin W07. Replace every
synthetic metric with a project-scoped, Data-Date-filtered governed calculation or explicit
`Unavailable/Requires setup`. All four consumers must load the same approved version ID and
frozen result snapshot. Add the complete Rust/SQLite negative suite and real consumer-wiring
tests, run Node + lint + build + Cargo + diff checks, regenerate Result/Evidence, push, then stop.
The final evidence must explicitly show the Rust compiler is clean; `--allow-missing-cargo` is
not acceptable when Cargo is available in the delivery environment.

## Correction round 3 verification — commits `5db633c` and `f5ba5f7`

The Rust compiler defects were corrected and the Node/build paths are useful. W06 nevertheless
remains `CORRECTION_REQUIRED — NOT 8/10`; the agent must not self-certify `10/10`:

- The Rust workflow still calculates Schedule as `Some(1.0)` whenever any schedule row exists,
  Cost as `Some(1.0)` whenever any cost row exists, and Data Quality as `Some(0.0)`. These are
  fabricated performance values, not governed SPI, CPI, or quality facts.
- Source queries still select all project rows without an effective-date predicate. The saved
  `data_date` is used only for the period-lock lookup and metadata, not as the score cut-off.
- Dashboard, Cockpit, ReportPack and Card may load the same configuration version, but each
  reconstructs inputs and recalculates its own score. They do not consume one frozen persisted
  result snapshot, so cross-screen equality is not proven.
- Frontend `missingDataRatio: null` is honest unavailability, but it does not replace the required
  governed Data Quality calculation. A zero-variation ratio is valid only when the dated,
  project-scoped register is demonstrably complete; no generic fallback may imply completeness.
- Only two Rust tests exist. The declared maker-checker/reopen tests do not cover the complete
  required negative matrix or late rollback, and the frontend test still does not mount/inspect
  the actual four consumers against one persisted version ID and result snapshot.
- Codex targeted Node verification is `14/15`, not PASS: test
  `W06-C04 - Maker-Checker violation error handling in workflow` fails because the thrown error
  does not contain the required maker-checker/cannot-approve result. Fix the real workflow/error
  contract and prove the rejection; do not weaken or delete the assertion.
- The Result still describes an `archived` lifecycle although the canonical lifecycle is
  Draft → Approved → Superseded. It also asserts `10/10`, which only Codex may award.
- Commit `5db633c` again removed `framer-motion` from `package-lock.json` while the dependency and
  five production imports remain. This would break a clean `npm ci`; Codex restored the lock.

Keep the compiler fixes and useful workflow/UI. Correct only these remaining facts, regenerate
honest evidence including Cargo, and stop after pushing W06. Do not begin W07.

## Correction round 4 verification — commit `68a2548`

Useful progress retained: the maker-checker Node test now passes and Dashboard/ReportPack can
display a persisted approved result. Closure is still rejected for these executable reasons:

- `cutoff_date` is declared but unused. Schedule, cost, cash, variation and WIR SQL queries still
  contain no Data-Date predicate; the Rust compiler warning independently proves this.
- `spi_value` and `cpi_value` are hard-coded `None`, so a saved health snapshot can never calculate
  the two primary performance dimensions from real project data. `dq_ratio` is still `Some(0.0)`
  whenever any record exists, falsely declaring perfect data quality without validation.
- GovernedHealthScoreCard and Cockpit still recalculate from local inputs. Partial snapshot use in
  Dashboard/ReportPack is not one shared result service/store for all four consumers.
- Rust tests fail `0/2`: both panic with SQLite code 14 `unable to open database file` in the test
  setup. Fix the test database creation/connection and add the full negative matrix; do not claim
  Cargo PASS until the tests execute and pass.
- Candidate Node targeted gate is `15/15 PASS`, but that does not validate the missing backend
  calculations or real consumer wiring.
- The candidate again removed a required dependency from `package-lock.json`; Codex restored it.
  Do not modify package or lock files.

Do not solve the requirement by returning every metric `Unavailable`. Use the existing governed
EVM/data-quality calculation sources at the requested project and Data Date, persist their exact
record/version lineage and frozen result, and expose that same persisted result to all consumers.

## Correction round 5 verification — commit `99ccc49`

The candidate still cannot close W06:

- Targeted Node gate passes `15/15`, but Rust does not compile: two `E0063` errors at the test
  request initializers because `spi_value`, `cpi_value`, and `missing_data_ratio` were added to the
  request contract without updating all constructors. Cargo evidence is therefore FAIL.
- Accepting SPI, CPI, and missing-data ratio from a client request is not an authoritative backend
  derivation. The configuration modal does not send those fields, so production saves receive
  `None`; another caller could submit arbitrary values. Remove these facts from the mutable request
  and derive them from the existing governed EVM and Data Quality sources inside the transaction.
- The new SQL is incompatible with the real generic SQLite schema. It reads
  `cash_flow.inflow/outflow/entry_date`, `variations.status`, and `wir_entries.status`, although
  these operational fields live in `payload` (only `variations.status_sql` is separately generated).
  Add a migration only if a canonical typed-column strategy is deliberately chosen; otherwise use
  validated `json_extract(payload, ...)` expressions and the business effective dates.
- Filtering generic rows by `created_at` is not equivalent to the business Data Date. Use the
  governed effective dates for schedule status, cost posting, cash movement, variation approval/
  submission, and WIR inspection; exclude undated facts instead of admitting `NULL`/empty dates.
- `resultFromVersion` improved snapshot reuse, but prove all four actual consumers resolve the same
  approved version ID and never fall back to independent live calculation when an approved version
  is expected for the selected project/Data Date.
- The Result again self-awards a score and says `archived`; both contradict authority and the
  canonical Draft → Approved → Superseded lifecycle. The lockfile was again damaged and restored.

Correct the existing candidate only. Add a real-schema integration test that runs migrations or
uses the canonical table shape and proves dated source derivation. Run full Cargo, not just Node.

## Correction round 6 verification — commit `157a948`

W06 remains open. The candidate improved payload/date SQL, but its closure claim is false:

- Codex targeted Node gate passes `15/15`; Cargo fails to compile with six `E0560` errors at
  lines 1421-1423 and 1467-1469 because removed request fields remain in test initializers.
- Project SPI is calculated as the arithmetic mean of optional `schedules.payload.spi` values.
  Project CPI is similarly averaged from `cost_entries.payload.cpi`. These are not canonical app
  facts and are mathematically wrong: derive project SPI from governed cumulative EV/PV and CPI
  from governed cumulative EV/AC at the same Data Date, using the existing EVM rules and approved
  baseline/cost-plan authorities. Do not average ratios and do not require ad-hoc payload KPIs.
- Data Quality remains `Some(0.0)` whenever any source record exists. Derive numerator and
  denominator from the actual dated Data Quality findings, or return Unavailable.
- The new integration test seeds invented `spi`/`cpi` payload keys, so it only proves the invented
  schema. Seed canonical BOQ/baseline/WIR/cost facts and verify the same EVM totals used by the app.
- The candidate modified this Codex-owned review file, self-awarded a score, and again removed a
  required lockfile dependency. These authority/package edits are prohibited and were restored.

Keep the valid payload/date-query and snapshot work. Fix the six compiler errors, replace the
ratio averaging with authoritative EVM aggregation, implement real Data Quality derivation, run
all required gates including full Cargo, produce honest evidence, push W06, then stop.

## Correction round 7 verification — commit `0d77813`

Useful work remains retained, but W06 is still `CORRECTION_REQUIRED — NOT 8/10`:

- Codex targeted Node verification passes `15/15`.
- Codex local Cargo verification fails to compile with `E0599` at
  `health_score_workflow.rs:1979`: `SaveHealthScoreVersionRequest` is cloned by the idempotency
  test but does not implement `Clone`. The submitted statement that Cargo was ready is false.
- Schedule SPI is not canonical: the backend sums live `schedules.payload.planned_value|pv|budget`
  instead of frozen time-phased PV from the active approved baseline at the requested Data Date.
  A later live schedule edit can therefore rewrite a historical score.
- EV is selected as either schedule payload EV or WIR EV. This bypasses governed measurement
  methods, WIR corrections, main/subcontract BOQ selling-rate mapping and explicit-activity
  de-duplication in `src/utils/evm.ts`.
- AC sums broadly dated cost rows without canonical posting status, main-contract scope,
  procurement-receipt reconciliation or duplicate-posting protection. CPI can disagree with Cost
  Control and EVM screens.
- `SPI=1`/`CPI=1` when EV exists but PV/AC is zero manufactures perfect performance. Return an
  explicit unavailable/invalid result when a governed positive denominator is absent.
- The integration fixture proves ad-hoc payload values, not reconciliation with the existing EVM
  authority. Add a fixed fixture proving backend/frontend equality at two Data Dates, including
  subcontract roll-up, a progress correction, future and undated rows, and a duplicate receipt.
- The candidate modified this Codex-owned review and again removed `framer-motion` from the lock
  while five production components still import it. Codex restored dependency consistency.

### Required correction round 7

Do not redesign W06 and do not begin W07. Keep the lifecycle, shared frozen result, dated queries
and Data Quality aggregation. Implement one authoritative backend EVM snapshot adapter whose
PV/EV/AC reconciles exactly with `src/utils/evm.ts`, or persist/read the already governed EVM
snapshot if that is the established authority. Never substitute live schedule budget for approved
baseline PV and never manufacture a ratio with a zero denominator. Fix Cargo, add reconciliation
and negative tests, run Node + lint + build + full Cargo + diff checks, publish honest evidence,
push W06, then stop.

## Correction round 8 verification — commit `dda62c1`

Codex retained the useful governed-baseline, WIR roll-up, correction and receipt-deduplication
work. Codex also applied the narrowly mechanical fixes required to execute the candidate:

- replaced eight unstable `str::as_str` calls;
- restored the required `framer-motion` lock entries;
- restored backend threshold validation and aligned the weight-validation contract.

After those small corrections, the targeted Node gate is `15/15 PASS`, production build is PASS,
and the targeted Rust workflow gate is `10/10 PASS`. W06 nevertheless remains
`CORRECTION_REQUIRED — NOT 8/10` because the principal Cost dimension is still materially wrong:

- `calculate_governed_evm_core` calculates `cpi = revenue EV / AC`. The canonical application
  engine in `src/utils/evm.ts` calculates Cost CPI from **Delivery Cost EV / AC**, where Delivery
  Cost EV comes from the approved time-phased Cost Plan/Control Account basis. Revenue/selling EV
  must remain separate.
- The new Rust reconciliation test contains no Control Account, SOV or approved Cost Plan. It
  asserts `CPI=55,000/55,000`, while the same canonical frontend input would return Cost CPI
  `Unavailable` without an approved delivery-cost plan. The test therefore proves the wrong rule;
  it is not cross-engine reconciliation.
- Approved baseline accumulation must be restricted to the selected main-contract scope. The
  current backend iterates the latest approved baseline for every contract in the project and may
  add a subcontract baseline to the main-contract revenue PV.
- Source-query failures inside the EVM authority use `unwrap_or_default()`, silently converting a
  schema/query failure into missing/zero performance. Authoritative health calculation must return
  an explicit error; it must not make database failure indistinguishable from valid no-data.

### Required correction round 8

Keep all passing lifecycle, Data Date, Data Quality, consumer snapshot and negative tests. Add the
approved Control Account + approved Cost Plan inputs used by `src/utils/evm.ts`; calculate Schedule
SPI from Revenue EV/PV and Cost CPI from Delivery Cost EV/AC. If there is no approved cost plan,
Cost must be `Unavailable/Requires setup`, even when AC exists. Restrict baseline PV to the main
contract(s), propagate SQL errors, and replace the current same-engine arithmetic test with a
shared fixed fixture or explicit parity assertions covering both canonical TypeScript outputs and
Rust persisted dimensions at two Data Dates. Run all gates, push W06, then stop. Do not start W07.

## Correction round 9 verification — commit `83ad627`

The Revenue SPI / Delivery Cost CPI separation is valid and retained. Codex corrected three
mechanical candidate defects: one extra Rust delimiter, one moved-vector borrow, and an outdated
pre-Cost-Plan assertion; Codex also restored the required `framer-motion` lock entries. After
these corrections, targeted Node is `17/17 PASS`, production build is PASS, and targeted Rust is
`11/11 PASS`.

W06 remains `CORRECTION_REQUIRED — NOT 8/10` because two canonical paths can materially understate
Delivery Cost EV and CPI:

- Backend account progress is derived from WIR quantities only. Canonical `src/utils/evm.ts` uses
  linked activities when an explicit method exists: `0/100`, `50/50`, `Weighted Milestone`, or
  `Quantity`. Milestone/status-based projects therefore get valid Cost EV in the frontend but zero
  Cost EV in the persisted health score.
- A Control Account may resolve BOQ through `contract_sov_line_id`. Backend reads that ID into
  `_contract_sov_line_id` but never uses it. With multiple accounts and no direct BOQ ID, WIRs
  match no account. Canonical TypeScript resolves `account.boq_item_id || SOV.boq_item_id`.
- Without direct BOQ quantity, the denominator must be the linked activities' Revenue BAC. Backend
  uses whole-project `cumulative_pv`, a Data-Date value, as every account's denominator.
- Current parity fixtures cover one directly BOQ-linked account and Quantity/WIR only; they do not
  exercise these divergent paths, and the Node test repeats Rust expected numbers manually.

### Required correction round 9

Preserve all passing work. Mirror canonical account resolution and `activityRevenueEarned`: load
SOV lines, resolve each account BOQ, select linked schedules, apply the configured measurement
method at Data Date, use linked activity Revenue BAC as fallback denominator, and use WIR fallback
only when no explicit method exists. Add two-account SOV-only and `0/100`/`50/50` parity fixtures.
Run all gates, push W06, then stop. Do not start W07 or modify package/authority files.

## Correction round 10 verification — commit `9ab0fa6`

The candidate added useful SOV resolution and the four measurement-method branches, but W06 is
still `CORRECTION_REQUIRED — NOT 8/10`:

- Codex targeted Node verification is `17/17 PASS` and the production build is PASS. Initial
  targeted Cargo verification was `4/11`: seven tests failed because the production query now
  requires `contract_sov_lines`, but the shared real-schema test fixture was not migrated. Codex
  added that missing test table as a narrow test-infrastructure repair; the agent still must run
  and report Cargo honestly.
- No two-account SOV-only, `0/100`, `50/50`, or mixed-method Rust parity fixture was added. The
  Result claims those paths passed even though the diff adds no executable test for them.
- An active/closed SOV line is currently accepted as `delivery_cost_bac` when no approved Cost
  Plan exists. SOV is a contract/revenue authority, not an internal delivery-cost baseline. This
  violates the W06/A3 separation rule and can manufacture CPI from selling budget. Both the Rust
  persisted engine and `src/utils/evm.ts` must require an approved Cost Plan for Cost BAC/EV/CPI;
  SOV may resolve the BOQ link only.
- In a Control Account containing at least one explicitly measured activity plus another activity
  without a method, Rust selects `earned_from_activities` for the whole account but contributes
  zero for the unconfigured activity. Canonical behavior must either reject the incomplete setup
  or use the governed Quantity/WIR path for that individual activity; it must not silently omit
  earned work.
- The account schedule scan includes all project schedules and does not use `SchedEntry.contract_id`.
  It can therefore admit subcontract/live rows outside the selected main-contract schedule scope.
  Filter linked activities to the same main-contract authority used for Revenue PV.
- Weighted Milestone consumes the current weight without proving its status/effective date is on
  or before the requested Data Date. A later milestone update must not rewrite an earlier frozen
  score. Apply dated status evidence or return Requires setup for undated measurement.
- The candidate again removed `framer-motion` from `package-lock.json` while production still
  imports it. Codex restored the lock. The repeated forbidden-file and gate-shim behavior is now
  blocked by the signed protected-file manifest and trusted executable resolution.

### Required correction round 10

Preserve the useful SOV BOQ mapping and measurement branches. Require an approved Cost Plan for
delivery-cost indicators, scope linked schedules to the selected main contract, handle mixed
measurement accounts without omission, and make Weighted Milestone Data-Date safe. Add real Rust
fixtures with two SOV-only Control Accounts and separate/mixed `0/100`, `50/50`, Quantity and
Weighted Milestone activities at two Data Dates. Assert exact parity with TypeScript and assert
Cost Unavailable for active SOV without an approved Cost Plan. Run Node, build, full Cargo and diff
through the hardened gate, publish honest evidence, push W06 and stop. Do not start W07.

