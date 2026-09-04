import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, FolderKanban, FileSignature, LayoutPanelTop } from 'lucide-react';
import type { ViewKey } from '@/types';

type Destination = { key: ViewKey; label: string; group: string };

export function CommandPalette({ destinations, projects, contracts, onNavigate, onOpenProject }: {
  destinations: Destination[];
  projects: Record<string, any>[];
  contracts: Record<string, any>[];
  onNavigate: (view: ViewKey) => void;
  onOpenProject: (projectId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setOpen(true); }
      if (event.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, []);
  useEffect(() => { if (open) window.setTimeout(() => inputRef.current?.focus(), 0); }, [open]);

  const needle = query.trim().toLowerCase();
  const pages = useMemo(() => destinations.filter((item) => !needle || `${item.label} ${item.group}`.toLowerCase().includes(needle)).slice(0, 6), [destinations, needle]);
  const matchedProjects = useMemo(() => projects.filter((item) => !needle || `${item.project_code || ''} ${item.name || ''}`.toLowerCase().includes(needle)).slice(0, 5), [projects, needle]);
  const matchedContracts = useMemo(() => contracts.filter((item) => !needle || `${item.contract_number || ''} ${item.title || ''} ${item.contractor || ''}`.toLowerCase().includes(needle)).slice(0, 5), [contracts, needle]);
  const go = (view: ViewKey) => { setOpen(false); setQuery(''); onNavigate(view); };

  return <>
    <button onClick={() => setOpen(true)} className="hidden items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-500 shadow-sm hover:bg-neutral-50 lg:flex" title="Search pages, projects and contracts (Ctrl+K)"><Search size={15}/> Search <kbd className="rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-[10px]">Ctrl K</kbd></button>
    {open && <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/40 px-4 pt-[12vh]" onMouseDown={() => setOpen(false)}><div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}><div className="flex items-center gap-3 border-b border-neutral-200 px-4 py-3"><Search className="text-neutral-400" size={20}/><input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search pages, projects, contracts…" className="min-w-0 flex-1 border-0 text-base outline-none"/><button onClick={() => setOpen(false)} className="rounded p-1 text-neutral-500 hover:bg-neutral-100"><X size={18}/></button></div><div className="max-h-[60vh] overflow-y-auto p-3">
      <p className="px-2 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Pages and actions</p>{pages.map((item) => <button key={item.key} onClick={() => go(item.key)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-primary-50"><LayoutPanelTop size={17} className="text-primary-600"/><span className="flex-1 font-medium text-neutral-800">{item.label}</span><span className="text-xs text-neutral-400">{item.group}</span></button>)}
      <p className="px-2 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-neutral-400">Projects</p>{matchedProjects.map((item) => <button key={item.id} onClick={() => { setOpen(false); setQuery(''); onOpenProject(item.id); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-primary-50"><FolderKanban size={17} className="text-violet-600"/><span className="flex-1"><span className="block font-medium text-neutral-800">{item.name || item.project_code}</span><span className="text-xs text-neutral-500">{item.project_code || item.id}</span></span></button>)}
      <p className="px-2 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-neutral-400">Contracts</p>{matchedContracts.map((item) => <button key={item.id} onClick={() => { setOpen(false); setQuery(''); onOpenProject(item.project_id); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-primary-50"><FileSignature size={17} className="text-amber-600"/><span className="flex-1"><span className="block font-medium text-neutral-800">{item.contract_number || item.title}</span><span className="text-xs text-neutral-500">{item.title || item.contractor || ''}</span></span></button>)}
      {!pages.length && !matchedProjects.length && !matchedContracts.length && <p className="p-8 text-center text-sm text-neutral-500">No matching page, project or contract.</p>}
    </div><div className="border-t border-neutral-100 bg-neutral-50 px-4 py-2 text-xs text-neutral-500">Press Esc to close · Ctrl K to open</div></div></div>}
  </>;
}
