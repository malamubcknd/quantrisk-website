'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  Play, CheckCircle, AlertTriangle, Download, Info,
  ShieldAlert, Zap, TrendingUp, BarChart3, TableProperties,
  ChevronDown, ChevronRight, FlaskConical,
} from 'lucide-react';
import { computeAll, computeDerived } from '@/lib/scenarioAutomate/engine';
import type {
  GlobalVariables, 
  AllScenarioInputs, 
  ScenarioAutomateOutput,
  MatrixRow,
  Table1Data,
} from '@/lib/scenarioAutomate/types';
import { SCENARIO_META, MATRIX_ROWS } from '@/lib/scenarioAutomate/types';
import { DEFAULT_GLOBALS, DEFAULT_SCENARIO_INPUTS } from '@/lib/scenarioAutomate/defaults';
import { formatCurrency } from '@/lib/scenarioAutomate/format';

import { FFGlobalInputs } from '@/components/scenarioAutomate/FFGlobalInputs';
import { FFScenarioInputs } from '@/components/scenarioAutomate/FFScenarioInputs';
import { FFDerivedPanel } from '@/components/scenarioAutomate/FFDerivedPanel';
import { FFMatrixTable } from '@/components/scenarioAutomate/FFMatrixTable';
import { FFWaterfallChart } from '@/components/scenarioAutomate/FFWaterfallChart';
import { FFStackedBarChart } from '@/components/scenarioAutomate/FFStackedBarChart';

// ── Section Divider ──────────────────────────────────────────────────────────

function SectionDivider({ label, icon: Icon }: { label: string; icon?: typeof ShieldAlert }) {
  return (
    <div className="flex items-center gap-3">
      {Icon && <Icon className="w-3.5 h-3.5 text-on-surface-variant" />}
      <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant whitespace-nowrap">
        {label}
      </p>
      <div className="flex-1 h-px bg-outline/15" />
    </div>
  );
}

// ── Step Badge ───────────────────────────────────────────────────────────────

function StepBadge({ step, label }: { step: number; label: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-mtn-yellow text-black font-mono text-xs font-bold">
        {step}
      </div>
      <p className="font-sans text-lg font-bold text-on-surface">{label}</p>
    </div>
  );
}

// ── Results Summary Banner ───────────────────────────────────────────────────

function ResultsBanner({ output }: { output: ScenarioAutomateOutput }) {
  const base = output.table1.baseCase;
  const stressKeys = ['x', 'y', 'z', 'a', 'b', 'c'] as const;
  const shockKeys = ['d', 'e', 'f', 'g', 'h', 'i', 'j'] as const;
  const oppKeys = ['k', 'm'] as const;

  const totalStressRevImpact = stressKeys.reduce((s, k) => s + ((output.table2 as unknown as Record<string, MatrixRow>)[k]?.revenue ?? 0), 0);
  const totalShockRevImpact = shockKeys.reduce((s, k) => s + ((output.table2 as unknown as Record<string, MatrixRow>)[k]?.revenue ?? 0), 0);
  const totalOppEbitdaImpact = oppKeys.reduce((s, k) => s + ((output.table2 as unknown as Record<string, MatrixRow>)[k]?.ebitda ?? 0), 0);

  const table3Final = output.table3[output.table3.length - 1]?.value ?? 0;
  const table4Final = output.table4[output.table4.length - 1]?.value ?? 0;

  return (
    <div className="space-y-4">
      {/* Narrative */}
      <div className="rounded-xl border border-outline/20 bg-surface-container-low p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-mtn-yellow/10 shrink-0">
            <FlaskConical className="w-5 h-5 text-mtn-yellow" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-sans text-sm font-semibold text-on-surface mb-1">
              Scenario Automation — Computation Complete
            </p>
            <p className="font-sans text-xs text-on-surface-variant leading-relaxed">
              All <strong className="text-on-surface">15 scenarios</strong> have been computed across{' '}
              <strong className="text-on-surface">7 financial metrics</strong>.
              6 tables and 5 charts are ready for review.
              Stress-adjusted PAT lands at <strong className={table3Final < base.pat ? 'text-red-400' : 'text-green-400'}>{formatCurrency(table3Final)}</strong>,
              while shock-adjusted PAT is <strong className={table4Final < base.pat ? 'text-red-400' : 'text-green-400'}>{formatCurrency(table4Final)}</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-mtn-yellow/30 bg-mtn-yellow/5 p-3 text-center">
          <ShieldAlert className="w-4 h-4 text-mtn-yellow mx-auto mb-1" />
          <p className="font-mono text-lg font-bold text-mtn-yellow">{formatCurrency(totalStressRevImpact)}</p>
          <p className="font-mono text-[8px] uppercase tracking-widest text-mtn-yellow mt-0.5">Stress Revenue Impact</p>
        </div>
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-center">
          <Zap className="w-4 h-4 text-red-400 mx-auto mb-1" />
          <p className="font-mono text-lg font-bold text-red-400">{formatCurrency(totalShockRevImpact)}</p>
          <p className="font-mono text-[8px] uppercase tracking-widest text-red-400 mt-0.5">Shock Revenue Impact</p>
        </div>
        <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-3 text-center">
          <TrendingUp className="w-4 h-4 text-green-400 mx-auto mb-1" />
          <p className="font-mono text-lg font-bold text-green-400">{formatCurrency(totalOppEbitdaImpact)}</p>
          <p className="font-mono text-[8px] uppercase tracking-widest text-green-400 mt-0.5">Opportunity EBITDA Upside</p>
        </div>
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-3 text-center">
          <BarChart3 className="w-4 h-4 text-blue-400 mx-auto mb-1" />
          <p className="font-mono text-lg font-bold text-blue-400">{formatCurrency(base.ebitda)}</p>
          <p className="font-mono text-[8px] uppercase tracking-widest text-blue-400 mt-0.5">Base Case EBITDA</p>
        </div>
      </div>
    </div>
  );
}

// ── Tab Button ───────────────────────────────────────────────────────────────

type OutputTab = 'tables' | 'waterfalls' | 'stacked';

function TabButton({ active, label, icon: Icon, onClick }: { active: boolean; label: string; icon: typeof TableProperties; onClick: () => void }) {
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

// ── Main Page ────────────────────────────────────────────────────────────────

export default function ScenarioAutomatePage() {
  const [globals, setGlobals] = useState<GlobalVariables>(DEFAULT_GLOBALS);
  const [scenarioInputs, setScenarioInputs] = useState<AllScenarioInputs>(DEFAULT_SCENARIO_INPUTS);
  const [output, setOutput] = useState<ScenarioAutomateOutput | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calcSuccess, setCalcSuccess] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<OutputTab>('tables');
  const [inputsCollapsed, setInputsCollapsed] = useState(false);

  const derived = useMemo(() => computeDerived(globals), [globals]);

  const handleCalculate = useCallback(() => {
    setIsCalculating(true);
    setCalcSuccess(false);
    setCalcError(null);

    requestAnimationFrame(() => {
      setTimeout(() => {
        try {
          const result = computeAll(globals, scenarioInputs);
          setOutput(result);
          setCalcSuccess(true);
          setInputsCollapsed(true);
          setTimeout(() => setCalcSuccess(false), 2500);
        } catch (err) {
          console.error(err);
          setCalcError('Calculation failed. Please verify all inputs.');
        } finally {
          setIsCalculating(false);
        }
      }, 100);
    });
  }, [globals, scenarioInputs]);

  const handleExportCSV = useCallback(() => {
    if (!output) return;

    const headers = ['Metric', 'Base Case', ...Object.keys(output.table1).filter(k => k !== 'baseCase').map(k => SCENARIO_META[k]?.shortLabel ?? k)];
    const rows = MATRIX_ROWS.map(({ key, label }) => {
      const vals = Object.entries(output.table1)
        .filter(([k]) => k !== 'baseCase' || true)
        .map(([, row]) => (row as MatrixRow)[key].toFixed(2));
      return [label, ...vals];
    });

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scenario_automate_output.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [output]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="relative rounded-xl border border-outline/20 bg-[#1A1A1A] p-6 overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-mtn-yellow rounded-l-xl" />
        <div className="ml-3">
          <div className="flex items-center gap-2.5 mb-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-mtn-yellow/30 bg-mtn-yellow/10 font-mono text-[9px] uppercase tracking-widest text-mtn-yellow">
              <ShieldAlert className="w-3 h-3" />
              Stress Testing
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-red-500/30 bg-red-500/10 font-mono text-[9px] uppercase tracking-widest text-red-400">
              <Zap className="w-3 h-3" />
              Shock Analysis
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-green-500/30 bg-green-500/10 font-mono text-[9px] uppercase tracking-widest text-green-400">
              <TrendingUp className="w-3 h-3" />
              Opportunities
            </span>
          </div>
          <h1 className="text-2xl font-hero font-bold text-on-surface leading-snug">
            Stress & Shock Automation
          </h1>
            <p className="mt-1 text-sm text-on-surface-variant font-sans">
            Comprehensive Stress, Shock & Opportunity Scenario Testing — 15 scenarios across 7 financial metrics.
            All values are in <strong className="text-on-surface">GHS Millions</strong> (e.g. 59.78 = GHS 59.78M).
            Enter your base case variables, configure each scenario, and generate publication-ready tables and charts.
            </p>
        </div>
      </div>

      {/* ── Inputs Section ──────────────────────────────────────────────── */}
      <div className="space-y-5">
        {output && (
          <button
            onClick={() => setInputsCollapsed(c => !c)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-outline/20 text-on-surface-variant hover:text-on-surface hover:border-outline/40 transition-colors font-mono text-[10px] uppercase tracking-widest"
          >
            {inputsCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {inputsCollapsed ? 'Show Inputs' : 'Collapse Inputs'}
          </button>
        )}

        {!inputsCollapsed && (
          <>
            {/* Step 1: Global Variables */}
            <StepBadge step={1} label="Global & Base Case Variables" />
            <FFGlobalInputs value={globals} onChange={setGlobals} />

            {/* Derived metrics preview */}
            <FFDerivedPanel derived={derived} />

            {/* Step 2: Scenario-Specific Variables */}
            <StepBadge step={2} label="Scenario-Specific Variables" />
            <FFScenarioInputs value={scenarioInputs} onChange={setScenarioInputs} />
          </>
        )}

        {/* Step 3: Execute */}
        <StepBadge step={3} label="Calculate" />
        <button
          onClick={handleCalculate}
          disabled={isCalculating}
          className={`w-full py-4 rounded-xl font-mono font-bold text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed ${
            calcSuccess
              ? 'bg-green-500 text-black shadow-[0_0_12px_rgba(34,197,94,0.4)]'
              : calcError
                ? 'bg-error text-white'
                : 'bg-mtn-yellow text-black hover:bg-mtn-yellow/90'
          }`}
        >
          {isCalculating ? (
            <>
              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              Computing All Scenarios…
            </>
          ) : calcSuccess ? (
            <><CheckCircle className="w-4 h-4" /> Computation Complete</>
          ) : calcError ? (
            'Calculation Failed — Click to Retry'
          ) : (
            <><Play className="w-4 h-4 fill-black" /> Calculate All Scenarios</>
          )}
        </button>

        {calcError && (
          <div className="rounded-lg bg-error/10 border border-error/30 p-3 flex gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-error shrink-0 mt-0.5" />
            <p className="font-sans text-xs text-error">{calcError}</p>
          </div>
        )}
      </div>

      {/* ── Results Section ─────────────────────────────────────────────── */}
      {output && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <SectionDivider label="Results" icon={BarChart3} />

          <ResultsBanner output={output} />

          {/* Output Tab Navigation */}
          <div className="flex items-center gap-2 flex-wrap">
            <TabButton active={activeTab === 'tables'} label="Tables" icon={TableProperties} onClick={() => setActiveTab('tables')} />
            <TabButton active={activeTab === 'waterfalls'} label="Waterfall Charts" icon={BarChart3} onClick={() => setActiveTab('waterfalls')} />
            <TabButton active={activeTab === 'stacked'} label="Impact Overview" icon={BarChart3} onClick={() => setActiveTab('stacked')} />

            <div className="ml-auto">
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[10px] uppercase tracking-widest border border-outline/20 text-on-surface-variant hover:text-on-surface hover:border-outline/40 transition-colors"
              >
                <Download className="w-3 h-3" /> Export CSV
              </button>
            </div>
          </div>

          {/* ── Tables Tab ── */}
          {activeTab === 'tables' && (
            <div className="space-y-5">
              <FFMatrixTable
                title="Full Scenario Matrix"
                subtitle="Table 1"
                data={output.table1}
                showBaseCase
              />
              <FFMatrixTable
                title="Weighted Impact Matrix"
                subtitle="Table 2"
                data={output.table2 as unknown as Table1Data}
                showBaseCase={false}
              />
            </div>
          )}

          {/* ── Waterfall Charts Tab ── */}
          {activeTab === 'waterfalls' && (
            <div className="space-y-6">
              <FFWaterfallChart
                title="Chart 1 — Stress Scenario Waterfall (Table 3)"
                data={output.table3}
              />
              <FFWaterfallChart
                title="Chart 2 — Shock Scenario Waterfall (Table 4)"
                data={output.table4}
              />
              <FFWaterfallChart
                title="Chart 3 — Opportunities Standalone (Table 5)"
                data={output.table5}
              />
              <FFWaterfallChart
                title="Chart 4 — Opportunities with Stress (Table 6)"
                data={output.table6}
              />
            </div>
          )}

          {/* ── Stacked Bar Chart Tab ── */}
          {activeTab === 'stacked' && (
            <FFStackedBarChart data={output.table1} />
          )}

          {/* Reading guide */}
          <div className="rounded-xl border border-outline/10 bg-surface-container-low/50 p-4 flex gap-3">
            <Info className="w-4 h-4 text-on-surface-variant shrink-0 mt-0.5" />
            <p className="font-sans text-[10px] text-on-surface-variant leading-relaxed">
              <strong className="text-on-surface">Reading this report:</strong>{' '}
              <strong>Table 1</strong> shows absolute metric values for each scenario.{' '}
              <strong>Table 2</strong> applies probability weights (Stress ×0.7, Shock ×0.3, Opportunity ×1.0) to show the probability-weighted delta from the base case.{' '}
              The <strong>waterfall charts</strong> show how base case values are progressively impacted through Revenue → EBITDA → PAT stages.{' '}
              The <strong>stacked bar chart</strong> aggregates all weighted scenario impacts for a single-view comparison across all 7 metrics.{' '}
              All charts are ready to screenshot for PowerPoint reporting. Use <strong>Export CSV</strong> for raw data.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}