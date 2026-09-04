-- Phase 1 additive changes only: preserve all existing columns and records.
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_code_locked boolean NOT NULL DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_contract_type text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS company_contract_type text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS parent_main_project_id uuid;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS last_modified timestamptz NOT NULL DEFAULT now();

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_code text;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client text;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_contract_type text;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS company_contract_type text;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS parent_main_contract_id uuid;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS document_reference text;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_code_locked boolean NOT NULL DEFAULT false;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS last_modified timestamptz NOT NULL DEFAULT now();

ALTER TABLE boq_headers ADD COLUMN IF NOT EXISTS contract_id uuid;
ALTER TABLE boq_headers ADD COLUMN IF NOT EXISTS boq_code_locked boolean NOT NULL DEFAULT false;
ALTER TABLE boq_headers ADD COLUMN IF NOT EXISTS last_modified timestamptz NOT NULL DEFAULT now();

ALTER TABLE boq_items ADD COLUMN IF NOT EXISTS boq_header_id uuid;
ALTER TABLE boq_items ADD COLUMN IF NOT EXISTS item_code_locked boolean NOT NULL DEFAULT false;
ALTER TABLE boq_items ADD COLUMN IF NOT EXISTS last_modified timestamptz NOT NULL DEFAULT now();

ALTER TABLE wir_entries ADD COLUMN IF NOT EXISTS last_modified timestamptz NOT NULL DEFAULT now();
ALTER TABLE progress_entries ADD COLUMN IF NOT EXISTS last_modified timestamptz NOT NULL DEFAULT now();
ALTER TABLE costs ADD COLUMN IF NOT EXISTS last_modified timestamptz NOT NULL DEFAULT now();
ALTER TABLE cost_entries ADD COLUMN IF NOT EXISTS last_modified timestamptz NOT NULL DEFAULT now();

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'projects_parent_main_project_id_fkey') THEN
    ALTER TABLE projects ADD CONSTRAINT projects_parent_main_project_id_fkey FOREIGN KEY (parent_main_project_id) REFERENCES projects(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contracts_parent_main_contract_id_fkey') THEN
    ALTER TABLE contracts ADD CONSTRAINT contracts_parent_main_contract_id_fkey FOREIGN KEY (parent_main_contract_id) REFERENCES contracts(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'boq_headers_contract_id_fkey') THEN
    ALTER TABLE boq_headers ADD CONSTRAINT boq_headers_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES contracts(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'boq_items_boq_header_id_fkey') THEN
    ALTER TABLE boq_items ADD CONSTRAINT boq_items_boq_header_id_fkey FOREIGN KEY (boq_header_id) REFERENCES boq_headers(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_projects_project_code ON projects(project_code);
CREATE INDEX IF NOT EXISTS idx_contracts_contract_code ON contracts(contract_code);
CREATE INDEX IF NOT EXISTS idx_boq_headers_boq_code ON boq_headers(boq_code);
CREATE INDEX IF NOT EXISTS idx_boq_items_boq_header_id ON boq_items(boq_header_id);

CREATE OR REPLACE FUNCTION set_phase1_last_modified()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.last_modified = now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['projects','contracts','boq_headers','boq_items','wir_entries','progress_entries','costs','cost_entries'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', 'set_' || t || '_last_modified', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_phase1_last_modified()', 'set_' || t || '_last_modified', t);
  END LOOP;
END $$;