# Codex acceptance — W01 / Labor Timesheet lifecycle

Date: 2026-09-07
Decision: **ACCEPTED — 8/10 in the scoped labor-timesheet capability**

## Acceptance result

| Criterion | Executable evidence | Result |
| --- | --- | --- |
| W01-G01 UI wiring | `LaborTimesheetModal` saves header and governed lines, invokes Submit/Approve/Post/Reverse, refreshes from SQLite, and refuses lifecycle success outside Tauri. | PASS |
| W01-G02 lifecycle | Rust tests execute `Draft → Submitted → Approved → Posted → Reversed`; illegal Approve/Post transitions fail. | PASS |
| W01-G03 CRUD guard | Migration 72 uses a dedicated labor mutation guard; non-Draft headers and governed lines reject generic SQL mutation. | PASS |
| W01-G04 atomic audit | Lifecycle state, line totals, postings and audit share one transaction; forced late audit failure preserves Approved state and creates no cost fact. | PASS |
| W01-G05 immutable exactly-once | Posting/reversal use immutable INSERTs. Repeated lifecycle calls do not duplicate audit or cost, and a conflicting pre-existing cost fact is preserved while the post rolls back. | PASS |
| W01-G06 reversal governance | Reversal requires actor, reason and explicit reversal date, checks that date against locked/closed periods, references the original cost entry and offsets rather than deletes it. | PASS |
| W01-G07 scope integrity | Backend proves main contract, project/contract, activity/control-account, BOQ/control-account and cost-code/control-account scope; negative cross-scope tests execute in SQLite. | PASS |
| W01-G08 calendar/capacity | Canonical working days/exceptions and governed resource/calendar capacity are validated; total active hours for the worker and date are reconciled across timesheets. | PASS |
| W01-G09 reconciliation | Governed standard/overtime rates are sourced from Resource Master; 8×50 + 2×75 posts 550.00 and reversal returns the LaborTimesheet net to 0.00 without deletion. | PASS |
| W01-G10 executable evidence | Node labor suite 12/12; focused Rust labor suite 8/8; final full Node 230/230, production build PASS, full Rust 36/36, and staged diff check PASS. | PASS |

## Material repairs made by Codex

- Added Submit and strict transition semantics, maker/checker separation, and idempotent repeats.
- Replaced the shared supplier guard with a dedicated labor lifecycle guard and stronger SQL triggers.
- Removed mutable upsert behavior from posted/reversal cost facts.
- Added the missing BOQ link to posted Control Account cost facts.
- Bound every new line to the persisted timesheet ID instead of retaining an empty temporary ID.
- Restricted selection and backend acceptance to a main contract.
- Replaced hidden 1.5× overtime assumptions with explicit governed Resource Master rates.
- Added canonical calendar interpretation, daily capacity reconciliation, cross-scope rejection,
  locked reversal-date evidence, conflict rollback and ledger reconciliation tests.

## Independent review gate

The required local Ollama review ran against the four bounded W01 files and was saved at
`tmp/ollama-reviews/20260907-220115-W01_Labor_Timesheet_Acceptance.md`. It returned a
generic summary rather than the required PASS/RISK/FAIL structure, so its result is recorded
as **INCONCLUSIVE**, never as a false PASS. Executable evidence and Codex inspection are the
acceptance authority.

## Residual boundary

Application-wide role/permission administration is not invented inside W01. W01 enforces
non-empty authenticated actors and three-way maker/checker separation. Enterprise RBAC remains
the authority of the later collaboration/security scope and does not weaken the immutable local
workflow proven here.
