export interface EarnedScheduleParams {
  actualTime: number;
  earnedValue: number;
  cumulativePlannedValues: number[];
}

export interface EarnedScheduleResult {
  actualTime: number;
  earnedValue: number;
  earnedSchedule: number;
  timeScheduleVariance: number;
  timeSchedulePerformanceIndex: number;
  status: 'ahead' | 'on_track' | 'behind';
}

/** Lipke Earned Schedule interpolation over equally spaced control periods. */
export function calculateEarnedSchedule(params: EarnedScheduleParams): EarnedScheduleResult {
  const actualTime = Math.max(0, Number(params.actualTime) || 0);
  const earnedValue = Math.max(0, Number(params.earnedValue) || 0);
  const planned = params.cumulativePlannedValues.map((value) => Math.max(0, Number(value) || 0));
  if (planned.length === 0 || earnedValue <= 0) {
    const variance = -actualTime;
    return {
      actualTime, earnedValue, earnedSchedule: 0,
      timeScheduleVariance: variance,
      timeSchedulePerformanceIndex: actualTime > 0 ? 0 : 1,
      status: variance < -0.05 ? 'behind' : 'on_track',
    };
  }
  let completedPeriod = 0;
  for (let index = 0; index < planned.length; index += 1) {
    if (planned[index] <= earnedValue) completedPeriod = index;
    else break;
  }
  let fraction = 0;
  if (completedPeriod < planned.length - 1) {
    const denominator = planned[completedPeriod + 1] - planned[completedPeriod];
    if (denominator > 0) fraction = Math.max(0, Math.min(1, (earnedValue - planned[completedPeriod]) / denominator));
  }
  const round = (value: number) => Math.round(value * 10000) / 10000;
  const earnedSchedule = round(completedPeriod + fraction);
  const variance = round(earnedSchedule - actualTime);
  const performance = actualTime > 0 ? round(earnedSchedule / actualTime) : 1;
  return {
    actualTime,
    earnedValue,
    earnedSchedule,
    timeScheduleVariance: variance,
    timeSchedulePerformanceIndex: performance,
    status: variance > 0.05 ? 'ahead' : variance < -0.05 ? 'behind' : 'on_track',
  };
}
