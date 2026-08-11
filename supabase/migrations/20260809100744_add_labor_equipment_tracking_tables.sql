/*
# Add labor, equipment, tracking tables and update invoice columns

## Summary
Adds new tables for labor duty tracking and equipment management, creates a
tracking sheet that auto-records invoice entries, adds BOQ-related columns to
invoice tables for auto-fill, and sets up database triggers to sync labor and
equipment costs into the cost entries table.

## New Tables
1. labor_duty - daily labor assignments with worker counts, hours, rates
2. equipment - equipment usage with quantities, rates, costs
3. tracking_sheet - auto-populated from invoice inserts

## Modified Tables
1. subcontractor_invoices - added boq_code, boq_item_code, item_desc, unit, quantity, unit_rate, created_by
2. client_invoices - added boq_code, boq_item_code, item_desc, unit, quantity, unit_rate, created_by
3. cost_entries - added source_type, source_id for linking to labor/equipment

## Security
- RLS enabled on all new tables with anon+authenticated CRUD (single-tenant, no auth)

## Triggers
1. labor_duty AFTER INSERT/UPDATE/DELETE -> syncs to cost_entries
2. equipment AFTER INSERT/UPDATE/DELETE -> syncs to cost_entries
3. subcontractor_invoices AFTER INSERT/UPDATE/DELETE -> syncs to tracking_sheet
4. client_invoices AFTER INSERT/UPDATE/DELETE -> syncs to tracking_sheet
*/

-- Add columns to subcontractor_invoices
ALTER TABLE subcontractor_invoices ADD COLUMN IF NOT EXISTS boq_code text;
ALTER TABLE subcontractor_invoices ADD COLUMN IF NOT EXISTS boq_item_code text;
ALTER TABLE subcontractor_invoices ADD COLUMN IF NOT EXISTS item_desc text;
ALTER TABLE subcontractor_invoices ADD COLUMN IF NOT EXISTS unit text;
ALTER TABLE subcontractor_invoices ADD COLUMN IF NOT EXISTS quantity numeric DEFAULT 0;
ALTER TABLE subcontractor_invoices ADD COLUMN IF NOT EXISTS unit_rate numeric DEFAULT 0;
ALTER TABLE subcontractor_invoices ADD COLUMN IF NOT EXISTS created_by text;

-- Add columns to client_invoices
ALTER TABLE client_invoices ADD COLUMN IF NOT EXISTS boq_code text;
ALTER TABLE client_invoices ADD COLUMN IF NOT EXISTS boq_item_code text;
ALTER TABLE client_invoices ADD COLUMN IF NOT EXISTS item_desc text;
ALTER TABLE client_invoices ADD COLUMN IF NOT EXISTS unit text;
ALTER TABLE client_invoices ADD COLUMN IF NOT EXISTS quantity numeric DEFAULT 0;
ALTER TABLE client_invoices ADD COLUMN IF NOT EXISTS unit_rate numeric DEFAULT 0;
ALTER TABLE client_invoices ADD COLUMN IF NOT EXISTS created_by text;

-- Add source tracking to cost_entries
ALTER TABLE cost_entries ADD COLUMN IF NOT EXISTS source_type text;
ALTER TABLE cost_entries ADD COLUMN IF NOT EXISTS source_id text;

-- Create labor_duty table
CREATE TABLE IF NOT EXISTS labor_duty (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id text,
  project_code text,
  date date,
  worker_name text,
  role text,
  no_of_workers numeric DEFAULT 0,
  hours_per_day numeric DEFAULT 0,
  days numeric DEFAULT 0,
  total_hours numeric DEFAULT 0,
  rate_per_hour numeric DEFAULT 0,
  amount numeric DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create equipment table
CREATE TABLE IF NOT EXISTS equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id text,
  project_code text,
  date date,
  equipment_name text,
  equipment_type text,
  unit text,
  quantity numeric DEFAULT 0,
  unit_rate numeric DEFAULT 0,
  amount numeric DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create tracking_sheet table
CREATE TABLE IF NOT EXISTS tracking_sheet (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id text,
  company_name text,
  source_type text,
  source_id text,
  amount numeric DEFAULT 0,
  status text,
  created_by text,
  created_time timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE labor_duty ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_sheet ENABLE ROW LEVEL SECURITY;

-- RLS for labor_duty
DROP POLICY IF EXISTS "anon_select_labor_duty" ON labor_duty;
CREATE POLICY "anon_select_labor_duty" ON labor_duty FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_labor_duty" ON labor_duty;
CREATE POLICY "anon_insert_labor_duty" ON labor_duty FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_labor_duty" ON labor_duty;
CREATE POLICY "anon_update_labor_duty" ON labor_duty FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_labor_duty" ON labor_duty;
CREATE POLICY "anon_delete_labor_duty" ON labor_duty FOR DELETE TO anon, authenticated USING (true);

-- RLS for equipment
DROP POLICY IF EXISTS "anon_select_equipment" ON equipment;
CREATE POLICY "anon_select_equipment" ON equipment FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_equipment" ON equipment;
CREATE POLICY "anon_insert_equipment" ON equipment FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_equipment" ON equipment;
CREATE POLICY "anon_update_equipment" ON equipment FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_equipment" ON equipment;
CREATE POLICY "anon_delete_equipment" ON equipment FOR DELETE TO anon, authenticated USING (true);

-- RLS for tracking_sheet
DROP POLICY IF EXISTS "anon_select_tracking_sheet" ON tracking_sheet;
CREATE POLICY "anon_select_tracking_sheet" ON tracking_sheet FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_tracking_sheet" ON tracking_sheet;
CREATE POLICY "anon_insert_tracking_sheet" ON tracking_sheet FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_tracking_sheet" ON tracking_sheet;
CREATE POLICY "anon_update_tracking_sheet" ON tracking_sheet FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_tracking_sheet" ON tracking_sheet;
CREATE POLICY "anon_delete_tracking_sheet" ON tracking_sheet FOR DELETE TO anon, authenticated USING (true);

-- Trigger: sync labor to cost_entries
CREATE OR REPLACE FUNCTION sync_labor_cost()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO cost_entries (project_id, project_code, date, cost_type, invoice_number, amount, source_type, source_id)
    VALUES (NEW.project_id, NEW.project_code, NEW.date, 'Labor', NEW.worker_name || ' - ' || COALESCE(NEW.role, ''), NEW.amount, 'labor_duty', NEW.id::text);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE cost_entries SET
      project_id = NEW.project_id, project_code = NEW.project_code, date = NEW.date,
      amount = NEW.amount, invoice_number = NEW.worker_name || ' - ' || COALESCE(NEW.role, '')
    WHERE source_type = 'labor_duty' AND source_id = NEW.id::text;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM cost_entries WHERE source_type = 'labor_duty' AND source_id = OLD.id::text;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger: sync equipment to cost_entries
CREATE OR REPLACE FUNCTION sync_equipment_cost()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO cost_entries (project_id, project_code, date, cost_type, invoice_number, amount, source_type, source_id)
    VALUES (NEW.project_id, NEW.project_code, NEW.date, 'Equipment', NEW.equipment_name, NEW.amount, 'equipment', NEW.id::text);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE cost_entries SET
      project_id = NEW.project_id, project_code = NEW.project_code, date = NEW.date,
      amount = NEW.amount, invoice_number = NEW.equipment_name
    WHERE source_type = 'equipment' AND source_id = NEW.id::text;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM cost_entries WHERE source_type = 'equipment' AND source_id = OLD.id::text;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger: sync subcontractor invoices to tracking_sheet
CREATE OR REPLACE FUNCTION sync_subcontractor_tracking()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO tracking_sheet (project_id, company_name, source_type, source_id, amount, status, created_by, created_time)
    VALUES (NEW.project_id, COALESCE(NEW.subcontractor, ''), 'subcontractor_invoices', NEW.id::text, COALESCE(NEW.amount, 0), COALESCE(NEW.status, ''), COALESCE(NEW.created_by, ''), now());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE tracking_sheet SET
      project_id = NEW.project_id, company_name = COALESCE(NEW.subcontractor, ''),
      amount = COALESCE(NEW.amount, 0), status = COALESCE(NEW.status, ''), created_by = COALESCE(NEW.created_by, '')
    WHERE source_type = 'subcontractor_invoices' AND source_id = NEW.id::text;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM tracking_sheet WHERE source_type = 'subcontractor_invoices' AND source_id = OLD.id::text;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger: sync client invoices to tracking_sheet
CREATE OR REPLACE FUNCTION sync_client_tracking()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO tracking_sheet (project_id, company_name, source_type, source_id, amount, status, created_by, created_time)
    VALUES (NEW.project_id, COALESCE(NEW.client, ''), 'client_invoices', NEW.id::text, COALESCE(NEW.amount, 0), COALESCE(NEW.status, ''), COALESCE(NEW.created_by, ''), now());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE tracking_sheet SET
      project_id = NEW.project_id, company_name = COALESCE(NEW.client, ''),
      amount = COALESCE(NEW.amount, 0), status = COALESCE(NEW.status, ''), created_by = COALESCE(NEW.created_by, '')
    WHERE source_type = 'client_invoices' AND source_id = NEW.id::text;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM tracking_sheet WHERE source_type = 'client_invoices' AND source_id = OLD.id::text;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS labor_duty_cost_sync ON labor_duty;
CREATE TRIGGER labor_duty_cost_sync
AFTER INSERT OR UPDATE OR DELETE ON labor_duty
FOR EACH ROW EXECUTE FUNCTION sync_labor_cost();

DROP TRIGGER IF EXISTS equipment_cost_sync ON equipment;
CREATE TRIGGER equipment_cost_sync
AFTER INSERT OR UPDATE OR DELETE ON equipment
FOR EACH ROW EXECUTE FUNCTION sync_equipment_cost();

DROP TRIGGER IF EXISTS subcontractor_invoice_tracking ON subcontractor_invoices;
CREATE TRIGGER subcontractor_invoice_tracking
AFTER INSERT OR UPDATE OR DELETE ON subcontractor_invoices
FOR EACH ROW EXECUTE FUNCTION sync_subcontractor_tracking();

DROP TRIGGER IF EXISTS client_invoice_tracking ON client_invoices;
CREATE TRIGGER client_invoice_tracking
AFTER INSERT OR UPDATE OR DELETE ON client_invoices
FOR EACH ROW EXECUTE FUNCTION sync_client_tracking();