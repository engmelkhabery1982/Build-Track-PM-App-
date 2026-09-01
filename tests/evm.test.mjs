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

test('EVM honors explicit activity measurement rules without double-counting linked WIR', () => {
  const result = evm.calculateEvmAtDataDate({
    contractIds: ['c1'], dataDate: '2026-01-10',
    schedules: [
      { id: 'q', contract_id: 'c1', activity: 'Quantity', measurement_method: 'Quantity', start_date: '2026-01-01', end_date: '2026-01-11', planned_quantity: 10, unit_rate: 10 },
      { id: 'half', contract_id: 'c1', activity: 'Start milestone', measurement_method: '50/50', actual_start_date: '2026-01-05', status_data_date: '2026-01-10', budget: 200, start_date: '2026-01-01', end_date: '2026-01-11' },
      { id: 'done', contract_id: 'c1', activity: 'Done', measurement_method: '0/100', activity_status: 'Completed', actual_finish_date: '2026-01-09', budget: 300, start_date: '2026-01-01', end_date: '2026-01-11' },
    ], scheduleDistributions: [], baselines: [], boqItems: [{ id: 'b1', unit_rate: 10 }],
    wirEntries: [{ contract_id: 'c1', schedule_id: 'q', boq_item_id: 'b1', quantity: 10, inspection_date: '2026-01-09', status: 'Approved' }], costEntries: [],
  });
  assert.equal(result.EV, 500);
});

test('EVM applies posted progress reversals in their effective reporting period without rewriting the WIR', () => {
  const beforeCorrection = evm.calculateEvmAtDataDate({
    contractIds: ['c1'], dataDate: '2026-02-10', schedules: [], scheduleDistributions: [], baselines: [],
    boqItems: [{ id: 'b1', unit_rate: 10 }],
    wirEntries: [{ id: 'wir1', contract_id: 'c1', boq_item_id: 'b1', quantity: 40, inspection_date: '2026-01-20', status: 'Approved' }],
    progressCorrections: [{ original_wir_id: 'wir1', correction_type: 'Reversal', quantity: 15, effective_date: '2026-02-15', status: 'Posted' }], costEntries: [],
  });
  const afterCorrection = evm.calculateEvmAtDataDate({
    contractIds: ['c1'], dataDate: '2026-02-20', schedules: [], scheduleDistributions: [], baselines: [],
    boqItems: [{ id: 'b1', unit_rate: 10 }],
    wirEntries: [{ id: 'wir1', contract_id: 'c1', boq_item_id: 'b1', quantity: 40, inspection_date: '2026-01-20', status: 'Approved' }],
    progressCorrections: [{ original_wir_id: 'wir1', correction_type: 'Reversal', quantity: 15, effective_date: '2026-02-15', status: 'Posted' }], costEntries: [],
  });
  assert.equal(beforeCorrection.EV, 400);
  assert.equal(afterCorrection.EV, 250);
});
