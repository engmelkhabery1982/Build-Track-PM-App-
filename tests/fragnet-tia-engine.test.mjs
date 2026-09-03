import { strict as assert } from 'assert';
import { calculateTimeImpactAnalysis } from '../src/utils/calculations.ts';

console.log('Running Fragnet & Time Impact Analysis (TIA) Tests...');

// Test 1: Critical Path Delay (Owner responsibility -> 15 days EOT granted)
console.log('Test 1: Critical Path Delay with Owner Responsibility');
const result1 = calculateTimeImpactAnalysis({
  baseFinishDate: '2026-12-31',
  criticalPathActivityIds: ['ACT-001', 'ACT-002'],
  fragnet: [
    { id: 'F-1', event_id: 'EV-1', activity_code: 'FRAG-1', name: 'Design Change Review', duration_days: 15, predecessor_id: 'ACT-001', successor_id: 'ACT-002' }
  ],
  delayEvent: {
    id: 'EV-1', project_id: 'PRJ-1', title: 'Late Drawing Approval', event_code: 'EV-001',
    event_type: 'EMPLOYER_DELAY', responsibility: 'OWNER', impact_date: '2026-06-01', delay_days: 15, status: 'APPROVED'
  },
  availableFloatDays: 0
});

assert.equal(result1.isCritical, true);
assert.equal(result1.projectDelayDays, 15);
assert.equal(result1.excusableEotDays, 15);
assert.equal(result1.isCompensable, true);
assert.equal(result1.requiresLiquidatedDamagesReview, false);
console.log('? Test 1 passed');

// Test 2: Non-critical delay within float (30 days float, 10 days delay -> 0 days project delay)
console.log('Test 2: Non-Critical Delay within Available Float');
const result2 = calculateTimeImpactAnalysis({
  baseFinishDate: '2026-12-31',
  criticalPathActivityIds: ['ACT-001', 'ACT-002'],
  fragnet: [
    { id: 'F-2', event_id: 'EV-2', activity_code: 'FRAG-2', name: 'Material Delay', duration_days: 10, predecessor_id: 'ACT-999', successor_id: 'ACT-998' }
  ],
  delayEvent: {
    id: 'EV-2', project_id: 'PRJ-1', title: 'Supplier Delay', event_code: 'EV-002',
    event_type: 'CONTRACTOR_DELAY', responsibility: 'CONTRACTOR', impact_date: '2026-06-01', delay_days: 10, status: 'APPROVED'
  },
  availableFloatDays: 30
});

assert.equal(result2.projectDelayDays, 0);
assert.equal(result2.consumedFloatDays, 10);
assert.equal(result2.excusableEotDays, 0);
console.log('? Test 2 passed');

// Test 3: Non-critical delay exceeding float (10 days float, 25 days delay -> 15 days delay)
console.log('Test 3: Delay Exceeding Available Float');
const result3 = calculateTimeImpactAnalysis({
  baseFinishDate: '2026-12-31',
  criticalPathActivityIds: ['ACT-001'],
  fragnet: [
    { id: 'F-3', event_id: 'EV-3', activity_code: 'FRAG-3', name: 'Site Access Delay', duration_days: 25, predecessor_id: 'ACT-999', successor_id: 'ACT-998' }
  ],
  delayEvent: {
    id: 'EV-3', project_id: 'PRJ-1', title: 'Site Handover Delay', event_code: 'EV-003',
    event_type: 'EMPLOYER_DELAY', responsibility: 'OWNER', impact_date: '2026-06-01', delay_days: 25, status: 'APPROVED'
  },
  availableFloatDays: 10
});

assert.equal(result3.projectDelayDays, 15);
assert.equal(result3.consumedFloatDays, 10);
assert.equal(result3.excusableEotDays, 15);
console.log('? Test 3 passed');

// Test 4: Contractor delay on Critical Path -> Liquidated damages review triggered
console.log('Test 4: Contractor Culpable Delay on Critical Path');
const result4 = calculateTimeImpactAnalysis({
  baseFinishDate: '2026-12-31',
  criticalPathActivityIds: ['ACT-001'],
  fragnet: [
    { id: 'F-4', event_id: 'EV-4', activity_code: 'FRAG-4', name: 'Rework Due to Defect', duration_days: 20, predecessor_id: 'ACT-001', successor_id: 'ACT-002' }
  ],
  delayEvent: {
    id: 'EV-4', project_id: 'PRJ-1', title: 'Quality Defect Rework', event_code: 'EV-004',
    event_type: 'CONTRACTOR_DELAY', responsibility: 'CONTRACTOR', impact_date: '2026-07-01', delay_days: 20, status: 'APPROVED'
  },
  availableFloatDays: 0
});

assert.equal(result4.projectDelayDays, 20);
assert.equal(result4.excusableEotDays, 0);
assert.equal(result4.nonExcusableDays, 20);
assert.equal(result4.requiresLiquidatedDamagesReview, true);
console.log('? Test 4 passed');

console.log('All Fragnet & TIA tests passed successfully!');
