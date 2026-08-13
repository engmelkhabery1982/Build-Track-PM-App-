# BuildTrack - Review Checkpoint (2026-08-13)

## Scope

Read-only review of the current local SQLite database, source build, and desktop runtime checks. No application data was changed during this review.

## Passed checks

- SQLite `PRAGMA integrity_check`: `ok`.
- Required stored links passed for contracts, BOQ headers/items, variations, schedules, inspection requests, invoices, cost entries, procurement, labour, and equipment.
- Main/subcontract hierarchy passed for records explicitly marked with `Contract Role`.
- Main-contract/project association, duplicate contract-code check, and WIR date-window check passed for the validated records.
- Front-end production build (`npm run build`) passed.
- Tauri/Rust compile check (`cargo check`) passed.
- Desktop package was built successfully.

## Current local data inventory

| Area | Records |
|---|---:|
| Projects | 6 |
| Contracts | 9 |
| BOQ headers / items | 9 / 20 |
| Variations | 12 |
| Schedule rows | 26 |
| Inspection requests | 18 |
| Client invoices / tracking | 4 / 1 |
| Subcontract invoices / tracking | 6 / 3 |
| Cost entries / cost control | 34 / 14 |
| Procurement / labour / equipment | 6 / 1 / 1 |
| Cash flow | 2 |

## Findings requiring user-data review

1. Seven older demonstration contracts have an empty `Contract Role` value. Their IDs and parent links are present, but they cannot be automatically classified as Main Contract or Subcontract until the role is filled. This review did not modify them.
2. The project contains no automated UI/end-to-end test suite yet. Build and runtime checks pass, but the acceptance checklist in the user manual must be run in the installed desktop application before final sign-off.

## Acceptance review order

1. Contracts and variations.
2. BOQ headers and BOQ items.
3. Schedule summaries versus underlying activities.
4. Inspection requests and progress.
5. Invoices and invoice tracking.
6. Cost entries, cost control, procurement, labour, equipment, and cash flow.
7. Portfolio and PMO Command Center using the same project/date context.
8. Excel-grid interaction: edit, formula, paste, fill-down, selection, and viewport preservation.

## Recovery point

The matching database backup and metadata are stored in the generated `_Checkpoints/Review_Checkpoint_*` folder. The source code revision for this checkpoint is recorded in its manifest.
