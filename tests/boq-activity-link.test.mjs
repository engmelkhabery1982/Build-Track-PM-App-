import { strict as assert } from 'assert';
import { calculateBOQActivityAllocation } from '../src/utils/calculations.ts';

console.log('Running BOQ-Activity Link Tests...\n');

// Test 1: Single BOQ item split across 3 activities (30%, 30%, 40% = 100%)
console.log('Test 1: Single BOQ item split across 3 activities');
const boqItem1 = {
  id: 'boq-001',
  quantity: 1000,
  amount: 50000,
  unit: 'm3',
  item_name: 'Concrete Works',
};

const links1 = [
  {
    id: 'link-001',
    project_id: 'proj-001',
    boq_item_id: 'boq-001',
    activity_id: 'act-001',
    allocated_quantity: 300,
    allocation_pct: 30,
    allocated_cost: 15000,
    method: 'percentage',
  },
  {
    id: 'link-002',
    project_id: 'proj-001',
    boq_item_id: 'boq-001',
    activity_id: 'act-002',
    allocated_quantity: 300,
    allocation_pct: 30,
    allocated_cost: 15000,
    method: 'percentage',
  },
  {
    id: 'link-003',
    project_id: 'proj-001',
    boq_item_id: 'boq-001',
    activity_id: 'act-003',
    allocated_quantity: 400,
    allocation_pct: 40,
    allocated_cost: 20000,
    method: 'percentage',
  },
];

const result1 = calculateBOQActivityAllocation(boqItem1, links1, []);
assert.equal(result1.total_allocated_quantity, 1000, 'Total allocated quantity should be 1000');
assert.equal(result1.total_allocated_cost, 50000, 'Total allocated cost should be 50000');
assert.equal(result1.total_allocation_pct, 100, 'Total allocation percentage should be 100');
assert.equal(result1.remaining_quantity, 0, 'Remaining quantity should be 0');
assert.equal(result1.remaining_cost, 0, 'Remaining cost should be 0');
assert.equal(result1.is_over_allocated, false, 'Should not be over-allocated');
console.log('✓ Test 1 passed\n');

// Test 2: Multiple BOQ items linked to a single Activity (many-to-one)
console.log('Test 2: Multiple BOQ items linked to a single Activity');
const boqItem2a = {
  id: 'boq-002a',
  quantity: 500,
  amount: 25000,
  unit: 'm2',
  item_name: 'Formwork',
};

const boqItem2b = {
  id: 'boq-002b',
  quantity: 200,
  amount: 10000,
  unit: 'ton',
  item_name: 'Steel Reinforcement',
};

const links2a = [
  {
    id: 'link-004',
    project_id: 'proj-001',
    boq_item_id: 'boq-002a',
    activity_id: 'act-004',
    allocated_quantity: 500,
    allocation_pct: 100,
    allocated_cost: 25000,
    method: 'percentage',
  },
];

const links2b = [
  {
    id: 'link-005',
    project_id: 'proj-001',
    boq_item_id: 'boq-002b',
    activity_id: 'act-004',
    allocated_quantity: 200,
    allocation_pct: 100,
    allocated_cost: 10000,
    method: 'percentage',
  },
];

const result2a = calculateBOQActivityAllocation(boqItem2a, links2a, []);
const result2b = calculateBOQActivityAllocation(boqItem2b, links2b, []);

assert.equal(result2a.total_allocation_pct, 100, 'BOQ 2a should be 100% allocated');
assert.equal(result2b.total_allocation_pct, 100, 'BOQ 2b should be 100% allocated');
assert.equal(result2a.is_over_allocated, false, 'BOQ 2a should not be over-allocated');
assert.equal(result2b.is_over_allocated, false, 'BOQ 2b should not be over-allocated');
console.log('✓ Test 2 passed\n');

// Test 3: Over-allocation detection
console.log('Test 3: Over-allocation detection');
const boqItem3 = {
  id: 'boq-003',
  quantity: 100,
  amount: 10000,
  unit: 'm',
  item_name: 'Piping',
};

const links3 = [
  {
    id: 'link-006',
    project_id: 'proj-001',
    boq_item_id: 'boq-003',
    activity_id: 'act-005',
    allocated_quantity: 60,
    allocation_pct: 60,
    allocated_cost: 6000,
    method: 'percentage',
  },
  {
    id: 'link-007',
    project_id: 'proj-001',
    boq_item_id: 'boq-003',
    activity_id: 'act-006',
    allocated_quantity: 50,
    allocation_pct: 50,
    allocated_cost: 5000,
    method: 'percentage',
  },
];

const result3 = calculateBOQActivityAllocation(boqItem3, links3, []);
assert.equal(result3.total_allocation_pct, 110, 'Total allocation should be 110%');
assert.equal(result3.total_allocated_quantity, 110, 'Total allocated quantity should be 110');
assert.equal(result3.remaining_quantity, -10, 'Remaining quantity should be -10');
assert.equal(result3.is_over_allocated, true, 'Should detect over-allocation');
console.log('✓ Test 3 passed\n');

// Test 4: Quantity-based vs Percentage-based distribution integrity
console.log('Test 4: Quantity-based vs Percentage-based distribution');
const boqItem4 = {
  id: 'boq-004',
  quantity: 1000,
  amount: 100000,
  unit: 'm3',
  item_name: 'Excavation',
};

// Quantity-based allocation
const links4qty = [
  {
    id: 'link-008',
    project_id: 'proj-001',
    boq_item_id: 'boq-004',
    activity_id: 'act-007',
    allocated_quantity: 250,
    allocation_pct: 0,
    allocated_cost: 0,
    method: 'quantity',
  },
  {
    id: 'link-009',
    project_id: 'proj-001',
    boq_item_id: 'boq-004',
    activity_id: 'act-008',
    allocated_quantity: 750,
    allocation_pct: 0,
    allocated_cost: 0,
    method: 'quantity',
  },
];

const result4qty = calculateBOQActivityAllocation(boqItem4, links4qty, []);
assert.equal(result4qty.total_allocated_quantity, 1000, 'Quantity-based: Total should be 1000');
assert.equal(result4qty.remaining_quantity, 0, 'Quantity-based: No remaining quantity');
assert.equal(result4qty.is_over_allocated, false, 'Quantity-based: Should not be over-allocated');

// Percentage-based allocation
const links4pct = [
  {
    id: 'link-010',
    project_id: 'proj-001',
    boq_item_id: 'boq-004',
    activity_id: 'act-009',
    allocated_quantity: 0,
    allocation_pct: 25,
    allocated_cost: 25000,
    method: 'percentage',
  },
  {
    id: 'link-011',
    project_id: 'proj-001',
    boq_item_id: 'boq-004',
    activity_id: 'act-010',
    allocated_quantity: 0,
    allocation_pct: 75,
    allocated_cost: 75000,
    method: 'percentage',
  },
];

const result4pct = calculateBOQActivityAllocation(boqItem4, links4pct, []);
assert.equal(result4pct.total_allocation_pct, 100, 'Percentage-based: Total should be 100%');
assert.equal(result4pct.total_allocated_cost, 100000, 'Percentage-based: Total cost should be 100000');
assert.equal(result4pct.is_over_allocated, false, 'Percentage-based: Should not be over-allocated');

console.log('✓ Test 4 passed\n');

console.log('All BOQ-Activity Link Tests Passed! ✓');
