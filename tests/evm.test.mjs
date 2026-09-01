import test from 'node:test';
import assert from 'node:assert/strict';

const evm = await import('../src/utils/evm.ts');

test('EVM uses the approved baseline and only dated contract facts', () => {
  const result = evm.calculateEvmAtDataDate({
    contractIds: ['c1'], dataDate: '2026-01-10',
    schedules: [{ id: 'a1', contract_id: 'c1', activity: 'Install', start_date: '2026-01-01', end_date: '2026-01-11', planned_quantity: 100, unit_rate: 10 }],
    scheduleDistributions: [], baselines: [{ contract_id: 'c1', status: 'Approved', revision_number: 1, activity_snapshot: [{ schedule_id: 'a1', activity_code: 'A1', activity: 'Install', start_date: '2026-01-01', end_date: '2026-01-11', duration_days: 10, planned_quantity: 100, planned_value: 1000, budget: 1000 }], distribution_snapshot: [] }],
    boqItems: [{ id: 'b1', unit_rate: 10 }],
    wirEntries: [{ contract_id: 'c1', boq_item_id: 'b1', quantity: 30, inspection_date: '2026-01-09', status: 'Approved' }, { contract_id: 'c1', boq_item_id: 'b1', quantity: 70, inspection_date: '2026-01-11', status: 'Approved' }],
    costEntries: [{ contract_id: 'c1', date: '2026-01-09', amount: 250 }, { contract_id: 'c1', date: '2026-01-11', amount: 750 }, { contract_id: null, date: '2026-01-09', amount: 999 }],
  });
  assert.equal(result.BAC, 1000);
  assert.equal(result.EV, 300);
  assert.equal(result.AC, 250);
  assert.equal(result.CV, 50);
  assert.equal(result.EAC, 833.33);
});

test('EVM rolls subcontract execution and cost to its main-contract plan once', () => {
  const result = evm.calculateEvmAtDataDate({
    contractIds: ['main'], performanceContractIds: ['main', 'sub'], dataDate: '2026-01-10',
    schedules: [{ id: 'a1', contract_id: 'main', activity: 'Main activity', start_date: '2026-01-01', end_date: '2026-01-11', planned_quantity: 100, unit_rate: 10 }],
    scheduleDistributions: [], baselines: [{ contract_id: 'main', status: 'Approved', revision_number: 1, activity_snapshot: [{ schedule_id: 'a1', activity: 'Main activity', start_date: '2026-01-01', end_date: '2026-01-11', planned_quantity: 100, planned_value: 1000, budget: 1000 }], distribution_snapshot: [] }],
    boqItems: [{ id: 'main-item', unit_rate: 10 }, { id: 'sub-item', main_boq_item_id: 'main-item', unit_rate: 7 }],
    wirEntries: [{ contract_id: 'sub', boq_item_id: 'sub-item', quantity: 20, inspection_date: '2026-01-10', status: 'Approved' }],
    costEntries: [{ contract_id: 'sub', date: '2026-01-10', amount: 90 }],
  });
  assert.equal(result.BAC, 1000, 'the subcontract must not add a second baseline budget');
  assert.equal(result.EV, 200, 'subcontract quantity is valued at the linked main BOQ rate');
  assert.equal(result.AC, 90, 'subcontract actual cost rolls to the main contract');
});
