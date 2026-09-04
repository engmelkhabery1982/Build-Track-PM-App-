# Local Ollama Review

- Phase: phase2-cpm-network-governance
- Model: qwen2.5-coder:7b
- Files: src\components\DataTableView.tsx, src\data\dataQuality.ts, tests\phase0-governance.test.mjs

This is a set of unit tests for a project management tool that uses the Cri[3D[K
Critical Path Method (CPM) to calculate project schedules. The tests check [K
the following:

- The CPM calculation respects task durations, relationships, and dependenc[9D[K
dependency cycles.
- The CPM forecast writes separate forecast dates without changing planned [K
dates.
- Locked reporting periods block dated inserts, updates, and deletes.
- Reporting periods require a clean, non-overlapping governed range.
- The data-quality dashboard detects relationship, quantity, and period fai[3D[K
failures.
- Field and document controls detect scope, coordinate, review, and revisio[7D[K
revision failures.

Each test passes if the expected result is returned, and fails if an unexpe[6D[K
unexpected result is returned or an error is thrown. The tests use a testin[6D[K
testing library like Mocha to define the test cases and an assertion librar[6D[K
library like Chai to validate the results.

[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠼ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G[K[2K[1G
