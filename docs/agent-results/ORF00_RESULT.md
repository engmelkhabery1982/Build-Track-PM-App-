# ORF00 — Release Truth and Version Unification

Date: 2026-09-16  
Owner: Codex  
Start head: `c5e3c9ee545b8322ee5c9f5247028e3706053d20`  
Branch: `codex/operational-reliability-freeze`  
Decision: `CLOSED — 8/10 (ORF00 scope)`  
Global release gate: `RED — ORF01 required`

## Outcome

One governed release candidate now combines the accepted cloud lineage with the proven local
commercial, cost-plan, estimate, import, report and supplier-AP Rust changes. The original dirty
working tree was not reset, rewritten or committed. Its seven-file state remains recoverable by a
binary patch and an immutable Git recovery ref.

ORF00 does **not** declare the application release-ready. The full Rust suite still exposes the
pre-existing deterministic claims-reversal SQLite lock. That defect is the first mandatory item of
ORF01 and remains an explicit red global gate.

## Recovery checkpoints

- Original local head: `9851cce615d6fd199d92a660bc04d0e860d7c7e1`
- Governed cloud/ORF00 start head: `c5e3c9ee545b8322ee5c9f5247028e3706053d20`
- Recovery ref: `refs/codex/recovery/orf00-pre-integration-20260916`
- Recovery object: `d58377b42acf41f4555101f863bfb938214ffab3`
- Binary patch: `F:\PM App\Project\tmp\orf00-recovery-20260916\local-seven-rust-files.patch`
- Patch SHA-256: `24AB64C7873B5B6E54F25140FCBF2B5D3C23115F0330E1784F30C27E015F54E9`
- Patch size: `362535` bytes

## Hunk decision matrix

| File | Decision | Evidence |
|---|---|---|
| `commercial_workflow.rs` | Keep | Cloud had no later edits; local 10/10 module tests pass after applying over cloud. |
| `cost_plan_versioning.rs` | Keep | Cloud had no later edits; local 2/2 module tests pass after applying over cloud. |
| `estimate_versioning.rs` | Keep | Cloud had no later edits; local 2/2 module tests pass after applying over cloud. |
| `import_batch.rs` | Keep | Cloud had no later edits; local 5/5 atomic import tests pass after applying over cloud. |
| `report_versioning.rs` | Keep | Cloud had no later edits; local 3/3 versioning tests pass after applying over cloud. |
| `supplier_ap.rs` | Keep | Cloud had no later edits; local 5/5 AP/PO/GRN tests pass after applying over cloud. |
| local `lib.rs` | Already upstream / Reject obsolete remainder | It contains no local-only top-level command symbol and omits 26 cloud commands from W03–W06. The cloud file was retained; no whole-file overwrite occurred. |

All kept source changes were transferred as Git hunks from the preserved local diff, never by
copying a whole file from one worktree to another.

## Registration and migration reconciliation

- Tauri handler registers 58 desktop commands, including all current Claims, Certificate, Cash
  Forecast and Health Score commands.
- Command registration test was extended to cover the previously omitted modern commands.
- A duplicated SQLite migration version `68` was found. `add_data_quality_tables` was the later
  insertion and was moved to version `79`, after the existing version `78`.
- Migration registration now contains 77 unique versions, in strictly ascending declaration order,
  with maximum version `79`.
- A permanent test rejects duplicate or out-of-order migration versions.

## Gate results

| Gate | Result |
|---|---|
| ORF00-G01 inventory | PASS |
| ORF00-G02 preserve seven local candidates | PASS |
| ORF00-G03 classify each candidate | PASS |
| ORF00-G04 clean governed release branch | PASS |
| ORF00-G05 atomic hunk transfer | PASS |
| ORF00-G06 migration/wrapper/command reconciliation | PASS |
| ORF00-G07 user DB and secrets untouched | PASS |
| ORF00-G08 honest test evidence | PASS; global Cargo gate remains RED and is not hidden |
| ORF00-G09 recovery refs/manifests | PASS |
| ORF00-G10 single candidate ready for ORF01 | PASS after checkpoint commit |

## Test evidence

- `npm test`: `291 passed / 0 failed`
- `npm run lint`: PASS
- `npm run build`: PASS
- `node --test tests/tauri-command-registration.test.mjs`: `3 passed / 0 failed`
- Kept Rust module tests: `27 passed / 0 failed`
- Full `cargo test`: `72 passed / 1 failed`
- Remaining failure:
  `claims_workflow::tests::reversal_respects_period_lock_and_preserves_variation_history`
- Failure text: retry after locked-period rejection cannot enter the claims mutation guard because
  SQLite remains locked.
- `git diff --check`: PASS

## Runtime artifacts inventoried

- Frontend package version: `1.0.0`
- Tauri/Cargo version: `0.1.0`
- SQLite source schema ceiling: migration `79`
- Existing NSIS installer (not rebuilt in ORF00):
  `BuildTrack_0.1.0_x64-setup.exe`, SHA-256
  `5D3E9AB149186B785CDA4AF74CA1EDFD01441A73A4211893AABE1EEFCD2F2161`
- Existing MSI (not rebuilt in ORF00):
  `BuildTrack_0.1.0_x64_en-US.msi`, SHA-256
  `6DA7549769287228BB1FB054150CFABA51B68B7041381D6A526C4C75253D3C9F`

No installed application database, Supabase project, environment secret, backup or user record was
opened or modified during ORF00.

## Next gate

ORF01 must explicitly roll back failed claims transactions and prove immediate retry, isolated and
full-suite execution, before the global Cargo/release gate can become green. ORF01 must not begin
without a new user command.
