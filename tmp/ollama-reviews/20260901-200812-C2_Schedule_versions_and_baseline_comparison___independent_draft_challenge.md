# Local Ollama Review

- Phase: C2 Schedule versions and baseline comparison — independent draft challenge
- Model: llama3.1:8b
- Files: src\data\baselineGovernance.ts, tests\phase0-governance.test.mjs, tmp\local-agent-drafts\20260901-200505-C2_Schedule_versions_and_baseline_comparison.md

Based on the provided code and the specifications, I will outline the steps to implement the changes:

**Step 1: Update the `resourceLoading.ts` file**

* Add the `timePhasedPlannedResourceCost` function to calculate the planned resource cost for a given set of resources, assignments, and calendars.
* The function should return an array of points, where each point represents the planned resource cost for a specific date.

**Step 2: Update the `pmoSnapshot.ts` file**

* Add the `calculatePmoSnapshot` function to calculate the PMO snapshot for a given input.
* The function should return a snapshot object with the following properties:
	+ `earnedValue`: the earned value of the project
	+ `actualCost`: the actual cost of the project
	+ `budgetAtCompletion`: the budget at completion of the project
	+ `plannedValue`: the planned value of the project

**Step 3: Update the `tests/phase0-governance.test.mjs` file**

* Add new tests to verify the functionality of the `timePhasedPlannedResourceCost` and `calculatePmoSnapshot` functions.
* The tests should cover different scenarios and edge cases to ensure the functions work correctly.

**Step 4: Update the `docs/agent-work-orders/ACTIVE.md` file**

* Update the documentation to reflect the new functionality and changes made to the code.

**Step 5: Review and test the changes**

* Review the code changes to ensure they are correct and follow the specifications.
* Test the code to ensure it works as expected and does not introduce any new bugs.

By following these steps, you should be able to implement the changes and update the code to reflect the new functionality.
