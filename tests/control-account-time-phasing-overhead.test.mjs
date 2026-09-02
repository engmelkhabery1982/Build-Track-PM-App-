import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateControlAccountSummary, calculateControlAccountPeriodicProfile, calculateControlAccountLoadedCost } from '../src/utils/controlAccountSummary.ts';
import { calculateOverheadAllocation } from '../src/utils/overheadAllocation.ts';

test('Control Account periodic profile tracks time-phased planned value, EV, AC and commitments across periods', () => {
  const account = { id: 'ca1', contract_id: 'main', boq_item_id: 'b1', contract_sov_line_id: 's1', data_date: '2026-06-30' };
  const periods = [
    { period_name: 'May 2026', start_date: '2026-05-01', end_date: '2026-05-31' },
    { period_name: 'Jun 2026', start_date: '2026-06-01', end_date: '2026-06-30' },
    { period_name: 'Jul 2026', start_date: '2026-07-01', end_date: '2026-07-31' },
  ];
  const baselines = [{ id: 'bl1', contract_id: 'main', status: 'Approved' }];
  const schedules = [{
    id: 'sch1', control_account_id: 'ca1', budget: 1000, start_date: '2026-05-01', end_date: '2026-07-31',
  }];
  const scheduleDistributions = [
    { schedule_id: 'sch1', period_start: '2026-05-01', period_end: '2026-05-31', planned_value: 300 },
    { schedule_id: 'sch1', period_start: '2026-06-01', period_end: '2026-06-30', planned_value: 400 },
    { schedule_id: 'sch1', period_start: '2026-07-01', period_end: '2026-07-31', planned_value: 300 },
  ];
  const wirEntries = [
    { control_account_id: 'ca1', result: 'Pass', inspection_date: '2026-05-15', quantity: 20, unit_price: 10 }, // 200 EV
    { control_account_id: 'ca1', result: 'Pass', inspection_date: '2026-06-20', quantity: 25, unit_price: 10 }, // 250 EV (cum 450)
    { control_account_id: 'ca1', result: 'Pass', inspection_date: '2026-07-15', quantity: 30, unit_price: 10 }, // future (after data date 2026-06-30)
  ];
  const costEntries = [
    { control_account_id: 'ca1', date: '2026-05-20', amount: 180 },
    { control_account_id: 'ca1', date: '2026-06-25', amount: 220 },
    { control_account_id: 'ca1', date: '2026-07-10', amount: 300 }, // future
  ];
  const procurement = [
    { control_account_id: 'ca1', status: 'Ordered', order_date: '2026-05-10', total_cost: 600 },
  ];
  const procurementReceipts = [
    { id: 'r1', control_account_id: 'ca1', status: 'Accepted', receipt_date: '2026-06-15', accepted_amount: 200 },
  ];

  const profile = calculateControlAccountPeriodicProfile({
    account,
    periods,
    boqItems: [{ id: 'b1', quantity: 100 }],
    sovLines: [{ id: 's1', revised_budget: 1000 }],
    schedules,
    scheduleDistributions,
    baselines,
    wirEntries,
    costEntries,
    procurement,
    procurementReceipts,
  });

  assert.equal(profile.length, 3);

  // Period 1 (May 2026)
  assert.equal(profile[0].period_name, 'May 2026');
  assert.equal(profile[0].planned_value, 300);
  assert.equal(profile[0].cumulative_planned_value, 300);
  assert.equal(profile[0].earned_value, 200);
  assert.equal(profile[0].cumulative_earned_value, 200);
  assert.equal(profile[0].actual_cost, 180);
  assert.equal(profile[0].cumulative_actual_cost, 180);
  assert.equal(profile[0].is_future_period, false);

  // Period 2 (Jun 2026 - Cutoff Data Date)
  assert.equal(profile[1].period_name, 'Jun 2026');
  assert.equal(profile[1].planned_value, 400);
  assert.equal(profile[1].cumulative_planned_value, 700);
  assert.equal(profile[1].earned_value, 250);
  assert.equal(profile[1].cumulative_earned_value, 450);
  assert.equal(profile[1].actual_cost, 420); // 220 direct + 200 missing receipt actual
  assert.equal(profile[1].cumulative_actual_cost, 600); // 180 + 420
  assert.equal(profile[1].open_commitment, 400); // 600 PO - 200 GRN
  assert.equal(profile[1].is_future_period, false);

  // Period 3 (Jul 2026 - Future beyond Data Date)
  assert.equal(profile[2].period_name, 'Jul 2026');
  assert.equal(profile[2].planned_value, 300);
  assert.equal(profile[2].cumulative_planned_value, 1000);
  assert.equal(profile[2].earned_value, 0); // Not earned yet because dataDate is 2026-06-30
  assert.equal(profile[2].cumulative_earned_value, 450);
  assert.equal(profile[2].actual_cost, 0);
  assert.equal(profile[2].cumulative_actual_cost, 600);
  assert.equal(profile[2].is_future_period, true);
});

test('Overhead Allocation distributes indirect expense across direct control accounts by Direct Cost', () => {
  const result = calculateOverheadAllocation({
    source: { id: 'ca-ind', code: 'CA-IND-01', name: 'Site Preliminaries & Supervision', amount: 10000 },
    targets: [
      { id: 'ca-dir-1', code: 'CA-CIVIL', name: 'Civil Works', directCost: 60000 },
      { id: 'ca-dir-2', code: 'CA-MEP', name: 'MEP Works', directCost: 30000 },
      { id: 'ca-dir-3', code: 'CA-FINISH', name: 'Finishing Works', directCost: 10000 },
    ],
    basis: 'Direct Cost',
  });

  assert.equal(result.totalSourceOverhead, 10000);
  assert.equal(result.totalAllocated, 10000);
  assert.equal(result.isFullyAllocated, true);
  assert.equal(result.unallocatedAmount, 0);

  assert.deepEqual(result.allocations, [
    { targetAccountId: 'ca-dir-1', targetCode: 'CA-CIVIL', targetName: 'Civil Works', basisValue: 60000, allocationPercentage: 60, allocatedAmount: 6000 },
    { targetAccountId: 'ca-dir-2', targetCode: 'CA-MEP', targetName: 'MEP Works', basisValue: 30000, allocationPercentage: 30, allocatedAmount: 3000 },
    { targetAccountId: 'ca-dir-3', targetCode: 'CA-FINISH', targetName: 'Finishing Works', basisValue: 10000, allocationPercentage: 10, allocatedAmount: 1000 },
  ]);
});

test('Overhead Allocation reconciles penny rounding differences exactly', () => {
  const result = calculateOverheadAllocation({
    source: { id: 'ca-ind', code: 'CA-OVERHEAD', name: 'Overhead Pool', amount: 100 },
    targets: [
      { id: 'ca-1', code: 'CA-1', directCost: 10 },
      { id: 'ca-2', code: 'CA-2', directCost: 10 },
      { id: 'ca-3', code: 'CA-3', directCost: 10 },
    ],
    basis: 'Direct Cost',
  });

  assert.equal(result.totalAllocated, 100);
  assert.equal(result.isFullyAllocated, true);
  // Total of 33.33 + 33.33 + 33.34 = 100.00
  const sum = result.allocations.reduce((s, a) => s + a.allocatedAmount, 0);
  assert.equal(sum, 100);
});

test('Overhead Allocation handles zero-denominator safely by falling back to uniform distribution', () => {
  const result = calculateOverheadAllocation({
    source: { id: 'ca-ind', code: 'CA-OVERHEAD', amount: 3000 },
    targets: [
      { id: 'ca-1', directCost: 0 },
      { id: 'ca-2', directCost: 0 },
      { id: 'ca-3', directCost: 0 },
    ],
    basis: 'Direct Cost',
  });

  assert.equal(result.totalAllocated, 3000);
  assert.equal(result.allocations[0].allocatedAmount, 1000);
  assert.equal(result.allocations[1].allocatedAmount, 1000);
  assert.equal(result.allocations[2].allocatedAmount, 1000);
});

test('Control Account loaded cost calculates direct and overhead-loaded actuals and FAC', () => {
  const directSummary = { actual_cost: 50000, forecast_at_completion: 80000 };
  const loaded = calculateControlAccountLoadedCost(directSummary, 5000);

  assert.deepEqual(loaded, {
    direct_actual_cost: 50000,
    allocated_overhead: 5000,
    loaded_actual_cost: 55000,
    direct_forecast_at_completion: 80000,
    loaded_forecast_at_completion: 85000,
    loaded_cost_to_complete: 30000,
  });
});
