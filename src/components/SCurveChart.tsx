import { useMemo } from 'react';

interface SCurvePoint {
  label: string;
  planned: number;
  earned: number;
  actual: number;
  forecast?: number;
  cash?: number;
  estimate?: number;
  resourceForecast?: number;
  date: string;
}

function compactValue(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
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
  // Cash can legitimately be negative. Keep zero inside the scale instead of
  // clipping a deficit to the axis, otherwise the executive curve lies.
  const values = data.flatMap((point) => [point.planned, point.earned, point.actual, point.forecast || 0, point.cash || 0, point.estimate || 0, point.resourceForecast || 0]);
  const maximum = Math.max(...values, 0, 1);
  const minimum = Math.min(...values, 0);
  const valueRange = Math.max(maximum - minimum, 1);
  const yScale = (v: number) => chartH - ((v - minimum) / valueRange) * chartH;
  const zeroY = yScale(0);

  const plannedPath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i).toFixed(1)} ${yScale(d.planned).toFixed(1)}`)
    .join(' ');

  const actualPath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i).toFixed(1)} ${yScale(d.actual).toFixed(1)}`)
    .join(' ');
  const earnedPath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i).toFixed(1)} ${yScale(d.earned).toFixed(1)}`)
    .join(' ');
  const forecastPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i).toFixed(1)} ${yScale(d.forecast || 0).toFixed(1)}`).join(' ');
  const cashPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i).toFixed(1)} ${yScale(d.cash || 0).toFixed(1)}`).join(' ');
  const estimatePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i).toFixed(1)} ${yScale(d.estimate || 0).toFixed(1)}`).join(' ');
  const resourceForecastPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i).toFixed(1)} ${yScale(d.resourceForecast || 0).toFixed(1)}`).join(' ');

  const plannedArea = `${plannedPath} L ${xScale(data.length - 1).toFixed(1)} ${zeroY.toFixed(1)} L 0 ${zeroY.toFixed(1)} Z`;
  const actualArea = `${actualPath} L ${xScale(data.length - 1).toFixed(1)} ${zeroY.toFixed(1)} L 0 ${zeroY.toFixed(1)} Z`;

  const gridLines = [0, 0.25, 0.5, 0.75, 1];

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
                x1={0} y1={chartH - g * chartH} x2={chartW} y2={chartH - g * chartH}
                stroke="#e5e5e5" strokeWidth={1}
                strokeDasharray={g === 0 ? '0' : '4 4'}
              />
              <text x={-8} y={chartH - g * chartH + 4} textAnchor="end" className="fill-neutral-400" style={{ fontSize: 10 }}>
                {compactValue(minimum + valueRange * g)}
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
          <path d={earnedPath} fill="none" stroke="#8b5cf6" strokeWidth={2.5} strokeLinejoin="round" strokeDasharray="6 4" />
          <path d={forecastPath} fill="none" stroke="#f97316" strokeWidth={2} strokeLinejoin="round" strokeDasharray="3 4" />
          <path d={cashPath} fill="none" stroke="#14b8a6" strokeWidth={2} strokeLinejoin="round" strokeDasharray="8 3" />
          <path d={estimatePath} fill="none" stroke="#dc2626" strokeWidth={2} strokeLinejoin="round" strokeDasharray="10 4" />
          <path d={resourceForecastPath} fill="none" stroke="#a16207" strokeWidth={2} strokeLinejoin="round" strokeDasharray="2 3" />

          {/* Data points */}
          {data.map((d, i) => (
            <g key={i}>
              <circle cx={xScale(i)} cy={yScale(d.planned)} r={2.5} fill="#0ea5e9" />
              <circle cx={xScale(i)} cy={yScale(d.earned)} r={2.5} fill="#8b5cf6" />
              <circle cx={xScale(i)} cy={yScale(d.actual)} r={2.5} fill="#22c55e" />
            </g>
          ))}

          {/* X-axis line */}
          <line x1={0} y1={chartH} x2={chartW} y2={chartH} stroke="#d4d4d4" strokeWidth={1.5} />
          {minimum < 0 && <line x1={0} y1={zeroY} x2={chartW} y2={zeroY} stroke="#a3a3a3" strokeWidth={1} strokeDasharray="3 3" />}
        </g>
      </svg>
    </div>
  );
}
