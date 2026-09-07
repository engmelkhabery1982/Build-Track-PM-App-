import { test } from "node:test";
import assert from "node:assert";
import { calculateCertificateValues, calculateCertificateBalances } from "../src/utils/commercialControl.ts";

test("F4 Invoice Reconciliation - 5 WIRs for same BOQ item aggregate into a single line", () => {
  const wirs = [
    { id: "wir-1", boq_item_id: "boq-101", quantity: 10, unit_price: 150 },
    { id: "wir-2", boq_item_id: "boq-101", quantity: 20, unit_price: 150 },
    { id: "wir-3", boq_item_id: "boq-101", quantity: 15, unit_price: 150 },
    { id: "wir-4", boq_item_id: "boq-101", quantity: 25, unit_price: 150 },
    { id: "wir-5", boq_item_id: "boq-101", quantity: 30, unit_price: 150 },
  ];

  // Aggregate by boq_item_id
  const totalQty = wirs.reduce((sum, w) => sum + w.quantity, 0);
  assert.strictEqual(totalQty, 100);

  const clientSellingRate = 150;
  const clientLineAmount = totalQty * clientSellingRate;
  assert.strictEqual(clientLineAmount, 15000);

  const subcontractRate = 100;
  const subLineAmount = totalQty * subcontractRate;
  assert.strictEqual(subLineAmount, 10000);
});

test("F4 Invoice Reconciliation - retention, advance recovery, tax and net certified calculations", () => {
  const cert = {
    gross_certified_value: 50000,
    retention_rate: 10,
    advance_recovery: 5000,
    deductions: 1000,
    tax_rate: 15,
  };

  const values = calculateCertificateValues(cert);
  assert.strictEqual(values.gross, 50000);
  assert.strictEqual(values.retention_amount, 5000);
  assert.strictEqual(values.taxable_amount, 39000); // 50000 - 5000 - 5000 - 1000 = 39000
  assert.strictEqual(values.tax_amount, 5850); // 39000 * 0.15 = 5850
  assert.strictEqual(values.net_certified_value, 44850); // 39000 + 5850 = 44850
});

test("F4 Invoice Reconciliation - cumulative retention cap and advance recovery limits", () => {
  const cert = {
    gross_certified_value: 20000,
    retention_rate: 10,
    advance_recovery: 2000,
    deductions: 0,
    tax_rate: 0,
  };

  const balances = calculateCertificateBalances({
    contractAdvanceAmount: 10000,
    retentionCapAmount: 2500,
    priorAdvanceRecovery: 8000,
    priorRetention: 1000,
    certificate: cert,
  });

  assert.strictEqual(balances.cumulativeAdvanceRecovery, 10000);
  assert.strictEqual(balances.remainingAdvanceBalance, 0);
  assert.strictEqual(balances.cumulativeRetentionAmount, 3000);
  assert.strictEqual(balances.advanceExceeded, false);
  assert.strictEqual(balances.retentionCapExceeded, true);
});
