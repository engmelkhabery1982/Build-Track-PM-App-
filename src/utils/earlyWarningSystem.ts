export function generateWarnings(
  cpi: number,
  spi: number,
  delayedTasksCount: number,
  highSeveritySafetyCount: number,
  criticalGovernanceCount: number
): Array<{ severity: 'critical' | 'warning'; category: string; message: string; value: number }> {
  const warnings = [];

  if (cpi < 0.9) {
    warnings.push({
      severity: 'critical',
      category: 'Cost Performance',
      message: 'Cost performance is below threshold',
      value: cpi
    });
  }

  if (spi < 0.9) {
    warnings.push({
      severity: 'critical',
      category: 'Schedule Performance',
      message: 'Schedule performance is below threshold',
      value: spi
    });
  }

  if (delayedTasksCount > 0) {
    warnings.push({
      severity: 'warning',
      category: 'Schedule Delay',
      message: 'Tasks are behind schedule',
      value: delayedTasksCount
    });
  }

  if (highSeveritySafetyCount > 0) {
    warnings.push({
      severity: 'critical',
      category: 'Safety',
      message: 'High severity safety issues detected',
      value: highSeveritySafetyCount
    });
  }

  if (criticalGovernanceCount > 0) {
    warnings.push({
      severity: 'critical',
      category: 'Governance',
      message: 'Critical governance violations detected',
      value: criticalGovernanceCount
    });
  }

  return warnings;
}
