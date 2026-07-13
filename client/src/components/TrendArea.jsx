import { useId } from 'react';

// A single-series area+line trend, hand-rolled in SVG (no chart lib). One
// measure over time, so one accent hue and no legend - the card title names the
// series. The chart scales to its container via a viewBox; dots carry a native
// <title> tooltip and the peak is directly labelled so a value is readable
// without hover. Stroke/fill use accent tokens with dark-mode variants so it's a
// deliberately-stepped dark palette, not an auto-flip.
//
// data: [{ label, value }] already bucketed (e.g. one point per month).
export default function TrendArea({ data }) {
  const gradId = useId();
  const W = 520;
  const H = 150;
  const pad = { l: 14, r: 14, t: 16, b: 24 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const n = data.length;
  const max = Math.max(1, ...data.map((d) => d.value));
  const peak = data.reduce((m, d) => (d.value > m.value ? d : m), data[0] || { value: 0 });

  const x = (i) => pad.l + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v) => pad.t + innerH - (v / max) * innerH;

  const pts = data.map((d, i) => [x(i), y(d.value)]);
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const baseY = pad.t + innerH;
  const area = pts.length
    ? `${line} L${x(n - 1).toFixed(1)},${baseY} L${x(0).toFixed(1)},${baseY} Z`
    : '';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Applications over time">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" className="text-accent dark:text-accent-dark" stopColor="currentColor" stopOpacity="0.25" />
          <stop offset="100%" className="text-accent dark:text-accent-dark" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* recessive baseline */}
      <line x1={pad.l} y1={baseY} x2={W - pad.r} y2={baseY} className="stroke-line dark:stroke-line-dark" strokeWidth="1" />

      {area && <path d={area} fill={`url(#${gradId})`} className="text-accent dark:text-accent-dark" />}
      {line && <path d={line} fill="none" className="stroke-accent dark:stroke-accent-dark" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}

      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p[0]} cy={p[1]} r="3" className="fill-accent dark:fill-accent-dark" />
          <circle cx={p[0]} cy={p[1]} r="10" fill="transparent">
            <title>{`${data[i].label}: ${data[i].value}`}</title>
          </circle>
          <text x={p[0]} y={H - 7} textAnchor="middle" className="fill-ink/50 dark:fill-ink-dark/50" style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }}>
            {data[i].label}
          </text>
        </g>
      ))}

      {/* direct-label the peak so a number is legible without hovering */}
      {peak && peak.value > 0 && (
        <text
          x={x(data.indexOf(peak))}
          y={y(peak.value) - 7}
          textAnchor="middle"
          className="fill-ink/70 dark:fill-ink-dark/70"
          style={{ fontSize: 10, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}
        >
          {peak.value}
        </text>
      )}
    </svg>
  );
}
