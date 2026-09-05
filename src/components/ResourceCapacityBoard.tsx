import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, BarChart3, CalendarClock, CheckCircle2, Users } from 'lucide-react';
import type { ViewKey } from '@/types';
import { calculatePlannedResourceLoads, calculateResourceLoads, suggestResourceLeveling } from '@/utils/resourceLoading';

function hours(value: number): string {
  return `${Math.round(value * 100) / 100}h`;
}

export function ResourceCapacityBoard({
  resources, assignments, schedules, workCalendars, laborDuty, equipment, onNavigate,
}: {
  resources: Record<string, any>[];
  assignments: Record<string, any>[];
  schedules: Record<string, any>[];
  workCalendars: Record<string, any>[];
  laborDuty: Record<string, any>[];
  equipment: Record<string, any>[];
  onNavigate: (view: ViewKey) => void;
}) {
  const [resourceId, setResourceId] = useState('all');
  const planned = useMemo(() => calculatePlannedResourceLoads(resources, assignments, schedules, workCalendars), [resources, assignments, schedules, workCalendars]);
  const actual = useMemo(() => calculateResourceLoads(resources, laborDuty, equipment, workCalendars), [resources, laborDuty, equipment, workCalendars]);
  const recommendations = useMemo(() => suggestResourceLeveling(resources, assignments, schedules, workCalendars), [resources, assignments, schedules, workCalendars]);
  const visiblePlanned = resourceId === 'all' ? planned : planned.filter((row) => row.resourceId === resourceId);
  const visibleActual = resourceId === 'all' ? actual : actual.filter((row) => row.resourceId === resourceId);
  const visibleRecommendations = resourceId === 'all' ? recommendations : recommendations.filter((row) => row.resourceId === resourceId);
  const resourceById = useMemo(() => new Map(resources.map((resource) => [String(resource.id), resource])), [resources]);
  const rows = useMemo(() => {
    const byKey = new Map<string, { resourceId: string; date: string; capacity: number; planned: number; actual: number }>();
    for (const load of visiblePlanned) byKey.set(`${load.resourceId}|${load.date}`, { resourceId: load.resourceId, date: load.date, capacity: load.capacityHours, planned: load.allocatedHours, actual: 0 });
    for (const load of visibleActual) {
      const key = `${load.resourceId}|${load.date}`;
      const current = byKey.get(key) || { resourceId: load.resourceId, date: load.date, capacity: load.capacityHours, planned: 0, actual: 0 };
      current.actual += load.allocatedHours;
      byKey.set(key, current);
    }
    return [...byKey.values()].sort((left, right) => left.date.localeCompare(right.date) || left.resourceId.localeCompare(right.resourceId));
  }, [visiblePlanned, visibleActual]);
  const maximum = Math.max(1, ...rows.map((row) => Math.max(row.capacity, row.planned, row.actual)));
  const plannedHours = visiblePlanned.reduce((sum, row) => sum + row.allocatedHours, 0);
  const actualHours = visibleActual.reduce((sum, row) => sum + row.allocatedHours, 0);
  const overloaded = rows.filter((row) => row.planned > row.capacity || row.actual > row.capacity);

  return <div className="mx-auto w-full max-w-[1600px] space-y-5 p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="flex items-center gap-2 text-2xl font-bold text-neutral-900"><BarChart3 className="text-primary-600"/>Resource Capacity Board</h1><p className="mt-1 text-sm text-neutral-500">Daily planned versus recorded load. Review recommendations before changing any activity, assignment, calendar, or baseline.</p></div>
      <div className="flex flex-wrap gap-2"><button onClick={() => onNavigate('resourceAssignments')} className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">Assignments <ArrowRight className="ml-1 inline" size={14}/></button><button onClick={() => onNavigate('schedule')} className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">Schedule <ArrowRight className="ml-1 inline" size={14}/></button></div>
    </div>
    <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm"><Users size={17} className="text-primary-600"/><label className="text-sm font-medium text-neutral-700" htmlFor="resource-capacity-filter">Resource</label><select id="resource-capacity-filter" value={resourceId} onChange={(event) => setResourceId(event.target.value)} className="min-w-64 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"><option value="all">All resources</option>{resources.filter((resource) => resource.status !== 'Inactive').map((resource) => <option key={resource.id} value={resource.id}>{resource.resource_code || resource.id} — {resource.resource_name || 'Unnamed resource'}</option>)}</select></div>
    <div className="grid gap-4 md:grid-cols-4">
      {[["Planned load", hours(plannedHours), 'text-primary-700'], ["Recorded load", hours(actualHours), 'text-emerald-700'], ["Overloaded resource-days", String(overloaded.length), overloaded.length ? 'text-red-700' : 'text-emerald-700'], ["CPM-aware reviews", String(visibleRecommendations.length), visibleRecommendations.length ? 'text-amber-700' : 'text-emerald-700']].map(([label, value, color]) => <div key={label} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"><p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p><p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p></div>)}
    </div>
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
      <div className="border-b border-neutral-200 px-4 py-3"><h2 className="font-semibold text-neutral-800">Daily capacity histogram</h2><p className="text-xs text-neutral-500">Blue = planned, green = recorded, grey line = available daily capacity.</p></div>
      {rows.length ? <div className="max-h-[560px] overflow-auto"><table className="w-full min-w-[850px] text-sm"><thead className="sticky top-0 bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Resource</th><th className="px-4 py-3">Load</th><th className="px-4 py-3 text-right">Plan / Actual / Capacity</th><th className="px-4 py-3">Status</th></tr></thead><tbody>{rows.map((row) => { const overload = Math.max(row.planned, row.actual) - row.capacity; const name = resourceById.get(row.resourceId); return <tr key={`${row.resourceId}-${row.date}`} className="border-t border-neutral-100"><td className="whitespace-nowrap px-4 py-3 text-neutral-700">{row.date}</td><td className="px-4 py-3 font-medium text-neutral-800">{name?.resource_code || row.resourceId} <span className="font-normal text-neutral-500">— {name?.resource_name || ''}</span></td><td className="min-w-[300px] px-4 py-3"><div className="relative h-7 rounded bg-neutral-100"><div className="absolute inset-y-1 left-0 rounded bg-primary-500/80" style={{ width: `${Math.min(100, row.planned / maximum * 100)}%` }} title={`Planned ${hours(row.planned)}`}/><div className="absolute inset-y-2 left-0 rounded bg-emerald-600/80" style={{ width: `${Math.min(100, row.actual / maximum * 100)}%` }} title={`Actual ${hours(row.actual)}`}/><div className="absolute inset-y-0 border-l-2 border-neutral-800" style={{ left: `${Math.min(100, row.capacity / maximum * 100)}%` }} title={`Capacity ${hours(row.capacity)}`}/></div></td><td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-neutral-700">{hours(row.planned)} / {hours(row.actual)} / {hours(row.capacity)}</td><td className="px-4 py-3">{overload > 0.001 ? <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700"><AlertTriangle size={13}/>Over by {hours(overload)}</span> : <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700"><CheckCircle2 size={13}/>Within capacity</span>}</td></tr>; })}</tbody></table></div> : <div className="p-10 text-center text-sm text-neutral-500"><CalendarClock className="mx-auto mb-2 text-neutral-300" size={28}/>No planned or recorded load exists for this resource selection.</div>}
    </div>
    <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4"><h2 className="flex items-center gap-2 font-semibold text-amber-900"><AlertTriangle size={17}/>CPM-aware leveling review</h2>{visibleRecommendations.length ? <div className="mt-3 space-y-2">{visibleRecommendations.map((recommendation) => <div key={`${recommendation.resourceId}-${recommendation.date}`} className="rounded-lg border border-amber-200 bg-white p-3 text-sm text-neutral-700"><span className="font-semibold">{recommendation.date}</span> — re-level at least <span className="font-semibold">{hours(recommendation.hoursToRelevel)}</span> for <span className="font-semibold">{resourceById.get(recommendation.resourceId)?.resource_code || recommendation.resourceId}</span>.<div className="mt-1 text-xs text-neutral-600">Candidates: {recommendation.candidates.map((candidate) => `${candidate.scheduleId} (${candidate.cycle ? 'cycle — do not move' : candidate.critical ? 'critical — escalation' : `${candidate.totalFloatDays}d float`})`).join(' · ')}</div></div>)}</div> : <p className="mt-2 text-sm text-emerald-700">No planned overload is currently detected for this selection.</p>}<p className="mt-3 text-xs text-amber-800">BuildTrack does not automatically move work. Review predecessor logic, constraints, activity calendars and approved baseline before changing an assignment.</p></div>
  </div>;
}
