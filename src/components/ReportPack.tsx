import { useMemo, useState } from 'react';
import { CalendarDays, Printer } from 'lucide-react';
import { useProjectDataDate } from '@/context/ProjectDataDateContext';
import { calculateEvmAtDataDate } from '@/utils/evm';

const money = (value: number | null | undefined) => {
  if (value === null || value === undefined) return 'Unavailable';
  return value.toLocaleString(undefined, {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 0,
  });
};

type ReportPackProps = {
  projects: Record<string, any>[];
  contracts: Record<string, any>[];
  variations: Record<string, any>[];
  schedules: Record<string, any>[];
  wirs: Record<string, any>[];
  cashFlow: Record<string, any>[];
  costEntries: Record<string, any>[];
  scheduleDistributions: Record<string, any>[];
  boqItems: Record<string, any>[];
  baselines?: Record<string, any>[];
  controlAccounts?: Record<string, any>[];
  contractSovLines?: Record<string, any>[];
  procurement?: Record<string, any>[];
  procurementReceipts?: Record<string, any>[];
};

const packDescriptions: Record<string, string> = {
  'Weekly Project Review': 'Operational delivery, exceptions and immediate actions for the selected project.',
  'Monthly PMO Review': 'Portfolio-level commercial, schedule, cost and cash review for management.',
  'Commercial & Payment Review': 'Contract, approved variations, value delivered and cash position for payment review.',
};

const dateKey = (value: unknown) => String(value || '').slice(0, 10);
const isOnOrBefore = (value: unknown, cutoff: string) => {
  const date = dateKey(value);
  return Boolean(date && date <= cutoff);
};

export function ReportPack({
  projects,
  contracts,
  variations,
  schedules,
  wirs,
  cashFlow,
  costEntries,
  scheduleDistributions,
  boqItems,
  baselines = [],
  controlAccounts = [],
  contractSovLines = [],
  procurement = [],
  procurementReceipts = [],
}: ReportPackProps) {
  const [packType, setPackType] = useState('Weekly Project Review');
  const { dataDate: reportDate, projectId, setProjectId } = useProjectDataDate();

  const data = useMemo(() => {
    const selectedProjects = projectId === 'all' ? projects : projects.filter((project) => project.id === projectId);
    const projectIds = new Set(selectedProjects.map((project) => project.id));
    const scopedMainContracts = contracts.filter((contract) => projectIds.has(contract.project_id) && !contract.parent_main_contract_id);
    const missingContractDates = scopedMainContracts.filter((contract) => !dateKey(contract.signed_date || contract.start_date)).length;
    const mainContracts = scopedMainContracts.filter((contract) => isOnOrBefore(contract.signed_date || contract.start_date, reportDate));
    const contractIds = new Set(mainContracts.map((contract) => contract.id));
    const performanceContractIds = contracts.filter((contract) => projectIds.has(contract.project_id)).map((contract) => contract.id);
    
    const original = mainContracts.reduce((sum, contract) => sum + (Number(contract.contract_value) || 0), 0);
    const approvedVariations = variations.filter((item) => contractIds.has(item.contract_id) && item.status === 'Approved');
    const missingVariationDates = approvedVariations.filter((item) => !dateKey(item.approved_date)).length;
    const variation = approvedVariations.filter((item) => isOnOrBefore(item.approved_date, reportDate)).reduce((sum, item) => sum + (Number(item.cost_impact) || 0), 0);
    const activities = schedules.filter((item) => projectIds.has(item.project_id) && String(item.activity || '').trim());
    
    const eligibleWirs = wirs.filter((item) => projectIds.has(item.project_id) && (item.status === 'Approved' || item.result === 'Pass' || item.result === 'Conditional Pass'));
    const missingWirDates = eligibleWirs.filter((item) => !dateKey(item.inspection_date)).length;
    
    const scopedCosts = costEntries.filter((item) => projectIds.has(item.project_id));
    const missingCostDates = scopedCosts.filter((item) => !dateKey(item.date)).length;
    
    const actualCash = cashFlow.filter((item) => projectIds.has(item.project_id) && (!item.movement_type || item.movement_type === 'Actual' || item.movement_type === 'Manual'));
    const missingCashDates = actualCash.filter((item) => !dateKey(item.date)).length;
    const cash = actualCash.filter((item) => isOnOrBefore(item.date, reportDate)).reduce((sum, item) => sum + (Number(item.inflow) || 0) - (Number(item.outflow) || 0), 0);
    const delayed = activities.filter((item) => item.status === 'Delayed' || (item.end_date && item.end_date < reportDate && item.status !== 'Completed')).length;

    // Single source of truth EVM engine for Revenue vs Delivery Cost
    const evm = calculateEvmAtDataDate({
      contractIds: [...contractIds],
      performanceContractIds,
      dataDate: reportDate,
      schedules: activities,
      scheduleDistributions,
      baselines: baselines.filter((b) => projectIds.has(b.project_id)),
      wirEntries: eligibleWirs,
      boqItems,
      costEntries: scopedCosts,
      controlAccounts: controlAccounts.filter((ca) => contractIds.has(ca.contract_id)),
      contractSovLines,
      procurement,
      procurementReceipts,
    });

    return {
      count: selectedProjects.length,
      original,
      variation,
      modified: original + variation,
      pv: evm.revenue.PV,
      ev: evm.revenue.EV,
      ac: evm.cost.AC,
      costBac: evm.cost.BAC,
      costEac: evm.cost.EAC,
      costCpi: evm.cost.CPI,
      grossMargin: evm.margin.grossMarginBAC,
      hasCostPlan: evm.cost.hasCostPlan,
      cash,
      delayed,
      activities: activities.length,
      missingContractDates,
      missingVariationDates,
      missingWirDates,
      missingCostDates,
      missingCashDates,
    };
  }, [projectId, projects, contracts, variations, schedules, wirs, cashFlow, costEntries, scheduleDistributions, boqItems, baselines, controlAccounts, contractSovLines, procurement, procurementReceipts, reportDate]);

  const cards: Array<[string, string | number, boolean?]> = [
    ['Original contract', money(data.original)],
    ['Approved variations', money(data.variation)],
    ['Revenue BAC (Selling)', money(data.modified)],
    ['Cash position', money(data.cash)],
    ['Revenue Planned Value (PV)', money(data.pv)],
    ['Revenue Earned Value (EV)', money(data.ev)],
    ['Delivery Actual Cost (AC)', money(data.ac)],
    ['Delivery Cost BAC', data.hasCostPlan ? money(data.costBac) : 'Unavailable'],
    ['Delivery Cost EAC', data.hasCostPlan ? money(data.costEac) : 'Unavailable'],
    ['Delayed activities', data.delayed, true],
  ];

  return (
    <div className="h-full overflow-y-auto bg-neutral-50 p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-700">Report Pack</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">{packType}</h1>
              <p className="mt-1 max-w-2xl text-sm text-neutral-500">{packDescriptions[packType]} The values are generated locally from linked commercial, schedule, progress, cost and cash records.</p>
            </div>
            <div className="flex flex-wrap gap-2 print:hidden">
              <select value={packType} onChange={(event) => setPackType(event.target.value)} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"><option>Weekly Project Review</option><option>Monthly PMO Review</option><option>Commercial & Payment Review</option></select>
              <select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"><option value="all">All projects</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.project_code || project.id} — {project.name}</option>)}</select>
              <div className="flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-2.5 py-2 text-sm" title="Controlled by the application Data Date selector; this reporting cut-off does not modify records">
                <CalendarDays size={15} className="text-neutral-400" />
                <span className="text-xs font-medium text-neutral-600">As of {reportDate}</span>
              </div>
              <button onClick={() => window.print()} className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white"><Printer size={16} /> Print / PDF</button>
            </div>
          </div>
          <p className="mt-3 text-xs text-neutral-400">All cumulative values are calculated through {reportDate} (Reporting cut-off only; underlying records are not modified): contract effective date, approved variation date, plan distribution, inspection date, cost-entry date and cash-flow date.</p>
        </section>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {cards.map(([label, value, isCount]) => <div key={label} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"><p className="text-xs text-neutral-500">{label}</p><p className="mt-1 text-lg font-bold text-neutral-900">{isCount ? value : value}</p></div>)}
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-neutral-900">Management reading</h2>
            <ul className="mt-3 space-y-2 text-sm text-neutral-700">
              <li>• Portfolio/projects covered: {data.count}</li>
              <li>• Commercial revenue value: Revenue BAC {money(data.modified)} (Approved variations: {money(data.variation)})</li>
              <li>• Progress delivery position: Revenue EV {money(data.ev)} against Revenue PV {money(data.pv)}</li>
              <li>• Delivery cost position: AC {money(data.ac)} · Delivery BAC: {data.hasCostPlan ? money(data.costBac) : 'Unavailable'}</li>
              <li>• Cost Forecast at Completion: {data.hasCostPlan ? money(data.costEac) : 'Unavailable (Approved Cost Plan Required)'}</li>
              <li>• Schedule exceptions: {data.delayed} delayed activity(s) across {data.activities} planned activity(s).</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-neutral-900">Review checklist</h2>
            <ul className="mt-3 space-y-2 text-sm text-neutral-700">
              <li>• Confirm approved variations before issuing the commercial position.</li>
              <li>• Ensure delivery cost plan (Control Accounts / SOV) is approved to enable cost EAC and margin forecasting.</li>
              <li>• Review delayed activities and agree the next recovery action.</li>
              <li>• Compare planned, earned and actual values before management approval.</li>
              <li>• Use Print / PDF to circulate the same local snapshot to the review team.</li>
            </ul>
          </div>
        </section>

        {(data.missingContractDates + data.missingVariationDates + data.missingWirDates + data.missingCostDates + data.missingCashDates) > 0 && <section className="rounded-2xl border border-warning-200 bg-warning-50 p-5 text-sm text-warning-900"><h2 className="font-semibold">Data-quality exclusions</h2><p className="mt-1 text-warning-800">Undated records are intentionally excluded from this as-of report so they cannot create misleading values. Complete their dates before issuing the report.</p><ul className="mt-3 grid gap-1 sm:grid-cols-2"><li>• Main contracts without effective date: {data.missingContractDates}</li><li>• Approved variations without approval date: {data.missingVariationDates}</li><li>• Accepted WIRs without inspection date: {data.missingWirDates}</li><li>• Cost entries without cost date: {data.missingCostDates}</li><li>• Actual/manual cash movements without date: {data.missingCashDates}</li></ul></section>}
      </div>
    </div>
  );
}

