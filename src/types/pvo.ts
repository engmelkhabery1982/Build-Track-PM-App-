export type PvoStatus = 'Identified' | 'Submitted' | 'Under Review' | 'Approved' | 'Rejected';

export interface PotentialVariationOrder {
  id: string;
  pvoNumber: string;
  title: string;
  description: string;
  controlAccountId?: string;
  identifiedDate: string;
  submittedDate?: string;
  estimatedCostImpact: number;
  approvedCostImpact?: number;
  estimatedTimeImpactDays: number;
  approvedTimeImpactDays?: number;
  status: PvoStatus;
  claimReference?: string;
  submittedBy?: string;
}
