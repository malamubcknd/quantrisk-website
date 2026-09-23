// frontend/components/scenarioAutomate/FFScenarioInputs.tsx

'use client';

import { useState } from 'react';
import type { AllScenarioInputs } from '@/lib/scenarioAutomate/types';
import { SCENARIO_META } from '@/lib/scenarioAutomate/types';
import {
  ChevronDown, ChevronRight,
  ShieldAlert, Zap, TrendingUp,
} from 'lucide-react';

interface Props {
  value: AllScenarioInputs;
  onChange: (v: AllScenarioInputs) => void;
}

// ── Field description type ───────────────────────────────────────────────────

interface ScenarioFieldDef {
  key: string;
  label: string;
  tooltip: string;
  type: 'percentage' | 'currency' | 'number';
}

// ── Field definitions per scenario ───────────────────────────────────────────

const SCENARIO_FIELDS: Record<string, ScenarioFieldDef[]> = {
  x: [
    { key: 'shockPct', label: 'Shock %', tooltip: 'Proportion of must-win revenue at risk', type: 'percentage' },
    { key: 'bpPct', label: 'BP %', tooltip: 'Portion of BP revenue from must-win initiatives', type: 'percentage' },
    { key: 'opex', label: 'OPEX (Direct)', tooltip: 'Operating expenditure under this scenario', type: 'currency' },
    { key: 'rate1', label: 'Dividend Payout Ratio', tooltip: "Group's share of total dividends", type: 'percentage' },
    { key: 'rate2', label: 'PAT Payout Rate', tooltip: 'Rate applied to PAT for 2026 payout', type: 'percentage' },
  ],
  y: [
    { key: 'bpPct', label: 'BP % (Data Revenue at Risk)', tooltip: 'Proportion of data revenue at risk', type: 'percentage' },
    { key: 'shockPct', label: 'Churn Rate', tooltip: 'Customer churn rate (e.g., 20%)', type: 'percentage' },
    { key: 'rate3', label: 'Dividend Payout Ratio', tooltip: "Group's share of total dividends", type: 'percentage' },
    { key: 'rate4', label: 'PAT Payout Rate', tooltip: 'Rate applied to PAT for 2026 payout', type: 'percentage' },
  ],
  z: [
    { key: 'rate1', label: 'OPEX Increase Rate', tooltip: 'Additional OPEX as % (e.g., 0.20 = 20%)', type: 'percentage' },
    { key: 'rate2', label: 'Dividend Payout Ratio', tooltip: "Group's share", type: 'percentage' },
    { key: 'rate3', label: 'PAT Payout Rate', tooltip: 'Rate applied to PAT for 2026 payout', type: 'percentage' },
  ],
  a: [
    { key: 'constant1', label: 'BP FX Rate (OPEX)', tooltip: 'Business plan exchange rate for OPEX', type: 'number' },
    { key: 'constant2', label: 'BP FX Rate (COS)', tooltip: 'Exchange rate for COS conversion', type: 'number' },
    { key: 'constant3', label: 'BP FX Rate (CAPEX)', tooltip: 'Exchange rate for CAPEX conversion', type: 'number' },
    { key: 'constant4', label: 'Useful Life Divisor', tooltip: 'Depreciation period divisor', type: 'number' },
    { key: 'rate1', label: 'GG OPEX %', tooltip: 'Proportion of OPEX that is foreign', type: 'percentage' },
    { key: 'rate3', label: 'Stressed FX Rate (COS)', tooltip: 'Stressed exchange rate for COS', type: 'number' },
    { key: 'rate4', label: 'GG COS %', tooltip: 'Proportion of COS that is foreign', type: 'percentage' },
    { key: 'rate5', label: 'Local COS %', tooltip: 'Proportion of COS that is local', type: 'percentage' },
    { key: 'rate6', label: 'Stressed FX Rate / GG CAPEX %', tooltip: 'Stressed rate for CAPEX', type: 'number' },
    { key: 'rate7', label: 'Dividend Payout Ratio', tooltip: "Group's share", type: 'percentage' },
    { key: 'rate8', label: 'PAT Payout Rate', tooltip: 'Rate applied to PAT for 2026 payout', type: 'percentage' },
  ],
  b: [
    { key: 'rate1', label: 'Foreign-Denominated %', tooltip: 'Proportion NOT inflation-sensitive', type: 'percentage' },
    { key: 'rate2', label: 'Inflation Stress Multiplier', tooltip: 'e.g., 1.45 for 45% inflation', type: 'number' },
    { key: 'rate3', label: 'Dividend Payout Ratio', tooltip: "Group's share", type: 'percentage' },
    { key: 'rate4', label: 'PAT Payout Rate', tooltip: 'Rate applied to PAT for 2026 payout', type: 'percentage' },
  ],
  c: [
    { key: 'transferPricingInterest', label: 'TP Interest (OPEX add)', tooltip: 'Additional OPEX from transfer pricing interest', type: 'currency' },
    { key: 'transferPricingCapital', label: 'TP Capital (Tax add)', tooltip: 'Additional tax from transfer pricing capital', type: 'currency' },
    { key: 'rate1', label: 'Dividend Payout Ratio', tooltip: "Group's share", type: 'percentage' },
    { key: 'rate2', label: 'PAT Payout Rate', tooltip: 'Rate applied to PAT for 2026 payout', type: 'percentage' },
  ],
  d: [
    { key: 'bpPct', label: 'BP % (Data Revenue at Risk)', tooltip: 'Proportion of data revenue at risk', type: 'percentage' },
    { key: 'shockPct', label: 'Churn Severity', tooltip: 'Churn severity rate (e.g., 50%)', type: 'percentage' },
    { key: 'rate1', label: 'Dividend Payout Ratio', tooltip: "Group's share", type: 'percentage' },
    { key: 'rate2', label: 'PAT Payout Rate', tooltip: 'Rate applied to PAT for 2026 payout', type: 'percentage' },
  ],
  e: [
    { key: 'bpPct', label: 'BP % (Revenue from MWI)', tooltip: 'Revenue from must-win initiatives', type: 'percentage' },
    { key: 'shockPct', label: 'Failure Rate', tooltip: 'Failure rate (e.g., 50%)', type: 'percentage' },
    { key: 'rate1', label: 'Dividend Payout Ratio', tooltip: "Group's share", type: 'percentage' },
    { key: 'rate2', label: 'PAT Payout Rate', tooltip: 'Rate applied to PAT for 2026 payout', type: 'percentage' },
  ],
  f: [
    { key: 'shockPct', label: 'Regulatory Impact %', tooltip: 'Impact severity on fintech revenue', type: 'percentage' },
    { key: 'dataRevenue', label: 'Data Revenue Reduction', tooltip: 'Data revenue reduction due to regulatory concern', type: 'currency' },
    { key: 'rate1', label: 'Dividend Payout Ratio', tooltip: "Group's share", type: 'percentage' },
    { key: 'rate2', label: 'PAT Payout Rate', tooltip: 'Rate applied to PAT for 2026 payout', type: 'percentage' },
  ],
  g: [
    { key: 'constant1', label: 'BP FX Rate (OPEX denom)', tooltip: 'BP exchange rate for OPEX', type: 'number' },
    { key: 'constant2', label: 'Stressed FX Rate (OPEX)', tooltip: 'Stressed exchange rate (e.g., 22)', type: 'number' },
    { key: 'constant3', label: 'BP FX Rate (COS denom)', tooltip: 'BP exchange rate for COS', type: 'number' },
    { key: 'constant4', label: 'Stressed FX Rate (COS)', tooltip: 'Stressed rate for COS', type: 'number' },
    { key: 'constant5', label: 'BP FX Rate (CAPEX denom)', tooltip: 'BP exchange rate for CAPEX', type: 'number' },
    { key: 'constant6', label: 'Stressed FX Rate (CAPEX)', tooltip: 'Stressed rate for CAPEX', type: 'number' },
    { key: 'constant7', label: 'Useful Life Divisor', tooltip: 'Depreciation period', type: 'number' },
    { key: 'capexPct', label: 'Foreign CAPEX %', tooltip: 'Proportion of CAPEX that is foreign', type: 'percentage' },
    { key: 'rate1', label: 'Dividend Payout Ratio', tooltip: "Group's share", type: 'percentage' },
    { key: 'rate2', label: 'PAT Payout Rate', tooltip: 'Rate applied to PAT', type: 'percentage' },
  ],
  h: [
    { key: 'constant1', label: 'Additional D&A Charge', tooltip: 'Additional D&A from ATC exit', type: 'currency' },
    { key: 'rate1', label: 'Dividend Payout Ratio', tooltip: "Group's share", type: 'percentage' },
    { key: 'rate2', label: 'PAT Payout Rate', tooltip: 'Rate applied to PAT', type: 'percentage' },
  ],
  i: [
    { key: 'transferPricingInterest', label: 'TP Interest (Worse Case)', tooltip: 'Worse-case transfer pricing interest charge', type: 'currency' },
    { key: 'rate1', label: 'Dividend Payout Ratio', tooltip: "Group's share", type: 'percentage' },
    { key: 'rate2', label: 'PAT Payout Rate', tooltip: 'Rate applied to PAT', type: 'percentage' },
  ],
  j: [
    { key: 'rate1', label: 'Dividend Payout Ratio', tooltip: "Group's share", type: 'percentage' },
    { key: 'rate2', label: 'PAT Payout Rate', tooltip: 'Rate applied to PAT', type: 'percentage' },
  ],
  k: [
    { key: 'rate1', label: 'Foreign-Denominated OPEX %', tooltip: 'Proportion NOT inflation-sensitive', type: 'percentage' },
    { key: 'stressPct', label: 'Lower Inflation Multiplier', tooltip: 'e.g., 1.09 for 9% inflation', type: 'number' },
    { key: 'rate2', label: 'Foreign-Denominated COS %', tooltip: 'Foreign COS proportion', type: 'percentage' },
    { key: 'rate3', label: 'Foreign-Denominated CAPEX %', tooltip: 'Foreign CAPEX proportion', type: 'percentage' },
    { key: 'rate4', label: 'Dividend Payout Ratio', tooltip: "Group's share", type: 'percentage' },
    { key: 'payoutRate2', label: 'PAT Payout Rate', tooltip: 'Rate applied to PAT', type: 'percentage' },
  ],
  m: [
    { key: 'constant1', label: 'BP FX Rate (OPEX)', tooltip: 'BP exchange rate for OPEX', type: 'number' },
    { key: 'constant2', label: 'BP FX Rate (COS)', tooltip: 'BP exchange rate for COS', type: 'number' },
    { key: 'constant3', label: 'BP FX Rate (CAPEX)', tooltip: 'BP exchange rate for CAPEX', type: 'number' },
    { key: 'constant4', label: 'Appreciated FX Rate', tooltip: 'Appreciated exchange rate (e.g., 11)', type: 'number' },
    { key: 'capexPct', label: 'Foreign CAPEX %', tooltip: 'Proportion of CAPEX foreign denominated', type: 'percentage' },
    { key: 'rate1', label: 'Dividend Payout Ratio', tooltip: "Group's share", type: 'percentage' },
    { key: 'rate2', label: 'PAT Payout Rate', tooltip: 'Rate applied to PAT', type: 'percentage' },
  ],
};

// ── Category groupings ───────────────────────────────────────────────────────

const GROUPS: { category: 'stress' | 'shock' | 'opportunity'; label: string; icon: typeof ShieldAlert; ids: string[] }[] = [
  { category: 'stress', label: 'Stress Scenarios (70% Weight)', icon: ShieldAlert, ids: ['x', 'y', 'z', 'a', 'b', 'c'] },
  { category: 'shock', label: 'Shock Scenarios (30% Weight)', icon: Zap, ids: ['d', 'e', 'f', 'g', 'h', 'i', 'j'] },
  { category: 'opportunity', label: 'Opportunity Scenarios (100% Weight)', icon: TrendingUp, ids: ['k', 'm'] },
];

const CAT_COLORS = {
  stress: { border: 'border-mtn-yellow/30', bg: 'bg-mtn-yellow/5', text: 'text-mtn-yellow', badge: 'bg-mtn-yellow/10 text-mtn-yellow border-mtn-yellow/30' },
  shock: { border: 'border-red-500/30', bg: 'bg-red-500/5', text: 'text-red-400', badge: 'bg-red-500/10 text-red-400 border-red-500/30' },
  opportunity: { border: 'border-green-500/30', bg: 'bg-green-500/5', text: 'text-green-400', badge: 'bg-green-500/10 text-green-400 border-green-500/30' },
};

// ── Component ────────────────────────────────────────────────────────────────

export function FFScenarioInputs({ value, onChange }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const handleFieldChange = (scenarioId: string, fieldKey: string, fieldValue: number) => {
    const current = (value as unknown as Record<string, Record<string, any>>)[scenarioId];
    onChange({
      ...value,
      [scenarioId]: { ...current, [fieldKey]: fieldValue },
    } as AllScenarioInputs);
  };

  return (
    <div className="space-y-4">
      {GROUPS.map(group => {
        const colors = CAT_COLORS[group.category];
        const Icon = group.icon;

        return (
          <div key={group.category} className={`rounded-xl border ${colors.border} ${colors.bg} overflow-hidden`}>
            {/* Group Header */}
            <div className="p-4 flex items-center gap-2.5">
              <Icon className={`w-4 h-4 ${colors.text}`} />
              <p className={`font-mono text-[10px] uppercase tracking-widest ${colors.text} font-bold`}>
                {group.label}
              </p>
            </div>

            {/* Scenarios */}
            <div className="px-4 pb-4 space-y-2">
              {group.ids.map(id => {
                const meta = SCENARIO_META[id];
                const isOpen = expanded[id] ?? false;
                const fields = SCENARIO_FIELDS[id] ?? [];
                const scenarioData = (value as unknown as Record<string, Record<string, any>>)[id] ?? {};

                return (
                  <div key={id} className="rounded-lg border border-outline/15 bg-[#1A1A1A]/60 overflow-hidden">
                    {/* Scenario Accordion Header */}
                    <button
                      onClick={() => toggle(id)}
                      className="w-full flex items-center gap-2.5 p-3 hover:bg-surface-container-low/30 transition-colors text-left"
                    >
                      {isOpen
                        ? <ChevronDown className="w-3.5 h-3.5 text-on-surface-variant shrink-0" />
                        : <ChevronRight className="w-3.5 h-3.5 text-on-surface-variant shrink-0" />
                      }
                      <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-mono font-bold border ${colors.badge}`}>
                        {id.toUpperCase()}
                      </span>
                      <span className="font-sans text-xs text-on-surface flex-1 truncate">
                        {meta?.label ?? id}
                      </span>
                      <span className="font-mono text-[9px] text-on-surface-variant">
                        {fields.length} params
                      </span>
                    </button>

                    {/* Scenario Fields */}
                    {isOpen && (
                      <div className="px-3 pb-3 border-t border-outline/10">
                        <p className="font-sans text-[10px] text-on-surface-variant mt-2 mb-3 leading-relaxed">
                          {meta?.description}
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                          {fields.map(f => (
                            <div key={f.key}>
                              <label className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant mb-0.5 block" title={f.tooltip}>
                                {f.label}
                              </label>
                              <div className="relative">
                                {f.type === 'currency' && (
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 font-mono text-[9px] text-on-surface-variant/40">GHS M</span>
                                )}
                                <input
                                  type="number"
                                  step={f.type === 'percentage' ? 0.01 : f.type === 'number' ? 1 : 1}
                                  value={scenarioData[f.key] ?? ''}
                                  onChange={e => handleFieldChange(id, f.key, parseFloat(e.target.value) || 0)}
                                  placeholder="0"
                                  className={`w-full rounded border border-outline/20 bg-surface-container-low text-on-surface font-mono text-[11px] py-1.5 pr-2 outline-none focus:border-mtn-yellow/40 transition-colors ${
                                    f.type === 'currency' ? 'pl-8' : 'pl-2'
                                  }`}
                                />
                                {f.type === 'percentage' && (
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[9px] text-on-surface-variant/40">
                                    ratio
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}