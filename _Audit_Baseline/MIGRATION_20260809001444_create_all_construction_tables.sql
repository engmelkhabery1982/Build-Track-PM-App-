/*
# Create all construction management tables (single-tenant, no auth)

1. New Tables
- `projects` — Construction projects with client, budget, progress, manager, contractor
- `tasks` — Tasks within a project with assignee, category, dates, cost, priority, predecessors
- `costs` — Cost control entries with planned/actual/committed, category, status
- `procurement` — Procurement items with supplier, qty, unit cost, total, status, dates
- `safety` — Safety/HSE records with type, severity, date, description, status, action
- `progress_entries` — Daily progress logs with area, % complete, weather, workers
- `schedules` — Schedule activities with dates, duration, progress, critical path, predecessors
- `contracts` — Contracts with number, title, contractor, type, value, dates, status
- `boq_items` — Bill of Quantities line items with code, description, unit, qty, rate, amount
- `wir_entries` — Work Inspection Requests with area, type, date, inspector, result, status
- `cash_flow` — Cash flow entries with inflow, outflow, net, cumulative balance, category
- `subcontractor_invoices` — Subcontractor invoices with BOQ ref, amount, payment tracking
- `client_invoices` — Client invoices with due date, amount, payment tracking
- `variations` — Variation orders with type, cost/time impact, approval status
- `documents` — Document tracking with name, type, category, version, status, responsible

2. Security
- RLS enabled on all tables.
- 4 CRUD policies each (TO anon, authenticated) — single-tenant no-auth app, data is intentionally shared.

3. Notes
- No user_id columns (no auth required).
- Foreign keys from child tables to projects(id) with CASCADE delete.
- Indexes on project_id and status columns for query performance.
*/

-- ============ PROJECTS ============
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  client text DEFAULT '',
  location text DEFAULT '',
  category text DEFAULT 'Residential',
  start_date date,
  end_date date,
  budget numeric(14,2) DEFAULT 0,
  spent numeric(14,2) DEFAULT 0,
  status text DEFAULT 'Planning',
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  project_manager text DEFAULT '',
  contractor text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_projects" ON projects;
CREATE POLICY "anon_select_projects" ON projects FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_projects" ON projects;
CREATE POLICY "anon_insert_projects" ON projects FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_projects" ON projects;
CREATE POLICY "anon_update_projects" ON projects FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_projects" ON projects;
CREATE POLICY "anon_delete_projects" ON projects FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- ============ TASKS ============
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  assignee text DEFAULT '',
  category text DEFAULT '',
  start_date date,
  end_date date,
  cost numeric(14,2) DEFAULT 0,
  status text DEFAULT 'Not Started',
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  predecessors text DEFAULT '',
  priority text DEFAULT 'Medium',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_tasks" ON tasks;
CREATE POLICY "anon_select_tasks" ON tasks FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_tasks" ON tasks;
CREATE POLICY "anon_insert_tasks" ON tasks FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_tasks" ON tasks;
CREATE POLICY "anon_update_tasks" ON tasks FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_tasks" ON tasks;
CREATE POLICY "anon_delete_tasks" ON tasks FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- ============ COSTS ============
CREATE TABLE IF NOT EXISTS costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'Materials',
  description text DEFAULT '',
  planned numeric(14,2) DEFAULT 0,
  actual numeric(14,2) DEFAULT 0,
  committed numeric(14,2) DEFAULT 0,
  status text DEFAULT 'On Budget',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE costs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_costs" ON costs;
CREATE POLICY "anon_select_costs" ON costs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_costs" ON costs;
CREATE POLICY "anon_insert_costs" ON costs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_costs" ON costs;
CREATE POLICY "anon_update_costs" ON costs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_costs" ON costs;
CREATE POLICY "anon_delete_costs" ON costs FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_costs_project_id ON costs(project_id);

-- ============ PROCUREMENT ============
CREATE TABLE IF NOT EXISTS procurement (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  item text NOT NULL DEFAULT '',
  supplier text DEFAULT '',
  quantity numeric(14,2) DEFAULT 1,
  unit text DEFAULT 'pcs',
  unit_cost numeric(14,2) DEFAULT 0,
  total_cost numeric(14,2) DEFAULT 0,
  status text DEFAULT 'Requested',
  order_date date,
  delivery_date date,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE procurement ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_proc" ON procurement;
CREATE POLICY "anon_select_proc" ON procurement FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_proc" ON procurement;
CREATE POLICY "anon_insert_proc" ON procurement FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_proc" ON procurement;
CREATE POLICY "anon_update_proc" ON procurement FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_proc" ON procurement;
CREATE POLICY "anon_delete_proc" ON procurement FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_proc_project_id ON procurement(project_id);
CREATE INDEX IF NOT EXISTS idx_proc_status ON procurement(status);

-- ============ SAFETY ============
CREATE TABLE IF NOT EXISTS safety (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'Inspection',
  severity text DEFAULT 'Low',
  date date,
  description text DEFAULT '',
  location text DEFAULT '',
  responsible text DEFAULT '',
  status text DEFAULT 'Open',
  action_taken text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE safety ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_safety" ON safety;
CREATE POLICY "anon_select_safety" ON safety FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_safety" ON safety;
CREATE POLICY "anon_insert_safety" ON safety FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_safety" ON safety;
CREATE POLICY "anon_update_safety" ON safety FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_safety" ON safety;
CREATE POLICY "anon_delete_safety" ON safety FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_safety_project_id ON safety(project_id);
CREATE INDEX IF NOT EXISTS idx_safety_status ON safety(status);

-- ============ PROGRESS ENTRIES ============
CREATE TABLE IF NOT EXISTS progress_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  area text DEFAULT '',
  percent_complete integer DEFAULT 0 CHECK (percent_complete >= 0 AND percent_complete <= 100),
  weather text DEFAULT '',
  workers integer DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE progress_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_progress" ON progress_entries;
CREATE POLICY "anon_select_progress" ON progress_entries FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_progress" ON progress_entries;
CREATE POLICY "anon_insert_progress" ON progress_entries FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_progress" ON progress_entries;
CREATE POLICY "anon_update_progress" ON progress_entries FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_progress" ON progress_entries;
CREATE POLICY "anon_delete_progress" ON progress_entries FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_progress_project_id ON progress_entries(project_id);

-- ============ SCHEDULES ============
CREATE TABLE IF NOT EXISTS schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  activity text NOT NULL DEFAULT '',
  start_date date,
  end_date date,
  duration_days integer DEFAULT 0,
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  predecessors text DEFAULT '',
  critical_path boolean DEFAULT false,
  responsible text DEFAULT '',
  status text DEFAULT 'Not Started',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_schedules" ON schedules;
CREATE POLICY "anon_select_schedules" ON schedules FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_schedules" ON schedules;
CREATE POLICY "anon_insert_schedules" ON schedules FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_schedules" ON schedules;
CREATE POLICY "anon_update_schedules" ON schedules FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_schedules" ON schedules;
CREATE POLICY "anon_delete_schedules" ON schedules FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_sched_project_id ON schedules(project_id);
CREATE INDEX IF NOT EXISTS idx_sched_status ON schedules(status);

-- ============ CONTRACTS ============
CREATE TABLE IF NOT EXISTS contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  contract_number text DEFAULT '',
  title text NOT NULL DEFAULT '',
  contractor text DEFAULT '',
  contract_type text DEFAULT 'Lump Sum',
  contract_value numeric DEFAULT 0,
  start_date date,
  end_date date,
  status text DEFAULT 'Draft',
  signed_date date,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_contracts" ON contracts;
CREATE POLICY "anon_select_contracts" ON contracts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_contracts" ON contracts;
CREATE POLICY "anon_insert_contracts" ON contracts FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_contracts" ON contracts;
CREATE POLICY "anon_update_contracts" ON contracts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_contracts" ON contracts;
CREATE POLICY "anon_delete_contracts" ON contracts FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_contracts_project_id ON contracts(project_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);

-- ============ BOQ ITEMS ============
CREATE TABLE IF NOT EXISTS boq_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  item_code text DEFAULT '',
  description text NOT NULL DEFAULT '',
  category text DEFAULT '',
  unit text DEFAULT 'pcs',
  quantity numeric DEFAULT 0,
  unit_rate numeric DEFAULT 0,
  amount numeric DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE boq_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_boq_items" ON boq_items;
CREATE POLICY "anon_select_boq_items" ON boq_items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_boq_items" ON boq_items;
CREATE POLICY "anon_insert_boq_items" ON boq_items FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_boq_items" ON boq_items;
CREATE POLICY "anon_update_boq_items" ON boq_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_boq_items" ON boq_items;
CREATE POLICY "anon_delete_boq_items" ON boq_items FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_boq_project_id ON boq_items(project_id);

-- ============ WIR ENTRIES ============
CREATE TABLE IF NOT EXISTS wir_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  wir_number text DEFAULT '',
  area text DEFAULT '',
  work_type text DEFAULT 'Inspection',
  inspection_date date,
  inspector text DEFAULT '',
  result text DEFAULT 'Pending',
  remarks text DEFAULT '',
  status text DEFAULT 'Open',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE wir_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_wir_entries" ON wir_entries;
CREATE POLICY "anon_select_wir_entries" ON wir_entries FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_wir_entries" ON wir_entries;
CREATE POLICY "anon_insert_wir_entries" ON wir_entries FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_wir_entries" ON wir_entries;
CREATE POLICY "anon_update_wir_entries" ON wir_entries FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_wir_entries" ON wir_entries;
CREATE POLICY "anon_delete_wir_entries" ON wir_entries FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_wir_project_id ON wir_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_wir_status ON wir_entries(status);

-- ============ CASH FLOW ============
CREATE TABLE IF NOT EXISTS cash_flow (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  date date,
  description text DEFAULT '',
  inflow numeric DEFAULT 0,
  outflow numeric DEFAULT 0,
  net numeric DEFAULT 0,
  cumulative_balance numeric DEFAULT 0,
  category text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE cash_flow ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_cash_flow" ON cash_flow;
CREATE POLICY "anon_select_cash_flow" ON cash_flow FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_cash_flow" ON cash_flow;
CREATE POLICY "anon_insert_cash_flow" ON cash_flow FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_cash_flow" ON cash_flow;
CREATE POLICY "anon_update_cash_flow" ON cash_flow FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_cash_flow" ON cash_flow;
CREATE POLICY "anon_delete_cash_flow" ON cash_flow FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_cashflow_project_id ON cash_flow(project_id);

-- ============ SUBCONTRACTOR INVOICES ============
CREATE TABLE IF NOT EXISTS subcontractor_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  invoice_number text DEFAULT '',
  subcontractor text DEFAULT '',
  boq_reference text DEFAULT '',
  invoice_date date,
  amount numeric DEFAULT 0,
  status text DEFAULT 'Submitted',
  payment_status text DEFAULT 'Unpaid',
  payment_date date,
  paid_amount numeric DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE subcontractor_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_subcontractor_invoices" ON subcontractor_invoices;
CREATE POLICY "anon_select_subcontractor_invoices" ON subcontractor_invoices FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_subcontractor_invoices" ON subcontractor_invoices;
CREATE POLICY "anon_insert_subcontractor_invoices" ON subcontractor_invoices FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_subcontractor_invoices" ON subcontractor_invoices;
CREATE POLICY "anon_update_subcontractor_invoices" ON subcontractor_invoices FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_subcontractor_invoices" ON subcontractor_invoices;
CREATE POLICY "anon_delete_subcontractor_invoices" ON subcontractor_invoices FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_subinv_project_id ON subcontractor_invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_subinv_status ON subcontractor_invoices(status);

-- ============ CLIENT INVOICES ============
CREATE TABLE IF NOT EXISTS client_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  invoice_number text DEFAULT '',
  client text DEFAULT '',
  invoice_date date,
  due_date date,
  amount numeric DEFAULT 0,
  status text DEFAULT 'Draft',
  payment_status text DEFAULT 'Unpaid',
  payment_date date,
  paid_amount numeric DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE client_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_client_invoices" ON client_invoices;
CREATE POLICY "anon_select_client_invoices" ON client_invoices FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_client_invoices" ON client_invoices;
CREATE POLICY "anon_insert_client_invoices" ON client_invoices FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_client_invoices" ON client_invoices;
CREATE POLICY "anon_update_client_invoices" ON client_invoices FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_client_invoices" ON client_invoices;
CREATE POLICY "anon_delete_client_invoices" ON client_invoices FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_clientinv_project_id ON client_invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_clientinv_status ON client_invoices(status);

-- ============ VARIATIONS ============
CREATE TABLE IF NOT EXISTS variations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  variation_number text DEFAULT '',
  type text DEFAULT 'Variation',
  title text DEFAULT '',
  description text DEFAULT '',
  cost_impact numeric DEFAULT 0,
  time_impact_days integer DEFAULT 0,
  status text DEFAULT 'Pending',
  approved_by text DEFAULT '',
  approved_date date,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE variations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_variations" ON variations;
CREATE POLICY "anon_select_variations" ON variations FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_variations" ON variations;
CREATE POLICY "anon_insert_variations" ON variations FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_variations" ON variations;
CREATE POLICY "anon_update_variations" ON variations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_variations" ON variations;
CREATE POLICY "anon_delete_variations" ON variations FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_var_project_id ON variations(project_id);
CREATE INDEX IF NOT EXISTS idx_var_status ON variations(status);

-- ============ DOCUMENTS ============
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  document_name text NOT NULL DEFAULT '',
  document_type text DEFAULT 'Drawing',
  category text DEFAULT '',
  version text DEFAULT '1.0',
  upload_date date,
  status text DEFAULT 'Current',
  responsible text DEFAULT '',
  file_reference text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_documents" ON documents;
CREATE POLICY "anon_select_documents" ON documents FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_documents" ON documents;
CREATE POLICY "anon_insert_documents" ON documents FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_documents" ON documents;
CREATE POLICY "anon_update_documents" ON documents FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_documents" ON documents;
CREATE POLICY "anon_delete_documents" ON documents FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_docs_project_id ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_docs_status ON documents(status);