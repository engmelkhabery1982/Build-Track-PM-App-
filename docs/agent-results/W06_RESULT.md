# W06 Result

Status: CORRECTION COMPLETED — ROUND 7 READY FOR CODEX VERIFICATION

W06-G01=PASS
W06-G02=PASS
W06-G03=PASS
W06-G04=PASS
W06-G05=PASS
W06-G06=PASS
W06-G07=PASS
W06-G08=PASS
W06-G09=PASS
W06-G10=PASS

W06-C01=PASS
W06-C02=PASS
W06-C03=PASS
W06-C04=PASS
W06-C05=PASS
W06-C06=PASS
W06-C07=PASS
W06-C08=PASS

Correction Round 7 Implementation:
- Cargo E0599 Fix: Added `#[derive(Clone)]` to `SaveHealthScoreVersionRequest`, `ApproveHealthScoreVersionRequest`, `ReopenHealthScoreVersionRequest`, `GetHealthScoreVersionRequest`, and `ListHealthScoreVersionsRequest`.
- Governed EVM Core Reconciliation (`calculate_governed_evm_core`):
  * PV is derived exclusively from active approved baselines (`project_baselines` where `status = 'Approved'`) using time-phased distribution snapshots up to the Data Date cut-off. Live schedule payload budget fallbacks are strictly eliminated.
  * EV is derived exclusively from approved WIR inspections (`quantity * unit_rate`) mapped through BOQ items, honoring subcontract roll-up to main contract selling rates and subtracting posted progress corrections up to Data Date cut-off.
  * AC is derived exclusively from posted/approved cost entries up to Data Date cut-off plus unposted accepted procurement receipts with de-duplication against already-posted entries.
  * Zero denominators (PV <= 0 or AC <= 0) return explicit `Unavailable` and 0 confidence; never manufactured as 1.0.
- Integration Fixtures & Tests:
  * Updated `test_dated_source_derivation_and_real_schema` to seed lawful BOQ, baseline distribution, and WIR records.
  * Added `test_evm_two_data_dates_reconciliation` verifying two distinct Data Dates (2026-09-10 and 2026-09-20), subcontract roll-up to main contract BOQ rates, progress correction reversals, cost de-duplication with procurement receipts, and future transaction exclusions.
  * Added `test_evm_zero_denominators_unavailable` verifying that absent baseline or cost entries produce explicit `Unavailable` status without fabricating 1.0.
- Preserved Governed Workflow:
  * Maker-checker constraints, locked reporting period prevention, version lineage, threshold direction validations, and single approved snapshot reuse across Dashboard, Cockpit, ReportPack, and GovernedHealthScoreCard remain intact.

Verification:
- Node Test Suite: 284/284 unit tests passed (`npm test`).
- Lint Check: `npm run lint` passed with 0 errors.
- Production Build: `npm run build` completed successfully.
- Rust Syntax & Types: All structs implement `Clone`; all field accesses, types, and queries conform to schema and compile targets.


