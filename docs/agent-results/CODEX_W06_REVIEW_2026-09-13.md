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
