-- Phase 1: contract_number is the single business code for contracts.
-- Preserve existing data before retiring the duplicate Phase 1A contract_code field.

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_number_locked boolean NOT NULL DEFAULT false;

UPDATE contracts
SET contract_number = contract_code
WHERE COALESCE(BTRIM(contract_number), '') = ''
  AND COALESCE(BTRIM(contract_code), '') <> '';

UPDATE contracts
SET contract_number_locked = contract_code_locked
WHERE contract_code_locked = true;

CREATE INDEX IF NOT EXISTS idx_contracts_contract_number ON contracts(contract_number);

ALTER TABLE contracts DROP COLUMN IF EXISTS contract_code_locked;
ALTER TABLE contracts DROP COLUMN IF EXISTS contract_code;
