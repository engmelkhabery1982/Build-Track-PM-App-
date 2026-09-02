import { strict as assert } from 'assert';
import { distributeCostTimePhased } from '../src/utils/calculations.ts';

console.log('Running Time-Phased Cost Phasing Tests...\n');

// Test 1: Linear distribution across 6 periods ($60,000 total = $10,000 per period)
console.log('Test 1: Linear distribution across 6 periods ($60,000 total)');

const linearResult = distributeCostTimePhased({
  totalCost: 60000,
  periodsCount: 6,
  curveType: 'linear',
  periodDates: [
    { start: '2024-01-01', end: '2024-01-31' },
    { start: '2024-02-01', end: '2024-02-29' },
    { start: '2024-03-01', end: '2024-03-31' },
    { start: '2024-04-01', end: '2024-04-30' },
    { start: '2024-05-01', end: '2024-05-31' },
    { start: '2024-06-01', end: '2024-06-30' },
  ],
});

assert.equal(linearResult.totalCost, 60000, 'Total cost should be 60000');
assert.equal(linearResult.curveType, 'linear', 'Curve type should be linear');
assert.equal(linearResult.buckets.length, 6, 'Should have 6 periods');
assert.equal(linearResult.checksumValid, true, 'Checksum should be valid');

// Each period should have $10,000
for (let i = 0; i < 6; i++) {
  assert.equal(linearResult.buckets[i].plannedCost, 10000, `Period ${i + 1} should have $10,000`);
  assert.equal(linearResult.buckets[i].weightPct, 16.67, `Period ${i + 1} should have ~16.67% weight`);
}

// Verify cumulative progression
assert.equal(linearResult.buckets[0].cumulativePlannedCost, 10000, 'Cumulative after period 1 should be 10000');
assert.equal(linearResult.buckets[2].cumulativePlannedCost, 30000, 'Cumulative after period 3 should be 30000');
assert.equal(linearResult.buckets[5].cumulativePlannedCost, 60000, 'Cumulative after period 6 should be 60000');

// Verify sum equals total
const linearSum = linearResult.buckets.reduce((sum, b) => sum + b.plannedCost, 0);
assert.equal(linearSum, 60000, 'Sum of all periods should equal total cost');

console.log('✓ Test 1 passed\n');

// Test 2: Bell curve distribution across 5 periods (peak in middle)
console.log('Test 2: Bell curve distribution across 5 periods');

const bellResult = distributeCostTimePhased({
  totalCost: 100000,
  periodsCount: 5,
  curveType: 'bell_curve',
  periodDates: [
    { start: '2024-01-01', end: '2024-02-29' },
    { start: '2024-03-01', end: '2024-04-30' },
    { start: '2024-05-01', end: '2024-06-30' },
    { start: '2024-07-01', end: '2024-08-31' },
    { start: '2024-09-01', end: '2024-10-31' },
  ],
});

assert.equal(bellResult.totalCost, 100000, 'Total cost should be 100000');
assert.equal(bellResult.curveType, 'bell_curve', 'Curve type should be bell_curve');
assert.equal(bellResult.buckets.length, 5, 'Should have 5 periods');
assert.equal(bellResult.checksumValid, true, 'Checksum should be valid');

// Middle period (index 2) should have the highest cost
const middleCost = bellResult.buckets[2].plannedCost;
assert.ok(middleCost > bellResult.buckets[0].plannedCost, 'Middle period should be greater than first');
assert.ok(middleCost > bellResult.buckets[1].plannedCost, 'Middle period should be greater than second');
assert.ok(middleCost > bellResult.buckets[3].plannedCost, 'Middle period should be greater than fourth');
assert.ok(middleCost > bellResult.buckets[4].plannedCost, 'Middle period should be greater than last');

// Verify symmetry (approximately)
assert.ok(Math.abs(bellResult.buckets[0].plannedCost - bellResult.buckets[4].plannedCost) < 100, 
  'First and last periods should be approximately equal (bell symmetry)');
assert.ok(Math.abs(bellResult.buckets[1].plannedCost - bellResult.buckets[3].plannedCost) < 100,
  'Second and fourth periods should be approximately equal (bell symmetry)');

// Verify sum equals total
const bellSum = bellResult.buckets.reduce((sum, b) => sum + b.plannedCost, 0);
assert.equal(bellSum, 100000, 'Sum of all periods should equal total cost');

console.log('✓ Test 2 passed\n');

// Test 3: S-Curve distribution verification with cumulative progression
console.log('Test 3: S-Curve distribution with cumulative progression');

const sCurveResult = distributeCostTimePhased({
  totalCost: 150000,
  periodsCount: 10,
  curveType: 's_curve',
});

assert.equal(sCurveResult.totalCost, 150000, 'Total cost should be 150000');
assert.equal(sCurveResult.curveType, 's_curve', 'Curve type should be s_curve');
assert.equal(sCurveResult.buckets.length, 10, 'Should have 10 periods');
assert.equal(sCurveResult.checksumValid, true, 'Checksum should be valid');

// S-curve characteristics: slow start, rapid middle, slow end
const firstThirdSum = sCurveResult.buckets.slice(0, 3).reduce((sum, b) => sum + b.plannedCost, 0);
const middleThirdSum = sCurveResult.buckets.slice(3, 7).reduce((sum, b) => sum + b.plannedCost, 0);
const lastThirdSum = sCurveResult.buckets.slice(7, 10).reduce((sum, b) => sum + b.plannedCost, 0);

assert.ok(middleThirdSum > firstThirdSum, 'Middle third should have more cost than first third');
assert.ok(middleThirdSum > lastThirdSum, 'Middle third should have more cost than last third');

// Verify cumulative is monotonically increasing
for (let i = 1; i < sCurveResult.buckets.length; i++) {
  assert.ok(
    sCurveResult.buckets[i].cumulativePlannedCost > sCurveResult.buckets[i - 1].cumulativePlannedCost,
    `Cumulative cost should increase from period ${i} to ${i + 1}`
  );
}

// Final cumulative should equal total
assert.equal(
  sCurveResult.buckets[9].cumulativePlannedCost,
  150000,
  'Final cumulative should equal total cost'
);

// Verify sum equals total
const sCurveSum = sCurveResult.buckets.reduce((sum, b) => sum + b.plannedCost, 0);
assert.equal(sCurveSum, 150000, 'Sum of all periods should equal total cost');

console.log('✓ Test 3 passed\n');

// Test 4: Penny reconciliation with odd total
console.log('Test 4: Penny reconciliation - odd total ($100,000 across 3 periods)');

const pennyResult = distributeCostTimePhased({
  totalCost: 100000,
  periodsCount: 3,
  curveType: 'linear',
  periodDates: [
    { start: '2024-Q1', end: '2024-Q1-End' },
    { start: '2024-Q2', end: '2024-Q2-End' },
    { start: '2024-Q3', end: '2024-Q3-End' },
  ],
});

assert.equal(pennyResult.totalCost, 100000, 'Total cost should be 100000');
assert.equal(pennyResult.checksumValid, true, 'Checksum should be valid');

// Sum must exactly equal total (no floating point drift)
const pennySum = pennyResult.buckets.reduce((sum, b) => sum + b.plannedCost, 0);
assert.equal(pennySum, 100000, 'Sum must exactly equal 100000.00');

// Each period should be approximately 33333.33, with adjustment in last period
assert.ok(Math.abs(pennyResult.buckets[0].plannedCost - 33333.33) < 0.01, 'Period 1 should be ~33333.33');
assert.ok(Math.abs(pennyResult.buckets[1].plannedCost - 33333.33) < 0.01, 'Period 2 should be ~33333.33');

// Last period gets the penny adjustment
const expectedLast = 100000 - pennyResult.buckets[0].plannedCost - pennyResult.buckets[1].plannedCost;
assert.equal(pennyResult.buckets[2].plannedCost, expectedLast, 'Period 3 should have reconciliation adjustment');

// Verify no floating point drift
assert.ok(
  Math.abs(pennySum - 100000) < 0.001,
  'Penny reconciliation should have no floating point drift'
);

console.log('✓ Test 4 passed\n');

// Test 5: Front-loaded distribution
console.log('Test 5: Front-loaded distribution (higher at start)');

const frontResult = distributeCostTimePhased({
  totalCost: 80000,
  periodsCount: 4,
  curveType: 'front_loaded',
});

assert.ok(Math.abs(frontResult.totalCost - 80000) < 0.01, 'Total cost should be 80000');
assert.equal(frontResult.checksumValid, true, 'Checksum should be valid');

// First period should have more than last period
assert.ok(
  frontResult.buckets[0].plannedCost > frontResult.buckets[3].plannedCost,
  'Front-loaded: first period should be greater than last'
);

// Each period should be less than or equal to the previous
for (let i = 1; i < frontResult.buckets.length; i++) {
  assert.ok(
    frontResult.buckets[i].plannedCost <= frontResult.buckets[i - 1].plannedCost,
    `Front-loaded: period ${i + 1} should be <= period ${i}`
  );
}

const frontSum = frontResult.buckets.reduce((sum, b) => sum + b.plannedCost, 0);
assert.ok(Math.abs(frontSum - 80000) < 0.01, 'Sum should equal total cost');

console.log('✓ Test 5 passed\n');

// Test 6: Back-loaded distribution
console.log('Test 6: Back-loaded distribution (higher at end)');

const backResult = distributeCostTimePhased({
  totalCost: 90000,
  periodsCount: 4,
  curveType: 'back_loaded',
});

assert.equal(backResult.totalCost, 90000, 'Total cost should be 90000');
assert.equal(backResult.checksumValid, true, 'Checksum should be valid');

// Last period should have more than first period
assert.ok(
  backResult.buckets[3].plannedCost > backResult.buckets[0].plannedCost,
  'Back-loaded: last period should be greater than first'
);

// Each period should be greater than or equal to the previous
for (let i = 1; i < backResult.buckets.length; i++) {
  assert.ok(
    backResult.buckets[i].plannedCost >= backResult.buckets[i - 1].plannedCost,
    `Back-loaded: period ${i + 1} should be >= period ${i}`
  );
}

const backSum = backResult.buckets.reduce((sum, b) => sum + b.plannedCost, 0);
assert.equal(backSum, 90000, 'Sum should equal total cost');

console.log('✓ Test 6 passed\n');

console.log('All Time-Phased Cost Phasing Tests Passed! ✓');
