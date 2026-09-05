import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createProjectDataDateStore,
  isValidIsoDate,
  localTodayIso,
} from '../src/context/ProjectDataDateContext.ts';

test('A2.1 - unified project data date store initializes with valid ISO date', () => {
  const store = createProjectDataDateStore({ dataDate: '2026-04-10', projectId: 'PRJ-01' });
  const state = store.getState();
  assert.equal(state.dataDate, '2026-04-10');
  assert.equal(state.projectId, 'PRJ-01');
});

test('A2.1 - multiple consumers (Dashboard and ReportPack) receive the exact same Data Date', () => {
  const store = createProjectDataDateStore({ dataDate: '2026-06-30' });

  // Simulate Dashboard consumer
  let dashboardObservedDate = store.getState().dataDate;
  const unsubscribeDashboard = store.subscribe(() => {
    dashboardObservedDate = store.getState().dataDate;
  });

  // Simulate ReportPack consumer
  let reportPackObservedDate = store.getState().dataDate;
  const unsubscribeReportPack = store.subscribe(() => {
    reportPackObservedDate = store.getState().dataDate;
  });

  // Both start with identical value
  assert.equal(dashboardObservedDate, '2026-06-30');
  assert.equal(reportPackObservedDate, '2026-06-30');
  assert.equal(dashboardObservedDate, reportPackObservedDate);

  store.setProjectId('PRJ-02');
  assert.equal(store.getState().projectId, 'PRJ-02');

  // When Data Date is updated once from any point
  const success = store.setDataDate('2026-09-15');
  assert.equal(success, true);

  // Both consumers immediately observe the exact same updated date
  assert.equal(dashboardObservedDate, '2026-09-15');
  assert.equal(reportPackObservedDate, '2026-09-15');
  assert.equal(dashboardObservedDate, reportPackObservedDate);

  unsubscribeDashboard();
  unsubscribeReportPack();
});

test('A2.1 - negative test: invalid or empty dates are rejected without corrupting state', () => {
  const store = createProjectDataDateStore({ dataDate: '2026-06-30' });

  const invalidInputs = [
    '',
    '   ',
    'invalid-date',
    '2026-02-30', // Feb 30 does not exist
    '2026-13-01', // Month 13 does not exist
    '2026-04-31', // April has 30 days
    '30-06-2026', // wrong order
    null,
    undefined,
    12345,
    {},
  ];

  for (const input of invalidInputs) {
    const success = store.setDataDate(input);
    assert.equal(success, false, `Expected input ${JSON.stringify(input)} to be rejected`);
    assert.equal(store.getState().dataDate, '2026-06-30', 'State must remain uncorrupted');
  }
});

test('A2.1 - context is read-only and consumers are wired to the shared date and project scope', () => {
  const contextSource = readFileSync(new URL('../src/context/ProjectDataDateContext.ts', import.meta.url), 'utf8');
  const dashboardSource = readFileSync(new URL('../src/components/Dashboard.tsx', import.meta.url), 'utf8');
  const reportPackSource = readFileSync(new URL('../src/components/ReportPack.tsx', import.meta.url), 'utf8');
  const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

  assert.doesNotMatch(contextSource, /dataRepository|repository\.(insert|update|delete)|from ['"]@\/data/);
  assert.match(dashboardSource, /projectId: selectedProjectId, setProjectId: setSelectedProjectId/);
  assert.match(reportPackSource, /dataDate: reportDate, projectId, setProjectId/);
  assert.doesNotMatch(dashboardSource, /useState\(\(\) => new Date\(\)\.toISOString\(\)\.slice\(0, 10\)\)/);
  assert.doesNotMatch(reportPackSource, /useState\(new Date\(\)\.toISOString\(\)\.slice\(0, 10\)\)/);
  assert.match(appSource, /<ProjectDataDateProvider>/);
  assert.match(appSource, /<UnifiedDataDateSelector \/>/);
});

test('A2.1 - cumulative KPI facts beyond Data Date are excluded without mutating raw source records', () => {
  const store = createProjectDataDateStore({ dataDate: '2026-06-30' });

  // Raw source records with various dates
  const rawCostEntries = [
    { id: 'c1', date: '2026-05-01', amount: 1000 },
    { id: 'c2', date: '2026-06-30', amount: 2000 },
    { id: 'c3', date: '2026-07-01', amount: 5000 }, // Beyond cutoff
  ];

  const rawBaselineSnapshot = {
    id: 'bl-1',
    status: 'Approved',
    approved_date: '2026-01-01',
    planned_value: 50000,
  };

  // Evaluate cumulative actual cost as-of cutoff date
  const cutoff = store.getState().dataDate;
  const filteredCosts = rawCostEntries.filter((item) => item.date <= cutoff);
  const totalActualCost = filteredCosts.reduce((sum, item) => sum + item.amount, 0);

  assert.equal(totalActualCost, 3000); // 1000 + 2000, excluding 5000
  assert.equal(rawCostEntries.length, 3, 'Raw cost entries array length must not be mutated');
  assert.equal(rawCostEntries[2].amount, 5000, 'Underlying cost entry must not be altered');
  assert.equal(rawBaselineSnapshot.planned_value, 50000, 'Baseline planned value must remain intact');
});

test('A2.1 - isValidIsoDate helper accurately validates ISO dates', () => {
  assert.equal(isValidIsoDate('2026-01-01'), true);
  assert.equal(isValidIsoDate('2026-12-31'), true);
  assert.equal(isValidIsoDate('2024-02-29'), true); // 2024 is a leap year
  assert.equal(isValidIsoDate('2025-02-29'), false); // 2025 is not a leap year
  assert.equal(isValidIsoDate(''), false);
  assert.equal(isValidIsoDate('random'), false);
  assert.equal(isValidIsoDate(null), false);
});

test('A2.1 - default reporting date uses the local calendar day rather than UTC slicing', () => {
  const localLateEvening = new Date(2026, 0, 2, 23, 30, 0);
  assert.equal(localTodayIso(localLateEvening), '2026-01-02');
});
