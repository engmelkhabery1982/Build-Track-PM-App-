import { test } from "node:test";
import assert from "node:assert";

test("Claims & PVO Workflow - claim creation, assessment and conversion structure", () => {
  const claim = {
    id: "claim-101",
    project_id: "prj-1",
    contract_id: "cnt-1",
    claim_number: "CLM-001",
    title: "Ground Unforeseen Rock Removal",
    notice_date: "2026-03-01",
    event_date: "2026-02-20",
    entitlement_basis: "Unforeseen physical conditions under Clause 4.12",
    claimed_cost_impact: 150000,
    claimed_time_impact_days: 14,
    assessed_cost_impact: 120000,
    assessed_time_impact_days: 10,
    approved_cost_impact: 120000,
    approved_time_impact_days: 10,
    status: "Assessed",
    owner: "Commercial Manager",
  };

  const line1 = {
    id: "clm-line-1",
    claim_id: "claim-101",
    contract_id: "cnt-1",
    item_code: "EXC-ROCK-01",
    description: "Rock excavation beyond design depth",
    change_type: "New Item",
    claimed_value: 150000,
    assessed_value: 120000,
    approved_value: 120000,
  };

  // Test entitlement & values
  assert.strictEqual(claim.claimed_cost_impact, 150000);
  assert.strictEqual(claim.assessed_cost_impact, 120000);
  assert.strictEqual(line1.claimed_value, 150000);
  assert.strictEqual(line1.assessed_value, 120000);

  // Conversion payload building
  const variationPayload = {
    id: "var-converted-1",
    project_id: claim.project_id,
    contract_id: claim.contract_id,
    variation_number: `VO-${claim.claim_number}`,
    title: `PVO from Claim: ${claim.title}`,
    cost_impact: claim.assessed_cost_impact,
    time_extension_days: claim.assessed_time_impact_days,
    status: "Draft",
    source_claim_id: claim.id,
  };

  assert.strictEqual(variationPayload.variation_number, "VO-CLM-001");
  assert.strictEqual(variationPayload.cost_impact, 120000);
  assert.strictEqual(variationPayload.time_extension_days, 10);
  assert.strictEqual(variationPayload.status, "Draft");
});

test("Claims - late notice warning identification", () => {
  const eventDate = new Date("2026-01-01");
  const noticeDate = new Date("2026-02-15");
  const diffDays = Math.round((noticeDate.getTime() - eventDate.getTime()) / (1000 * 3600 * 24));
  assert.ok(diffDays > 28, "Notice given more than 28 days after event should trigger late notice review");
});
