'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Plus, FolderOpen, Trash2, Copy, Calendar, ChevronRight,
  FileText, FlaskConical, Clock, Archive, Info, X,
  ChevronDown, ChevronUp, Variable, FunctionSquare,
  ShieldAlert, Zap, TrendingUp, Settings2, Play,
  Save, Download, Eye, HelpCircle,
} from 'lucide-react';
import {
  listConfigs, createConfig, deleteConfig, duplicateConfig,
  type ConfigSummary,
} from '@/lib/scenarioBuilder';
import { ScenarioBuilderEditor } from '../../../components/scenarioBuilder/ScenarioBuilderEditor';

type View = 'list' | 'create' | 'edit';

// ── Help Guide Panel ──────────────────────────────────────────────────────

function HelpSection({ title, icon: Icon, children, defaultOpen = false }: {
  title: string; icon: typeof Info; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-outline/10 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 py-3 text-left hover:bg-surface-container/50 transition-colors px-1 rounded"
      >
        <Icon className="w-3.5 h-3.5 text-mtn-yellow shrink-0" />
        <span className="font-sans text-xs font-semibold text-on-surface flex-1">{title}</span>
        {open ? <ChevronUp className="w-3 h-3 text-on-surface-variant" /> : <ChevronDown className="w-3 h-3 text-on-surface-variant" />}
      </button>
      {open && (
        <div className="pb-4 px-1 text-[11px] text-on-surface-variant leading-relaxed space-y-2">
          {children}
        </div>
      )}
    </div>
  );
}

function GuideTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="rounded-lg border border-outline/15 overflow-hidden my-2">
      <table className="w-full text-[10px]">
        <thead>
          <tr className="bg-surface-container">
            {headers.map((h, i) => (
              <th key={i} className="px-2.5 py-1.5 text-left font-mono text-[9px] uppercase tracking-wider text-on-surface-variant font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-outline/10">
              {row.map((cell, j) => (
                <td key={j} className={`px-2.5 py-1.5 ${j === 0 ? 'font-mono text-mtn-yellow' : 'text-on-surface-variant'}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-surface-container p-2.5 font-mono text-[10px] space-y-0.5 my-2">
      {children}
    </div>
  );
}

function QA({ q, a }: { q: string; a: string }) {
  return (
    <div className="mb-2">
      <p className="font-semibold text-on-surface text-[11px]">{q}</p>
      <p className="text-on-surface-variant text-[11px] mt-0.5">{a}</p>
    </div>
  );
}

function HelpGuide({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-lg bg-[#1A1A1A] border-l border-outline/20 h-full overflow-y-auto animate-in slide-in-from-right duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#1A1A1A] border-b border-outline/20 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-mtn-yellow" />
            <h2 className="font-sans text-sm font-bold text-on-surface">Scenario Builder — User Guide</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-1">

          {/* ── What is this ── */}
          <HelpSection title="What is this?" icon={FlaskConical} defaultOpen>
            <p>
              Scenario Builder lets you create stress tests, shock analyses, and opportunity models
              <strong className="text-on-surface"> from scratch</strong> every year. You define your own numbers,
              your own formulas, and your own scenarios. Nothing is hardcoded. You&apos;re in full control.
            </p>
          </HelpSection>

          {/* ── Getting Started ── */}
          <HelpSection title="Getting Started" icon={Play} defaultOpen>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Click <strong className="text-on-surface">Scenario Builder</strong> in the left sidebar (under Advanced Modeling).</li>
              <li>You&apos;ll see a list of your saved configurations. If this is your first time, it will be empty.</li>
              <li>Click the yellow <strong className="text-mtn-yellow">&quot;New Scenario Configuration&quot;</strong> button.</li>
            </ol>
          </HelpSection>

          {/* ── The 5 Steps ── */}
          <HelpSection title="The 5 Steps (Overview)" icon={Settings2}>
            <p>You&apos;ll see 5 step buttons at the top of the editor. Click any step to jump to it. Green checkmarks mean a step is complete.</p>
          </HelpSection>

          {/* ── Step 1 ── */}
          <HelpSection title="Step 1 — Define Your Variables" icon={Variable}>
            <p>These are your raw input numbers — the base case figures you already know.</p>
            <p className="font-semibold text-on-surface">What to do:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Click <strong className="text-mtn-yellow">&quot;+ Add Variable&quot;</strong> as many times as you need.</li>
              <li>For each variable, fill in:
                <ul className="list-disc pl-4 mt-1 space-y-0.5">
                  <li><strong className="text-on-surface">Name</strong> — e.g. <code className="text-mtn-yellow">revenue</code>, <code className="text-mtn-yellow">opex</code>, <code className="text-mtn-yellow">depreciation</code>, <code className="text-mtn-yellow">tax_rate</code></li>
                  <li><strong className="text-on-surface">Value</strong> — the number, e.g. <code className="text-mtn-yellow">500</code> (this means GHS 500M)</li>
                  <li><strong className="text-on-surface">Description</strong> — optional, just a note for yourself</li>
                </ul>
              </li>
            </ul>
            <p className="font-semibold text-on-surface mt-2">Example:</p>
            <GuideTable
              headers={['Name', 'Value', 'Description']}
              rows={[
                ['revenue', '500', 'Total revenue'],
                ['opex', '200', 'Operating expenses'],
                ['depreciation', '50', 'Annual depreciation'],
                ['interest', '30', 'Interest expense'],
                ['tax_rate', '0.25', 'Corporate tax rate'],
              ]}
            />
            <div className="rounded-lg bg-mtn-yellow/5 border border-mtn-yellow/20 p-2.5 mt-2">
              <p className="text-[10px] text-mtn-yellow">
                <strong>Tip:</strong> Variable names are not case-sensitive. <code>Revenue</code>, <code>revenue</code>, and <code>REVENUE</code> all work the same. Spaces become underscores automatically.
              </p>
            </div>
          </HelpSection>

          {/* ── Step 2 ── */}
          <HelpSection title="Step 2 — Define Derived Metrics" icon={FunctionSquare}>
            <p>These are the calculations you want the system to compute from your variables.</p>
            <p className="font-semibold text-on-surface">What to do:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Click <strong className="text-mtn-yellow">&quot;+ Add Derived Metric&quot;</strong>.</li>
              <li>Fill in:
                <ul className="list-disc pl-4 mt-1 space-y-0.5">
                  <li><strong className="text-on-surface">Metric name</strong> — e.g. <code className="text-mtn-yellow">ebitda</code>, <code className="text-mtn-yellow">pat</code>, <code className="text-mtn-yellow">ebitda_margin</code></li>
                  <li><strong className="text-on-surface">Formula</strong> — type it like a calculator, using your variable names</li>
                </ul>
              </li>
            </ul>
            <p className="mt-2">
              <strong className="text-on-surface">Supported math:</strong>{' '}
              <code className="text-mtn-yellow">+ - * / ^ ()</code> and functions{' '}
              <code className="text-mtn-yellow">abs() min() max() sqrt() round()</code>
            </p>
            <p className="font-semibold text-on-surface mt-2">Example:</p>
            <GuideTable
              headers={['Metric Name', 'Formula']}
              rows={[
                ['ebitda', 'revenue - opex - depreciation'],
                ['pbt', 'ebitda - interest'],
                ['pat', 'pbt - (pbt * tax_rate)'],
                ['ebitda_margin', 'ebitda / revenue'],
              ]}
            />
            <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-2.5 mt-2 space-y-1">
              <p className="text-[10px] text-blue-400">
                <strong>Order matters.</strong> If <code>pat</code> uses <code>pbt</code>, make sure <code>pbt</code> is listed above <code>pat</code>. Each formula can reference any variable from Step 1 and any derived metric listed above it.
              </p>
              <p className="text-[10px] text-blue-400">
                <strong>Live preview:</strong> As you type, you&apos;ll see green boxes showing the computed values. If a formula has an error, you&apos;ll see a red message telling you exactly what&apos;s wrong.
              </p>
            </div>
          </HelpSection>

          {/* ── Step 3 ── */}
          <HelpSection title="Step 3 — Define Scenarios" icon={ShieldAlert}>
            <p>This is where you model &quot;what if&quot; situations.</p>
            <p className="font-semibold text-on-surface">What to do:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Click the buttons to add scenarios:
                <ul className="list-none pl-4 mt-1 space-y-1">
                  <li className="flex items-center gap-1.5">
                    <ShieldAlert className="w-3 h-3 text-mtn-yellow" />
                    <span><strong className="text-mtn-yellow">&quot;+ Stress Scenario&quot;</strong> — negative situations (revenue drops, cost increases)</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Zap className="w-3 h-3 text-red-400" />
                    <span><strong className="text-red-400">&quot;+ Shock Scenario&quot;</strong> — sudden severe events (rate spikes, currency crashes)</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <TrendingUp className="w-3 h-3 text-green-400" />
                    <span><strong className="text-green-400">&quot;+ Opportunity Scenario&quot;</strong> — positive situations (new markets, cost savings)</span>
                  </li>
                </ul>
              </li>
              <li>You can add as many as you want. <strong className="text-on-surface">No limit.</strong></li>
            </ul>

            <p className="font-semibold text-on-surface mt-3">For each scenario:</p>
            <ol className="list-decimal pl-4 space-y-1">
              <li><strong className="text-on-surface">Name it</strong> — e.g. &quot;Revenue Drop 20%&quot;, &quot;Interest Rate Spike&quot;, &quot;New Market Entry&quot;</li>
              <li><strong className="text-on-surface">Set the type</strong> — Stress, Shock, or Opportunity (dropdown)</li>
              <li><strong className="text-on-surface">Override variables</strong> — click &quot;+ Override&quot; and pick which base case variables change, then enter the new value</li>
              <li><strong className="text-on-surface">Add extra calculations</strong> (optional) — click &quot;+ Calculation&quot; if this scenario needs its own unique formulas beyond Step 2</li>
            </ol>

            <p className="font-semibold text-on-surface mt-3">Examples:</p>
            <div className="space-y-2 mt-1">
              <div className="rounded-lg bg-mtn-yellow/5 border border-mtn-yellow/20 p-2.5">
                <p className="text-[10px] text-mtn-yellow font-semibold mb-1">&quot;Revenue Drop 20%&quot; (Stress)</p>
                <p className="text-[10px] text-on-surface-variant">Override: <code className="text-mtn-yellow">revenue</code> = <code className="text-mtn-yellow">400</code> (instead of 500). That&apos;s it. All Step 2 formulas recalculate automatically.</p>
              </div>
              <div className="rounded-lg bg-red-500/5 border border-red-500/20 p-2.5">
                <p className="text-[10px] text-red-400 font-semibold mb-1">&quot;Interest Rate Spike&quot; (Shock)</p>
                <p className="text-[10px] text-on-surface-variant">Override: <code className="text-red-400">interest</code> = <code className="text-red-400">60</code> (instead of 30).</p>
              </div>
              <div className="rounded-lg bg-green-500/5 border border-green-500/20 p-2.5">
                <p className="text-[10px] text-green-400 font-semibold mb-1">&quot;New Market Entry&quot; (Opportunity)</p>
                <p className="text-[10px] text-on-surface-variant">Override: <code className="text-green-400">revenue</code> = <code className="text-green-400">650</code>. Extra calculation: <code className="text-green-400">new_market_cost</code> = <code className="text-green-400">revenue * 0.05</code></p>
              </div>
            </div>
          </HelpSection>

          {/* ── Step 4 ── */}
          <HelpSection title="Step 4 — Configure Output Tables" icon={Settings2}>
            <p>Choose what appears in your final report.</p>

            <p className="font-semibold text-on-surface mt-2">Table Metrics:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>Click the metric names to select which ones show in your tables.</li>
              <li>Click <strong className="text-mtn-yellow">&quot;Select All&quot;</strong> to include everything.</li>
            </ul>

            <p className="font-semibold text-on-surface mt-2">Waterfall Chart Metrics:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>Click the metrics you want in the waterfall charts (the cascading bar charts).</li>
              <li>The order you click them determines the cascade order (e.g. Revenue → EBITDA → PAT).</li>
            </ul>

            <p className="font-semibold text-on-surface mt-2">Probability Weights:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>Set the weight for each scenario type. Used in Table 2 for probability-adjusted impacts.</li>
              <li>Default: Stress = 0.7, Shock = 0.3, Opportunity = 1.0</li>
              <li>Change them to whatever your risk framework requires.</li>
            </ul>
          </HelpSection>

          {/* ── Step 5 ── */}
          <HelpSection title="Step 5 — Calculate" icon={Play}>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Review the summary — it shows how many variables, metrics, and scenarios you&apos;ve defined.</li>
              <li>Fix any yellow warnings if steps are incomplete.</li>
              <li>Click the big yellow <strong className="text-mtn-yellow">&quot;Save & Calculate All Scenarios&quot;</strong> button.</li>
            </ol>
            <p className="font-semibold text-on-surface mt-2">The system will:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>Save your configuration to the database</li>
              <li>Run all calculations for every scenario</li>
              <li>Create a versioned snapshot for audit tracking</li>
              <li>Show you the results</li>
            </ul>
          </HelpSection>

          {/* ── Reading Results ── */}
          <HelpSection title="Reading Your Results" icon={FileText}>
            <p>After calculation, you&apos;ll see three tabs:</p>

            <p className="font-semibold text-on-surface mt-2">Table 1 — Absolute Matrix</p>
            <p>Shows the actual value of each metric under each scenario. <span className="text-green-400">Green</span> means better than base case, <span className="text-red-400">red</span> means worse.</p>

            <p className="font-semibold text-on-surface mt-2">Table 2 — Weighted Impact</p>
            <p>Shows the <strong className="text-on-surface">change from base case</strong>, multiplied by the probability weight. This tells you the risk-adjusted impact of each scenario. The small text under each number shows the raw delta and the weight used.</p>

            <p className="font-semibold text-on-surface mt-2">Waterfalls</p>
            <p>Bar charts showing how the base case value cascades through each impact.</p>
            <ul className="list-none pl-2 space-y-0.5 mt-1">
              <li><span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-500 mr-1.5 align-middle" /> Blue = starting value</li>
              <li><span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-500 mr-1.5 align-middle" /> Red = negative impact</li>
              <li><span className="inline-block w-2.5 h-2.5 rounded-sm bg-green-500 mr-1.5 align-middle" /> Green = positive impact</li>
              <li><span className="inline-block w-2.5 h-2.5 rounded-sm bg-mtn-yellow mr-1.5 align-middle" /> Yellow = final adjusted value</li>
            </ul>
          </HelpSection>

          {/* ── Other Things ── */}
          <HelpSection title="Other Things You Can Do" icon={HelpCircle}>
            <div className="space-y-3">
              <div>
                <p className="font-semibold text-on-surface flex items-center gap-1.5">
                  <Save className="w-3 h-3 text-mtn-yellow" /> Save Drafts
                </p>
                <p>Click &quot;Save Draft&quot; at the top anytime. Your work is saved to the database. You can come back later and continue.</p>
              </div>
              <div>
                <p className="font-semibold text-on-surface flex items-center gap-1.5">
                  <Download className="w-3 h-3 text-mtn-yellow" /> Export to CSV
                </p>
                <p>Click the &quot;CSV&quot; button on the results page to download all table data as a spreadsheet-ready file.</p>
              </div>
              <div>
                <p className="font-semibold text-on-surface flex items-center gap-1.5">
                  <Eye className="w-3 h-3 text-mtn-yellow" /> View Past Results
                </p>
                <p>If you&apos;ve already calculated a configuration, you&apos;ll see a green &quot;View Results&quot; button. Click it anytime to see the last computation.</p>
              </div>
              <div>
                <p className="font-semibold text-on-surface flex items-center gap-1.5">
                  <Copy className="w-3 h-3 text-mtn-yellow" /> Duplicate for Next Year
                </p>
                <p>On the main list page, click the copy icon (two squares) next to any configuration. This creates a copy for the next year so you don&apos;t have to start from scratch. Just update the numbers.</p>
              </div>
              <div>
                <p className="font-semibold text-on-surface flex items-center gap-1.5">
                  <Trash2 className="w-3 h-3 text-red-400" /> Delete
                </p>
                <p>Click the trash icon to remove a configuration. This also deletes all its snapshots. <strong className="text-red-400">This cannot be undone.</strong></p>
              </div>
              <div>
                <p className="font-semibold text-on-surface flex items-center gap-1.5">
                  <Archive className="w-3 h-3 text-mtn-yellow" /> Version History
                </p>
                <p>Every time you click &quot;Calculate,&quot; a snapshot is saved. You can see the snapshot count on the main list page. Snapshots preserve the exact inputs and outputs at the time of calculation, so you always have an audit trail.</p>
              </div>
            </div>
          </HelpSection>

          {/* ── Formula Reference ── */}
          <HelpSection title="Quick Reference — Formula Syntax" icon={FunctionSquare}>
            <GuideTable
              headers={['What you type', 'What it does']}
              rows={[
                ['revenue - opex', 'Subtraction'],
                ['revenue * 0.25', 'Multiplication'],
                ['pbt / revenue', 'Division'],
                ['revenue ^ 2', 'Power'],
                ['(revenue - opex) * 0.5', 'Parentheses for grouping'],
                ['abs(pbt)', 'Absolute value'],
                ['min(revenue, 500)', 'Smaller of the two'],
                ['max(revenue, 500)', 'Larger of the two'],
                ['sqrt(revenue)', 'Square root'],
                ['round(ebitda_margin, 4)', 'Round to 4 decimal places'],
              ]}
            />
          </HelpSection>

          {/* ── FAQ ── */}
          <HelpSection title="Common Questions" icon={HelpCircle}>
            <QA
              q="Q: Can I change the number of scenarios each year?"
              a="Yes. Add or remove as many as you need. There is no limit."
            />
            <QA
              q="Q: Do I have to use the same formulas every year?"
              a="No. Every configuration is independent. Change formulas, add new ones, remove old ones — whatever you need."
            />
            <QA
              q="Q: What if I make a mistake?"
              a="Edit the configuration and click 'Save & Calculate' again. A new snapshot is created. Old snapshots are preserved."
            />
            <QA
              q="Q: Are my numbers saved?"
              a="Yes. Everything is stored in the database — your variables, formulas, scenarios, and all computed results."
            />
            <QA
              q="Q: Can multiple people use this?"
              a="Yes. Each configuration is saved separately. Use descriptive names like 'FY2025 Board Stress Test' so your team knows what each one is."
            />
            <QA
              q="Q: What units should I use?"
              a="Whatever you want. The default label is 'GHS M' (Ghana Cedis Millions), but you can change it in the top bar. The system doesn't care about units — it just calculates numbers."
            />
          </HelpSection>

          <div className="pt-4 pb-6">
            <p className="text-[10px] text-on-surface-variant/50 text-center">
              All data is saved to the database. You can always come back and edit.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function ScenarioBuilderPage() {
  const [view, setView] = useState<View>('list');
  const [configs, setConfigs] = useState<ConfigSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const loadConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listConfigs();
      setConfigs(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConfigs(); }, [loadConfigs]);

  const handleNewConfig = useCallback(async () => {
    try {
      const year = new Date().getFullYear();
      const res = await createConfig({
        name: `FY${year} Scenario Analysis`,
        year,
        description: '',
        currency_label: 'GHS M',
        global_variables: [],
        derived_metrics: [],
        scenarios: [],
      });
      setEditingId(res.id);
      setView('edit');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create');
    }
  }, []);

  const handleDelete = useCallback(async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await deleteConfig(id);
      loadConfigs();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
    }
  }, [loadConfigs]);

  const handleDuplicate = useCallback(async (id: number) => {
    try {
      await duplicateConfig(id);
      loadConfigs();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to duplicate');
    }
  }, [loadConfigs]);

  const handleOpenConfig = useCallback((id: number) => {
    setEditingId(id);
    setView('edit');
  }, []);

  const handleBackToList = useCallback(() => {
    setView('list');
    setEditingId(null);
    loadConfigs();
  }, [loadConfigs]);

  if (view === 'edit' && editingId) {
    return <ScenarioBuilderEditor configId={editingId} onBack={handleBackToList} />;
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      {showHelp && <HelpGuide onClose={() => setShowHelp(false)} />}

      {/* Header */}
      <div className="relative rounded-xl border border-outline/20 bg-[#1A1A1A] p-6 overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-mtn-yellow rounded-l-xl" />
        <div className="ml-3">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-mtn-yellow/30 bg-mtn-yellow/10 font-mono text-[9px] uppercase tracking-widest text-mtn-yellow">
              <FlaskConical className="w-3 h-3" />
              Dynamic Engine
            </span>
            <button
              onClick={() => setShowHelp(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-blue-500/30 bg-blue-500/10 font-mono text-[9px] uppercase tracking-widest text-blue-400 hover:bg-blue-500/20 transition-colors"
            >
              <Info className="w-3 h-3" />
              How to Use
            </button>
          </div>
          <h1 className="text-2xl font-hero font-bold text-on-surface leading-snug">
            Scenario Builder
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant font-sans">
            Define your own variables, formulas, and scenarios from scratch.
            Build stress tests, shock analyses, and opportunity models with fully custom calculations.
            Each configuration is versioned and saved for year-over-year comparison.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-error/10 border border-error/30 p-3">
          <p className="text-xs text-error">{error}</p>
        </div>
      )}

      <button
        onClick={handleNewConfig}
        className="w-full py-4 rounded-xl font-mono font-bold text-sm uppercase tracking-widest bg-mtn-yellow text-black hover:bg-mtn-yellow/90 transition-all flex items-center justify-center gap-3 active:scale-[0.99]"
      >
        <Plus className="w-4 h-4" />
        New Scenario Configuration
      </button>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-6 h-6 border-2 border-mtn-yellow/30 border-t-mtn-yellow rounded-full animate-spin mx-auto" />
          <p className="mt-3 text-xs text-on-surface-variant">Loading configurations…</p>
        </div>
      ) : configs.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed border-outline/20">
          <FileText className="w-8 h-8 text-on-surface-variant/40 mx-auto mb-3" />
          <p className="text-sm text-on-surface-variant">No configurations yet</p>
          <p className="text-xs text-on-surface-variant/60 mt-1">
            Click &quot;New Scenario Configuration&quot; to get started, or click{' '}
            <button onClick={() => setShowHelp(true)} className="text-blue-400 underline underline-offset-2">How to Use</button>{' '}
            for a quick guide.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {configs.map(c => (
            <div
              key={c.id}
              className="group rounded-xl border border-outline/20 bg-surface-container-low p-4 hover:border-outline/40 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-sans text-sm font-bold text-on-surface truncate">{c.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full font-mono text-[8px] uppercase tracking-widest ${
                      c.status === 'computed'
                        ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                        : c.status === 'archived'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                          : 'bg-mtn-yellow/10 text-mtn-yellow border border-mtn-yellow/30'
                    }`}>
                      {c.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-[10px] text-on-surface-variant font-mono">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> FY{c.year}
                    </span>
                    <span className="flex items-center gap-1">
                      <Archive className="w-3 h-3" /> {c.snapshot_count} snapshot{c.snapshot_count !== 1 ? 's' : ''}
                    </span>
                    {c.computed_at && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Computed {new Date(c.computed_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {c.description && (
                    <p className="text-xs text-on-surface-variant/70 mt-1 truncate">{c.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleDuplicate(c.id)}
                    title="Duplicate for next year"
                    className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(c.id, c.name)}
                    title="Delete"
                    className="p-2 rounded-lg text-on-surface-variant hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleOpenConfig(c.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-mtn-yellow/10 text-mtn-yellow font-mono text-[10px] uppercase tracking-widest hover:bg-mtn-yellow/20 transition-colors"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    Open
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}