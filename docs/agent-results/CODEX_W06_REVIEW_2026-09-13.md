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
