'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import type { WaterfallRow } from '@/lib/scenarioAutomate/types';
import { formatCurrencyShort, formatAxisTick } from '@/lib/scenarioAutomate/format';
import { Copy, Check } from 'lucide-react';

interface Props {
  title: string;
  data: WaterfallRow[];
  className?: string;
}

function niceScale(min: number, max: number, ticks: number = 6) {
  const range = max - min || 1;
  const roughStep = range / ticks;
  const mag = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const residual = roughStep / mag;
  let niceStep: number;
  if (residual <= 1.5) niceStep = 1 * mag;
  else if (residual <= 3) niceStep = 2 * mag;
  else if (residual <= 7) niceStep = 5 * mag;
  else niceStep = 10 * mag;

  const niceMin = Math.floor(min / niceStep) * niceStep;
  const niceMax = Math.ceil(max / niceStep) * niceStep;
  const tickValues: number[] = [];
  for (let v = niceMin; v <= niceMax + niceStep * 0.01; v += niceStep) {
    tickValues.push(parseFloat(v.toFixed(10)));
  }
  return { min: niceMin, max: niceMax, ticks: tickValues };
}

export function FFWaterfallChart({ title, data, className = '' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(800);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleCopy = async () => {
    if (!svgRef.current) return;
    try {
      const svg = svgRef.current;
      const serializer = new XMLSerializer();
      let svgStr = serializer.serializeToString(svg);
      if (!svgStr.includes('xmlns=')) {
        svgStr = svgStr.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      }

      const img = new Image();
      const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = svg.width.baseVal.value * 2;
        canvas.height = svg.height.baseVal.value * 2;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.scale(2, 2);
        ctx.fillStyle = '#1A1A1A';
        ctx.fillRect(0, 0, svg.width.baseVal.value, svg.height.baseVal.value);
        ctx.drawImage(img, 0, 0);

        canvas.toBlob((blob) => {
          if (blob) {
            navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            });
          }
          URL.revokeObjectURL(url);
        }, 'image/png');
      };
      img.src = url;
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  // Bottom margin set to 130px to comfortably accommodate multi-line horizontal labels
  const margin = { top: 28, right: 20, bottom: 130, left: 64 };
  const chartW = Math.max(width - margin.left - margin.right, 200);
  const chartH = 300;
  const svgH = chartH + margin.top + margin.bottom;

  const { bars, scale } = useMemo(() => {
    const computedBars = data.map(row => ({
      label: row.label,
      type: row.type,
      value: row.value,
      barTop: Math.max(0, row.value),
      barBottom: Math.min(0, row.value),
    }));

    let allMin = 0;
    let allMax = 0;
    for (const b of computedBars) {
      allMin = Math.min(allMin, b.barBottom);
      allMax = Math.max(allMax, b.barTop);
    }
    const pad = (allMax - allMin) * 0.12 || 1;
    const s = niceScale(allMin < 0 ? allMin - pad : 0, allMax + pad);
    return { bars: computedBars, scale: s };
  }, [data]);

  const yScale = (v: number) => chartH - ((v - scale.min) / (scale.max - scale.min)) * chartH;
  const barCount = bars.length;
  const barGap = 10;
  const barWidth = Math.max((chartW - barGap * (barCount + 1)) / barCount, 20);
  const zeroY = yScale(0);

  return (
    <div className={`rounded-xl border border-outline/20 bg-[#1A1A1A] p-5 ${className}`} ref={containerRef}>
      <div className="flex items-center justify-between mb-3">
        <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant">
          {title}
        </p>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-container hover:bg-surface-container-high border border-outline/20 transition-colors text-[10px] font-mono uppercase tracking-widest text-on-surface"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied!' : 'Copy to PPT'}
        </button>
      </div>

      <svg ref={svgRef} width={width} height={svgH} style={{ overflow: 'visible', backgroundColor: '#1A1A1A' }}>
        <g transform={`translate(${margin.left}, ${margin.top})`}>
          {/* Grid lines and Y-axis ticks */}
          {scale.ticks.map((tick, i) => {
            const y = yScale(tick);
            return (
              <g key={i}>
                <line
                  x1={0} y1={y} x2={chartW} y2={y}
                  stroke={tick === 0 ? '#666666' : '#333333'}
                  strokeWidth={tick === 0 ? 1.5 : 0.5}
                  strokeDasharray={tick === 0 ? 'none' : '3,3'}
                />
                <text
                  x={-8} y={y} dy="0.35em"
                  textAnchor="end"
                  fill="#9CA3AF"
                  fontSize={9}
                  fontFamily="monospace"
                >
                  {formatAxisTick(tick)}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {bars.map((bar, i) => {
            const x = barGap + i * (barWidth + barGap);
            const topY = yScale(bar.barTop);
            const bottomY = yScale(bar.barBottom);
            const h = Math.max(bottomY - topY, 1);

            let fill = bar.type === 'base'
              ? '#F5C518'
              : bar.type === 'subtotal'
                ? '#3B82F6'
                : bar.value >= 0
                  ? '#22C55E'
                  : '#EF4444';

            // Value label above positive bar, below negative bar
            const labelY = bar.value >= 0 ? topY - 6 : bottomY + 14;
            const labelText = bar.type === 'impact'
              ? `${bar.value >= 0 ? '+' : ''}${formatCurrencyShort(bar.value)}`
              : formatCurrencyShort(bar.value);

            return (
              <g key={i}>
                <rect
                  x={x} y={topY} width={barWidth} height={h}
                  fill={fill} rx={2} opacity={0.85}
                  className="transition-opacity hover:opacity-100"
                />
                <text
                  x={x + barWidth / 2} y={labelY}
                  textAnchor="middle"
                  fontSize={9}
                  fontFamily="monospace"
                  fontWeight="bold"
                  fill="#E5E7EB"
                >
                  {labelText}
                </text>

                {/* Full untruncated horizontal X-axis label with multi-line word wrapping */}
                {(() => {
                  const words = bar.label.split(' ');
                  const lines: string[] = [];
                  let current = '';
                  for (const w of words) {
                    const test = current ? `${current} ${w}` : w;
                    if (test.length > 12) {
                      if (current) lines.push(current);
                      current = w;
                    } else {
                      current = test;
                    }
                  }
                  if (current) lines.push(current);

                  return lines.map((line, li) => (
                    <text
                      key={li}
                      x={x + barWidth / 2}
                      y={chartH + 16 + li * 12}
                      textAnchor="middle"
                      fontSize={8.5}
                      fontFamily="sans-serif"
                      fill="#9CA3AF"
                    >
                      {line}
                    </text>
                  ));
                })()}
              </g>
            );
          })}

          {/* Y-axis line */}
          <line x1={0} y1={0} x2={0} y2={chartH} stroke="#444444" strokeWidth={1} />
          {/* Prominent Zero X-axis line */}
          <line x1={0} y1={zeroY} x2={chartW} y2={zeroY} stroke="#888888" strokeWidth={1.5} />
        </g>
      </svg>

      <div className="flex items-center gap-4 mt-2 pt-2 border-t border-outline/10">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-[#F5C518]" />
          <span className="font-mono text-[8px] text-on-surface-variant">Base</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-[#22C55E]" />
          <span className="font-mono text-[8px] text-on-surface-variant">Positive Impact</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-[#EF4444]" />
          <span className="font-mono text-[8px] text-on-surface-variant">Negative Impact</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-[#3B82F6]" />
          <span className="font-mono text-[8px] text-on-surface-variant">Subtotal</span>
        </div>
      </div>
    </div>
  );
}