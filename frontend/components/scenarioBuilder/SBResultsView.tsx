// 'use client';

// import { useState, useMemo, useCallback } from 'react';
// import {
//   TableProperties, BarChart3, Download, Info, FlaskConical,
//   TrendingUp, Zap, ShieldAlert, Layers, Copy
// } from 'lucide-react';
// import type { ComputedResults, ScenarioItem, WaterfallItem } from '@/lib/scenarioBuilder';

// // ── Color Palette for Impact Overview Metrics ───────────────────────────

// const METRIC_COLORS = [
//   '#3B82F6', // Blue (Revenue)
//   '#F5C518', // MTN Yellow (EBITDA)
//   '#22C55E', // Green (PAT)
//   '#8B5CF6', // Purple (Capex)
//   '#EC4899', // Pink
//   '#06B6D4', // Cyan
//   '#F97316', // Orange
//   '#10B981', // Emerald
// ];

// function getMetricColor(idx: number): string {
//   return METRIC_COLORS[idx % METRIC_COLORS.length] || '#3B82F6';
// }

// // ── Formatting Helpers ──────────────────────────────────────────────────

// function fmtVal(val: number, decimals: number = 2): string {
//   const abs = Math.abs(val);
//   if (abs >= 1e6) return `${(val / 1e6).toFixed(decimals)}M`;
//   if (abs >= 1e3) return `${(val / 1e3).toFixed(decimals)}K`;
//   return `${val.toFixed(decimals)}M`;
// }

// function fmtDelta(val: number, decimals: number = 2): string {
//   const sign = val >= 0 ? '+' : '';
//   return `${sign}${fmtVal(val, decimals)}`;
// }

// function splitText(text: string, maxLen: number = 14): string[] {
//   if (!text) return [''];
//   const words = text.split(' ');
//   const lines: string[] = [];
//   let currentLine = '';
//   for (const word of words) {
//     if ((currentLine + ' ' + word).trim().length <= maxLen) {
//       currentLine = (currentLine + ' ' + word).trim();
//     } else {
//       if (currentLine) lines.push(currentLine);
//       currentLine = word;
//     }
//   }
//   if (currentLine) lines.push(currentLine);
//   return lines;
// }

// type Tab = 'tables' | 'waterfalls' | 'impact';

// function TabBtn({ active, label, icon: Icon, onClick }: {
//   active: boolean; label: string; icon: typeof TableProperties; onClick: () => void;
// }) {
//   return (
//     <button
//       onClick={onClick}
//       className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-mono text-[10px] uppercase tracking-widest transition-all ${
//         active
//           ? 'bg-mtn-yellow text-black font-bold'
//           : 'border border-outline/20 text-on-surface-variant hover:text-on-surface hover:border-outline/40'
//       }`}
//     >
//       <Icon className="w-3.5 h-3.5" />
//       {label}
//     </button>
//   );
// }

// // ── 1. Custom SVG Waterfall Chart (Tables 3-6) ──────────────────────────

// function SVGWaterfallChart({ title, data }: { title: string; data: WaterfallItem[] }) {
//   if (!data || data.length === 0) {
//     return (
//       <div className="rounded-xl border border-outline/20 bg-[#1A1A1A] p-6 text-center">
//         <p className="text-xs text-on-surface-variant italic">No waterfall data for {title}</p>
//       </div>
//     );
//   }

//   // Calculate Running Totals
//   const points: { item: WaterfallItem; start: number; end: number; val: number }[] = [];
//   let running = 0;
//   for (const item of data) {
//     let start = 0;
//     let end = 0;
//     if (item.type === 'base' || item.type === 'total') {
//       start = 0;
//       end = item.value;
//       running = item.value;
//     } else {
//       start = running;
//       end = running + item.value;
//       running = end;
//     }
//     points.push({ item, start, end, val: item.value });
//   }

//   // Bounds & Scaling
//   const allVals = points.flatMap(p => [p.start, p.end]);
//   let minVal = Math.min(0, ...allVals);
//   let maxVal = Math.max(0, ...allVals);
//   if (maxVal === minVal) maxVal += 1;
//   maxVal = maxVal * 1.15;
//   const range = maxVal - minVal;

//   const svgWidth = 867;
//   const svgHeight = 458;
//   const margin = { top: 28, right: 20, bottom: 130, left: 64 };
//   const chartW = svgWidth - margin.left - margin.right;
//   const chartH = svgHeight - margin.top - margin.bottom;

//   const getY = (v: number) => chartH - ((v - minVal) / range) * chartH;
//   const zeroY = getY(0);

//   const ticks = [0, 1, 2, 3, 4, 5].map(i => maxVal - (range * i) / 5);

//   const n = points.length;
//   const barTotalW = chartW / n;
//   const barW = barTotalW * 0.75;
//   const gap = barTotalW * 0.25;

//   const getFill = (type: string) => {
//     if (type === 'base') return '#F5C518';
//     if (type === 'positive') return '#22C55E';
//     if (type === 'negative') return '#EF4444';
//     if (type === 'total') return '#3B82F6';
//     return '#888888';
//   };

//   const handleCopy = () => {
//     navigator.clipboard?.writeText(JSON.stringify(data, null, 2));
//     alert('Waterfall data copied to clipboard!');
//   };

//   return (
//     <div className="rounded-xl border border-outline/20 bg-[#1A1A1A] p-5">
//       <div className="flex items-center justify-between mb-3">
//         <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant">
//           {title}
//         </p>
//         <button
//           onClick={handleCopy}
//           className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-container hover:bg-surface-container-high border border-outline/20 transition-colors text-[10px] font-mono uppercase tracking-widest text-on-surface"
//         >
//           <Copy className="w-3.5 h-3.5" /> Copy to PPT
//         </button>
//       </div>

//       <div className="overflow-x-auto custom-scrollbar pb-2">
//         <svg
//           viewBox={`0 0 ${svgWidth} ${svgHeight}`}
//           width="100%"
//           height="100%"
//           style={{ minWidth: '700px', backgroundColor: '#1A1A1A', overflow: 'visible' }}
//         >
//           <g transform={`translate(${margin.left}, ${margin.top})`}>
//             {ticks.map((tickVal, i) => {
//               const y = getY(tickVal);
//               const isZero = Math.abs(tickVal) < 0.001;
//               return (
//                 <g key={i}>
//                   <line
//                     x1="0"
//                     y1={y}
//                     x2={chartW}
//                     y2={y}
//                     stroke={isZero ? '#666666' : '#333333'}
//                     strokeWidth={isZero ? '1.5' : '0.5'}
//                     strokeDasharray={isZero ? 'none' : '3,3'}
//                   />
//                   <text
//                     x="-8"
//                     y={y}
//                     dy="0.35em"
//                     textAnchor="end"
//                     fill="#9CA3AF"
//                     fontSize="9"
//                     fontFamily="monospace"
//                   >
//                     {fmtVal(tickVal)}
//                   </text>
//                 </g>
//               );
//             })}

//             {points.map((p, i) => {
//               const x = (i * barTotalW) + (gap / 2);
//               const y1 = getY(p.start);
//               const y2 = getY(p.end);
//               const rectY = Math.min(y1, y2);
//               const rectH = Math.max(Math.abs(y1 - y2), 1);
//               const isBaseOrTotal = p.item.type === 'base' || p.item.type === 'total';
//               const displayVal = isBaseOrTotal ? fmtVal(p.val) : fmtDelta(p.val);
//               const labelLines = splitText(p.item.label, 14);

//               return (
//                 <g key={i}>
//                   <rect
//                     x={x}
//                     y={rectY}
//                     width={barW}
//                     height={rectH}
//                     fill={getFill(p.item.type)}
//                     rx="2"
//                     opacity="0.85"
//                     className="transition-opacity hover:opacity-100"
//                   />
//                   <text
//                     x={x + barW / 2}
//                     y={rectY - 6}
//                     textAnchor="middle"
//                     fontSize="9"
//                     fontFamily="monospace"
//                     fontWeight="bold"
//                     fill="#E5E7EB"
//                   >
//                     {displayVal}
//                   </text>
//                   {labelLines.map((line, li) => (
//                     <text
//                       key={li}
//                       x={x + barW / 2}
//                       y={zeroY + 16 + (li * 12)}
//                       textAnchor="middle"
//                       fontSize="8.5"
//                       fontFamily="sans-serif"
//                       fill="#9CA3AF"
//                     >
//                       {line}
//                     </text>
//                   ))}
//                 </g>
//               );
//             })}

//             <line x1="0" y1="0" x2="0" y2={chartH} stroke="#444444" strokeWidth="1" />
//             <line x1="0" y1={zeroY} x2={chartW} y2={zeroY} stroke="#666666" strokeWidth="1.5" />
//           </g>
//         </svg>
//       </div>

//       <div className="flex items-center gap-4 mt-2 pt-2 border-t border-outline/10">
//         <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[#F5C518]"></div><span className="font-mono text-[8px] text-on-surface-variant">Base</span></div>
//         <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[#22C55E]"></div><span className="font-mono text-[8px] text-on-surface-variant">Positive Impact</span></div>
//         <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[#EF4444]"></div><span className="font-mono text-[8px] text-on-surface-variant">Negative Impact</span></div>
//         <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[#3B82F6]"></div><span className="font-mono text-[8px] text-on-surface-variant">Subtotal</span></div>
//       </div>
//     </div>
//   );
// }

// // ── 2. Custom SVG Impact Overview Chart (Matching HTML Snippet) ─────────

// function SVGImpactOverviewChart({ results, scenarios, currencyLabel }: {
//   results: ComputedResults;
//   scenarios: ScenarioItem[];
//   currencyLabel: string;
// }) {
//   const metrics = results.displayMetrics;

//   // Prepare scenario columns: Base Case + all Scenarios
//   const columns = useMemo(() => {
//     const list: { id: string; name: string }[] = [{ id: 'base', name: 'Base Case' }];
//     scenarios.forEach(sc => {
//       list.push({ id: sc.id, name: sc.name || sc.id });
//     });
//     return list;
//   }, [scenarios]);

//   // Max value calculation for Y-Axis bounds
//   const maxVal = useMemo(() => {
//     let max = 0;
//     for (const col of columns) {
//       if (col.id === 'base') {
//         for (const m of metrics) {
//           const v = results.baseCase[m] || 0;
//           if (v > max) max = v;
//         }
//       } else {
//         const scRes = results.scenarioResults[col.id] || {};
//         for (const m of metrics) {
//           const v = scRes[m] || 0;
//           if (v > max) max = v;
//         }
//       }
//     }
//     return max > 0 ? max * 1.15 : 100;
//   }, [columns, metrics, results]);

//   const svgWidth = 867;
//   const svgHeight = 514;
//   const margin = { top: 24, right: 20, bottom: 130, left: 64 };
//   const chartW = svgWidth - margin.left - margin.right;
//   const chartH = svgHeight - margin.top - margin.bottom;

//   const getY = (v: number) => chartH - (v / maxVal) * chartH;
//   const zeroY = getY(0);

//   const ticks = [0, 1, 2, 3, 4, 5].map(i => maxVal - (maxVal * i) / 5);

//   const colCount = columns.length;
//   const colTotalW = chartW / colCount;
//   const colBarW = colTotalW * 0.75;
//   const gap = colTotalW * 0.25;

//   const handleCopy = () => {
//     navigator.clipboard?.writeText(JSON.stringify({ columns, metrics, results }, null, 2));
//     alert('Impact Overview data copied to clipboard!');
//   };

//   return (
//     <div className="rounded-xl border border-outline/20 bg-[#1A1A1A] p-5">
//       <div className="flex items-center justify-between mb-3">
//         <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant">
//           Impact Overview — Absolute Metrics ({currencyLabel})
//         </p>
//         <button
//           onClick={handleCopy}
//           className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-container hover:bg-surface-container-high border border-outline/20 transition-colors text-[10px] font-mono uppercase tracking-widest text-on-surface"
//         >
//           <Copy className="w-3.5 h-3.5" /> Copy to PPT
//         </button>
//       </div>

//       <div className="overflow-x-auto custom-scrollbar pb-2">
//         <svg
//           viewBox={`0 0 ${svgWidth} ${svgHeight}`}
//           width="100%"
//           height="100%"
//           style={{ minWidth: '700px', backgroundColor: '#1A1A1A', overflow: 'visible' }}
//         >
//           <g transform={`translate(${margin.left}, ${margin.top})`}>
//             {/* Grid & Ticks */}
//             {ticks.map((tickVal, i) => {
//               const y = getY(tickVal);
//               const isZero = Math.abs(tickVal) < 0.001;
//               return (
//                 <g key={i}>
//                   <line
//                     x1="0"
//                     y1={y}
//                     x2={chartW}
//                     y2={y}
//                     stroke={isZero ? '#666666' : '#333333'}
//                     strokeWidth={isZero ? '1.5' : '0.5'}
//                     strokeDasharray={isZero ? 'none' : '3,3'}
//                   />
//                   <text
//                     x="-8"
//                     y={y}
//                     dy="0.35em"
//                     textAnchor="end"
//                     fill="#9CA3AF"
//                     fontSize="9"
//                     fontFamily="monospace"
//                   >
//                     {fmtVal(tickVal, 0)}
//                   </text>
//                 </g>
//               );
//             })}

//             {/* Grouped/Stacked Bars per Column */}
//             {columns.map((col, colIdx) => {
//               const x = (colIdx * colTotalW) + (gap / 2);
//               const subBarWidth = colBarW / metrics.length;
//               const labelLines = splitText(col.name, 14);

//               let topDisplayVal = 0;

//               return (
//                 <g key={col.id}>
//                   {metrics.map((m, mIdx) => {
//                     const val = col.id === 'base'
//                       ? (results.baseCase[m] || 0)
//                       : (results.scenarioResults[col.id]?.[m] || 0);

//                     if (val > topDisplayVal) topDisplayVal = val;

//                     const subX = x + (mIdx * subBarWidth);
//                     const rectY = getY(val);
//                     const rectH = Math.max(zeroY - rectY, 1);

//                     return (
//                       <rect
//                         key={m}
//                         x={subX}
//                         y={rectY}
//                         width={Math.max(subBarWidth - 1, 1)}
//                         height={rectH}
//                         fill={getMetricColor(mIdx)}
//                         opacity="0.85"
//                         rx="2"
//                         className="transition-opacity hover:opacity-100"
//                       />
//                     );
//                   })}

//                   {/* Value Label on Top */}
//                   <text
//                     x={x + colBarW / 2}
//                     y={getY(topDisplayVal) - 6}
//                     textAnchor="middle"
//                     fontSize="9"
//                     fontFamily="monospace"
//                     fontWeight="bold"
//                     fill="#E5E7EB"
//                   >
//                     {fmtVal(topDisplayVal, 0)}
//                   </text>

//                   {/* Column Label Below Zero Line */}
//                   {labelLines.map((line, li) => (
//                     <text
//                       key={li}
//                       x={x + colBarW / 2}
//                       y={zeroY + 16 + (li * 12)}
//                       textAnchor="middle"
//                       fontSize="8.5"
//                       fontFamily="sans-serif"
//                       fill="#9CA3AF"
//                     >
//                       {line}
//                     </text>
//                   ))}
//                 </g>
//               );
//             })}

//             <line x1="0" y1="0" x2="0" y2={chartH} stroke="#444444" strokeWidth="1" />
//             <line x1="0" y1={zeroY} x2={chartW} y2={zeroY} stroke="#666666" strokeWidth="1" />
//           </g>
//         </svg>
//       </div>

//       {/* Legend */}
//       <div className="flex items-center gap-4 mt-2 pt-2 border-t border-outline/10 flex-wrap">
//         {metrics.map((m, idx) => (
//           <div key={m} className="flex items-center gap-1.5">
//             <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: getMetricColor(idx) }}></div>
//             <span className="font-mono text-[8px] text-on-surface-variant">{m}</span>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

// // ── Main Results View Component ────────────────────────────────────────

// export function SBResultsView({ results, scenarios, currencyLabel }: {
//   results: ComputedResults;
//   scenarios: ScenarioItem[];
//   currencyLabel: string;
// }) {
//   const [tab, setTab] = useState<Tab>('tables');

//   const scenarioMap = useMemo(() => {
//     const map: Record<string, ScenarioItem> = {};
//     scenarios.forEach(s => { map[s.id] = s; });
//     return map;
//   }, [scenarios]);

//   // ── Summary Card Calculations ──
//   const summaryCards = useMemo(() => {
//     const firstMetric = results.displayMetrics[0] ?? 'Metric';
//     const lastMetric = results.displayMetrics[results.displayMetrics.length - 1] ?? firstMetric;

//     const getImpact = (type: string, metric: string) => {
//       const row = results.table2.find(r => r.metric === metric);
//       if (!row) return 0;
//       let total = 0;
//       for (const sc of scenarios) {
//         if (sc.type !== type) continue;
//         const detail = row.scenarios[sc.id];
//         if (detail) total += detail.weighted;
//       }
//       return total;
//     };

//     const baseVal = results.table1.find(r => r.metric === firstMetric)?.baseCase ?? 0;

//     return [
//       {
//         label: `Stress → ${firstMetric}`,
//         value: getImpact('stress', firstMetric),
//         icon: ShieldAlert,
//         color: 'text-mtn-yellow',
//         bg: 'bg-mtn-yellow/5',
//         border: 'border-mtn-yellow/20',
//       },
//       {
//         label: `Shock → ${firstMetric}`,
//         value: getImpact('shock', firstMetric),
//         icon: Zap,
//         color: 'text-red-400',
//         bg: 'bg-red-500/5',
//         border: 'border-red-500/20',
//       },
//       {
//         label: `Opportunity → ${lastMetric}`,
//         value: getImpact('opportunity', lastMetric),
//         icon: TrendingUp,
//         color: 'text-green-400',
//         bg: 'bg-green-500/5',
//         border: 'border-green-500/20',
//       },
//       {
//         label: `Base ${firstMetric}`,
//         value: baseVal,
//         icon: Layers,
//         color: 'text-blue-400',
//         bg: 'bg-blue-500/5',
//         border: 'border-blue-500/20',
//         isBase: true,
//       },
//     ];
//   }, [results, scenarios]);

//   // ── CSV Export ──
//   const handleExportCSV = useCallback(() => {
//     if (!results.table1.length) return;

//     const scIds = Object.keys(results.table1[0]?.scenarios ?? {});
//     const headers = ['Metric', 'Base Case', ...scIds.map(id => scenarioMap[id]?.name ?? id)];

//     const rows = results.table1.map(row => {
//       const vals = scIds.map(id => {
//         const v = row.scenarios[id];
//         return (v !== undefined ? v : 0).toFixed(4);
//       });
//       return [row.metric, row.baseCase.toFixed(4), ...vals];
//     });

//     const t2Headers = ['Metric (Weighted Impact)', ...scIds.map(id => `${scenarioMap[id]?.name ?? id} (Δ×W)`)];
//     const t2Rows = results.table2.map(row => {
//       const vals = scIds.map(id => {
//         const detail = row.scenarios[id];
//         return detail ? detail.weighted.toFixed(4) : '0.0000';
//       });
//       return [row.metric, ...vals];
//     });

//     const csv = [
//       '=== TABLE 1: ABSOLUTE VALUES ===',
//       headers.join(','),
//       ...rows.map(r => r.join(',')),
//       '',
//       '=== TABLE 2: WEIGHTED IMPACT ===',
//       t2Headers.join(','),
//       ...t2Rows.map(r => r.join(',')),
//     ].join('\n');

//     const blob = new Blob([csv], { type: 'text/csv' });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement('a');
//     a.href = url;
//     a.download = 'scenario_builder_results.csv';
//     a.click();
//     URL.revokeObjectURL(url);
//   }, [results, scenarioMap]);

//   return (
//     <div className="space-y-6">
//       {/* ═══ Results Summary Banner ═══ */}
//       <div className="rounded-xl border border-outline/20 bg-surface-container-low p-5">
//         <div className="flex items-start gap-3 mb-4">
//           <div className="p-2 rounded-lg bg-mtn-yellow/10 shrink-0">
//             <FlaskConical className="w-5 h-5 text-mtn-yellow" />
//           </div>
//           <div>
//             <p className="font-sans text-sm font-semibold text-on-surface mb-1">Computation Complete</p>
//             <p className="font-sans text-xs text-on-surface-variant leading-relaxed">
//               <strong className="text-on-surface">{scenarios.length}</strong> scenarios computed across{' '}
//               <strong className="text-on-surface">{results.displayMetrics.length}</strong> metrics.
//               All values in <strong className="text-on-surface">{currencyLabel}</strong>.
//             </p>
//           </div>
//         </div>

//         <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
//           {summaryCards.map((card, i) => {
//             const Icon = card.icon;
//             return (
//               <div key={i} className={`rounded-lg border ${card.border} ${card.bg} p-3`}>
//                 <div className="flex items-center gap-1.5 mb-1">
//                   <Icon className={`w-3 h-3 ${card.color}`} />
//                   <p className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant truncate">
//                     {card.label}
//                   </p>
//                 </div>
//                 <p className={`font-mono text-lg font-bold ${
//                   'isBase' in card && card.isBase
//                     ? 'text-blue-400'
//                     : card.value < 0
//                       ? 'text-red-400'
//                       : card.value > 0
//                         ? 'text-green-400'
//                         : 'text-on-surface'
//                 }`}>
//                   {'isBase' in card && card.isBase ? fmtVal(card.value) : fmtDelta(card.value)}
//                 </p>
//               </div>
//             );
//           })}
//         </div>
//       </div>

//       {/* ═══ Tab Navigation Bar ═══ */}
//       <div className="flex items-center gap-2 flex-wrap">
//         <TabBtn active={tab === 'tables'} label="Tables" icon={TableProperties} onClick={() => setTab('tables')} />
//         <TabBtn active={tab === 'waterfalls'} label="Waterfall Charts" icon={BarChart3} onClick={() => setTab('waterfalls')} />
//         <TabBtn active={tab === 'impact'} label="Impact Overview" icon={Layers} onClick={() => setTab('impact')} />
//         <div className="ml-auto">
//           <button
//             onClick={handleExportCSV}
//             className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[10px] uppercase tracking-widest border border-outline/20 text-on-surface-variant hover:text-on-surface hover:border-outline/40 transition-colors"
//           >
//             <Download className="w-3 h-3" /> Export CSV
//           </button>
//         </div>
//       </div>

//       {/* ═══ Tables Tab (Exact Match to User Snippet) ═══ */}
//       {tab === 'tables' && (
//         <div className="space-y-5">
//           {/* Table 1: Full Scenario Matrix */}
//           <div className="rounded-xl border border-outline/20 bg-[#1A1A1A] overflow-hidden">
//             <div className="p-4 border-b border-outline/10">
//               <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant">Table 1</p>
//               <p className="font-sans text-sm font-bold text-on-surface mt-1">Full Scenario Matrix</p>
//             </div>
//             <div className="overflow-x-auto custom-scrollbar">
//               <table className="w-full text-left min-w-[1200px]">
//                 <thead>
//                   <tr className="border-b border-outline/10">
//                     <th className="p-3 font-mono text-[9px] uppercase tracking-widest text-on-surface-variant sticky left-0 bg-[#1A1A1A] z-10 min-w-[140px]">
//                       Metric
//                     </th>
//                     <th className="p-3 text-center min-w-[110px]">
//                       <span className="font-mono text-[8px] uppercase tracking-widest text-blue-400">Base Case</span>
//                     </th>
//                     {scenarios.map(sc => {
//                       const colorClass = sc.type === 'stress' ? 'text-mtn-yellow' : sc.type === 'shock' ? 'text-red-400' : 'text-green-400';
//                       return (
//                         <th key={sc.id} className="p-3 text-center min-w-[110px]">
//                           <span className={`font-mono text-[8px] uppercase tracking-widest ${colorClass}`}>
//                             {sc.name || sc.id}
//                           </span>
//                         </th>
//                       );
//                     })}
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {results.table1.map((row, i) => (
//                     <tr key={i} className={`border-b border-outline/5 ${i % 2 === 0 ? 'bg-surface-container-low/30' : ''}`}>
//                       <td className="p-3 font-sans text-xs text-on-surface-variant sticky left-0 bg-inherit z-10 whitespace-nowrap">
//                         {row.metric}
//                       </td>
//                       <td className="p-3 text-center">
//                         <span className="font-mono text-[11px] text-on-surface font-semibold">
//                           {row.baseCase.toFixed(4)}M
//                         </span>
//                       </td>
//                       {scenarios.map(sc => {
//                         const val = row.scenarios[sc.id];
//                         const numVal = val !== undefined ? val : 0;
//                         return (
//                           <td key={sc.id} className="p-3 text-center">
//                             <span className="font-mono text-[11px] text-on-surface-variant">
//                               {numVal.toFixed(4)}M
//                             </span>
//                           </td>
//                         );
//                       })}
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           </div>

//           {/* Table 2: Weighted Impact Matrix */}
//           <div className="rounded-xl border border-outline/20 bg-[#1A1A1A] overflow-hidden">
//             <div className="p-4 border-b border-outline/10">
//               <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant">Table 2</p>
//               <p className="font-sans text-sm font-bold text-on-surface mt-1">Weighted Impact Matrix</p>
//             </div>
//             <div className="overflow-x-auto custom-scrollbar">
//               <table className="w-full text-left min-w-[1200px]">
//                 <thead>
//                   <tr className="border-b border-outline/10">
//                     <th className="p-3 font-mono text-[9px] uppercase tracking-widest text-on-surface-variant sticky left-0 bg-[#1A1A1A] z-10 min-w-[140px]">
//                       Metric
//                     </th>
//                     {scenarios.map(sc => {
//                       const colorClass = sc.type === 'stress' ? 'text-mtn-yellow' : sc.type === 'shock' ? 'text-red-400' : 'text-green-400';
//                       return (
//                         <th key={sc.id} className="p-3 text-center min-w-[110px]">
//                           <span className={`font-mono text-[8px] uppercase tracking-widest ${colorClass}`}>
//                             {sc.name || sc.id}
//                           </span>
//                         </th>
//                       );
//                     })}
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {results.table2.map((row, i) => (
//                     <tr key={i} className={`border-b border-outline/5 ${i % 2 === 0 ? 'bg-surface-container-low/30' : ''}`}>
//                       <td className="p-3 font-sans text-xs text-on-surface-variant sticky left-0 bg-inherit z-10 whitespace-nowrap">
//                         {row.metric}
//                       </td>
//                       {scenarios.map(sc => {
//                         const detail = row.scenarios[sc.id];
//                         const val = detail ? detail.weighted : 0;
//                         return (
//                           <td key={sc.id} className="p-3 text-center">
//                             <span className="font-mono text-[11px] text-on-surface-variant">
//                               {val.toFixed(4)}M
//                             </span>
//                           </td>
//                         );
//                       })}
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* ═══ Waterfall Charts Tab ═══ */}
//       {tab === 'waterfalls' && (
//         <div className="space-y-6">
//           <SVGWaterfallChart title="Chart 1 — Stress Scenario Waterfall (Table 3)" data={results.waterfalls.stress ?? []} />
//           <SVGWaterfallChart title="Chart 2 — Shock Scenario Waterfall (Table 4)" data={results.waterfalls.shock ?? []} />
//           <SVGWaterfallChart title="Chart 3 — Opportunity Scenario Waterfall (Table 5)" data={results.waterfalls.opportunity ?? []} />
//           <SVGWaterfallChart title="Chart 4 — Combined Waterfall (Table 6)" data={results.waterfalls.combined ?? []} />
//         </div>
//       )}

//       {/* ═══ Impact Overview Tab ═══ */}
//       {tab === 'impact' && (
//         <SVGImpactOverviewChart
//           results={results}
//           scenarios={scenarios}
//           currencyLabel={currencyLabel}
//         />
//       )}

//       {/* ═══ Reading Guide ═══ */}
//       <div className="rounded-xl border border-outline/10 bg-surface-container-low/50 p-5 space-y-3">
//         <div className="flex items-center gap-2 mb-2">
//           <Info className="w-4 h-4 text-on-surface-variant shrink-0" />
//           <p className="font-sans text-xs font-semibold text-on-surface">Reading Guide</p>
//         </div>
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[10px] text-on-surface-variant leading-relaxed">
//           <div><strong className="text-on-surface">Table 1 (Full Scenario Matrix):</strong> Shows absolute raw calculations per metric across all scenarios.</div>
//           <div><strong className="text-on-surface">Table 2 (Weighted Impact Matrix):</strong> Shows probability-adjusted impacts (Δ × probability weight).</div>
//           <div><strong className="text-on-surface">Waterfall Charts (Charts 1–4):</strong> Step-by-step P&L bridge showing cumulative impact down derived financial metrics.</div>
//           <div><strong className="text-on-surface">Impact Overview:</strong> Visual breakdown comparing metrics across all scenarios side-by-side.</div>
//         </div>
//       </div>
//     </div>
//   );
// }





// 'use client';

// import { useState, useMemo, useCallback } from 'react';
// import {
//   TableProperties, BarChart3, Download, Info, FlaskConical, Layers, Copy,
// } from 'lucide-react';
// import type { ComputedResults, ScenarioItem, WaterfallItem } from '@/lib/scenarioBuilder';

// // ── Color Palette for Impact Overview Metrics ───────────────────────────

// const METRIC_COLORS = [
//   '#3B82F6', // Blue
//   '#F5C518', // MTN Yellow
//   '#22C55E', // Green
//   '#8B5CF6', // Purple
//   '#EC4899', // Pink
//   '#06B6D4', // Cyan
//   '#F97316', // Orange
//   '#10B981', // Emerald
// ];

// function getMetricColor(idx: number): string {
//   return METRIC_COLORS[idx % METRIC_COLORS.length] || '#3B82F6';
// }

// // ── Formatting Helpers ──────────────────────────────────────────────────

// function fmtVal(val: number, decimals: number = 2): string {
//   const abs = Math.abs(val);
//   if (abs >= 1e6) return `${(val / 1e6).toFixed(decimals)}M`;
//   if (abs >= 1e3) return `${(val / 1e3).toFixed(decimals)}K`;
//   return `${val.toFixed(decimals)}M`;
// }

// function fmtDelta(val: number, decimals: number = 2): string {
//   const sign = val >= 0 ? '+' : '';
//   return `${sign}${fmtVal(val, decimals)}`;
// }

// function splitText(text: string, maxLen: number = 14): string[] {
//   if (!text) return [''];
//   const words = text.split(' ');
//   const lines: string[] = [];
//   let currentLine = '';
//   for (const word of words) {
//     if ((currentLine + ' ' + word).trim().length <= maxLen) {
//       currentLine = (currentLine + ' ' + word).trim();
//     } else {
//       if (currentLine) lines.push(currentLine);
//       currentLine = word;
//     }
//   }
//   if (currentLine) lines.push(currentLine);
//   return lines;
// }

// type Tab = 'tables' | 'waterfalls' | 'impact';

// const TYPE_ORDER: Record<string, number> = { stress: 0, shock: 1, opportunity: 2 };

// function typeTextClass(type: string): string {
//   if (type === 'stress') return 'text-mtn-yellow';
//   if (type === 'shock') return 'text-red-400';
//   return 'text-green-400';
// }

// /** The four section tables / waterfall charts built in stage 7. */
// const SECTIONS: { key: string; table: string; chart: string; title: string; text: string }[] = [
//   { key: 'stress', table: 'Table 3', chart: 'Chart 1', title: 'Stress', text: 'text-mtn-yellow' },
//   { key: 'shock', table: 'Table 4', chart: 'Chart 2', title: 'Shock', text: 'text-red-400' },
//   { key: 'opportunity', table: 'Table 5', chart: 'Chart 3', title: 'Opportunities (holding all other constant)', text: 'text-green-400' },
//   { key: 'combined', table: 'Table 6', chart: 'Chart 4', title: 'Opportunities (considering stress scenarios)', text: 'text-blue-400' },
// ];

// function TabBtn({ active, label, icon: Icon, onClick }: {
//   active: boolean; label: string; icon: typeof TableProperties; onClick: () => void;
// }) {
//   return (
//     <button
//       onClick={onClick}
//       className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-mono text-[10px] uppercase tracking-widest transition-all ${
//         active
//           ? 'bg-mtn-yellow text-black font-bold'
//           : 'border border-outline/20 text-on-surface-variant hover:text-on-surface hover:border-outline/40'
//       }`}
//     >
//       <Icon className="w-3.5 h-3.5" />
//       {label}
//     </button>
//   );
// }

// // ── 1. Custom SVG Waterfall Chart (built from Tables 3–6) ───────────────

// function SVGWaterfallChart({ title, data }: { title: string; data: WaterfallItem[] }) {
//   if (!data || data.length === 0) {
//     return (
//       <div className="rounded-xl border border-outline/20 bg-[#1A1A1A] p-6 text-center">
//         <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant mb-2">{title}</p>
//         <p className="text-xs text-on-surface-variant italic">No metrics defined for this section</p>
//       </div>
//     );
//   }

//   // Calculate Running Totals
//   const points: { item: WaterfallItem; start: number; end: number; val: number }[] = [];
//   let running = 0;
//   for (const item of data) {
//     let start = 0;
//     let end = 0;
//     if (item.type === 'base' || item.type === 'total') {
//       start = 0;
//       end = item.value;
//       running = item.value;
//     } else {
//       start = running;
//       end = running + item.value;
//       running = end;
//     }
//     points.push({ item, start, end, val: item.value });
//   }

//   // Bounds & Scaling
//   const allVals = points.flatMap(p => [p.start, p.end]);
//   const minVal = Math.min(0, ...allVals);
//   let maxVal = Math.max(0, ...allVals);
//   if (maxVal === minVal) maxVal += 1;
//   maxVal = maxVal * 1.15;
//   const range = maxVal - minVal;

//   const svgWidth = 867;
//   const svgHeight = 458;
//   const margin = { top: 28, right: 20, bottom: 130, left: 64 };
//   const chartW = svgWidth - margin.left - margin.right;
//   const chartH = svgHeight - margin.top - margin.bottom;

//   const getY = (v: number) => chartH - ((v - minVal) / range) * chartH;
//   const zeroY = getY(0);

//   const ticks = [0, 1, 2, 3, 4, 5].map(i => maxVal - (range * i) / 5);

//   const n = points.length;
//   const barTotalW = chartW / n;
//   const barW = barTotalW * 0.75;
//   const gap = barTotalW * 0.25;

//   const getFill = (type: string) => {
//     if (type === 'base') return '#F5C518';
//     if (type === 'positive') return '#22C55E';
//     if (type === 'negative') return '#EF4444';
//     if (type === 'total') return '#3B82F6';
//     return '#888888';
//   };

//   const handleCopy = () => {
//     navigator.clipboard?.writeText(JSON.stringify(data, null, 2));
//     alert('Waterfall data copied to clipboard!');
//   };

//   return (
//     <div className="rounded-xl border border-outline/20 bg-[#1A1A1A] p-5">
//       <div className="flex items-center justify-between mb-3">
//         <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant">
//           {title}
//         </p>
//         <button
//           onClick={handleCopy}
//           className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-container hover:bg-surface-container-high border border-outline/20 transition-colors text-[10px] font-mono uppercase tracking-widest text-on-surface"
//         >
//           <Copy className="w-3.5 h-3.5" /> Copy to PPT
//         </button>
//       </div>

//       <div className="overflow-x-auto custom-scrollbar pb-2">
//         <svg
//           viewBox={`0 0 ${svgWidth} ${svgHeight}`}
//           width="100%"
//           height="100%"
//           style={{ minWidth: '700px', backgroundColor: '#1A1A1A', overflow: 'visible' }}
//         >
//           <g transform={`translate(${margin.left}, ${margin.top})`}>
//             {ticks.map((tickVal, i) => {
//               const y = getY(tickVal);
//               const isZero = Math.abs(tickVal) < 0.001;
//               return (
//                 <g key={i}>
//                   <line
//                     x1="0"
//                     y1={y}
//                     x2={chartW}
//                     y2={y}
//                     stroke={isZero ? '#666666' : '#333333'}
//                     strokeWidth={isZero ? '1.5' : '0.5'}
//                     strokeDasharray={isZero ? 'none' : '3,3'}
//                   />
//                   <text
//                     x="-8"
//                     y={y}
//                     dy="0.35em"
//                     textAnchor="end"
//                     fill="#9CA3AF"
//                     fontSize="9"
//                     fontFamily="monospace"
//                   >
//                     {fmtVal(tickVal)}
//                   </text>
//                 </g>
//               );
//             })}

//             {points.map((p, i) => {
//               const x = (i * barTotalW) + (gap / 2);
//               const y1 = getY(p.start);
//               const y2 = getY(p.end);
//               const rectY = Math.min(y1, y2);
//               const rectH = Math.max(Math.abs(y1 - y2), 1);
//               const isBaseOrTotal = p.item.type === 'base' || p.item.type === 'total';
//               const displayVal = isBaseOrTotal ? fmtVal(p.val) : fmtDelta(p.val);
//               const labelLines = splitText(p.item.label, 14);

//               return (
//                 <g key={i}>
//                   <rect
//                     x={x}
//                     y={rectY}
//                     width={barW}
//                     height={rectH}
//                     fill={getFill(p.item.type)}
//                     rx="2"
//                     opacity="0.85"
//                     className="transition-opacity hover:opacity-100"
//                   />
//                   <text
//                     x={x + barW / 2}
//                     y={rectY - 6}
//                     textAnchor="middle"
//                     fontSize="9"
//                     fontFamily="monospace"
//                     fontWeight="bold"
//                     fill="#E5E7EB"
//                   >
//                     {displayVal}
//                   </text>
//                   {labelLines.map((line, li) => (
//                     <text
//                       key={li}
//                       x={x + barW / 2}
//                       y={zeroY + 16 + (li * 12)}
//                       textAnchor="middle"
//                       fontSize="8.5"
//                       fontFamily="sans-serif"
//                       fill="#9CA3AF"
//                     >
//                       {line}
//                     </text>
//                   ))}
//                 </g>
//               );
//             })}

//             <line x1="0" y1="0" x2="0" y2={chartH} stroke="#444444" strokeWidth="1" />
//             <line x1="0" y1={zeroY} x2={chartW} y2={zeroY} stroke="#666666" strokeWidth="1.5" />
//           </g>
//         </svg>
//       </div>

//       <div className="flex items-center gap-4 mt-2 pt-2 border-t border-outline/10">
//         <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[#F5C518]"></div><span className="font-mono text-[8px] text-on-surface-variant">Start</span></div>
//         <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[#22C55E]"></div><span className="font-mono text-[8px] text-on-surface-variant">Positive Impact</span></div>
//         <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[#EF4444]"></div><span className="font-mono text-[8px] text-on-surface-variant">Negative Impact</span></div>
//         <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[#3B82F6]"></div><span className="font-mono text-[8px] text-on-surface-variant">Total</span></div>
//       </div>
//     </div>
//   );
// }

// // ── 2. Stacked Impact Overview Chart (data comes from Table 1) ──────────

// function SVGImpactOverviewChart({ results, scenarios, currencyLabel }: {
//   results: ComputedResults;
//   scenarios: ScenarioItem[];               // already ordered: stress → shock → opportunity
//   currencyLabel: string;
// }) {
//   const rows = results.table1;
//   const metrics = rows.map(r => r.metric);

//   // Columns: Base Case first, then every scenario in stress → shock → opportunity order
//   const columns = useMemo(() => {
//     const list: { id: string; name: string; type: string }[] = [{ id: 'base', name: 'Base Case', type: 'base' }];
//     scenarios.forEach(sc => list.push({ id: sc.id, name: sc.name || sc.id, type: sc.type }));
//     return list;
//   }, [scenarios]);

//   // Stack every metric of Table 1 on top of each other, per column.
//   // Positive values stack upward from zero, negative values stack downward.
//   const stacks = useMemo(() => {
//     return columns.map(col => {
//       let pos = 0;
//       let neg = 0;
//       const segments = rows.map((row, idx) => {
//         const val = col.id === 'base' ? row.baseCase : (row.scenarios[col.id] ?? 0);
//         let from: number;
//         let to: number;
//         if (val >= 0) { from = pos; to = pos + val; pos = to; }
//         else { from = neg; to = neg + val; neg = to; }
//         return { metric: row.metric, idx, val, from, to };
//       });
//       return { col, segments, posTotal: pos, negTotal: neg, net: pos + neg };
//     });
//   }, [columns, rows]);

//   const maxPos = Math.max(0, ...stacks.map(s => s.posTotal));
//   const minNeg = Math.min(0, ...stacks.map(s => s.negTotal));
//   const maxVal = maxPos > 0 ? maxPos * 1.15 : 100;
//   const minVal = minNeg < 0 ? minNeg * 1.15 : 0;
//   const range = maxVal - minVal;

//   const svgWidth = 867;
//   const svgHeight = 514;
//   const margin = { top: 24, right: 20, bottom: 130, left: 64 };
//   const chartW = svgWidth - margin.left - margin.right;
//   const chartH = svgHeight - margin.top - margin.bottom;

//   const getY = (v: number) => chartH - ((v - minVal) / range) * chartH;
//   const zeroY = getY(0);

//   const ticks = [0, 1, 2, 3, 4, 5].map(i => maxVal - (range * i) / 5);

//   const colCount = columns.length;
//   const colTotalW = chartW / colCount;
//   const colBarW = colTotalW * 0.75;
//   const gap = colTotalW * 0.25;

//   const handleCopy = () => {
//     navigator.clipboard?.writeText(JSON.stringify({ columns, metrics, table1: results.table1 }, null, 2));
//     alert('Impact Overview data copied to clipboard!');
//   };

//   if (rows.length === 0) {
//     return (
//       <div className="rounded-xl border border-outline/20 bg-[#1A1A1A] p-6 text-center">
//         <p className="text-xs text-on-surface-variant italic">No data in Table 1</p>
//       </div>
//     );
//   }

//   return (
//     <div className="rounded-xl border border-outline/20 bg-[#1A1A1A] p-5">
//       <div className="flex items-center justify-between mb-3">
//         <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant">
//           Impact Overview — Stacked Metrics from Table 1 ({currencyLabel})
//         </p>
//         <button
//           onClick={handleCopy}
//           className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-container hover:bg-surface-container-high border border-outline/20 transition-colors text-[10px] font-mono uppercase tracking-widest text-on-surface"
//         >
//           <Copy className="w-3.5 h-3.5" /> Copy to PPT
//         </button>
//       </div>

//       <div className="overflow-x-auto custom-scrollbar pb-2">
//         <svg
//           viewBox={`0 0 ${svgWidth} ${svgHeight}`}
//           width="100%"
//           height="100%"
//           style={{ minWidth: '700px', backgroundColor: '#1A1A1A', overflow: 'visible' }}
//         >
//           <g transform={`translate(${margin.left}, ${margin.top})`}>
//             {/* Grid & Ticks */}
//             {ticks.map((tickVal, i) => {
//               const y = getY(tickVal);
//               const isZero = Math.abs(tickVal) < 0.001 * Math.max(1, range);
//               return (
//                 <g key={i}>
//                   <line
//                     x1="0"
//                     y1={y}
//                     x2={chartW}
//                     y2={y}
//                     stroke={isZero ? '#666666' : '#333333'}
//                     strokeWidth={isZero ? '1.5' : '0.5'}
//                     strokeDasharray={isZero ? 'none' : '3,3'}
//                   />
//                   <text
//                     x="-8"
//                     y={y}
//                     dy="0.35em"
//                     textAnchor="end"
//                     fill="#9CA3AF"
//                     fontSize="9"
//                     fontFamily="monospace"
//                   >
//                     {fmtVal(tickVal, 0)}
//                   </text>
//                 </g>
//               );
//             })}

//             {/* One stacked bar per column */}
//             {stacks.map((stack, colIdx) => {
//               const x = (colIdx * colTotalW) + (gap / 2);
//               const labelLines = splitText(stack.col.name, 14);
//               const topY = stack.posTotal > 0 ? getY(stack.posTotal) : zeroY;

//               return (
//                 <g key={stack.col.id}>
//                   {stack.segments.map(seg => {
//                     const yA = getY(seg.from);
//                     const yB = getY(seg.to);
//                     const rectY = Math.min(yA, yB);
//                     const rectH = Math.max(Math.abs(yA - yB), seg.val === 0 ? 0 : 1);
//                     if (rectH === 0) return null;
//                     return (
//                       <rect
//                         key={seg.metric}
//                         x={x}
//                         y={rectY}
//                         width={colBarW}
//                         height={rectH}
//                         fill={getMetricColor(seg.idx)}
//                         opacity="0.85"
//                         className="transition-opacity hover:opacity-100"
//                       >
//                         <title>{`${seg.metric}: ${seg.val.toFixed(2)}`}</title>
//                       </rect>
//                     );
//                   })}

//                   {/* Net total on top */}
//                   <text
//                     x={x + colBarW / 2}
//                     y={topY - 6}
//                     textAnchor="middle"
//                     fontSize="9"
//                     fontFamily="monospace"
//                     fontWeight="bold"
//                     fill="#E5E7EB"
//                   >
//                     {fmtVal(stack.net, 0)}
//                   </text>

//                   {/* Column label under the chart */}
//                   {labelLines.map((line, li) => (
//                     <text
//                       key={li}
//                       x={x + colBarW / 2}
//                       y={chartH + 16 + (li * 12)}
//                       textAnchor="middle"
//                       fontSize="8.5"
//                       fontFamily="sans-serif"
//                       fill={
//                         stack.col.type === 'stress' ? '#F5C518'
//                           : stack.col.type === 'shock' ? '#F87171'
//                             : stack.col.type === 'opportunity' ? '#4ADE80'
//                               : '#60A5FA'
//                       }
//                     >
//                       {line}
//                     </text>
//                   ))}
//                 </g>
//               );
//             })}

//             <line x1="0" y1="0" x2="0" y2={chartH} stroke="#444444" strokeWidth="1" />
//             <line x1="0" y1={zeroY} x2={chartW} y2={zeroY} stroke="#666666" strokeWidth="1" />
//           </g>
//         </svg>
//       </div>

//       {/* Legend */}
//       <div className="flex items-center gap-4 mt-2 pt-2 border-t border-outline/10 flex-wrap">
//         {metrics.map((m, idx) => (
//           <div key={m} className="flex items-center gap-1.5">
//             <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: getMetricColor(idx) }}></div>
//             <span className="font-mono text-[8px] text-on-surface-variant">{m}</span>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

// // ── Reusable matrix table (Table 1 and Table 2) ─────────────────────────

// function MatrixTable({ tag, title, rows, columns }: {
//   tag: string;
//   title: string;
//   rows: { metric: string; baseCase: number; scenarios: Record<string, number> }[];
//   columns: ScenarioItem[];
// }) {
//   return (
//     <div className="rounded-xl border border-outline/20 bg-[#1A1A1A] overflow-hidden">
//       <div className="p-4 border-b border-outline/10">
//         <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant">{tag}</p>
//         <p className="font-sans text-sm font-bold text-on-surface mt-1">{title}</p>
//       </div>
//       <div className="overflow-x-auto custom-scrollbar">
//         <table className="w-full text-left min-w-[1200px]">
//           <thead>
//             <tr className="border-b border-outline/10">
//               <th className="p-3 font-mono text-[9px] uppercase tracking-widest text-on-surface-variant sticky left-0 bg-[#1A1A1A] z-10 min-w-[160px]">
//                 Metric
//               </th>
//               <th className="p-3 text-center min-w-[110px]">
//                 <span className="font-mono text-[8px] uppercase tracking-widest text-blue-400">Base Case</span>
//               </th>
//               {columns.map(sc => (
//                 <th key={sc.id} className="p-3 text-center min-w-[110px]">
//                   <span className={`font-mono text-[8px] uppercase tracking-widest ${typeTextClass(sc.type)}`}>
//                     {sc.name || sc.id}
//                   </span>
//                 </th>
//               ))}
//             </tr>
//           </thead>
//           <tbody>
//             {rows.map((row, i) => (
//               <tr key={i} className={`border-b border-outline/5 ${i % 2 === 0 ? 'bg-surface-container-low/30' : ''}`}>
//                 <td className="p-3 font-sans text-xs text-on-surface-variant sticky left-0 bg-inherit z-10 whitespace-nowrap">
//                   {row.metric}
//                 </td>
//                 <td className="p-3 text-center">
//                   <span className="font-mono text-[11px] text-on-surface font-semibold">
//                     {row.baseCase.toFixed(4)}M
//                   </span>
//                 </td>
//                 {columns.map(sc => {
//                   const v = row.scenarios[sc.id];
//                   return (
//                     <td key={sc.id} className="p-3 text-center">
//                       <span className="font-mono text-[11px] text-on-surface-variant">
//                         {(v !== undefined ? v : 0).toFixed(4)}M
//                       </span>
//                     </td>
//                   );
//                 })}
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }

// // ── Main Results View Component ────────────────────────────────────────

// export function SBResultsView({ results, scenarios, currencyLabel }: {
//   results: ComputedResults;
//   scenarios: ScenarioItem[];
//   currencyLabel: string;
// }) {
//   const [tab, setTab] = useState<Tab>('tables');

//   // Scenarios in display order: all stress, then shocks, then opportunities
//   const orderedScenarios = useMemo(
//     () => scenarios
//       .map((s, i) => ({ s, i }))
//       .sort((a, b) => (TYPE_ORDER[a.s.type] ?? 9) - (TYPE_ORDER[b.s.type] ?? 9) || a.i - b.i)
//       .map(x => x.s),
//     [scenarios]
//   );

//   const scenarioMap = useMemo(() => {
//     const map: Record<string, ScenarioItem> = {};
//     scenarios.forEach(s => { map[s.id] = s; });
//     return map;
//   }, [scenarios]);

//   const sectionTables = results.sectionTables ?? {};
//   const totalSectionMetrics = SECTIONS.reduce((n, s) => n + (sectionTables[s.key]?.length ?? 0), 0);

//   // ── CSV Export ──
//   const handleExportCSV = useCallback(() => {
//     const scIds = orderedScenarios.map(s => s.id);
//     const scName = (id: string) => (scenarioMap[id]?.name ?? id).replace(/,/g, ' ');

//     const matrixCsv = (title: string, rows: typeof results.table1) => {
//       const headers = ['Metric', 'Base Case', ...scIds.map(scName)];
//       const body = rows.map(row => [
//         row.metric.replace(/,/g, ' '),
//         row.baseCase.toFixed(4),
//         ...scIds.map(id => (row.scenarios[id] ?? 0).toFixed(4)),
//       ]);
//       return [title, headers.join(','), ...body.map(r => r.join(','))];
//     };

//     const lines: string[] = [
//       ...matrixCsv('=== TABLE 1: FULL SCENARIO MATRIX ===', results.table1),
//       '',
//       ...matrixCsv('=== TABLE 2: WEIGHTED MATRIX ===', results.table2 ?? []),
//     ];

//     SECTIONS.forEach(s => {
//       lines.push('', `=== ${s.table.toUpperCase()}: ${s.title.toUpperCase()} ===`, 'Metric,Value');
//       (sectionTables[s.key] ?? []).forEach(r => {
//         lines.push(`${r.metric.replace(/,/g, ' ')},${r.value.toFixed(4)}`);
//       });
//     });

//     const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement('a');
//     a.href = url;
//     a.download = 'scenario_builder_results.csv';
//     a.click();
//     URL.revokeObjectURL(url);
//   }, [results, orderedScenarios, scenarioMap, sectionTables]);

//   return (
//     <div className="space-y-6">
//       {/* ═══ Results Summary Banner ═══ */}
//       <div className="rounded-xl border border-outline/20 bg-surface-container-low p-5">
//         <div className="flex items-start gap-3">
//           <div className="p-2 rounded-lg bg-mtn-yellow/10 shrink-0">
//             <FlaskConical className="w-5 h-5 text-mtn-yellow" />
//           </div>
//           <div>
//             <p className="font-sans text-sm font-semibold text-on-surface mb-1">Computation Complete</p>
//             <p className="font-sans text-xs text-on-surface-variant leading-relaxed">
//               <strong className="text-on-surface">{scenarios.length}</strong> scenarios across{' '}
//               <strong className="text-on-surface">{results.table1.length}</strong> derived metrics, weighted into{' '}
//               <strong className="text-on-surface">{results.table2?.length ?? 0}</strong> metrics, and{' '}
//               <strong className="text-on-surface">{totalSectionMetrics}</strong> section metrics across four section tables.
//               All values in <strong className="text-on-surface">{currencyLabel}</strong>.
//             </p>
//           </div>
//         </div>
//       </div>

//       {results.errors && results.errors.length > 0 && (
//         <div className="rounded-lg bg-error/10 border border-error/30 p-3 space-y-1">
//           <p className="font-mono text-[9px] uppercase tracking-widest text-error">
//             {results.errors.length} calculation issue{results.errors.length !== 1 ? 's' : ''}
//           </p>
//           {results.errors.slice(0, 8).map((e, i) => (
//             <p key={i} className="text-[11px] text-error">{e}</p>
//           ))}
//           {results.errors.length > 8 && (
//             <p className="text-[11px] text-error/70">…and {results.errors.length - 8} more</p>
//           )}
//         </div>
//       )}

//       {/* ═══ Tab Navigation Bar ═══ */}
//       <div className="flex items-center gap-2 flex-wrap">
//         <TabBtn active={tab === 'tables'} label="Tables" icon={TableProperties} onClick={() => setTab('tables')} />
//         <TabBtn active={tab === 'waterfalls'} label="Waterfall Charts" icon={BarChart3} onClick={() => setTab('waterfalls')} />
//         <TabBtn active={tab === 'impact'} label="Impact Overview" icon={Layers} onClick={() => setTab('impact')} />
//         <div className="ml-auto">
//           <button
//             onClick={handleExportCSV}
//             className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[10px] uppercase tracking-widest border border-outline/20 text-on-surface-variant hover:text-on-surface hover:border-outline/40 transition-colors"
//           >
//             <Download className="w-3 h-3" /> Export CSV
//           </button>
//         </div>
//       </div>

//       {/* ═══ Tables Tab: Tables 1–6 ═══ */}
//       {tab === 'tables' && (
//         <div className="space-y-5">
//           <MatrixTable
//             tag="Table 1"
//             title="Full Scenario Matrix"
//             rows={results.table1}
//             columns={orderedScenarios}
//           />

//           <MatrixTable
//             tag="Table 2"
//             title="Weighted Matrix"
//             rows={results.table2 ?? []}
//             columns={orderedScenarios}
//           />

//           <div className="grid gap-5 md:grid-cols-2">
//             {SECTIONS.map(s => {
//               const rows = sectionTables[s.key] ?? [];
//               return (
//                 <div key={s.key} className="rounded-xl border border-outline/20 bg-[#1A1A1A] overflow-hidden">
//                   <div className="p-4 border-b border-outline/10">
//                     <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant">{s.table}</p>
//                     <p className={`font-sans text-sm font-bold mt-1 ${s.text}`}>{s.title}</p>
//                   </div>
//                   <table className="w-full text-left">
//                     <thead>
//                       <tr className="border-b border-outline/10">
//                         <th className="p-3 font-mono text-[9px] uppercase tracking-widest text-on-surface-variant">Metric</th>
//                         <th className="p-3 font-mono text-[9px] uppercase tracking-widest text-on-surface-variant text-right">Value</th>
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {rows.length === 0 && (
//                         <tr>
//                           <td colSpan={2} className="p-4 text-center text-xs text-on-surface-variant/50 italic">
//                             No metrics defined
//                           </td>
//                         </tr>
//                       )}
//                       {rows.map((r, i) => (
//                         <tr key={i} className={`border-b border-outline/5 ${i % 2 === 0 ? 'bg-surface-container-low/30' : ''}`}>
//                           <td className="p-3 font-sans text-xs text-on-surface-variant">{r.metric}</td>
//                           <td className="p-3 text-right font-mono text-[11px] text-on-surface font-semibold">
//                             {r.value.toFixed(4)}M
//                           </td>
//                         </tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 </div>
//               );
//             })}
//           </div>
//         </div>
//       )}

//       {/* ═══ Waterfall Charts Tab ═══ */}
//       {tab === 'waterfalls' && (
//         <div className="space-y-6">
//           {SECTIONS.map(s => (
//             <SVGWaterfallChart
//               key={s.key}
//               title={`${s.chart} — ${s.title} Waterfall (${s.table})`}
//               data={results.waterfalls[s.key] ?? []}
//             />
//           ))}
//         </div>
//       )}

//       {/* ═══ Impact Overview Tab ═══ */}
//       {tab === 'impact' && (
//         <SVGImpactOverviewChart
//           results={results}
//           scenarios={orderedScenarios}
//           currencyLabel={currencyLabel}
//         />
//       )}

//       {/* ═══ Reading Guide ═══ */}
//       <div className="rounded-xl border border-outline/10 bg-surface-container-low/50 p-5 space-y-3">
//         <div className="flex items-center gap-2 mb-2">
//           <Info className="w-4 h-4 text-on-surface-variant shrink-0" />
//           <p className="font-sans text-xs font-semibold text-on-surface">Reading Guide</p>
//         </div>
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[10px] text-on-surface-variant leading-relaxed">
//           <div><strong className="text-on-surface">Table 1 (Full Scenario Matrix):</strong> Every derived metric for the Base Case and each scenario, ordered stress → shock → opportunity.</div>
//           <div><strong className="text-on-surface">Table 2 (Weighted Matrix):</strong> The weighted version of each metric, calculated from Table 1 values.</div>
//           <div><strong className="text-on-surface">Tables 3–6:</strong> The four section tables (Stress, Shock, Opportunities, Opportunities considering stress), calculated from Table 2 values.</div>
//           <div><strong className="text-on-surface">Waterfall Charts (1–4):</strong> One per section table. The first metric is the start bar, the last is the total, and those between are impacts.</div>
//           <div><strong className="text-on-surface">Impact Overview:</strong> Stacked bar chart built from Table 1 — each bar stacks all derived metrics for one scenario.</div>
//         </div>
//       </div>
//     </div>
//   );
// }




'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  TableProperties, BarChart3, Download, Info, FlaskConical, Layers, Copy, AlertTriangle,
} from 'lucide-react';
import type { ComputedResults, ScenarioItem, WaterfallItem } from '@/lib/scenarioBuilder';

// ── Color Palette for Impact Overview Metrics ───────────────────────────

const METRIC_COLORS = [
  '#3B82F6', // Blue
  '#F5C518', // MTN Yellow
  '#22C55E', // Green
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#10B981', // Emerald
];

function getMetricColor(idx: number): string {
  return METRIC_COLORS[idx % METRIC_COLORS.length] || '#3B82F6';
}

// ── Formatting Helpers ──────────────────────────────────────────────────
// Every number is shown in ONE unit (the configuration's unit, e.g. "GHS M").
// No K / M suffixes: the unit is stated in the chart title and on the axis.

function fmtNum(val: number, decimals?: number): string {
  const d = decimals ?? (Math.abs(val) >= 100 ? 1 : 2);
  return val.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

function fmtDeltaNum(val: number): string {
  return `${val >= 0 ? '+' : ''}${fmtNum(val)}`;
}

/** Axis tick labels: as few decimals as the axis range allows. */
function fmtTick(val: number, range: number): string {
  const d = range >= 20 ? 0 : range >= 2 ? 1 : 2;
  return fmtNum(val, d);
}

function splitText(text: string, maxLen: number = 14): string[] {
  if (!text) return [''];
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxLen) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

type Tab = 'tables' | 'waterfalls' | 'impact';

const TYPE_ORDER: Record<string, number> = { stress: 0, shock: 1, opportunity: 2 };

function typeTextClass(type: string): string {
  if (type === 'stress') return 'text-mtn-yellow';
  if (type === 'shock') return 'text-red-400';
  return 'text-green-400';
}

/** The four section tables / waterfall charts built in stage 7. */
const SECTIONS: { key: string; table: string; chart: string; title: string; text: string }[] = [
  { key: 'stress', table: 'Table 3', chart: 'Chart 1', title: 'Stress', text: 'text-mtn-yellow' },
  { key: 'shock', table: 'Table 4', chart: 'Chart 2', title: 'Shock', text: 'text-red-400' },
  { key: 'opportunity', table: 'Table 5', chart: 'Chart 3', title: 'Opportunities (holding all other constant)', text: 'text-green-400' },
  { key: 'combined', table: 'Table 6', chart: 'Chart 4', title: 'Opportunities (considering stress)', text: 'text-blue-400' },
];

function TabBtn({ active, label, icon: Icon, onClick }: {
  active: boolean; label: string; icon: typeof TableProperties; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-mono text-[10px] uppercase tracking-widest transition-all ${
        active
          ? 'bg-mtn-yellow text-black font-bold'
          : 'border border-outline/20 text-on-surface-variant hover:text-on-surface hover:border-outline/40'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

// ── 1. Custom SVG Waterfall Chart (built from Tables 3–6) ───────────────

function SVGWaterfallChart({ title, data, currencyLabel }: {
  title: string; data: WaterfallItem[]; currencyLabel: string;
}) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-outline/20 bg-[#1A1A1A] p-6 text-center">
        <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant mb-2">{title}</p>
        <p className="text-xs text-on-surface-variant italic">No metrics defined for this section</p>
      </div>
    );
  }

  // Calculate Running Totals
  const points: { item: WaterfallItem; start: number; end: number; val: number }[] = [];
  let running = 0;
  for (const item of data) {
    let start = 0;
    let end = 0;
    if (item.type === 'base' || item.type === 'total') {
      start = 0;
      end = item.value;
      running = item.value;
    } else {
      start = running;
      end = running + item.value;
      running = end;
    }
    points.push({ item, start, end, val: item.value });
  }

  // Bounds & Scaling
  const allVals = points.flatMap(p => [p.start, p.end]);
  const minVal = Math.min(0, ...allVals);
  let maxVal = Math.max(0, ...allVals);
  if (maxVal === minVal) maxVal += 1;
  maxVal = maxVal * 1.15;
  const range = maxVal - minVal;

  const svgWidth = 867;
  const svgHeight = 458;
  const margin = { top: 28, right: 20, bottom: 130, left: 76 };
  const chartW = svgWidth - margin.left - margin.right;
  const chartH = svgHeight - margin.top - margin.bottom;

  const getY = (v: number) => chartH - ((v - minVal) / range) * chartH;
  const zeroY = getY(0);

  const ticks = [0, 1, 2, 3, 4, 5].map(i => maxVal - (range * i) / 5);

  const n = points.length;
  const barTotalW = chartW / n;
  const barW = barTotalW * 0.75;
  const gap = barTotalW * 0.25;

  const getFill = (type: string) => {
    if (type === 'base') return '#F5C518';
    if (type === 'positive') return '#22C55E';
    if (type === 'negative') return '#EF4444';
    if (type === 'total') return '#3B82F6';
    return '#888888';
  };

  const handleCopy = () => {
    navigator.clipboard?.writeText(JSON.stringify(data, null, 2));
    alert('Waterfall data copied to clipboard!');
  };

  return (
    <div className="rounded-xl border border-outline/20 bg-[#1A1A1A] p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant">
          {title} ({currencyLabel})
        </p>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-container hover:bg-surface-container-high border border-outline/20 transition-colors text-[10px] font-mono uppercase tracking-widest text-on-surface"
        >
          <Copy className="w-3.5 h-3.5" /> Copy to PPT
        </button>
      </div>

      <div className="overflow-x-auto custom-scrollbar pb-2">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          width="100%"
          height="100%"
          style={{ minWidth: '700px', backgroundColor: '#1A1A1A', overflow: 'visible' }}
        >
          <g transform={`translate(${margin.left}, ${margin.top})`}>
            {/* Y-axis unit label */}
            <text
              transform={`translate(-62, ${chartH / 2}) rotate(-90)`}
              textAnchor="middle"
              fill="#9CA3AF"
              fontSize="9"
              fontFamily="monospace"
            >
              {currencyLabel}
            </text>

            {ticks.map((tickVal, i) => {
              const y = getY(tickVal);
              const isZero = Math.abs(tickVal) < 0.001 * Math.max(1, range);
              return (
                <g key={i}>
                  <line
                    x1="0"
                    y1={y}
                    x2={chartW}
                    y2={y}
                    stroke={isZero ? '#666666' : '#333333'}
                    strokeWidth={isZero ? '1.5' : '0.5'}
                    strokeDasharray={isZero ? 'none' : '3,3'}
                  />
                  <text
                    x="-8"
                    y={y}
                    dy="0.35em"
                    textAnchor="end"
                    fill="#9CA3AF"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {fmtTick(tickVal, range)}
                  </text>
                </g>
              );
            })}

            {points.map((p, i) => {
              const x = (i * barTotalW) + (gap / 2);
              const y1 = getY(p.start);
              const y2 = getY(p.end);
              const rectY = Math.min(y1, y2);
              const rectH = Math.max(Math.abs(y1 - y2), 1);
              const isBaseOrTotal = p.item.type === 'base' || p.item.type === 'total';
              const displayVal = isBaseOrTotal ? fmtNum(p.val) : fmtDeltaNum(p.val);
              const labelLines = splitText(p.item.label, 14);

              return (
                <g key={i}>
                  <rect
                    x={x}
                    y={rectY}
                    width={barW}
                    height={rectH}
                    fill={getFill(p.item.type)}
                    rx="2"
                    opacity="0.85"
                    className="transition-opacity hover:opacity-100"
                  />
                  <text
                    x={x + barW / 2}
                    y={rectY - 6}
                    textAnchor="middle"
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="bold"
                    fill="#E5E7EB"
                  >
                    {displayVal}
                  </text>
                  {labelLines.map((line, li) => (
                    <text
                      key={li}
                      x={x + barW / 2}
                      y={chartH + 16 + (li * 12)}
                      textAnchor="middle"
                      fontSize="8.5"
                      fontFamily="sans-serif"
                      fill="#9CA3AF"
                    >
                      {line}
                    </text>
                  ))}
                </g>
              );
            })}

            <line x1="0" y1="0" x2="0" y2={chartH} stroke="#444444" strokeWidth="1" />
            <line x1="0" y1={zeroY} x2={chartW} y2={zeroY} stroke="#666666" strokeWidth="1.5" />
          </g>
        </svg>
      </div>

      <div className="flex items-center gap-4 mt-2 pt-2 border-t border-outline/10">
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[#F5C518]"></div><span className="font-mono text-[8px] text-on-surface-variant">Start</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[#22C55E]"></div><span className="font-mono text-[8px] text-on-surface-variant">Positive Impact</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[#EF4444]"></div><span className="font-mono text-[8px] text-on-surface-variant">Negative Impact</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[#3B82F6]"></div><span className="font-mono text-[8px] text-on-surface-variant">Total</span></div>
      </div>
    </div>
  );
}

// ── 2. Stacked Impact Overview Chart (data comes from Table 1) ──────────

function SVGImpactOverviewChart({ results, scenarios, currencyLabel }: {
  results: ComputedResults;
  scenarios: ScenarioItem[];               // already ordered: stress → shock → opportunity
  currencyLabel: string;
}) {
  const rows = results.table1;
  const metrics = rows.map(r => r.metric);

  // Columns: Base Case first, then every scenario in stress → shock → opportunity order
  const columns = useMemo(() => {
    const list: { id: string; name: string; type: string }[] = [{ id: 'base', name: 'Base Case', type: 'base' }];
    scenarios.forEach(sc => list.push({ id: sc.id, name: sc.name || sc.id, type: sc.type }));
    return list;
  }, [scenarios]);

  // Stack every metric of Table 1 on top of each other, per column.
  // Positive values stack upward from zero, negative values stack downward.
  const stacks = useMemo(() => {
    return columns.map(col => {
      let pos = 0;
      let neg = 0;
      const segments = rows.map((row, idx) => {
        const val = col.id === 'base' ? row.baseCase : (row.scenarios[col.id] ?? 0);
        let from: number;
        let to: number;
        if (val >= 0) { from = pos; to = pos + val; pos = to; }
        else { from = neg; to = neg + val; neg = to; }
        return { metric: row.metric, idx, val, from, to };
      });
      return { col, segments, posTotal: pos, negTotal: neg, net: pos + neg };
    });
  }, [columns, rows]);

  const maxPos = Math.max(0, ...stacks.map(s => s.posTotal));
  const minNeg = Math.min(0, ...stacks.map(s => s.negTotal));
  const maxVal = maxPos > 0 ? maxPos * 1.15 : 100;
  const minVal = minNeg < 0 ? minNeg * 1.15 : 0;
  const range = maxVal - minVal;

  const svgWidth = 867;
  const svgHeight = 514;
  const margin = { top: 24, right: 20, bottom: 130, left: 76 };
  const chartW = svgWidth - margin.left - margin.right;
  const chartH = svgHeight - margin.top - margin.bottom;

  const getY = (v: number) => chartH - ((v - minVal) / range) * chartH;
  const zeroY = getY(0);

  const ticks = [0, 1, 2, 3, 4, 5].map(i => maxVal - (range * i) / 5);

  const colCount = columns.length;
  const colTotalW = chartW / colCount;
  const colBarW = colTotalW * 0.75;
  const gap = colTotalW * 0.25;

  const handleCopy = () => {
    navigator.clipboard?.writeText(JSON.stringify({ columns, metrics, table1: results.table1 }, null, 2));
    alert('Impact Overview data copied to clipboard!');
  };

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-outline/20 bg-[#1A1A1A] p-6 text-center">
        <p className="text-xs text-on-surface-variant italic">No data in Table 1</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-outline/20 bg-[#1A1A1A] p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant">
          Impact Overview — Stacked Metrics from Table 1 ({currencyLabel})
        </p>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-container hover:bg-surface-container-high border border-outline/20 transition-colors text-[10px] font-mono uppercase tracking-widest text-on-surface"
        >
          <Copy className="w-3.5 h-3.5" /> Copy to PPT
        </button>
      </div>

      <div className="overflow-x-auto custom-scrollbar pb-2">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          width="100%"
          height="100%"
          style={{ minWidth: '700px', backgroundColor: '#1A1A1A', overflow: 'visible' }}
        >
          <g transform={`translate(${margin.left}, ${margin.top})`}>
            {/* Y-axis unit label */}
            <text
              transform={`translate(-62, ${chartH / 2}) rotate(-90)`}
              textAnchor="middle"
              fill="#9CA3AF"
              fontSize="9"
              fontFamily="monospace"
            >
              {currencyLabel}
            </text>

            {/* Grid & Ticks */}
            {ticks.map((tickVal, i) => {
              const y = getY(tickVal);
              const isZero = Math.abs(tickVal) < 0.001 * Math.max(1, range);
              return (
                <g key={i}>
                  <line
                    x1="0"
                    y1={y}
                    x2={chartW}
                    y2={y}
                    stroke={isZero ? '#666666' : '#333333'}
                    strokeWidth={isZero ? '1.5' : '0.5'}
                    strokeDasharray={isZero ? 'none' : '3,3'}
                  />
                  <text
                    x="-8"
                    y={y}
                    dy="0.35em"
                    textAnchor="end"
                    fill="#9CA3AF"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {fmtTick(tickVal, range)}
                  </text>
                </g>
              );
            })}

            {/* One stacked bar per column */}
            {stacks.map((stack, colIdx) => {
              const x = (colIdx * colTotalW) + (gap / 2);
              const labelLines = splitText(stack.col.name, 14);
              const topY = stack.posTotal > 0 ? getY(stack.posTotal) : zeroY;

              return (
                <g key={stack.col.id}>
                  {stack.segments.map(seg => {
                    const yA = getY(seg.from);
                    const yB = getY(seg.to);
                    const rectY = Math.min(yA, yB);
                    const rectH = Math.max(Math.abs(yA - yB), seg.val === 0 ? 0 : 1);
                    if (rectH === 0) return null;
                    return (
                      <g key={seg.metric}>
                        <rect
                          x={x}
                          y={rectY}
                          width={colBarW}
                          height={rectH}
                          fill={getMetricColor(seg.idx)}
                          opacity="0.85"
                          className="transition-opacity hover:opacity-100"
                        >
                          <title>{`${seg.metric}: ${fmtNum(seg.val)} ${currencyLabel}`}</title>
                        </rect>
                        {/* Data label on each segment (hidden when the segment is too thin to hold it) */}
                        {rectH >= 13 && (
                          <text
                            x={x + colBarW / 2}
                            y={rectY + rectH / 2}
                            dy="0.35em"
                            textAnchor="middle"
                            fontSize="8.5"
                            fontFamily="monospace"
                            fontWeight="bold"
                            fill="#FFFFFF"
                            stroke="#1A1A1A"
                            strokeWidth="2.5"
                            style={{ paintOrder: 'stroke' }}
                          >
                            {fmtNum(seg.val)}
                          </text>
                        )}
                      </g>
                    );
                  })}

                  {/* Net total on top */}
                  <text
                    x={x + colBarW / 2}
                    y={topY - 6}
                    textAnchor="middle"
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="bold"
                    fill="#E5E7EB"
                  >
                    {fmtNum(stack.net)}
                  </text>

                  {/* Column label under the chart */}
                  {labelLines.map((line, li) => (
                    <text
                      key={li}
                      x={x + colBarW / 2}
                      y={chartH + 16 + (li * 12)}
                      textAnchor="middle"
                      fontSize="8.5"
                      fontFamily="sans-serif"
                      fill={
                        stack.col.type === 'stress' ? '#F5C518'
                          : stack.col.type === 'shock' ? '#F87171'
                            : stack.col.type === 'opportunity' ? '#4ADE80'
                              : '#60A5FA'
                      }
                    >
                      {line}
                    </text>
                  ))}
                </g>
              );
            })}

            <line x1="0" y1="0" x2="0" y2={chartH} stroke="#444444" strokeWidth="1" />
            <line x1="0" y1={zeroY} x2={chartW} y2={zeroY} stroke="#666666" strokeWidth="1" />
          </g>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 pt-2 border-t border-outline/10 flex-wrap">
        {metrics.map((m, idx) => (
          <div key={m} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: getMetricColor(idx) }}></div>
            <span className="font-mono text-[8px] text-on-surface-variant">{m}</span>
          </div>
        ))}
        <span className="font-mono text-[8px] text-on-surface-variant/60 ml-auto">
          Labels on each segment = metric value · Label above each bar = net total
        </span>
      </div>
    </div>
  );
}

// ── Reusable matrix table (Table 1 and Table 2) ─────────────────────────

function MatrixTable({ tag, title, rows, columns, currencyLabel }: {
  tag: string;
  title: string;
  rows: { metric: string; baseCase: number; scenarios: Record<string, number> }[];
  columns: ScenarioItem[];
  currencyLabel: string;
}) {
  return (
    <div className="rounded-xl border border-outline/20 bg-[#1A1A1A] overflow-hidden">
      <div className="p-4 border-b border-outline/10">
        <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant">{tag}</p>
        <p className="font-sans text-sm font-bold text-on-surface mt-1">
          {title} <span className="text-on-surface-variant font-normal">({currencyLabel})</span>
        </p>
      </div>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left min-w-[1200px]">
          <thead>
            <tr className="border-b border-outline/10">
              <th className="p-3 font-mono text-[9px] uppercase tracking-widest text-on-surface-variant sticky left-0 bg-[#1A1A1A] z-10 min-w-[160px]">
                Metric
              </th>
              <th className="p-3 text-center min-w-[110px]">
                <span className="font-mono text-[8px] uppercase tracking-widest text-blue-400">Base Case</span>
              </th>
              {columns.map(sc => (
                <th key={sc.id} className="p-3 text-center min-w-[110px]">
                  <span className={`font-mono text-[8px] uppercase tracking-widest ${typeTextClass(sc.type)}`}>
                    {sc.name || sc.id}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={`border-b border-outline/5 ${i % 2 === 0 ? 'bg-surface-container-low/30' : ''}`}>
                <td className="p-3 font-sans text-xs text-on-surface-variant sticky left-0 bg-inherit z-10 whitespace-nowrap">
                  {row.metric}
                </td>
                <td className="p-3 text-center">
                  <span className="font-mono text-[11px] text-on-surface font-semibold">
                    {fmtNum(row.baseCase, 4)}
                  </span>
                </td>
                {columns.map(sc => {
                  const v = row.scenarios[sc.id];
                  return (
                    <td key={sc.id} className="p-3 text-center">
                      <span className="font-mono text-[11px] text-on-surface-variant">
                        {fmtNum(v !== undefined ? v : 0, 4)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Results View Component ────────────────────────────────────────

export function SBResultsView({ results, scenarios, currencyLabel }: {
  results: ComputedResults;
  scenarios: ScenarioItem[];
  currencyLabel: string;
}) {
  const [tab, setTab] = useState<Tab>('tables');
  const unit = currencyLabel.trim() || 'units';

  // Scenarios in display order: all stress, then shocks, then opportunities
  const orderedScenarios = useMemo(
    () => scenarios
      .map((s, i) => ({ s, i }))
      .sort((a, b) => (TYPE_ORDER[a.s.type] ?? 9) - (TYPE_ORDER[b.s.type] ?? 9) || a.i - b.i)
      .map(x => x.s),
    [scenarios]
  );

  const scenarioMap = useMemo(() => {
    const map: Record<string, ScenarioItem> = {};
    scenarios.forEach(s => { map[s.id] = s; });
    return map;
  }, [scenarios]);

  const sectionTables = results.sectionTables ?? {};
  const totalSectionMetrics = SECTIONS.reduce((n, s) => n + (sectionTables[s.key]?.length ?? 0), 0);

  // ── CSV Export ──
  const handleExportCSV = useCallback(() => {
    const scIds = orderedScenarios.map(s => s.id);
    const scName = (id: string) => (scenarioMap[id]?.name ?? id).replace(/,/g, ' ');

    const matrixCsv = (title: string, rows: typeof results.table1) => {
      const headers = ['Metric', 'Base Case', ...scIds.map(scName)];
      const body = rows.map(row => [
        row.metric.replace(/,/g, ' '),
        row.baseCase.toFixed(4),
        ...scIds.map(id => (row.scenarios[id] ?? 0).toFixed(4)),
      ]);
      return [title, headers.join(','), ...body.map(r => r.join(','))];
    };

    const lines: string[] = [
      `All values in ${unit}`,
      '',
      ...matrixCsv('=== TABLE 1: FULL SCENARIO MATRIX ===', results.table1),
      '',
      ...matrixCsv('=== TABLE 2: WEIGHTED MATRIX ===', results.table2 ?? []),
    ];

    SECTIONS.forEach(s => {
      lines.push('', `=== ${s.table.toUpperCase()}: ${s.title.toUpperCase()} ===`, 'Metric,Value');
      (sectionTables[s.key] ?? []).forEach(r => {
        lines.push(`${r.metric.replace(/,/g, ' ')},${r.value.toFixed(4)}`);
      });
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scenario_builder_results.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [results, orderedScenarios, scenarioMap, sectionTables, unit]);

  return (
    <div className="space-y-6">
      {/* ═══ Results Summary Banner ═══ */}
      <div className="rounded-xl border border-outline/20 bg-surface-container-low p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-mtn-yellow/10 shrink-0">
            <FlaskConical className="w-5 h-5 text-mtn-yellow" />
          </div>
          <div>
            <p className="font-sans text-sm font-semibold text-on-surface mb-1">Computation Complete</p>
            <p className="font-sans text-xs text-on-surface-variant leading-relaxed">
              <strong className="text-on-surface">{scenarios.length}</strong> scenarios across{' '}
              <strong className="text-on-surface">{results.table1.length}</strong> derived metrics, weighted into{' '}
              <strong className="text-on-surface">{results.table2?.length ?? 0}</strong> metrics, and{' '}
              <strong className="text-on-surface">{totalSectionMetrics}</strong> section metrics across four section tables.
              All values in <strong className="text-on-surface">{unit}</strong>.
            </p>
          </div>
        </div>
      </div>

      {results.errors && results.errors.length > 0 && (
        <div className="rounded-lg bg-error/10 border border-error/30 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-error shrink-0" />
            <p className="font-mono text-[9px] uppercase tracking-widest text-error">
              {results.errors.length} calculation issue{results.errors.length !== 1 ? 's' : ''} — affected cells show 0
            </p>
          </div>
          {results.errors.slice(0, 10).map((e, i) => (
            <p key={i} className="text-[11px] text-error leading-snug">• {e}</p>
          ))}
          {results.errors.length > 10 && (
            <p className="text-[11px] text-error/70">…and {results.errors.length - 10} more</p>
          )}
          <p className="text-[10px] text-error/70">
            Each message names the step to open (go back to the editor and look for the red messages there).
          </p>
        </div>
      )}

      {/* ═══ Tab Navigation Bar ═══ */}
      <div className="flex items-center gap-2 flex-wrap">
        <TabBtn active={tab === 'tables'} label="Tables" icon={TableProperties} onClick={() => setTab('tables')} />
        <TabBtn active={tab === 'waterfalls'} label="Waterfall Charts" icon={BarChart3} onClick={() => setTab('waterfalls')} />
        <TabBtn active={tab === 'impact'} label="Impact Overview" icon={Layers} onClick={() => setTab('impact')} />
        <div className="ml-auto">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[10px] uppercase tracking-widest border border-outline/20 text-on-surface-variant hover:text-on-surface hover:border-outline/40 transition-colors"
          >
            <Download className="w-3 h-3" /> Export CSV
          </button>
        </div>
      </div>

      {/* ═══ Tables Tab: Tables 1–6 ═══ */}
      {tab === 'tables' && (
        <div className="space-y-5">
          <MatrixTable
            tag="Table 1"
            title="Full Scenario Matrix"
            rows={results.table1}
            columns={orderedScenarios}
            currencyLabel={unit}
          />

          <MatrixTable
            tag="Table 2"
            title="Weighted Matrix"
            rows={results.table2 ?? []}
            columns={orderedScenarios}
            currencyLabel={unit}
          />

          <div className="grid gap-5 md:grid-cols-2">
            {SECTIONS.map(s => {
              const rows = sectionTables[s.key] ?? [];
              return (
                <div key={s.key} className="rounded-xl border border-outline/20 bg-[#1A1A1A] overflow-hidden">
                  <div className="p-4 border-b border-outline/10">
                    <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant">{s.table}</p>
                    <p className={`font-sans text-sm font-bold mt-1 ${s.text}`}>
                      {s.title} <span className="text-on-surface-variant font-normal">({unit})</span>
                    </p>
                  </div>
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-outline/10">
                        <th className="p-3 font-mono text-[9px] uppercase tracking-widest text-on-surface-variant">Metric</th>
                        <th className="p-3 font-mono text-[9px] uppercase tracking-widest text-on-surface-variant text-right">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 && (
                        <tr>
                          <td colSpan={2} className="p-4 text-center text-xs text-on-surface-variant/50 italic">
                            No metrics defined
                          </td>
                        </tr>
                      )}
                      {rows.map((r, i) => (
                        <tr key={i} className={`border-b border-outline/5 ${i % 2 === 0 ? 'bg-surface-container-low/30' : ''}`}>
                          <td className="p-3 font-sans text-xs text-on-surface-variant">{r.metric}</td>
                          <td className="p-3 text-right font-mono text-[11px] text-on-surface font-semibold">
                            {fmtNum(r.value, 4)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ Waterfall Charts Tab ═══ */}
      {tab === 'waterfalls' && (
        <div className="space-y-6">
          {SECTIONS.map(s => (
            <SVGWaterfallChart
              key={s.key}
              title={`${s.chart} — ${s.title} Waterfall (${s.table})`}
              data={results.waterfalls[s.key] ?? []}
              currencyLabel={unit}
            />
          ))}
        </div>
      )}

      {/* ═══ Impact Overview Tab ═══ */}
      {tab === 'impact' && (
        <SVGImpactOverviewChart
          results={results}
          scenarios={orderedScenarios}
          currencyLabel={unit}
        />
      )}

      {/* ═══ Reading Guide ═══ */}
      <div className="rounded-xl border border-outline/10 bg-surface-container-low/50 p-5 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-4 h-4 text-on-surface-variant shrink-0" />
          <p className="font-sans text-xs font-semibold text-on-surface">Reading Guide</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[10px] text-on-surface-variant leading-relaxed">
          <div><strong className="text-on-surface">Units:</strong> every table, chart axis and data label uses one unit — {unit}. Nothing is shown in K or M.</div>
          <div><strong className="text-on-surface">Table 1 (Full Scenario Matrix):</strong> Every derived metric for the Base Case and each scenario, ordered stress → shock → opportunity.</div>
          <div><strong className="text-on-surface">Table 2 (Weighted Matrix):</strong> The weighted version of each metric, calculated from Table 1 values.</div>
          <div><strong className="text-on-surface">Tables 3–6:</strong> The four section tables (Stress, Shock, Opportunities, Opportunities considering stress), calculated from Table 2 values.</div>
          <div><strong className="text-on-surface">Waterfall Charts (1–4):</strong> One per section table. The first metric is the start bar, the last is the total, and those between are impacts.</div>
          <div><strong className="text-on-surface">Impact Overview:</strong> Stacked bar chart built from Table 1. Each bar stacks all derived metrics for one scenario; labels show each metric&apos;s value and the net total.</div>
        </div>
      </div>
    </div>
  );
}
