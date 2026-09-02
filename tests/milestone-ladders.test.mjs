import { strict as assert } from 'assert';
import { calculateMilestoneProgress } from '../src/utils/calculations.ts';

console.log('Running Milestone Ladders Tests...\n');

// Test 1: Standard 4-step MEP Ladder - partial and full completion
console.log('Test 1: Standard 4-step MEP Ladder (20% Delivery, 40% Installation, 30% Testing, 10% Handover)');

const mepSteps = [
  {
    id: 'step-001',
    template_id: 'template-mep',
    step_order: 1,
    step_name: 'Material Delivery',
    weight_pct: 20,
    requires_wir: true,
    requires_qa_signoff: false,
  },
  {
    id: 'step-002',
    template_id: 'template-mep',
    step_order: 2,
    step_name: 'Installation Complete',
    weight_pct: 40,
    requires_wir: true,
    requires_qa_signoff: true,
  },
  {
    id: 'step-003',
    template_id: 'template-mep',
    step_order: 3,
    step_name: 'Testing & Commissioning',
    weight_pct: 30,
    requires_wir: true,
    requires_qa_signoff: true,
  },
  {
    id: 'step-004',
    template_id: 'template-mep',
    step_order: 4,
    step_name: 'Final Handover',
    weight_pct: 10,
    requires_wir: true,
    requires_qa_signoff: true,
  },
];

// Partial completion: Steps 1 and 2 completed (60%)
const partialProgress = [
  {
    id: 'prog-001',
    activity_id: 'act-001',
    step_id: 'step-001',
    is_completed: true,
    completed_date: '2024-01-15',
    verified_by: 'John Doe',
    wir_id: 'wir-001',
  },
  {
    id: 'prog-002',
    activity_id: 'act-001',
    step_id: 'step-002',
    is_completed: true,
    completed_date: '2024-02-20',
    verified_by: 'Jane Smith',
    wir_id: 'wir-002',
  },
  {
    id: 'prog-003',
    activity_id: 'act-001',
    step_id: 'step-003',
    is_completed: false,
  },
  {
    id: 'prog-004',
    activity_id: 'act-001',
    step_id: 'step-004',
    is_completed: false,
  },
];

const partialResult = calculateMilestoneProgress(mepSteps, partialProgress);
assert.equal(partialResult.earnedProgressPct, 60, 'Partial progress should be 60%');
assert.equal(partialResult.completedStepsCount, 2, 'Should have 2 completed steps');
assert.equal(partialResult.totalStepsCount, 4, 'Should have 4 total steps');
assert.equal(partialResult.isFullyCompleted, false, 'Should not be fully completed');
assert.equal(partialResult.currentPendingStep?.step_name, 'Testing & Commissioning', 'Next pending step should be Testing');
console.log('✓ Partial completion (60%) test passed');

// Full completion: All steps completed (100%)
const fullProgress = [
  {
    id: 'prog-001',
    activity_id: 'act-001',
    step_id: 'step-001',
    is_completed: true,
    completed_date: '2024-01-15',
    verified_by: 'John Doe',
    wir_id: 'wir-001',
  },
  {
    id: 'prog-002',
    activity_id: 'act-001',
    step_id: 'step-002',
    is_completed: true,
    completed_date: '2024-02-20',
    verified_by: 'Jane Smith',
    wir_id: 'wir-002',
  },
  {
    id: 'prog-003',
    activity_id: 'act-001',
    step_id: 'step-003',
    is_completed: true,
    completed_date: '2024-03-10',
    verified_by: 'Bob Wilson',
    wir_id: 'wir-003',
  },
  {
    id: 'prog-004',
    activity_id: 'act-001',
    step_id: 'step-004',
    is_completed: true,
    completed_date: '2024-03-25',
    verified_by: 'Alice Brown',
    wir_id: 'wir-004',
  },
];

const fullResult = calculateMilestoneProgress(mepSteps, fullProgress);
assert.equal(fullResult.earnedProgressPct, 100, 'Full progress should be 100%');
assert.equal(fullResult.completedStepsCount, 4, 'Should have 4 completed steps');
assert.equal(fullResult.isFullyCompleted, true, 'Should be fully completed');
assert.equal(fullResult.currentPendingStep, undefined, 'Should have no pending step when fully completed');
console.log('✓ Full completion (100%) test passed\n');

// Test 2: Validation of step weights (enforcing 100% total weight)
console.log('Test 2: Validation of step weights');

const normalizedSteps = [
  {
    id: 'step-101',
    template_id: 'template-test',
    step_order: 1,
    step_name: 'Step 1',
    weight_pct: 30,
    requires_wir: true,
    requires_qa_signoff: false,
  },
  {
    id: 'step-102',
    template_id: 'template-test',
    step_order: 2,
    step_name: 'Step 2',
    weight_pct: 30,
    requires_wir: true,
    requires_qa_signoff: false,
  },
  {
    id: 'step-103',
    template_id: 'template-test',
    step_order: 3,
    step_name: 'Step 3',
    weight_pct: 30,
    requires_wir: true,
    requires_qa_signoff: false,
  },
];

const normalizedProgress = [
  { id: 'p1', activity_id: 'a1', step_id: 'step-101', is_completed: true },
  { id: 'p2', activity_id: 'a1', step_id: 'step-102', is_completed: true },
  { id: 'p3', activity_id: 'a1', step_id: 'step-103', is_completed: false },
];

const normalizedResult = calculateMilestoneProgress(normalizedSteps, normalizedProgress);
assert.equal(normalizedResult.totalWeightPct, 90, 'Total weight should be 90%');
// When total weight is 90%, completing 60% of 90% should normalize to 66.67% of 100%
assert.ok(Math.abs(normalizedResult.earnedProgressPct - 66.67) < 0.01, 'Normalized progress should be ~66.67%');
console.log('✓ Weight normalization test passed\n');

// Test 3: Multiple activities tracking independent step progress
console.log('Test 3: Multiple activities with independent progress');

const activity1Progress = [
  { id: 'p1-a1', activity_id: 'act-001', step_id: 'step-001', is_completed: true },
  { id: 'p2-a1', activity_id: 'act-001', step_id: 'step-002', is_completed: false },
  { id: 'p3-a1', activity_id: 'act-001', step_id: 'step-003', is_completed: false },
  { id: 'p4-a1', activity_id: 'act-001', step_id: 'step-004', is_completed: false },
];

const activity2Progress = [
  { id: 'p1-a2', activity_id: 'act-002', step_id: 'step-001', is_completed: true },
  { id: 'p2-a2', activity_id: 'act-002', step_id: 'step-002', is_completed: true },
  { id: 'p3-a2', activity_id: 'act-002', step_id: 'step-003', is_completed: true },
  { id: 'p4-a2', activity_id: 'act-002', step_id: 'step-004', is_completed: false },
];

const result1 = calculateMilestoneProgress(mepSteps, activity1Progress);
const result2 = calculateMilestoneProgress(mepSteps, activity2Progress);

assert.equal(result1.earnedProgressPct, 20, 'Activity 1 should be at 20%');
assert.equal(result1.completedStepsCount, 1, 'Activity 1 should have 1 completed step');
assert.equal(result2.earnedProgressPct, 90, 'Activity 2 should be at 90%');
assert.equal(result2.completedStepsCount, 3, 'Activity 2 should have 3 completed steps');
console.log('✓ Independent activity progress test passed\n');

// Test 4: Edge cases - no steps completed (0%) and all completed (100%)
console.log('Test 4: Edge cases - 0% and 100% completion');

const zeroProgress = [
  { id: 'p1', activity_id: 'a1', step_id: 'step-001', is_completed: false },
  { id: 'p2', activity_id: 'a1', step_id: 'step-002', is_completed: false },
  { id: 'p3', activity_id: 'a1', step_id: 'step-003', is_completed: false },
  { id: 'p4', activity_id: 'a1', step_id: 'step-004', is_completed: false },
];

const zeroResult = calculateMilestoneProgress(mepSteps, zeroProgress);
assert.equal(zeroResult.earnedProgressPct, 0, 'Zero progress should be 0%');
assert.equal(zeroResult.completedStepsCount, 0, 'Should have 0 completed steps');
assert.equal(zeroResult.isFullyCompleted, false, 'Should not be fully completed');
assert.equal(zeroResult.currentPendingStep?.step_name, 'Material Delivery', 'First step should be pending');
console.log('✓ Zero completion (0%) test passed');

// Empty steps array
const emptyResult = calculateMilestoneProgress([], []);
assert.equal(emptyResult.earnedProgressPct, 0, 'Empty steps should return 0%');
assert.equal(emptyResult.totalStepsCount, 0, 'Should have 0 total steps');
assert.equal(emptyResult.isFullyCompleted, false, 'Empty should not be fully completed');
console.log('✓ Empty steps test passed');

// Test with integer boolean values (SQLite stores booleans as 0/1)
const intBoolProgress = [
  { id: 'p1', activity_id: 'a1', step_id: 'step-001', is_completed: 1 }, // SQLite true
  { id: 'p2', activity_id: 'a1', step_id: 'step-002', is_completed: 0 }, // SQLite false
  { id: 'p3', activity_id: 'a1', step_id: 'step-003', is_completed: 0 },
  { id: 'p4', activity_id: 'a1', step_id: 'step-004', is_completed: 0 },
];

const intBoolResult = calculateMilestoneProgress(mepSteps, intBoolProgress);
assert.equal(intBoolResult.earnedProgressPct, 20, 'Integer boolean (1) should be treated as completed');
assert.equal(intBoolResult.completedStepsCount, 1, 'Should recognize SQLite integer boolean');
console.log('✓ Integer boolean handling test passed\n');

console.log('All Milestone Ladders Tests Passed! ✓');
