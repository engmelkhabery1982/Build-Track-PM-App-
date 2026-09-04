import React, { useState } from 'react';

export interface GanttOverlayActivity {
  id: string;
  name: string;
  wbs?: string;
  baselineStart: string;
  baselineFinish: string;
  currentStart: string;
  currentFinish: string;
  forecastStart?: string;
  forecastFinish?: string;
  progress: number;
  isCritical?: boolean;
  totalFloat?: number;
}

export interface ThreeWayGanttOverlayProps {
  activities?: GanttOverlayActivity[];
  dataDate?: string;
}

const DEFAULT_ACTIVITIES: GanttOverlayActivity[] = [
  {
    id: 'ACT-101',
    name: 'Substructure Excavation & Deep Piling',
    baselineStart: '2026-01-01',
    baselineFinish: '2026-02-15',
    currentStart: '2026-01-01',
    currentFinish: '2026-02-15',
    forecastFinish: '2026-02-15',
    progress: 100,
    isCritical: false,
    totalFloat: 15
  },
  {
    id: 'ACT-102',
    name: 'Reinforced Concrete Core & Slabs (L1-L4)',
    baselineStart: '2026-02-16',
    baselineFinish: '2026-05-30',
    currentStart: '2026-02-16',
    currentFinish: '2026-06-10',
    forecastFinish: '2026-06-10',
    progress: 75,
    isCritical: true,
    totalFloat: 0
  },
  {
    id: 'ACT-103',
    name: 'Structural Steelwork & Trusses',
    baselineStart: '2026-04-01',
    baselineFinish: '2026-07-15',
    currentStart: '2026-04-10',
    currentFinish: '2026-07-25',
    forecastFinish: '2026-07-25',
    progress: 40,
    isCritical: false,
    totalFloat: 5
  },
  {
    id: 'ACT-104',
    name: 'MEP Primary Risers & Plant Rooms',
    baselineStart: '2026-05-01',
    baselineFinish: '2026-08-30',
    currentStart: '2026-05-15',
    currentFinish: '2026-09-15',
    forecastFinish: '2026-09-15',
    progress: 25,
    isCritical: true,
    totalFloat: 0
  },
  {
    id: 'ACT-105',
    name: 'Facade Unitized Glazing & Cladding',
    baselineStart: '2026-06-15',
    baselineFinish: '2026-09-30',
    currentStart: '2026-07-01',
    currentFinish: '2026-10-15',
    forecastFinish: '2026-10-15',
    progress: 10,
    isCritical: false,
    totalFloat: 8
  },
  {
    id: 'ACT-106',
    name: 'Testing, Commissioning & Handover',
    baselineStart: '2026-09-01',
    baselineFinish: '2026-11-15',
    currentStart: '2026-09-15',
    currentFinish: '2026-11-30',
    forecastFinish: '2026-11-30',
    progress: 0,
    isCritical: true,
    totalFloat: 0
  }
];

export const ThreeWayGanttOverlay: React.FC<ThreeWayGanttOverlayProps> = ({
  activities = DEFAULT_ACTIVITIES,
  dataDate = '2026-05-15'
}) => {
  const [showBaseline, setShowBaseline] = useState(true);
  const [showCurrent, setShowCurrent] = useState(true);
  const [showForecast, setShowForecast] = useState(true);
  const [criticalOnly, setCriticalOnly] = useState(false);

  const displayActivities = (activities.length > 0 ? activities : DEFAULT_ACTIVITIES).filter(
    (act) => (criticalOnly ? act.isCritical || (act.totalFloat !== undefined && act.totalFloat <= 0) : true)
  );

  const calculateVarianceDays = (baselineFinish: string, compareFinish?: string): number => {
    if (!compareFinish) return 0;
    const base = new Date(baselineFinish).getTime();
    const comp = new Date(compareFinish).getTime();
    return Math.round((comp - base) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-3">
        <div>
          <h3 className="text-base font-semibold text-neutral-900">
            3-Way Gantt Overlay (SCH-05)
          </h3>
          <p className="text-xs text-neutral-500">
            Baseline Contract Dates vs. Current Actual Progress vs. Future Forecast
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <label className="flex items-center gap-1.5 cursor-pointer text-neutral-700">
            <input
              type="checkbox"
              checked={showBaseline}
              onChange={(e) => setShowBaseline(e.target.checked)}
              className="rounded border-neutral-300 text-slate-600 focus:ring-slate-500"
            />
            <span>Baseline</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-neutral-700">
            <input
              type="checkbox"
              checked={showCurrent}
              onChange={(e) => setShowCurrent(e.target.checked)}
              className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Current / Actual</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-neutral-700">
            <input
              type="checkbox"
              checked={showForecast}
              onChange={(e) => setShowForecast(e.target.checked)}
              className="rounded border-neutral-300 text-amber-600 focus:ring-amber-500"
            />
            <span>Forecast</span>
          </label>
          <div className="h-4 w-px bg-neutral-200" />
          <label className="flex items-center gap-1.5 cursor-pointer font-medium text-rose-600">
            <input
              type="checkbox"
              checked={criticalOnly}
              onChange={(e) => setCriticalOnly(e.target.checked)}
              className="rounded border-neutral-300 text-rose-600 focus:ring-rose-500"
            />
            <span>Critical Path Only</span>
          </label>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-neutral-500 py-1">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded bg-slate-600 inline-block" /> Baseline
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded bg-blue-600 inline-block" /> Current (Progress Fill)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded bg-amber-500 inline-block" /> Forecast Trend
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-rose-500 inline-block" /> Critical (Float = 0)
        </span>
        <span className="ml-auto text-neutral-400">Data Date: {dataDate}</span>
      </div>

      <div className="overflow-x-auto border border-neutral-200 rounded-lg">
        <table className="w-full text-left text-xs text-neutral-700">
          <thead className="bg-neutral-50 text-neutral-600 border-b border-neutral-200">
            <tr>
              <th className="py-2 px-3 font-medium">Activity</th>
              <th className="py-2 px-2 font-medium w-16 text-center">Prog %</th>
              <th className="py-2 px-2 font-medium w-16 text-center">Float</th>
              <th className="py-2 px-2 font-medium w-20 text-center">Variance</th>
              <th className="py-2 px-3 font-medium min-w-[320px]">Timeline Comparison</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {displayActivities.map((act) => {
              const variance = calculateVarianceDays(
                act.baselineFinish,
                act.forecastFinish || act.currentFinish
              );
              return (
                <tr key={act.id} className="hover:bg-neutral-50/60 transition-colors">
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      {act.isCritical && (
                        <span
                          className="h-2 w-2 rounded-full bg-rose-500 shrink-0"
                          title="Critical Path Activity"
                        />
                      )}
                      <div>
                        <div className="font-semibold text-neutral-900">{act.id}</div>
                        <div className="text-neutral-500 text-[11px] truncate max-w-[200px]">
                          {act.name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-2 text-center font-medium">
                    {act.progress}%
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        (act.totalFloat ?? 0) <= 0
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {act.totalFloat ?? 0}d
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        variance > 0
                          ? 'bg-amber-50 text-amber-700'
                          : variance < 0
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'text-neutral-600'
                      }`}
                    >
                      {variance > 0 ? `+${variance}d` : `${variance}d`}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="space-y-1 py-1">
                      {showBaseline && (
                        <div className="flex items-center gap-2 text-[10px] text-neutral-500">
                          <span className="w-12 text-right shrink-0">Base:</span>
                          <div className="w-full bg-neutral-100 rounded h-2 overflow-hidden relative">
                            <div className="bg-slate-600 h-full rounded w-full" />
                          </div>
                          <span className="w-16 text-[9px] shrink-0">{act.baselineFinish.slice(5)}</span>
                        </div>
                      )}
                      {showCurrent && (
                        <div className="flex items-center gap-2 text-[10px] text-neutral-500">
                          <span className="w-12 text-right shrink-0">Act:</span>
                          <div className="w-full bg-neutral-100 rounded h-2 overflow-hidden relative">
                            <div
                              className="bg-blue-600 h-full rounded transition-all"
                              style={{ width: `${act.progress}%` }}
                            />
                          </div>
                          <span className="w-16 text-[9px] shrink-0">{act.currentFinish.slice(5)}</span>
                        </div>
                      )}
                      {showForecast && (
                        <div className="flex items-center gap-2 text-[10px] text-neutral-500">
                          <span className="w-12 text-right shrink-0">Fcst:</span>
                          <div className="w-full bg-neutral-100 rounded h-2 overflow-hidden relative">
                            <div
                              className={`h-full rounded ${
                                variance > 0 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: '100%' }}
                            />
                          </div>
                          <span className="w-16 text-[9px] shrink-0">
                            {(act.forecastFinish || act.currentFinish).slice(5)}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ThreeWayGanttOverlay;
