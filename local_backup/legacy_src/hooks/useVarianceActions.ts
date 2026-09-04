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

  const handleUpdateActionStatus = (id: string, status: 'Open' | 'In Progress' | 'Closed') => {
    setVarianceActionItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item))
    );
  };

  return {
    varianceActionItems,
    setVarianceActionItems,
    handleCreateAction,
    handleUpdateActionStatus,
  };
}
