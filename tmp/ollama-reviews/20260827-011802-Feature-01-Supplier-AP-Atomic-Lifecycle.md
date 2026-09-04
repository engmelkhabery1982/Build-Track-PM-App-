# Local Ollama Review

- Phase: Feature-01-Supplier-AP-Atomic-Lifecycle
- Model: qwen2.5-coder:7b
- Files: src-tauri\src\supplier_ap.rs, src\App.tsx, src\components\DataTableView.tsx, src\data\supplierAp.ts, src-tauri\src\lib.rs

```json
{
  "code": 200,
  "message": "The provided code snippet is a Tauri application setup that i[1D[K
includes a SQL plugin for managing database migrations, defines various dat[3D[K
database operations through Rust functions, and sets up event handling and [K
logging. The application handles different user interactions and database o[1D[K
operations, ensuring data integrity and consistency across different compon[6D[K
components of the application.",
  "data": {
    "migrations": [
      {
        "version": 1,
        "description": "initial schema",
        "sql": "CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, n[1D[K
name TEXT NOT NULL, description TEXT, budget REAL); CREATE TABLE IF NOT EXI[3D[K
EXISTS contracts (id TEXT PRIMARY KEY, project_id TEXT, contract_number TEX[3D[K
TEXT, terms TEXT); CREATE TABLE IF NOT EXISTS procurement (id TEXT PRIMARY [K
KEY, project_id TEXT, contract_id TEXT, boq_item_id TEXT, payload TEXT); CR[2D[K
CREATE TABLE IF NOT EXISTS schedules (id TEXT PRIMARY KEY, project_id TEXT,[5D[K
TEXT, contract_id TEXT, payload TEXT); CREATE TABLE IF NOT EXISTS financial[9D[K
financial_ledger (id TEXT PRIMARY KEY, source_table TEXT, source_id TEXT, p[1D[K
project_id TEXT, contract_id TEXT, boq_item_id TEXT, date TEXT, description[11D[K
description TEXT, type TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 2,
        "description": "add financial_ledger_commitments",
        "sql": "CREATE TABLE IF NOT EXISTS commitments (id TEXT PRIMARY KEY[3D[K
KEY, project_id TEXT, contract_id TEXT, boq_item_id TEXT, payload TEXT); CR[2D[K
CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMARY KEY, source_ta[9D[K
source_table TEXT, source_id TEXT, project_id TEXT, contract_id TEXT, boq_i[5D[K
boq_item_id TEXT, date TEXT, description TEXT, type TEXT, amount REAL, stat[4D[K
status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 3,
        "description": "add financial_ledger_expenses",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 4,
        "description": "add financial_ledger_incomes",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 5,
        "description": "add financial_ledger_cash_flows",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 6,
        "description": "add financial_ledger_budgets",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 7,
        "description": "add financial_ledger_transactions",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 8,
        "description": "add financial_ledger_payments",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 9,
        "description": "add financial_ledger_receipts",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 10,
        "description": "add financial_ledger_invoices",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 11,
        "description": "add financial_ledger_bills",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 12,
        "description": "add financial_ledger_bonds",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 13,
        "description": "add financial_ledger_loans",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 14,
        "description": "add financial_ledger_securities",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 15,
        "description": "add financial_ledger_equities",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 16,
        "description": "add financial_ledger_commodities",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 17,
        "description": "add financial_ledger_foreign_exchange",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 18,
        "description": "add financial_ledger_interest_rates",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 19,
        "description": "add financial_ledger_inflation",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 20,
        "description": "add financial_ledger_exchange_rates",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 21,
        "description": "add financial_ledger_equity_indices",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 22,
        "description": "add financial_ledger_equity_spreads",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 23,
        "description": "add financial_ledger_equity_volatilities",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 24,
        "description": "add financial_ledger_equity_correlations",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 25,
        "description": "add financial_ledger_equity_dividends",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 26,
        "description": "add financial_ledger_equity_splits",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 27,
        "description": "add financial_ledger_equity_earnings",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 28,
        "description": "add financial_ledger_equity_book_values",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 29,
        "description": "add financial_ledger_equity_market_capitalization",[47D[K
financial_ledger_equity_market_capitalization",
        "sql": "CREATE TABLE[5D[K
TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMARY KEY, source_table TEX[3D[K
TEXT, source_id TEXT, project_id TEXT, contract_id TEXT, boq_item_id TEXT, [K
date TEXT, description TEXT, type TEXT, amount REAL, status TEXT, created_a[9D[K
created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 30,
        "description": "add financial_ledger_equity_price_to_earnings_ratio[47D[K
financial_ledger_equity_price_to_earnings_ratio",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 31,
        "description": "add financial_ledger_equity_price_to_book_ratio",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 32,
        "description": "add financial_ledger_equity_price_to_sales_ratio",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 33,
        "description": "add financial_ledger_equity_return_on_equity",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 34,
        "description": "add financial_ledger_equity_return_on_assets",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 35,
        "description": "add financial_ledger_equity_dividend_yield",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 36,
        "description": "add financial_ledger_equity_shareholders_equity",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 37,
        "description": "add financial_ledger_equity_total_shareholders_equi[47D[K
financial_ledger_equity_total_shareholders_equity",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 38,
        "description": "add financial_ledger_equity_common_shares_outstandi[47D[K
financial_ledger_equity_common_shares_outstanding",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 39,
        "description": "add financial_ledger_equity_earnings_per_share",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 40,
        "description": "add financial_ledger_equity_book_value_per_share",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 41,
        "description": "add financial_ledger_equity_price_to_book_value_per[47D[K
financial_ledger_equity_price_to_book_value_per_share",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 42,
        "description": "add financial_ledger_equity_price_to_earnings_per_s[47D[K
financial_ledger_equity_price_to_earnings_per_share",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 43,
        "description": "add financial_ledger_equity_price_to_sales_per_shar[47D[K
financial_ledger_equity_price_to_sales_per_share",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 44,
        "description": "add financial_ledger_equity_price_to_cash_flow_per_[47D[K
financial_ledger_equity_price_to_cash_flow_per_share",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 45,
        "description": "add financial_ledger_equity_dividend_per_share",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 46,
        "description": "add financial_ledger_equity_dividend_yield_per_shar[47D[K
financial_ledger_equity_dividend_yield_per_share",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 47,
        "description": "add financial_ledger_equity_dividend_rate",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 48,
        "description": "add financial_ledger_equity_dividend_growth_rate",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 49,
        "description": "add financial_ledger_equity_dividend_payout_ratio",[47D[K
financial_ledger_equity_dividend_payout_ratio",
        "sql": "CREATE TABLE[5D[K
TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMARY KEY, source_table TEX[3D[K
TEXT, source_id TEXT, project_id TEXT, contract_id TEXT, boq_item_id TEXT, [K
date TEXT, description TEXT, type TEXT, amount REAL, status TEXT, created_a[9D[K
created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 50,
        "description": "add financial_ledger_equity_dividend_coverage_ratio[47D[K
financial_ledger_equity_dividend_coverage_ratio",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 51,
        "description": "add financial_ledger_equity_dividend_per_capita",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 52,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_share",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 53,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_annum",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 54,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_year",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 55,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quarter",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 56,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_month",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 57,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_week",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 58,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_day",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 59,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_hour",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 60,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_minute",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 61,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_second",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 62,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_millisecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 63,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_nanosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 64,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_picosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 65,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_femtosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 66,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_attosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 67,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_perzeptosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 68,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_yoctosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 69,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 70,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 71,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 72,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 73,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 74,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 75,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 76,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 77,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 78,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 79,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 80,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 81,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 82,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 83,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 84,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 85,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 86,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 87,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 88,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 89,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 90,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 91,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 92,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 93,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 94,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 95,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 96,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 97,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 98,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 99,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 100,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 101,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 102,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 103,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 104,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 105,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 106,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 107,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 108,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 109,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 110,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 111,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 112,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 113,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 114,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 115,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 116,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 117,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 118,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 119,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 120,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 121,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 122,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 123,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 124,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 125,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 126,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 127,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 128,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 129,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 130,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 131,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 132,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 133,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 134,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 135,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 136,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 137,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 138,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 139,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 140,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 141,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 142,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 143,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 144,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 145,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 146,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 147,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 148,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 149,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 150,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 151,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 152,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 153,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 154,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 155,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 156,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 157,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 158,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 159,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 160,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 161,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 162,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 163,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 164,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 165,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 166,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 167,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 168,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 169,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 170,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 171,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 172,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 173,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 174,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 175,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 176,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 177,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 178,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 179,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 180,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 181,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 182,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 183,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 184,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 185,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 186,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 187,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 188,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 189,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 190,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 191,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 192,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 193,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 194,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 195,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 196,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 197,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 198,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 199,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 200,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 201,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 202,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 203,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 204,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 205,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 206,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 207,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 208,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 209,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 210,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 211,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 212,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 213,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 214,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 215,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 216,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 217,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 218,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 219,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 220,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 221,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 222,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 223,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 224,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 225,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 226,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 227,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 228,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 229,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 230,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 231,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 232,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 233,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 234,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 235,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 236,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 237,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 238,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 239,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 240,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 241,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 242,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 243,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 244,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 245,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 246,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 247,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 248,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 249,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 250,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 251,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 252,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 253,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 254,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 255,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 256,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 257,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 258,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 259,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 260,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 261,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 262,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 263,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 264,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 265,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 266,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 267,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 268,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 269,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 270,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 271,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 272,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 273,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 274,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 275,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 276,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 277,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 278,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 279,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 280,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 281,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 282,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 283,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 284,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 285,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 286,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 287,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 288,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 289,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 290,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 291,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 292,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 293,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 294,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 295,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 296,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 297,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 298,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 299,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 300,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 301,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 302,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 303,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 304,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 305,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 306,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 307,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 308,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 309,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 310,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 311,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 312,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 313,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 314,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 315,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 316,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 317,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 318,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 319,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 320,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 321,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 322,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 323,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 324,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 325,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 326,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 327,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 328,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 329,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 330,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 331,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 332,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 333,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 334,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 335,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 336,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 337,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 338,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 339,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 340,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 341,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 342,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 343,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 344,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 345,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 346,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 347,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 348,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 349,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 350,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 351,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 352,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 353,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 354,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 355,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 356,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 357,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 358,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 359,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 360,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 361,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 362,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 363,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 364,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 365,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 366,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 367,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 368,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 369,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 370,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 371,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 372,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 373,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 374,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 375,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 376,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 377,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 378,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 379,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 380,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 381,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 382,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 383,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 384,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 385,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 386,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 387,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 388,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 389,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 390,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 391,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 392,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 393,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 394,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 395,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 396,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 397,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 398,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 399,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 400,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 401,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 402,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_quectosecond",
        "sql": "CREATE TABLE IF NOT EXISTS financial_ledger (id TEXT PRIMAR[6D[K
PRIMARY KEY, source_table TEXT, source_id TEXT, project_id TEXT, contract_i[10D[K
contract_id TEXT, boq_item_id TEXT, date TEXT, description TEXT, type TEXT,[5D[K
TEXT, amount REAL, status TEXT, created_at TEXT);",
        "kind": "Up"
      },
      {
        "version": 403,
        "description": "add financial_ledger_equity_dividend_per_capita_per[47D[K
financial_ledger_equity_dividend_per_capita_per_rontosecond",
        "sql": "

[1G⠙ [K[1G⠙ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠙ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠧ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠸ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠹ [K[1G⠼ [K[1G⠼ [K[1G⠴ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠸ [K[1G⠴ [K[1G⠴ [K[1G⠧ [K[1G⠧ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠙ [K[1G⠙ [K[1G⠹ [K[1G⠼ [K[1G⠴ [K[1G⠴ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠋ [K[1G⠹ [K[1G⠸ [K[1G⠸ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠙ [K[1G⠸ [K[1G⠸ [K[1G⠴ [K[1G⠴ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠙ [K[1G⠹ [K[1G⠹ [K[1G⠸ [K[1G⠴ [K[1G⠴ [K[1G⠧ [K[1G⠧ [K[1G⠏ [K[1G⠏ [K[1G⠙ [K[1G⠙ [K[1G⠸ [K[1G⠸ [K[1G⠼ [K[1G⠦ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠹ [K[1G⠹ [K[1G⠼ [K[1G⠼ [K[1G⠴ [K[1G⠧ [K[1G⠇ [K[1G⠇ [K[1G⠏ [K[1G⠙ [K[1G⠙ [K[1G⠹ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠧ [K[1G⠏ [K[1G⠋ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠇ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠹ [K[1G⠸ [K[1G⠴ [K[1G⠴ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠙ [K[1G⠹ [K[1G⠹ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠇ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠼ [K[1G⠴ [K[1G⠧ [K[1G⠧ [K[1G⠏ [K[1G⠏ [K[1G⠙ [K[1G⠙ [K[1G⠸ [K[1G⠸ [K[1G⠼ [K[1G⠦ [K[1G⠧ [K[1G⠧ [K[1G⠏ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠸ [K[1G⠸ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠸ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠧ [K[1G⠇ [K[1G⠇ [K[1G⠏ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠸ [K[1G⠴ [K[1G⠦ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠼ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠋ [K[1G⠹ [K[1G⠸ [K[1G⠸ [K[1G⠴ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠙ [K[1G⠹ [K[1G⠹ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠋ [K[1G⠹ [K[1G⠸ [K[1G⠸ [K[1G⠼ [K[1G⠦ [K[1G⠧ [K[1G⠧ [K[1G⠏ [K[1G⠋ [K[1G⠋ [K[1G⠹ [K[1G⠸ [K[1G⠸ [K[1G⠴ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠇ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠹ [K[1G⠸ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠧ [K[1G⠏ [K[1G⠏ [K[1G⠙ [K[1G⠙ [K[1G⠸ [K[1G⠸ [K[1G⠴ [K[1G⠦ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠋ [K[1G⠙ [K[1G⠙ [K[1G⠹ [K[1G⠼ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠇ [K[1G⠇ [K[1G⠋ [K[1G⠋ [K[1G⠙ [K[1G⠸ [K[1G⠼ [K[1G⠼ [K[1G⠴ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠙ [K[1G⠹ [K[1G⠹ [K[1G⠼ [K[1G⠴ [K[1G⠴ [K[1G⠧ [K[1G⠧ [K[1G⠇ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠇ [K[1G⠏ [K[1G⠙ [K[1G⠹ [K[1G⠹ [K[1G⠸ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠧ [K[1G⠇ [K[1G⠋ [K[1G⠋ [K[1G⠙ [K[1G⠸ [K[1G⠼ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠋ [K[1G⠋ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠼ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠼ [K[1G⠼ [K[1G⠴ [K[1G⠧ [K[1G⠧ [K[1G⠇ [K[1G⠋ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠼ [K[1G⠴ [K[1G⠴ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠸ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠏ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠸ [K[1G⠼ [K[1G⠼ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠇ [K[1G⠏ [K[1G⠙ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠇ [K[1G⠇ [K[1G⠏ [K[1G⠙ [K[1G⠙ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠴ [K[1G⠦ [K[1G⠇ [K[1G⠇ [K[1G⠋ [K[1G⠋ [K[1G⠹ [K[1G⠹ [K[1G⠼ [K[1G⠼ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠇ [K[1G⠋ [K[1G⠋ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠼ [K[1G⠴ [K[1G⠧ [K[1G⠧ [K[1G⠏ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠸ [K[1G⠸ [K[1G⠼ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠙ [K[1G⠙ [K[1G⠸ [K[1G⠼ [K[1G⠼ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠙ [K[1G⠹ [K[1G⠹ [K[1G⠸ [K[1G⠴ [K[1G⠦ [K[1G⠦ [K[1G⠧ [K[1G⠏ [K[1G⠏ [K[1G⠙ [K[1G⠙ [K[1G⠹ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠙ [K[1G⠹ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠼ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠙ [K[1G⠸ [K[1G⠼ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠇ [K[1G⠇ [K[1G⠏ [K[1G⠙ [K[1G⠙ [K[1G⠹ [K[1G⠼ [K[1G⠴ [K[1G⠴ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠦ [K[1G⠧ [K[1G⠏ [K[1G⠋ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠼ [K[1G⠼ [K[1G⠴ [K[1G⠧ [K[1G⠧ [K[1G⠏ [K[1G⠏ [K[1G⠙ [K[1G⠹ [K[1G⠹ [K[1G⠼ [K[1G⠼ [K[1G⠦ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠸ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠧ [K[1G⠇ [K[1G⠋ [K[1G⠙ [K[1G⠙ [K[1G⠸ [K[1G⠸ [K[1G⠼ [K[1G⠦ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠸ [K[1G⠴ [K[1G⠴ [K[1G⠧ [K[1G⠇ [K[1G⠇ [K[1G⠋ [K[1G⠙ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠧ [K[1G⠧ [K[1G⠏ [K[1G⠋ [K[1G⠋ [K[1G⠙ [K[1G⠸ [K[1G⠼ [K[1G⠼ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠇ [K[1G⠏ [K[1G⠙ [K[1G⠹ [K[1G⠹ [K[1G⠼ [K[1G⠼ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠇ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠸ [K[1G⠴ [K[1G⠦ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠸ [K[1G⠸ [K[1G⠴ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠙ [K[1G⠹ [K[1G⠹ [K[1G⠼ [K[1G⠼ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠸ [K[1G⠼ [K[1G⠼ [K[1G⠦ [K[1G⠧ [K[1G⠧ [K[1G⠇ [K[1G⠋ [K[1G⠋ [K[1G⠹ [K[1G⠸ [K[1G⠸ [K[1G⠴ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠋ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠼ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠇ [K[1G⠋ [K[1G⠋ [K[1G⠙ [K[1G⠸ [K[1G⠼ [K[1G⠼ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠇ [K[1G⠏ [K[1G⠙ [K[1G⠹ [K[1G⠹ [K[1G⠼ [K[1G⠼ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠋ [K[1G⠹ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠦ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠋ [K[1G⠋ [K[1G⠹ [K[1G⠹ [K[1G⠸ [K[1G⠴ [K[1G⠴ [K[1G⠧ [K[1G⠇ [K[1G⠇ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠼ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠋ [K[1G⠹ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠦ [K[1G⠧ [K[1G⠧ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠹ [K[1G⠸ [K[1G⠴ [K[1G⠴ [K[1G⠧ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠹ [K[1G⠹ [K[1G⠼ [K[1G⠴ [K[1G⠴ [K[1G⠧ [K[1G⠧ [K[1G⠇ [K[1G⠋ [K[1G⠋ [K[1G⠙ [K[1G⠸ [K[1G⠸ [K[1G⠴ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠇ [K[1G⠏ [K[1G⠙ [K[1G⠙ [K[1G⠙ [K[1G⠙ [K[1G⠙ [K[1G⠸ [K[1G⠸ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠋ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠸ [K[1G⠴ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠹ [K[1G⠸ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠋ [K[1G⠋ [K[1G⠹ [K[1G⠹ [K[1G⠼ [K[1G⠼ [K[1G⠦ [K[1G⠇ [K[1G⠇ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠴ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠙ [K[1G⠸ [K[1G⠸ [K[1G⠴ [K[1G⠴ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠧ [K[1G⠏ [K[1G⠏ [K[1G⠙ [K[1G⠙ [K[1G⠸ [K[1G⠸ [K[1G⠴ [K[1G⠴ [K[1G⠧ [K[1G⠧ [K[1G⠏ [K[1G⠏ [K[1G⠙ [K[1G⠙ [K[1G⠸ [K[1G⠸ [K[1G⠴ [K[1G⠴ [K[1G⠧ [K[1G⠇ [K[1G⠇ [K[1G⠋ [K[1G⠙ [K[1G⠙ [K[1G⠸ [K[1G⠸ [K[1G⠴ [K[1G⠴ [K[1G⠧ [K[1G⠧ [K[1G⠏ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠇ [K[1G⠋ [K[1G⠙ [K[1G⠸ [K[1G⠸ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠹ [K[1G⠼ [K[1G⠼ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠙ [K[1G⠙ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠙ [K[1G⠙ [K[1G⠸ [K[1G⠸ [K[1G⠴ [K[1G⠴ [K[1G⠧ [K[1G⠧ [K[1G⠏ [K[1G⠏ [K[1G⠙ [K[1G⠙ [K[1G⠸ [K[1G⠸ [K[1G⠴ [K[1G⠴ [K[1G⠧ [K[1G⠧ [K[1G⠏ [K[1G⠏ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠸ [K[1G⠼ [K[1G⠼ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠇ [K[1G⠋ [K[1G⠋ [K[1G⠹ [K[1G⠹ [K[1G⠸ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠧ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠇ [K[1G⠋ [K[1G⠋ [K[1G⠹ [K[1G⠹ [K[1G⠸ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠧ [K[1G⠏ [K[1G⠏ [K[1G⠙ [K[1G⠙ [K[1G⠸ [K[1G⠸ [K[1G⠴ [K[1G⠴ [K[1G⠧ [K[1G⠧ [K[1G⠏ [K[1G⠏ [K[1G⠙ [K[1G⠙ [K[1G⠸ [K[1G⠸ [K[1G⠴ [K[1G⠴ [K[1G⠧ [K[1G⠧ [K[1G⠏ [K[1G⠋ [K[1G⠋ [K[1G⠙ [K[1G⠸ [K[1G⠼ [K[1G⠼ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠙ [K[1G⠹ [K[1G⠹ [K[1G⠼ [K[1G⠴ [K[1G⠴ [K[1G⠧ [K[1G⠧ [K[1G⠏ [K[1G⠏ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠸ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠇ [K[1G⠋ [K[1G⠙ [K[1G⠙ [K[1G⠸ [K[1G⠸ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠧ [K[1G[K[2K[1G
