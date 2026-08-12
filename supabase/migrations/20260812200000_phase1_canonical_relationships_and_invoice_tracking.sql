-- Phase 1: canonical relationships and separate client/subcontractor invoice tracking.
-- This migration is additive. Existing text codes remain business/display identifiers.

-- Each project has exactly one main contract. Subcontracts point to that contract.
CREATE UNIQUE INDEX IF NOT EXISTS uq_contracts_one_main_contract_per_project
  ON contracts(project_id)
  WHERE project_id IS NOT NULL AND parent_main_contract_id IS NULL;

-- Contract and BOQ-item relationships for dependent operational records.
ALTER TABLE variations ADD COLUMN IF NOT EXISTS contract_id uuid;
ALTER TABLE wir_entries ADD COLUMN IF NOT EXISTS contract_id uuid;
ALTER TABLE wir_entries ADD COLUMN IF NOT EXISTS boq_header_id uuid;
ALTER TABLE wir_entries ADD COLUMN IF NOT EXISTS boq_item_id uuid;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS contract_id uuid;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS boq_header_id uuid;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS boq_item_id uuid;
ALTER TABLE costs ADD COLUMN IF NOT EXISTS contract_id uuid;
ALTER TABLE costs ADD COLUMN IF NOT EXISTS boq_header_id uuid;
ALTER TABLE costs ADD COLUMN IF NOT EXISTS boq_item_id uuid;
ALTER TABLE cost_entries ADD COLUMN IF NOT EXISTS contract_id uuid;
ALTER TABLE cost_entries ADD COLUMN IF NOT EXISTS boq_header_id uuid;
ALTER TABLE cost_entries ADD COLUMN IF NOT EXISTS boq_item_id uuid;
ALTER TABLE progress_entries ADD COLUMN IF NOT EXISTS contract_id uuid;
ALTER TABLE client_invoices ADD COLUMN IF NOT EXISTS contract_id uuid;
ALTER TABLE client_invoices ADD COLUMN IF NOT EXISTS boq_header_id uuid;
ALTER TABLE client_invoices ADD COLUMN IF NOT EXISTS boq_item_id uuid;
ALTER TABLE subcontractor_invoices ADD COLUMN IF NOT EXISTS contract_id uuid;
ALTER TABLE subcontractor_invoices ADD COLUMN IF NOT EXISTS boq_header_id uuid;
ALTER TABLE subcontractor_invoices ADD COLUMN IF NOT EXISTS boq_item_id uuid;

DO $$
DECLARE t text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'variations_contract_id_fkey') THEN
    ALTER TABLE variations ADD CONSTRAINT variations_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE SET NULL;
  END IF;
  FOREACH t IN ARRAY ARRAY['wir_entries','schedules','costs','cost_entries'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = t || '_contract_id_fkey') THEN
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE SET NULL', t, t || '_contract_id_fkey');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = t || '_boq_header_id_fkey') THEN
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (boq_header_id) REFERENCES boq_headers(id) ON DELETE SET NULL', t, t || '_boq_header_id_fkey');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = t || '_boq_item_id_fkey') THEN
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (boq_item_id) REFERENCES boq_items(id) ON DELETE SET NULL', t, t || '_boq_item_id_fkey');
    END IF;
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'progress_entries_contract_id_fkey') THEN
    ALTER TABLE progress_entries ADD CONSTRAINT progress_entries_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE SET NULL;
  END IF;
  FOREACH t IN ARRAY ARRAY['client_invoices','subcontractor_invoices'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = t || '_contract_id_fkey') THEN
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE SET NULL', t, t || '_contract_id_fkey');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = t || '_boq_header_id_fkey') THEN
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (boq_header_id) REFERENCES boq_headers(id) ON DELETE SET NULL', t, t || '_boq_header_id_fkey');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = t || '_boq_item_id_fkey') THEN
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (boq_item_id) REFERENCES boq_items(id) ON DELETE SET NULL', t, t || '_boq_item_id_fkey');
    END IF;
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_variations_contract_id ON variations(contract_id);
CREATE INDEX IF NOT EXISTS idx_wir_entries_contract_id ON wir_entries(contract_id);
CREATE INDEX IF NOT EXISTS idx_wir_entries_boq_item_id ON wir_entries(boq_item_id);
CREATE INDEX IF NOT EXISTS idx_schedules_contract_id ON schedules(contract_id);
CREATE INDEX IF NOT EXISTS idx_schedules_boq_item_id ON schedules(boq_item_id);
CREATE INDEX IF NOT EXISTS idx_costs_contract_id ON costs(contract_id);
CREATE INDEX IF NOT EXISTS idx_cost_entries_contract_id ON cost_entries(contract_id);
CREATE INDEX IF NOT EXISTS idx_cost_entries_boq_item_id ON cost_entries(boq_item_id);
CREATE INDEX IF NOT EXISTS idx_progress_entries_contract_id ON progress_entries(contract_id);
CREATE INDEX IF NOT EXISTS idx_client_invoices_contract_id ON client_invoices(contract_id);
CREATE INDEX IF NOT EXISTS idx_subcontractor_invoices_contract_id ON subcontractor_invoices(contract_id);

-- Invoice rows remain in the existing client/subcontractor tables. The new tables
-- hold each invoice's separate status/payment tracking record.
CREATE TABLE IF NOT EXISTS client_invoice_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  contract_id uuid REFERENCES contracts(id) ON DELETE SET NULL,
  invoice_number text NOT NULL,
  invoice_date date,
  due_date date,
  status text DEFAULT 'Draft',
  payment_status text DEFAULT 'Unpaid',
  payment_date date,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE (contract_id, invoice_number)
);

CREATE TABLE IF NOT EXISTS subcontractor_invoice_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  contract_id uuid REFERENCES contracts(id) ON DELETE SET NULL,
  invoice_number text NOT NULL,
  invoice_date date,
  due_date date,
  status text DEFAULT 'Draft',
  payment_status text DEFAULT 'Unpaid',
  payment_date date,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE (contract_id, invoice_number)
);

ALTER TABLE client_invoice_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcontractor_invoice_tracking ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['client_invoice_tracking','subcontractor_invoice_tracking'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'anon_select_' || t, t);
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT TO anon, authenticated USING (true)', 'anon_select_' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'anon_insert_' || t, t);
    EXECUTE format('CREATE POLICY %I ON %I FOR INSERT TO anon, authenticated WITH CHECK (true)', 'anon_insert_' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'anon_update_' || t, t);
    EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)', 'anon_update_' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'anon_delete_' || t, t);
    EXECUTE format('CREATE POLICY %I ON %I FOR DELETE TO anon, authenticated USING (true)', 'anon_delete_' || t, t);
  END LOOP;
END $$;
