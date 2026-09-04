# Local Ollama Review

- Phase: Phase2 Time-Phased Profile Reconciliation UX
- Model: qwen2.5-coder:7b
- Files: src\App.tsx, src\utils\schedulePlanning.ts, tests\phase0-governance.test.mjs

This code appears to be a set of unit tests for various functions related t[1D[K
to project management and resource planning. The tests are using the `asser[6D[K
`assert` library to verify that the functions are returning the expected re[2D[K
results. Here's a brief overview of what each test is checking:

1. `planned resource assignment checks` - This test is checking that the fu[2D[K
function `runDataQualityChecks` is correctly identifying valid and invalid [K
resource assignments based on their start and end dates, resource type, and[3D[K
and planned hours.
2. `planned resource load profile detects capacity overload` - This test is[2D[K
is checking that the function `calculatePlannedResourceLoads` is correctly [K
calculating the allocated and over-allocated hours for a resource based on [K
their daily capacity and planned assignments.
3. `planned resource load respects the governed resource availability windo[5D[K
window` - This test is checking that the function `calculatePlannedResource[25D[K
`calculatePlannedResourceLoads` is correctly respecting the availability wi[2D[K
window for a resource when calculating their planned loads.
4. `resource calendar controls planned resource dates and shift hours overr[5D[K
override generic day hours` - This test is checking that the function `cale[5D[K
`calendarHoursPerDay` is correctly calculating the number of hours in a day[3D[K
day based on a resource's calendar, and that the function `calendarShiftHou[17D[K
`calendarShiftHours` is correctly calculating the number of hours in a shif[4D[K
shift based on a resource's calendar.
5. `recorded site hours remain visible and become an exception on a resourc[7D[K
resource non-working day` - This test is checking that the function `calcul[7D[K
`calculateResourceLoads` is correctly handling the scenario where a resourc[7D[K
resource has recorded site hours on a non-working day, and that these hours[5D[K
hours are not included in the resource's available capacity for the day.
6. `resource leveling recommendations identify affected activities without [K
changing the plan` - This test is checking that the function `suggestResour[14D[K
`suggestResourceLeveling` is correctly identifying the activities that woul[4D[K
would be affected if a resource were re-allocated to a different schedule, [K
and that it is providing recommendations for how to re-level the resource's[10D[K
resource's assignments without changing the overall project plan.
7. `planned resource cost forecast is time-phased by the activity calendar [K
and remains separate from cash` - This test is checking that the function `[1D[K
`timePhasedPlannedResourceCost` is correctly time-phasing the planned cost [K
of a resource based on the activity calendar, and that the function `planne[7D[K
`plannedResourceCostAt` is correctly returning the planned cost at a specif[6D[K
specific date.
8. `approved baseline freezes the time-phased PV profile instead of using l[1D[K
later live edits` - This test is checking that the function `approvedBaseli[15D[K
`approvedBaselinePlanForActivity` is correctly using the time-phased planne[6D[K
planned value (PV) profile from the approved baseline, and that it is not u[1D[K
using any later live edits to the PV profile.

Overall, these tests are providing a comprehensive set of coverage for the [K
resource planning functions in the project management software.

[1G⠙ [K[1G⠙ [K[1G⠹ [K[1G⠼ [K[1G⠴ [K[1G⠴ [K[1G⠧ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠸ [K[1G[K[2K[1G
