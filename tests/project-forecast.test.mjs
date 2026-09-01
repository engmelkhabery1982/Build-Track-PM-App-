import test from 'node:test';
import assert from 'node:assert/strict';

const forecast = await import('../src/utils/projectForecast.ts');

test('portfolio finish uses CPM forecast before planned finish', () => {
  const result = forecast.deriveContractForecastFinish([
    { contract_id: 'c1', activity: 'A', end_date: '2026-04-10', forecast_end_date: '2026-04-15' },
    { contract_id: 'c1', activity: 'B', end_date: '2026-04-20', forecast_end_date: '2026-04-18' },
    { contract_id: 'other', activity: 'Other', end_date: '2030-01-01', forecast_end_date: '2030-01-01' },
  ], 'c1');
  assert.deepEqual(result, { date: '2026-04-18', source: 'CPM Forecast' });
});

test('portfolio makes its planned fallback explicit when CPM is unavailable', () => {
  const result = forecast.deriveContractForecastFinish([
    { contract_id: 'c1', activity: 'A', end_date: '2026-04-10' },
  ], 'c1');
  assert.deepEqual(result, { date: '2026-04-10', source: 'Planned fallback' });
});
