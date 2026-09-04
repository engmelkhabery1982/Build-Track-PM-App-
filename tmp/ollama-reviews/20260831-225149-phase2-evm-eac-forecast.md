# Local Ollama Review

- Phase: phase2-evm-eac-forecast
- Model: qwen2.5-coder:7b
- Files: src\components\Dashboard.tsx, src\components\SCurveChart.tsx, src\utils\schedulePlanning.ts, src\utils\cashForecast.ts

This TypeScript code provides a set of utility functions for handling sched[5D[K
scheduling, budgeting, and cash forecasting in financial planning and repor[5D[K
reporting. Below is a breakdown of the main functionalities and how they ca[2D[K
can be used:

### Scheduling and Budgeting Functions

1. **`scheduleBudget(activity: Record<string, any>): number`**
   - Calculates the budget for an activity based on its schedule details.

2. **`schedulePlannedValueToDate(activity: Record<string, any>, reportDate [K
= new Date().toISOString().slice(0, 10)): number`**
   - Calculates the planned value up to a given report date based on the ac[2D[K
activity's schedule and budget.

3. **`distributedPlannedValueToDate(activity: Record<string, any>, distribu[8D[K
distributions: Record<string, any>[], reportDate = new Date().toISOString()[20D[K
Date().toISOString().slice(0, 10)): number`**
   - Calculates the planned value up to a given report date using time-phas[9D[K
time-phased distributions.

4. **`reconcileScheduleDistributions(activity: Record<string, any>, distrib[7D[K
distributions: Record<string, any>[]): ScheduleDistributionReconciliation`*[36D[K
ScheduleDistributionReconciliation`**
   - Reconciles time-phased distributions to ensure they align with the act[3D[K
activity's budget and planned quantities.

5. **`assertValidScheduleDistribution(activity: Record<string, any>, distri[6D[K
distribution: Record<string, any>, siblingDistributions: Record<string, any[3D[K
any>[]): void`**
   - Validates that a time-phased distribution is valid and does not exceed[6D[K
exceed the activity's budget or planned quantities.

6. **`addCalendarDays(date: string | null | undefined, days: number): strin[5D[K
string | null`**
   - Adds a specified number of calendar days to a given date.

### Cash Forecasting Functions

1. **`cashForecastAt(rows: Record<string, any>[], reportDate: string): Cash[4D[K
CashForecastPoint`**
   - Calculates the actual and forecasted cash net values up to a given rep[3D[K
report date based on a list of cash movement rows.

### Usage Example

Here's an example of how these functions can be used together in a financia[8D[K
financial planning scenario:

```typescript
// Sample activity and distributions
const activity = {
  id: '123',
  planned_quantity: 1000,
  unit_rate: 10,
  start_date: '2023-01-01',
  end_date: '2023-12-31',
};

const distributions = [
  { id: '1', schedule_id: '123', planned_quantity: 200, unit_rate: 10, peri[4D[K
period_start: '2023-01-01', period_end: '2023-01-31' },
  { id: '2', schedule_id: '123', planned_quantity: 300, unit_rate: 10, peri[4D[K
period_start: '2023-02-01', period_end: '2023-02-28' },
  // more distributions...
];

// Calculate budget and planned value
const budget = scheduleBudget(activity);
const plannedValue = schedulePlannedValueToDate(activity);

// Calculate distributed planned value
const distributedValue = distributedPlannedValueToDate(activity, distributi[10D[K
distributions);

// Reconcile distributions
const reconciliation = reconcileScheduleDistributions(activity, distributio[11D[K
distributions);

// Validate a distribution
const newDistribution = { id: '3', schedule_id: '123', planned_quantity: 50[2D[K
500, unit_rate: 10, period_start: '2023-03-01', period_end: '2023-03-31' };[2D[K
};
assertValidScheduleDistribution(activity, newDistribution, distributions)[14D[K
distributions);

// Calculate cash forecast
const cashForecast = cashForecastAt([
  { date: '2023-01-15', movement_type: 'Manual', inflow: 500, outflow: 0 },[2D[K
},
  { date: '2023-01-15', movement_type: 'Forecast', inflow: 100, outflow: [K
0 },
  // more rows...
], '2023-01-15');

console.log(cashForecast);
```

This example demonstrates how to use the functions to calculate budget, pla[3D[K
planned value, distributed value, reconcile distributions, validate a distr[5D[K
distribution, and calculate cash forecasts based on a set of cash movement [K
rows.

[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠏ [K[1G⠋ [K[1G⠋ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠋ [K[1G⠹ [K[1G⠸ [K[1G⠸ [K[1G⠴ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠹ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠋ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠏ [K[1G⠋ [K[1G⠋ [K[1G⠙ [K[1G⠸ [K[1G⠼ [K[1G⠼ [K[1G⠴ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠼ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠙ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠼ [K[1G⠴ [K[1G⠧ [K[1G⠇ [K[1G⠇ [K[1G⠏ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠴ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠹ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠼ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠙ [K[1G⠸ [K[1G⠼ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠼ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠹ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠸ [K[1G⠸ [K[1G⠴ [K[1G⠦ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠋ [K[1G⠙ [K[1G⠙ [K[1G⠸ [K[1G⠼ [K[1G⠼ [K[1G⠦ [K[1G⠦ [K[1G⠧ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠹ [K[1G⠼ [K[1G⠼ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠸ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠧ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠙ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠴ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠙ [K[1G⠹ [K[1G⠹ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠧ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠙ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠋ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠸ [K[1G⠼ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠹ [K[1G⠸ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠼ [K[1G⠴ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠴ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠼ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠙ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠋ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠇ [K[1G⠋ [K[1G⠋ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠼ [K[1G⠦ [K[1G⠧ [K[1G⠧ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠙ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠇ [K[1G⠋ [K[1G⠋ [K[1G⠙ [K[1G⠸ [K[1G⠸ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠇ [K[1G⠋ [K[1G⠙ [K[1G⠙ [K[1G⠹ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠸ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠇ [K[1G⠋ [K[1G⠙ [K[1G⠙ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠴ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠇ [K[1G⠏ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠙ [K[1G⠹ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠙ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠧ [K[1G⠏ [K[1G⠋ [K[1G⠋ [K[1G⠙ [K[1G⠸ [K[1G⠸ [K[1G⠴ [K[1G⠴ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠙ [K[1G⠙ [K[1G⠸ [K[1G⠼ [K[1G⠼ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠙ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠴ [K[1G⠧ [K[1G⠧ [K[1G⠇ [K[1G⠋ [K[1G⠋ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠼ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠙ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠙ [K[1G⠙ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠇ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠋ [K[1G⠙ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠙ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠴ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠇ [K[1G⠋ [K[1G⠙ [K[1G⠙ [K[1G⠸ [K[1G⠼ [K[1G⠼ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠧ [K[1G⠇ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠸ [K[1G⠴ [K[1G⠴ [K[1G⠧ [K[1G⠇ [K[1G⠇ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠸ [K[1G⠴ [K[1G⠦ [K[1G⠦ [K[1G⠧ [K[1G⠏ [K[1G⠏ [K[1G⠋ [K[1G⠹ [K[1G⠹ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠹ [K[1G⠸ [K[1G⠴ [K[1G⠴ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠋ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠼ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠙ [K[1G⠹ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠼ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠇ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠸ [K[1G⠼ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠇ [K[1G⠋ [K[1G⠋ [K[1G⠹ [K[1G⠸ [K[1G⠸ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠋ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠋ [K[1G⠹ [K[1G⠹ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠇ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠋ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠧ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠙ [K[1G⠹ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠧ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠙ [K[1G⠸ [K[1G⠼ [K[1G⠼ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠸ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠹ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠧ [K[1G⠏ [K[1G⠏ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠸ [K[1G⠴ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠋ [K[1G⠹ [K[1G⠹ [K[1G⠸ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠋ [K[1G⠹ [K[1G⠹ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠙ [K[1G⠸ [K[1G⠼ [K[1G⠼ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠴ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G[K[2K[1G
