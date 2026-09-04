# Local Ollama Review

- Phase: Feature 09 - Certificate Balances
- Model: qwen2.5-coder:7b
- Files: src-tauri\src\commercial_workflow.rs, src-tauri\src\lib.rs, src\App.tsx, src\data\dataQuality.ts, src\data\governanceRules.ts, src\utils\commercialControl.ts, tests\phase1-commercial.test.mjs, tests\financial-ledger-migration.test.mjs

The provided code is a series of JavaScript tests using the `assert` and `c[2D[K
`child_process` modules to validate SQL migrations for a database schema. T[1D[K
The tests are written to ensure that specific SQL migrations have been impl[4D[K
implemented correctly. Here's a breakdown of what each test does:

1. **Migration 25 Validation**:
   - The test reads the Rust source code from `lib.rs` using the `readFileS[10D[K
`readFileSync` function.
   - It extracts the SQL migration for version 25 using a regular expressio[9D[K
expression.
   - It creates an in-memory SQLite database, applies the migration, and at[2D[K
attempts to insert a record that should fail due to a unique constraint.
   - The test uses Python to execute SQL commands that simulate the migrati[7D[K
migration and check the behavior of the database.

2. **Migration 26 Validation**:
   - Similar to the previous test, it reads the Rust source code and extrac[6D[K
extracts the SQL migration for version 26.
   - It applies the migration to an in-memory SQLite database and attempts [K
to insert duplicate records for vendor invoices and payments.
   - It uses Python to simulate the migration and ensure that the unique co[2D[K
constraints are enforced.

3. **Migration 32 Validation**:
   - This test focuses on purchase-order governance.
   - It reads the Rust source code and extracts the SQL migration for versi[5D[K
version 32.
   - It applies the migration to an in-memory SQLite database and attempts [K
to directly change the status of a procurement order and a procurement rece[4D[K
receipt.
   - It uses Python to simulate the migration and ensure that the direct ch[2D[K
changes are rejected, and that changes can only be made through a governed [K
operation.

4. **Migration 33 Validation**:
   - This test checks the behavior of procurement order cancellation.
   - It reads the Rust source code and extracts the SQL migration for versi[5D[K
version 33.
   - It applies the migration to an in-memory SQLite database and attempts [K
to directly cancel a procurement order.
   - It uses Python to simulate the migration and ensure that direct cancel[6D[K
cancellation is rejected, and that cancellation must be governed.

5. **Migration 34 Validation**:
   - This test ensures that certain financial columns are exposed in paymen[6D[K
payment certificates.
   - It reads the Rust source code and extracts the SQL migration for versi[5D[K
version 34.
   - It applies the migration to an in-memory SQLite database and inserts a[1D[K
a record with financial data.
   - It uses Python to simulate the migration and check that the financial [K
columns are correctly exposed.

Each test uses the `execFileSync` function from the `child_process` module [K
to execute Python code that interacts with the SQLite database. The Python [K
code is embedded within the JavaScript test and is executed with the migrat[6D[K
migration SQL passed as input.

Overall, these tests are designed to ensure that the SQL migrations are cor[3D[K
correctly implemented and that the database schema behaves as expected afte[4D[K
after the migrations are applied. They use a combination of Rust for readin[6D[K
reading the source code and Python for simulating database operations and a[1D[K
assertions.

[1G⠙ [K[1G⠙ [K[1G⠹ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠧ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠴ [K[1G⠧ [K[1G⠧ [K[1G⠇ [K[1G⠋ [K[1G⠋ [K[1G⠹ [K[1G⠸ [K[1G⠸ [K[1G⠴ [K[1G⠴ [K[1G⠧ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠙ [K[1G⠙ [K[1G⠸ [K[1G⠸ [K[1G⠼ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠸ [K[1G⠼ [K[1G⠼ [K[1G⠦ [K[1G⠧ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠙ [K[1G⠙ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠧ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠸ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠋ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠦ [K[1G⠧ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠙ [K[1G⠹ [K[1G⠼ [K[1G⠼ [K[1G⠦ [K[1G⠧ [K[1G⠧ [K[1G⠏ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠼ [K[1G⠼ [K[1G⠴ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠋ [K[1G⠹ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠇ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠴ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠙ [K[1G⠹ [K[1G⠹ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠋ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠇ [K[1G⠇ [K[1G⠋ [K[1G⠙ [K[1G⠙ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠦ [K[1G⠧ [K[1G⠏ [K[1G⠏ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠴ [K[1G⠧ [K[1G⠧ [K[1G⠏ [K[1G⠏ [K[1G⠋ [K[1G⠹ [K[1G⠹ [K[1G⠼ [K[1G⠴ [K[1G⠴ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠸ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠧ [K[1G⠏ [K[1G⠋ [K[1G⠋ [K[1G⠹ [K[1G⠹ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠧ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠸ [K[1G⠴ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠇ [K[1G⠋ [K[1G⠋ [K[1G⠹ [K[1G⠹ [K[1G⠼ [K[1G⠼ [K[1G⠴ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠴ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠸ [K[1G⠴ [K[1G⠴ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠼ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠇ [K[1G⠋ [K[1G⠋ [K[1G⠹ [K[1G⠹ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠇ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠸ [K[1G⠼ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠋ [K[1G⠹ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠦ [K[1G⠦ [K[1G⠧ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠹ [K[1G⠼ [K[1G⠼ [K[1G⠴ [K[1G⠧ [K[1G⠇ [K[1G⠇ [K[1G⠋ [K[1G⠙ [K[1G⠙ [K[1G⠹ [K[1G⠼ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠋ [K[1G⠙ [K[1G⠸ [K[1G⠸ [K[1G⠴ [K[1G⠦ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠼ [K[1G⠼ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠙ [K[1G⠹ [K[1G⠹ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠙ [K[1G⠹ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠦ [K[1G⠧ [K[1G⠧ [K[1G⠏ [K[1G⠏ [K[1G⠋ [K[1G⠹ [K[1G⠹ [K[1G⠼ [K[1G⠼ [K[1G⠴ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠋ [K[1G⠹ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠙ [K[1G⠙ [K[1G⠸ [K[1G⠼ [K[1G⠼ [K[1G⠦ [K[1G⠧ [K[1G⠧ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠇ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠼ [K[1G⠴ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠋ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠧ [K[1G⠇ [K[1G⠋ [K[1G⠙ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠦ [K[1G⠧ [K[1G⠧ [K[1G⠏ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠸ [K[1G⠼ [K[1G⠼ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠋ [K[1G⠹ [K[1G⠹ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠇ [K[1G⠋ [K[1G⠋ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠇ [K[1G⠇ [K[1G⠏ [K[1G⠙ [K[1G⠙ [K[1G⠹ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠦ [K[1G⠧ [K[1G⠏ [K[1G⠋ [K[1G⠋ [K[1G⠹ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠦ [K[1G⠧ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠇ [K[1G⠏ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠧ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠦ [K[1G⠧ [K[1G⠧ [K[1G⠏ [K[1G⠏ [K[1G⠙ [K[1G⠙ [K[1G⠸ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠧ [K[1G⠧ [K[1G⠏ [K[1G⠋ [K[1G⠋ [K[1G⠙ [K[1G⠸ [K[1G⠼ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠇ [K[1G⠇ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠹ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠇ [K[1G⠋ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠹ [K[1G⠸ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠸ [K[1G⠼ [K[1G⠼ [K[1G⠴ [K[1G⠧ [K[1G⠧ [K[1G⠏ [K[1G⠏ [K[1G⠋ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G[K[2K[1G
