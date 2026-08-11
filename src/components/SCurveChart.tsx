import { useMemo } from 'react';

interface SCurvePoint {
  label: string;
  planned: number;
  actual: number;
  date: string;
}

export function SCurveChart({ data }: { data: SCurvePoint[] }) {
  const width = 800;
  const height = 320;
  const margin = { top: 20, right: 30, bottom: 50, left: 50 };
  const chartW = width - margin.left - margin.right;
  const chartH = height - margin.top - margin.bottom;

  const xLabels = useMemo(() => {
    const n = data.length;
    const step = Math.max(1, Math.ceil(n / 8));
    return data.filter((_, i) => i % step === 0).map((d) => d.label);
  }, [data]);

  const xScale = (i: number) => (i / Math.max(data.length - 1, 1)) * chartW;
  const yScale = (v: number) => chartH - (v / 100) * chartH;

  const plannedPath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i).toFixed(1)} ${yScale(d.planned).toFixed(1)}`)
    .join(' ');

  const actualPath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i).toFixed(1)} ${yScale(d.actual).toFixed(1)}`)
    .join(' ');

  const plannedArea = `${plannedPath} L ${xScale(data.length - 1).toFixed(1)} ${chartH} L 0 ${chartH} Z`;
  const actualArea = `${actualPath} L ${xScale(data.length - 1).toFixed(1)} ${chartH} L 0 ${chartH} Z`;

  const gridLines = [0, 25, 50, 75, 100];

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ minWidth: 600 }}>
        <defs>
          <linearGradient id="plannedGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </linearGradient>
        </defs>

        <g transform={`translate(${margin.left},${margin.top})`}>
          {/* Grid lines */}
          {gridLines.map((g) => (
            <g key={g}>
              <line
                x1={0} y1={yScale(g)} x2={chartW} y2={yScale(g)}
                stroke="#e5e5e5" strokeWidth={1}
                strokeDasharray={g === 0 ? '0' : '4 4'}
              />
              <text x={-8} y={yScale(g) + 4} textAnchor="end" className="fill-neutral-400" style={{ fontSize: 10 }}>
                {g}%
              </text>
            </g>
          ))}

          {/* X-axis labels */}
          {xLabels.map((label, i) => {
            const idx = data.findIndex((d) => d.label === label);
            return (
              <text
                key={label}
                x={xScale(idx)}
                y={chartH + 20}
                textAnchor="middle"
                className="fill-neutral-400"
                style={{ fontSize: 10 }}
              >
                {label.slice(5)}
              </text>
            );
          })}

          {/* Planned area + line */}
          <path d={plannedArea} fill="url(#plannedGrad)" />
          <path d={plannedPath} fill="none" stroke="#0ea5e9" strokeWidth={2.5} strokeLinejoin="round" />

          {/* Actual area + line */}
          <path d={actualArea} fill="url(#actualGrad)" />
          <path d={actualPath} fill="none" stroke="#22c55e" strokeWidth={2.5} strokeLinejoin="round" />

          {/* Data points */}
          {data.map((d, i) => (
            <g key={i}>
              <circle cx={xScale(i)} cy={yScale(d.planned)} r={2.5} fill="#0ea5e9" />
              <circle cx={xScale(i)} cy={yScale(d.actual)} r={2.5} fill="#22c55e" />
            </g>
          ))}

          {/* X-axis line */}
          <line x1={0} y1={chartH} x2={chartW} y2={chartH} stroke="#d4d4d4" strokeWidth={1.5} />
        </g>
      </svg>
    </div>
  );
}
