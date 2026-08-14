import { BrainCircuit, CircleAlert, CircleCheck, CircleArrowRight, Lightbulb } from 'lucide-react';
import type { ViewKey } from '@/types';

type InsightSeverity = 'Critical' | 'Warning' | 'Opportunity' | 'Healthy';

type Insight = {
  severity: InsightSeverity;
  title: string;
  detail: string;
  recommendation: string;
  view: ViewKey;
};

const styles: Record<InsightSeverity, string> = {
  Critical: 'border-error-200 bg-error-50 text-error-800',
  Warning: 'border-warning-200 bg-warning-50 text-warning-800',
  Opportunity: 'border-primary-200 bg-primary-50 text-primary-800',
  Healthy: 'border-success-200 bg-success-50 text-success-800',
};

/**
 * Local, explainable PMO assistant. It never sends project data outside the
 * desktop application; every insight is calculated from the SQLite records
 * already loaded into the UI.
 */
export function PmoInsights({
  projects, contracts, schedules, costs, variations, clientInvoiceTracking,
  subcontractorInvoiceTracking, rfis, quality, onNavigate,
}: {
  projects: Record<string, any>[];
  contracts: Record<string, any>[];
  schedules: Record<string, any>[];
  costs: Record<string, any>[];
  variations: Record<string, any>[];
  clientInvoiceTracking: Record<string, any>[];
  subcontractorInvoiceTracking: Record<string, any>[];
  rfis: Record<string, any>[];
  quality: Record<string, any>[];
  onNavigate: (view: ViewKey) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const activeMainContracts = contracts.filter((contract) => !contract.parent_main_contract_id && contract.status !== 'Terminated');
  const delayedActivities = schedules.filter((row) => String(row.activity || '').trim() && (row.status === 'Delayed' || (row.end_date && row.end_date < today && row.status !== 'Completed')));
  const overBudget = costs.filter((row) => (Number(row.actual) || 0) > (Number(row.budget) || Number(row.planned) || 0));
  const pendingVariations = variations.filter((row) => ['Draft', 'Submitted', 'Pending'].includes(row.status));
  const overdueClientInvoices = clientInvoiceTracking.filter((row) => row.due_date && row.due_date < today && row.payment_status !== 'Paid');
  const pendingSubInvoices = subcontractorInvoiceTracking.filter((row) => row.status === 'Approved' && row.payment_status !== 'Paid');
  const openRfis = rfis.filter((row) => row.status !== 'Closed' && row.status !== 'Answered');
  const openQuality = quality.filter((row) => row.status !== 'Closed');
  const contractsWithoutBaseline = activeMainContracts.filter((contract) => !schedules.some((row) => row.contract_id === contract.id && String(row.activity || '').trim()));

  const insights: Insight[] = [];
  if (delayedActivities.length) insights.push({ severity: 'Critical', title: 'Schedule recovery required', detail: `${delayedActivities.length} activity(s) are delayed or past their finish date.`, recommendation: 'Open Schedule & Activities, confirm the remaining logic and assign a recovery action with an accountable owner.', view: 'schedule' });
  if (overBudget.length) insights.push({ severity: 'Critical', title: 'Cost overrun detected', detail: `${overBudget.length} cost-control line(s) have actual cost above their approved budget.`, recommendation: 'Review the cost entries, validate the remaining forecast and raise an approval or variation where the overrun is justified.', view: 'costs' });
  if (overdueClientInvoices.length) insights.push({ severity: 'Warning', title: 'Client cash collection is overdue', detail: `${overdueClientInvoices.length} client invoice(s) have passed their due date without being paid.`, recommendation: 'Confirm the collection owner, follow up with the client and update the expected receipt date in invoice tracking.', view: 'clientInvoiceTracking' });
  if (pendingSubInvoices.length) insights.push({ severity: 'Warning', title: 'Approved subcontract liabilities remain unpaid', detail: `${pendingSubInvoices.length} approved subcontractor invoice(s) are still open.`, recommendation: 'Check cash availability and payment certificates, then update the payment status when payment is released.', view: 'subcontractorInvoiceTracking' });
  if (pendingVariations.length) insights.push({ severity: 'Warning', title: 'Commercial decisions are pending', detail: `${pendingVariations.length} variation(s) are not yet approved or rejected.`, recommendation: 'Prioritize variations with time impact; an unapproved time extension can hide an emerging completion delay.', view: 'variations' });
  if (openRfis.length || openQuality.length) insights.push({ severity: 'Opportunity', title: 'Field-control items need closure', detail: `${openRfis.length} open RFI(s) and ${openQuality.length} open quality item(s) may affect planned work.`, recommendation: 'Review due dates and link critical items to the relevant BOQ activity or action owner.', view: openRfis.length ? 'rfi' : 'quality' });
  if (contractsWithoutBaseline.length) insights.push({ severity: 'Opportunity', title: 'Planning baseline is incomplete', detail: `${contractsWithoutBaseline.length} main contract(s) have no scheduled activities.`, recommendation: 'Import or create the activity plan before relying on planned value, SPI or finish forecasts.', view: 'schedule' });
  if (!insights.length) insights.push({ severity: 'Healthy', title: 'No material control exception found', detail: `${projects.length} project(s) were scanned against schedule, cost, commercial and field-control indicators.`, recommendation: 'Continue maintaining WIR, cost, invoice and schedule data so the next review remains reliable.', view: 'dashboard' });

  const criticalCount = insights.filter((insight) => insight.severity === 'Critical').length;
  const warningCount = insights.filter((insight) => insight.severity === 'Warning').length;
  return <div className="h-full overflow-y-auto bg-neutral-50 p-4 sm:p-6"><div className="mx-auto max-w-6xl space-y-5">
    <div className="rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-white p-5 shadow-sm"><div className="flex items-start gap-3"><div className="rounded-xl bg-violet-100 p-3 text-violet-700"><BrainCircuit size={24}/></div><div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-wider text-violet-700">Local PMO Assistant</p><h2 className="mt-1 text-2xl font-bold text-neutral-900">Explainable project-control insights</h2><p className="mt-1 max-w-3xl text-sm text-neutral-600">This assistant works entirely from your local SQLite data. It does not upload project, cost or contract information to any external AI service.</p></div><div className="hidden rounded-xl border border-violet-200 bg-white px-4 py-2 text-right sm:block"><p className="text-xs text-neutral-500">Control signals</p><p className="text-lg font-bold text-violet-800">{insights.length}</p></div></div></div>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><div className="rounded-xl border border-error-200 bg-white p-4"><p className="text-xs text-neutral-500">Critical</p><p className="mt-1 text-2xl font-bold text-error-700">{criticalCount}</p></div><div className="rounded-xl border border-warning-200 bg-white p-4"><p className="text-xs text-neutral-500">Warnings</p><p className="mt-1 text-2xl font-bold text-warning-700">{warningCount}</p></div><div className="rounded-xl border border-neutral-200 bg-white p-4"><p className="text-xs text-neutral-500">Active projects</p><p className="mt-1 text-2xl font-bold text-neutral-800">{projects.filter((project) => project.status !== 'Completed').length}</p></div><div className="rounded-xl border border-neutral-200 bg-white p-4"><p className="text-xs text-neutral-500">Data basis</p><p className="mt-1 text-sm font-bold text-neutral-800">Local SQLite</p></div></div>
    <div className="space-y-3">{insights.map((insight, index) => <div key={`${insight.title}-${index}`} className={`rounded-xl border p-4 ${styles[insight.severity]}`}><div className="flex gap-3"><div className="pt-0.5">{insight.severity === 'Healthy' ? <CircleCheck size={21}/> : insight.severity === 'Opportunity' ? <Lightbulb size={21}/> : <CircleAlert size={21}/>}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{insight.title}</h3><span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium">{insight.severity}</span></div><p className="mt-1 text-sm opacity-90">{insight.detail}</p><p className="mt-2 text-sm"><span className="font-semibold">Recommended action:</span> {insight.recommendation}</p></div><button onClick={() => onNavigate(insight.view)} className="flex shrink-0 items-center gap-1 self-start rounded-lg bg-white/80 px-3 py-2 text-xs font-semibold hover:bg-white">Open <CircleArrowRight size={15}/></button></div></div>)}</div>
  </div></div>;
}
