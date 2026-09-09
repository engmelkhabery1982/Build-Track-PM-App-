# W03 Claims / PVO — Codex Acceptance

Date: 2026-09-09

## Decision

Accepted as a complete governed W03 increment at the scoped 8/10 SAP-comparability gate.

The agent delivery was not accepted unchanged. Codex removed the forbidden root metadata file and corrected the authoritative backend, UI lifecycle, persisted line handling, scope validation, notice-period treatment, zero-value semantics, conversion idempotency, and non-destructive reversal behavior.

## Gate result

- W03-G01 atomic persisted claim header and real claim lines: PASS
- W03-G02 canonical lifecycle and field locking: PASS
- W03-G03 contractual notice-period validation without assumed defaults: PASS
- W03-G04 governed project/contract and optional source-link scope: PASS
- W03-G05 maker-checker assessment and approval: PASS
- W03-G06 explicit zero values and authoritative derived totals: PASS
- W03-G07 approved claim to draft variation/PVO conversion: PASS
- W03-G08 persistent idempotency and duplicate prevention: PASS
- W03-G09 non-destructive, period-lock-aware reversal: PASS
- W03-G10 executable regression evidence: PASS

## Verification evidence

- Rust claims workflow tests: 5 passed, 0 failed.
- Full Node test suite: 243 passed, 0 failed.
- TypeScript and production Vite build: passed.
- `git diff --check`: passed.
- Local Ollama review gate: attempted but timed out; recorded as inconclusive and not represented as a pass.

## Deferred cross-cutting limitations

These do not invalidate W03, but belong to later platform-wide gates:

- Command-side role/approval-limit enforcement remains dependent on the future authoritative RBAC gate; W03 enforces maker-checker segregation now.
- A reversed conversion remains auditable and cannot silently create another variation. A future UX refinement may expose a dedicated governed re-conversion policy rather than weakening idempotency.
