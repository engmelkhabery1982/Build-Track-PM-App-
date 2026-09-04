import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateEarnedSchedule } from '../src/utils/earnedSchedule.ts';

test('SCH-06: Behind schedule calculation (ES < AT, SPI_t < 1.0)', () => {
  const pv = [0, 100, 200, 300, 400];
  const result = calculateEarnedSchedule({
    actualTime: 3,
    earnedValue: 150,
    cumulativePlannedValues: pv,
  });

  assert.equal(result.earnedSchedule, 1.5);
  assert.equal(result.timeScheduleVariance, -1.5);
  assert.equal(result.timeSchedulePerformanceIndex, 0.5);
  assert.equal(result.status, 'behind');
});

test('SCH-06: Ahead of schedule calculation (ES > AT, SPI_t > 1.0)', () => {
  const pv = [0, 100, 200, 300, 400];
  const result = calculateEarnedSchedule({
    actualTime: 1,
    earnedValue: 250,
    cumulativePlannedValues: pv,
  });

  assert.equal(result.earnedSchedule, 2.5);
  assert.equal(result.timeScheduleVariance, 1.5);
  assert.equal(result.timeSchedulePerformanceIndex, 2.5);
  assert.equal(result.status, 'ahead');
});

test('SCH-06: Edge case - Zero progress with elapsed time', () => {
  const pv = [0, 100, 200, 300, 400];
  const result = calculateEarnedSchedule({
    actualTime: 2,
    earnedValue: 0,
    cumulativePlannedValues: pv,
  });

  assert.equal(result.earnedSchedule, 0);
  assert.equal(result.timeScheduleVariance, -2);
  assert.equal(result.timeSchedulePerformanceIndex, 0);
  assert.equal(result.status, 'behind');
});
