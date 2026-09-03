import { strict as assert } from 'assert';
import { calculateGanttOverlay } from '../src/utils/calculations.ts';

console.log('Running Gantt Overlay 3-Way Engine Tests...');

const sampleActivities = [
  {
    id: 'ACT-001', name: 'Foundation Works',
    baselineStart: '2026-01-01', baselineFinish: '2026-02-01',
    actualStart: '2026-01-01', actualFinish: '2026-02-01', forecastFinish: '2026-02-01',
    totalFloat: 0, isCritical: true, progressPct: 100
  },
  {
    id: 'ACT-002', name: 'Columns Erection',
    baselineStart: '2026-02-02', baselineFinish: '2026-03-01',
    forecastFinish: '2026-03-15', totalFloat: 0, isCritical: true, progressPct: 40
  },
  {
    id: 'ACT-003', name: 'Electrical Conduit',
    baselineStart: '2026-03-02', baselineFinish: '2026-04-01',
    forecastFinish: '2026-04-10', totalFloat: 20, isCritical: false, progressPct: 10
  },
  {
    id: 'ACT-004', name: 'HVAC Ducting',
    baselineStart: '2026-04-02', baselineFinish: '2026-05-01',
    forecastFinish: '2026-04-25', totalFloat: 10, isCritical: false, progressPct: 0
  }
];

const summary = calculateGanttOverlay({ activities: sampleActivities });

console.log('Test 1: Verify Completed Activity (ACT-001)');
assert.equal(summary.activities[0].status, 'COMPLETED');
assert.equal(summary.completedCount, 1);
console.log('? Test 1 passed');

console.log('Test 2: Verify Critical Delayed Activity (ACT-002: 14 days delay on CP)');
assert.equal(summary.activities[1].status, 'DELAYED_CRITICAL');
assert.equal(summary.activities[1].finishSlippageDays, 14);
assert.equal(summary.criticalDelayedCount, 1);
console.log('? Test 2 passed');

console.log('Test 3: Verify Non-Critical Delayed Activity (ACT-003: 9 days delay with float 20)');
assert.equal(summary.activities[2].status, 'DELAYED_NON_CRITICAL');
assert.equal(summary.activities[2].finishSlippageDays, 9);
assert.equal(summary.nonCriticalDelayedCount, 1);
console.log('? Test 3 passed');

console.log('Test 4: Verify Ahead Activity (ACT-004: finishes 6 days early)');
assert.equal(summary.activities[3].status, 'AHEAD');
assert.equal(summary.activities[3].finishSlippageDays, -6);
assert.equal(summary.aheadCount, 1);
console.log('? Test 4 passed');

console.log('Test 5: Max project slippage verification');
assert.equal(summary.maxSlippageDays, 14);
assert.equal(summary.totalActivities, 4);
console.log('? Test 5 passed');

console.log('All Gantt Overlay 3-Way tests passed successfully!');
