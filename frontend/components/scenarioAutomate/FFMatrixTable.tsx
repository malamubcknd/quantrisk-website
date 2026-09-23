// frontend/components/scenarioAutomate/FFMatrixTable.tsx

'use client';

import { useRef } from 'react';
import type { Table1Data, Table2Data, MatrixRow } from '@/lib/scenarioAutomate/types';
import { SCENARIO_META, MATRIX_ROWS } from '@/lib/scenarioAutomate/types';
import { formatCurrency } from '@/lib/scenarioAutomate/format';

interface Props {
  title: string;
  subtitle: string;
  data: Table1Data | Table2Data;
  showBaseCase?: boolean;
  className?: string;
}

export function FFMatrixTable({ title, subtitle, data, showBaseCase = true, className = '' }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scenarioKeys = Object.keys(data).filter(k => showBaseCase || k !== 'baseCase') as string[];

  return (
    <div className={`rounded-xl border border-outline/20 bg-[#1A1A1A] overflow-hidden ${className}`}>
      <div className="p-4 border-b border-outline/10">
        <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant">{subtitle}</p>
        <p className="font-sans text-sm font-bold text-on-surface mt-1">{title}</p>
      </div>

      <div ref={scrollRef} className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left min-w-[1200px]">
          <thead>
            <tr className="border-b border-outline/10">
              <th className="p-3 font-mono text-[9px] uppercase tracking-widest text-on-surface-variant sticky left-0 bg-[#1A1A1A] z-10 min-w-[140px]">
                Metric
              </th>
              {scenarioKeys.map(sk => {
                const meta = sk === 'baseCase'
                  ? { shortLabel: 'Base Case', category: 'base' as const }
                  : SCENARIO_META[sk];
                const catColor = meta?.category === 'stress'
                  ? 'text-mtn-yellow'
                  : meta?.category === 'shock'
                    ? 'text-red-400'
                    : meta?.category === 'opportunity'
                      ? 'text-green-400'
                      : 'text-blue-400';

                return (
                  <th key={sk} className="p-3 text-center min-w-[110px]">
                    <span className={`font-mono text-[8px] uppercase tracking-widest ${catColor}`}>
                      {meta?.shortLabel ?? sk}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {MATRIX_ROWS.map(({ key, label }, rowIdx) => (
              <tr key={key} className={`border-b border-outline/5 ${rowIdx % 2 === 0 ? 'bg-surface-container-low/30' : ''}`}>
                <td className="p-3 font-sans text-xs text-on-surface-variant sticky left-0 bg-inherit z-10 whitespace-nowrap">
                  {label}
                </td>
                {scenarioKeys.map(sk => {
                  const row = (data as Record<string, MatrixRow>)[sk];
                  const val = row?.[key] ?? 0;
                  const isBase = sk === 'baseCase';
                  const baseVal = showBaseCase ? ((data as Table1Data).baseCase?.[key] ?? 0) : 0;
                  const isNeg = !isBase && val < 0;

                  return (
                    <td key={sk} className="p-3 text-center">
                      <span className={`font-mono text-[11px] ${
                        isBase ? 'text-on-surface font-semibold'
                          : isNeg ? 'text-red-400' : val > 0 ? 'text-green-400' : 'text-on-surface-variant'
                      }`}>
                        {val > 0 && !isBase ? '+' : ''}{formatCurrency(val)}
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