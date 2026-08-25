import test from 'node:test';
import assert from 'node:assert/strict';

import { contractScheduleWirReference, validAcceptanceSource } from './fixtures/contractScheduleWirAcceptance20260825.mjs';

const contractRules = await import('../src/data/contractRules.ts');
const contractScope = await import('../src/data/contractScope.ts');
const governance = await import('../src/data/governanceRules.ts');
const quality = await import('../src/data/dataQuality.ts');
const cpm = await import('../src/utils/cpm.ts');
const schedule = await import('../src/utils/schedulePlanning.ts');

test('acceptance contract hierarchy keeps subcontract progress and finance under its main contract', () => {
  const { mainContract, subcontract } = contractScheduleWirReference;
  assert.deepEqual(contractRules.selectPrimaryContracts([mainContract, subcontract]), [mainContract]);
  assert.equal(contractScope.getMainContractId(subcontract.id, [mainContract, subcontract]), mainContract.id);
  assert.equal(contractScope.getMainContractId(mainContract.id, [mainContract, subcontract]), mainContract.id);
});

test('acceptance data rejects cross-project subcontract, BOQ, activity and WIR scope', () => {
  const source = validAcceptanceSource();
  source.contracts[1].project_id = contractScheduleWirReference.otherProject.id;
  source.schedules[1].project_id = contractScheduleWirReference.otherProject.id;
  source.wirEntries[0].project_id = contractScheduleWirReference.otherProject.id;
  const titles = quality.runDataQualityChecks(source).map((finding) => finding.title);
  assert.ok(titles.includes('Invalid subcontract hierarchy'));
  assert.ok(titles.includes('Schedule relationship mismatch'));
  assert.ok(titles.includes('Field register relationship mismatch'));
});

test('acceptance schedule quantities consume exactly the main BOQ quantity and identify an over-plan', () => {
  const validTitles = quality.runDataQualityChecks(validAcceptanceSource()).map((finding) => finding.title);
  assert.ok(!validTitles.includes('Planned quantities exceed BOQ'));

  const overPlanned = validAcceptanceSource();
  overPlanned.schedules[1].planned_quantity = 601;
  const invalidTitles = quality.runDataQualityChecks(overPlanned).map((finding) => finding.title);
  assert.ok(invalidTitles.includes('Planned quantities exceed BOQ'));
});

test('acceptance WIR quantities allow governed work and reject an accepted total above the BOQ quantity', () => {
  const validTitles = quality.runDataQualityChecks(validAcceptanceSource()).map((finding) => finding.title);
  assert.ok(!validTitles.includes('Measured quantities exceed BOQ'));

  const overMeasured = validAcceptanceSource();
  overMeasured.wirEntries.push({
    ...contractScheduleWirReference.acceptedWir,
    id: 'wir-02', inspection_date: '2026-01-13', quantity: 651,
  });
  const invalidTitles = quality.runDataQualityChecks(overMeasured).map((finding) => finding.title);
  assert.ok(invalidTitles.includes('Measured quantities exceed BOQ'));
});

test('acceptance CPM honors predecessor relationship type, lag, and detects a logic cycle', () => {
  const network = cpm.calculateCpm(contractScheduleWirReference.activities);
  assert.equal(network.get('act-01').earlyFinish, 5);
  assert.equal(network.get('act-02').earlyStart, 7, 'FS successor starts after predecessor duration plus two-day lag');

  const relationshipNetwork = cpm.calculateCpm([
    { id: 'A', duration_days: 5 },
    { id: 'SS', duration_days: 2, predecessor_item: 'A', relationship_type: 'SS', lag_days: 3 },
    { id: 'FF', duration_days: 2, predecessor_item: 'A', relationship_type: 'FF', lag_days: 1 },
    { id: 'SF', duration_days: 2, predecessor_item: 'A', relationship_type: 'SF', lag_days: 4 },
  ]);
  assert.equal(relationshipNetwork.get('SS').earlyStart, 3);
  assert.equal(relationshipNetwork.get('FF').earlyStart, 4);
  assert.equal(relationshipNetwork.get('SF').earlyStart, 2);

  const cyclic = cpm.calculateCpm([
    { id: 'X', duration_days: 1, predecessor_item: 'Y', relationship_type: 'FS' },
    { id: 'Y', duration_days: 1, predecessor_item: 'X', relationship_type: 'FS' },
  ]);
  assert.equal(cyclic.get('X').cycle, true);
  assert.equal(cyclic.get('Y').cycle, true);
});

test('approved time-impact variation has a governed financial value and an explicit revised completion expectation', () => {
  const { mainContract, approvedVariation } = contractScheduleWirReference;
  assert.doesNotThrow(() => governance.assertRecordGovernance('variations', approvedVariation));
  assert.equal(mainContract.contract_value + approvedVariation.cost_impact, 1_125_000);
  assert.equal(schedule.addCalendarDays(mainContract.end_date, approvedVariation.time_impact_days), '2026-07-14');
  assert.throws(() => governance.assertRecordGovernance('variations', { start_date: '2026-02-16', end_date: '2026-02-15' }), /earlier than start/i);
});
