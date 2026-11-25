'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Plus, FolderOpen, Trash2, Copy, Calendar, ChevronRight,
  FileText, FlaskConical, Clock, Archive, Info, X,
  ChevronDown, ChevronUp, Variable, FunctionSquare,
  ShieldAlert, Zap, TrendingUp, Settings2, Play,
  Save, Download, Eye, HelpCircle, Pencil, Check, AlertTriangle,
} from 'lucide-react';
import {
  listConfigs, createConfig, deleteConfig, duplicateConfig, updateConfig,
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
    <div className="rounded-lg border border-outline/15 overflow-x-auto my-2">
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

function Callout({ tone = 'blue', children }: { tone?: 'blue' | 'yellow' | 'red' | 'green'; children: React.ReactNode }) {
  const styles = {
    blue: 'bg-blue-500/5 border-blue-500/20 text-blue-400',
    yellow: 'bg-mtn-yellow/5 border-mtn-yellow/20 text-mtn-yellow',
    red: 'bg-red-500/5 border-red-500/20 text-red-400',
    green: 'bg-green-500/5 border-green-500/20 text-green-400',
  }[tone];
  return (
    <div className={`rounded-lg border p-2.5 mt-2 ${styles}`}>
      <div className="text-[10px] leading-relaxed space-y-1">{children}</div>
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
        className="relative w-full max-w-xl bg-[#1A1A1A] border-l border-outline/20 h-full overflow-y-auto animate-in slide-in-from-right duration-300"
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

          {/* ── 1. What is this ── */}
          <HelpSection title="1. What is this?" icon={FlaskConical} defaultOpen>
            <p>
              Scenario Builder lets you create stress tests, shock analyses and opportunity models
              <strong className="text-on-surface"> from scratch</strong> every year. You define your own numbers,
              your own formulas and your own scenarios. Nothing is hardcoded.
            </p>
            <p>The tool takes you through <strong className="text-on-surface">9 stages</strong>. Each stage builds on the one before it:</p>
            <GuideTable
              headers={['Stage', 'You do…', 'You get…']}
              rows={[
                ['1 Variables', 'Enter base case inputs', 'The raw numbers'],
                ['2 Scenarios', 'Create scenarios + their own variables / overrides', 'What changes in each case'],
                ['3 Derived Metrics', 'Define each metric for Base Case + every scenario', 'The matrix'],
                ['4 Table 1', 'Review', 'Table 1 (the matrix)'],
                ['5 Weighted Table', 'Define weighted versions using Table 1 variables', 'The weighted matrix'],
                ['6 Table 2', 'Review', 'Table 2 (weighted)'],
                ['7 Section Tables', 'Build 4 tables using Table 2 variables', 'Tables 3–6'],
                ['8 Tables 3–6', 'Review', 'Stress, Shock, Opportunities ×2'],
                ['9 Calculate', 'Click once', 'All tables + 4 waterfalls + stacked chart'],
              ]}
            />
            <Callout tone="blue">
              <p><strong>The golden rule:</strong> each stage can only use what the stage before it produced. Stage 5 uses Table 1, stage 7 uses Table 2. This keeps every number traceable back to your inputs.</p>
            </Callout>
          </HelpSection>

          {/* ── 2. Getting started ── */}
          <HelpSection title="2. Getting started: create, name and reopen" icon={Play} defaultOpen>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Open <strong className="text-on-surface">Scenario Builder</strong> from the left sidebar (under Advanced Modeling).</li>
              <li>Click the yellow <strong className="text-mtn-yellow">&quot;New Scenario Configuration&quot;</strong> button.</li>
              <li>Type a name for it (for example <em>FY2026 Board Stress Test</em>) and click <strong className="text-on-surface">Create</strong>. A suggested name is pre-filled — change it to anything you like.</li>
              <li>The editor opens at Stage 1.</li>
            </ol>
            <p className="font-semibold text-on-surface mt-2">Renaming — any time</p>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong className="text-on-surface">In the editor:</strong> click the name at the top (it has a pencil icon) and type. If you clear it and click away, the previous name comes back.</li>
              <li><strong className="text-on-surface">On the list page:</strong> click the pencil icon on a configuration, type the new name, then press <kbd>Enter</kbd> or click the tick. Press <kbd>Esc</kbd> to cancel.</li>
            </ul>
            <p>Renaming never affects your calculations or your computed results.</p>
          </HelpSection>

          {/* ── 3. The editor at a glance ── */}
          <HelpSection title="3. The editor at a glance" icon={Settings2}>
            <ul className="list-disc pl-4 space-y-1.5">
              <li><strong className="text-on-surface">Step bar:</strong> 9 buttons across the top. Click any step to jump to it. A <span className="text-green-400">green ✓</span> means the step is complete; a <span className="text-red-400">red !</span> with a number means that stage has formula problems to fix.</li>
              <li><strong className="text-on-surface">Auto-save:</strong> your work is saved automatically every second whenever something changes. Next to the name you will see <em>Saving…</em>, then <em>All changes saved</em>. If the connection drops it shows <em>Couldn&apos;t save — retrying</em> and keeps trying. <strong className="text-on-surface">Save Now</strong> saves instantly, and leaving the editor with the back arrow saves anything pending first.</li>
              <li><strong className="text-on-surface">Year and unit:</strong> the small boxes beside the name. The unit (default <code className="text-mtn-yellow">GHS M</code>) is printed on every table and chart.</li>
              <li><strong className="text-on-surface">View Results:</strong> appears once you have calculated at least once.</li>
            </ul>
          </HelpSection>

          {/* ── 4. Worked example ── */}
          <HelpSection title="4. Worked example (follow along)" icon={FileText}>
            <p>A small example you can reproduce. All figures are in GHS M.</p>
            <p className="font-semibold text-on-surface">Stage 1 — variables</p>
            <GuideTable
              headers={['Name', 'Value']}
              rows={[
                ['planned_revenue', '500'],
                ['planned_cost_of_sales', '200'],
              ]}
            />
            <p className="font-semibold text-on-surface">Stage 2 — one scenario</p>
            <p>Name: <em>20% of must win initiatives fail</em> (Stress). Add a scenario variable <code className="text-mtn-yellow">failure_rate</code> = <code className="text-mtn-yellow">0.2</code>.</p>
            <p className="font-semibold text-on-surface">Stage 3 — derived metrics</p>
            <GuideTable
              headers={['Metric', 'Base Case', 'Scenario: 20% fail']}
              rows={[
                ['revenue', 'planned_revenue', 'planned_revenue * (1 - failure_rate)'],
                ['cost of sales', 'planned_cost_of_sales', 'planned_cost_of_sales'],
                ['contribution margin', 'revenue - cost_of_sales', 'revenue - cost_of_sales'],
              ]}
            />
            <p className="font-semibold text-on-surface">Stage 4 — Table 1 (what you will see)</p>
            <GuideTable
              headers={['Metric', 'Base Case', '20% fail']}
              rows={[
                ['revenue', '500', '400'],
                ['cost of sales', '200', '200'],
                ['contribution margin', '300', '200'],
              ]}
            />
            <p className="font-semibold text-on-surface">Stage 5 — weighted table (stress weighted at 0.7)</p>
            <p>Variables available are named like <code className="text-mtn-yellow">revenue base case</code> and <code className="text-mtn-yellow">revenue 20% of must win initiatives fail</code>.</p>
            <GuideTable
              headers={['Metric (locked)', 'Base Case', '20% fail']}
              rows={[
                ['revenue wghtd', 'revenue base case', 'revenue 20% of must win initiatives fail * 0.7'],
                ['cost of sales wghtd', 'cost of sales base case', 'cost of sales 20% of must win initiatives fail * 0.7'],
                ['contribution margin wghtd', 'contribution margin base case', 'contribution margin 20% of must win initiatives fail * 0.7'],
              ]}
            />
            <p className="font-semibold text-on-surface">Stage 6 — Table 2: revenue wghtd 500 / 280, cost of sales wghtd 200 / 140, contribution margin wghtd 300 / 140.</p>
            <p className="font-semibold text-on-surface">Stage 7 — the Stress section (you choose the names)</p>
            <GuideTable
              headers={['Metric name', 'Formula (Table 2 variables)', 'Value', 'Role']}
              rows={[
                ['Base contribution margin', 'contribution margin wghtd base case', '300', 'Start bar'],
                ['Revenue impact', 'revenue wghtd 20% of must win initiatives fail − revenue wghtd base case', '−220', 'Impact bar'],
                ['Cost of sales impact', 'cost of sales wghtd base case − cost of sales wghtd 20% of must win initiatives fail', '+60', 'Impact bar'],
                ['Adjusted contribution margin', 'contribution margin wghtd 20% of must win initiatives fail', '140', 'Total bar'],
              ]}
            />
            <Callout tone="green">
              <p>Check: 300 − 220 + 60 = 140, so the waterfall bridges exactly from the start bar to the total bar.</p>
            </Callout>
          </HelpSection>

          {/* ── 5. Stage 1 ── */}
          <HelpSection title="Stage 1 — Variables" icon={Variable}>
            <p>These are the raw numbers you already know — the base case figures.</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Click <strong className="text-mtn-yellow">&quot;+ Add Variable&quot;</strong> for each input.</li>
              <li>Fill in a <strong className="text-on-surface">name</strong>, a <strong className="text-on-surface">value</strong>, and optionally a description.</li>
            </ul>
            <p className="font-semibold text-on-surface mt-2">Naming rules (checked as you type)</p>
            <GuideTable
              headers={['Rule', 'Good', 'Not allowed']}
              rows={[
                ['Start with a letter', 'payout_2025', '2025 payout'],
                ['Letters, numbers, spaces, _ only', 'mgmt fees pct', 'fees_%  ·  cost-ratio'],
                ['Unique', 'one revenue', 'two "revenue"'],
                ['Not a function name', 'round_up', 'round, abs, min, max, sqrt'],
              ]}
            />
            <p>An invalid name gets a red border and a message under the field. Names are not case-sensitive and spaces become underscores automatically.</p>
          </HelpSection>

          {/* ── 6. Stage 2 ── */}
          <HelpSection title="Stage 2 — Scenarios" icon={ShieldAlert}>
            <p>Create the &quot;what if&quot; situations. There is no limit on how many you add.</p>
            <ul className="list-none pl-1 space-y-1">
              <li className="flex items-center gap-1.5"><ShieldAlert className="w-3 h-3 text-mtn-yellow" /><span><strong className="text-mtn-yellow">Stress</strong> — negative situations (revenue drops, costs rise)</span></li>
              <li className="flex items-center gap-1.5"><Zap className="w-3 h-3 text-red-400" /><span><strong className="text-red-400">Shock</strong> — sudden severe events (rate spikes, currency crashes)</span></li>
              <li className="flex items-center gap-1.5"><TrendingUp className="w-3 h-3 text-green-400" /><span><strong className="text-green-400">Opportunity</strong> — positive situations (new markets, savings)</span></li>
            </ul>
            <p className="font-semibold text-on-surface mt-2">For each scenario</p>
            <ol className="list-decimal pl-4 space-y-1">
              <li><strong className="text-on-surface">Name it</strong> — this name is used in tables and in variable names later, so make it clear.</li>
              <li><strong className="text-on-surface">Choose the type</strong> (Stress / Shock / Opportunity).</li>
              <li><strong className="text-on-surface">Overrides</strong> — change the value of a Stage 1 variable <em>for this scenario only</em>.</li>
              <li><strong className="text-on-surface">Scenario variables</strong> — create a brand-new variable that exists <em>only in this scenario</em> (for example <code className="text-mtn-yellow">failure_rate</code>).</li>
            </ol>
            <Callout tone="yellow">
              <p>Overrides and scenario variables never leak: the Base Case and other scenarios cannot see them.</p>
            </Callout>
          </HelpSection>

          {/* ── 7. Stage 3 ── */}
          <HelpSection title="Stage 3 — Derived Metrics" icon={FunctionSquare}>
            <p>Each metric is defined once for the <strong className="text-blue-400">Base Case</strong> and once for <strong className="text-on-surface">every scenario</strong>, so the result is a complete matrix.</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Click <strong className="text-mtn-yellow">&quot;+ Add Derived Metric&quot;</strong>, name it, then click the arrow to expand it.</li>
              <li>Build the Base Case formula, then one formula per scenario by clicking variables, numbers and operators — no typing needed.</li>
              <li>The header shows progress (<code className="text-mtn-yellow">3/5 filled</code>) and the Base Case value once known.</li>
              <li>Above each scenario formula, small chips show exactly which variables that scenario uses: <span className="text-mtn-yellow">yellow</span> = overridden, <span className="text-blue-400">blue</span> = this scenario only.</li>
            </ul>
            <p className="font-semibold text-on-surface mt-2">What a formula can use here</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Stage 1 variables (with that scenario&apos;s overrides applied)</li>
              <li>That scenario&apos;s own variables</li>
              <li><strong className="text-on-surface">Metrics listed ABOVE this one only</strong> — metrics are calculated from top to bottom</li>
            </ul>
            <Callout tone="blue">
              <p><strong>Order matters.</strong> If <em>ebitda</em> needs <em>ebit</em>, list <em>ebit</em> first. The dropdown only offers what is already available, which prevents most mistakes.</p>
            </Callout>
          </HelpSection>

          {/* ── 8. Stage 4 ── */}
          <HelpSection title="Stage 4 — Table 1" icon={FileText}>
            <p>Your Stage 3 matrix, shown as a proper table: Base Case first, then all stress scenarios, then shocks, then opportunities.</p>
            <p>Open <strong className="text-on-surface">&quot;Variables this table creates for Step 5&quot;</strong> to see every cell as a named variable, for example <code className="text-mtn-yellow">contribution margin base case</code> = 300.</p>
          </HelpSection>

          {/* ── 9. Stage 5 ── */}
          <HelpSection title="Stage 5 — Weighted Table" icon={FunctionSquare}>
            <p>This looks like Stage 3, with two differences:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong className="text-on-surface">The name is locked.</strong> Every derived metric automatically gets a weighted version called <code className="text-mtn-yellow">&lt;metric&gt; wghtd</code> (padlock icon). You cannot rename it, so it always stays linked to its source.</li>
              <li><strong className="text-on-surface">Only Table 1 variables are offered.</strong> In the dropdown you will see readable names such as <code className="text-mtn-yellow">contribution margin base case</code> and <code className="text-mtn-yellow">contribution margin 20% of must win initiatives fail</code>.</li>
            </ul>
            <p>Define a Base Case formula and one formula per scenario for each weighted metric. A typical use is multiplying by a probability weight (e.g. <code className="text-mtn-yellow">… * 0.7</code>), but any formula works.</p>
            <Callout tone="yellow">
              <p><strong>If you rename a metric or scenario</strong> after building these formulas, the variable it created changes name. The affected formula shows a red message — remove the old variable and pick it again from the dropdown.</p>
            </Callout>
          </HelpSection>

          {/* ── 10. Stage 6 ── */}
          <HelpSection title="Stage 6 — Table 2" icon={FileText}>
            <p>Shows your weighted metrics for the Base Case and each scenario. Every cell becomes a variable (for example <code className="text-mtn-yellow">contribution margin wghtd base case</code>) for Stage 7.</p>
          </HelpSection>

          {/* ── 11. Stage 7 ── */}
          <HelpSection title="Stage 7 — Section Tables" icon={Settings2}>
            <p>You build <strong className="text-on-surface">four independent tables</strong>. Each has its own metrics, and they can all be different.</p>
            <GuideTable
              headers={['Table', 'Section']}
              rows={[
                ['Table 3', 'Stress — all stress scenarios grouped together'],
                ['Table 4', 'Shock — all shock scenarios grouped together'],
                ['Table 5', 'Opportunities, holding all other constant'],
                ['Table 6', 'Opportunities, considering stress scenarios'],
              ]}
            />
            <ol className="list-decimal pl-4 space-y-1">
              <li>Click <strong className="text-mtn-yellow">&quot;+ Add Metric&quot;</strong> inside a section and give it any name you like.</li>
              <li>Build its formula using <strong className="text-on-surface">only Table 2 variables</strong>. Each metric has one formula and produces one value.</li>
              <li>Repeat for every metric you want in that table. You may leave a section empty.</li>
            </ol>
            <p className="font-semibold text-on-surface mt-2">How the waterfall chart is built from the table</p>
            <ul className="list-disc pl-4 space-y-1">
              <li><span className="text-mtn-yellow">First metric</span> = start bar</li>
              <li><span className="text-green-400">Middle metrics</span> = impact bars (green if positive, red if negative)</li>
              <li><span className="text-blue-400">Last metric</span> = total bar</li>
            </ul>
            <p>Each metric shows its role (Start / Impact / Total) so you can reorder by deleting and re-adding as needed.</p>
          </HelpSection>

          {/* ── 12. Stage 8 ── */}
          <HelpSection title="Stage 8 — Tables 3–6" icon={FileText}>
            <p>Shows the four section tables with live values. These feed the four waterfall charts.</p>
          </HelpSection>

          {/* ── 13. Stage 9 ── */}
          <HelpSection title="Stage 9 — Calculate" icon={Play}>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Review the summary. Any yellow warning has a <strong className="text-on-surface">Go to Step…</strong> link that takes you straight to the stage to fix.</li>
              <li>Click <strong className="text-mtn-yellow">&quot;Save &amp; Create Tables and Charts&quot;</strong>. It is disabled until every stage is complete and has no formula problems.</li>
            </ol>
            <p className="font-semibold text-on-surface mt-2">The system will</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>Save your latest edits</li>
              <li>Run every calculation: Table 1 → Table 2 → Tables 3–6</li>
              <li>Store a versioned snapshot for audit tracking</li>
              <li>Show all six tables, four waterfall charts and a stacked bar chart</li>
            </ul>
          </HelpSection>

          {/* ── 14. Troubleshooting ── */}
          <HelpSection title="Fixing formula problems" icon={AlertTriangle}>
            <p>Formula problems are shown <strong className="text-on-surface">right where you write the formula</strong>, in red, with a plain-language explanation. The step bar also shows a red badge with the number of problems, and a collapsed metric lists its problems under its header (click to open it).</p>
            <GuideTable
              headers={['Message', 'What it means', 'How to fix']}
              rows={[
                ['"x" is calculated further down the list', 'This metric uses one that is listed below it', 'Move x above this metric, or use a different variable'],
                ['"x" refers to itself', 'A metric uses its own value (circular)', 'Remove it from its own formula'],
                ['"x" isn\'t available here', 'Renamed, deleted, or belongs to another scenario', 'Remove it and pick it again from the dropdown'],
                ['"x" isn\'t a Table 1 / Table 2 variable', 'A metric or scenario it came from was renamed or deleted', 'Remove it and pick the new one'],
                ['Division by zero', 'A denominator evaluates to 0', 'Check the inputs, or use max(denominator, 0.0001)'],
                ['Brackets don\'t match', 'A ( is missing its )', 'Count your brackets'],
                ['The formula looks incomplete', 'A number, variable or operator is missing', 'Use the Back button to remove the last item'],
              ]}
            />
            <p>If a problem slips through to calculation, the results page lists it with the step it belongs to, for example <em>Step 3 · Derived Metrics — &apos;ebitda&apos; for scenario &apos;Shock Scenario 1&apos;</em>. Affected cells show 0 until you fix them.</p>
          </HelpSection>

          {/* ── 15. Results ── */}
          <HelpSection title="Reading your results" icon={Eye}>
            <p className="font-semibold text-on-surface">Tables tab</p>
            <p>Table 1 (derived metrics), Table 2 (weighted) and Tables 3–6. Columns are ordered Base Case, then all stress, all shock, all opportunity.</p>
            <p className="font-semibold text-on-surface mt-2">Waterfall Charts tab</p>
            <p>Four charts, one per section table.</p>
            <ul className="list-none pl-2 space-y-0.5 mt-1">
              <li><span className="inline-block w-2.5 h-2.5 rounded-sm bg-mtn-yellow mr-1.5 align-middle" /> Yellow = start bar (first metric)</li>
              <li><span className="inline-block w-2.5 h-2.5 rounded-sm bg-green-500 mr-1.5 align-middle" /> Green = positive impact</li>
              <li><span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-500 mr-1.5 align-middle" /> Red = negative impact</li>
              <li><span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-500 mr-1.5 align-middle" /> Blue = total (last metric)</li>
            </ul>
            <p className="font-semibold text-on-surface mt-2">Impact Overview tab</p>
            <p>A stacked bar chart built from Table 1. Each bar is one column (Base Case, then every scenario) and stacks all derived metrics on top of each other. The number inside each segment is that metric&apos;s value; the number above the bar is the net total. Hover a segment to see its metric name. Very thin segments hide their label to stay readable.</p>
            <Callout tone="blue">
              <p><strong>Units:</strong> everything uses the single unit set at the top of the editor (default GHS M). There is no K or M abbreviation on the axes, tables or labels — enter your inputs in that unit and read the outputs in the same unit.</p>
            </Callout>
          </HelpSection>

          {/* ── 16. Other things ── */}
          <HelpSection title="Other things you can do" icon={HelpCircle}>
            <div className="space-y-3">
              <div>
                <p className="font-semibold text-on-surface flex items-center gap-1.5"><Save className="w-3 h-3 text-mtn-yellow" /> Auto-save</p>
                <p>Changes are saved every second. You never need to remember to save, and leaving the editor saves anything still pending.</p>
              </div>
              <div>
                <p className="font-semibold text-on-surface flex items-center gap-1.5"><Pencil className="w-3 h-3 text-mtn-yellow" /> Rename</p>
                <p>From the editor title or the pencil icon on the list page, any time.</p>
              </div>
              <div>
                <p className="font-semibold text-on-surface flex items-center gap-1.5"><Download className="w-3 h-3 text-mtn-yellow" /> Export to CSV</p>
                <p>The &quot;Export CSV&quot; button on the results page downloads all six tables, with the unit at the top.</p>
              </div>
              <div>
                <p className="font-semibold text-on-surface flex items-center gap-1.5"><Eye className="w-3 h-3 text-mtn-yellow" /> View past results</p>
                <p>A green &quot;View Results&quot; button appears in the editor once you have calculated. Editing the setup afterwards marks the configuration as draft until you calculate again.</p>
              </div>
              <div>
                <p className="font-semibold text-on-surface flex items-center gap-1.5"><Copy className="w-3 h-3 text-mtn-yellow" /> Duplicate for next year</p>
                <p>The copy icon on the list page creates a copy for the next year so you can start from last year&apos;s setup and update the numbers.</p>
              </div>
              <div>
                <p className="font-semibold text-on-surface flex items-center gap-1.5"><Archive className="w-3 h-3 text-mtn-yellow" /> Version history</p>
                <p>Every calculation saves a snapshot of the exact inputs and outputs, giving you an audit trail. The count shows on each card.</p>
              </div>
              <div>
                <p className="font-semibold text-on-surface flex items-center gap-1.5"><Trash2 className="w-3 h-3 text-red-400" /> Delete</p>
                <p>The trash icon removes a configuration and all its snapshots. <strong className="text-red-400">This cannot be undone.</strong></p>
              </div>
            </div>
          </HelpSection>

          {/* ── 17. Formula reference ── */}
          <HelpSection title="Formula quick reference" icon={FunctionSquare}>
            <GuideTable
              headers={['What you build', 'What it does']}
              rows={[
                ['revenue - opex', 'Subtraction'],
                ['revenue * 0.25', 'Multiplication'],
                ['pbt / revenue', 'Division'],
                ['revenue ^ 2', 'Power'],
                ['(revenue - opex) * 0.5', 'Brackets for grouping'],
                ['abs(pbt)', 'Absolute value'],
                ['min(revenue, 500)', 'Smaller of the two'],
                ['max(revenue, 500)', 'Larger of the two'],
                ['sqrt(revenue)', 'Square root'],
                ['round(margin, 4)', 'Round to 4 decimal places'],
              ]}
            />
            <p>Use the <strong className="text-on-surface">Back</strong> button to remove the last item and <strong className="text-on-surface">Clear</strong> to start over. The green/red line under each formula tells you instantly whether it works and shows a test value.</p>
          </HelpSection>

          {/* ── 18. FAQ ── */}
          <HelpSection title="Common questions" icon={HelpCircle}>
            <QA
              q="Why can't I see a variable in the dropdown?"
              a="Each place only offers what is allowed there: Stage 3 offers variables and metrics above the current one; Stage 5 offers Table 1 variables; Stage 7 offers Table 2 variables. Invalid names are also hidden until fixed."
            />
            <QA
              q="What is the difference between an override and a scenario variable?"
              a="An override changes the value of an existing Stage 1 variable inside one scenario. A scenario variable is a new variable that only exists inside that scenario. Neither affects the Base Case or other scenarios."
            />
            <QA
              q="What does 'wghtd' mean?"
              a="It marks the weighted version of a derived metric (Stage 5). The name is set automatically and locked so each weighted metric stays linked to the metric it came from."
            />
            <QA
              q="Why is Save & Create Tables and Charts disabled?"
              a="Some stage is incomplete or has a formula problem. Open Stage 9 — each warning has a Go to Step link that takes you to the stage to fix."
            />
            <QA
              q="I changed something after calculating. Do I lose my results?"
              a="No. Your last results stay available. The configuration shows as draft until you calculate again, and old snapshots are always preserved."
            />
            <QA
              q="Why do waterfall values differ from what I expected?"
              a="Section metrics are calculated from Table 2 (weighted) values, not Table 1. Check Stage 6 to see exactly which numbers your Stage 7 formulas are using."
            />
            <QA
              q="Can multiple people use this?"
              a="Yes. Each configuration is saved separately. Use descriptive names like 'FY2026 Board Stress Test' so your team knows what each one is."
            />
            <QA
              q="What units should I use?"
              a="Whatever you want — the default is GHS M (Ghana Cedis millions). Change it in the box at the top of the editor and it appears on every table and chart. The system does not convert anything; it only calculates and labels."
            />
          </HelpSection>

          <div className="pt-4 pb-6">
            <p className="text-[10px] text-on-surface-variant/50 text-center">
              All data is saved automatically. You can always come back and edit.
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

  // New configuration (name it first)
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  // Rename from the list
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');

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

  const startCreate = useCallback(() => {
    setNewName(`FY${new Date().getFullYear()} Scenario Analysis`);
    setCreating(true);
  }, []);

  const handleCreate = useCallback(async () => {
    try {
      const year = new Date().getFullYear();
      const res = await createConfig({
        name: newName.trim() || `FY${year} Scenario Analysis`,
        year,
        description: '',
        currency_label: 'GHS M',
        global_variables: [],
        derived_metrics: [],
        scenarios: [],
      });
      setCreating(false);
      setEditingId(res.id);
      setView('edit');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create');
    }
  }, [newName]);

  const startRename = useCallback((c: ConfigSummary) => {
    setRenamingId(c.id);
    setRenameValue(c.name);
  }, []);

  const commitRename = useCallback(async () => {
    if (renamingId === null) return;
    const value = renameValue.trim();
    const id = renamingId;
    setRenamingId(null);
    if (!value) return;
    const current = configs.find(c => c.id === id);
    if (current && current.name === value) return;
    try {
      await updateConfig(id, { name: value });
      loadConfigs();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to rename');
    }
  }, [renamingId, renameValue, configs, loadConfigs]);

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
            Each configuration is auto-saved, versioned and kept for year-over-year comparison.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-error/10 border border-error/30 p-3">
          <p className="text-xs text-error">{error}</p>
        </div>
      )}

      {/* New configuration: name it first */}
      {creating ? (
        <div className="rounded-xl border border-mtn-yellow/40 bg-mtn-yellow/5 p-4 space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-mtn-yellow">Name your new configuration</p>
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') void handleCreate();
              if (e.key === 'Escape') setCreating(false);
            }}
            placeholder="e.g. FY2026 Board Stress Test"
            className="w-full px-3 py-2.5 rounded-lg bg-surface-container border border-outline/30 focus:border-mtn-yellow/60 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none font-sans"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => void handleCreate()}
              className="px-4 py-2 rounded-lg bg-mtn-yellow text-black font-mono text-[10px] uppercase tracking-widest font-bold hover:bg-mtn-yellow/90 transition-colors"
            >
              Create
            </button>
            <button
              onClick={() => setCreating(false)}
              className="px-4 py-2 rounded-lg border border-outline/20 text-on-surface-variant font-mono text-[10px] uppercase tracking-widest hover:text-on-surface hover:border-outline/40 transition-colors"
            >
              Cancel
            </button>
            <p className="text-[10px] text-on-surface-variant ml-1">You can rename it any time.</p>
          </div>
        </div>
      ) : (
        <button
          onClick={startCreate}
          className="w-full py-4 rounded-xl font-mono font-bold text-sm uppercase tracking-widest bg-mtn-yellow text-black hover:bg-mtn-yellow/90 transition-all flex items-center justify-center gap-3 active:scale-[0.99]"
        >
          <Plus className="w-4 h-4" />
          New Scenario Configuration
        </button>
      )}

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
                    {renamingId === c.id ? (
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <input
                          autoFocus
                          type="text"
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') void commitRename();
                            if (e.key === 'Escape') setRenamingId(null);
                          }}
                          className="flex-1 min-w-0 px-2 py-1 rounded-lg bg-surface-container border border-mtn-yellow/50 text-sm font-bold text-on-surface focus:outline-none font-sans"
                        />
                        <button
                          onClick={() => void commitRename()}
                          title="Save name"
                          className="p-1.5 rounded-lg text-green-400 hover:bg-green-500/10 transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setRenamingId(null)}
                          title="Cancel"
                          className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <h3 className="font-sans text-sm font-bold text-on-surface truncate">{c.name}</h3>
                        <button
                          onClick={() => startRename(c)}
                          title="Rename"
                          className="p-1 rounded-lg text-on-surface-variant/50 hover:text-mtn-yellow hover:bg-mtn-yellow/10 transition-colors"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      </>
                    )}
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
