# Codex W05 Acceptance — 2026-09-13

## Decision

`CLOSED — 8/10` for the scoped Versioned Cash Forecast capability.

Accepted implementation head: `d77b8006fa1a5fba7a3abce07601c1e9cd9ebeb9`.

## Verified scope

- Exact Gregorian due-date arithmetic with invalid-date rejection.
- Source-specific approved payment terms for open supplier/PO forecast balances.
- Settled actual cash remains reportable without inventing irrelevant forecast terms.
- Missing/malformed types, dates, amounts and settlements are rejected instead of defaulted.
- Draft/Approved/Superseded/Reopened snapshots, maker-checker, idempotency and period locks.
- Actual/Forecast separation, settlement reconciliation, direction and source drill-down.

## Executed evidence

- `npm test`: 280 passed, 0 failed.
- `npm run lint`: passed.
- `npm run build`: passed (bundle-size warnings only).
- `cargo test --manifest-path src-tauri/Cargo.toml`: 62 passed, 0 failed.
- Targeted W05 Rust tests: 9 passed, 0 failed.
- `git diff --check`: passed.

## Codex correction

The agent candidate blocked a fully settled supplier actual when forecast payment terms were
absent. Codex limited payment-term authority to open forecast balances and added finite,
non-negative, over-settlement and governed-date validation. The agent's unauthorized rollback
of queue authority is not accepted and is restored separately.

This closes W05 only. W06 is open for execution only after an explicit user command; it does
not require another Codex acceptance/update before the agent starts.
