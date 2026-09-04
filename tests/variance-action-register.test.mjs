import { test } from "node:test";
import assert from "node:assert";
import { createActionFromWarning } from "../src/utils/varianceActionRegister.ts";

test("createActionFromWarning creates an Open action with empty assignment fields", () => {
  const warning = { severity: "critical", category: "cost", message: "CPI below target", value: 0.85 };
  const action = createActionFromWarning(warning);
  assert.strictEqual(action.status, "Open");
  assert.strictEqual(action.assignedTo, "");
  assert.strictEqual(action.dueDate, "");
  assert.strictEqual(action.warningMessage, warning.message);
});