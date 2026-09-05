import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BriefcaseBusiness, CalendarClock, ClipboardList, DollarSign, FileCheck2, FileSpreadsheet, PenLine, RotateCcw } from 'lucide-react';
import type { ViewKey } from '@/types';

type Row = Record<string, any>;

type EntryTarget = {
  table: string;
  view: ViewKey;
  title: string;
  description: string;
  icon: typeof ClipboardList;
  needsHeader?: boolean;
  mainContractOnly?: boolean;
};

const entryTargets: EntryTarget[] = [
  { table: 'boq_items', view: 'boqItems', title: 'BOQ items', description: 'Add or import descriptions, units, quantities, rates and governed dates. Project, contract and amount are filled from the selected context.', icon: ClipboardList, needsHeader: true },
  { table: 'schedules', view: 'schedule', title: 'Schedule & activities', description: 'Add or import activities, dependencies, dates and planned quantities against main-contract BOQ items.', icon: CalendarClock, mainContractOnly: true },
  { table: 'wir_entries', view: 'wir', title: 'Inspection requests', description: 'Record or import inspection quantities and results. Only BOQ items belonging to this contract remain available.', icon: FileCheck2 },
  { table: 'cost_entries', view: 'costEntries', title: 'Cost entries', description: 'Record a dated cost against the selected main contract and its BOQ item; cost control updates from the entry.', icon: DollarSign, mainContractOnly: true },
];

function readContext() {
  try {
    const saved = window.localStorage.getItem('buildtrack:work-context');
    return saved ? JSON.parse(saved) as Row : {};
  } catch { return {}; }
}

function readEntryPresets(): { name: string; project_id: string; contract_id: string; boq_header_id?: string }[] {
  try {
    const saved = window.localStorage.getItem('buildtrack:entry-presets');
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export function DataEntryWorkspace({ projects, contracts, boqHeaders, boqItems, schedules, wirs, costEntries, onOpen }: {
  projects: Row[];
  contracts: Row[];
  boqHeaders: Row[];
  boqItems: Row[];
  schedules: Row[];
  wirs: Row[];
  costEntries: Row[];
  onOpen: (view: ViewKey) => void;
}) {
  const savedContext = readContext();
  const [projectId, setProjectId] = useState(String(savedContext.project_id || ''));
  const [contractId, setContractId] = useState(String(savedContext.contract_id || ''));
  const [boqHeaderId, setBoqHeaderId] = useState(String(savedContext.boq_header_id || ''));
  const [presetName, setPresetName] = useState('');
  const [presets, setPresets] = useState(readEntryPresets);

  const selectedProject = projects.find((project) => project.id === projectId);
  const filteredContracts = useMemo(() => contracts.filter((contract) => contract.project_id === projectId), [contracts, projectId]);
  const selectedContract = contracts.find((contract) => contract.id === contractId);
  const filteredHeaders = useMemo(() => boqHeaders.filter((header) => header.contract_id === contractId), [boqHeaders, contractId]);
  const contractIsMain = Boolean(selectedContract && !selectedContract.parent_main_contract_id);
  const scopedCounts = useMemo(() => ({
    boq: boqItems.filter((item) => item.project_id === projectId && (!contractId || item.contract_id === contractId)).length,
    schedule: schedules.filter((row) => row.project_id === projectId && (!contractId || row.contract_id === contractId) && String(row.activity || '').trim()).length,
    wir: wirs.filter((row) => row.project_id === projectId && (!contractId || row.contract_id === contractId)).length,
    costs: costEntries.filter((row) => row.project_id === projectId && (!contractId || row.contract_id === contractId)).length,
  }), [projectId, contractId, boqItems, schedules, wirs, costEntries]);

  useEffect(() => {
    if (!projectId || !contractId) return;
    const scope: Row = { project_id: projectId, contract_id: contractId };
    if (boqHeaderId) scope.boq_header_id = boqHeaderId;
    window.localStorage.setItem('buildtrack:work-context', JSON.stringify(scope));
  }, [projectId, contractId, boqHeaderId]);

  function chooseProject(value: string) {
    setProjectId(value);
    setContractId('');
    setBoqHeaderId('');
  }

  function chooseContract(value: string) {
    const contract = contracts.find((item) => item.id === value);
    setContractId(value);
    setProjectId(contract?.project_id || projectId);
    setBoqHeaderId('');
  }

  function clearContext() {
    window.localStorage.removeItem('buildtrack:work-context');
    entryTargets.forEach((target) => window.localStorage.removeItem(`buildtrack:import-scope:${target.table}`));
    setProjectId('');
    setContractId('');
    setBoqHeaderId('');
  }

  function savePreset() {
    if (!projectId || !contractId || !presetName.trim()) { alert('Choose a project and contract, then enter a preset name.'); return; }
    const next = [...presets.filter((preset) => preset.name.toLowerCase() !== presetName.trim().toLowerCase()), { name: presetName.trim(), project_id: projectId, contract_id: contractId, ...(boqHeaderId ? { boq_header_id: boqHeaderId } : {}) }];
    setPresets(next); window.localStorage.setItem('buildtrack:entry-presets', JSON.stringify(next)); setPresetName('');
  }

  function applyPreset(preset: { project_id: string; contract_id: string; boq_header_id?: string }) {
    setProjectId(preset.project_id); setContractId(preset.contract_id); setBoqHeaderId(preset.boq_header_id || '');
  }

  function openTarget(target: EntryTarget) {
    if (!projectId || !contractId) { alert('Select a project and contract first.'); return; }
    if (target.needsHeader && !boqHeaderId) { alert('Select a BOQ header before opening BOQ item entry.'); return; }
    if (target.mainContractOnly && !contractIsMain) { alert(`${target.title} must be recorded against the main contract. Select the main contract for this project.`); return; }
    const scope: Row = { project_id: projectId, contract_id: contractId };
    if (target.needsHeader && boqHeaderId) scope.boq_header_id = boqHeaderId;
    window.localStorage.setItem('buildtrack:work-context', JSON.stringify(scope));
    window.localStorage.setItem(`buildtrack:import-scope:${target.table}`, JSON.stringify(scope));
    onOpen(target.view);
  }

  return <div className="h-full overflow-y-auto bg-neutral-50 p-4 sm:p-6"><div className="mx-auto max-w-6xl space-y-5">
    <section className="rounded-2xl border border-primary-200 bg-gradient-to-r from-primary-50 to-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-primary-700">Guided data entry</p><h1 className="mt-1 text-2xl font-bold text-neutral-900">One workspace for project operations</h1><p className="mt-2 max-w-3xl text-sm text-neutral-600">Choose the project and contract once. Every operation opens in the same context, so the user only enters business data—not repeated codes or calculated values.</p></div>{(projectId || contractId) && <button onClick={clearContext} className="flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"><RotateCcw size={15}/> Clear context</button>}</div></section>

    <section className="grid gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm md:grid-cols-3"><label className="text-sm font-medium text-neutral-700">1. Project<select value={projectId} onChange={(event) => chooseProject(event.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2"><option value="">Select project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.project_code || project.id} — {project.name}</option>)}</select></label><label className="text-sm font-medium text-neutral-700">2. Contract<select value={contractId} onChange={(event) => chooseContract(event.target.value)} disabled={!projectId} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 disabled:bg-neutral-100"><option value="">Select contract</option>{filteredContracts.map((contract) => <option key={contract.id} value={contract.id}>{contract.contract_number || contract.id} — {contract.title || contract.contractor || ''}{contract.parent_main_contract_id ? ' (Subcontract)' : ' (Main)'}</option>)}</select></label><label className="text-sm font-medium text-neutral-700">3. BOQ header <span className="font-normal text-neutral-400">(for BOQ)</span><select value={boqHeaderId} onChange={(event) => setBoqHeaderId(event.target.value)} disabled={!contractId} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 disabled:bg-neutral-100"><option value="">Select BOQ header</option>{filteredHeaders.map((header) => <option key={header.id} value={header.id}>{header.boq_code || header.id} — {header.classification || 'BOQ'}</option>)}</select></label></section>

    <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-end gap-2"><div className="min-w-56 flex-1"><p className="text-sm font-semibold text-neutral-800">Saved entry presets</p><p className="mt-1 text-xs text-neutral-500">Save a frequent project/contract/BOQ context and reopen it in one click.</p></div><input value={presetName} onChange={(event) => setPresetName(event.target.value)} placeholder="Preset name, e.g. Tower A weekly WIR" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"/><button onClick={savePreset} className="rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-100">Save current context</button></div>{presets.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{presets.map((preset) => <span key={preset.name} className="inline-flex items-center rounded-lg border border-neutral-200 bg-neutral-50"><button onClick={() => applyPreset(preset)} className="px-3 py-1.5 text-sm font-medium text-neutral-700 hover:text-primary-700">{preset.name}</button><button onClick={() => { const next = presets.filter((item) => item.name !== preset.name); setPresets(next); window.localStorage.setItem('buildtrack:entry-presets', JSON.stringify(next)); }} className="border-l border-neutral-200 px-2 py-1.5 text-xs text-neutral-400 hover:text-error-600" title="Remove preset">×</button></span>)}</div>}</section>

    {selectedContract && <section className="flex flex-wrap items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-900"><BriefcaseBusiness size={17}/><strong>{selectedProject?.project_code || selectedProject?.name}</strong><span className="text-primary-300">/</span><strong>{selectedContract.contract_number || selectedContract.id}</strong><span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold">{contractIsMain ? 'Main contract' : 'Subcontract'}</span><span className="text-xs text-primary-700">Context remains active until you clear it.</span></section>}

    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[{ label: 'BOQ items', value: scopedCounts.boq }, { label: 'Activities', value: scopedCounts.schedule }, { label: 'Inspection requests', value: scopedCounts.wir }, { label: 'Cost entries', value: scopedCounts.costs }].map((item) => <div key={item.label} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"><p className="text-xs text-neutral-500">{item.label} in this context</p><p className="mt-1 text-2xl font-bold text-neutral-900">{item.value}</p></div>)}</section>

    <section><div className="mb-3 flex items-center gap-2"><FileSpreadsheet size={18} className="text-primary-700"/><div><h2 className="font-bold text-neutral-900">Choose an operation</h2><p className="text-sm text-neutral-500">Each screen supports manual entry and the scoped template/import workflow.</p></div></div><div className="grid gap-4 lg:grid-cols-2">{entryTargets.map((target) => { const Icon = target.icon; const disabled = !projectId || !contractId || (target.needsHeader && !boqHeaderId) || (target.mainContractOnly && selectedContract && !contractIsMain); const note = target.mainContractOnly && selectedContract && !contractIsMain ? 'Select the main contract to continue.' : target.needsHeader && !boqHeaderId ? 'Select a BOQ header to continue.' : 'Context will be filled automatically.'; return <article key={target.table} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"><div className="flex items-start gap-3"><div className="rounded-xl bg-primary-50 p-3 text-primary-700"><Icon size={22}/></div><div><h2 className="font-bold text-neutral-900">{target.title}</h2><p className="mt-2 text-sm leading-6 text-neutral-600">{target.description}</p></div></div><button disabled={disabled} onClick={() => openTarget(target)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-neutral-300"><PenLine size={16}/> Open scoped entry <ArrowRight size={15}/></button><p className="mt-3 text-xs text-neutral-500">{note}</p></article>; })}</div></section>
  </div></div>;
}
