export interface EarnedScheduleParams {
  actualTime: number; // AT (e.g. current month or day index, >= 0)
  earnedValue: number; // EV
  cumulativePlannedValues: number[]; // Array of cumulative PV from time 0, 1, 2... N
}

export interface EarnedScheduleResult {
  actualTime: number;
  earnedValue: number;
  earnedSchedule: number; // ES = C + I
  timeScheduleVariance: number; // SVt = ES - AT
  timeSchedulePerformanceIndex: number; // SPIt = ES / AT
  status: 'ahead' | 'on_track' | 'behind';
}

/**
 * SCH-06: Earned Schedule & Time-Based Performance (Lipke / PMI standard)
 * Overcomes standard EVM SPI flaw near project completion by translating
 * Earned Value into units of time (Earned Schedule).
 */
export function calculateEarnedSchedule(params: EarnedScheduleParams): EarnedScheduleResult {
  const { actualTime, earnedValue, cumulativePlannedValues } = params;

  if (cumulativePlannedValues.length === 0 || earnedValue <= 0) {
    const svt = Number((0 - actualTime).toFixed(4));
    const spit = actualTime > 0 ? 0 : 1;
    return {
      actualTime,
      earnedValue,
      earnedSchedule: 0,
      timeScheduleVariance: svt,
      timeSchedulePerformanceIndex: spit,
      status: svt >= 0 ? 'on_track' : 'behind',
    };
  }

  // Find C: index where cumulative PV <= EV
  let c = 0;
  for (let i = 0; i < cumulativePlannedValues.length; i++) {
    if (cumulativePlannedValues[i] <= earnedValue) {
      c = i;
    } else {
      break;
    }
  }

  // Calculate linear interpolation fraction I
  let iFrac = 0;
  if (c < cumulativePlannedValues.length - 1) {
    const pvC = cumulativePlannedValues[c];
    const pvNext = cumulativePlannedValues[c + 1];
    const denom = pvNext - pvC;
    if (denom > 0) {
      iFrac = (earnedValue - pvC) / denom;
    }
  }

  const es = Number((c + iFrac).toFixed(4));
  const svt = Number((es - actualTime).toFixed(4));
  const spit = actualTime > 0 ? Number((es / actualTime).toFixed(4)) : 1;

  let status: 'ahead' | 'on_track' | 'behind' = 'on_track';
  if (svt > 0.05) status = 'ahead';
  else if (svt < -0.05) status = 'behind';

  return {
    actualTime,
    earnedValue,
    earnedSchedule: es,
    timeScheduleVariance: svt,
    timeSchedulePerformanceIndex: spit,
    status,
  };
}
