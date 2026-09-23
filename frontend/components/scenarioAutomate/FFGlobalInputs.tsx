// frontend/components/scenarioAutomate/FFGlobalInputs.tsx

'use client';

import type { GlobalVariables } from '@/lib/scenarioAutomate/types';
import { Info } from 'lucide-react';

interface Props {
  value: GlobalVariables;
  onChange: (v: GlobalVariables) => void;
}

interface FieldDef {
  key: keyof GlobalVariables;
  label: string;
  tooltip: string;
  type: 'currency' | 'percentage';
}

const FIELDS: FieldDef[] = [
  { key: 'revenue', label: 'Revenue', tooltip: 'Total revenue from the 2026 Ghana Business Plan', type: 'currency' },
  { key: 'costOfSales', label: 'Cost of Sales', tooltip: 'Direct costs attributable to producing services sold', type: 'currency' },
  { key: 'otherIncome', label: 'Other Income', tooltip: 'Income from non-core activities', type: 'currency' },
  { key: 'opex', label: 'OPEX', tooltip: 'Total operating expenditure', type: 'currency' },
  { key: 'capex', label: 'CAPEX', tooltip: 'Capital expenditure', type: 'currency' },
  { key: 'depreciationAmortizationGoodwillImpairment', label: 'D&A / Goodwill / Impairment', tooltip: 'Non-cash charges for wear and tear, intangible write-downs, impairments', type: 'currency' },
  { key: 'financeCost', label: 'Finance Cost', tooltip: 'Interest and fees on borrowed money', type: 'currency' },
  { key: 'taxation', label: 'Taxation', tooltip: 'Tax payable on profits', type: 'currency' },
  { key: 'payout2025', label: '2025 Payout', tooltip: 'Dividend payout from prior year carried forward', type: 'currency' },
  { key: 'payout2026', label: '2026 Payout', tooltip: 'Planned dividend payout for 2026', type: 'currency' },
  { key: 'managementFees', label: 'Management Fees', tooltip: 'Fees paid to parent group for management services', type: 'currency' },
  { key: 'groupDividendPayoutPortion', label: 'Group Dividend Payout Portion', tooltip: "Group's share of total dividends paid upstream", type: 'currency' },
  { key: 'gbpManagementFeesPct', label: 'GBP Management Fees %', tooltip: 'Management fees as a percentage of revenue', type: 'percentage' },
  { key: 'dataRevenue', label: 'Data Revenue', tooltip: 'Revenue from data services', type: 'currency' },
  { key: 'fintechRevenue', label: 'Fintech Revenue', tooltip: 'Revenue from mobile money and fintech services', type: 'currency' },
  { key: 'gbpOpex', label: 'GBP OPEX (Local)', tooltip: 'Locally-denominated portion of operating expenditure', type: 'currency' },
  { key: 'gbpCos', label: 'GBP COS (Local)', tooltip: 'Locally-denominated portion of cost of sales', type: 'currency' },
  { key: 'ggOpex', label: 'GG OPEX (Foreign)', tooltip: 'Foreign currency portion of operating expenditure', type: 'currency' },
  { key: 'ggCos', label: 'GG COS (Foreign)', tooltip: 'Foreign currency portion of cost of sales', type: 'currency' },
  { key: 'ggCapex', label: 'GG CAPEX (Foreign)', tooltip: 'Foreign currency portion of capital expenditure', type: 'currency' },
  { key: 'ggRevenue', label: 'GG Revenue (Foreign)', tooltip: 'Group Guidance portion of revenue', type: 'currency' },
  { key: 'gbpCapex', label: 'GBP CAPEX (Local)', tooltip: 'Local portion of capex', type: 'currency' },
];

function InputField({ field, value, onChange }: { field: FieldDef; value: number; onChange: (v: number) => void }) {
  return (
    <div className="group">
      <div className="flex items-center gap-1.5 mb-1">
        <label className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant">
          {field.label}
        </label>
        <div className="relative">
          <Info className="w-3 h-3 text-on-surface-variant/50 cursor-help" />
          <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block z-20 w-48 p-2 rounded-lg bg-surface-container border border-outline/20 text-[10px] text-on-surface-variant font-sans">
            {field.tooltip}
          </div>
        </div>
      </div>
      <div className="relative">
        {field.type === 'currency' && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-on-surface-variant/50">
            GHS M
        </span>
        )}
        <input
          type="number"
          value={value || ''}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          placeholder="0"
          className={`w-full rounded-lg border border-outline/20 bg-surface-container-low text-on-surface font-mono text-xs py-2 pr-3 outline-none focus:border-mtn-yellow/50 focus:ring-1 focus:ring-mtn-yellow/20 transition-colors ${
            field.type === 'currency' ? 'pl-10' : 'pl-3'
          }`}
        />
        {field.type === 'percentage' && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-on-surface-variant/50">
            %
          </span>
        )}
      </div>
    </div>
  );
}

export function FFGlobalInputs({ value, onChange }: Props) {
  const handleChange = (key: keyof GlobalVariables, v: number) => {
    onChange({ ...value, [key]: v });
  };

  return (
    <div className="rounded-xl border border-outline/20 bg-[#1A1A1A] p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-1 h-6 bg-mtn-yellow rounded-full" />
        <div>
          <p className="font-mono text-[9px] uppercase tracking-widest text-mtn-yellow">Stage A</p>
          <p className="font-sans text-sm font-bold text-on-surface">Global & Base Case Variables</p>
        </div>
      </div>
      <p className="font-sans text-[11px] text-on-surface-variant mb-4 leading-relaxed">
        These variables feed into ALL scenarios. Enter them once here — they form the 2026 Ghana Business Plan base case.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {FIELDS.map(f => (
          <InputField
            key={f.key}
            field={f}
            value={value[f.key]}
            onChange={v => handleChange(f.key, v)}
          />
        ))}
      </div>
    </div>
  );
}