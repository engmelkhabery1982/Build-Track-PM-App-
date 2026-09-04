import React, { useState } from 'react';

export interface SubcontractorClaim {
  id: string;
  subcontractorName: string;
  tradePackage: string;
  invoiceNo: string;
  invoiceDate: string;
  grossClaimAmount: number;
  retentionPercent: number;
  retentionHeld: number;
  netPayableToSub: number;
  ownerIpcReference: string;
  ownerPaymentStatus: 'Paid' | 'Certified_Unpaid' | 'Under_Evaluation' | 'Disputed';
  subPaymentStatus: 'Eligible_To_Release' | 'Held_Pending_Owner' | 'Partially_Paid' | 'Paid';
  withholdingReason?: string;
}

export interface BackToBackRetentionProps {
  claims?: SubcontractorClaim[];
  defaultRetentionPercent?: number;
  onReleasePayment?: (claimId: string) => void;
}

const DEFAULT_CLAIMS: SubcontractorClaim[] = [
  {
    id: 'SUB-01',
    subcontractorName: 'Atlas MEP Works',
    tradePackage: 'HVAC & Plumbing',
    invoiceNo: 'INV-MEP-04',
    invoiceDate: '2026-04-20',
    grossClaimAmount: 180000,
    retentionPercent: 10,
    retentionHeld: 18000,
    netPayableToSub: 162000,
    ownerIpcReference: 'IPC #04',
    ownerPaymentStatus: 'Paid',
    subPaymentStatus: 'Eligible_To_Release'
  },
  {
    id: 'SUB-02',
    subcontractorName: 'Vertex Facades',
    tradePackage: 'Curtain Walls & Glazing',
    invoiceNo: 'INV-FAC-03',
    invoiceDate: '2026-04-25',
    grossClaimAmount: 320000,
    retentionPercent: 10,
    retentionHeld: 32000,
    netPayableToSub: 288000,
    ownerIpcReference: 'IPC #04',
    ownerPaymentStatus: 'Certified_Unpaid',
    subPaymentStatus: 'Held_Pending_Owner'
  },
  {
    id: 'SUB-03',
    subcontractorName: 'Delta Earthworks',
    tradePackage: 'Excavation & Shoring',
    invoiceNo: 'INV-EARTH-08',
    invoiceDate: '2026-03-15',
    grossClaimAmount: 95000,
    retentionPercent: 5,
    retentionHeld: 4750,
    netPayableToSub: 90250,
    ownerIpcReference: 'IPC #03',
    ownerPaymentStatus: 'Paid',
    subPaymentStatus: 'Paid'
  },
  {
    id: 'SUB-04',
    subcontractorName: 'Horizon Steel Ltd',
    tradePackage: 'Structural Steel Trusses',
    invoiceNo: 'INV-STL-02',
    invoiceDate: '2026-04-28',
    grossClaimAmount: 240000,
    retentionPercent: 10,
    retentionHeld: 24000,
    netPayableToSub: 216000,
    ownerIpcReference: 'IPC #04',
    ownerPaymentStatus: 'Under_Evaluation',
    subPaymentStatus: 'Held_Pending_Owner'
  },
  {
    id: 'SUB-05',
    subcontractorName: 'Gulf Fire Protection',
    tradePackage: 'Fire Sprinklers & Alarms',
    invoiceNo: 'INV-FP-01',
    invoiceDate: '2026-04-18',
    grossClaimAmount: 75000,
    retentionPercent: 10,
    retentionHeld: 7500,
    netPayableToSub: 67500,
    ownerIpcReference: 'IPC #04',
    ownerPaymentStatus: 'Disputed',
    subPaymentStatus: 'Held_Pending_Owner',
    withholdingReason: 'Consultant NCR Pending on Pipe Testing'
  }
];

export const BackToBackRetentionBoard: React.FC<BackToBackRetentionProps> = ({
  claims = DEFAULT_CLAIMS,
  onReleasePayment
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [claimList, setClaimList] = useState<SubcontractorClaim[]>(
    claims.length > 0 ? claims : DEFAULT_CLAIMS
  );

  const handleRelease = (id: string) => {
    setClaimList((prev) =>
      prev.map((c) => (c.id === id ? { ...c, subPaymentStatus: 'Paid' } : c))
    );
    if (onReleasePayment) onReleasePayment(id);
  };

  const filtered = claimList.filter((c) => {
    if (filterStatus === 'all') return true;
    return c.subPaymentStatus === filterStatus;
  });

  const totalGross = claimList.reduce((acc, c) => acc + c.grossClaimAmount, 0);
  const totalRetention = claimList.reduce((acc, c) => acc + c.retentionHeld, 0);
  const protectedLiquidity = claimList
    .filter((c) => c.subPaymentStatus === 'Held_Pending_Owner')
    .reduce((acc, c) => acc + c.netPayableToSub, 0);
  const eligibleToRelease = claimList
    .filter((c) => c.subPaymentStatus === 'Eligible_To_Release')
    .reduce((acc, c) => acc + c.netPayableToSub, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-3">
        <div>
          <h3 className="text-base font-semibold text-neutral-900">
            Subcontractor Back-to-Back & Retention Governance (COM-04)
          </h3>
          <p className="text-xs text-neutral-500">
            Pay-When-Paid Cash Flow Protection & Subcontract Retention Reserve Ledger
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-neutral-500">Filter:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded border border-neutral-300 bg-white px-2.5 py-1 text-xs text-neutral-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Packages</option>
            <option value="Eligible_To_Release">Eligible to Release</option>
            <option value="Held_Pending_Owner">Held Pending Owner</option>
            <option value="Paid">Paid</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
          <div className="text-[11px] text-neutral-500">Total Sub Invoiced</div>
          <div className="text-base font-bold text-neutral-900 mt-1">
            ${totalGross.toLocaleString()}
          </div>
        </div>
        <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
          <div className="text-[11px] text-neutral-500">Retention Reserve Held</div>
          <div className="text-base font-bold text-slate-700 mt-1">
            ${totalRetention.toLocaleString()}
          </div>
        </div>
        <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200">
          <div className="text-[11px] text-amber-800">Protected Liquidity (Held)</div>
          <div className="text-base font-bold text-amber-900 mt-1">
            ${protectedLiquidity.toLocaleString()}
          </div>
        </div>
        <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-200">
          <div className="text-[11px] text-emerald-800">Eligible to Release</div>
          <div className="text-base font-bold text-emerald-900 mt-1">
            ${eligibleToRelease.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto border border-neutral-200 rounded-lg">
        <table className="w-full text-left text-xs text-neutral-700">
          <thead className="bg-neutral-50 text-neutral-600 border-b border-neutral-200">
            <tr>
              <th className="py-2.5 px-3 font-medium">Subcontractor & Trade</th>
              <th className="py-2.5 px-3 font-medium">Invoice Ref</th>
              <th className="py-2.5 px-3 font-medium text-right">Gross Claim</th>
              <th className="py-2.5 px-3 font-medium text-right">Retention (Held)</th>
              <th className="py-2.5 px-3 font-medium text-right">Net Payable</th>
              <th className="py-2.5 px-3 font-medium text-center">Owner IPC</th>
              <th className="py-2.5 px-3 font-medium text-center">Payout Status</th>
              <th className="py-2.5 px-3 font-medium text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filtered.map((c) => (
              <tr key={c.id} className="hover:bg-neutral-50/60 transition-colors">
                <td className="py-2.5 px-3">
                  <div className="font-semibold text-neutral-900">{c.subcontractorName}</div>
                  <div className="text-[11px] text-neutral-500">{c.tradePackage}</div>
                </td>
                <td className="py-2.5 px-3">
                  <div className="font-medium text-neutral-800">{c.invoiceNo}</div>
                  <div className="text-[11px] text-neutral-400">{c.invoiceDate}</div>
                </td>
                <td className="py-2.5 px-3 text-right font-medium">
                  ${c.grossClaimAmount.toLocaleString()}
                </td>
                <td className="py-2.5 px-3 text-right text-slate-600">
                  ${c.retentionHeld.toLocaleString()} ({c.retentionPercent}%)
                </td>
                <td className="py-2.5 px-3 text-right font-semibold text-neutral-900">
                  ${c.netPayableToSub.toLocaleString()}
                </td>
                <td className="py-2.5 px-3 text-center">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${
                      c.ownerPaymentStatus === 'Paid'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : c.ownerPaymentStatus === 'Certified_Unpaid'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {c.ownerIpcReference}: {c.ownerPaymentStatus}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-center">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                      c.subPaymentStatus === 'Eligible_To_Release'
                        ? 'bg-emerald-100 text-emerald-800'
                        : c.subPaymentStatus === 'Paid'
                        ? 'bg-neutral-100 text-neutral-700'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {c.subPaymentStatus.replace(/_/g, ' ')}
                  </span>
                  {c.withholdingReason && (
                    <div className="text-[10px] text-rose-600 mt-0.5 max-w-[160px] truncate mx-auto">
                      {c.withholdingReason}
                    </div>
                  )}
                </td>
                <td className="py-2.5 px-3 text-center">
                  {c.subPaymentStatus === 'Eligible_To_Release' ? (
                    <button
                      onClick={() => handleRelease(c.id)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-medium transition-colors"
                    >
                      Release
                    </button>
                  ) : (
                    <span className="text-neutral-400 text-[11px]">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BackToBackRetentionBoard;
