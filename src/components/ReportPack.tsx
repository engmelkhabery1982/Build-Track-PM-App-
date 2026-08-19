import { useMemo, useState } from 'react';
import { CalendarDays, Printer } from 'lucide-react';

const money = (value: number) => value.toLocaleString(undefined, {
  style: 'currency',
  currency: 'SAR',
  maximumFractionDigits: 0,
});

type ReportPackProps = {
  projects: Record<string, any>[];
  contracts: Record<string, any>[];
  variations: Record<string, any>[];
  schedules: Record<string, any>[];
  costs: Record<string, any>[];
  wirs: Record<string, any>[];
  cashFlow: Record<string, any>[];
};

const packDescriptions: Record<string, string> = {
  'Weekly Project Review': 'Operational delivery, exceptions and immediate actions for the selected project.',
  'Monthly PMO Review': 'Portfolio-level commercial, schedule, cost and cash review for management.',
  'Commercial & Payment Review': 'Contract, approved variations, value delivered and cash position for payment review.',
};

export function ReportPack({ projects, contracts, variations, schedules, costs, wirs, cashFlow }: ReportPackProps) {
  const [projectId, setProjectId] = useState(projects[0]?.id || 'all');
  const [packType, setPackType] = useState('Weekly Project Review');
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));

  const data = useMemo(() => {
    const selectedProjects = projectId === 'all' ? projects : projects.filter((project) => project.id === projectId);
    const projectIds = new Set(selectedProjects.map((project) => project.id));
    const mainContracts = contracts.filter((contract) => projectIds.has(contract.project_id) && !contract.parent_main_contract_id);
    const contractIds = new Set(mainContracts.map((contract) => contract.id));
    const original = mainContracts.reduce((sum, contract) => sum + (Number(contract.contract_value) || 0), 0);
    const variation = variations.filter((item) => contractIds.has(item.contract_id) && item.status === 'Approved').reduce((sum, item) => sum + (Number(item.cost_impact) || 0), 0);
    const activities = schedules.filter((item) => projectIds.has(item.project_id) && item.activity);
    const pv = activities.reduce((sum, item) => sum + (Number(item.planned_value) || 0), 0);
    const ev = wirs.filter((item) => projectIds.has(item.project_id) && (item.status === 'Approved' || item.result === 'Pass' || item.result === 'Conditional Pass')).reduce((sum, item) => sum + (Number(item.item_amount) || 0), 0);
    const ac = costs.filter((item) => projectIds.has(item.project_id)).reduce((sum, item) => sum + (Number(item.actual) || 0), 0);
    const cash = cashFlow.filter((item) => projectIds.has(item.project_id)).reduce((sum, item) => sum + (Number(item.inflow) || 0) - (Number(item.outflow) || 0), 0);
    const delayed = activities.filter((item) => item.status === 'Delayed' || (item.end_date && item.end_date < reportDate && item.status !== 'Completed')).length;

    return { count: selectedProjects.length, original, variation, modified: original + variation, pv, ev, ac, cash, delayed, activities: activities.length };
  }, [projectId, projects, contracts, variations, schedules, costs, wirs, cashFlow, reportDate]);

  const cards: Array<[string, number, boolean?]> = [
    ['Original contract', data.original], ['Approved variations', data.variation], ['Modified value', data.modified], ['Cash position', data.cash],
    ['Planned value', data.pv], ['Earned value', data.ev], ['Actual cost', data.ac], ['Delayed activities', data.delayed, true],
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
              <label className="flex items-center gap-1 rounded-lg border border-neutral-300 px-2 py-2 text-sm"><CalendarDays size={15} className="text-neutral-400" /><input aria-label="Report date" type="date" value={reportDate} onChange={(event) => setReportDate(event.target.value)} className="border-0 bg-transparent outline-none" /></label>
              <button onClick={() => window.print()} className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white"><Printer size={16} /> Print / PDF</button>
            </div>
          </div>
          <p className="mt-3 text-xs text-neutral-400">Report date: {reportDate}. Delayed activities are evaluated against this date; other values reflect the current linked records.</p>
        </section>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {cards.map(([label, value, isCount]) => <div key={label} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"><p className="text-xs text-neutral-500">{label}</p><p className="mt-1 text-xl font-bold text-neutral-900">{isCount ? value : money(value)}</p></div>)}
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"><h2 className="font-semibold text-neutral-900">Management reading</h2><ul className="mt-3 space-y-2 text-sm text-neutral-700"><li>• Portfolio/projects covered: {data.count}</li><li>• Commercial variance: {money(data.variation)}</li><li>• Delivery position: EV {money(data.ev)} against PV {money(data.pv)}</li><li>• Cost position: AC {money(data.ac)}</li><li>• Schedule exceptions: {data.delayed} delayed activity(s) across {data.activities} planned activity(s).</li></ul></div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"><h2 className="font-semibold text-neutral-900">Review checklist</h2><ul className="mt-3 space-y-2 text-sm text-neutral-700"><li>• Confirm approved variations before issuing the commercial position.</li><li>• Review delayed activities and agree the next recovery action.</li><li>• Compare planned, earned and actual values before management approval.</li><li>• Use Print / PDF to circulate the same local snapshot to the review team.</li></ul></div>
        </section>
      </div>
    </div>
  );
}
