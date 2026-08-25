import test from 'node:test';
import assert from 'node:assert/strict';

import { referenceExpected, referenceProject } from './fixtures/referenceProjectAcceptance.mjs';

const quality = await import('../src/data/dataQuality.ts');
const schedule = await import('../src/utils/schedulePlanning.ts');
const commercial = await import('../src/utils/commercialControl.ts');

test('reference project is internally consistent before it is used as an acceptance oracle', () => {
  const findings = quality.runDataQualityChecks(referenceProject);
  assert.deepEqual(findings, [{
    severity: 'Pass',
    title: 'Acceptance data-quality checks passed',
    detail: 'All checked project, commercial, BOQ, schedule, field, document, cost, baseline and reporting-period controls are internally consistent.',
    view: 'dashboard',
  }]);
});

test('reference project preserves the agreed commercial, schedule and EVM figures', () => {
  const variationTotal = referenceProject.variations
    .filter((variation) => variation.status === 'Approved')
    .reduce((sum, variation) => sum + variation.cost_impact, 0);
  assert.equal(variationTotal, referenceExpected.approvedVariationValue);
  assert.equal(referenceExpected.originalContractValue + variationTotal, referenceExpected.revisedContractValue);

  const plannedValue = referenceProject.schedules.reduce((sum, activity) => sum + schedule.distributedPlannedValueToDate(activity, referenceProject.scheduleDistributions, referenceExpected.dataDate), 0);
  const earnedValue = referenceProject.wirEntries.filter((wir) => wir.result === 'Pass')
    .reduce((sum, wir) => {
      const item = referenceProject.boqItems.find((candidate) => candidate.id === wir.boq_item_id);
      return sum + wir.quantity * item.unit_rate;
    }, 0);
  const actualCost = referenceProject.costEntries.reduce((sum, cost) => sum + cost.amount, 0);
  assert.equal(plannedValue, referenceExpected.plannedValueToDataDate);
  assert.equal(earnedValue, referenceExpected.earnedValueToDataDate);
  assert.equal(actualCost, referenceExpected.actualCostToDataDate);
  assert.equal(earnedValue / actualCost, referenceExpected.cpiToDataDate);
  assert.equal(earnedValue / plannedValue, referenceExpected.spiToDataDate);

  const certificate = commercial.calculateCertificateValues(referenceProject.paymentCertificate);
  assert.equal(certificate.net_certified_value, referenceExpected.certificateNetValue);
});

test('reference project exposes the critical negative acceptance case', () => {
  const invalid = structuredClone(referenceProject);
  invalid.wirEntries[0].quantity = 1_001;
  const findings = quality.runDataQualityChecks(invalid);
  assert.ok(findings.some((finding) => finding.title === 'Measured quantities exceed BOQ'));
});
