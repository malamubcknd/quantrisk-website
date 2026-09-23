'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import type { Table1Data, MatrixRow } from '@/lib/scenarioAutomate/types';
import { SCENARIO_META } from '@/lib/scenarioAutomate/types';
import { formatAxisTick } from '@/lib/scenarioAutomate/format';
import { Copy, Check } from 'lucide-react';

interface Props {
  data: Table1Data;
  className?: string;
}

const STACK_CONFIG = [
  { key: 'revenue', label: 'Revenue', color: '#3B82F6' },
  { key: 'ebitda',  label: 'EBITDA',  color: '#F5C518' },
  { key: 'pat',     label: 'PAT',     color: '#22C55E' },
  { key: 'capex',   label: 'Capex',   color: '#8B5CF6' },
] as const;

function niceScale(min: number, max: number, ticks: number = 6) {
  // Guard against empty / all-zero data
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { min: 0, max: 100, ticks: [0, 25, 50, 75, 100] };
  }
  if (min === max) {
    if (min === 0) {
      return { min: 0, max: 100, ticks: [0, 25, 50, 75, 100] };
    }
    const pad = Math.abs(min) * 0.2 || 1;
    min = min - pad;
    max = max + pad;
  }

  const range = max - min || 1;
  const roughStep = range / ticks;
  const mag = Math.pow(10, Math.floor(Math.log10(Math.abs(roughStep) || 1)));
  const residual = roughStep / mag;
  let niceStep: number;
  if (residual <= 1.5) niceStep = 1 * mag;
  else if (residual <= 3) niceStep = 2 * mag;
  else if (residual <= 7) niceStep = 5 * mag;
  else niceStep = 10 * mag;

  if (!Number.isFinite(niceStep) || niceStep === 0) niceStep = 1;

  const niceMin = Math.floor(min / niceStep) * niceStep;
  const niceMax = Math.ceil(max / niceStep) * niceStep;
  const tickValues: number[] = [];
  for (let v = niceMin; v <= niceMax + niceStep * 0.01; v += niceStep) {
    tickValues.push(parseFloat(v.toFixed(10)));
  }
  if (tickValues.length === 0) tickValues.push(0, 100);
  return { min: niceMin, max: niceMax === niceMin ? niceMin + niceStep : niceMax, ticks: tickValues };
}

function formatInt(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return Math.round(value).toLocaleString();
}

function safeNum(n: number, fallback = 0): number {
  return Number.isFinite(n) ? n : fallback;
}

export function FFStackedBarChart({ data, className = '' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(1000);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setWidth(Math.max(entry.contentRect.width, 300));
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

  const margin = { top: 24, right: 20, bottom: 130, left: 64 };
  const chartW = Math.max(width - margin.left - margin.right, 300);
  const chartH = 360;
  const svgH = chartH + margin.top + margin.bottom;

  const scenarioKeys = useMemo(
    () => ['baseCase', ...Object.keys(data).filter(k => k !== 'baseCase')] as string[],
    [data],
  );

  const { stacks, scale } = useMemo(() => {
    let globalMax = 0;

    const computedStacks = scenarioKeys.map(sk => {
      const row = (data as unknown as Record<string, MatrixRow | undefined>)[sk];
      const label = sk === 'baseCase'
        ? '2026 Ghana Business Plan (Base Case)'
        : (SCENARIO_META[sk]?.label ?? sk);

      let currentY = 0;
      const segments: { key: string; value: number; bottom: number; top: number; color: string }[] = [];

      for (const config of STACK_CONFIG) {
        const raw = row ? row[config.key as keyof MatrixRow] : 0;
        const val = Math.max(0, safeNum(Number(raw), 0));
        const bottom = currentY;
        const top = currentY + val;
        segments.push({ key: config.key, value: val, bottom, top, color: config.color });
        currentY = top;
      }

      globalMax = Math.max(globalMax, currentY);
      return { id: sk, label, segments };
    });

    const s = niceScale(0, globalMax > 0 ? globalMax * 1.05 : 100);
    return { stacks: computedStacks, scale: s };
  }, [data, scenarioKeys]);

  const yScale = (v: number) => {
    const range = scale.max - scale.min;
    if (!Number.isFinite(range) || range === 0) return chartH;
    const result = chartH - ((v - scale.min) / range) * chartH;
    return safeNum(result, chartH);
  };

  const barCount = Math.max(stacks.length, 1);
  const barGap = 10;
  const barWidth = Math.max((chartW - barGap * (barCount + 1)) / barCount, 24);

  return (
    <div className={`rounded-xl border border-outline/20 bg-[#1A1A1A] p-5 ${className}`} ref={containerRef}>
      <div className="flex items-center justify-between mb-3">
        <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant">
          Impact Overview — Absolute Metrics (GHS M)
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
          {scale.ticks.map((tick, i) => {
            const y = yScale(tick);
            return (
              <g key={i}>
                <line
                  x1={0}
                  y1={y}
                  x2={chartW}
                  y2={y}
                  stroke={tick === 0 ? '#666666' : '#333333'}
                  strokeWidth={tick === 0 ? 1.5 : 0.5}
                  strokeDasharray={tick === 0 ? 'none' : '3,3'}
                />
                <text
                  x={-8}
                  y={y}
                  dy="0.35em"
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

          {stacks.map((stack, i) => {
            const x = barGap + i * (barWidth + barGap);
            const lastTop = stack.segments[stack.segments.length - 1]?.top ?? 0;
            const totalTopY = yScale(lastTop);
            const totalValue = stack.segments.reduce((s, seg) => s + seg.value, 0);

            return (
              <g key={stack.id}>
                {stack.segments.map(seg => {
                  const topY = yScale(seg.top);
                  const bottomY = yScale(seg.bottom);
                  const h = Math.max(safeNum(bottomY - topY, 0), 0);

                  const showText = h > 14;
                  const midY = topY + h / 2;

                  return (
                    <g key={seg.key}>
                      <rect
                        x={x}
                        y={topY}
                        width={barWidth}
                        height={h}
                        fill={seg.color}
                        opacity={0.85}
                        rx={2}
                      />
                      {showText && (
                        <text
                          x={x + barWidth / 2}
                          y={midY}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill="#FFFFFF"
                          fontSize={9}
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          {formatInt(seg.value)}
                        </text>
                      )}
                    </g>
                  );
                })}

                <text
                  x={x + barWidth / 2}
                  y={totalTopY - 6}
                  textAnchor="middle"
                  fontSize={9}
                  fontFamily="monospace"
                  fontWeight="bold"
                  fill="#E5E7EB"
                >
                  {formatInt(totalValue)}
                </text>

                {(() => {
                  const words = stack.label.split(' ');
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

          <line x1={0} y1={0} x2={0} y2={chartH} stroke="#444444" strokeWidth={1} />
          <line x1={0} y1={chartH} x2={chartW} y2={chartH} stroke="#666666" strokeWidth={1} />
        </g>
      </svg>

      <div className="flex items-center gap-4 mt-2 pt-2 border-t border-outline/10">
        {STACK_CONFIG.map(config => (
          <div key={config.key} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: config.color }} />
            <span className="font-mono text-[8px] text-on-surface-variant">{config.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}