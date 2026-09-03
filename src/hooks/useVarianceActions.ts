import { useState } from 'react';
import { VarianceActionItem } from '@/types';
import { createActionFromWarning, Warning } from '@/utils/varianceActionRegister';

export function useVarianceActions() {
  const [varianceActionItems, setVarianceActionItems] = useState<VarianceActionItem[]>([]);

  const handleCreateAction = (warning: Warning, assignedTo: string, dueDate: string) => {
    const baseAction = createActionFromWarning(warning);
    const newAction: VarianceActionItem = {
      ...baseAction,
      assignedTo,
      dueDate,
    };
    setVarianceActionItems((prev) => [...prev, newAction]);
  };

  return {
    varianceActionItems,
    setVarianceActionItems,
    handleCreateAction,
  };
}
