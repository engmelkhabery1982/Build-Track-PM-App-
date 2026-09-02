import { strict as assert } from 'assert';
import { calculateMultiMethodEAC } from '../src/utils/calculations.ts';

console.log('Running Multi-Method EAC Forecasting Tests...\n');

// Test 1: Standard PMI benchmark project
console.log('Test 1: Standard PMI benchmark project (BAC=1M, EV=400K, AC=500K, PV=500K)');
const benchmark = calculateMultiMethodEAC({
  bac: 1000000,
  ev: 400000,
  ac: 500000,
  pv: 500000,
});

// Verify derived performance indices
assert.equal(benchmark.cpi, 0.8, 'CPI should be 0.8 (EV/AC = 400K/500K)');
assert.equal(benchmark.spi, 0.8, 'SPI should be 0.8 (EV/PV = 400K/500K)');

// Method 1: Budget Rate - EAC = AC + (BAC - EV) = 500K + 600K = 1,100K
assert.equal(benchmark.methods.budget_rate.etc, 600000, 'Budget Rate ETC should be 600K');
assert.equal(benchmark.methods.budget_rate.eac, 1100000, 'Budget Rate EAC should be 1.1M');
assert.equal(benchmark.methods.budget_rate.vac, -100000, 'Budget Rate VAC should be -100K');
assert.equal(benchmark.methods.budget_rate.vacPct, -10, 'Budget Rate VAC% should be -10%');

// Method 2: CPI Extrapolated - EAC = BAC / CPI = 1M / 0.8 = 1,250K
assert.equal(benchmark.methods.cpi_extrapolated.etc, 750000, 'CPI ETC should be 750K');
assert.equal(benchmark.methods.cpi_extrapolated.eac, 1250000, 'CPI EAC should be 1.25M');
assert.equal(benchmark.methods.cpi_extrapolated.vac, -250000, 'CPI VAC should be -250K');
assert.equal(benchmark.methods.cpi_extrapolated.vacPct, -25, 'CPI VAC% should be -25%');

// Method 3: Composite CPI*SPI - EAC = AC + (BAC-EV)/(CPI*SPI) = 500K + 600K/(0.8*0.8) = 500K + 937.5K = 1,437.5K
assert.equal(benchmark.methods.composite_cpi_spi.etc, 937500, 'Composite ETC should be 937.5K');
assert.equal(benchmark.methods.composite_cpi_spi.eac, 1437500, 'Composite EAC should be 1.4375M');
assert.equal(benchmark.methods.composite_cpi_spi.vac, -437500, 'Composite VAC should be -437.5K');
assert.equal(benchmark.methods.composite_cpi_spi.vacPct, -43.75, 'Composite VAC% should be -43.75%');

// Method 4: Bottom-Up (defaults to budget rate when not provided)
assert.equal(benchmark.methods.bottom_up.etc, 600000, 'Bottom-Up ETC should default to 600K');
assert.equal(benchmark.methods.bottom_up.eac, 1100000, 'Bottom-Up EAC should be 1.1M');

// TCPI calculations
// TCPI to BAC = (BAC - EV) / (BAC - AC) = (1M - 400K) / (1M - 500K) = 600K / 500K = 1.2
assert.equal(benchmark.tcpiBac, 1.2, 'TCPI to BAC should be 1.2');

// Recommendation: SPI=0.8 < 0.85 AND CPI=0.8 < 0.9 => composite_cpi_spi
assert.equal(benchmark.recommendedMethod, 'composite_cpi_spi', 'Should recommend composite method for severe issues');
assert.equal(benchmark.recommendedEAC, 1437500, 'Recommended EAC should be 1.4375M');

// TCPI to recommended EAC = (BAC - EV) / (EAC - AC) = 600K / (1437.5K - 500K) = 600K / 937.5K ≈ 0.64
assert.ok(Math.abs(benchmark.tcpiEac - 0.64) < 0.01, 'TCPI to EAC should be ~0.64');

console.log('✓ Test 1 passed\n');

// Test 2: Edge cases - zero progress, completed project, division by zero
console.log('Test 2: Edge cases - zero progress and completed project');

// Zero progress project (EV=0, AC=0)
const zeroProgress = calculateMultiMethodEAC({
  bac: 1000000,
  ev: 0,
  ac: 0,
  pv: 100000,
});

assert.equal(zeroProgress.cpi, 1.0, 'Zero progress: CPI should default to 1.0');
assert.equal(zeroProgress.spi, 0, 'Zero progress: SPI should be 0 (EV/PV = 0/100K)');
assert.equal(zeroProgress.methods.budget_rate.eac, 1000000, 'Zero progress: Budget Rate EAC should equal BAC');
assert.equal(zeroProgress.tcpiBac, 0, 'Zero progress: TCPI to BAC should be 0 (division guard)');
console.log('✓ Zero progress edge case passed');

// Completed project (EV = BAC)
const completed = calculateMultiMethodEAC({
  bac: 1000000,
  ev: 1000000,
  ac: 950000,
  pv: 1000000,
});

assert.equal(completed.cpi, 1.053, 'Completed: CPI should be ~1.053 (1M/950K)');
assert.equal(completed.spi, 1.0, 'Completed: SPI should be 1.0');
assert.equal(completed.methods.budget_rate.etc, 0, 'Completed: ETC should be 0');
assert.equal(completed.methods.budget_rate.eac, 950000, 'Completed: EAC should equal AC');
assert.equal(completed.methods.budget_rate.vac, 50000, 'Completed: VAC should be 50K (under budget)');
console.log('✓ Completed project edge case passed');

// Division by zero resilience (BAC = AC)
const divisionGuard = calculateMultiMethodEAC({
  bac: 1000000,
  ev: 400000,
  ac: 1000000, // AC = BAC
  pv: 500000,
});

assert.equal(divisionGuard.tcpiBac, 0, 'Division guard: TCPI to BAC should be 0 when BAC=AC');
console.log('✓ Division by zero resilience passed\n');

// Test 3: Bottom-up ETC override
console.log('Test 3: Bottom-up ETC override calculations');

const bottomUpOverride = calculateMultiMethodEAC({
  bac: 1000000,
  ev: 400000,
  ac: 500000,
  pv: 500000,
  bottomUpEtc: 450000, // Management re-estimate
});

assert.equal(bottomUpOverride.methods.bottom_up.etc, 450000, 'Bottom-up ETC should use provided value');
assert.equal(bottomUpOverride.methods.bottom_up.eac, 950000, 'Bottom-up EAC should be AC + bottomUpEtc');
assert.equal(bottomUpOverride.methods.bottom_up.vac, 50000, 'Bottom-up VAC should be 50K');
assert.equal(bottomUpOverride.methods.bottom_up.vacPct, 5, 'Bottom-up VAC% should be 5%');

// Other methods should remain unchanged
assert.equal(bottomUpOverride.methods.cpi_extrapolated.eac, 1250000, 'CPI method should be independent of bottom-up');

console.log('✓ Test 3 passed\n');

// Test 4: Recommendation heuristics validation
console.log('Test 4: Recommendation heuristics based on CPI and SPI thresholds');

// Scenario A: Good performance (CPI >= 1.0, SPI >= 1.0) => budget_rate
const goodPerformance = calculateMultiMethodEAC({
  bac: 1000000,
  ev: 550000,
  ac: 500000,
  pv: 500000,
});

assert.equal(goodPerformance.cpi, 1.1, 'Good performance: CPI should be 1.1');
assert.equal(goodPerformance.spi, 1.1, 'Good performance: SPI should be 1.1');
assert.equal(goodPerformance.recommendedMethod, 'budget_rate', 'Good performance should recommend budget_rate');
console.log('✓ Good performance recommendation passed');

// Scenario B: Cost overrun only (CPI < 1.0, SPI >= 0.85) => cpi_extrapolated
const costOverrun = calculateMultiMethodEAC({
  bac: 1000000,
  ev: 450000,
  ac: 500000,
  pv: 500000,
});

assert.equal(costOverrun.cpi, 0.9, 'Cost overrun: CPI should be 0.9');
assert.equal(costOverrun.spi, 0.9, 'Cost overrun: SPI should be 0.9');
assert.equal(costOverrun.recommendedMethod, 'cpi_extrapolated', 'Cost overrun should recommend cpi_extrapolated');
console.log('✓ Cost overrun recommendation passed');

// Scenario C: Severe issues (CPI < 0.9, SPI < 0.85) => composite_cpi_spi
const severeIssues = calculateMultiMethodEAC({
  bac: 1000000,
  ev: 350000,
  ac: 500000,
  pv: 500000,
});

assert.equal(severeIssues.cpi, 0.7, 'Severe issues: CPI should be 0.7');
assert.equal(severeIssues.spi, 0.7, 'Severe issues: SPI should be 0.7');
assert.equal(severeIssues.recommendedMethod, 'composite_cpi_spi', 'Severe issues should recommend composite_cpi_spi');
console.log('✓ Severe issues recommendation passed');

// Scenario D: Schedule delay only (SPI < 0.85, CPI >= 0.9) => composite_cpi_spi
const scheduleDelay = calculateMultiMethodEAC({
  bac: 1000000,
  ev: 400000,
  ac: 440000,
  pv: 500000,
});

assert.equal(scheduleDelay.cpi, 0.909, 'Schedule delay: CPI should be ~0.909');
assert.equal(scheduleDelay.spi, 0.8, 'Schedule delay: SPI should be 0.8');
assert.equal(scheduleDelay.recommendedMethod, 'composite_cpi_spi', 'Schedule delay with marginal cost should recommend composite');
console.log('✓ Schedule delay recommendation passed\n');

console.log('All Multi-Method EAC Forecasting Tests Passed! ✓');
