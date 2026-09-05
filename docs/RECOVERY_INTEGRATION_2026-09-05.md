# Verified recovery and integration — 2026-09-05

## Decision

The remote enterprise prototype was not merged wholesale because it replaced the working Tauri/SQLite application with a mock React workspace. Only independently testable project-control logic was recovered and connected to the current local data model.

## Integrated capabilities

- Operational scope exception detection uses current BOQ, approved variations, schedule, approved WIR, cost and accepted receipt records.
- Material reconciliation compares accepted procurement quantities with certified installed quantities, including posted WIR corrections and subcontract-to-main BOQ mapping.
- Waste conclusions are withheld when the contractual allowance is missing or when receipt and BOQ units conflict.
- Earned Schedule derives `ES`, `SV(t)` and `SPI(t)` from the actual time-phased PV/EV series.
- Three-way schedule overlay now receives current schedule and approved baseline data; its demonstration records were removed.
- XER reconciliation now compares uploaded activities and relationships with the current local schedule and is explicitly read-only. Governed schedule import remains the only persistence path.
- Synthetic PVO, retention and cash-flow dashboard values were removed. Missing source data is shown as unavailable instead of being manufactured.

## Verification evidence

- JavaScript/TypeScript acceptance tests: 128 passed, 0 failed.
- Rust/Tauri tests: 21 passed, 0 failed.
- Production TypeScript and Vite build: passed.
- Local Ollama review reports are saved under `tmp/ollama-reviews/` (the broad UI review was non-conforming; the focused core and XER gates returned PASS).

## Cleanup boundary

- Removed 249 zero-byte malformed artifacts produced by a prior tool run (246 at the repository root and three in malformed subdirectories).
- Removed unused mock-only UI components and their unused PVO type.
- Removed an unused zero-byte PDF utility placeholder.
- No SQLite database, user data, backup, restore package or attachment was deleted.

## Known non-blocking item

The production bundle still reports a large JavaScript chunk warning. It does not fail the build, but route-level code splitting remains a future performance improvement.
