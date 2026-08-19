import { useMemo, useState } from 'react';
import { ClipboardList, CalendarClock, FileCheck2, ArrowRight, Download, PenLine } from 'lucide-react';
import type { ViewKey } from '@/types';

type Project = Record<string, any>;
type Contract = Record<string, any>;
type BOQHeader = Record<string, any>;

const importTargets = [
  { table: 'boq_items', view: 'boqItems' as ViewKey, title: 'BOQ Items', description: 'Import item descriptions, units, quantities, rates and planned dates. Codes, contract, project and amounts are generated.', icon: ClipboardList },
  { table: 'schedules', view: 'schedule' as ViewKey, title: 'Schedule & Activities', description: 'Import activities, dates or duration, quantities and dependencies for the selected main contract.', icon: CalendarClock },
  { table: 'wir_entries', view: 'wir' as ViewKey, title: 'Inspection Requests', description: 'Import inspection dates, BOQ items, quantities, results and remarks for the selected contractor.', icon: FileCheck2 },
];

export function DataEntryWorkspace({ projects, contracts, boqHeaders, onOpen }: {
  projects: Project[];
  contracts: Contract[];
  boqHeaders: BOQHeader[];
  onOpen: (view: ViewKey) => void;
}) {
  const [projectId, setProjectId] = useState('');
  const [contractId, setContractId] = useState('');
  const [boqHeaderId, setBoqHeaderId] = useState('');
  const filteredContracts = useMemo(() => contracts.filter((contract) => !projectId || contract.project_id === projectId), [contracts, projectId]);
  const selectedContract = contracts.find((contract) => contract.id === contractId);
  const filteredHeaders = useMemo(() => boqHeaders.filter((header) => header.contract_id === contractId), [boqHeaders, contractId]);

  function chooseProject(value: string) { setProjectId(value); setContractId(''); setBoqHeaderId(''); }
  function chooseContract(value: string) {
    const contract = contracts.find((item) => item.id === value);
    setContractId(value); setProjectId(contract?.project_id || projectId); setBoqHeaderId('');
  }
  function openTarget(target: typeof importTargets[number]) {
    if (!projectId || !contractId) { alert('Select a project and contract first.'); return; }
    if (target.table === 'boq_items' && !boqHeaderId) { alert('Select a BOQ header before importing BOQ items.'); return; }
    if (target.table === 'schedules' && selectedContract?.parent_main_contract_id) { alert('Schedule activities must be imported under a main contract.'); return; }
    const scope: Record<string, string> = { project_id: projectId, contract_id: contractId };
    if (target.table === 'boq_items') scope.boq_header_id = boqHeaderId;
    if (target.table === 'wir_entries') scope.company_name = contractId;
    // Keep one explicit working context for the whole application.  The
    // target-specific scope below remains for backward compatibility, while
    // the work context lets related tables start in the same project/contract.
    window.localStorage.setItem('buildtrack:work-context', JSON.stringify(scope));
    window.localStorage.setItem(`buildtrack:import-scope:${target.table}`, JSON.stringify(scope));
    onOpen(target.view);
  }

  return <div className="h-full overflow-y-auto bg-neutral-50 p-4 sm:p-6"><div className="mx-auto max-w-6xl space-y-5">
    <section className="rounded-2xl border border-primary-200 bg-gradient-to-r from-primary-50 to-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wider text-primary-700">Guided Data Entry</p><h1 className="mt-1 text-2xl font-bold text-neutral-900">Choose the project context once</h1><p className="mt-2 max-w-3xl text-sm text-neutral-600">The selected scope is carried into the template, manual entry and import. Users do not need to repeat project, contract or calculated values on every Excel row.</p></section>
    <section className="grid gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm md:grid-cols-3"><label className="text-sm font-medium text-neutral-700">Project<select value={projectId} onChange={(event) => chooseProject(event.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2"><option value="">Select project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.project_code || project.id} — {project.name}</option>)}</select></label><label className="text-sm font-medium text-neutral-700">Contract<select value={contractId} onChange={(event) => chooseContract(event.target.value)} disabled={!projectId} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 disabled:bg-neutral-100"><option value="">Select contract</option>{filteredContracts.map((contract) => <option key={contract.id} value={contract.id}>{contract.contract_number || contract.id} — {contract.title || contract.contractor || ''}</option>)}</select></label><label className="text-sm font-medium text-neutral-700">BOQ Header <span className="font-normal text-neutral-400">(required for BOQ items)</span><select value={boqHeaderId} onChange={(event) => setBoqHeaderId(event.target.value)} disabled={!contractId} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 disabled:bg-neutral-100"><option value="">Select BOQ header</option>{filteredHeaders.map((header) => <option key={header.id} value={header.id}>{header.boq_code || header.id} — {header.classification || 'BOQ'}</option>)}</select></label></section>
    <section className="grid gap-4 lg:grid-cols-3">{importTargets.map((target) => { const Icon = target.icon; const disabled = !projectId || !contractId || (target.table === 'boq_items' && !boqHeaderId); return <article key={target.table} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"><div className="flex items-start gap-3"><div className="rounded-xl bg-primary-50 p-3 text-primary-700"><Icon size={22}/></div><div><h2 className="font-bold text-neutral-900">{target.title}</h2><p className="mt-2 text-sm leading-6 text-neutral-600">{target.description}</p></div></div><button disabled={disabled} onClick={() => openTarget(target)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-neutral-300"><PenLine size={16}/> Open scoped entry <ArrowRight size={15}/></button><p className="mt-3 flex items-center gap-1.5 text-xs text-neutral-500"><Download size={13}/> Download the scoped Template from the next screen.</p></article>; })}</section>
  </div></div>;
}
