// frontend/components/scenarioAutomate/FFDerivedPanel.tsx

'use client';

import type { DerivedVariables } from '@/lib/scenarioAutomate/types';
import { formatCurrency, formatPct } from '@/lib/scenarioAutomate/format';
import { Calculator } from 'lucide-react';

interface Props {
  derived: DerivedVariables;
  className?: string;
}

const ITEMS: { key: keyof DerivedVariables; label: string; format: 'currency' | 'pct' }[] = [
  { key: 'contributionMargin', label: 'Contribution Margin', format: 'currency' },
  { key: 'ebitda', label: 'EBITDA', format: 'currency' },
  { key: 'ebit', label: 'EBIT', format: 'currency' },
  { key: 'pbt', label: 'PBT', format: 'currency' },
  { key: 'pat', label: 'PAT', format: 'currency' },
  { key: 'afcf', label: 'AFCF', format: 'currency' },
  { key: 'upstream', label: 'Upstream', format: 'currency' },
  { key: 'proportionCosToRevenue', label: 'COS / Revenue Ratio', format: 'pct' },
  { key: 'managementFeesPct', label: 'Mgmt Fees % of Revenue', format: 'pct' },
];

export function FFDerivedPanel({ derived, className = '' }: Props) {
  return (
    <div className={`rounded-xl border border-outline/20 bg-[#1A1A1A] p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Calculator className="w-4 h-4 text-mtn-yellow" />
        <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant">
          Derived Base Case Metrics
        </p>
      </div>
      <div className="grid grid-cols-3 md:grid-cols-5 gap-2.5">
        {ITEMS.map(item => (
          <div key={item.key} className="rounded-lg bg-surface-container-low/50 p-2.5 text-center border border-outline/10">
            <p className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant mb-1">
              {item.label}
            </p>
            <p className="font-mono text-sm font-bold text-on-surface">
              {item.format === 'currency'
                ? formatCurrency(derived[item.key])
                : formatPct(derived[item.key])}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}