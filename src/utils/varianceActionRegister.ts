import type { VarianceActionItem } from '../types/index.ts';

export type Warning = {
  severity: 'critical' | 'warning';
  category: string;
  message: string;
  value: number;
};

/**
 * Creates a new VarianceActionItem from a warning object
 *
 * @param warning - The warning object from earlyWarningSystem.ts
 * @returns A new VarianceActionItem with default values
 */
export function createActionFromWarning(warning: Warning): VarianceActionItem {
  return {
    id: crypto.randomUUID(),
    warningMessage: warning.message,
    category: warning.category,
    assignedTo: '',
    dueDate: '',
    status: 'Open',
    createdDate: new Date().toISOString()
  };
}
