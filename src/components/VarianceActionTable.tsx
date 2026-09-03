import React from 'react';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { VarianceActionItem } from '@/types';

interface VarianceActionTableProps {
  actions: VarianceActionItem[];
  onUpdateStatus?: (id: string, status: 'Open' | 'In Progress' | 'Closed') => void;
}

const VarianceActionTable: React.FC<VarianceActionTableProps> = ({ actions, onUpdateStatus }) => {
  const handleStatusChange = (id: string, status: 'Open' | 'In Progress' | 'Closed') => {
    if (onUpdateStatus) {
      onUpdateStatus(id, status);
    }
  };

  if (actions.length === 0) {
    return (
      <div className="py-8 text-center text-neutral-400">
        No corrective actions registered yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-neutral-200">
        <thead className="bg-neutral-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Warning / Trigger</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Category</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Assigned To</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Due Date</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</th>
            {onUpdateStatus && <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Actions</th>}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-neutral-200">
          {actions.map((action) => (
            <tr key={action.id}>
              <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">{action.warningMessage}</td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-neutral-500">{action.category}</td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-neutral-500">{action.assignedTo}</td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-neutral-500">
                {new Date(action.dueDate).toLocaleDateString()}
              </td>
              <td className="px-4 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  action.status === 'Open' ? 'bg-amber-100 text-amber-800' :
                  action.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {action.status}
                </span>
              </td>
              {onUpdateStatus && (
                <td className="px-4 py-4 whitespace-nowrap text-sm text-neutral-500">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleStatusChange(action.id, 'Open')}
                      className="text-amber-600 hover:text-amber-800"
                      title="Set to Open"
                    >
                      <AlertCircle size={16} />
                    </button>
                    <button
                      onClick={() => handleStatusChange(action.id, 'In Progress')}
                      className="text-blue-600 hover:text-blue-800"
                      title="Set to In Progress"
                    >
                      <Clock size={16} />
                    </button>
                    <button
                      onClick={() => handleStatusChange(action.id, 'Closed')}
                      className="text-green-600 hover:text-green-800"
                      title="Set to Closed"
                    >
                      <CheckCircle2 size={16} />
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default VarianceActionTable;
export { VarianceActionTable };
