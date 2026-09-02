import test from 'node:test';
import assert from 'node:assert/strict';

const baseline = await import('../src/data/baselineGovernance.ts');

test('baseline/current/forecast comparison keeps the three schedule states separate', () => {
  const snapshot = [{
    schedule_id: 'activity-1', activity_code: 'EC1000', activity: 'Excavation',
    boq_item_id: 'boq-1', start_date: '2026-01-01', end_date: '2026-01-10', duration_days: 9,
    planned_quantity: 100, planned_value: 1000, budget: 1000, calendar_name: 'Calendar Days',
    critical_path: false, predecessor_links: [],
  }];
  const current = [{
    id: 'activity-1', activity_code: 'EC1000', activity: 'Excavation',
    start_date: '2026-01-02', end_date: '2026-01-12', duration_days: 10,
    planned_quantity: 100, budget: 1000, calendar_name: 'Calendar Days', critical_path: false,
    predecessor_links: [],
  }];
  const forecast = [{ activity_code: 'EC1000', forecast_start_date: '2026-01-03', forecast_end_date: '2026-01-14', network_critical: true }];

  const [row] = baseline.compareBaselineCurrentForecastActivityDetails(snapshot, current, forecast);

  assert.equal(row.activityCode, 'EC1000');
  assert.equal(row.baselineEndDate, '2026-01-10');
  assert.equal(row.currentEndDate, '2026-01-12');
  assert.equal(row.forecastEndDate, '2026-01-14');
  assert.equal(row.forecastFinishVarianceDays, 4);
  assert.equal(row.forecastCritical, true);
  assert.equal(row.forecastAvailability, 'Available');
  assert.equal(snapshot[0].end_date, '2026-01-10', 'comparison must not mutate the approved baseline');
  assert.equal(current[0].end_date, '2026-01-12', 'comparison must not mutate the current plan');
});

test('baseline/current/forecast comparison declares missing CPM forecast rather than inventing it', () => {
  const current = [{ id: 'activity-2', activity_code: 'EC2000', activity: 'Concrete', start_date: '2026-02-01', end_date: '2026-02-05', duration_days: 4 }];
  const [row] = baseline.compareBaselineCurrentForecastActivityDetails([], current, []);

  assert.equal(row.status, 'Added');
  assert.equal(row.forecastAvailability, 'Unavailable');
  assert.equal(row.forecastStartDate, null);
  assert.equal(row.forecastEndDate, null);
  assert.equal(row.forecastFinishVarianceDays, null);
  assert.equal(row.forecastCritical, null);
});
