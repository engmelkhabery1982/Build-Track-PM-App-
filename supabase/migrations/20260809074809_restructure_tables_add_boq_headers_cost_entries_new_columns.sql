/*
# Restructure tables: BOQ split, new Costs table, expanded columns

## Summary
This migration restructures several tables to support a two-level BOQ (headers + items),
a new detailed Costs tracking table, and adds missing columns across Projects, WIR,
Progress, Cost Control, and Schedule tables per the user's requirements.

## Changes

### 1. New Table: boq_headers
Top-level BOQ records (main contractor or subcontractor BOQ). Each header has multiple boq_items.
- project_code (text) - links to project
- boq_code (text) - unique BOQ identifier
- classification (text) - "Main" or "Subcontractor"
- company_name (text) - company name
- contract_type (text) - Lump Sum, Unit Price, Cost Plus, Time & Materials, Design-Build, GMP, Cost Reimbursable
- total_value (numeric) - sum of all item amounts (calculated in app)

### 2. New Table: cost_entries (detailed costs)
Replaces the old simple costs table with a detailed cost tracking table.
- project_code, boq_code, company_name, boq_item_code, boq_item_name
- date, cost_type (Labor, Equipment, Materials, Miscellaneous, Other)
- invoice_number, payment_order_number, amount

### 3. Modified: projects table
Added: project_code (text), boq_code (text)
Spent and total_value remain calculated in the app from cost_entries and boq_items.

### 4. Modified: boq_items table
Added: boq_code (text), project_code (text), item_name (text)
Existing columns preserved.

### 5. Modified: wir_entries table
Added: project_code, boq_code, item_code, item_name, item_description,
  company_name, unit, quantity, unit_price, item_amount, completion_pct

### 6. Modified: progress_entries table
Added: project_code, company_name, prev_value, prev_pct, current_value,
  current_pct, total_value, total_pct

### 7. Modified: costs table (cost control)
Added: project_code, item_code, company_name, boq_item_code, boq_item_name

### 8. Modified: schedules table
Added: project_code, boq_code, boq_item_code, boq_item_name, planned_value,
  predecessor_item, is_critical_item, notes

## Security
All new tables get RLS enabled with anon+authenticated CRUD (single-tenant, no auth).
All modified tables keep existing RLS policies.
*/

-- ============================================================
-- 1. NEW TABLE: boq_headers
-- ============================================================
CREATE TABLE IF NOT EXISTS boq_headers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  project_code text DEFAULT '',
  boq_code text NOT NULL,
  classification text DEFAULT 'Main',
  company_name text DEFAULT '',
  contract_type text DEFAULT '',
  total_value numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE boq_headers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_boq_headers" ON boq_headers;
CREATE POLICY "anon_select_boq_headers" ON boq_headers FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_boq_headers" ON boq_headers;
CREATE POLICY "anon_insert_boq_headers" ON boq_headers FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_boq_headers" ON boq_headers;
CREATE POLICY "anon_update_boq_headers" ON boq_headers FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_boq_headers" ON boq_headers;
CREATE POLICY "anon_delete_boq_headers" ON boq_headers FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- 2. NEW TABLE: cost_entries (detailed costs)
-- ============================================================
CREATE TABLE IF NOT EXISTS cost_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  project_code text DEFAULT '',
  boq_code text DEFAULT '',
  company_name text DEFAULT '',
  boq_item_code text DEFAULT '',
  boq_item_name text DEFAULT '',
  date date,
  cost_type text DEFAULT 'Materials',
  invoice_number text DEFAULT '',
  payment_order_number text DEFAULT '',
  amount numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cost_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_cost_entries" ON cost_entries;
CREATE POLICY "anon_select_cost_entries" ON cost_entries FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_cost_entries" ON cost_entries;
CREATE POLICY "anon_insert_cost_entries" ON cost_entries FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_cost_entries" ON cost_entries;
CREATE POLICY "anon_update_cost_entries" ON cost_entries FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_cost_entries" ON cost_entries;
CREATE POLICY "anon_delete_cost_entries" ON cost_entries FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- 3. MODIFY: projects - add project_code and boq_code
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'project_code') THEN
    ALTER TABLE projects ADD COLUMN project_code text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'boq_code') THEN
    ALTER TABLE projects ADD COLUMN boq_code text DEFAULT '';
  END IF;
END $$;

-- ============================================================
-- 4. MODIFY: boq_items - add boq_code, project_code, item_name
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'boq_items' AND column_name = 'boq_code') THEN
    ALTER TABLE boq_items ADD COLUMN boq_code text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'boq_items' AND column_name = 'project_code') THEN
    ALTER TABLE boq_items ADD COLUMN project_code text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'boq_items' AND column_name = 'item_name') THEN
    ALTER TABLE boq_items ADD COLUMN item_name text DEFAULT '';
  END IF;
END $$;

-- ============================================================
-- 5. MODIFY: wir_entries - add new columns
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wir_entries' AND column_name = 'project_code') THEN
    ALTER TABLE wir_entries ADD COLUMN project_code text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wir_entries' AND column_name = 'boq_code') THEN
    ALTER TABLE wir_entries ADD COLUMN boq_code text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wir_entries' AND column_name = 'item_code') THEN
    ALTER TABLE wir_entries ADD COLUMN item_code text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wir_entries' AND column_name = 'item_name') THEN
    ALTER TABLE wir_entries ADD COLUMN item_name text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wir_entries' AND column_name = 'item_description') THEN
    ALTER TABLE wir_entries ADD COLUMN item_description text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wir_entries' AND column_name = 'company_name') THEN
    ALTER TABLE wir_entries ADD COLUMN company_name text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wir_entries' AND column_name = 'unit') THEN
    ALTER TABLE wir_entries ADD COLUMN unit text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wir_entries' AND column_name = 'quantity') THEN
    ALTER TABLE wir_entries ADD COLUMN quantity numeric DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wir_entries' AND column_name = 'unit_price') THEN
    ALTER TABLE wir_entries ADD COLUMN unit_price numeric DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wir_entries' AND column_name = 'item_amount') THEN
    ALTER TABLE wir_entries ADD COLUMN item_amount numeric DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wir_entries' AND column_name = 'completion_pct') THEN
    ALTER TABLE wir_entries ADD COLUMN completion_pct numeric DEFAULT 0;
  END IF;
END $$;

-- ============================================================
-- 6. MODIFY: progress_entries - add new columns
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'progress_entries' AND column_name = 'project_code') THEN
    ALTER TABLE progress_entries ADD COLUMN project_code text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'progress_entries' AND column_name = 'company_name') THEN
    ALTER TABLE progress_entries ADD COLUMN company_name text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'progress_entries' AND column_name = 'prev_value') THEN
    ALTER TABLE progress_entries ADD COLUMN prev_value numeric DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'progress_entries' AND column_name = 'prev_pct') THEN
    ALTER TABLE progress_entries ADD COLUMN prev_pct numeric DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'progress_entries' AND column_name = 'current_value') THEN
    ALTER TABLE progress_entries ADD COLUMN current_value numeric DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'progress_entries' AND column_name = 'current_pct') THEN
    ALTER TABLE progress_entries ADD COLUMN current_pct numeric DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'progress_entries' AND column_name = 'total_value') THEN
    ALTER TABLE progress_entries ADD COLUMN total_value numeric DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'progress_entries' AND column_name = 'total_pct') THEN
    ALTER TABLE progress_entries ADD COLUMN total_pct numeric DEFAULT 0;
  END IF;
END $$;

-- ============================================================
-- 7. MODIFY: costs (cost control) - add new columns
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'costs' AND column_name = 'project_code') THEN
    ALTER TABLE costs ADD COLUMN project_code text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'costs' AND column_name = 'item_code') THEN
    ALTER TABLE costs ADD COLUMN item_code text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'costs' AND column_name = 'company_name') THEN
    ALTER TABLE costs ADD COLUMN company_name text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'costs' AND column_name = 'boq_item_code') THEN
    ALTER TABLE costs ADD COLUMN boq_item_code text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'costs' AND column_name = 'boq_item_name') THEN
    ALTER TABLE costs ADD COLUMN boq_item_name text DEFAULT '';
  END IF;
END $$;

-- ============================================================
-- 8. MODIFY: schedules - add new columns
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schedules' AND column_name = 'project_code') THEN
    ALTER TABLE schedules ADD COLUMN project_code text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schedules' AND column_name = 'boq_code') THEN
    ALTER TABLE schedules ADD COLUMN boq_code text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schedules' AND column_name = 'boq_item_code') THEN
    ALTER TABLE schedules ADD COLUMN boq_item_code text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schedules' AND column_name = 'boq_item_name') THEN
    ALTER TABLE schedules ADD COLUMN boq_item_name text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schedules' AND column_name = 'planned_value') THEN
    ALTER TABLE schedules ADD COLUMN planned_value numeric DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schedules' AND column_name = 'predecessor_item') THEN
    ALTER TABLE schedules ADD COLUMN predecessor_item text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schedules' AND column_name = 'is_critical_item') THEN
    ALTER TABLE schedules ADD COLUMN is_critical_item boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schedules' AND column_name = 'notes') THEN
    ALTER TABLE schedules ADD COLUMN notes text DEFAULT '';
  END IF;
END $$;

-- ============================================================
-- Indexes for frequently queried columns
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_boq_headers_project_id ON boq_headers(project_id);
CREATE INDEX IF NOT EXISTS idx_boq_headers_boq_code ON boq_headers(boq_code);
CREATE INDEX IF NOT EXISTS idx_boq_items_boq_code ON boq_items(boq_code);
CREATE INDEX IF NOT EXISTS idx_cost_entries_project_id ON cost_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_cost_entries_boq_code ON cost_entries(boq_code);
CREATE INDEX IF NOT EXISTS idx_cost_entries_cost_type ON cost_entries(cost_type);
CREATE INDEX IF NOT EXISTS idx_wir_entries_boq_code ON wir_entries(boq_code);
CREATE INDEX IF NOT EXISTS idx_wir_entries_item_code ON wir_entries(item_code);
CREATE INDEX IF NOT EXISTS idx_progress_entries_project_id ON progress_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_schedules_boq_code ON schedules(boq_code);
