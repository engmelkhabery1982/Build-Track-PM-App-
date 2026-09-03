# Project Working Rules

## Scope Discipline
- Only edit files explicitly required by the task. Do not touch any other file even if it seems related.
- If an additional file needs changes, state that clearly and ask for confirmation before doing it.

## Change Size (important for cost control)
- Split any large task into small independent parts, each as a separate commit.
- Never rewrite a whole file for a simple change. Send only the smallest diff that achieves the goal.
- If the target file is large (roughly 300+ lines), ask for the specific function name or approximate line before reading it fully.

## Quality
- Follow the same code style and rounding pattern (money pattern) used in similar files.
- Do not assume field or variable names that do not actually exist in the file. Verify existing definitions first instead of guessing.

## Token Economy (strict rules)
- Give short, direct answers, no long explanations or unnecessary preambles.
- Do not re-explain code that did not change.
- If a test run fully succeeds, just give a brief confirmation, do not list every passing test case.
- If the build or tests fail after a change, stop immediately. Do not attempt more than two consecutive automatic fixes. Show the problem clearly and ask for direction instead of repeated guessing.

## On Successful Task Completion
- After a successful build, tests, and commit, mention it in one short sentence only. Do not suggest additional tasks on your own.