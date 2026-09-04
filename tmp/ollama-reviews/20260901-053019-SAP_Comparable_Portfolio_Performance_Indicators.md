# Local Ollama Review

- Phase: SAP Comparable Portfolio Performance Indicators
- Model: qwen2.5-coder:7b
- Files: src\App.tsx, src\utils\evm.ts, src\utils\projectForecast.ts

The provided code snippet consists of two TypeScript files, each handling s[1D[K
specific functionalities related to Earned Value Management (EVM) and proje[5D[K
project forecasting. Below is a detailed explanation of each file:

### File: `src\utils\evm.ts`

This file contains a function `calculateEvmAtDataDate` which calculates Ear[3D[K
Earned Value Management (EVM) metrics such as BAC, PV, EV, AC, CV, SV, CPI,[4D[K
CPI, SPI, EAC, ETC, VAC, and TCPI. The function takes an object as input wh[2D[K
which includes contract details, performance data, baselines, and other fin[3D[K
financial data.

#### Key Components:
1. **Input Filtering**: The function filters the input data to ensure that [K
only relevant entries for the specified contract IDs are considered.
2. **Baseline and Budget Calculation**: It calculates the Baseline at Compl[5D[K
Completion (BAC) and Planned Value (PV) based on approved baseline plans an[2D[K
and distributions.
3. **Earned Value (EV) Calculation**: EV is calculated based on the approve[7D[K
approved Work in Review (WIR) entries and their corresponding BOQ items.
4. **Actual Cost (AC) Calculation**: AC is calculated from the cost entries[7D[K
entries that are dated through the specified data date.
5. **Ratio Calculations**: CPI, SPI, EAC, ETC, VAC, and TCPI are calculated[10D[K
calculated based on the EV, AC, BAC, and other metrics.
6. **Helper Functions**: The function includes helper functions like `money[6D[K
`money`, `datedThrough`, and `approvedWir` to format values and filter data[4D[K
data based on specific conditions.

### File: `src\utils\projectForecast.ts`

This file contains a function `deriveContractForecastFinish` which determin[8D[K
determines the latest executable forecast finish for a given contract. The [K
function returns an object indicating the forecast date and its source (CPM[4D[K
(CPM Forecast, Planned fallback, or Unavailable).

#### Key Components:
1. **Filtering**: The function filters the schedules to find activities ass[3D[K
associated with the specified contract ID.
2. **Forecast Date Extraction**: It extracts forecast end dates and planned[7D[K
planned end dates, sorts them, and returns the latest available date.
3. **Source Information**: The function provides information on the source [K
of the forecast date (CPM Forecast, Planned fallback, or Unavailable).

### Usage and Integration

These utility functions can be integrated into larger applications that req[3D[K
require EVM calculations and project forecasting. For example, they can be [K
used in a project management system to provide real-time insights into proj[4D[K
project performance and forecast future outcomes.

### Example Usage

#### Using `calculateEvmAtDataDate`

```typescript
import { calculateEvmAtDataDate } from './utils/evm';

const inputData = {
  contractIds: ['contract1', 'contract2'],
  dataDate: '2023-10-01',
  schedules: [
    // Sample schedule data
  ],
  scheduleDistributions: [
    // Sample schedule distribution data
  ],
  baselines: [
    // Sample baseline data
  ],
  wirEntries: [
    // Sample WIR data
  ],
  boqItems: [
    // Sample BOQ data
  ],
  costEntries: [
    // Sample cost data
  ]
};

const evmMetrics = calculateEvmAtDataDate(inputData);
console.log(evmMetrics);
```

#### Using `deriveContractForecastFinish`

```typescript
import { deriveContractForecastFinish } from './utils/projectForecast';

const contractId = 'contract1';
const schedules = [
  // Sample schedule data
];

const forecastInfo = deriveContractForecastFinish(schedules, contractId);
console.log(forecastInfo);
```

These functions provide a robust foundation for financial and project manag[5D[K
management calculations, ensuring that data is processed accurately and eff[3D[K
efficiently.

[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠹ [K[1G⠸ [K[1G⠴ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠇ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠹ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠇ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠋ [K[1G⠹ [K[1G⠸ [K[1G⠸ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠸ [K[1G⠴ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠧ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠴ [K[1G⠧ [K[1G⠧ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠧ [K[1G⠏ [K[1G⠋ [K[1G⠋ [K[1G⠹ [K[1G⠸ [K[1G⠸ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠧ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠋ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠹ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠇ [K[1G⠋ [K[1G⠋ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠧ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠹ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠴ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠴ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠋ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠙ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠼ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠹ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠴ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠼ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠸ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠴ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠧ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠋ [K[1G⠹ [K[1G⠹ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠧ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠼ [K[1G⠦ [K[1G⠧ [K[1G⠧ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠴ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠋ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠧ [K[1G⠇ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠹ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠋ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠴ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠋ [K[1G⠹ [K[1G⠸ [K[1G⠸ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠋ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠴ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠋ [K[1G⠹ [K[1G⠹ [K[1G⠼ [K[1G⠴ [K[1G⠴ [K[1G⠧ [K[1G⠇ [K[1G⠇ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠏ [K[1G⠙ [K[1G⠹ [K[1G⠹ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠇ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠹ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠙ [K[1G⠸ [K[1G⠸ [K[1G⠼ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠧ [K[1G⠇ [K[1G⠏ [K[1G⠋ [K[1G⠙ [K[1G⠹ [K[1G⠸ [K[1G⠼ [K[1G⠴ [K[1G⠦ [K[1G⠦ [K[1G⠇ [K[1G⠏ [K[1G[K[2K[1G
