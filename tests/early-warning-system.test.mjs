import { test } from "node:test";
import assert from "node:assert";
import { generateWarnings } from "../src/utils/earlyWarningSystem.ts";

test("generateWarnings flags critical CPI below threshold", () => {
  const result = generateWarnings(0.85, 1.0, 0, 0, 0);
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].severity, "critical");
  assert.strictEqual(result[0].category, "Cost Performance");
});

test("generateWarnings returns empty array when all metrics are healthy", () => {
  const result = generateWarnings(1.0, 1.0, 0, 0, 0);
  assert.strictEqual(result.length, 0);
});

test("generateWarnings returns multiple warnings when many metrics are poor", () => {
  const result = generateWarnings(0.5, 0.5, 3, 2, 1);
  assert.strictEqual(result.length, 5);
  const criticalCount = result.filter((w) => w.severity === "critical").length;
  assert.strictEqual(criticalCount, 4);
});