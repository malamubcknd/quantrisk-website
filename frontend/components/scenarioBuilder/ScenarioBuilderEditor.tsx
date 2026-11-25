

// // frontend/components/scenarioBuilder/ScenarioBuilderEditor.tsx

// 'use client';

// import { useState, useEffect, useCallback, useMemo } from 'react';
// import {
//   ArrowLeft, Save, Play, Plus, Trash2, GripVertical, CheckCircle,
//   AlertTriangle, ChevronDown, ChevronRight, Info, Variable,
//   FunctionSquare, ShieldAlert, Zap, TrendingUp, Settings2,
//   Eye, FlaskConical, Delete,
// } from 'lucide-react';
// import {
//   getConfig, updateConfig, computeConfig,
//   type FullConfig, type VariableItem, type DerivedItem,
//   type ScenarioItem, type ScenarioOverride, type ScenarioVariable,
//   type TableConfig, type ComputedResults,
// } from '@/lib/scenarioBuilder';
// import { evaluateFormula, normalizeName } from '@/lib/scenarioBuilder/formulaEngine';
// import { SBResultsView } from '@/components/scenarioBuilder/SBResultsView';

// // ── Helpers ───────────────────────────────────────────────────────────────

// function genId(): string {
//   return `sc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
// }

// const SCENARIO_TYPE_META = {
//   stress: { label: 'Stress', icon: ShieldAlert, color: 'mtn-yellow', borderClass: 'border-mtn-yellow/30', bgClass: 'bg-mtn-yellow/5' },
//   shock: { label: 'Shock', icon: Zap, color: 'red-400', borderClass: 'border-red-500/30', bgClass: 'bg-red-500/5' },
//   opportunity: { label: 'Opportunity', icon: TrendingUp, color: 'green-400', borderClass: 'border-green-500/30', bgClass: 'bg-green-500/5' },
// } as const;

// type Step = 1 | 2 | 3 | 4 | 5;

// /** De-duplicate a list of variable names by their normalized form (first spelling wins). */
// function uniqueNames(names: string[]): string[] {
//   const seen = new Map<string, string>();
//   names.forEach(n => {
//     const key = normalizeName(n);
//     if (key && !seen.has(key)) seen.set(key, n);
//   });
//   return Array.from(seen.values());
// }

// // ── Name validation (variables, scenario variables, derived metrics) ─────

// // Function names the formula engine reserves
// const RESERVED_NAMES = new Set(['abs', 'min', 'max', 'round', 'sqrt']);

// /**
//  * Format check for a name. Names become formula identifiers, so they must
//  * start with a letter/underscore and contain only letters, digits, spaces, "_".
//  * Returns null when valid (or empty — "required" is handled separately).
//  */
// function validateName(raw: string): string | null {
//   const n = raw.trim();
//   if (!n) return null;
//   if (!/^[A-Za-z_]/.test(n)) {
//     return 'Must start with a letter (e.g use payout_2025, not 2025 payout). Else this variable wont be saved';
//   }
//   if (!/^[A-Za-z0-9_ ]+$/.test(n)) {
//     return 'Only letters, numbers, spaces and _ are allowed (no %, -, or other symbols).';
//   }
//   if (RESERVED_NAMES.has(normalizeName(n))) {
//     return `"${n}" is a reserved function name — pick another.`;
//   }
//   return null;
// }

// /** Format check + duplicate check against names that are already taken. */
// function nameIssue(raw: string, taken: string[]): string | null {
//   const base = validateName(raw);
//   if (base) return base;
//   if (!raw.trim()) return null;
//   const key = normalizeName(raw);
//   if (taken.some(t => t.trim() && normalizeName(t) === key)) {
//     return 'This name is already used by another variable or metric.';
//   }
//   return null;
// }

// /** Name issues for every scenario-only variable in one scenario. */
// function scenarioVarIssues(sc: ScenarioItem, globalNames: string[], derivedNames: string[]): (string | null)[] {
//   const vars = sc.variables ?? [];
//   return vars.map((v, i) =>
//     nameIssue(v.name, [
//       ...globalNames,
//       ...derivedNames,
//       ...vars.filter((_, j) => j !== i).map(x => x.name),
//     ])
//   );
// }

// /** A name that is non-empty and well-formed (used to keep bad names out of dropdowns). */
// function isUsableName(n: string): boolean {
//   return !!n.trim() && validateName(n) === null;
// }

// /** Short naming guide shown wherever the user types a name. */
// function NameTip({ className = '' }: { className?: string }) {
//   return (
//     <div className={`rounded-lg bg-blue-500/5 border border-blue-500/20 px-3 py-2 flex gap-2 ${className}`}>
//       <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
//       <p className="text-[10px] text-blue-400 leading-relaxed">
//         <strong>Naming tip:</strong> start with a letter, then use only letters, numbers, spaces or{' '}
//         <code>_</code>. Good: <code>payout_2025</code>, <code>mgmt fees pct</code>. Avoid:{' '}
//         <code>2025 payout</code>, <code>fees_%</code>, <code>cost-ratio</code>.
//       </p>
//     </div>
//   );
// }

// function FieldError({ message }: { message: string | null | undefined }) {
//   if (!message) return null;
//   return (
//     <p className="flex items-start gap-1 mt-1 text-[10px] text-red-400 leading-snug">
//       <AlertTriangle className="w-3 h-3 shrink-0 mt-px" />
//       <span>{message}</span>
//     </p>
//   );
// }

// // ── Step Badge ─────────────────────────────────────────────────────────────

// function StepBadge({ step, label, active, completed, onClick }: {
//   step: number; label: string; active: boolean; completed: boolean; onClick: () => void;
// }) {
//   return (
//     <button
//       onClick={onClick}
//       className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition-all text-left ${
//         active
//           ? 'bg-mtn-yellow/10 border border-mtn-yellow/30'
//           : completed
//             ? 'bg-green-500/5 border border-green-500/20 hover:border-green-500/40'
//             : 'border border-outline/15 hover:border-outline/30'
//       }`}
//     >
//       <div className={`flex items-center justify-center w-6 h-6 rounded-full font-mono text-xs font-bold shrink-0 ${
//         active
//           ? 'bg-mtn-yellow text-black'
//           : completed
//             ? 'bg-green-500 text-black'
//             : 'bg-surface-container text-on-surface-variant'
//       }`}>
//         {completed && !active ? '✓' : step}
//       </div>
//       <span className={`font-mono text-[10px] uppercase tracking-widest ${
//         active ? 'text-mtn-yellow' : completed ? 'text-green-400' : 'text-on-surface-variant'
//       }`}>
//         {label}
//       </span>
//     </button>
//   );
// }

// // ── Variable Row ──────────────────────────────────────────────────────────

// function VariableRow({ item, index, nameError, onChange, onDelete }: {
//   item: VariableItem; index: number;
//   nameError?: string | null;
//   onChange: (index: number, field: keyof VariableItem, value: string | number) => void;
//   onDelete: (index: number) => void;
// }) {
//   return (
//     <div className="group">
//       <div className="flex items-center gap-2">
//         <GripVertical className="w-3 h-3 text-on-surface-variant/30 shrink-0" />
//         <input
//           type="text"
//           placeholder="Variable name (e.g. revenue)"
//           value={item.name}
//           onChange={e => onChange(index, 'name', e.target.value)}
//           className={`flex-1 min-w-0 px-3 py-2 rounded-lg bg-surface-container border text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none font-mono ${
//             nameError ? 'border-red-500/50 focus:border-red-500/70' : 'border-outline/20 focus:border-mtn-yellow/50'
//           }`}
//         />
//         <input
//           type="number"
//           placeholder="Value"
//           value={item.value || ''}
//           onChange={e => onChange(index, 'value', parseFloat(e.target.value) || 0)}
//           className="w-32 px-3 py-2 rounded-lg bg-surface-container border border-outline/20 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:border-mtn-yellow/50 focus:outline-none font-mono text-right"
//         />
//         <input
//           type="text"
//           placeholder="Description (optional)"
//           value={item.description}
//           onChange={e => onChange(index, 'description', e.target.value)}
//           className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-surface-container border border-outline/20 text-xs text-on-surface-variant placeholder:text-on-surface-variant/30 focus:border-outline/40 focus:outline-none"
//         />
//         <button
//           onClick={() => onDelete(index)}
//           className="p-1.5 rounded-lg text-on-surface-variant/40 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
//         >
//           <Trash2 className="w-3.5 h-3.5" />
//         </button>
//       </div>
//       {nameError && <div className="pl-5"><FieldError message={nameError} /></div>}
//     </div>
//   );
// }

// // ── Formula Builder (visual, click-based) ─────────────────────────────────

// function FormulaBuilder({ value, onChange, availableVars, testValues }: {
//   value: string;
//   onChange: (next: string) => void;
//   availableVars: string[];
//   testValues?: Record<string, number>;
// }) {
//   const [selectedVar, setSelectedVar] = useState('');
//   const [numInput, setNumInput] = useState('');

//   const append = (token: string) => {
//     const next = value.trim().length === 0 ? token : `${value} ${token}`;
//     onChange(next);
//   };

//   const backspace = () => {
//     const parts = value.trim().split(/\s+/).filter(Boolean);
//     parts.pop();
//     onChange(parts.join(' '));
//   };

//   const clear = () => onChange('');

//   const insertVar = () => {
//     if (!selectedVar) return;
//     append(normalizeName(selectedVar));
//     setSelectedVar('');
//   };

//   const insertNum = () => {
//     const n = numInput.trim();
//     if (!n) return;
//     append(n);
//     setNumInput('');
//   };

//   // Live preview using real base values (falls back to 1 only if testValues missing)
//   const preview = useMemo(() => {
//     if (!value.trim()) return null;
//     const varMap: Record<string, number> = {};
//     availableVars.forEach(v => {
//       const key = normalizeName(v);
//       const tv = testValues?.[key];
//       varMap[key] = tv !== undefined ? tv : 1;
//     });
//     return evaluateFormula(value, varMap);
//   }, [value, availableVars, testValues]);

//   const OP_BUTTONS: Array<{ label: string; token: string }> = [
//     { label: '+', token: '+' },
//     { label: '−', token: '-' },
//     { label: '×', token: '*' },
//     { label: '÷', token: '/' },
//     { label: '^', token: '^' },
//     { label: '(', token: '(' },
//     { label: ')', token: ')' },
//   ];

//   const FN_BUTTONS: Array<{ label: string; token: string }> = [
//     { label: 'abs(', token: 'abs(' },
//     { label: 'min(', token: 'min(' },
//     { label: 'max(', token: 'max(' },
//     { label: 'sqrt(', token: 'sqrt(' },
//     { label: 'round(', token: 'round(' },
//     { label: ',', token: ',' },
//   ];

//   return (
//     <div className="rounded-lg border border-outline/20 bg-surface-container-low p-3 space-y-2.5">
//       {/* Formula display */}
//       <div className={`min-h-[42px] px-3 py-2 rounded-lg bg-surface-container border font-mono text-sm break-all ${
//         preview?.error
//           ? 'border-red-500/40 text-red-400'
//           : value.trim()
//             ? 'border-green-500/30 text-on-surface'
//             : 'border-outline/20 text-on-surface-variant/40'
//       }`}>
//         {value.trim() || 'Click buttons below to build your formula…'}
//       </div>

//       {/* Variable + number inserters */}
//       <div className="flex flex-wrap gap-2 items-center">
//         <select
//           value={selectedVar}
//           onChange={e => setSelectedVar(e.target.value)}
//           className="flex-1 min-w-[140px] px-2 py-1.5 rounded-lg bg-surface-container border border-outline/20 text-xs text-on-surface font-mono focus:outline-none"
//         >
//           <option value="">Pick a variable…</option>
//           {availableVars.map(v => (
//             <option key={v} value={v}>{normalizeName(v)}</option>
//           ))}
//         </select>
//         <button
//           type="button"
//           onClick={insertVar}
//           disabled={!selectedVar}
//           className="px-2.5 py-1.5 rounded-lg bg-mtn-yellow/10 border border-mtn-yellow/40 text-mtn-yellow font-mono text-[10px] uppercase tracking-widest hover:bg-mtn-yellow/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
//         >
//           + Variable
//         </button>

//         <input
//           type="number"
//           value={numInput}
//           onChange={e => setNumInput(e.target.value)}
//           onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); insertNum(); } }}
//           placeholder="123"
//           className="w-24 px-2 py-1.5 rounded-lg bg-surface-container border border-outline/20 text-xs text-on-surface font-mono text-right focus:outline-none"
//         />
//         <button
//           type="button"
//           onClick={insertNum}
//           disabled={!numInput.trim()}
//           className="px-2.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/40 text-blue-400 font-mono text-[10px] uppercase tracking-widest hover:bg-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
//         >
//           + Num
//         </button>
//       </div>

//       {/* Operator & function buttons */}
//       <div className="flex flex-wrap gap-1.5">
//         {OP_BUTTONS.map(op => (
//           <button
//             key={op.token}
//             type="button"
//             onClick={() => append(op.token)}
//             className="w-9 h-9 rounded-lg bg-surface-container border border-outline/20 text-on-surface font-mono text-base hover:bg-surface-container-high hover:border-outline/40 transition-colors"
//           >
//             {op.label}
//           </button>
//         ))}
//         <div className="w-px h-9 bg-outline/20 mx-1" />
//         {FN_BUTTONS.map(fn => (
//           <button
//             key={fn.token}
//             type="button"
//             onClick={() => append(fn.token)}
//             className="px-2.5 h-9 rounded-lg bg-surface-container border border-outline/20 text-on-surface font-mono text-xs hover:bg-surface-container-high hover:border-outline/40 transition-colors"
//           >
//             {fn.label}
//           </button>
//         ))}
//         <div className="flex-1" />
//         <button
//           type="button"
//           onClick={backspace}
//           disabled={!value.trim()}
//           className="flex items-center gap-1 px-2.5 h-9 rounded-lg bg-surface-container border border-outline/20 text-on-surface-variant font-mono text-[10px] uppercase tracking-widest hover:bg-surface-container-high hover:text-on-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
//         >
//           <Delete className="w-3 h-3" /> Back
//         </button>
//         <button
//           type="button"
//           onClick={clear}
//           disabled={!value.trim()}
//           className="px-2.5 h-9 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-[10px] uppercase tracking-widest hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
//         >
//           Clear
//         </button>
//       </div>

//       {/* Live validation */}
//       {value.trim() && preview && (
//         <div className={`flex items-center gap-2 px-2 py-1.5 rounded font-mono text-[10px] ${
//           preview.error
//             ? 'bg-red-500/5 text-red-400'
//             : 'bg-green-500/5 text-green-400'
//         }`}>
//           {preview.error ? (
//             <>
//               <AlertTriangle className="w-3 h-3 shrink-0" />
//               <span>{preview.error}</span>
//             </>
//           ) : (
//             <>
//               <CheckCircle className="w-3 h-3 shrink-0" />
//               <span>Formula valid (test value: {preview.value?.toFixed(2)})</span>
//             </>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }

// // ── Derived Metric Row (collapsible: Base Case + one formula per scenario) ─

// function DerivedRow({
//   item, index, scenarios, availableVars, globalVarNames, derivedNames, baseVarValues,
//   baseTestValues, scenarioTestValues, nameError,
//   onChange, onChangeScenarioFormula, onDelete,
// }: {
//   item: DerivedItem; index: number;
//   scenarios: ScenarioItem[];
//   availableVars: string[];                 // base case: global variables + derived metrics
//   globalVarNames: string[];
//   derivedNames: string[];
//   baseVarValues: Record<string, number>;
//   baseTestValues?: Record<string, number>;
//   scenarioTestValues: Record<string, Record<string, number>>;
//   nameError?: string | null;
//   onChange: (index: number, field: keyof DerivedItem, value: string) => void;
//   onChangeScenarioFormula: (index: number, scenarioId: string, formula: string) => void;
//   onDelete: (index: number) => void;
// }) {
//   // Existing metrics load collapsed; a brand-new blank metric starts expanded.
//   const [expanded, setExpanded] = useState(() => !item.name.trim() && !item.formula.trim());

//   // Completion summary shown in the collapsed header
//   const baseFilled = !!item.formula.trim();
//   const filledScenarios = scenarios.filter(sc => (item.scenario_formulas?.[sc.id] ?? '').trim()).length;
//   const totalCells = scenarios.length + 1;
//   const filledCells = (baseFilled ? 1 : 0) + filledScenarios;
//   const complete = filledCells === totalCells;
//   const baseValue = baseFilled && item.name.trim()
//     ? baseTestValues?.[normalizeName(item.name)]
//     : undefined;

//   return (
//     <div className="rounded-xl border border-white bg-surface-container-low/50 group">
//       {/* Header (always visible) */}
//       <div className="flex items-center gap-2 p-3">
//         <button
//           type="button"
//           onClick={() => setExpanded(e => !e)}
//           title={expanded ? 'Collapse' : 'Expand'}
//           className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors shrink-0"
//         >
//           {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
//         </button>
//         <input
//           type="text"
//           placeholder="Metric name (e.g. revenue)"
//           value={item.name}
//           onChange={e => onChange(index, 'name', e.target.value)}
//           className={`w-48 px-3 py-2 rounded-lg bg-surface-container border text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none font-mono ${
//             nameError ? 'border-red-500/50 focus:border-red-500/70' : 'border-outline/20 focus:border-mtn-yellow/50'
//           }`}
//         />
//         <input
//           type="text"
//           placeholder="Description (optional)"
//           value={item.description || ''}
//           onChange={e => onChange(index, 'description', e.target.value)}
//           className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-surface-container border border-outline/20 text-xs text-on-surface-variant placeholder:text-on-surface-variant/30 focus:border-outline/40 focus:outline-none"
//         />

//         {/* Status summary */}
//         <span
//           className={`shrink-0 px-2 py-1 rounded-full border font-mono text-[9px] uppercase tracking-widest ${
//             complete
//               ? 'border-green-500/30 bg-green-500/10 text-green-400'
//               : 'border-red-500/30 bg-red-500/10 text-red-400'
//           }`}
//         >
//           {filledCells}/{totalCells} filled
//         </span>
//         {baseValue !== undefined && (
//           <span className="shrink-0 hidden md:inline font-mono text-[10px] text-blue-400">
//             base = {baseValue.toFixed(2)}
//           </span>
//         )}

//         <button
//           onClick={() => onDelete(index)}
//           className="p-1.5 rounded-lg text-on-surface-variant/40 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all shrink-0"
//         >
//           <Trash2 className="w-3.5 h-3.5" />
//         </button>
//       </div>
//       {nameError && <div className="px-3 pb-3 -mt-1 pl-12"><FieldError message={nameError} /></div>}

//       {/* Expanded body: Base Case + every scenario */}
//       {expanded && (
//         <div className="px-3 pb-3 space-y-3 border-t border-white/20 pt-3">
//           {/* Base case */}
//           <div className="space-y-1.5">
//             <p className="font-mono text-[9px] uppercase tracking-widest text-blue-400">
//               Base Case
//               {!baseFilled && <span className="ml-2 text-red-400">· required</span>}
//             </p>
//             <FormulaBuilder
//               value={item.formula}
//               onChange={next => onChange(index, 'formula', next)}
//               availableVars={availableVars}
//               testValues={baseTestValues}
//             />
//           </div>

//           {/* One formula per scenario */}
//           {scenarios.map(sc => {
//             const meta = SCENARIO_TYPE_META[sc.type] || SCENARIO_TYPE_META.stress;
//             const val = item.scenario_formulas?.[sc.id] ?? '';

//             // Variables visible ONLY in this scenario: base variables (with this scenario's
//             // overrides applied) + this scenario's own new variables + derived metrics.
//             const scVars = (sc.variables ?? []).filter(v => isUsableName(v.name));
//             const overrideMap = new Map<string, number>();
//             sc.overrides.forEach(o => {
//               if (o.name.trim()) overrideMap.set(normalizeName(o.name), o.value);
//             });
//             const scAvailable = uniqueNames([
//               ...globalVarNames,
//               ...scVars.map(v => v.name),
//               ...derivedNames,
//             ]);

//             return (
//               <div key={sc.id} className="space-y-1.5">
//                 <p className={`font-mono text-[9px] uppercase tracking-widest text-${meta.color}`}>
//                   {sc.name || sc.id} <span className="text-on-surface-variant/50">({meta.label})</span>
//                   {!val.trim() && <span className="ml-2 text-red-400">· required</span>}
//                 </p>

//                 {/* What this scenario's variables look like */}
//                 {(globalVarNames.length > 0 || scVars.length > 0) && (
//                   <div className="flex flex-wrap gap-1.5">
//                     {globalVarNames.map(n => {
//                       const key = normalizeName(n);
//                       const overridden = overrideMap.has(key);
//                       const shown = overridden ? overrideMap.get(key) : baseVarValues[key];
//                       return (
//                         <span
//                           key={`g-${key}`}
//                           className={`px-2 py-0.5 rounded border font-mono text-[9px] ${
//                             overridden
//                               ? 'border-mtn-yellow/40 bg-mtn-yellow/10 text-mtn-yellow'
//                               : 'border-outline/15 bg-surface-container text-on-surface-variant'
//                           }`}
//                         >
//                           {key} = {shown}
//                           {overridden && <span className="ml-1 opacity-70">(overridden, base {baseVarValues[key]})</span>}
//                         </span>
//                       );
//                     })}
//                     {scVars.map((v, i) => (
//                       <span
//                         key={`s-${i}`}
//                         className="px-2 py-0.5 rounded border border-blue-500/40 bg-blue-500/10 text-blue-400 font-mono text-[9px]"
//                       >
//                         {normalizeName(v.name)} = {v.value}
//                         <span className="ml-1 opacity-70">(this scenario only)</span>
//                       </span>
//                     ))}
//                   </div>
//                 )}

//                 <FormulaBuilder
//                   value={val}
//                   onChange={next => onChangeScenarioFormula(index, sc.id, next)}
//                   availableVars={scAvailable}
//                   testValues={scenarioTestValues[sc.id]}
//                 />
//               </div>
//             );
//           })}
//         </div>
//       )}
//     </div>
//   );
// }

// // ── Scenario Card ─────────────────────────────────────────────────────────

// function ScenarioCard({ scenario, allVariableNames, derivedNames, onUpdate, onDelete }: {
//   scenario: ScenarioItem;
//   allVariableNames: string[];
//   derivedNames: string[];
//   onUpdate: (updated: ScenarioItem) => void;
//   onDelete: () => void;
// }) {
//   const [collapsed, setCollapsed] = useState(false);
//   const meta = SCENARIO_TYPE_META[scenario.type] || SCENARIO_TYPE_META.stress;
//   const Icon = meta.icon;
//   const scenarioVariables = scenario.variables ?? [];
//   const varIssues = scenarioVarIssues(scenario, allVariableNames, derivedNames);

//   // Overrides (overwrite a base variable, this scenario only)
//   const addOverride = () => {
//     onUpdate({
//       ...scenario,
//       overrides: [...scenario.overrides, { name: '', value: 0 }],
//     });
//   };

//   const updateOverride = (idx: number, field: keyof ScenarioOverride, value: string | number) => {
//     const updated = [...scenario.overrides];
//     const current = updated[idx];
//     if (current === undefined) return;
//     updated[idx] = { ...current, [field]: value };
//     onUpdate({ ...scenario, overrides: updated });
//   };

//   const deleteOverride = (idx: number) => {
//     onUpdate({
//       ...scenario,
//       overrides: scenario.overrides.filter((_, i) => i !== idx),
//     });
//   };

//   // Scenario-only variables (new variables that exist only in this scenario)
//   const addScenarioVariable = () => {
//     onUpdate({
//       ...scenario,
//       variables: [...scenarioVariables, { name: '', value: 0, description: '' }],
//     });
//   };

//   const updateScenarioVariable = (idx: number, field: keyof ScenarioVariable, value: string | number) => {
//     const updated = [...scenarioVariables];
//     const current = updated[idx];
//     if (current === undefined) return;
//     updated[idx] = { ...current, [field]: value };
//     onUpdate({ ...scenario, variables: updated });
//   };

//   const deleteScenarioVariable = (idx: number) => {
//     onUpdate({
//       ...scenario,
//       variables: scenarioVariables.filter((_, i) => i !== idx),
//     });
//   };

//   return (
//     <div className={`rounded-xl border ${meta.borderClass} ${meta.bgClass} overflow-hidden`}>
//       {/* Header */}
//       <div className="flex items-center gap-3 px-4 py-3">
//         <button onClick={() => setCollapsed(c => !c)} className="shrink-0">
//           {collapsed ? <ChevronRight className="w-4 h-4 text-on-surface-variant" /> : <ChevronDown className="w-4 h-4 text-on-surface-variant" />}
//         </button>
//         <Icon className={`w-4 h-4 text-${meta.color} shrink-0`} />
//         <input
//           type="text"
//           value={scenario.name}
//           onChange={e => onUpdate({ ...scenario, name: e.target.value })}
//           placeholder="Scenario name"
//           className={`flex-1 bg-transparent font-sans text-sm font-bold text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none ${
//             !scenario.name.trim() ? 'ring-1 ring-red-500/40 rounded px-2' : ''
//           }`}
//         />
//         {!scenario.name.trim() && (
//           <span className="font-mono text-[8px] text-red-400 uppercase tracking-widest shrink-0">Name required</span>
//         )}
//         <select
//           value={scenario.type}
//           onChange={e => onUpdate({ ...scenario, type: e.target.value as ScenarioItem['type'] })}
//           className="px-2 py-1 rounded-lg bg-surface-container border border-outline/20 text-xs text-on-surface font-mono focus:outline-none"
//         >
//           <option value="stress">Stress</option>
//           <option value="shock">Shock</option>
//           <option value="opportunity">Opportunity</option>
//         </select>
//         <button
//           onClick={onDelete}
//           className="p-1.5 rounded-lg text-on-surface-variant/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
//         >
//           <Trash2 className="w-3.5 h-3.5" />
//         </button>
//       </div>

//       {/* Body */}
//       {!collapsed && (
//         <div className="px-4 pb-4 space-y-4">
//           {/* Variable Overrides */}
//           <div>
//             <div className="flex items-center justify-between mb-2">
//               <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant">
//                 Variable Overrides (overwrite a base case value, for this scenario only)
//               </p>
//               <button
//                 onClick={addOverride}
//                 className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono text-mtn-yellow hover:bg-mtn-yellow/10 transition-colors"
//               >
//                 <Plus className="w-2.5 h-2.5" /> Override
//               </button>
//             </div>
//             <div className="space-y-1.5">
//               {scenario.overrides.length === 0 && (
//                 <p className="text-[10px] text-on-surface-variant/50 italic">No overrides — uses base case values</p>
//               )}
//               {scenario.overrides.map((ov, idx) => (
//                 <div key={idx} className="flex items-center gap-2">
//                   <select
//                     value={ov.name}
//                     onChange={e => updateOverride(idx, 'name', e.target.value)}
//                     className="flex-1 px-2 py-1.5 rounded-lg bg-surface-container border border-outline/20 text-xs text-on-surface font-mono focus:outline-none"
//                   >
//                     <option value="">Select variable…</option>
//                     {allVariableNames.map(v => (
//                       <option key={v} value={v}>{v}</option>
//                     ))}
//                   </select>
//                   <input
//                     type="number"
//                     value={ov.value || ''}
//                     onChange={e => updateOverride(idx, 'value', parseFloat(e.target.value) || 0)}
//                     placeholder="Override value"
//                     className="w-28 px-2 py-1.5 rounded-lg bg-surface-container border border-outline/20 text-xs text-on-surface font-mono text-right focus:outline-none"
//                   />
//                   <button
//                     onClick={() => deleteOverride(idx)}
//                     className="p-1 rounded text-on-surface-variant/40 hover:text-red-400 transition-colors"
//                   >
//                     <Trash2 className="w-3 h-3" />
//                   </button>
//                 </div>
//               ))}
//             </div>
//           </div>

//           {/* Scenario-only Variables */}
//           <div>
//             <div className="flex items-center justify-between mb-2">
//               <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant">
//                 Scenario Variables (new variables that exist only in this scenario)
//               </p>
//               <button
//                 onClick={addScenarioVariable}
//                 className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono text-mtn-yellow hover:bg-mtn-yellow/10 transition-colors"
//               >
//                 <Plus className="w-2.5 h-2.5" /> Variable
//               </button>
//             </div>
//             <div className="space-y-1.5">
//               {scenarioVariables.length === 0 && (
//                 <p className="text-[10px] text-on-surface-variant/50 italic">
//                   No scenario variables — add one if this scenario needs its own input (e.g. failure_rate)
//                 </p>
//               )}
//               {scenarioVariables.map((sv, idx) => {
//                 const issue = varIssues[idx];
//                 return (
//                   <div key={idx}>
//                     <div className="flex items-center gap-2">
//                       <input
//                         type="text"
//                         value={sv.name}
//                         onChange={e => updateScenarioVariable(idx, 'name', e.target.value)}
//                         placeholder="Variable name (e.g. failure_rate)"
//                         className={`flex-1 min-w-0 px-2 py-1.5 rounded-lg bg-surface-container border text-xs text-on-surface font-mono placeholder:text-on-surface-variant/40 focus:outline-none ${
//                           sv.name.trim() && !issue ? 'border-outline/20' : 'border-red-500/40'
//                         }`}
//                       />
//                       <input
//                         type="number"
//                         value={sv.value || ''}
//                         onChange={e => updateScenarioVariable(idx, 'value', parseFloat(e.target.value) || 0)}
//                         placeholder="Value"
//                         className="w-28 px-2 py-1.5 rounded-lg bg-surface-container border border-outline/20 text-xs text-on-surface font-mono text-right focus:outline-none"
//                       />
//                       <input
//                         type="text"
//                         value={sv.description ?? ''}
//                         onChange={e => updateScenarioVariable(idx, 'description', e.target.value)}
//                         placeholder="Description (optional)"
//                         className="flex-1 min-w-0 px-2 py-1.5 rounded-lg bg-surface-container border border-outline/20 text-[11px] text-on-surface-variant placeholder:text-on-surface-variant/30 focus:outline-none"
//                       />
//                       <button
//                         onClick={() => deleteScenarioVariable(idx)}
//                         className="p-1 rounded text-on-surface-variant/40 hover:text-red-400 transition-colors"
//                       >
//                         <Trash2 className="w-3 h-3" />
//                       </button>
//                     </div>
//                     <FieldError message={issue} />
//                   </div>
//                 );
//               })}
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// // ── Main Editor ───────────────────────────────────────────────────────────

// export function ScenarioBuilderEditor({ configId, onBack }: { configId: number; onBack: () => void }) {
//   const [config, setConfig] = useState<FullConfig | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);
//   const [computing, setComputing] = useState(false);
//   const [saveMsg, setSaveMsg] = useState<string | null>(null);
//   const [error, setError] = useState<string | null>(null);
//   const [step, setStep] = useState<Step>(1);
//   const [results, setResults] = useState<ComputedResults | null>(null);
//   const [showResults, setShowResults] = useState(false);

//   // ── Local editable state ──
//   const [name, setName] = useState('');
//   const [description, setDescription] = useState('');
//   const [year, setYear] = useState(new Date().getFullYear());
//   const [currencyLabel, setCurrencyLabel] = useState('GHS M');
//   const [globalVars, setGlobalVars] = useState<VariableItem[]>([]);
//   const [derivedMetrics, setDerivedMetrics] = useState<DerivedItem[]>([]);
//   const [scenarios, setScenarios] = useState<ScenarioItem[]>([]);
//   const [tableConfig, setTableConfig] = useState<TableConfig>({
//     display_metrics: [],
//     waterfall_metrics: [],
//     weights: { stress: 0.7, shock: 0.3, opportunity: 1.0 },
//   });

//   // Load config
//   useEffect(() => {
//     (async () => {
//       try {
//         const c = await getConfig(configId);
//         setConfig(c);
//         setName(c.name);
//         setDescription(c.description || '');
//         setYear(c.year);
//         setCurrencyLabel(c.currency_label);
//         setGlobalVars(c.global_variables || []);
//         setDerivedMetrics(c.derived_metrics || []);
//         setScenarios(c.scenarios || []);
//         setTableConfig(c.table_config || {
//           display_metrics: [],
//           waterfall_metrics: [],
//           weights: { stress: 0.7, shock: 0.3, opportunity: 1.0 },
//         });
//         if (c.computed_results) {
//           setResults(c.computed_results);
//         }
//       } catch (e) {
//         setError(e instanceof Error ? e.message : 'Failed to load');
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, [configId]);

//   // Names of base variables only (scenario overrides can only target these).
//   // Badly-formatted names are kept out of every dropdown so they can't break formulas.
//   const globalVarNames = useMemo(
//     () => globalVars.map(v => v.name).filter(isUsableName),
//     [globalVars]
//   );

//   // Names of derived metrics (usable ones only)
//   const derivedNames = useMemo(
//     () => derivedMetrics.map(d => d.name).filter(isUsableName),
//     [derivedMetrics]
//   );

//   // Base case formulas can use base variables + derived metrics (NOT scenario-only variables)
//   const allVarNames = useMemo(
//     () => [...globalVarNames, ...derivedNames],
//     [globalVarNames, derivedNames]
//   );

//   // Name issues per row
//   const globalNameIssues = useMemo(
//     () => globalVars.map((v, i) =>
//       nameIssue(v.name, globalVars.filter((_, j) => j !== i).map(x => x.name))
//     ),
//     [globalVars]
//   );

//   const derivedNameIssues = useMemo(
//     () => derivedMetrics.map((d, i) =>
//       nameIssue(d.name, [
//         ...globalVars.map(x => x.name),
//         ...derivedMetrics.filter((_, j) => j !== i).map(x => x.name),
//       ])
//     ),
//     [globalVars, derivedMetrics]
//   );

//   // Real base-case variable values (for live formula preview)
//   const baseVarValues = useMemo(() => {
//     const map: Record<string, number> = {};
//     globalVars.forEach(v => {
//       if (v.name.trim()) map[normalizeName(v.name)] = v.value;
//     });
//     return map;
//   }, [globalVars]);

//   // Live base case preview (cascaded)
//   const baseCasePreview = useMemo(() => {
//     const varMap: Record<string, number> = { ...baseVarValues };

//     const derivedResults: Record<string, { value: number | null; error: string | null }> = {};
//     derivedMetrics.forEach(dm => {
//       if (!dm.name.trim() || !dm.formula.trim()) return;
//       const result = evaluateFormula(dm.formula, varMap);
//       derivedResults[dm.name] = result;
//       if (result.value !== null) {
//         varMap[normalizeName(dm.name)] = result.value;
//       }
//     });

//     return { variables: varMap, derived: derivedResults };
//   }, [baseVarValues, derivedMetrics]);

//   // Live per-scenario cascade:
//   // base variables → this scenario's overrides → this scenario's own variables → metric formulas
//   const scenarioPreviews = useMemo(() => {
//     const out: Record<string, Record<string, number>> = {};
//     scenarios.forEach(sc => {
//       const varMap: Record<string, number> = { ...baseVarValues };
//       sc.overrides.forEach(ov => {
//         if (ov.name.trim()) varMap[normalizeName(ov.name)] = ov.value;
//       });
//       (sc.variables ?? []).forEach(sv => {
//         if (sv.name.trim()) varMap[normalizeName(sv.name)] = sv.value;
//       });
//       derivedMetrics.forEach(dm => {
//         if (!dm.name.trim()) return;
//         const f = dm.scenario_formulas?.[sc.id] || dm.formula;
//         if (!f?.trim()) return;
//         const r = evaluateFormula(f, varMap);
//         if (r.value !== null) varMap[normalizeName(dm.name)] = r.value;
//       });
//       out[sc.id] = varMap;
//     });
//     return out;
//   }, [scenarios, derivedMetrics, baseVarValues]);

//   // Save
//   const handleSave = useCallback(async () => {
//     setSaving(true);
//     setSaveMsg(null);
//     setError(null);
//     try {
//       await updateConfig(configId, {
//         name,
//         description,
//         currency_label: currencyLabel,
//         global_variables: globalVars,
//         derived_metrics: derivedMetrics,
//         scenarios,
//         table_config: tableConfig,
//       });
//       setSaveMsg('Saved!');
//       setTimeout(() => setSaveMsg(null), 2000);
//     } catch (e) {
//       setError(e instanceof Error ? e.message : 'Save failed');
//     } finally {
//       setSaving(false);
//     }
//   }, [configId, name, description, currencyLabel, globalVars, derivedMetrics, scenarios, tableConfig]);

//   // Compute
//   const handleCompute = useCallback(async () => {
//     setComputing(true);
//     setError(null);
//     try {
//       await updateConfig(configId, {
//         name,
//         description,
//         currency_label: currencyLabel,
//         global_variables: globalVars,
//         derived_metrics: derivedMetrics,
//         scenarios,
//         table_config: tableConfig,
//       });

//       const res = await computeConfig(configId, `Computed from UI on ${new Date().toLocaleString()}`);
//       setResults(res.results);
//       setShowResults(true);
//     } catch (e) {
//       setError(e instanceof Error ? e.message : 'Computation failed');
//     } finally {
//       setComputing(false);
//     }
//   }, [configId, name, description, currencyLabel, globalVars, derivedMetrics, scenarios, tableConfig]);

//   // Variable operations
//   const addGlobalVar = () => setGlobalVars(v => [...v, { name: '', value: 0, description: '' }]);
//   const updateGlobalVar = (idx: number, field: keyof VariableItem, value: string | number) => {
//     setGlobalVars(v => v.map((item, i) => i === idx ? { ...item, [field]: value } : item));
//   };
//   const deleteGlobalVar = (idx: number) => setGlobalVars(v => v.filter((_, i) => i !== idx));

//   // Derived operations
//   const addDerived = () => setDerivedMetrics(d => [...d, { name: '', formula: '', description: '', scenario_formulas: {} }]);
//   const updateDerived = (idx: number, field: keyof DerivedItem, value: string) => {
//     setDerivedMetrics(d => d.map((item, i) => i === idx ? { ...item, [field]: value } : item));
//   };
//   const updateScenarioFormula = (idx: number, scId: string, formula: string) => {
//     setDerivedMetrics(d => d.map((item, i) =>
//       i === idx ? { ...item, scenario_formulas: { ...(item.scenario_formulas ?? {}), [scId]: formula } } : item
//     ));
//   };
//   const deleteDerived = (idx: number) => setDerivedMetrics(d => d.filter((_, i) => i !== idx));

//   // Scenario operations
//   // auto-generate name so step completion check never falsely fails
//   const addScenario = useCallback((type: ScenarioItem['type']) => {
//     const label = SCENARIO_TYPE_META[type]?.label ?? type;
//     setScenarios(s => {
//       const count = s.filter(sc => sc.type === type).length + 1;
//       return [...s, {
//         id: genId(),
//         name: `${label} Scenario ${count}`,
//         type,
//         overrides: [],
//         variables: [],
//         derived: [],
//       }];
//     });
//   }, []);

//   // wrapped in useCallback to prevent stale-closure overwrites
//   const updateScenario = useCallback((id: string, updated: ScenarioItem) => {
//     setScenarios(s => s.map(sc => sc.id === id ? updated : sc));
//   }, []);

//   const deleteScenario = useCallback((id: string) => {
//     setScenarios(s => s.filter(sc => sc.id !== id));
//   }, []);

//   // Step completion checks
//   // Step order: 1 Variables → 2 Scenarios → 3 Derived Metrics → 4 Table Config → 5 Calculate
//   const step1Complete =
//     globalVars.length > 0 &&
//     globalVars.every((v, i) => v.name.trim() && !globalNameIssues[i]);
//   const step2Complete =
//     scenarios.length > 0 &&
//     scenarios.every(s => {
//       const issues = scenarioVarIssues(s, globalVarNames, derivedNames);
//       return s.name.trim() && (s.variables ?? []).every((v, i) => v.name.trim() && !issues[i]);
//     });
//   const step3Complete =
//     derivedMetrics.length > 0 &&
//     derivedMetrics.every((d, i) =>
//       d.name.trim() && !derivedNameIssues[i] && d.formula.trim() &&
//       scenarios.every(sc => (d.scenario_formulas?.[sc.id] ?? '').trim())
//     );
//   const step4Complete = tableConfig.display_metrics.length > 0;

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center py-24">
//         <div className="w-6 h-6 border-2 border-mtn-yellow/30 border-t-mtn-yellow rounded-full animate-spin" />
//       </div>
//     );
//   }

//   // ── Results View ──
//   if (showResults && results) {
//     return (
//       <div className="space-y-6 pb-12 animate-in fade-in duration-500">
//         <div className="flex items-center gap-3">
//           <button
//             onClick={() => setShowResults(false)}
//             className="flex items-center gap-2 px-3 py-2 rounded-lg border border-outline/20 text-on-surface-variant hover:text-on-surface transition-colors font-mono text-[10px] uppercase tracking-widest"
//           >
//             <ArrowLeft className="w-3.5 h-3.5" /> Back to Editor
//           </button>
//           <h2 className="font-sans text-lg font-bold text-on-surface">{name} — Results</h2>
//         </div>
//         <SBResultsView
//           results={results}
//           scenarios={scenarios}
//           currencyLabel={currencyLabel}
//         />
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-6 pb-12 animate-in fade-in duration-500">
//       {/* Top Bar */}
//       <div className="flex items-center gap-3 flex-wrap">
//         <button
//           onClick={onBack}
//           className="flex items-center gap-2 px-3 py-2 rounded-lg border border-outline/20 text-on-surface-variant hover:text-on-surface transition-colors"
//         >
//           <ArrowLeft className="w-4 h-4" />
//         </button>

//         <div className="flex-1 min-w-0">
//           <input
//             type="text"
//             value={name}
//             onChange={e => setName(e.target.value)}
//             className="w-full bg-transparent font-sans text-lg font-bold text-on-surface focus:outline-none"
//             placeholder="Configuration name…"
//           />
//         </div>

//         <div className="flex items-center gap-2">
//           <input
//             type="number"
//             value={year}
//             onChange={e => setYear(parseInt(e.target.value) || new Date().getFullYear())}
//             className="w-20 px-2 py-1.5 rounded-lg bg-surface-container border border-outline/20 text-xs text-on-surface font-mono text-center focus:outline-none"
//           />
//           <input
//             type="text"
//             value={currencyLabel}
//             onChange={e => setCurrencyLabel(e.target.value)}
//             placeholder="Unit"
//             className="w-20 px-2 py-1.5 rounded-lg bg-surface-container border border-outline/20 text-xs text-on-surface font-mono text-center focus:outline-none"
//           />

//           {saveMsg && (
//             <span className="flex items-center gap-1 text-green-400 font-mono text-[10px]">
//               <CheckCircle className="w-3 h-3" /> {saveMsg}
//             </span>
//           )}

//           <button
//             onClick={handleSave}
//             disabled={saving}
//             className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline/20 text-on-surface-variant hover:text-on-surface hover:border-outline/40 transition-colors font-mono text-[10px] uppercase tracking-widest disabled:opacity-50"
//           >
//             <Save className="w-3.5 h-3.5" />
//             {saving ? 'Saving…' : 'Save Draft'}
//           </button>

//           {results && (
//             <button
//               onClick={() => setShowResults(true)}
//               className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-colors font-mono text-[10px] uppercase tracking-widest"
//             >
//               <Eye className="w-3.5 h-3.5" /> View Results
//             </button>
//           )}
//         </div>
//       </div>

//       {/* Error */}
//       {error && (
//         <div className="rounded-lg bg-error/10 border border-error/30 p-3 flex gap-2">
//           <AlertTriangle className="w-3.5 h-3.5 text-error shrink-0 mt-0.5" />
//           <p className="font-sans text-xs text-error">{error}</p>
//         </div>
//       )}

//       {/* Step Navigation */}
//       <div className="flex flex-wrap gap-2">
//         <StepBadge step={1} label="Variables" active={step === 1} completed={step1Complete} onClick={() => setStep(1)} />
//         <StepBadge step={2} label="Scenarios" active={step === 2} completed={step2Complete} onClick={() => setStep(2)} />
//         <StepBadge step={3} label="Derived Metrics" active={step === 3} completed={step3Complete} onClick={() => setStep(3)} />
//         <StepBadge step={4} label="Table Config" active={step === 4} completed={step4Complete} onClick={() => setStep(4)} />
//         <StepBadge step={5} label="Calculate" active={step === 5} completed={!!results} onClick={() => setStep(5)} />
//       </div>

//       {/* ═══════════════════════════════════════════════════════════════════ */}
//       {/* Step 1: Global Variables */}
//       {step === 1 && (
//         <div className="space-y-4">
//           <div className="rounded-xl border border-outline/20 bg-surface-container-low p-5">
//             <div className="flex items-start gap-3 mb-4">
//               <Variable className="w-5 h-5 text-mtn-yellow shrink-0 mt-0.5" />
//               <div>
//                 <p className="font-sans text-sm font-semibold text-on-surface">Global & Base Case Variables</p>
//                 <p className="text-xs text-on-surface-variant mt-0.5">
//                   Define all input variables and their base case values. These are the raw inputs that
//                   your derived formulas will reference. Variable names become formula identifiers
//                   (spaces become underscores, case-insensitive).
//                 </p>
//               </div>
//             </div>

//             <NameTip className="mb-4" />

//             <div className="space-y-2">
//               {globalVars.map((v, i) => (
//                 <VariableRow
//                   key={i}
//                   item={v}
//                   index={i}
//                   nameError={globalNameIssues[i]}
//                   onChange={updateGlobalVar}
//                   onDelete={deleteGlobalVar}
//                 />
//               ))}
//             </div>

//             <button
//               onClick={addGlobalVar}
//               className="mt-3 flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-outline/20 text-on-surface-variant hover:text-mtn-yellow hover:border-mtn-yellow/30 transition-colors font-mono text-[10px] uppercase tracking-widest w-full justify-center"
//             >
//               <Plus className="w-3.5 h-3.5" /> Add Variable
//             </button>
//           </div>

//           {/* Live preview of variable names */}
//           {globalVars.length > 0 && (
//             <div className="rounded-lg border border-outline/10 bg-surface-container-low/50 p-3">
//               <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant mb-2">
//                 Available in formulas:
//               </p>
//               <div className="flex flex-wrap gap-1.5">
//                 {globalVars.filter(v => isUsableName(v.name)).map((v, i) => (
//                   <span key={i} className="px-2 py-0.5 rounded bg-surface-container border border-outline/20 font-mono text-[10px] text-on-surface">
//                     {normalizeName(v.name)} <span className="text-on-surface-variant">= {v.value}</span>
//                   </span>
//                 ))}
//               </div>
//             </div>
//           )}

//           <div className="flex justify-end">
//             <button
//               onClick={() => setStep(2)}
//               className="px-4 py-2 rounded-lg bg-mtn-yellow text-black font-mono text-[10px] uppercase tracking-widest font-bold hover:bg-mtn-yellow/90 transition-colors"
//             >
//               Next: Scenarios →
//             </button>
//           </div>
//         </div>
//       )}

//       {/* ═══════════════════════════════════════════════════════════════════ */}
//       {/* Step 2: Scenarios (overrides + scenario-only variables) */}
//       {step === 2 && (
//         <div className="space-y-4">
//           <div className="rounded-xl border border-outline/20 bg-surface-container-low p-5">
//             <div className="flex items-start gap-3 mb-4">
//               <FlaskConical className="w-5 h-5 text-mtn-yellow shrink-0 mt-0.5" />
//               <div>
//                 <p className="font-sans text-sm font-semibold text-on-surface">Define Scenarios</p>
//                 <p className="text-xs text-on-surface-variant mt-0.5">
//                   Create stress, shock, and opportunity scenarios. Each scenario can overwrite base case
//                   variables and/or define its own new variables. Both apply only to that scenario.
//                   You will define each metric&apos;s calculation for every scenario in the next step.
//                 </p>
//               </div>
//             </div>

//             <NameTip className="mb-4" />

//             {/* Add scenario buttons */}
//             <div className="flex gap-2 mb-4 flex-wrap">
//               <button
//                 onClick={() => addScenario('stress')}
//                 className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-mtn-yellow/30 bg-mtn-yellow/5 text-mtn-yellow font-mono text-[10px] uppercase tracking-widest hover:bg-mtn-yellow/10 transition-colors"
//               >
//                 <ShieldAlert className="w-3 h-3" /> + Stress Scenario
//               </button>
//               <button
//                 onClick={() => addScenario('shock')}
//                 className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/5 text-red-400 font-mono text-[10px] uppercase tracking-widest hover:bg-red-500/10 transition-colors"
//               >
//                 <Zap className="w-3 h-3" /> + Shock Scenario
//               </button>
//               <button
//                 onClick={() => addScenario('opportunity')}
//                 className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-green-500/30 bg-green-500/5 text-green-400 font-mono text-[10px] uppercase tracking-widest hover:bg-green-500/10 transition-colors"
//               >
//                 <TrendingUp className="w-3 h-3" /> + Opportunity Scenario
//               </button>
//             </div>

//             {/* Scenario list */}
//             <div className="space-y-3">
//               {scenarios.length === 0 && (
//                 <div className="text-center py-8 rounded-lg border border-dashed border-outline/15">
//                   <p className="text-xs text-on-surface-variant/50">No scenarios defined yet</p>
//                 </div>
//               )}
//               {(['stress', 'shock', 'opportunity'] as const).map(type => {
//                 const typeScenarios = scenarios.filter(s => s.type === type);
//                 if (typeScenarios.length === 0) return null;
//                 const meta = SCENARIO_TYPE_META[type];
//                 return (
//                   <div key={type} className="space-y-2">
//                     <p className={`font-mono text-[9px] uppercase tracking-widest text-${meta.color}`}>
//                       {meta.label} Scenarios ({typeScenarios.length})
//                     </p>
//                     {typeScenarios.map(sc => (
//                       <ScenarioCard
//                         key={sc.id}
//                         scenario={sc}
//                         allVariableNames={globalVarNames}
//                         derivedNames={derivedNames}
//                         onUpdate={updated => updateScenario(sc.id, updated)}
//                         onDelete={() => deleteScenario(sc.id)}
//                       />
//                     ))}
//                   </div>
//                 );
//               })}
//             </div>
//           </div>

//           <div className="flex justify-between">
//             <button
//               onClick={() => setStep(1)}
//               className="px-4 py-2 rounded-lg border border-outline/20 text-on-surface-variant font-mono text-[10px] uppercase tracking-widest hover:text-on-surface hover:border-outline/40 transition-colors"
//             >
//               ← Variables
//             </button>
//             <button
//               onClick={() => setStep(3)}
//               className="px-4 py-2 rounded-lg bg-mtn-yellow text-black font-mono text-[10px] uppercase tracking-widest font-bold hover:bg-mtn-yellow/90 transition-colors"
//             >
//               Next: Derived Metrics →
//             </button>
//           </div>
//         </div>
//       )}

//       {/* ═══════════════════════════════════════════════════════════════════ */}
//       {/* Step 3: Derived Metrics (collapsible; Base Case + every scenario) */}
//       {step === 3 && (
//         <div className="space-y-4">
//           <div className="rounded-xl border border-outline/20 bg-surface-container-low p-5">
//             <div className="flex items-start gap-3 mb-4">
//               <FunctionSquare className="w-5 h-5 text-mtn-yellow shrink-0 mt-0.5" />
//               <div>
//                 <p className="font-sans text-sm font-semibold text-on-surface">Derived Metrics & Calculation Map</p>
//                 <p className="text-xs text-on-surface-variant mt-0.5">
//                   These metrics fill the output tables. Click the arrow on a metric to expand it and
//                   define the Base Case calculation and its calculation under every scenario. A
//                   scenario&apos;s formula can use the base variables (with that scenario&apos;s overrides
//                   applied), that scenario&apos;s own variables, and metrics listed above. Every metric
//                   must be filled for the Base Case and all {scenarios.length} scenario(s).
//                 </p>
//               </div>
//             </div>

//             <NameTip className="mb-4" />

//             {scenarios.length === 0 && (
//               <div className="rounded-lg bg-mtn-yellow/5 border border-mtn-yellow/20 p-3 mb-3 flex gap-2">
//                 <AlertTriangle className="w-3.5 h-3.5 text-mtn-yellow shrink-0 mt-0.5" />
//                 <p className="text-xs text-mtn-yellow">Define scenarios in Step 2 first so each metric can have a value per scenario.</p>
//               </div>
//             )}

//             <div className="space-y-3">
//               {derivedMetrics.map((d, i) => (
//                 <DerivedRow
//                   key={i}
//                   item={d}
//                   index={i}
//                   scenarios={scenarios}
//                   availableVars={allVarNames}
//                   globalVarNames={globalVarNames}
//                   derivedNames={derivedNames}
//                   baseVarValues={baseVarValues}
//                   baseTestValues={baseCasePreview.variables}
//                   scenarioTestValues={scenarioPreviews}
//                   nameError={derivedNameIssues[i]}
//                   onChange={updateDerived}
//                   onChangeScenarioFormula={updateScenarioFormula}
//                   onDelete={deleteDerived}
//                 />
//               ))}
//             </div>

//             <button
//               onClick={addDerived}
//               className="mt-3 flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-outline/20 text-on-surface-variant hover:text-mtn-yellow hover:border-mtn-yellow/30 transition-colors font-mono text-[10px] uppercase tracking-widest w-full justify-center"
//             >
//               <Plus className="w-3.5 h-3.5" /> Add Derived Metric
//             </button>
//           </div>

//           {/* Live matrix preview: metrics × (Base Case + scenarios) */}
//           {derivedMetrics.some(d => d.name.trim()) && (
//             <div className="rounded-xl border border-outline/20 bg-surface-container-low p-4 overflow-x-auto">
//               <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant mb-3">
//                 Live Matrix Preview
//               </p>
//               <table className="w-full text-left text-[11px] font-mono">
//                 <thead>
//                   <tr className="border-b border-outline/10">
//                     <th className="p-2 text-on-surface-variant">Metric</th>
//                     <th className="p-2 text-blue-400">Base Case</th>
//                     {scenarios.map(sc => (
//                       <th key={sc.id} className="p-2 text-on-surface-variant">{sc.name || sc.id}</th>
//                     ))}
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {derivedMetrics.filter(d => d.name.trim()).map(d => {
//                     const key = normalizeName(d.name);
//                     const fmt = (v: number | undefined) => (v === undefined ? '—' : v.toFixed(2));
//                     return (
//                       <tr key={key} className="border-b border-outline/5">
//                         <td className="p-2 text-on-surface">{d.name}</td>
//                         <td className="p-2 text-green-400">{d.formula.trim() ? fmt(baseCasePreview.variables[key]) : '—'}</td>
//                         {scenarios.map(sc => (
//                           <td key={sc.id} className="p-2 text-on-surface-variant">
//                             {(d.scenario_formulas?.[sc.id] ?? '').trim() ? fmt(scenarioPreviews[sc.id]?.[key]) : '—'}
//                           </td>
//                         ))}
//                       </tr>
//                     );
//                   })}
//                 </tbody>
//               </table>
//             </div>
//           )}

//           <div className="flex justify-between">
//             <button
//               onClick={() => setStep(2)}
//               className="px-4 py-2 rounded-lg border border-outline/20 text-on-surface-variant font-mono text-[10px] uppercase tracking-widest hover:text-on-surface hover:border-outline/40 transition-colors"
//             >
//               ← Scenarios
//             </button>
//             <button
//               onClick={() => setStep(4)}
//               className="px-4 py-2 rounded-lg bg-mtn-yellow text-black font-mono text-[10px] uppercase tracking-widest font-bold hover:bg-mtn-yellow/90 transition-colors"
//             >
//               Next: Table Config →
//             </button>
//           </div>
//         </div>
//       )}

//       {/* ═══════════════════════════════════════════════════════════════════ */}
//       {/* Step 4: Table & Output Configuration */}
//       {step === 4 && (
//         <div className="space-y-4">
//           <div className="rounded-xl border border-outline/20 bg-surface-container-low p-5">
//             <div className="flex items-start gap-3 mb-4">
//               <Settings2 className="w-5 h-5 text-mtn-yellow shrink-0 mt-0.5" />
//               <div>
//                 <p className="font-sans text-sm font-semibold text-on-surface">Table & Output Configuration</p>
//                 <p className="text-xs text-on-surface-variant mt-0.5">
//                   Choose which metrics appear in your output tables and waterfall charts,
//                   and set the probability weights for each scenario type.
//                 </p>
//               </div>
//             </div>

//             {/* Display Metrics */}
//             <div className="mb-6">
//               <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant mb-2">
//                 Table Metrics (select which derived metrics to display)
//               </p>
//               <div className="flex flex-wrap gap-2">
//                 {derivedMetrics.filter(d => d.name.trim()).map(d => {
//                   const selected = tableConfig.display_metrics.includes(d.name);
//                   return (
//                     <button
//                       key={d.name}
//                       onClick={() => {
//                         setTableConfig(tc => ({
//                           ...tc,
//                           display_metrics: selected
//                             ? tc.display_metrics.filter(m => m !== d.name)
//                             : [...tc.display_metrics, d.name],
//                         }));
//                       }}
//                       className={`px-3 py-1.5 rounded-lg font-mono text-[10px] transition-colors ${
//                         selected
//                           ? 'bg-mtn-yellow/10 border border-mtn-yellow/40 text-mtn-yellow'
//                           : 'border border-outline/20 text-on-surface-variant hover:text-on-surface hover:border-outline/40'
//                       }`}
//                     >
//                       {d.name}
//                     </button>
//                   );
//                 })}
//                 {derivedMetrics.filter(d => d.name.trim()).length === 0 && (
//                   <p className="text-xs text-on-surface-variant/50 italic">Define derived metrics first (Step 3)</p>
//                 )}
//               </div>

//               {/* Quick select all */}
//               {derivedMetrics.filter(d => d.name.trim()).length > 0 && (
//                 <button
//                   onClick={() => {
//                     setTableConfig(tc => ({
//                       ...tc,
//                       display_metrics: derivedMetrics.filter(d => d.name.trim()).map(d => d.name),
//                     }));
//                   }}
//                   className="mt-2 text-[9px] font-mono text-mtn-yellow hover:underline"
//                 >
//                   Select All
//                 </button>
//               )}
//             </div>

//             {/* Waterfall Metrics */}
//             <div className="mb-6">
//               <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant mb-2">
//                 Waterfall Chart Metrics (the cascade order: e.g. Revenue → EBITDA → PAT)
//               </p>
//               <div className="flex flex-wrap gap-2">
//                 {tableConfig.display_metrics.map(m => {
//                   const inWaterfall = tableConfig.waterfall_metrics.includes(m);
//                   return (
//                     <button
//                       key={m}
//                       onClick={() => {
//                         setTableConfig(tc => ({
//                           ...tc,
//                           waterfall_metrics: inWaterfall
//                             ? tc.waterfall_metrics.filter(w => w !== m)
//                             : [...tc.waterfall_metrics, m],
//                         }));
//                       }}
//                       className={`px-3 py-1.5 rounded-lg font-mono text-[10px] transition-colors ${
//                         inWaterfall
//                           ? 'bg-blue-500/10 border border-blue-500/40 text-blue-400'
//                           : 'border border-outline/20 text-on-surface-variant hover:text-on-surface hover:border-outline/40'
//                       }`}
//                     >
//                       {inWaterfall && <span className="mr-1 text-[8px]">{tableConfig.waterfall_metrics.indexOf(m) + 1}.</span>}
//                       {m}
//                     </button>
//                   );
//                 })}
//               </div>
//             </div>

//             {/* Probability Weights */}
//             <div>
//               <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant mb-2">
//                 Probability Weights (for Table 2 — weighted impact matrix)
//               </p>
//               <div className="grid grid-cols-3 gap-3">
//                 {(['stress', 'shock', 'opportunity'] as const).map(type => {
//                   const meta = SCENARIO_TYPE_META[type];
//                   return (
//                     <div key={type} className={`rounded-lg border ${meta.borderClass} ${meta.bgClass} p-3`}>
//                       <p className={`font-mono text-[9px] uppercase tracking-widest text-${meta.color} mb-1.5`}>
//                         {meta.label} Weight
//                       </p>
//                       <input
//                         type="number"
//                         step="0.05"
//                         min="0"
//                         max="1"
//                         value={tableConfig.weights[type] ?? 1}
//                         onChange={e => {
//                           setTableConfig(tc => ({
//                             ...tc,
//                             weights: { ...tc.weights, [type]: parseFloat(e.target.value) || 0 },
//                           }));
//                         }}
//                         className="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline/20 text-sm text-on-surface font-mono text-center focus:outline-none"
//                       />
//                     </div>
//                   );
//                 })}
//               </div>
//             </div>
//           </div>

//           <div className="flex justify-between">
//             <button
//               onClick={() => setStep(3)}
//               className="px-4 py-2 rounded-lg border border-outline/20 text-on-surface-variant font-mono text-[10px] uppercase tracking-widest hover:text-on-surface hover:border-outline/40 transition-colors"
//             >
//               ← Derived Metrics
//             </button>
//             <button
//               onClick={() => setStep(5)}
//               className="px-4 py-2 rounded-lg bg-mtn-yellow text-black font-mono text-[10px] uppercase tracking-widest font-bold hover:bg-mtn-yellow/90 transition-colors"
//             >
//               Next: Calculate →
//             </button>
//           </div>
//         </div>
//       )}

//       {/* ═══════════════════════════════════════════════════════════════════ */}
//       {/* Step 5: Calculate */}
//       {step === 5 && (
//         <div className="space-y-4">
//           {/* Summary */}
//           <div className="rounded-xl border border-outline/20 bg-surface-container-low p-5">
//             <p className="font-sans text-sm font-semibold text-on-surface mb-3">Configuration Summary</p>
//             <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
//               <div className="rounded-lg border border-outline/15 p-3 text-center">
//                 <p className="font-mono text-lg font-bold text-on-surface">{globalVars.length}</p>
//                 <p className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant mt-0.5">Variables</p>
//               </div>
//               <div className="rounded-lg border border-outline/15 p-3 text-center">
//                 <p className="font-mono text-lg font-bold text-on-surface">{derivedMetrics.length}</p>
//                 <p className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant mt-0.5">Derived Metrics</p>
//               </div>
//               <div className="rounded-lg border border-outline/15 p-3 text-center">
//                 <p className="font-mono text-lg font-bold text-on-surface">{scenarios.length}</p>
//                 <p className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant mt-0.5">Scenarios</p>
//               </div>
//               <div className="rounded-lg border border-outline/15 p-3 text-center">
//                 <p className="font-mono text-lg font-bold text-on-surface">{tableConfig.display_metrics.length}</p>
//                 <p className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant mt-0.5">Output Metrics</p>
//               </div>
//             </div>

//             {/* Scenario breakdown */}
//             <div className="mt-4 flex gap-3 flex-wrap">
//               {(['stress', 'shock', 'opportunity'] as const).map(type => {
//                 const count = scenarios.filter(s => s.type === type).length;
//                 const meta = SCENARIO_TYPE_META[type];
//                 const Icon = meta.icon;
//                 return (
//                   <div key={type} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${meta.borderClass} ${meta.bgClass}`}>
//                     <Icon className={`w-3 h-3 text-${meta.color}`} />
//                     <span className={`font-mono text-[9px] text-${meta.color}`}>{count} {meta.label}</span>
//                   </div>
//                 );
//               })}
//             </div>
//           </div>

//           {/* Warnings */}
//           {!step1Complete && (
//             <div className="rounded-lg bg-mtn-yellow/5 border border-mtn-yellow/20 p-3 flex gap-2">
//               <AlertTriangle className="w-3.5 h-3.5 text-mtn-yellow shrink-0 mt-0.5" />
//               <p className="text-xs text-mtn-yellow">Step 1 incomplete: Define at least one variable, and make sure every name is valid and unique (start with a letter; letters, numbers, spaces and _ only).</p>
//             </div>
//           )}
//           {!step2Complete && (
//             <div className="rounded-lg bg-mtn-yellow/5 border border-mtn-yellow/20 p-3 flex gap-2">
//               <AlertTriangle className="w-3.5 h-3.5 text-mtn-yellow shrink-0 mt-0.5" />
//               <p className="text-xs text-mtn-yellow">Step 2 incomplete: Define at least one scenario with a name, and give every scenario variable a valid, unique name.</p>
//             </div>
//           )}
//           {!step3Complete && (
//             <div className="rounded-lg bg-mtn-yellow/5 border border-mtn-yellow/20 p-3 flex gap-2">
//               <AlertTriangle className="w-3.5 h-3.5 text-mtn-yellow shrink-0 mt-0.5" />
//               <p className="text-xs text-mtn-yellow">Step 3 incomplete: Every derived metric needs a valid, unique name, a base case formula, and a formula for each scenario.</p>
//             </div>
//           )}

//           {/* Calculate Button */}
//           <button
//             onClick={handleCompute}
//             disabled={computing || !step1Complete || !step2Complete || !step3Complete}
//             className={`w-full py-4 rounded-xl font-mono font-bold text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed ${
//               computing
//                 ? 'bg-mtn-yellow/70 text-black'
//                 : 'bg-mtn-yellow text-black hover:bg-mtn-yellow/90'
//             }`}
//           >
//             {computing ? (
//               <>
//                 <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
//                 Saving & Computing…
//               </>
//             ) : (
//               <>
//                 <Play className="w-4 h-4 fill-black" />
//                 Save & Calculate All Scenarios
//               </>
//             )}
//           </button>

//           <div className="rounded-lg border border-outline/10 bg-surface-container-low/50 p-3 flex gap-2">
//             <Info className="w-3.5 h-3.5 text-on-surface-variant shrink-0 mt-0.5" />
//             <p className="text-[10px] text-on-surface-variant leading-relaxed">
//               This will save your configuration, run all {scenarios.length} scenario calculations on the server,
//               and create a versioned snapshot for audit tracking. All data is preserved in the database.
//             </p>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }




// // frontend/components/scenarioBuilder/ScenarioBuilderEditor.tsx

// 'use client';

// import { useState, useEffect, useCallback, useMemo } from 'react';
// import {
//   ArrowLeft, Save, Play, Plus, Trash2, GripVertical, CheckCircle,
//   AlertTriangle, ChevronDown, ChevronRight, Info, Variable,
//   FunctionSquare, ShieldAlert, Zap, TrendingUp, Settings2,
//   Eye, FlaskConical, Delete, Lock, TableProperties,
// } from 'lucide-react';
// import {
//   getConfig, updateConfig, computeConfig,
//   type FullConfig, type VariableItem, type DerivedItem,
//   type ScenarioItem, type ScenarioOverride, type ScenarioVariable,
//   type TableConfig, type ComputedResults,
//   type WeightedMetric, type SectionMetric, type SectionKey,
// } from '@/lib/scenarioBuilder';
// import { evaluateFormula, normalizeName } from '@/lib/scenarioBuilder/formulaEngine';
// import { SBResultsView } from '@/components/scenarioBuilder/SBResultsView';

// // ── Helpers ───────────────────────────────────────────────────────────────

// function genId(): string {
//   return `sc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
// }

// const SCENARIO_TYPE_META = {
//   stress: { label: 'Stress', icon: ShieldAlert, color: 'mtn-yellow', borderClass: 'border-mtn-yellow/30', bgClass: 'bg-mtn-yellow/5' },
//   shock: { label: 'Shock', icon: Zap, color: 'red-400', borderClass: 'border-red-500/30', bgClass: 'bg-red-500/5' },
//   opportunity: { label: 'Opportunity', icon: TrendingUp, color: 'green-400', borderClass: 'border-green-500/30', bgClass: 'bg-green-500/5' },
// } as const;

// type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

// const TYPE_ORDER: Record<string, number> = { stress: 0, shock: 1, opportunity: 2 };

// function typeTextClass(type: string): string {
//   if (type === 'stress') return 'text-mtn-yellow';
//   if (type === 'shock') return 'text-red-400';
//   return 'text-green-400';
// }

// /** The four stage-7 sections. Each becomes its own table and waterfall chart. */
// const SECTION_META: {
//   key: SectionKey; table: string; title: string; desc: string;
//   border: string; bg: string; text: string;
// }[] = [
//   {
//     key: 'stress', table: 'Table 3', title: 'Stress',
//     desc: 'All stress scenarios grouped into one table.',
//     border: 'border-mtn-yellow/30', bg: 'bg-mtn-yellow/5', text: 'text-mtn-yellow',
//   },
//   {
//     key: 'shock', table: 'Table 4', title: 'Shock',
//     desc: 'All shock scenarios grouped into one table.',
//     border: 'border-red-500/30', bg: 'bg-red-500/5', text: 'text-red-400',
//   },
//   {
//     key: 'opportunity', table: 'Table 5', title: 'Opportunities (holding all other constant)',
//     desc: 'Opportunity scenarios on their own, everything else held constant.',
//     border: 'border-green-500/30', bg: 'bg-green-500/5', text: 'text-green-400',
//   },
//   {
//     key: 'combined', table: 'Table 6', title: 'Opportunities (considering stress scenarios)',
//     desc: 'Opportunity scenarios combined with the stress scenarios.',
//     border: 'border-blue-500/30', bg: 'bg-blue-500/5', text: 'text-blue-400',
//   },
// ];

// /** De-duplicate a list of variable names by their normalized form (first spelling wins). */
// function uniqueNames(names: string[]): string[] {
//   const seen = new Map<string, string>();
//   names.forEach(n => {
//     const key = normalizeName(n);
//     if (key && !seen.has(key)) seen.set(key, n);
//   });
//   return Array.from(seen.values());
// }

// // ── Stage variables (MUST match the backend's _stage_tokens) ─────────────

// /** lowercase, every run of non [a-z0-9] characters → "_", trim "_" at the ends. */
// function slug(s: string): string {
//   return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
// }

// interface StageVar {
//   token: string;                   // safe formula identifier
//   label: string;                   // human-readable, shown in dropdowns
//   value: number | undefined;
// }

// /**
//  * Variables a table exposes to the NEXT stage:
//  *   "<metric> base case"            → <metric>_base_case
//  *   "<metric> <scenario name>"      → <metric>_<scenario_name>
//  * `col` is "base" or a scenario id.
//  */
// function buildStageVars(
//   metricNames: string[],
//   scenarios: ScenarioItem[],
//   valueOf: (metricIdx: number, col: string) => number | undefined,
// ): StageVar[] {
//   const used = new Set<string>();
//   const uniq = (t: string) => {
//     let candidate = t;
//     let i = 2;
//     while (used.has(candidate)) { candidate = `${t}_${i}`; i++; }
//     used.add(candidate);
//     return candidate;
//   };

//   const out: StageVar[] = [];
//   metricNames.forEach((m, mi) => {
//     const ms = slug(m);
//     out.push({
//       token: uniq(`${ms}_base_case`),
//       label: `${m} base case`,
//       value: valueOf(mi, 'base'),
//     });
//     scenarios.forEach(sc => {
//       const ss = slug(sc.name || '') || slug(sc.id);
//       out.push({
//         token: uniq(`${ms}_${ss}`),
//         label: `${m} ${sc.name || sc.id}`,
//         value: valueOf(mi, sc.id),
//       });
//     });
//   });
//   return out;
// }

// function evalCell(f: string | undefined, map: Record<string, number>): number | undefined {
//   if (!f || !f.trim()) return undefined;
//   const r = evaluateFormula(f, map);
//   return r.value === null ? undefined : r.value;
// }

// // ── Name validation (variables, scenario variables, derived metrics) ─────

// // Function names the formula engine reserves
// const RESERVED_NAMES = new Set(['abs', 'min', 'max', 'round', 'sqrt']);

// /**
//  * Format check for a name. Names become formula identifiers, so they must
//  * start with a letter/underscore and contain only letters, digits, spaces, "_".
//  * Returns null when valid (or empty — "required" is handled separately).
//  */
// function validateName(raw: string): string | null {
//   const n = raw.trim();
//   if (!n) return null;
//   if (!/^[A-Za-z_]/.test(n)) {
//     return 'Must start with a letter (use payout_2025, not 2025 payout).';
//   }
//   if (!/^[A-Za-z0-9_ ]+$/.test(n)) {
//     return 'Only letters, numbers, spaces and _ are allowed (no %, -, or other symbols).';
//   }
//   if (RESERVED_NAMES.has(normalizeName(n))) {
//     return `"${n}" is a reserved function name — pick another.`;
//   }
//   return null;
// }

// /** Format check + duplicate check against names that are already taken. */
// function nameIssue(raw: string, taken: string[]): string | null {
//   const base = validateName(raw);
//   if (base) return base;
//   if (!raw.trim()) return null;
//   const key = normalizeName(raw);
//   if (taken.some(t => t.trim() && normalizeName(t) === key)) {
//     return 'This name is already used by another variable or metric.';
//   }
//   return null;
// }

// /** Name issues for every scenario-only variable in one scenario. */
// function scenarioVarIssues(sc: ScenarioItem, globalNames: string[], derivedNames: string[]): (string | null)[] {
//   const vars = sc.variables ?? [];
//   return vars.map((v, i) =>
//     nameIssue(v.name, [
//       ...globalNames,
//       ...derivedNames,
//       ...vars.filter((_, j) => j !== i).map(x => x.name),
//     ])
//   );
// }

// /** A name that is non-empty and well-formed (used to keep bad names out of dropdowns). */
// function isUsableName(n: string): boolean {
//   return !!n.trim() && validateName(n) === null;
// }

// /** Short naming guide shown wherever the user types a name. */
// function NameTip({ className = '' }: { className?: string }) {
//   return (
//     <div className={`rounded-lg bg-blue-500/5 border border-blue-500/20 px-3 py-2 flex gap-2 ${className}`}>
//       <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
//       <p className="text-[10px] text-blue-400 leading-relaxed">
//         <strong>Naming tip:</strong> start with a letter, then use only letters, numbers, spaces or{' '}
//         <code>_</code>. Good: <code>payout_2025</code>, <code>mgmt fees pct</code>. Avoid:{' '}
//         <code>2025 payout</code>, <code>fees_%</code>, <code>cost-ratio</code>.
//       </p>
//     </div>
//   );
// }

// function FieldError({ message }: { message: string | null | undefined }) {
//   if (!message) return null;
//   return (
//     <p className="flex items-start gap-1 mt-1 text-[10px] text-red-400 leading-snug">
//       <AlertTriangle className="w-3 h-3 shrink-0 mt-px" />
//       <span>{message}</span>
//     </p>
//   );
// }

// // ── Step Badge ─────────────────────────────────────────────────────────────

// function StepBadge({ step, label, active, completed, onClick }: {
//   step: number; label: string; active: boolean; completed: boolean; onClick: () => void;
// }) {
//   return (
//     <button
//       onClick={onClick}
//       className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-left ${
//         active
//           ? 'bg-mtn-yellow/10 border border-mtn-yellow/30'
//           : completed
//             ? 'bg-green-500/5 border border-green-500/20 hover:border-green-500/40'
//             : 'border border-outline/15 hover:border-outline/30'
//       }`}
//     >
//       <div className={`flex items-center justify-center w-6 h-6 rounded-full font-mono text-xs font-bold shrink-0 ${
//         active
//           ? 'bg-mtn-yellow text-black'
//           : completed
//             ? 'bg-green-500 text-black'
//             : 'bg-surface-container text-on-surface-variant'
//       }`}>
//         {completed && !active ? '✓' : step}
//       </div>
//       <span className={`font-mono text-[10px] uppercase tracking-widest ${
//         active ? 'text-mtn-yellow' : completed ? 'text-green-400' : 'text-on-surface-variant'
//       }`}>
//         {label}
//       </span>
//     </button>
//   );
// }

// // ── Variable Row ──────────────────────────────────────────────────────────

// function VariableRow({ item, index, nameError, onChange, onDelete }: {
//   item: VariableItem; index: number;
//   nameError?: string | null;
//   onChange: (index: number, field: keyof VariableItem, value: string | number) => void;
//   onDelete: (index: number) => void;
// }) {
//   return (
//     <div className="group">
//       <div className="flex items-center gap-2">
//         <GripVertical className="w-3 h-3 text-on-surface-variant/30 shrink-0" />
//         <input
//           type="text"
//           placeholder="Variable name (e.g. revenue)"
//           value={item.name}
//           onChange={e => onChange(index, 'name', e.target.value)}
//           className={`flex-1 min-w-0 px-3 py-2 rounded-lg bg-surface-container border text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none font-mono ${
//             nameError ? 'border-red-500/50 focus:border-red-500/70' : 'border-outline/20 focus:border-mtn-yellow/50'
//           }`}
//         />
//         <input
//           type="number"
//           placeholder="Value"
//           value={item.value || ''}
//           onChange={e => onChange(index, 'value', parseFloat(e.target.value) || 0)}
//           className="w-32 px-3 py-2 rounded-lg bg-surface-container border border-outline/20 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:border-mtn-yellow/50 focus:outline-none font-mono text-right"
//         />
//         <input
//           type="text"
//           placeholder="Description (optional)"
//           value={item.description}
//           onChange={e => onChange(index, 'description', e.target.value)}
//           className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-surface-container border border-outline/20 text-xs text-on-surface-variant placeholder:text-on-surface-variant/30 focus:border-outline/40 focus:outline-none"
//         />
//         <button
//           onClick={() => onDelete(index)}
//           className="p-1.5 rounded-lg text-on-surface-variant/40 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
//         >
//           <Trash2 className="w-3.5 h-3.5" />
//         </button>
//       </div>
//       {nameError && <div className="pl-5"><FieldError message={nameError} /></div>}
//     </div>
//   );
// }

// // ── Formula Builder (visual, click-based) ─────────────────────────────────

// function FormulaBuilder({ value, onChange, availableVars, testValues, varLabels }: {
//   value: string;
//   onChange: (next: string) => void;
//   availableVars: string[];
//   testValues?: Record<string, number>;
//   /** Optional token → human-readable label, used only for the dropdown text. */
//   varLabels?: Record<string, string>;
// }) {
//   const [selectedVar, setSelectedVar] = useState('');
//   const [numInput, setNumInput] = useState('');

//   const append = (token: string) => {
//     const next = value.trim().length === 0 ? token : `${value} ${token}`;
//     onChange(next);
//   };

//   const backspace = () => {
//     const parts = value.trim().split(/\s+/).filter(Boolean);
//     parts.pop();
//     onChange(parts.join(' '));
//   };

//   const clear = () => onChange('');

//   const insertVar = () => {
//     if (!selectedVar) return;
//     append(normalizeName(selectedVar));
//     setSelectedVar('');
//   };

//   const insertNum = () => {
//     const n = numInput.trim();
//     if (!n) return;
//     append(n);
//     setNumInput('');
//   };

//   // Live preview using real base values (falls back to 1 only if testValues missing)
//   const preview = useMemo(() => {
//     if (!value.trim()) return null;
//     const varMap: Record<string, number> = {};
//     availableVars.forEach(v => {
//       const key = normalizeName(v);
//       const tv = testValues?.[key];
//       varMap[key] = tv !== undefined ? tv : 1;
//     });
//     return evaluateFormula(value, varMap);
//   }, [value, availableVars, testValues]);

//   const OP_BUTTONS: Array<{ label: string; token: string }> = [
//     { label: '+', token: '+' },
//     { label: '−', token: '-' },
//     { label: '×', token: '*' },
//     { label: '÷', token: '/' },
//     { label: '^', token: '^' },
//     { label: '(', token: '(' },
//     { label: ')', token: ')' },
//   ];

//   const FN_BUTTONS: Array<{ label: string; token: string }> = [
//     { label: 'abs(', token: 'abs(' },
//     { label: 'min(', token: 'min(' },
//     { label: 'max(', token: 'max(' },
//     { label: 'sqrt(', token: 'sqrt(' },
//     { label: 'round(', token: 'round(' },
//     { label: ',', token: ',' },
//   ];

//   return (
//     <div className="rounded-lg border border-outline/20 bg-surface-container-low p-3 space-y-2.5">
//       {/* Formula display */}
//       <div className={`min-h-[42px] px-3 py-2 rounded-lg bg-surface-container border font-mono text-sm break-all ${
//         preview?.error
//           ? 'border-red-500/40 text-red-400'
//           : value.trim()
//             ? 'border-green-500/30 text-on-surface'
//             : 'border-outline/20 text-on-surface-variant/40'
//       }`}>
//         {value.trim() || 'Click buttons below to build your formula…'}
//       </div>

//       {/* Variable + number inserters */}
//       <div className="flex flex-wrap gap-2 items-center">
//         <select
//           value={selectedVar}
//           onChange={e => setSelectedVar(e.target.value)}
//           className="flex-1 min-w-[140px] px-2 py-1.5 rounded-lg bg-surface-container border border-outline/20 text-xs text-on-surface font-mono focus:outline-none"
//         >
//           <option value="">Pick a variable…</option>
//           {availableVars.map(v => (
//             <option key={v} value={v}>{varLabels?.[normalizeName(v)] ?? normalizeName(v)}</option>
//           ))}
//         </select>
//         <button
//           type="button"
//           onClick={insertVar}
//           disabled={!selectedVar}
//           className="px-2.5 py-1.5 rounded-lg bg-mtn-yellow/10 border border-mtn-yellow/40 text-mtn-yellow font-mono text-[10px] uppercase tracking-widest hover:bg-mtn-yellow/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
//         >
//           + Variable
//         </button>

//         <input
//           type="number"
//           value={numInput}
//           onChange={e => setNumInput(e.target.value)}
//           onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); insertNum(); } }}
//           placeholder="123"
//           className="w-24 px-2 py-1.5 rounded-lg bg-surface-container border border-outline/20 text-xs text-on-surface font-mono text-right focus:outline-none"
//         />
//         <button
//           type="button"
//           onClick={insertNum}
//           disabled={!numInput.trim()}
//           className="px-2.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/40 text-blue-400 font-mono text-[10px] uppercase tracking-widest hover:bg-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
//         >
//           + Num
//         </button>
//       </div>

//       {/* Operator & function buttons */}
//       <div className="flex flex-wrap gap-1.5">
//         {OP_BUTTONS.map(op => (
//           <button
//             key={op.token}
//             type="button"
//             onClick={() => append(op.token)}
//             className="w-9 h-9 rounded-lg bg-surface-container border border-outline/20 text-on-surface font-mono text-base hover:bg-surface-container-high hover:border-outline/40 transition-colors"
//           >
//             {op.label}
//           </button>
//         ))}
//         <div className="w-px h-9 bg-outline/20 mx-1" />
//         {FN_BUTTONS.map(fn => (
//           <button
//             key={fn.token}
//             type="button"
//             onClick={() => append(fn.token)}
//             className="px-2.5 h-9 rounded-lg bg-surface-container border border-outline/20 text-on-surface font-mono text-xs hover:bg-surface-container-high hover:border-outline/40 transition-colors"
//           >
//             {fn.label}
//           </button>
//         ))}
//         <div className="flex-1" />
//         <button
//           type="button"
//           onClick={backspace}
//           disabled={!value.trim()}
//           className="flex items-center gap-1 px-2.5 h-9 rounded-lg bg-surface-container border border-outline/20 text-on-surface-variant font-mono text-[10px] uppercase tracking-widest hover:bg-surface-container-high hover:text-on-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
//         >
//           <Delete className="w-3 h-3" /> Back
//         </button>
//         <button
//           type="button"
//           onClick={clear}
//           disabled={!value.trim()}
//           className="px-2.5 h-9 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-[10px] uppercase tracking-widest hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
//         >
//           Clear
//         </button>
//       </div>

//       {/* Live validation */}
//       {value.trim() && preview && (
//         <div className={`flex items-center gap-2 px-2 py-1.5 rounded font-mono text-[10px] ${
//           preview.error
//             ? 'bg-red-500/5 text-red-400'
//             : 'bg-green-500/5 text-green-400'
//         }`}>
//           {preview.error ? (
//             <>
//               <AlertTriangle className="w-3 h-3 shrink-0" />
//               <span>{preview.error}</span>
//             </>
//           ) : (
//             <>
//               <CheckCircle className="w-3 h-3 shrink-0" />
//               <span>Formula valid (test value: {preview.value?.toFixed(2)})</span>
//             </>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }

// // ── Derived Metric Row (collapsible: Base Case + one formula per scenario) ─

// function DerivedRow({
//   item, index, scenarios, availableVars, globalVarNames, derivedNames, baseVarValues,
//   baseTestValues, scenarioTestValues, nameError,
//   onChange, onChangeScenarioFormula, onDelete,
// }: {
//   item: DerivedItem; index: number;
//   scenarios: ScenarioItem[];
//   availableVars: string[];                 // base case: global variables + derived metrics
//   globalVarNames: string[];
//   derivedNames: string[];
//   baseVarValues: Record<string, number>;
//   baseTestValues?: Record<string, number>;
//   scenarioTestValues: Record<string, Record<string, number>>;
//   nameError?: string | null;
//   onChange: (index: number, field: keyof DerivedItem, value: string) => void;
//   onChangeScenarioFormula: (index: number, scenarioId: string, formula: string) => void;
//   onDelete: (index: number) => void;
// }) {
//   // Existing metrics load collapsed; a brand-new blank metric starts expanded.
//   const [expanded, setExpanded] = useState(() => !item.name.trim() && !item.formula.trim());

//   // Completion summary shown in the collapsed header
//   const baseFilled = !!item.formula.trim();
//   const filledScenarios = scenarios.filter(sc => (item.scenario_formulas?.[sc.id] ?? '').trim()).length;
//   const totalCells = scenarios.length + 1;
//   const filledCells = (baseFilled ? 1 : 0) + filledScenarios;
//   const complete = filledCells === totalCells;
//   const baseValue = baseFilled && item.name.trim()
//     ? baseTestValues?.[normalizeName(item.name)]
//     : undefined;

//   return (
//     <div className="rounded-xl border border-white bg-surface-container-low/50 group">
//       {/* Header (always visible) */}
//       <div className="flex items-center gap-2 p-3">
//         <button
//           type="button"
//           onClick={() => setExpanded(e => !e)}
//           title={expanded ? 'Collapse' : 'Expand'}
//           className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors shrink-0"
//         >
//           {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
//         </button>
//         <input
//           type="text"
//           placeholder="Metric name (e.g. revenue)"
//           value={item.name}
//           onChange={e => onChange(index, 'name', e.target.value)}
//           className={`w-48 px-3 py-2 rounded-lg bg-surface-container border text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none font-mono ${
//             nameError ? 'border-red-500/50 focus:border-red-500/70' : 'border-outline/20 focus:border-mtn-yellow/50'
//           }`}
//         />
//         <input
//           type="text"
//           placeholder="Description (optional)"
//           value={item.description || ''}
//           onChange={e => onChange(index, 'description', e.target.value)}
//           className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-surface-container border border-outline/20 text-xs text-on-surface-variant placeholder:text-on-surface-variant/30 focus:border-outline/40 focus:outline-none"
//         />

//         {/* Status summary */}
//         <span
//           className={`shrink-0 px-2 py-1 rounded-full border font-mono text-[9px] uppercase tracking-widest ${
//             complete
//               ? 'border-green-500/30 bg-green-500/10 text-green-400'
//               : 'border-red-500/30 bg-red-500/10 text-red-400'
//           }`}
//         >
//           {filledCells}/{totalCells} filled
//         </span>
//         {baseValue !== undefined && (
//           <span className="shrink-0 hidden md:inline font-mono text-[10px] text-blue-400">
//             base = {baseValue.toFixed(2)}
//           </span>
//         )}

//         <button
//           onClick={() => onDelete(index)}
//           className="p-1.5 rounded-lg text-on-surface-variant/40 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all shrink-0"
//         >
//           <Trash2 className="w-3.5 h-3.5" />
//         </button>
//       </div>
//       {nameError && <div className="px-3 pb-3 -mt-1 pl-12"><FieldError message={nameError} /></div>}

//       {/* Expanded body: Base Case + every scenario */}
//       {expanded && (
//         <div className="px-3 pb-3 space-y-3 border-t border-white/20 pt-3">
//           {/* Base case */}
//           <div className="space-y-1.5">
//             <p className="font-mono text-[9px] uppercase tracking-widest text-blue-400">
//               Base Case
//               {!baseFilled && <span className="ml-2 text-red-400">· required</span>}
//             </p>
//             <FormulaBuilder
//               value={item.formula}
//               onChange={next => onChange(index, 'formula', next)}
//               availableVars={availableVars}
//               testValues={baseTestValues}
//             />
//           </div>

//           {/* One formula per scenario */}
//           {scenarios.map(sc => {
//             const meta = SCENARIO_TYPE_META[sc.type] || SCENARIO_TYPE_META.stress;
//             const val = item.scenario_formulas?.[sc.id] ?? '';

//             // Variables visible ONLY in this scenario: base variables (with this scenario's
//             // overrides applied) + this scenario's own new variables + derived metrics.
//             const scVars = (sc.variables ?? []).filter(v => isUsableName(v.name));
//             const overrideMap = new Map<string, number>();
//             sc.overrides.forEach(o => {
//               if (o.name.trim()) overrideMap.set(normalizeName(o.name), o.value);
//             });
//             const scAvailable = uniqueNames([
//               ...globalVarNames,
//               ...scVars.map(v => v.name),
//               ...derivedNames,
//             ]);

//             return (
//               <div key={sc.id} className="space-y-1.5">
//                 <p className={`font-mono text-[9px] uppercase tracking-widest ${typeTextClass(sc.type)}`}>
//                   {sc.name || sc.id} <span className="text-on-surface-variant/50">({meta.label})</span>
//                   {!val.trim() && <span className="ml-2 text-red-400">· required</span>}
//                 </p>

//                 {/* What this scenario's variables look like */}
//                 {(globalVarNames.length > 0 || scVars.length > 0) && (
//                   <div className="flex flex-wrap gap-1.5">
//                     {globalVarNames.map(n => {
//                       const key = normalizeName(n);
//                       const overridden = overrideMap.has(key);
//                       const shown = overridden ? overrideMap.get(key) : baseVarValues[key];
//                       return (
//                         <span
//                           key={`g-${key}`}
//                           className={`px-2 py-0.5 rounded border font-mono text-[9px] ${
//                             overridden
//                               ? 'border-mtn-yellow/40 bg-mtn-yellow/10 text-mtn-yellow'
//                               : 'border-outline/15 bg-surface-container text-on-surface-variant'
//                           }`}
//                         >
//                           {key} = {shown}
//                           {overridden && <span className="ml-1 opacity-70">(overridden, base {baseVarValues[key]})</span>}
//                         </span>
//                       );
//                     })}
//                     {scVars.map((v, i) => (
//                       <span
//                         key={`s-${i}`}
//                         className="px-2 py-0.5 rounded border border-blue-500/40 bg-blue-500/10 text-blue-400 font-mono text-[9px]"
//                       >
//                         {normalizeName(v.name)} = {v.value}
//                         <span className="ml-1 opacity-70">(this scenario only)</span>
//                       </span>
//                     ))}
//                   </div>
//                 )}

//                 <FormulaBuilder
//                   value={val}
//                   onChange={next => onChangeScenarioFormula(index, sc.id, next)}
//                   availableVars={scAvailable}
//                   testValues={scenarioTestValues[sc.id]}
//                 />
//               </div>
//             );
//           })}
//         </div>
//       )}
//     </div>
//   );
// }

// // ── Scenario Card ─────────────────────────────────────────────────────────

// function ScenarioCard({ scenario, allVariableNames, derivedNames, onUpdate, onDelete }: {
//   scenario: ScenarioItem;
//   allVariableNames: string[];
//   derivedNames: string[];
//   onUpdate: (updated: ScenarioItem) => void;
//   onDelete: () => void;
// }) {
//   const [collapsed, setCollapsed] = useState(false);
//   const meta = SCENARIO_TYPE_META[scenario.type] || SCENARIO_TYPE_META.stress;
//   const Icon = meta.icon;
//   const scenarioVariables = scenario.variables ?? [];
//   const varIssues = scenarioVarIssues(scenario, allVariableNames, derivedNames);

//   // Overrides (overwrite a base variable, this scenario only)
//   const addOverride = () => {
//     onUpdate({
//       ...scenario,
//       overrides: [...scenario.overrides, { name: '', value: 0 }],
//     });
//   };

//   const updateOverride = (idx: number, field: keyof ScenarioOverride, value: string | number) => {
//     const updated = [...scenario.overrides];
//     const current = updated[idx];
//     if (current === undefined) return;
//     updated[idx] = { ...current, [field]: value };
//     onUpdate({ ...scenario, overrides: updated });
//   };

//   const deleteOverride = (idx: number) => {
//     onUpdate({
//       ...scenario,
//       overrides: scenario.overrides.filter((_, i) => i !== idx),
//     });
//   };

//   // Scenario-only variables (new variables that exist only in this scenario)
//   const addScenarioVariable = () => {
//     onUpdate({
//       ...scenario,
//       variables: [...scenarioVariables, { name: '', value: 0, description: '' }],
//     });
//   };

//   const updateScenarioVariable = (idx: number, field: keyof ScenarioVariable, value: string | number) => {
//     const updated = [...scenarioVariables];
//     const current = updated[idx];
//     if (current === undefined) return;
//     updated[idx] = { ...current, [field]: value };
//     onUpdate({ ...scenario, variables: updated });
//   };

//   const deleteScenarioVariable = (idx: number) => {
//     onUpdate({
//       ...scenario,
//       variables: scenarioVariables.filter((_, i) => i !== idx),
//     });
//   };

//   return (
//     <div className={`rounded-xl border ${meta.borderClass} ${meta.bgClass} overflow-hidden`}>
//       {/* Header */}
//       <div className="flex items-center gap-3 px-4 py-3">
//         <button onClick={() => setCollapsed(c => !c)} className="shrink-0">
//           {collapsed ? <ChevronRight className="w-4 h-4 text-on-surface-variant" /> : <ChevronDown className="w-4 h-4 text-on-surface-variant" />}
//         </button>
//         <Icon className={`w-4 h-4 ${typeTextClass(scenario.type)} shrink-0`} />
//         <input
//           type="text"
//           value={scenario.name}
//           onChange={e => onUpdate({ ...scenario, name: e.target.value })}
//           placeholder="Scenario name"
//           className={`flex-1 bg-transparent font-sans text-sm font-bold text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none ${
//             !scenario.name.trim() ? 'ring-1 ring-red-500/40 rounded px-2' : ''
//           }`}
//         />
//         {!scenario.name.trim() && (
//           <span className="font-mono text-[8px] text-red-400 uppercase tracking-widest shrink-0">Name required</span>
//         )}
//         <select
//           value={scenario.type}
//           onChange={e => onUpdate({ ...scenario, type: e.target.value as ScenarioItem['type'] })}
//           className="px-2 py-1 rounded-lg bg-surface-container border border-outline/20 text-xs text-on-surface font-mono focus:outline-none"
//         >
//           <option value="stress">Stress</option>
//           <option value="shock">Shock</option>
//           <option value="opportunity">Opportunity</option>
//         </select>
//         <button
//           onClick={onDelete}
//           className="p-1.5 rounded-lg text-on-surface-variant/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
//         >
//           <Trash2 className="w-3.5 h-3.5" />
//         </button>
//       </div>

//       {/* Body */}
//       {!collapsed && (
//         <div className="px-4 pb-4 space-y-4">
//           {/* Variable Overrides */}
//           <div>
//             <div className="flex items-center justify-between mb-2">
//               <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant">
//                 Variable Overrides (overwrite a base case value, for this scenario only)
//               </p>
//               <button
//                 onClick={addOverride}
//                 className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono text-mtn-yellow hover:bg-mtn-yellow/10 transition-colors"
//               >
//                 <Plus className="w-2.5 h-2.5" /> Override
//               </button>
//             </div>
//             <div className="space-y-1.5">
//               {scenario.overrides.length === 0 && (
//                 <p className="text-[10px] text-on-surface-variant/50 italic">No overrides — uses base case values</p>
//               )}
//               {scenario.overrides.map((ov, idx) => (
//                 <div key={idx} className="flex items-center gap-2">
//                   <select
//                     value={ov.name}
//                     onChange={e => updateOverride(idx, 'name', e.target.value)}
//                     className="flex-1 px-2 py-1.5 rounded-lg bg-surface-container border border-outline/20 text-xs text-on-surface font-mono focus:outline-none"
//                   >
//                     <option value="">Select variable…</option>
//                     {allVariableNames.map(v => (
//                       <option key={v} value={v}>{v}</option>
//                     ))}
//                   </select>
//                   <input
//                     type="number"
//                     value={ov.value || ''}
//                     onChange={e => updateOverride(idx, 'value', parseFloat(e.target.value) || 0)}
//                     placeholder="Override value"
//                     className="w-28 px-2 py-1.5 rounded-lg bg-surface-container border border-outline/20 text-xs text-on-surface font-mono text-right focus:outline-none"
//                   />
//                   <button
//                     onClick={() => deleteOverride(idx)}
//                     className="p-1 rounded text-on-surface-variant/40 hover:text-red-400 transition-colors"
//                   >
//                     <Trash2 className="w-3 h-3" />
//                   </button>
//                 </div>
//               ))}
//             </div>
//           </div>

//           {/* Scenario-only Variables */}
//           <div>
//             <div className="flex items-center justify-between mb-2">
//               <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant">
//                 Scenario Variables (new variables that exist only in this scenario)
//               </p>
//               <button
//                 onClick={addScenarioVariable}
//                 className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono text-mtn-yellow hover:bg-mtn-yellow/10 transition-colors"
//               >
//                 <Plus className="w-2.5 h-2.5" /> Variable
//               </button>
//             </div>
//             <div className="space-y-1.5">
//               {scenarioVariables.length === 0 && (
//                 <p className="text-[10px] text-on-surface-variant/50 italic">
//                   No scenario variables — add one if this scenario needs its own input (e.g. failure_rate)
//                 </p>
//               )}
//               {scenarioVariables.map((sv, idx) => {
//                 const issue = varIssues[idx];
//                 return (
//                   <div key={idx}>
//                     <div className="flex items-center gap-2">
//                       <input
//                         type="text"
//                         value={sv.name}
//                         onChange={e => updateScenarioVariable(idx, 'name', e.target.value)}
//                         placeholder="Variable name (e.g. failure_rate)"
//                         className={`flex-1 min-w-0 px-2 py-1.5 rounded-lg bg-surface-container border text-xs text-on-surface font-mono placeholder:text-on-surface-variant/40 focus:outline-none ${
//                           sv.name.trim() && !issue ? 'border-outline/20' : 'border-red-500/40'
//                         }`}
//                       />
//                       <input
//                         type="number"
//                         value={sv.value || ''}
//                         onChange={e => updateScenarioVariable(idx, 'value', parseFloat(e.target.value) || 0)}
//                         placeholder="Value"
//                         className="w-28 px-2 py-1.5 rounded-lg bg-surface-container border border-outline/20 text-xs text-on-surface font-mono text-right focus:outline-none"
//                       />
//                       <input
//                         type="text"
//                         value={sv.description ?? ''}
//                         onChange={e => updateScenarioVariable(idx, 'description', e.target.value)}
//                         placeholder="Description (optional)"
//                         className="flex-1 min-w-0 px-2 py-1.5 rounded-lg bg-surface-container border border-outline/20 text-[11px] text-on-surface-variant placeholder:text-on-surface-variant/30 focus:outline-none"
//                       />
//                       <button
//                         onClick={() => deleteScenarioVariable(idx)}
//                         className="p-1 rounded text-on-surface-variant/40 hover:text-red-400 transition-colors"
//                       >
//                         <Trash2 className="w-3 h-3" />
//                       </button>
//                     </div>
//                     <FieldError message={issue} />
//                   </div>
//                 );
//               })}
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// // ── Matrix table (Table 1 and Table 2 previews) ───────────────────────────

// interface MatrixRow {
//   key: string;
//   label: string;
//   base: number | undefined;
//   values: Record<string, number | undefined>;
// }

// function MatrixTable({ tag, title, rows, columns }: {
//   tag: string; title: string; rows: MatrixRow[]; columns: ScenarioItem[];
// }) {
//   const fmt = (v: number | undefined) => (v === undefined ? '—' : v.toFixed(2));
//   return (
//     <div className="rounded-xl border border-outline/20 bg-[#1A1A1A] overflow-hidden">
//       <div className="p-4 border-b border-outline/10">
//         <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant">{tag}</p>
//         <p className="font-sans text-sm font-bold text-on-surface mt-1">{title}</p>
//       </div>
//       <div className="overflow-x-auto custom-scrollbar">
//         <table className="w-full text-left text-[11px] font-mono">
//           <thead>
//             <tr className="border-b border-outline/10">
//               <th className="p-3 text-on-surface-variant sticky left-0 bg-[#1A1A1A] z-10 min-w-[160px]">Metric</th>
//               <th className="p-3 text-blue-400 text-center min-w-[110px]">Base Case</th>
//               {columns.map(sc => (
//                 <th key={sc.id} className={`p-3 text-center min-w-[110px] ${typeTextClass(sc.type)}`}>
//                   {sc.name || sc.id}
//                 </th>
//               ))}
//             </tr>
//           </thead>
//           <tbody>
//             {rows.length === 0 && (
//               <tr><td colSpan={columns.length + 2} className="p-4 text-center text-on-surface-variant/50 italic">No metrics yet</td></tr>
//             )}
//             {rows.map((r, i) => (
//               <tr key={r.key} className={`border-b border-outline/5 ${i % 2 === 0 ? 'bg-surface-container-low/30' : ''}`}>
//                 <td className="p-3 text-on-surface sticky left-0 bg-inherit z-10 whitespace-nowrap font-sans text-xs">{r.label}</td>
//                 <td className="p-3 text-center text-green-400 font-semibold">{fmt(r.base)}</td>
//                 {columns.map(sc => (
//                   <td key={sc.id} className="p-3 text-center text-on-surface-variant">{fmt(r.values[sc.id])}</td>
//                 ))}
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }

// /** Collapsible list of the variables a table hands to the next stage. */
// function StageVarChips({ title, vars }: { title: string; vars: StageVar[] }) {
//   if (vars.length === 0) return null;
//   return (
//     <details className="rounded-lg border border-outline/10 bg-surface-container-low/50 p-3">
//       <summary className="cursor-pointer font-mono text-[9px] uppercase tracking-widest text-on-surface-variant">
//         {title} ({vars.length})
//       </summary>
//       <div className="flex flex-wrap gap-1.5 mt-3">
//         {vars.map(v => (
//           <span key={v.token} className="px-2 py-0.5 rounded bg-surface-container border border-outline/20 font-mono text-[10px] text-on-surface">
//             {v.label}
//             <span className="text-on-surface-variant"> = {v.value === undefined ? '—' : v.value.toFixed(2)}</span>
//           </span>
//         ))}
//       </div>
//     </details>
//   );
// }

// // ── Weighted Row (stage 5: locked name, Base Case + one formula per scenario) ─

// function WeightedRow({
//   entry, scenarios, tokens, labels, testValues, preview, onChange,
// }: {
//   entry: WeightedMetric;
//   scenarios: ScenarioItem[];
//   tokens: string[];                                  // stage-3 variables only
//   labels: Record<string, string>;
//   testValues: Record<string, number>;
//   preview: { base: number | undefined; scn: Record<string, number | undefined> };
//   onChange: (source: string, patch: { formula?: string; scenarioId?: string; scenarioFormula?: string }) => void;
// }) {
//   const [expanded, setExpanded] = useState(false);

//   const baseFilled = !!entry.formula.trim();
//   const filledScenarios = scenarios.filter(sc => (entry.scenario_formulas?.[sc.id] ?? '').trim()).length;
//   const totalCells = scenarios.length + 1;
//   const filledCells = (baseFilled ? 1 : 0) + filledScenarios;
//   const complete = filledCells === totalCells;

//   return (
//     <div className="rounded-xl border border-white bg-surface-container-low/50">
//       <div className="flex items-center gap-2 p-3">
//         <button
//           type="button"
//           onClick={() => setExpanded(e => !e)}
//           title={expanded ? 'Collapse' : 'Expand'}
//           className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors shrink-0"
//         >
//           {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
//         </button>

//         {/* Locked, pre-filled name */}
//         <div className="flex items-center gap-2 flex-1 min-w-0 px-3 py-2 rounded-lg bg-surface-container border border-outline/20">
//           <Lock className="w-3 h-3 text-on-surface-variant/60 shrink-0" />
//           <span className="font-mono text-sm text-on-surface truncate">{entry.name}</span>
//         </div>

//         <span
//           className={`shrink-0 px-2 py-1 rounded-full border font-mono text-[9px] uppercase tracking-widest ${
//             complete
//               ? 'border-green-500/30 bg-green-500/10 text-green-400'
//               : 'border-red-500/30 bg-red-500/10 text-red-400'
//           }`}
//         >
//           {filledCells}/{totalCells} filled
//         </span>
//         {preview.base !== undefined && (
//           <span className="shrink-0 hidden md:inline font-mono text-[10px] text-blue-400">
//             base = {preview.base.toFixed(2)}
//           </span>
//         )}
//       </div>

//       {expanded && (
//         <div className="px-3 pb-3 space-y-3 border-t border-white/20 pt-3">
//           <div className="space-y-1.5">
//             <p className="font-mono text-[9px] uppercase tracking-widest text-blue-400">
//               Base Case
//               {!baseFilled && <span className="ml-2 text-red-400">· required</span>}
//             </p>
//             <FormulaBuilder
//               value={entry.formula}
//               onChange={next => onChange(entry.source, { formula: next })}
//               availableVars={tokens}
//               testValues={testValues}
//               varLabels={labels}
//             />
//           </div>

//           {scenarios.map(sc => {
//             const val = entry.scenario_formulas?.[sc.id] ?? '';
//             const meta = SCENARIO_TYPE_META[sc.type] || SCENARIO_TYPE_META.stress;
//             return (
//               <div key={sc.id} className="space-y-1.5">
//                 <p className={`font-mono text-[9px] uppercase tracking-widest ${typeTextClass(sc.type)}`}>
//                   {sc.name || sc.id} <span className="text-on-surface-variant/50">({meta.label})</span>
//                   {!val.trim() && <span className="ml-2 text-red-400">· required</span>}
//                 </p>
//                 <FormulaBuilder
//                   value={val}
//                   onChange={next => onChange(entry.source, { scenarioId: sc.id, scenarioFormula: next })}
//                   availableVars={tokens}
//                   testValues={testValues}
//                   varLabels={labels}
//                 />
//               </div>
//             );
//           })}
//         </div>
//       )}
//     </div>
//   );
// }

// // ── Section Card (stage 7: its own list of metrics → one table + one waterfall) ─

// function SectionCard({
//   meta, metrics, tokens, labels, testValues, preview, onAdd, onUpdate, onDelete,
// }: {
//   meta: typeof SECTION_META[number];
//   metrics: SectionMetric[];
//   tokens: string[];                                  // stage-5 variables only
//   labels: Record<string, string>;
//   testValues: Record<string, number>;
//   preview: { name: string; value: number | undefined }[];
//   onAdd: () => void;
//   onUpdate: (idx: number, patch: Partial<SectionMetric>) => void;
//   onDelete: (idx: number) => void;
// }) {
//   const [open, setOpen] = useState(true);
//   const names = metrics.map(m => normalizeName(m.name));

//   const roleOf = (i: number): string => {
//     if (i === 0) return 'Start bar';
//     if (i === metrics.length - 1 && metrics.length > 1) return 'Total bar';
//     return 'Impact bar';
//   };

//   return (
//     <div className={`rounded-xl border ${meta.border} ${meta.bg} overflow-hidden`}>
//       <div className="flex items-center gap-3 px-4 py-3">
//         <button type="button" onClick={() => setOpen(o => !o)} className="shrink-0">
//           {open ? <ChevronDown className="w-4 h-4 text-on-surface-variant" /> : <ChevronRight className="w-4 h-4 text-on-surface-variant" />}
//         </button>
//         <div className="flex-1 min-w-0">
//           <p className={`font-sans text-sm font-bold ${meta.text}`}>
//             {meta.table} — {meta.title}
//           </p>
//           <p className="text-[10px] text-on-surface-variant">{meta.desc}</p>
//         </div>
//         <span className="shrink-0 px-2 py-1 rounded-full border border-outline/20 font-mono text-[9px] uppercase tracking-widest text-on-surface-variant">
//           {metrics.length} metric{metrics.length !== 1 ? 's' : ''}
//         </span>
//       </div>

//       {open && (
//         <div className="px-4 pb-4 space-y-3">
//           {metrics.length === 0 && (
//             <p className="text-[10px] text-on-surface-variant/50 italic">
//               No metrics yet — add the metrics that make up this table.
//             </p>
//           )}

//           {metrics.map((m, i) => {
//             const duplicate = !!m.name.trim() && names.indexOf(normalizeName(m.name)) !== i;
//             const val = preview[i]?.value;
//             return (
//               <div key={i} className="rounded-xl border border-white bg-surface-container-low/60 p-3 space-y-2.5 group">
//                 <div className="flex items-center gap-2">
//                   <input
//                     type="text"
//                     placeholder="Metric name (your choice)"
//                     value={m.name}
//                     onChange={e => onUpdate(i, { name: e.target.value })}
//                     className={`flex-1 min-w-0 px-3 py-2 rounded-lg bg-surface-container border text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none font-mono ${
//                       !m.name.trim() || duplicate ? 'border-red-500/50' : 'border-outline/20 focus:border-mtn-yellow/50'
//                     }`}
//                   />
//                   <span className="shrink-0 px-2 py-1 rounded-full border border-outline/20 font-mono text-[9px] uppercase tracking-widest text-on-surface-variant">
//                     {roleOf(i)}
//                   </span>
//                   {val !== undefined && (
//                     <span className="shrink-0 font-mono text-[11px] text-green-400">= {val.toFixed(2)}</span>
//                   )}
//                   <button
//                     onClick={() => onDelete(i)}
//                     className="p-1.5 rounded-lg text-on-surface-variant/40 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all shrink-0"
//                   >
//                     <Trash2 className="w-3.5 h-3.5" />
//                   </button>
//                 </div>
//                 {!m.name.trim() && <FieldError message="Metric name required." />}
//                 {duplicate && <FieldError message="Another metric in this table already has this name." />}

//                 <FormulaBuilder
//                   value={m.formula}
//                   onChange={next => onUpdate(i, { formula: next })}
//                   availableVars={tokens}
//                   testValues={testValues}
//                   varLabels={labels}
//                 />
//               </div>
//             );
//           })}

//           <button
//             type="button"
//             onClick={onAdd}
//             className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-outline/20 text-on-surface-variant hover:text-mtn-yellow hover:border-mtn-yellow/30 transition-colors font-mono text-[10px] uppercase tracking-widest w-full justify-center"
//           >
//             <Plus className="w-3.5 h-3.5" /> Add Metric
//           </button>
//         </div>
//       )}
//     </div>
//   );
// }

// /** Stage 8: a finished section table (metric / value). */
// function SectionTable({ meta, rows }: {
//   meta: typeof SECTION_META[number];
//   rows: { name: string; value: number | undefined }[];
// }) {
//   return (
//     <div className="rounded-xl border border-outline/20 bg-[#1A1A1A] overflow-hidden">
//       <div className="p-4 border-b border-outline/10">
//         <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant">{meta.table}</p>
//         <p className={`font-sans text-sm font-bold mt-1 ${meta.text}`}>{meta.title}</p>
//       </div>
//       <table className="w-full text-left text-[11px] font-mono">
//         <thead>
//           <tr className="border-b border-outline/10">
//             <th className="p-3 text-on-surface-variant">Metric</th>
//             <th className="p-3 text-right text-on-surface-variant">Value</th>
//           </tr>
//         </thead>
//         <tbody>
//           {rows.length === 0 && (
//             <tr><td colSpan={2} className="p-4 text-center text-on-surface-variant/50 italic">No metrics defined</td></tr>
//           )}
//           {rows.map((r, i) => (
//             <tr key={i} className={`border-b border-outline/5 ${i % 2 === 0 ? 'bg-surface-container-low/30' : ''}`}>
//               <td className="p-3 text-on-surface font-sans text-xs">{r.name || '—'}</td>
//               <td className="p-3 text-right text-green-400 font-semibold">
//                 {r.value === undefined ? '—' : r.value.toFixed(2)}
//               </td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );
// }

// // ── Main Editor ───────────────────────────────────────────────────────────

// const DEFAULT_WEIGHTS = { stress: 0.7, shock: 0.3, opportunity: 1.0 };

// export function ScenarioBuilderEditor({ configId, onBack }: { configId: number; onBack: () => void }) {
//   const [config, setConfig] = useState<FullConfig | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);
//   const [computing, setComputing] = useState(false);
//   const [saveMsg, setSaveMsg] = useState<string | null>(null);
//   const [error, setError] = useState<string | null>(null);
//   const [step, setStep] = useState<Step>(1);
//   const [results, setResults] = useState<ComputedResults | null>(null);
//   const [showResults, setShowResults] = useState(false);

//   // ── Local editable state ──
//   const [name, setName] = useState('');
//   const [description, setDescription] = useState('');
//   const [year, setYear] = useState(new Date().getFullYear());
//   const [currencyLabel, setCurrencyLabel] = useState('GHS M');
//   const [globalVars, setGlobalVars] = useState<VariableItem[]>([]);
//   const [derivedMetrics, setDerivedMetrics] = useState<DerivedItem[]>([]);
//   const [scenarios, setScenarios] = useState<ScenarioItem[]>([]);
//   const [tableConfig, setTableConfig] = useState<TableConfig>({
//     display_metrics: [],
//     waterfall_metrics: [],
//     weights: DEFAULT_WEIGHTS,
//     weighted_metrics: [],
//     section_tables: {},
//   });

//   // Load config
//   useEffect(() => {
//     (async () => {
//       try {
//         const c = await getConfig(configId);
//         setConfig(c);
//         setName(c.name);
//         setDescription(c.description || '');
//         setYear(c.year);
//         setCurrencyLabel(c.currency_label);
//         setGlobalVars(c.global_variables || []);
//         setDerivedMetrics(c.derived_metrics || []);
//         setScenarios(c.scenarios || []);
//         const tc = c.table_config;
//         setTableConfig({
//           display_metrics: tc?.display_metrics ?? [],
//           waterfall_metrics: tc?.waterfall_metrics ?? [],
//           weights: tc?.weights ?? DEFAULT_WEIGHTS,
//           weighted_metrics: tc?.weighted_metrics ?? [],
//           section_tables: tc?.section_tables ?? {},
//         });
//         // Results saved by the older 5-step flow have a different shape; ignore them.
//         if (c.computed_results && c.computed_results.sectionTables) {
//           setResults(c.computed_results);
//         }
//       } catch (e) {
//         setError(e instanceof Error ? e.message : 'Failed to load');
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, [configId]);

//   // ── Stage 1–3 derived data ──

//   // Names of base variables only (scenario overrides can only target these).
//   // Badly-formatted names are kept out of every dropdown so they can't break formulas.
//   const globalVarNames = useMemo(
//     () => globalVars.map(v => v.name).filter(isUsableName),
//     [globalVars]
//   );

//   // Names of derived metrics (usable ones only)
//   const derivedNames = useMemo(
//     () => derivedMetrics.map(d => d.name).filter(isUsableName),
//     [derivedMetrics]
//   );

//   // Base case formulas can use base variables + derived metrics (NOT scenario-only variables)
//   const allVarNames = useMemo(
//     () => [...globalVarNames, ...derivedNames],
//     [globalVarNames, derivedNames]
//   );

//   // Name issues per row
//   const globalNameIssues = useMemo(
//     () => globalVars.map((v, i) =>
//       nameIssue(v.name, globalVars.filter((_, j) => j !== i).map(x => x.name))
//     ),
//     [globalVars]
//   );

//   const derivedNameIssues = useMemo(
//     () => derivedMetrics.map((d, i) =>
//       nameIssue(d.name, [
//         ...globalVars.map(x => x.name),
//         ...derivedMetrics.filter((_, j) => j !== i).map(x => x.name),
//       ])
//     ),
//     [globalVars, derivedMetrics]
//   );

//   // Real base-case variable values (for live formula preview)
//   const baseVarValues = useMemo(() => {
//     const map: Record<string, number> = {};
//     globalVars.forEach(v => {
//       if (v.name.trim()) map[normalizeName(v.name)] = v.value;
//     });
//     return map;
//   }, [globalVars]);

//   // Live base case preview (cascaded)
//   const baseCasePreview = useMemo(() => {
//     const varMap: Record<string, number> = { ...baseVarValues };

//     const derivedResults: Record<string, { value: number | null; error: string | null }> = {};
//     derivedMetrics.forEach(dm => {
//       if (!dm.name.trim() || !dm.formula.trim()) return;
//       const result = evaluateFormula(dm.formula, varMap);
//       derivedResults[dm.name] = result;
//       if (result.value !== null) {
//         varMap[normalizeName(dm.name)] = result.value;
//       }
//     });

//     return { variables: varMap, derived: derivedResults };
//   }, [baseVarValues, derivedMetrics]);

//   // Live per-scenario cascade:
//   // base variables → this scenario's overrides → this scenario's own variables → metric formulas
//   const scenarioPreviews = useMemo(() => {
//     const out: Record<string, Record<string, number>> = {};
//     scenarios.forEach(sc => {
//       const varMap: Record<string, number> = { ...baseVarValues };
//       sc.overrides.forEach(ov => {
//         if (ov.name.trim()) varMap[normalizeName(ov.name)] = ov.value;
//       });
//       (sc.variables ?? []).forEach(sv => {
//         if (sv.name.trim()) varMap[normalizeName(sv.name)] = sv.value;
//       });
//       derivedMetrics.forEach(dm => {
//         if (!dm.name.trim()) return;
//         const f = dm.scenario_formulas?.[sc.id] || dm.formula;
//         if (!f?.trim()) return;
//         const r = evaluateFormula(f, varMap);
//         if (r.value !== null) varMap[normalizeName(dm.name)] = r.value;
//       });
//       out[sc.id] = varMap;
//     });
//     return out;
//   }, [scenarios, derivedMetrics, baseVarValues]);

//   // Scenarios in display order: all stress, then shocks, then opportunities
//   const orderedScenarios = useMemo(
//     () => scenarios
//       .map((s, i) => ({ s, i }))
//       .sort((a, b) => (TYPE_ORDER[a.s.type] ?? 9) - (TYPE_ORDER[b.s.type] ?? 9) || a.i - b.i)
//       .map(x => x.s),
//     [scenarios]
//   );

//   // ── Stage 4: Table 1 (the live matrix) and the variables it creates ──

//   const namedDerived = useMemo(() => derivedMetrics.filter(d => d.name.trim()), [derivedMetrics]);

//   const stage3Value = useCallback((dm: DerivedItem, col: string): number | undefined => {
//     const key = normalizeName(dm.name);
//     if (col === 'base') {
//       return dm.formula.trim() ? baseCasePreview.variables[key] : undefined;
//     }
//     return (dm.scenario_formulas?.[col] ?? '').trim() ? scenarioPreviews[col]?.[key] : undefined;
//   }, [baseCasePreview, scenarioPreviews]);

//   const table1Rows: MatrixRow[] = useMemo(
//     () => namedDerived.map(dm => ({
//       key: normalizeName(dm.name),
//       label: dm.name,
//       base: stage3Value(dm, 'base'),
//       values: Object.fromEntries(scenarios.map(sc => [sc.id, stage3Value(dm, sc.id)])),
//     })),
//     [namedDerived, scenarios, stage3Value]
//   );

//   const stage3Vars = useMemo(
//     () => buildStageVars(
//       namedDerived.map(d => d.name.trim()),
//       scenarios,
//       (mi, col) => {
//         const dm = namedDerived[mi];
//         return dm ? stage3Value(dm, col) : undefined;
//       }
//     ),
//     [namedDerived, scenarios, stage3Value]
//   );

//   const stage3Tokens = useMemo(() => stage3Vars.map(v => v.token), [stage3Vars]);
//   const stage3Labels = useMemo(
//     () => Object.fromEntries(stage3Vars.map(v => [v.token, v.label])) as Record<string, string>,
//     [stage3Vars]
//   );
//   const stage3Map = useMemo(() => {
//     const m: Record<string, number> = {};
//     stage3Vars.forEach(v => { if (v.value !== undefined) m[v.token] = v.value; });
//     return m;
//   }, [stage3Vars]);

//   // ── Stage 5: weighted metrics (one per derived metric, name locked) ──

//   const weightedList: WeightedMetric[] = useMemo(
//     () => namedDerived.map(d => {
//       const src = d.name.trim();
//       const found = (tableConfig.weighted_metrics ?? []).find(
//         w => normalizeName(w.source) === normalizeName(src)
//       );
//       return {
//         source: src,
//         name: `${src} wghtd`,
//         formula: found?.formula ?? '',
//         scenario_formulas: found?.scenario_formulas ?? {},
//       };
//     }),
//     [namedDerived, tableConfig.weighted_metrics]
//   );

//   const updateWeighted = (
//     source: string,
//     patch: { formula?: string; scenarioId?: string; scenarioFormula?: string }
//   ) => {
//     setTableConfig(tc => {
//       const list = [...(tc.weighted_metrics ?? [])];
//       const idx = list.findIndex(w => normalizeName(w.source) === normalizeName(source));
//       const current: WeightedMetric = idx >= 0
//         ? list[idx]!
//         : { source, name: `${source} wghtd`, formula: '', scenario_formulas: {} };
//       const next: WeightedMetric = {
//         ...current,
//         source,
//         name: `${source} wghtd`,
//         formula: patch.formula !== undefined ? patch.formula : current.formula,
//         scenario_formulas: patch.scenarioId !== undefined
//           ? { ...(current.scenario_formulas ?? {}), [patch.scenarioId]: patch.scenarioFormula ?? '' }
//           : (current.scenario_formulas ?? {}),
//       };
//       if (idx >= 0) list[idx] = next; else list.push(next);
//       return { ...tc, weighted_metrics: list };
//     });
//   };

//   // Table 2 live values
//   const weightedPreview = useMemo(
//     () => weightedList.map(w => ({
//       base: evalCell(w.formula, stage3Map),
//       scn: Object.fromEntries(
//         scenarios.map(sc => [sc.id, evalCell(w.scenario_formulas?.[sc.id], stage3Map)])
//       ) as Record<string, number | undefined>,
//     })),
//     [weightedList, scenarios, stage3Map]
//   );

//   const table2Rows: MatrixRow[] = useMemo(
//     () => weightedList.map((w, i) => ({
//       key: normalizeName(w.name),
//       label: w.name,
//       base: weightedPreview[i]?.base,
//       values: weightedPreview[i]?.scn ?? {},
//     })),
//     [weightedList, weightedPreview]
//   );

//   const stage5Vars = useMemo(
//     () => buildStageVars(
//       weightedList.map(w => w.name),
//       scenarios,
//       (mi, col) => {
//         const p = weightedPreview[mi];
//         if (!p) return undefined;
//         return col === 'base' ? p.base : p.scn[col];
//       }
//     ),
//     [weightedList, scenarios, weightedPreview]
//   );

//   const stage5Tokens = useMemo(() => stage5Vars.map(v => v.token), [stage5Vars]);
//   const stage5Labels = useMemo(
//     () => Object.fromEntries(stage5Vars.map(v => [v.token, v.label])) as Record<string, string>,
//     [stage5Vars]
//   );
//   const stage5Map = useMemo(() => {
//     const m: Record<string, number> = {};
//     stage5Vars.forEach(v => { if (v.value !== undefined) m[v.token] = v.value; });
//     return m;
//   }, [stage5Vars]);

//   // ── Stage 7: section tables ──

//   const sectionMetrics = (key: SectionKey): SectionMetric[] => tableConfig.section_tables?.[key] ?? [];

//   const setSectionMetrics = (key: SectionKey, list: SectionMetric[]) => {
//     setTableConfig(tc => ({ ...tc, section_tables: { ...(tc.section_tables ?? {}), [key]: list } }));
//   };

//   const addSectionMetric = (key: SectionKey) =>
//     setSectionMetrics(key, [...sectionMetrics(key), { name: '', formula: '' }]);

//   const updateSectionMetric = (key: SectionKey, idx: number, patch: Partial<SectionMetric>) =>
//     setSectionMetrics(key, sectionMetrics(key).map((m, i) => (i === idx ? { ...m, ...patch } : m)));

//   const deleteSectionMetric = (key: SectionKey, idx: number) =>
//     setSectionMetrics(key, sectionMetrics(key).filter((_, i) => i !== idx));

//   // Live values for Tables 3–6
//   const sectionPreview = useMemo(() => {
//     const out = {} as Record<SectionKey, { name: string; value: number | undefined }[]>;
//     SECTION_META.forEach(s => {
//       out[s.key] = (tableConfig.section_tables?.[s.key] ?? []).map(m => ({
//         name: m.name,
//         value: evalCell(m.formula, stage5Map),
//       }));
//     });
//     return out;
//   }, [tableConfig.section_tables, stage5Map]);

//   // What gets saved: stages 4 / 6 / 8 are display-only, so only the editable parts are stored.
//   const payloadTableConfig: TableConfig = useMemo(() => ({
//     display_metrics: namedDerived.map(d => d.name.trim()),
//     waterfall_metrics: [],
//     weights: tableConfig.weights ?? DEFAULT_WEIGHTS,
//     weighted_metrics: weightedList,
//     section_tables: {
//       stress: tableConfig.section_tables?.stress ?? [],
//       shock: tableConfig.section_tables?.shock ?? [],
//       opportunity: tableConfig.section_tables?.opportunity ?? [],
//       combined: tableConfig.section_tables?.combined ?? [],
//     },
//   }), [namedDerived, tableConfig.weights, tableConfig.section_tables, weightedList]);

//   // Save
//   const handleSave = useCallback(async () => {
//     setSaving(true);
//     setSaveMsg(null);
//     setError(null);
//     try {
//       await updateConfig(configId, {
//         name,
//         description,
//         currency_label: currencyLabel,
//         global_variables: globalVars,
//         derived_metrics: derivedMetrics,
//         scenarios,
//         table_config: payloadTableConfig,
//       });
//       setSaveMsg('Saved!');
//       setTimeout(() => setSaveMsg(null), 2000);
//     } catch (e) {
//       setError(e instanceof Error ? e.message : 'Save failed');
//     } finally {
//       setSaving(false);
//     }
//   }, [configId, name, description, currencyLabel, globalVars, derivedMetrics, scenarios, payloadTableConfig]);

//   // Compute
//   const handleCompute = useCallback(async () => {
//     setComputing(true);
//     setError(null);
//     try {
//       await updateConfig(configId, {
//         name,
//         description,
//         currency_label: currencyLabel,
//         global_variables: globalVars,
//         derived_metrics: derivedMetrics,
//         scenarios,
//         table_config: payloadTableConfig,
//       });

//       const res = await computeConfig(configId, `Computed from UI on ${new Date().toLocaleString()}`);
//       setResults(res.results);
//       setShowResults(true);
//     } catch (e) {
//       setError(e instanceof Error ? e.message : 'Computation failed');
//     } finally {
//       setComputing(false);
//     }
//   }, [configId, name, description, currencyLabel, globalVars, derivedMetrics, scenarios, payloadTableConfig]);

//   // Variable operations
//   const addGlobalVar = () => setGlobalVars(v => [...v, { name: '', value: 0, description: '' }]);
//   const updateGlobalVar = (idx: number, field: keyof VariableItem, value: string | number) => {
//     setGlobalVars(v => v.map((item, i) => i === idx ? { ...item, [field]: value } : item));
//   };
//   const deleteGlobalVar = (idx: number) => setGlobalVars(v => v.filter((_, i) => i !== idx));

//   // Derived operations
//   const addDerived = () => setDerivedMetrics(d => [...d, { name: '', formula: '', description: '', scenario_formulas: {} }]);
//   const updateDerived = (idx: number, field: keyof DerivedItem, value: string) => {
//     setDerivedMetrics(d => d.map((item, i) => i === idx ? { ...item, [field]: value } : item));
//   };
//   const updateScenarioFormula = (idx: number, scId: string, formula: string) => {
//     setDerivedMetrics(d => d.map((item, i) =>
//       i === idx ? { ...item, scenario_formulas: { ...(item.scenario_formulas ?? {}), [scId]: formula } } : item
//     ));
//   };
//   const deleteDerived = (idx: number) => setDerivedMetrics(d => d.filter((_, i) => i !== idx));

//   // Scenario operations
//   // auto-generate name so step completion check never falsely fails
//   const addScenario = useCallback((type: ScenarioItem['type']) => {
//     const label = SCENARIO_TYPE_META[type]?.label ?? type;
//     setScenarios(s => {
//       const count = s.filter(sc => sc.type === type).length + 1;
//       return [...s, {
//         id: genId(),
//         name: `${label} Scenario ${count}`,
//         type,
//         overrides: [],
//         variables: [],
//         derived: [],
//       }];
//     });
//   }, []);

//   // wrapped in useCallback to prevent stale-closure overwrites
//   const updateScenario = useCallback((id: string, updated: ScenarioItem) => {
//     setScenarios(s => s.map(sc => sc.id === id ? updated : sc));
//   }, []);

//   const deleteScenario = useCallback((id: string) => {
//     setScenarios(s => s.filter(sc => sc.id !== id));
//   }, []);

//   // ── Step completion checks ──
//   // 1 Variables → 2 Scenarios → 3 Derived Metrics → 4 Table 1 → 5 Weighted → 6 Table 2
//   // → 7 Section tables → 8 Tables 3–6 → 9 Calculate
//   const step1Complete =
//     globalVars.length > 0 &&
//     globalVars.every((v, i) => v.name.trim() && !globalNameIssues[i]);
//   const step2Complete =
//     scenarios.length > 0 &&
//     scenarios.every(s => {
//       const issues = scenarioVarIssues(s, globalVarNames, derivedNames);
//       return s.name.trim() && (s.variables ?? []).every((v, i) => v.name.trim() && !issues[i]);
//     });
//   const step3Complete =
//     derivedMetrics.length > 0 &&
//     derivedMetrics.every((d, i) =>
//       d.name.trim() && !derivedNameIssues[i] && d.formula.trim() &&
//       scenarios.every(sc => (d.scenario_formulas?.[sc.id] ?? '').trim())
//     );
//   const step5Complete =
//     weightedList.length > 0 &&
//     weightedList.every(w =>
//       w.formula.trim() && scenarios.every(sc => (w.scenario_formulas?.[sc.id] ?? '').trim())
//     );
//   const step7Complete =
//     SECTION_META.some(s => sectionMetrics(s.key).length > 0) &&
//     SECTION_META.every(s => {
//       const list = sectionMetrics(s.key);
//       const names = list.map(m => normalizeName(m.name));
//       return list.every((m, i) =>
//         m.name.trim() && m.formula.trim() && names.indexOf(normalizeName(m.name)) === i
//       );
//     });
//   const totalSectionMetrics = SECTION_META.reduce((n, s) => n + sectionMetrics(s.key).length, 0);
//   const canCalculate = step1Complete && step2Complete && step3Complete && step5Complete && step7Complete;

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center py-24">
//         <div className="w-6 h-6 border-2 border-mtn-yellow/30 border-t-mtn-yellow rounded-full animate-spin" />
//       </div>
//     );
//   }

//   // ── Results View ──
//   if (showResults && results) {
//     return (
//       <div className="space-y-6 pb-12 animate-in fade-in duration-500">
//         <div className="flex items-center gap-3">
//           <button
//             onClick={() => setShowResults(false)}
//             className="flex items-center gap-2 px-3 py-2 rounded-lg border border-outline/20 text-on-surface-variant hover:text-on-surface transition-colors font-mono text-[10px] uppercase tracking-widest"
//           >
//             <ArrowLeft className="w-3.5 h-3.5" /> Back to Editor
//           </button>
//           <h2 className="font-sans text-lg font-bold text-on-surface">{name} — Results</h2>
//         </div>
//         <SBResultsView
//           results={results}
//           scenarios={scenarios}
//           currencyLabel={currencyLabel}
//         />
//       </div>
//     );
//   }

//   const backBtn = (to: Step, label: string) => (
//     <button
//       onClick={() => setStep(to)}
//       className="px-4 py-2 rounded-lg border border-outline/20 text-on-surface-variant font-mono text-[10px] uppercase tracking-widest hover:text-on-surface hover:border-outline/40 transition-colors"
//     >
//       ← {label}
//     </button>
//   );
//   const nextBtn = (to: Step, label: string) => (
//     <button
//       onClick={() => setStep(to)}
//       className="px-4 py-2 rounded-lg bg-mtn-yellow text-black font-mono text-[10px] uppercase tracking-widest font-bold hover:bg-mtn-yellow/90 transition-colors"
//     >
//       Next: {label} →
//     </button>
//   );

//   return (
//     <div className="space-y-6 pb-12 animate-in fade-in duration-500">
//       {/* Top Bar */}
//       <div className="flex items-center gap-3 flex-wrap">
//         <button
//           onClick={onBack}
//           className="flex items-center gap-2 px-3 py-2 rounded-lg border border-outline/20 text-on-surface-variant hover:text-on-surface transition-colors"
//         >
//           <ArrowLeft className="w-4 h-4" />
//         </button>

//         <div className="flex-1 min-w-0">
//           <input
//             type="text"
//             value={name}
//             onChange={e => setName(e.target.value)}
//             className="w-full bg-transparent font-sans text-lg font-bold text-on-surface focus:outline-none"
//             placeholder="Configuration name…"
//           />
//         </div>

//         <div className="flex items-center gap-2">
//           <input
//             type="number"
//             value={year}
//             onChange={e => setYear(parseInt(e.target.value) || new Date().getFullYear())}
//             className="w-20 px-2 py-1.5 rounded-lg bg-surface-container border border-outline/20 text-xs text-on-surface font-mono text-center focus:outline-none"
//           />
//           <input
//             type="text"
//             value={currencyLabel}
//             onChange={e => setCurrencyLabel(e.target.value)}
//             placeholder="Unit"
//             className="w-20 px-2 py-1.5 rounded-lg bg-surface-container border border-outline/20 text-xs text-on-surface font-mono text-center focus:outline-none"
//           />

//           {saveMsg && (
//             <span className="flex items-center gap-1 text-green-400 font-mono text-[10px]">
//               <CheckCircle className="w-3 h-3" /> {saveMsg}
//             </span>
//           )}

//           <button
//             onClick={handleSave}
//             disabled={saving}
//             className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline/20 text-on-surface-variant hover:text-on-surface hover:border-outline/40 transition-colors font-mono text-[10px] uppercase tracking-widest disabled:opacity-50"
//           >
//             <Save className="w-3.5 h-3.5" />
//             {saving ? 'Saving…' : 'Save Draft'}
//           </button>

//           {results && (
//             <button
//               onClick={() => setShowResults(true)}
//               className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-colors font-mono text-[10px] uppercase tracking-widest"
//             >
//               <Eye className="w-3.5 h-3.5" /> View Results
//             </button>
//           )}
//         </div>
//       </div>

//       {/* Error */}
//       {error && (
//         <div className="rounded-lg bg-error/10 border border-error/30 p-3 flex gap-2">
//           <AlertTriangle className="w-3.5 h-3.5 text-error shrink-0 mt-0.5" />
//           <p className="font-sans text-xs text-error">{error}</p>
//         </div>
//       )}

//       {/* Step Navigation */}
//       <div className="flex flex-wrap gap-2">
//         <StepBadge step={1} label="Variables" active={step === 1} completed={step1Complete} onClick={() => setStep(1)} />
//         <StepBadge step={2} label="Scenarios" active={step === 2} completed={step2Complete} onClick={() => setStep(2)} />
//         <StepBadge step={3} label="Derived Metrics" active={step === 3} completed={step3Complete} onClick={() => setStep(3)} />
//         <StepBadge step={4} label="Table 1" active={step === 4} completed={step3Complete} onClick={() => setStep(4)} />
//         <StepBadge step={5} label="Weighted Table" active={step === 5} completed={step5Complete} onClick={() => setStep(5)} />
//         <StepBadge step={6} label="Table 2" active={step === 6} completed={step5Complete} onClick={() => setStep(6)} />
//         <StepBadge step={7} label="Section Tables" active={step === 7} completed={step7Complete} onClick={() => setStep(7)} />
//         <StepBadge step={8} label="Tables 3–6" active={step === 8} completed={step7Complete} onClick={() => setStep(8)} />
//         <StepBadge step={9} label="Calculate" active={step === 9} completed={!!results} onClick={() => setStep(9)} />
//       </div>

//       {/* ═══════════════════════════════════════════════════════════════════ */}
//       {/* Step 1: Global Variables */}
//       {step === 1 && (
//         <div className="space-y-4">
//           <div className="rounded-xl border border-outline/20 bg-surface-container-low p-5">
//             <div className="flex items-start gap-3 mb-4">
//               <Variable className="w-5 h-5 text-mtn-yellow shrink-0 mt-0.5" />
//               <div>
//                 <p className="font-sans text-sm font-semibold text-on-surface">Global & Base Case Variables</p>
//                 <p className="text-xs text-on-surface-variant mt-0.5">
//                   Define all input variables and their base case values. These are the raw inputs that
//                   your derived formulas will reference. Variable names become formula identifiers
//                   (spaces become underscores, case-insensitive).
//                 </p>
//               </div>
//             </div>

//             <NameTip className="mb-4" />

//             <div className="space-y-2">
//               {globalVars.map((v, i) => (
//                 <VariableRow
//                   key={i}
//                   item={v}
//                   index={i}
//                   nameError={globalNameIssues[i]}
//                   onChange={updateGlobalVar}
//                   onDelete={deleteGlobalVar}
//                 />
//               ))}
//             </div>

//             <button
//               onClick={addGlobalVar}
//               className="mt-3 flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-outline/20 text-on-surface-variant hover:text-mtn-yellow hover:border-mtn-yellow/30 transition-colors font-mono text-[10px] uppercase tracking-widest w-full justify-center"
//             >
//               <Plus className="w-3.5 h-3.5" /> Add Variable
//             </button>
//           </div>

//           {/* Live preview of variable names */}
//           {globalVars.length > 0 && (
//             <div className="rounded-lg border border-outline/10 bg-surface-container-low/50 p-3">
//               <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant mb-2">
//                 Available in formulas:
//               </p>
//               <div className="flex flex-wrap gap-1.5">
//                 {globalVars.filter(v => isUsableName(v.name)).map((v, i) => (
//                   <span key={i} className="px-2 py-0.5 rounded bg-surface-container border border-outline/20 font-mono text-[10px] text-on-surface">
//                     {normalizeName(v.name)} <span className="text-on-surface-variant">= {v.value}</span>
//                   </span>
//                 ))}
//               </div>
//             </div>
//           )}

//           <div className="flex justify-end">{nextBtn(2, 'Scenarios')}</div>
//         </div>
//       )}

//       {/* ═══════════════════════════════════════════════════════════════════ */}
//       {/* Step 2: Scenarios (overrides + scenario-only variables) */}
//       {step === 2 && (
//         <div className="space-y-4">
//           <div className="rounded-xl border border-outline/20 bg-surface-container-low p-5">
//             <div className="flex items-start gap-3 mb-4">
//               <FlaskConical className="w-5 h-5 text-mtn-yellow shrink-0 mt-0.5" />
//               <div>
//                 <p className="font-sans text-sm font-semibold text-on-surface">Define Scenarios</p>
//                 <p className="text-xs text-on-surface-variant mt-0.5">
//                   Create stress, shock, and opportunity scenarios. Each scenario can overwrite base case
//                   variables and/or define its own new variables. Both apply only to that scenario.
//                   You will define each metric&apos;s calculation for every scenario in the next step.
//                 </p>
//               </div>
//             </div>

//             <NameTip className="mb-4" />

//             {/* Add scenario buttons */}
//             <div className="flex gap-2 mb-4 flex-wrap">
//               <button
//                 onClick={() => addScenario('stress')}
//                 className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-mtn-yellow/30 bg-mtn-yellow/5 text-mtn-yellow font-mono text-[10px] uppercase tracking-widest hover:bg-mtn-yellow/10 transition-colors"
//               >
//                 <ShieldAlert className="w-3 h-3" /> + Stress Scenario
//               </button>
//               <button
//                 onClick={() => addScenario('shock')}
//                 className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/5 text-red-400 font-mono text-[10px] uppercase tracking-widest hover:bg-red-500/10 transition-colors"
//               >
//                 <Zap className="w-3 h-3" /> + Shock Scenario
//               </button>
//               <button
//                 onClick={() => addScenario('opportunity')}
//                 className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-green-500/30 bg-green-500/5 text-green-400 font-mono text-[10px] uppercase tracking-widest hover:bg-green-500/10 transition-colors"
//               >
//                 <TrendingUp className="w-3 h-3" /> + Opportunity Scenario
//               </button>
//             </div>

//             {/* Scenario list */}
//             <div className="space-y-3">
//               {scenarios.length === 0 && (
//                 <div className="text-center py-8 rounded-lg border border-dashed border-outline/15">
//                   <p className="text-xs text-on-surface-variant/50">No scenarios defined yet</p>
//                 </div>
//               )}
//               {(['stress', 'shock', 'opportunity'] as const).map(type => {
//                 const typeScenarios = scenarios.filter(s => s.type === type);
//                 if (typeScenarios.length === 0) return null;
//                 const meta = SCENARIO_TYPE_META[type];
//                 return (
//                   <div key={type} className="space-y-2">
//                     <p className={`font-mono text-[9px] uppercase tracking-widest ${typeTextClass(type)}`}>
//                       {meta.label} Scenarios ({typeScenarios.length})
//                     </p>
//                     {typeScenarios.map(sc => (
//                       <ScenarioCard
//                         key={sc.id}
//                         scenario={sc}
//                         allVariableNames={globalVarNames}
//                         derivedNames={derivedNames}
//                         onUpdate={updated => updateScenario(sc.id, updated)}
//                         onDelete={() => deleteScenario(sc.id)}
//                       />
//                     ))}
//                   </div>
//                 );
//               })}
//             </div>
//           </div>

//           <div className="flex justify-between">
//             {backBtn(1, 'Variables')}
//             {nextBtn(3, 'Derived Metrics')}
//           </div>
//         </div>
//       )}

//       {/* ═══════════════════════════════════════════════════════════════════ */}
//       {/* Step 3: Derived Metrics (collapsible; Base Case + every scenario) */}
//       {step === 3 && (
//         <div className="space-y-4">
//           <div className="rounded-xl border border-outline/20 bg-surface-container-low p-5">
//             <div className="flex items-start gap-3 mb-4">
//               <FunctionSquare className="w-5 h-5 text-mtn-yellow shrink-0 mt-0.5" />
//               <div>
//                 <p className="font-sans text-sm font-semibold text-on-surface">Derived Metrics & Calculation Map</p>
//                 <p className="text-xs text-on-surface-variant mt-0.5">
//                   These metrics fill the output tables. Click the arrow on a metric to expand it and
//                   define the Base Case calculation and its calculation under every scenario. A
//                   scenario&apos;s formula can use the base variables (with that scenario&apos;s overrides
//                   applied), that scenario&apos;s own variables, and metrics listed above. Every metric
//                   must be filled for the Base Case and all {scenarios.length} scenario(s).
//                 </p>
//               </div>
//             </div>

//             <NameTip className="mb-4" />

//             {scenarios.length === 0 && (
//               <div className="rounded-lg bg-mtn-yellow/5 border border-mtn-yellow/20 p-3 mb-3 flex gap-2">
//                 <AlertTriangle className="w-3.5 h-3.5 text-mtn-yellow shrink-0 mt-0.5" />
//                 <p className="text-xs text-mtn-yellow">Define scenarios in Step 2 first so each metric can have a value per scenario.</p>
//               </div>
//             )}

//             <div className="space-y-3">
//               {derivedMetrics.map((d, i) => (
//                 <DerivedRow
//                   key={i}
//                   item={d}
//                   index={i}
//                   scenarios={scenarios}
//                   availableVars={allVarNames}
//                   globalVarNames={globalVarNames}
//                   derivedNames={derivedNames}
//                   baseVarValues={baseVarValues}
//                   baseTestValues={baseCasePreview.variables}
//                   scenarioTestValues={scenarioPreviews}
//                   nameError={derivedNameIssues[i]}
//                   onChange={updateDerived}
//                   onChangeScenarioFormula={updateScenarioFormula}
//                   onDelete={deleteDerived}
//                 />
//               ))}
//             </div>

//             <button
//               onClick={addDerived}
//               className="mt-3 flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-outline/20 text-on-surface-variant hover:text-mtn-yellow hover:border-mtn-yellow/30 transition-colors font-mono text-[10px] uppercase tracking-widest w-full justify-center"
//             >
//               <Plus className="w-3.5 h-3.5" /> Add Derived Metric
//             </button>
//           </div>

//           {/* Live matrix preview: metrics × (Base Case + scenarios) */}
//           {derivedMetrics.some(d => d.name.trim()) && (
//             <div className="rounded-xl border border-outline/20 bg-surface-container-low p-4 overflow-x-auto">
//               <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant mb-3">
//                 Live Matrix Preview
//               </p>
//               <table className="w-full text-left text-[11px] font-mono">
//                 <thead>
//                   <tr className="border-b border-outline/10">
//                     <th className="p-2 text-on-surface-variant">Metric</th>
//                     <th className="p-2 text-blue-400">Base Case</th>
//                     {scenarios.map(sc => (
//                       <th key={sc.id} className="p-2 text-on-surface-variant">{sc.name || sc.id}</th>
//                     ))}
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {derivedMetrics.filter(d => d.name.trim()).map(d => {
//                     const key = normalizeName(d.name);
//                     const fmt = (v: number | undefined) => (v === undefined ? '—' : v.toFixed(2));
//                     return (
//                       <tr key={key} className="border-b border-outline/5">
//                         <td className="p-2 text-on-surface">{d.name}</td>
//                         <td className="p-2 text-green-400">{d.formula.trim() ? fmt(baseCasePreview.variables[key]) : '—'}</td>
//                         {scenarios.map(sc => (
//                           <td key={sc.id} className="p-2 text-on-surface-variant">
//                             {(d.scenario_formulas?.[sc.id] ?? '').trim() ? fmt(scenarioPreviews[sc.id]?.[key]) : '—'}
//                           </td>
//                         ))}
//                       </tr>
//                     );
//                   })}
//                 </tbody>
//               </table>
//             </div>
//           )}

//           <div className="flex justify-between">
//             {backBtn(2, 'Scenarios')}
//             {nextBtn(4, 'Table 1')}
//           </div>
//         </div>
//       )}

//       {/* ═══════════════════════════════════════════════════════════════════ */}
//       {/* Step 4: Table 1 (the live matrix, now the reference table) */}
//       {step === 4 && (
//         <div className="space-y-4">
//           <div className="rounded-xl border border-outline/20 bg-surface-container-low p-5">
//             <div className="flex items-start gap-3">
//               <TableProperties className="w-5 h-5 text-mtn-yellow shrink-0 mt-0.5" />
//               <div>
//                 <p className="font-sans text-sm font-semibold text-on-surface">Table 1 — Full Scenario Matrix</p>
//                 <p className="text-xs text-on-surface-variant mt-0.5">
//                   This is your first table: every derived metric for the Base Case and each scenario
//                   (stress, then shock, then opportunity). It is the reference for the next step, where
//                   each cell becomes a variable you can use in the weighted table.
//                 </p>
//               </div>
//             </div>
//           </div>

//           {!step3Complete && (
//             <div className="rounded-lg bg-mtn-yellow/5 border border-mtn-yellow/20 p-3 flex gap-2">
//               <AlertTriangle className="w-3.5 h-3.5 text-mtn-yellow shrink-0 mt-0.5" />
//               <p className="text-xs text-mtn-yellow">Some cells are still empty. Finish Step 3 so every metric has a Base Case and scenario formula.</p>
//             </div>
//           )}

//           <MatrixTable
//             tag="Table 1"
//             title="Full Scenario Matrix"
//             rows={table1Rows}
//             columns={orderedScenarios}
//           />

//           <StageVarChips title="Variables this table creates for Step 5" vars={stage3Vars} />

//           <div className="flex justify-between">
//             {backBtn(3, 'Derived Metrics')}
//             {nextBtn(5, 'Weighted Table')}
//           </div>
//         </div>
//       )}

//       {/* ═══════════════════════════════════════════════════════════════════ */}
//       {/* Step 5: Weighted table (formulas use ONLY Table 1 variables) */}
//       {step === 5 && (
//         <div className="space-y-4">
//           <div className="rounded-xl border border-outline/20 bg-surface-container-low p-5">
//             <div className="flex items-start gap-3 mb-4">
//               <FunctionSquare className="w-5 h-5 text-mtn-yellow shrink-0 mt-0.5" />
//               <div>
//                 <p className="font-sans text-sm font-semibold text-on-surface">Weighted Table</p>
//                 <p className="text-xs text-on-surface-variant mt-0.5">
//                   Each derived metric gets a weighted version (name ending in <code>wghtd</code>, set
//                   automatically). Define its Base Case and every scenario using only the variables from
//                   Table 1, named like <code>contribution margin base case</code> or{' '}
//                   <code>contribution margin &lt;scenario name&gt;</code>.
//                 </p>
//               </div>
//             </div>

//             <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 px-3 py-2 flex gap-2 mb-4">
//               <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
//               <p className="text-[10px] text-blue-400 leading-relaxed">
//                 <strong>Heads up:</strong> these variables are named after your metrics and scenarios.
//                 If you rename a metric or scenario later, re-pick it in any formula that used it.
//               </p>
//             </div>

//             {scenarios.length === 0 || weightedList.length === 0 ? (
//               <div className="rounded-lg bg-mtn-yellow/5 border border-mtn-yellow/20 p-3 flex gap-2">
//                 <AlertTriangle className="w-3.5 h-3.5 text-mtn-yellow shrink-0 mt-0.5" />
//                 <p className="text-xs text-mtn-yellow">Complete Steps 2 and 3 first — the weighted table is built from your derived metrics and scenarios.</p>
//               </div>
//             ) : (
//               <div className="space-y-3">
//                 {weightedList.map((w, i) => (
//                   <WeightedRow
//                     key={w.source}
//                     entry={w}
//                     scenarios={scenarios}
//                     tokens={stage3Tokens}
//                     labels={stage3Labels}
//                     testValues={stage3Map}
//                     preview={weightedPreview[i] ?? { base: undefined, scn: {} }}
//                     onChange={updateWeighted}
//                   />
//                 ))}
//               </div>
//             )}
//           </div>

//           <div className="flex justify-between">
//             {backBtn(4, 'Table 1')}
//             {nextBtn(6, 'Table 2')}
//           </div>
//         </div>
//       )}

//       {/* ═══════════════════════════════════════════════════════════════════ */}
//       {/* Step 6: Table 2 (weighted matrix) */}
//       {step === 6 && (
//         <div className="space-y-4">
//           <div className="rounded-xl border border-outline/20 bg-surface-container-low p-5">
//             <div className="flex items-start gap-3">
//               <TableProperties className="w-5 h-5 text-mtn-yellow shrink-0 mt-0.5" />
//               <div>
//                 <p className="font-sans text-sm font-semibold text-on-surface">Table 2 — Weighted Matrix</p>
//                 <p className="text-xs text-on-surface-variant mt-0.5">
//                   Your weighted metrics for the Base Case and each scenario. Each cell becomes a
//                   variable for the four section tables in the next step.
//                 </p>
//               </div>
//             </div>
//           </div>

//           {!step5Complete && (
//             <div className="rounded-lg bg-mtn-yellow/5 border border-mtn-yellow/20 p-3 flex gap-2">
//               <AlertTriangle className="w-3.5 h-3.5 text-mtn-yellow shrink-0 mt-0.5" />
//               <p className="text-xs text-mtn-yellow">Some cells are still empty. Finish Step 5 so every weighted metric has a Base Case and scenario formula.</p>
//             </div>
//           )}

//           <MatrixTable
//             tag="Table 2"
//             title="Weighted Matrix"
//             rows={table2Rows}
//             columns={orderedScenarios}
//           />

//           <StageVarChips title="Variables this table creates for Step 7" vars={stage5Vars} />

//           <div className="flex justify-between">
//             {backBtn(5, 'Weighted Table')}
//             {nextBtn(7, 'Section Tables')}
//           </div>
//         </div>
//       )}

//       {/* ═══════════════════════════════════════════════════════════════════ */}
//       {/* Step 7: Four section tables (formulas use ONLY Table 2 variables) */}
//       {step === 7 && (
//         <div className="space-y-4">
//           <div className="rounded-xl border border-outline/20 bg-surface-container-low p-5">
//             <div className="flex items-start gap-3 mb-4">
//               <Settings2 className="w-5 h-5 text-mtn-yellow shrink-0 mt-0.5" />
//               <div>
//                 <p className="font-sans text-sm font-semibold text-on-surface">Section Tables</p>
//                 <p className="text-xs text-on-surface-variant mt-0.5">
//                   Build one table per section: Stress, Shock, Opportunities (holding all other constant)
//                   and Opportunities (considering stress scenarios). Name each metric as you like and
//                   calculate it using only the variables from Table 2. Each section is independent, so
//                   its metrics can be different.
//                 </p>
//               </div>
//             </div>

//             <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 px-3 py-2 flex gap-2">
//               <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
//               <p className="text-[10px] text-blue-400 leading-relaxed">
//                 <strong>Waterfall order:</strong> the first metric is the start bar, the last is the total
//                 bar, and the ones in between are impact bars. Put them in the order you want them to cascade.
//               </p>
//             </div>
//           </div>

//           {!step5Complete && (
//             <div className="rounded-lg bg-mtn-yellow/5 border border-mtn-yellow/20 p-3 flex gap-2">
//               <AlertTriangle className="w-3.5 h-3.5 text-mtn-yellow shrink-0 mt-0.5" />
//               <p className="text-xs text-mtn-yellow">Finish the weighted table (Step 5) first — its variables are the only inputs available here.</p>
//             </div>
//           )}

//           <div className="space-y-4">
//             {SECTION_META.map(s => (
//               <SectionCard
//                 key={s.key}
//                 meta={s}
//                 metrics={sectionMetrics(s.key)}
//                 tokens={stage5Tokens}
//                 labels={stage5Labels}
//                 testValues={stage5Map}
//                 preview={sectionPreview[s.key] ?? []}
//                 onAdd={() => addSectionMetric(s.key)}
//                 onUpdate={(idx, patch) => updateSectionMetric(s.key, idx, patch)}
//                 onDelete={idx => deleteSectionMetric(s.key, idx)}
//               />
//             ))}
//           </div>

//           <div className="flex justify-between">
//             {backBtn(6, 'Table 2')}
//             {nextBtn(8, 'Tables 3–6')}
//           </div>
//         </div>
//       )}

//       {/* ═══════════════════════════════════════════════════════════════════ */}
//       {/* Step 8: Tables 3–6 */}
//       {step === 8 && (
//         <div className="space-y-4">
//           <div className="rounded-xl border border-outline/20 bg-surface-container-low p-5">
//             <div className="flex items-start gap-3">
//               <TableProperties className="w-5 h-5 text-mtn-yellow shrink-0 mt-0.5" />
//               <div>
//                 <p className="font-sans text-sm font-semibold text-on-surface">Tables 3–6 — Section Tables</p>
//                 <p className="text-xs text-on-surface-variant mt-0.5">
//                   These four tables feed the four waterfall charts.
//                 </p>
//               </div>
//             </div>
//           </div>

//           {!step7Complete && (
//             <div className="rounded-lg bg-mtn-yellow/5 border border-mtn-yellow/20 p-3 flex gap-2">
//               <AlertTriangle className="w-3.5 h-3.5 text-mtn-yellow shrink-0 mt-0.5" />
//               <p className="text-xs text-mtn-yellow">Some metrics are missing a name or formula. Finish Step 7.</p>
//             </div>
//           )}

//           <div className="grid gap-4 md:grid-cols-2">
//             {SECTION_META.map(s => (
//               <SectionTable key={s.key} meta={s} rows={sectionPreview[s.key] ?? []} />
//             ))}
//           </div>

//           <div className="flex justify-between">
//             {backBtn(7, 'Section Tables')}
//             {nextBtn(9, 'Calculate')}
//           </div>
//         </div>
//       )}

//       {/* ═══════════════════════════════════════════════════════════════════ */}
//       {/* Step 9: Save & Calculate → all tables + charts */}
//       {step === 9 && (
//         <div className="space-y-4">
//           {/* Summary */}
//           <div className="rounded-xl border border-outline/20 bg-surface-container-low p-5">
//             <p className="font-sans text-sm font-semibold text-on-surface mb-3">Configuration Summary</p>
//             <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
//               <div className="rounded-lg border border-outline/15 p-3 text-center">
//                 <p className="font-mono text-lg font-bold text-on-surface">{globalVars.length}</p>
//                 <p className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant mt-0.5">Variables</p>
//               </div>
//               <div className="rounded-lg border border-outline/15 p-3 text-center">
//                 <p className="font-mono text-lg font-bold text-on-surface">{derivedMetrics.length}</p>
//                 <p className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant mt-0.5">Derived Metrics</p>
//               </div>
//               <div className="rounded-lg border border-outline/15 p-3 text-center">
//                 <p className="font-mono text-lg font-bold text-on-surface">{scenarios.length}</p>
//                 <p className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant mt-0.5">Scenarios</p>
//               </div>
//               <div className="rounded-lg border border-outline/15 p-3 text-center">
//                 <p className="font-mono text-lg font-bold text-on-surface">{totalSectionMetrics}</p>
//                 <p className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant mt-0.5">Section Metrics</p>
//               </div>
//             </div>

//             {/* Scenario breakdown */}
//             <div className="mt-4 flex gap-3 flex-wrap">
//               {(['stress', 'shock', 'opportunity'] as const).map(type => {
//                 const count = scenarios.filter(s => s.type === type).length;
//                 const meta = SCENARIO_TYPE_META[type];
//                 const Icon = meta.icon;
//                 return (
//                   <div key={type} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${meta.borderClass} ${meta.bgClass}`}>
//                     <Icon className={`w-3 h-3 ${typeTextClass(type)}`} />
//                     <span className={`font-mono text-[9px] ${typeTextClass(type)}`}>{count} {meta.label}</span>
//                   </div>
//                 );
//               })}
//             </div>
//           </div>

//           {/* Warnings */}
//           {!step1Complete && (
//             <div className="rounded-lg bg-mtn-yellow/5 border border-mtn-yellow/20 p-3 flex gap-2">
//               <AlertTriangle className="w-3.5 h-3.5 text-mtn-yellow shrink-0 mt-0.5" />
//               <p className="text-xs text-mtn-yellow">Step 1 incomplete: Define at least one variable, and make sure every name is valid and unique (start with a letter; letters, numbers, spaces and _ only).</p>
//             </div>
//           )}
//           {!step2Complete && (
//             <div className="rounded-lg bg-mtn-yellow/5 border border-mtn-yellow/20 p-3 flex gap-2">
//               <AlertTriangle className="w-3.5 h-3.5 text-mtn-yellow shrink-0 mt-0.5" />
//               <p className="text-xs text-mtn-yellow">Step 2 incomplete: Define at least one scenario with a name, and give every scenario variable a valid, unique name.</p>
//             </div>
//           )}
//           {!step3Complete && (
//             <div className="rounded-lg bg-mtn-yellow/5 border border-mtn-yellow/20 p-3 flex gap-2">
//               <AlertTriangle className="w-3.5 h-3.5 text-mtn-yellow shrink-0 mt-0.5" />
//               <p className="text-xs text-mtn-yellow">Step 3 incomplete: Every derived metric needs a valid, unique name, a base case formula, and a formula for each scenario.</p>
//             </div>
//           )}
//           {!step5Complete && (
//             <div className="rounded-lg bg-mtn-yellow/5 border border-mtn-yellow/20 p-3 flex gap-2">
//               <AlertTriangle className="w-3.5 h-3.5 text-mtn-yellow shrink-0 mt-0.5" />
//               <p className="text-xs text-mtn-yellow">Step 5 incomplete: Every weighted metric needs a base case formula and a formula for each scenario.</p>
//             </div>
//           )}
//           {!step7Complete && (
//             <div className="rounded-lg bg-mtn-yellow/5 border border-mtn-yellow/20 p-3 flex gap-2">
//               <AlertTriangle className="w-3.5 h-3.5 text-mtn-yellow shrink-0 mt-0.5" />
//               <p className="text-xs text-mtn-yellow">Step 7 incomplete: Add at least one section metric, and give every metric a unique name and a formula.</p>
//             </div>
//           )}

//           {/* Calculate Button */}
//           <button
//             onClick={handleCompute}
//             disabled={computing || !canCalculate}
//             className={`w-full py-4 rounded-xl font-mono font-bold text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed ${
//               computing
//                 ? 'bg-mtn-yellow/70 text-black'
//                 : 'bg-mtn-yellow text-black hover:bg-mtn-yellow/90'
//             }`}
//           >
//             {computing ? (
//               <>
//                 <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
//                 Saving & Computing…
//               </>
//             ) : (
//               <>
//                 <Play className="w-4 h-4 fill-black" />
//                 Save & Create Tables and Charts
//               </>
//             )}
//           </button>

//           <div className="rounded-lg border border-outline/10 bg-surface-container-low/50 p-3 flex gap-2">
//             <Info className="w-3.5 h-3.5 text-on-surface-variant shrink-0 mt-0.5" />
//             <p className="text-[10px] text-on-surface-variant leading-relaxed">
//               This saves your configuration, runs every calculation on the server and creates a versioned
//               snapshot for audit tracking. You will get all six tables, the four waterfall charts built from
//               Tables 3–6, and a stacked bar chart built from Table 1.
//             </p>
//           </div>
//           <div className="flex justify-start">{backBtn(8, 'Tables 3–6')}</div>
//         </div>
//       )}
//     </div>
//   );
// }



// frontend/components/scenarioBuilder/ScenarioBuilderEditor.tsx

'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ArrowLeft, Save, Play, Plus, Trash2, GripVertical, CheckCircle,
  AlertTriangle, ChevronDown, ChevronRight, Info, Variable,
  FunctionSquare, ShieldAlert, Zap, TrendingUp, Settings2,
  Eye, FlaskConical, Delete, Lock, TableProperties, Pencil,
  Upload, Download, FileSpreadsheet, HelpCircle, X, Loader2,
} from 'lucide-react';
import {
  getConfig, updateConfig, computeConfig,
  type FullConfig, type VariableItem, type DerivedItem,
  type ScenarioItem, type ScenarioOverride, type ScenarioVariable,
  type TableConfig, type ComputedResults,
  type WeightedMetric, type SectionMetric, type SectionKey,
  type VariablesSource, type ParsedVariablesExcel,
  parseVariablesExcel, downloadVariablesTemplate,
} from '@/lib/scenarioBuilder';
import { evaluateFormula, normalizeName } from '@/lib/scenarioBuilder/formulaEngine';
import { SBResultsView } from '@/components/scenarioBuilder/SBResultsView';

// ── Helpers ───────────────────────────────────────────────────────────────

function genId(): string {
  return `sc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const SCENARIO_TYPE_META = {
  stress: { label: 'Stress', icon: ShieldAlert, color: 'mtn-yellow', borderClass: 'border-mtn-yellow/30', bgClass: 'bg-mtn-yellow/5' },
  shock: { label: 'Shock', icon: Zap, color: 'red-400', borderClass: 'border-red-500/30', bgClass: 'bg-red-500/5' },
  opportunity: { label: 'Opportunity', icon: TrendingUp, color: 'green-400', borderClass: 'border-green-500/30', bgClass: 'bg-green-500/5' },
} as const;

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

const TYPE_ORDER: Record<string, number> = { stress: 0, shock: 1, opportunity: 2 };

function typeTextClass(type: string): string {
  if (type === 'stress') return 'text-mtn-yellow';
  if (type === 'shock') return 'text-red-400';
  return 'text-green-400';
}

/** The four stage-7 sections. Each becomes its own table and waterfall chart. */
const SECTION_META: {
  key: SectionKey; table: string; title: string; desc: string;
  border: string; bg: string; text: string;
}[] = [
  {
    key: 'stress', table: 'Table 3', title: 'Stress',
    desc: 'All stress scenarios grouped into one table.',
    border: 'border-mtn-yellow/30', bg: 'bg-mtn-yellow/5', text: 'text-mtn-yellow',
  },
  {
    key: 'shock', table: 'Table 4', title: 'Shock',
    desc: 'All shock scenarios grouped into one table.',
    border: 'border-red-500/30', bg: 'bg-red-500/5', text: 'text-red-400',
  },
  {
    key: 'opportunity', table: 'Table 5', title: 'Opportunities (holding all other constant)',
    desc: 'Opportunity scenarios on their own, everything else held constant.',
    border: 'border-green-500/30', bg: 'bg-green-500/5', text: 'text-green-400',
  },
  {
    key: 'combined', table: 'Table 6', title: 'Opportunities (considering stress)',
    desc: 'Opportunity scenarios combined with the stress scenarios.',
    border: 'border-blue-500/30', bg: 'bg-blue-500/5', text: 'text-blue-400',
  },
];

/** De-duplicate a list of variable names by their normalized form (first spelling wins). */
function uniqueNames(names: string[]): string[] {
  const seen = new Map<string, string>();
  names.forEach(n => {
    const key = normalizeName(n);
    if (key && !seen.has(key)) seen.set(key, n);
  });
  return Array.from(seen.values());
}

// ── Stage variables (MUST match the backend's _stage_tokens) ─────────────

/** lowercase, every run of non [a-z0-9] characters → "_", trim "_" at the ends. */
function slug(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

interface StageVar {
  token: string;                   // safe formula identifier
  label: string;                   // human-readable, shown in dropdowns
  value: number | undefined;
}

/**
 * Variables a table exposes to the NEXT stage:
 *   "<metric> base case"            → <metric>_base_case
 *   "<metric> <scenario name>"      → <metric>_<scenario_name>
 * `col` is "base" or a scenario id.
 */
function buildStageVars(
  metricNames: string[],
  scenarios: ScenarioItem[],
  valueOf: (metricIdx: number, col: string) => number | undefined,
): StageVar[] {
  const used = new Set<string>();
  const uniq = (t: string) => {
    let candidate = t;
    let i = 2;
    while (used.has(candidate)) { candidate = `${t}_${i}`; i++; }
    used.add(candidate);
    return candidate;
  };

  const out: StageVar[] = [];
  metricNames.forEach((m, mi) => {
    const ms = slug(m);
    out.push({
      token: uniq(`${ms}_base_case`),
      label: `${m} base case`,
      value: valueOf(mi, 'base'),
    });
    scenarios.forEach(sc => {
      const ss = slug(sc.name || '') || slug(sc.id);
      out.push({
        token: uniq(`${ms}_${ss}`),
        label: `${m} ${sc.name || sc.id}`,
        value: valueOf(mi, sc.id),
      });
    });
  });
  return out;
}

function evalCell(f: string | undefined, map: Record<string, number>): number | undefined {
  if (!f || !f.trim()) return undefined;
  const r = evaluateFormula(f, map);
  return r.value === null ? undefined : r.value;
}

// ── Formula diagnostics (shown right where the formula is written) ───────

interface ExplainCtx {
  /** The metric this formula belongs to (to spot circular references). */
  self?: string;
  /** Names that exist but are calculated further down the list. */
  later?: string[];
  /** Replaces the default "isn't available here…" wording for unknown variables. */
  unknownHint?: string;
}

/** Cell-by-cell issues for one metric: Base Case + one message per scenario. */
interface CellIssues {
  base: string | null;
  scn: Record<string, string | null>;
}

function countIssues(i: CellIssues | undefined): number {
  if (!i) return 0;
  return (i.base ? 1 : 0) + Object.values(i.scn).filter(Boolean).length;
}

/** Turn the engine's raw error into a message that tells the user what to do. */
function explainError(error: string, ctx?: ExplainCtx): string {
  const m = /Unknown variable '([^']+)'/.exec(error);
  if (m) {
    const name = m[1] ?? '';
    const key = normalizeName(name);
    if (ctx?.self && normalizeName(ctx.self) === key) {
      return `"${name}" refers to itself — a metric can't use its own value (circular reference).`;
    }
    if (ctx?.later?.some(n => normalizeName(n) === key)) {
      return `"${name}" is calculated further down the list, so it isn't available yet. Move "${name}" above this metric, or use a different variable.`;
    }
    return `"${name}" ${ctx?.unknownHint ?? "isn't available here. Pick it from the dropdown — it may have been renamed, deleted, or belong to another scenario."}`;
  }
  if (/Division by zero/i.test(error)) {
    return 'Division by zero — a denominator in this formula is 0.';
  }
  if (/Expected RPAREN|Unexpected token '\)'/i.test(error)) {
    return "Brackets don't match — every ( needs a matching ).";
  }
  if (/Unexpected token|Expected /i.test(error)) {
    return `The formula looks incomplete or out of order (${error}). Check for a missing number, variable or operator.`;
  }
  return error;
}

/** Evaluate one formula against ONLY the variables allowed here; null means it is fine. */
function diagnose(
  formula: string | undefined,
  allowed: string[],
  values: Record<string, number> | undefined,
  ctx?: ExplainCtx,
): string | null {
  if (!formula || !formula.trim()) return null;
  const map: Record<string, number> = {};
  allowed.forEach(v => {
    const k = normalizeName(v);
    const tv = values?.[k];
    map[k] = tv !== undefined ? tv : 1;
  });
  const r = evaluateFormula(formula, map);
  return r.error === null ? null : explainError(r.error, ctx);
}

/** Red banner shown at the top of a stage that has formula problems. */
function IssueBanner({ count, children }: { count: number; children?: React.ReactNode }) {
  if (count === 0) return null;
  return (
    <div className="rounded-lg bg-red-500/5 border border-red-500/30 p-3 flex gap-2">
      <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
      <div className="text-xs text-red-400 space-y-1">
        <p>
          <strong>{count} formula issue{count !== 1 ? 's' : ''} in this stage.</strong>{' '}
          Look for the red messages below — each one says what to fix.
        </p>
        {children}
      </div>
    </div>
  );
}

// ── Name validation (variables, scenario variables, derived metrics) ─────

// Function names the formula engine reserves
const RESERVED_NAMES = new Set(['abs', 'min', 'max', 'round', 'sqrt']);

/**
 * Format check for a name. Names become formula identifiers, so they must
 * start with a letter/underscore and contain only letters, digits, spaces, "_".
 * Returns null when valid (or empty — "required" is handled separately).
 */
function validateName(raw: string): string | null {
  const n = raw.trim();
  if (!n) return null;
  if (!/^[A-Za-z_]/.test(n)) {
    return 'Must start with a letter (use payout_2025, not 2025 payout).';
  }
  if (!/^[A-Za-z0-9_ ]+$/.test(n)) {
    return 'Only letters, numbers, spaces and _ are allowed (no %, -, or other symbols).';
  }
  if (RESERVED_NAMES.has(normalizeName(n))) {
    return `"${n}" is a reserved function name — pick another.`;
  }
  return null;
}

/** Format check + duplicate check against names that are already taken. */
function nameIssue(raw: string, taken: string[]): string | null {
  const base = validateName(raw);
  if (base) return base;
  if (!raw.trim()) return null;
  const key = normalizeName(raw);
  if (taken.some(t => t.trim() && normalizeName(t) === key)) {
    return 'This name is already used by another variable or metric.';
  }
  return null;
}

/** Name issues for every scenario-only variable in one scenario. */
function scenarioVarIssues(sc: ScenarioItem, globalNames: string[], derivedNames: string[]): (string | null)[] {
  const vars = sc.variables ?? [];
  return vars.map((v, i) =>
    nameIssue(v.name, [
      ...globalNames,
      ...derivedNames,
      ...vars.filter((_, j) => j !== i).map(x => x.name),
    ])
  );
}

/** A name that is non-empty and well-formed (used to keep bad names out of dropdowns). */
function isUsableName(n: string): boolean {
  return !!n.trim() && validateName(n) === null;
}

/** Short naming guide shown wherever the user types a name. */
function NameTip({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-lg bg-blue-500/5 border border-blue-500/20 px-3 py-2 flex gap-2 ${className}`}>
      <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
      <p className="text-[10px] text-blue-400 leading-relaxed">
        <strong>Naming tip:</strong> start with a letter, then use only letters, numbers, spaces or{' '}
        <code>_</code>. Good: <code>payout_2025</code>, <code>mgmt fees pct</code>. Avoid:{' '}
        <code>2025 payout</code>, <code>fees_%</code>, <code>cost-ratio</code>.
      </p>
    </div>
  );
}

function FieldError({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <p className="flex items-start gap-1 mt-1 text-[10px] text-red-400 leading-snug">
      <AlertTriangle className="w-3 h-3 shrink-0 mt-px" />
      <span>{message}</span>
    </p>
  );
}

// ── Step Badge ─────────────────────────────────────────────────────────────

function StepBadge({ step, label, active, completed, issues = 0, onClick }: {
  step: number; label: string; active: boolean; completed: boolean; issues?: number; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-left ${
        active
          ? 'bg-mtn-yellow/10 border border-mtn-yellow/30'
          : issues > 0
            ? 'bg-red-500/5 border border-red-500/30 hover:border-red-500/50'
            : completed
              ? 'bg-green-500/5 border border-green-500/20 hover:border-green-500/40'
              : 'border border-outline/15 hover:border-outline/30'
      }`}
    >
      <div className={`flex items-center justify-center w-6 h-6 rounded-full font-mono text-xs font-bold shrink-0 ${
        active
          ? 'bg-mtn-yellow text-black'
          : issues > 0
            ? 'bg-red-500 text-black'
            : completed
              ? 'bg-green-500 text-black'
              : 'bg-surface-container text-on-surface-variant'
      }`}>
        {issues > 0 && !active ? '!' : completed && !active ? '✓' : step}
      </div>
      <span className={`font-mono text-[10px] uppercase tracking-widest ${
        active ? 'text-mtn-yellow' : issues > 0 ? 'text-red-400' : completed ? 'text-green-400' : 'text-on-surface-variant'
      }`}>
        {label}
      </span>
      {issues > 0 && (
        <span className="px-1.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 font-mono text-[8px] text-red-400">
          {issues}
        </span>
      )}
    </button>
  );
}

// ── Variable Row ──────────────────────────────────────────────────────────

/**
 * Number field that keeps exactly what the user types ("0", "0.", ".6", "-0.2") while
 * typing, and only reports a number once the text is a valid number.
 * A plain controlled <input type="number"> with `value || ''` hides 0 and drops "0.".
 */
const PARTIAL_NUMBER = /^-?\d*\.?\d*$/;

function NumberInput({ value, onChange, placeholder, className }: {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
}) {
  const [draft, setDraft] = useState(() => String(value ?? 0));
  const [lastValue, setLastValue] = useState(value);

  // Value changed from outside (Excel import, reload) → show the new value
  if (value !== lastValue) {
    setLastValue(value);
    if (Number(draft) !== value || draft.trim() === '') setDraft(String(value));
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      placeholder={placeholder}
      value={draft}
      onFocus={e => e.target.select()}
      onChange={e => {
        const text = e.target.value.replace(',', '.').trim();
        if (!PARTIAL_NUMBER.test(text)) return;        // ignore letters etc.
        setDraft(text);
        const n = Number(text);
        // "", "-", "." and "-." are unfinished → treat as 0 until a digit is typed
        const next = text === '' || text === '-' || text === '.' || text === '-.' ? 0 : n;
        if (Number.isFinite(next)) {
          setLastValue(next);
          onChange(next);
        }
      }}
      onBlur={() => {
        // Tidy unfinished input like "-", "." or "0." when leaving the field
        const n = Number(draft);
        const clean = Number.isFinite(n) && draft !== '' && draft !== '-' && draft !== '.' && draft !== '-.' ? n : 0;
        setDraft(String(clean));
      }}
      className={className}
    />
  );
}

function VariableRow({ item, index, nameError, onChange, onDelete }: {
  item: VariableItem; index: number;
  nameError?: string | null;
  onChange: (index: number, field: keyof VariableItem, value: string | number) => void;
  onDelete: (index: number) => void;
}) {
  return (
    <div className="group">
      <div className="flex items-center gap-2">
        <GripVertical className="w-3 h-3 text-on-surface-variant/30 shrink-0" />
        <input
          type="text"
          placeholder="Variable name (e.g. revenue)"
          value={item.name}
          onChange={e => onChange(index, 'name', e.target.value)}
          className={`flex-1 min-w-0 px-3 py-2 rounded-lg bg-surface-container border text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none font-mono ${
            nameError ? 'border-red-500/50 focus:border-red-500/70' : 'border-outline/20 focus:border-mtn-yellow/50'
          }`}
        />
        <NumberInput
          placeholder="Value"
          value={item.value}
          onChange={n => onChange(index, 'value', n)}
          className="w-32 px-3 py-2 rounded-lg bg-surface-container border border-outline/20 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:border-mtn-yellow/50 focus:outline-none font-mono text-right"
        />
        <input
          type="text"
          placeholder="Description (optional)"
          value={item.description}
          onChange={e => onChange(index, 'description', e.target.value)}
          className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-surface-container border border-outline/20 text-xs text-on-surface-variant placeholder:text-on-surface-variant/30 focus:border-outline/40 focus:outline-none"
        />
        <button
          onClick={() => onDelete(index)}
          className="p-1.5 rounded-lg text-on-surface-variant/40 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      {nameError && <div className="pl-5"><FieldError message={nameError} /></div>}
    </div>
  );
}

// ── Excel import (Step 1) ─────────────────────────────────────────────────

function formatUploadTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function ExcelImportPanel({ source, existingCount, onImport }: {
  source: VariablesSource | null;
  existingCount: number;
  onImport: (parsed: ParsedVariablesExcel, mode: 'replace' | 'merge') => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<'upload' | 'template' | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState<ParsedVariablesExcel | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [showHelp, setShowHelp] = useState(false);

  const apply = (parsed: ParsedVariablesExcel, mode: 'replace' | 'merge') => {
    onImport(parsed, mode);
    setPending(null);
    setWarnings(parsed.warnings);
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setErr(null);
    setWarnings([]);
    setPending(null);
    setBusy('upload');
    try {
      const parsed = await parseVariablesExcel(file);
      if (existingCount > 0) setPending(parsed);   // ask before touching typed-in variables
      else apply(parsed, 'replace');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = '';   // allow re-uploading the same file
    }
  };

  const handleTemplate = async () => {
    setErr(null);
    setBusy('template');
    try {
      await downloadVariablesTemplate();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Template download failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-lg border border-outline/15 bg-surface-container/40 p-3 mb-4 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <FileSpreadsheet className="w-4 h-4 text-green-400 shrink-0" />
        <div className="flex-1 min-w-[12rem]">
          <p className="font-sans text-xs font-semibold text-on-surface">Import variables from Excel</p>
          <p className="text-[11px] text-on-surface-variant">
            Columns: <span className="font-mono text-on-surface">variable_name</span>,{' '}
            <span className="font-mono text-on-surface">value</span>,{' '}
            <span className="font-mono text-on-surface">description</span> (optional)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleTemplate}
            disabled={busy !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline/20 text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors font-mono text-[10px] uppercase tracking-widest disabled:opacity-50"
          >
            {busy === 'template' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Download Template
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-colors font-mono text-[10px] uppercase tracking-widest disabled:opacity-50"
          >
            {busy === 'upload' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {busy === 'upload' ? 'Reading…' : 'Upload Excel'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xlsm,.csv"
            className="hidden"
            onChange={e => handleFile(e.target.files?.[0])}
          />
        </div>
      </div>

      {/* Basis of the current variables */}
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant">Basis:</span>
        {source?.type === 'excel' ? (
          <>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-500/10 border border-green-500/30 text-green-400 font-mono text-[10px]">
              <FileSpreadsheet className="w-3 h-3" /> Excel upload
            </span>
            <span className="font-mono text-on-surface break-all">{source.filename}</span>
            <span className="text-on-surface-variant">
              · {source.row_count} variable{source.row_count === 1 ? '' : 's'}
              {source.mode === 'merge' ? ' merged into existing list' : ''}
              {' '}· uploaded {formatUploadTime(source.uploaded_at)}
            </span>
            {source.edited_after_upload && (
              <span className="px-2 py-0.5 rounded bg-mtn-yellow/10 border border-mtn-yellow/30 text-mtn-yellow font-mono text-[10px]">
                edited manually since upload
              </span>
            )}
          </>
        ) : (
          <span className="px-2 py-0.5 rounded bg-surface-container border border-outline/20 text-on-surface-variant font-mono text-[10px]">
            Manual entry
          </span>
        )}
      </div>

      {/* Replace / merge choice when variables already exist */}
      {pending && (
        <div className="rounded-lg border border-mtn-yellow/30 bg-mtn-yellow/5 p-3 space-y-2">
          <p className="text-xs text-on-surface">
            <span className="font-mono">{pending.filename}</span> contains {pending.row_count} variable
            {pending.row_count === 1 ? '' : 's'}. You already have {existingCount}. What should happen?
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => apply(pending, 'replace')}
              className="px-3 py-1.5 rounded-lg bg-mtn-yellow text-black font-mono text-[10px] uppercase tracking-widest font-bold"
            >
              Replace all
            </button>
            <button
              onClick={() => apply(pending, 'merge')}
              className="px-3 py-1.5 rounded-lg border border-mtn-yellow/40 text-mtn-yellow font-mono text-[10px] uppercase tracking-widest"
            >
              Merge (update matching names, add new)
            </button>
            <button
              onClick={() => setPending(null)}
              className="px-3 py-1.5 rounded-lg text-on-surface-variant hover:text-on-surface font-mono text-[10px] uppercase tracking-widest"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {err && (
        <div className="flex gap-2 rounded-lg bg-error/10 border border-error/30 p-2.5">
          <AlertTriangle className="w-3.5 h-3.5 text-error shrink-0 mt-0.5" />
          <p className="text-xs text-error">{err}</p>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="rounded-lg bg-mtn-yellow/5 border border-mtn-yellow/20 p-2.5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-mtn-yellow shrink-0 mt-0.5" />
            <div className="flex-1 text-[11px] text-on-surface-variant space-y-0.5">
              <p className="text-mtn-yellow font-semibold">
                Imported with {warnings.length} row{warnings.length === 1 ? '' : 's'} skipped:
              </p>
              {warnings.map((w, i) => <p key={i}>{w}</p>)}
            </div>
            <button onClick={() => setWarnings([])} className="text-on-surface-variant hover:text-on-surface">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* How-to */}
      <div>
        <button
          onClick={() => setShowHelp(h => !h)}
          className="flex items-center gap-1.5 text-[11px] text-on-surface-variant hover:text-mtn-yellow transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          How to upload an Excel file
          {showHelp ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
        {showHelp && (
          <ol className="mt-2 ml-5 list-decimal space-y-1 text-[11px] text-on-surface-variant leading-relaxed">
            <li>Click <strong className="text-on-surface">Download Template</strong> and open it in Excel.</li>
            <li>
              On the <strong className="text-on-surface">Variables</strong> sheet, add one variable per row from row 2.
              Keep the header row exactly as it is.
            </li>
            <li>
              <span className="font-mono text-on-surface">variable_name</span>: letters, numbers and underscores,
              starting with a letter (e.g. <span className="font-mono">revenue</span>, <span className="font-mono">opex_2025</span>). Each name must be unique.
            </li>
            <li>
              <span className="font-mono text-on-surface">value</span>: a plain number. Commas are fine, and
              <span className="font-mono"> 12%</span> is read as <span className="font-mono">0.12</span>.
            </li>
            <li><span className="font-mono text-on-surface">description</span>: optional notes.</li>
            <li>
              Save as <strong className="text-on-surface">.xlsx</strong>, then click <strong className="text-on-surface">Upload Excel</strong>.
              The rows appear below. Check them and edit any value if needed; changes save automatically.
            </li>
          </ol>
        )}
      </div>
    </div>
  );
}

// ── Formula Builder (visual, click-based) ─────────────────────────────────

function FormulaBuilder({ value, onChange, availableVars, testValues, varLabels, explainCtx }: {
  value: string;
  onChange: (next: string) => void;
  availableVars: string[];
  testValues?: Record<string, number>;
  /** Optional token → human-readable label, used only for the dropdown text. */
  varLabels?: Record<string, string>;
  /** Context used to explain errors in plain language. */
  explainCtx?: ExplainCtx;
}) {
  const [selectedVar, setSelectedVar] = useState('');
  const [numInput, setNumInput] = useState('');

  const append = (token: string) => {
    const next = value.trim().length === 0 ? token : `${value} ${token}`;
    onChange(next);
  };

  const backspace = () => {
    const parts = value.trim().split(/\s+/).filter(Boolean);
    parts.pop();
    onChange(parts.join(' '));
  };

  const clear = () => onChange('');

  const insertVar = () => {
    if (!selectedVar) return;
    append(normalizeName(selectedVar));
    setSelectedVar('');
  };

  const insertNum = () => {
    const n = numInput.trim();
    if (!n) return;
    append(n);
    setNumInput('');
  };

  // Live preview using ONLY the variables allowed here (so a forward or unknown reference shows up)
  const preview = useMemo(() => {
    if (!value.trim()) return null;
    const varMap: Record<string, number> = {};
    availableVars.forEach(v => {
      const key = normalizeName(v);
      const tv = testValues?.[key];
      varMap[key] = tv !== undefined ? tv : 1;
    });
    const r = evaluateFormula(value, varMap);
    if (r.error !== null) {
      return { value: null as number | null, error: explainError(r.error, explainCtx) as string | null };
    }
    return { value: r.value as number | null, error: null as string | null };
  }, [value, availableVars, testValues, explainCtx]);

  const OP_BUTTONS: Array<{ label: string; token: string }> = [
    { label: '+', token: '+' },
    { label: '−', token: '-' },
    { label: '×', token: '*' },
    { label: '÷', token: '/' },
    { label: '^', token: '^' },
    { label: '(', token: '(' },
    { label: ')', token: ')' },
  ];

  const FN_BUTTONS: Array<{ label: string; token: string }> = [
    { label: 'abs(', token: 'abs(' },
    { label: 'min(', token: 'min(' },
    { label: 'max(', token: 'max(' },
    { label: 'sqrt(', token: 'sqrt(' },
    { label: 'round(', token: 'round(' },
    { label: ',', token: ',' },
  ];

  return (
    <div className={`rounded-lg border bg-surface-container-low p-3 space-y-2.5 ${
      preview?.error ? 'border-red-500/40' : 'border-outline/20'
    }`}>
      {/* Formula display */}
      <div className={`min-h-[42px] px-3 py-2 rounded-lg bg-surface-container border font-mono text-sm break-all ${
        preview?.error
          ? 'border-red-500/40 text-red-400'
          : value.trim()
            ? 'border-green-500/30 text-on-surface'
            : 'border-outline/20 text-on-surface-variant/40'
      }`}>
        {value.trim() || 'Click buttons below to build your formula…'}
      </div>

      {/* Variable + number inserters */}
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={selectedVar}
          onChange={e => setSelectedVar(e.target.value)}
          className="flex-1 min-w-[140px] px-2 py-1.5 rounded-lg bg-surface-container border border-outline/20 text-xs text-on-surface font-mono focus:outline-none"
        >
          <option value="">Pick a variable…</option>
          {availableVars.map(v => (
            <option key={v} value={v}>{varLabels?.[normalizeName(v)] ?? normalizeName(v)}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={insertVar}
          disabled={!selectedVar}
          className="px-2.5 py-1.5 rounded-lg bg-mtn-yellow/10 border border-mtn-yellow/40 text-mtn-yellow font-mono text-[10px] uppercase tracking-widest hover:bg-mtn-yellow/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          + Variable
        </button>

        <input
          type="number"
          value={numInput}
          onChange={e => setNumInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); insertNum(); } }}
          placeholder="123"
          className="w-24 px-2 py-1.5 rounded-lg bg-surface-container border border-outline/20 text-xs text-on-surface font-mono text-right focus:outline-none"
        />
        <button
          type="button"
          onClick={insertNum}
          disabled={!numInput.trim()}
          className="px-2.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/40 text-blue-400 font-mono text-[10px] uppercase tracking-widest hover:bg-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          + Num
        </button>
      </div>

      {/* Operator & function buttons */}
      <div className="flex flex-wrap gap-1.5">
        {OP_BUTTONS.map(op => (
          <button
            key={op.token}
            type="button"
            onClick={() => append(op.token)}
            className="w-9 h-9 rounded-lg bg-surface-container border border-outline/20 text-on-surface font-mono text-base hover:bg-surface-container-high hover:border-outline/40 transition-colors"
          >
            {op.label}
          </button>
        ))}
        <div className="w-px h-9 bg-outline/20 mx-1" />
        {FN_BUTTONS.map(fn => (
          <button
            key={fn.token}
            type="button"
            onClick={() => append(fn.token)}
            className="px-2.5 h-9 rounded-lg bg-surface-container border border-outline/20 text-on-surface font-mono text-xs hover:bg-surface-container-high hover:border-outline/40 transition-colors"
          >
            {fn.label}
          </button>
        ))}
        <div className="flex-1" />
        <button
          type="button"
          onClick={backspace}
          disabled={!value.trim()}
          className="flex items-center gap-1 px-2.5 h-9 rounded-lg bg-surface-container border border-outline/20 text-on-surface-variant font-mono text-[10px] uppercase tracking-widest hover:bg-surface-container-high hover:text-on-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Delete className="w-3 h-3" /> Back
        </button>
        <button
          type="button"
          onClick={clear}
          disabled={!value.trim()}
          className="px-2.5 h-9 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-[10px] uppercase tracking-widest hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Live validation */}
      {value.trim() && preview && (
        <div className={`flex items-start gap-2 px-2 py-1.5 rounded font-mono text-[10px] leading-snug ${
          preview.error
            ? 'bg-red-500/5 text-red-400'
            : 'bg-green-500/5 text-green-400'
        }`}>
          {preview.error ? (
            <>
              <AlertTriangle className="w-3 h-3 shrink-0 mt-px" />
              <span>{preview.error}</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-3 h-3 shrink-0 mt-px" />
              <span>Formula valid (test value: {preview.value?.toFixed(2)})</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** Compact list of a row's issues, shown under a collapsed header. Click to expand. */
function IssueLines({ lines, onOpen }: { lines: { label: string; msg: string }[]; onOpen: () => void }) {
  if (lines.length === 0) return null;
  const shown = lines.slice(0, 3);
  return (
    <button
      type="button"
      onClick={onOpen}
      title="Click to open and fix"
      className="w-full text-left px-4 pb-3 pl-12 space-y-1"
    >
      {shown.map((l, i) => (
        <p key={i} className="flex items-start gap-1 text-[10px] text-red-400 leading-snug">
          <AlertTriangle className="w-3 h-3 shrink-0 mt-px" />
          <span><strong>{l.label}:</strong> {l.msg}</span>
        </p>
      ))}
      {lines.length > shown.length && (
        <p className="text-[10px] text-red-400/70">…and {lines.length - shown.length} more — click to open</p>
      )}
    </button>
  );
}

// ── Derived Metric Row (collapsible: Base Case + one formula per scenario) ─

function DerivedRow({
  item, index, scenarios, globalVarNames, derivedAbove, derivedBelow, baseVarValues,
  baseTestValues, scenarioTestValues, nameError, issues,
  onChange, onChangeScenarioFormula, onDelete,
}: {
  item: DerivedItem; index: number;
  scenarios: ScenarioItem[];
  globalVarNames: string[];
  derivedAbove: string[];                  // metrics listed ABOVE this one (usable)
  derivedBelow: string[];                  // metrics listed BELOW this one (not usable yet)
  baseVarValues: Record<string, number>;
  baseTestValues?: Record<string, number>;
  scenarioTestValues: Record<string, Record<string, number>>;
  nameError?: string | null;
  issues: CellIssues;
  onChange: (index: number, field: keyof DerivedItem, value: string) => void;
  onChangeScenarioFormula: (index: number, scenarioId: string, formula: string) => void;
  onDelete: (index: number) => void;
}) {
  // Existing metrics load collapsed; a brand-new blank metric starts expanded.
  const [expanded, setExpanded] = useState(() => !item.name.trim() && !item.formula.trim());

  // Completion summary shown in the collapsed header
  const baseFilled = !!item.formula.trim();
  const filledScenarios = scenarios.filter(sc => (item.scenario_formulas?.[sc.id] ?? '').trim()).length;
  const totalCells = scenarios.length + 1;
  const filledCells = (baseFilled ? 1 : 0) + filledScenarios;
  const complete = filledCells === totalCells;
  const baseValue = baseFilled && item.name.trim()
    ? baseTestValues?.[normalizeName(item.name)]
    : undefined;

  const issueCount = countIssues(issues);
  const issueLines: { label: string; msg: string }[] = [];
  if (issues.base) issueLines.push({ label: 'Base Case', msg: issues.base });
  scenarios.forEach(sc => {
    const m = issues.scn[sc.id];
    if (m) issueLines.push({ label: sc.name || sc.id, msg: m });
  });

  const explainCtx: ExplainCtx = { self: item.name, later: derivedBelow };
  const baseAvailable = [...globalVarNames, ...derivedAbove];

  return (
    <div className={`rounded-xl border bg-surface-container-low/50 group ${issueCount > 0 ? 'border-red-500/60' : 'border-white'}`}>
      {/* Header (always visible) */}
      <div className="flex items-center gap-2 p-3">
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          title={expanded ? 'Collapse' : 'Expand'}
          className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors shrink-0"
        >
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        <input
          type="text"
          placeholder="Metric name (e.g. revenue)"
          value={item.name}
          onChange={e => onChange(index, 'name', e.target.value)}
          className={`w-48 px-3 py-2 rounded-lg bg-surface-container border text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none font-mono ${
            nameError ? 'border-red-500/50 focus:border-red-500/70' : 'border-outline/20 focus:border-mtn-yellow/50'
          }`}
        />
        <input
          type="text"
          placeholder="Description (optional)"
          value={item.description || ''}
          onChange={e => onChange(index, 'description', e.target.value)}
          className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-surface-container border border-outline/20 text-xs text-on-surface-variant placeholder:text-on-surface-variant/30 focus:border-outline/40 focus:outline-none"
        />

        {/* Status summary */}
        {issueCount > 0 && (
          <span className="shrink-0 px-2 py-1 rounded-full border border-red-500/40 bg-red-500/10 font-mono text-[9px] uppercase tracking-widest text-red-400">
            {issueCount} issue{issueCount !== 1 ? 's' : ''}
          </span>
        )}
        <span
          className={`shrink-0 px-2 py-1 rounded-full border font-mono text-[9px] uppercase tracking-widest ${
            complete
              ? 'border-green-500/30 bg-green-500/10 text-green-400'
              : 'border-red-500/30 bg-red-500/10 text-red-400'
          }`}
        >
          {filledCells}/{totalCells} filled
        </span>
        {baseValue !== undefined && (
          <span className="shrink-0 hidden md:inline font-mono text-[10px] text-blue-400">
            base = {baseValue.toFixed(2)}
          </span>
        )}

        <button
          onClick={() => onDelete(index)}
          className="p-1.5 rounded-lg text-on-surface-variant/40 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      {nameError && <div className="px-3 pb-3 -mt-1 pl-12"><FieldError message={nameError} /></div>}

      {/* Problems stay visible even while collapsed */}
      {!expanded && <IssueLines lines={issueLines} onOpen={() => setExpanded(true)} />}

      {/* Expanded body: Base Case + every scenario */}
      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-white/20 pt-3">
          {/* Base case */}
          <div className="space-y-1.5">
            <p className="font-mono text-[9px] uppercase tracking-widest text-blue-400">
              Base Case
              {!baseFilled && <span className="ml-2 text-red-400">· required</span>}
            </p>
            <FormulaBuilder
              value={item.formula}
              onChange={next => onChange(index, 'formula', next)}
              availableVars={baseAvailable}
              testValues={baseTestValues}
              explainCtx={explainCtx}
            />
          </div>

          {/* One formula per scenario */}
          {scenarios.map(sc => {
            const meta = SCENARIO_TYPE_META[sc.type] || SCENARIO_TYPE_META.stress;
            const val = item.scenario_formulas?.[sc.id] ?? '';

            // Variables visible ONLY in this scenario: base variables (with this scenario's
            // overrides applied) + this scenario's own new variables + metrics ABOVE this one.
            const scVars = (sc.variables ?? []).filter(v => isUsableName(v.name));
            const overrideMap = new Map<string, number>();
            sc.overrides.forEach(o => {
              if (o.name.trim()) overrideMap.set(normalizeName(o.name), o.value);
            });
            const scAvailable = uniqueNames([
              ...globalVarNames,
              ...scVars.map(v => v.name),
              ...derivedAbove,
            ]);

            return (
              <div key={sc.id} className="space-y-1.5">
                <p className={`font-mono text-[9px] uppercase tracking-widest ${typeTextClass(sc.type)}`}>
                  {sc.name || sc.id} <span className="text-on-surface-variant/50">({meta.label})</span>
                  {!val.trim() && <span className="ml-2 text-red-400">· required</span>}
                </p>

                {/* What this scenario's variables look like */}
                {(globalVarNames.length > 0 || scVars.length > 0) && (
                  <div className="flex flex-wrap gap-1.5">
                    {globalVarNames.map(n => {
                      const key = normalizeName(n);
                      const overridden = overrideMap.has(key);
                      const shown = overridden ? overrideMap.get(key) : baseVarValues[key];
                      return (
                        <span
                          key={`g-${key}`}
                          className={`px-2 py-0.5 rounded border font-mono text-[9px] ${
                            overridden
                              ? 'border-mtn-yellow/40 bg-mtn-yellow/10 text-mtn-yellow'
                              : 'border-outline/15 bg-surface-container text-on-surface-variant'
                          }`}
                        >
                          {key} = {shown}
                          {overridden && <span className="ml-1 opacity-70">(overridden, base {baseVarValues[key]})</span>}
                        </span>
                      );
                    })}
                    {scVars.map((v, i) => (
                      <span
                        key={`s-${i}`}
                        className="px-2 py-0.5 rounded border border-blue-500/40 bg-blue-500/10 text-blue-400 font-mono text-[9px]"
                      >
                        {normalizeName(v.name)} = {v.value}
                        <span className="ml-1 opacity-70">(this scenario only)</span>
                      </span>
                    ))}
                  </div>
                )}

                <FormulaBuilder
                  value={val}
                  onChange={next => onChangeScenarioFormula(index, sc.id, next)}
                  availableVars={scAvailable}
                  testValues={scenarioTestValues[sc.id]}
                  explainCtx={explainCtx}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Scenario Card ─────────────────────────────────────────────────────────

function ScenarioCard({ scenario, allVariableNames, derivedNames, onUpdate, onDelete }: {
  scenario: ScenarioItem;
  allVariableNames: string[];
  derivedNames: string[];
  onUpdate: (updated: ScenarioItem) => void;
  onDelete: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const meta = SCENARIO_TYPE_META[scenario.type] || SCENARIO_TYPE_META.stress;
  const Icon = meta.icon;
  const scenarioVariables = scenario.variables ?? [];
  const varIssues = scenarioVarIssues(scenario, allVariableNames, derivedNames);

  // Overrides (overwrite a base variable, this scenario only)
  const addOverride = () => {
    onUpdate({
      ...scenario,
      overrides: [...scenario.overrides, { name: '', value: 0 }],
    });
  };

  const updateOverride = (idx: number, field: keyof ScenarioOverride, value: string | number) => {
    const updated = [...scenario.overrides];
    const current = updated[idx];
    if (current === undefined) return;
    updated[idx] = { ...current, [field]: value };
    onUpdate({ ...scenario, overrides: updated });
  };

  const deleteOverride = (idx: number) => {
    onUpdate({
      ...scenario,
      overrides: scenario.overrides.filter((_, i) => i !== idx),
    });
  };

  // Scenario-only variables (new variables that exist only in this scenario)
  const addScenarioVariable = () => {
    onUpdate({
      ...scenario,
      variables: [...scenarioVariables, { name: '', value: 0, description: '' }],
    });
  };

  const updateScenarioVariable = (idx: number, field: keyof ScenarioVariable, value: string | number) => {
    const updated = [...scenarioVariables];
    const current = updated[idx];
    if (current === undefined) return;
    updated[idx] = { ...current, [field]: value };
    onUpdate({ ...scenario, variables: updated });
  };

  const deleteScenarioVariable = (idx: number) => {
    onUpdate({
      ...scenario,
      variables: scenarioVariables.filter((_, i) => i !== idx),
    });
  };

  return (
    <div className={`rounded-xl border ${meta.borderClass} ${meta.bgClass} overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => setCollapsed(c => !c)} className="shrink-0">
          {collapsed ? <ChevronRight className="w-4 h-4 text-on-surface-variant" /> : <ChevronDown className="w-4 h-4 text-on-surface-variant" />}
        </button>
        <Icon className={`w-4 h-4 ${typeTextClass(scenario.type)} shrink-0`} />
        <input
          type="text"
          value={scenario.name}
          onChange={e => onUpdate({ ...scenario, name: e.target.value })}
          placeholder="Scenario name"
          className={`flex-1 bg-transparent font-sans text-sm font-bold text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none ${
            !scenario.name.trim() ? 'ring-1 ring-red-500/40 rounded px-2' : ''
          }`}
        />
        {!scenario.name.trim() && (
          <span className="font-mono text-[8px] text-red-400 uppercase tracking-widest shrink-0">Name required</span>
        )}
        <select
          value={scenario.type}
          onChange={e => onUpdate({ ...scenario, type: e.target.value as ScenarioItem['type'] })}
          className="px-2 py-1 rounded-lg bg-surface-container border border-outline/20 text-xs text-on-surface font-mono focus:outline-none"
        >
          <option value="stress">Stress</option>
          <option value="shock">Shock</option>
          <option value="opportunity">Opportunity</option>
        </select>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg text-on-surface-variant/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Body */}
      {!collapsed && (
        <div className="px-4 pb-4 space-y-4">
          {/* Variable Overrides */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant">
                Variable Overrides (overwrite a base case value, for this scenario only)
              </p>
              <button
                onClick={addOverride}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono text-mtn-yellow hover:bg-mtn-yellow/10 transition-colors"
              >
                <Plus className="w-2.5 h-2.5" /> Override
              </button>
            </div>
            <div className="space-y-1.5">
              {scenario.overrides.length === 0 && (
                <p className="text-[10px] text-on-surface-variant/50 italic">No overrides — uses base case values</p>
              )}
              {scenario.overrides.map((ov, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={ov.name}
                    onChange={e => updateOverride(idx, 'name', e.target.value)}
                    className="flex-1 px-2 py-1.5 rounded-lg bg-surface-container border border-outline/20 text-xs text-on-surface font-mono focus:outline-none"
                  >
                    <option value="">Select variable…</option>
                    {allVariableNames.map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                  <NumberInput
                    value={ov.value}
                    onChange={n => updateOverride(idx, 'value', n)}
                    placeholder="Override value"
                    className="w-28 px-2 py-1.5 rounded-lg bg-surface-container border border-outline/20 text-xs text-on-surface font-mono text-right focus:outline-none"
                  />
                  <button
                    onClick={() => deleteOverride(idx)}
                    className="p-1 rounded text-on-surface-variant/40 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Scenario-only Variables */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant">
                Scenario Variables (new variables that exist only in this scenario)
              </p>
              <button
                onClick={addScenarioVariable}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono text-mtn-yellow hover:bg-mtn-yellow/10 transition-colors"
              >
                <Plus className="w-2.5 h-2.5" /> Variable
              </button>
            </div>
            <div className="space-y-1.5">
              {scenarioVariables.length === 0 && (
                <p className="text-[10px] text-on-surface-variant/50 italic">
                  No scenario variables — add one if this scenario needs its own input (e.g. failure_rate)
                </p>
              )}
              {scenarioVariables.map((sv, idx) => {
                const issue = varIssues[idx];
                return (
                  <div key={idx}>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={sv.name}
                        onChange={e => updateScenarioVariable(idx, 'name', e.target.value)}
                        placeholder="Variable name (e.g. failure_rate)"
                        className={`flex-1 min-w-0 px-2 py-1.5 rounded-lg bg-surface-container border text-xs text-on-surface font-mono placeholder:text-on-surface-variant/40 focus:outline-none ${
                          sv.name.trim() && !issue ? 'border-outline/20' : 'border-red-500/40'
                        }`}
                      />
                      <NumberInput
                        value={sv.value}
                        onChange={n => updateScenarioVariable(idx, 'value', n)}
                        placeholder="Value"
                        className="w-28 px-2 py-1.5 rounded-lg bg-surface-container border border-outline/20 text-xs text-on-surface font-mono text-right focus:outline-none"
                      />
                      <input
                        type="text"
                        value={sv.description ?? ''}
                        onChange={e => updateScenarioVariable(idx, 'description', e.target.value)}
                        placeholder="Description (optional)"
                        className="flex-1 min-w-0 px-2 py-1.5 rounded-lg bg-surface-container border border-outline/20 text-[11px] text-on-surface-variant placeholder:text-on-surface-variant/30 focus:outline-none"
                      />
                      <button
                        onClick={() => deleteScenarioVariable(idx)}
                        className="p-1 rounded text-on-surface-variant/40 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <FieldError message={issue} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Matrix table (Table 1 and Table 2 previews) ───────────────────────────

interface MatrixRow {
  key: string;
  label: string;
  base: number | undefined;
  values: Record<string, number | undefined>;
}

function MatrixTable({ tag, title, rows, columns, unit }: {
  tag: string; title: string; rows: MatrixRow[]; columns: ScenarioItem[]; unit: string;
}) {
  const fmt = (v: number | undefined) => (v === undefined ? '—' : v.toFixed(2));
  return (
    <div className="rounded-xl border border-outline/20 bg-[#1A1A1A] overflow-hidden">
      <div className="p-4 border-b border-outline/10">
        <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant">{tag}</p>
        <p className="font-sans text-sm font-bold text-on-surface mt-1">
          {title} <span className="text-on-surface-variant font-normal">({unit})</span>
        </p>
      </div>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-[11px] font-mono">
          <thead>
            <tr className="border-b border-outline/10">
              <th className="p-3 text-on-surface-variant sticky left-0 bg-[#1A1A1A] z-10 min-w-[160px]">Metric</th>
              <th className="p-3 text-blue-400 text-center min-w-[110px]">Base Case</th>
              {columns.map(sc => (
                <th key={sc.id} className={`p-3 text-center min-w-[110px] ${typeTextClass(sc.type)}`}>
                  {sc.name || sc.id}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={columns.length + 2} className="p-4 text-center text-on-surface-variant/50 italic">No metrics yet</td></tr>
            )}
            {rows.map((r, i) => (
              <tr key={r.key} className={`border-b border-outline/5 ${i % 2 === 0 ? 'bg-surface-container-low/30' : ''}`}>
                <td className="p-3 text-on-surface sticky left-0 bg-inherit z-10 whitespace-nowrap font-sans text-xs">{r.label}</td>
                <td className="p-3 text-center text-green-400 font-semibold">{fmt(r.base)}</td>
                {columns.map(sc => (
                  <td key={sc.id} className="p-3 text-center text-on-surface-variant">{fmt(r.values[sc.id])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Collapsible list of the variables a table hands to the next stage. */
function StageVarChips({ title, vars }: { title: string; vars: StageVar[] }) {
  if (vars.length === 0) return null;
  return (
    <details className="rounded-lg border border-outline/10 bg-surface-container-low/50 p-3">
      <summary className="cursor-pointer font-mono text-[9px] uppercase tracking-widest text-on-surface-variant">
        {title} ({vars.length})
      </summary>
      <div className="flex flex-wrap gap-1.5 mt-3">
        {vars.map(v => (
          <span key={v.token} className="px-2 py-0.5 rounded bg-surface-container border border-outline/20 font-mono text-[10px] text-on-surface">
            {v.label}
            <span className="text-on-surface-variant"> = {v.value === undefined ? '—' : v.value.toFixed(2)}</span>
          </span>
        ))}
      </div>
    </details>
  );
}

// ── Weighted Row (stage 5: locked name, Base Case + one formula per scenario) ─

function WeightedRow({
  entry, scenarios, tokens, labels, testValues, preview, issues, explainCtx, onChange,
}: {
  entry: WeightedMetric;
  scenarios: ScenarioItem[];
  tokens: string[];                                  // stage-3 variables only
  labels: Record<string, string>;
  testValues: Record<string, number>;
  preview: { base: number | undefined; scn: Record<string, number | undefined> };
  issues: CellIssues;
  explainCtx: ExplainCtx;
  onChange: (source: string, patch: { formula?: string; scenarioId?: string; scenarioFormula?: string }) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const baseFilled = !!entry.formula.trim();
  const filledScenarios = scenarios.filter(sc => (entry.scenario_formulas?.[sc.id] ?? '').trim()).length;
  const totalCells = scenarios.length + 1;
  const filledCells = (baseFilled ? 1 : 0) + filledScenarios;
  const complete = filledCells === totalCells;

  const issueCount = countIssues(issues);
  const issueLines: { label: string; msg: string }[] = [];
  if (issues.base) issueLines.push({ label: 'Base Case', msg: issues.base });
  scenarios.forEach(sc => {
    const m = issues.scn[sc.id];
    if (m) issueLines.push({ label: sc.name || sc.id, msg: m });
  });

  return (
    <div className={`rounded-xl border bg-surface-container-low/50 ${issueCount > 0 ? 'border-red-500/60' : 'border-white'}`}>
      <div className="flex items-center gap-2 p-3">
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          title={expanded ? 'Collapse' : 'Expand'}
          className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors shrink-0"
        >
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {/* Locked, pre-filled name */}
        <div className="flex items-center gap-2 flex-1 min-w-0 px-3 py-2 rounded-lg bg-surface-container border border-outline/20">
          <Lock className="w-3 h-3 text-on-surface-variant/60 shrink-0" />
          <span className="font-mono text-sm text-on-surface truncate">{entry.name}</span>
        </div>

        {issueCount > 0 && (
          <span className="shrink-0 px-2 py-1 rounded-full border border-red-500/40 bg-red-500/10 font-mono text-[9px] uppercase tracking-widest text-red-400">
            {issueCount} issue{issueCount !== 1 ? 's' : ''}
          </span>
        )}
        <span
          className={`shrink-0 px-2 py-1 rounded-full border font-mono text-[9px] uppercase tracking-widest ${
            complete
              ? 'border-green-500/30 bg-green-500/10 text-green-400'
              : 'border-red-500/30 bg-red-500/10 text-red-400'
          }`}
        >
          {filledCells}/{totalCells} filled
        </span>
        {preview.base !== undefined && (
          <span className="shrink-0 hidden md:inline font-mono text-[10px] text-blue-400">
            base = {preview.base.toFixed(2)}
          </span>
        )}
      </div>

      {!expanded && <IssueLines lines={issueLines} onOpen={() => setExpanded(true)} />}

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-white/20 pt-3">
          <div className="space-y-1.5">
            <p className="font-mono text-[9px] uppercase tracking-widest text-blue-400">
              Base Case
              {!baseFilled && <span className="ml-2 text-red-400">· required</span>}
            </p>
            <FormulaBuilder
              value={entry.formula}
              onChange={next => onChange(entry.source, { formula: next })}
              availableVars={tokens}
              testValues={testValues}
              varLabels={labels}
              explainCtx={explainCtx}
            />
          </div>

          {scenarios.map(sc => {
            const val = entry.scenario_formulas?.[sc.id] ?? '';
            const meta = SCENARIO_TYPE_META[sc.type] || SCENARIO_TYPE_META.stress;
            return (
              <div key={sc.id} className="space-y-1.5">
                <p className={`font-mono text-[9px] uppercase tracking-widest ${typeTextClass(sc.type)}`}>
                  {sc.name || sc.id} <span className="text-on-surface-variant/50">({meta.label})</span>
                  {!val.trim() && <span className="ml-2 text-red-400">· required</span>}
                </p>
                <FormulaBuilder
                  value={val}
                  onChange={next => onChange(entry.source, { scenarioId: sc.id, scenarioFormula: next })}
                  availableVars={tokens}
                  testValues={testValues}
                  varLabels={labels}
                  explainCtx={explainCtx}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Section Card (stage 7: its own list of metrics → one table + one waterfall) ─

function SectionCard({
  meta, metrics, tokens, labels, testValues, preview, issues, explainCtx, onAdd, onUpdate, onDelete,
}: {
  meta: typeof SECTION_META[number];
  metrics: SectionMetric[];
  tokens: string[];                                  // stage-5 variables only
  labels: Record<string, string>;
  testValues: Record<string, number>;
  preview: { name: string; value: number | undefined }[];
  issues: (string | null)[];
  explainCtx: ExplainCtx;
  onAdd: () => void;
  onUpdate: (idx: number, patch: Partial<SectionMetric>) => void;
  onDelete: (idx: number) => void;
}) {
  const [open, setOpen] = useState(true);
  const names = metrics.map(m => normalizeName(m.name));
  const issueCount = issues.filter(Boolean).length;

  const roleOf = (i: number): string => {
    if (i === 0) return 'Start bar';
    if (i === metrics.length - 1 && metrics.length > 1) return 'Total bar';
    return 'Impact bar';
  };

  return (
    <div className={`rounded-xl border ${issueCount > 0 ? 'border-red-500/50' : meta.border} ${meta.bg} overflow-hidden`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <button type="button" onClick={() => setOpen(o => !o)} className="shrink-0">
          {open ? <ChevronDown className="w-4 h-4 text-on-surface-variant" /> : <ChevronRight className="w-4 h-4 text-on-surface-variant" />}
        </button>
        <div className="flex-1 min-w-0">
          <p className={`font-sans text-sm font-bold ${meta.text}`}>
            {meta.table} — {meta.title}
          </p>
          <p className="text-[10px] text-on-surface-variant">{meta.desc}</p>
        </div>
        {issueCount > 0 && (
          <span className="shrink-0 px-2 py-1 rounded-full border border-red-500/40 bg-red-500/10 font-mono text-[9px] uppercase tracking-widest text-red-400">
            {issueCount} issue{issueCount !== 1 ? 's' : ''}
          </span>
        )}
        <span className="shrink-0 px-2 py-1 rounded-full border border-outline/20 font-mono text-[9px] uppercase tracking-widest text-on-surface-variant">
          {metrics.length} metric{metrics.length !== 1 ? 's' : ''}
        </span>
      </div>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          {metrics.length === 0 && (
            <p className="text-[10px] text-on-surface-variant/50 italic">
              No metrics yet — add the metrics that make up this table.
            </p>
          )}

          {metrics.map((m, i) => {
            const duplicate = !!m.name.trim() && names.indexOf(normalizeName(m.name)) !== i;
            const val = preview[i]?.value;
            return (
              <div key={i} className={`rounded-xl border bg-surface-container-low/60 p-3 space-y-2.5 group ${issues[i] ? 'border-red-500/60' : 'border-white'}`}>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Metric name (your choice)"
                    value={m.name}
                    onChange={e => onUpdate(i, { name: e.target.value })}
                    className={`flex-1 min-w-0 px-3 py-2 rounded-lg bg-surface-container border text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none font-mono ${
                      !m.name.trim() || duplicate ? 'border-red-500/50' : 'border-outline/20 focus:border-mtn-yellow/50'
                    }`}
                  />
                  <span className="shrink-0 px-2 py-1 rounded-full border border-outline/20 font-mono text-[9px] uppercase tracking-widest text-on-surface-variant">
                    {roleOf(i)}
                  </span>
                  {val !== undefined && (
                    <span className="shrink-0 font-mono text-[11px] text-green-400">= {val.toFixed(2)}</span>
                  )}
                  <button
                    onClick={() => onDelete(i)}
                    className="p-1.5 rounded-lg text-on-surface-variant/40 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {!m.name.trim() && <FieldError message="Metric name required." />}
                {duplicate && <FieldError message="Another metric in this table already has this name." />}

                <FormulaBuilder
                  value={m.formula}
                  onChange={next => onUpdate(i, { formula: next })}
                  availableVars={tokens}
                  testValues={testValues}
                  varLabels={labels}
                  explainCtx={explainCtx}
                />
              </div>
            );
          })}

          <button
            type="button"
            onClick={onAdd}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-outline/20 text-on-surface-variant hover:text-mtn-yellow hover:border-mtn-yellow/30 transition-colors font-mono text-[10px] uppercase tracking-widest w-full justify-center"
          >
            <Plus className="w-3.5 h-3.5" /> Add Metric
          </button>
        </div>
      )}
    </div>
  );
}

/** Stage 8: a finished section table (metric / value). */
function SectionTable({ meta, rows, unit }: {
  meta: typeof SECTION_META[number];
  rows: { name: string; value: number | undefined }[];
  unit: string;
}) {
  return (
    <div className="rounded-xl border border-outline/20 bg-[#1A1A1A] overflow-hidden">
      <div className="p-4 border-b border-outline/10">
        <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant">{meta.table}</p>
        <p className={`font-sans text-sm font-bold mt-1 ${meta.text}`}>
          {meta.title} <span className="text-on-surface-variant font-normal">({unit})</span>
        </p>
      </div>
      <table className="w-full text-left text-[11px] font-mono">
        <thead>
          <tr className="border-b border-outline/10">
            <th className="p-3 text-on-surface-variant">Metric</th>
            <th className="p-3 text-right text-on-surface-variant">Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={2} className="p-4 text-center text-on-surface-variant/50 italic">No metrics defined</td></tr>
          )}
          {rows.map((r, i) => (
            <tr key={i} className={`border-b border-outline/5 ${i % 2 === 0 ? 'bg-surface-container-low/30' : ''}`}>
              <td className="p-3 text-on-surface font-sans text-xs">{r.name || '—'}</td>
              <td className="p-3 text-right text-green-400 font-semibold">
                {r.value === undefined ? '—' : r.value.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Editor ───────────────────────────────────────────────────────────

const DEFAULT_WEIGHTS = { stress: 0.7, shock: 0.3, opportunity: 1.0 };

type SavePayload = Parameters<typeof updateConfig>[1];

export function ScenarioBuilderEditor({ configId, onBack }: { configId: number; onBack: () => void }) {
  const [config, setConfig] = useState<FullConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [computing, setComputing] = useState(false);
  const [autoStatus, setAutoStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>(1);
  const [results, setResults] = useState<ComputedResults | null>(null);
  const [showResults, setShowResults] = useState(false);

  // ── Local editable state ──
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [currencyLabel, setCurrencyLabel] = useState('GHS M');
  const [globalVars, setGlobalVars] = useState<VariableItem[]>([]);
  const [derivedMetrics, setDerivedMetrics] = useState<DerivedItem[]>([]);
  const [scenarios, setScenarios] = useState<ScenarioItem[]>([]);
  const [tableConfig, setTableConfig] = useState<TableConfig>({
    display_metrics: [],
    waterfall_metrics: [],
    weights: DEFAULT_WEIGHTS,
    weighted_metrics: [],
    section_tables: {},
  });
  const [variablesSource, setVariablesSource] = useState<VariablesSource | null>(null);

  // Load config
  useEffect(() => {
    (async () => {
      try {
        const c = await getConfig(configId);
        setConfig(c);
        setName(c.name);
        setDescription(c.description || '');
        setYear(c.year);
        setCurrencyLabel(c.currency_label);
        setGlobalVars(c.global_variables || []);
        setDerivedMetrics(c.derived_metrics || []);
        setScenarios(c.scenarios || []);
        const tc = c.table_config;
        setTableConfig({
          display_metrics: tc?.display_metrics ?? [],
          waterfall_metrics: tc?.waterfall_metrics ?? [],
          weights: tc?.weights ?? DEFAULT_WEIGHTS,
          weighted_metrics: tc?.weighted_metrics ?? [],
          section_tables: tc?.section_tables ?? {},
        });
        setVariablesSource(tc?.variables_source ?? null);
        // Results saved by the older flow have a different shape; ignore them.
        if (c.computed_results && c.computed_results.sectionTables) {
          setResults(c.computed_results);
        }
        setLoaded(true);   // auto-save only switches on after a successful load
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, [configId]);

  // ── Stage 1–3 derived data ──

  // Names of base variables only (scenario overrides can only target these).
  // Badly-formatted names are kept out of every dropdown so they can't break formulas.
  const globalVarNames = useMemo(
    () => globalVars.map(v => v.name).filter(isUsableName),
    [globalVars]
  );

  // Names of derived metrics (usable ones only)
  const derivedNames = useMemo(
    () => derivedMetrics.map(d => d.name).filter(isUsableName),
    [derivedMetrics]
  );

  // Name issues per row
  const globalNameIssues = useMemo(
    () => globalVars.map((v, i) =>
      nameIssue(v.name, globalVars.filter((_, j) => j !== i).map(x => x.name))
    ),
    [globalVars]
  );

  const derivedNameIssues = useMemo(
    () => derivedMetrics.map((d, i) =>
      nameIssue(d.name, [
        ...globalVars.map(x => x.name),
        ...derivedMetrics.filter((_, j) => j !== i).map(x => x.name),
      ])
    ),
    [globalVars, derivedMetrics]
  );

  // Real base-case variable values (for live formula preview)
  const baseVarValues = useMemo(() => {
    const map: Record<string, number> = {};
    globalVars.forEach(v => {
      if (v.name.trim()) map[normalizeName(v.name)] = v.value;
    });
    return map;
  }, [globalVars]);

  // Live base case preview (cascaded, top to bottom — a metric only sees metrics above it)
  const baseCasePreview = useMemo(() => {
    const varMap: Record<string, number> = { ...baseVarValues };

    const derivedResults: Record<string, { value: number | null; error: string | null }> = {};
    derivedMetrics.forEach(dm => {
      if (!dm.name.trim() || !dm.formula.trim()) return;
      const result = evaluateFormula(dm.formula, varMap);
      derivedResults[dm.name] = result;
      if (result.value !== null) {
        varMap[normalizeName(dm.name)] = result.value;
      }
    });

    return { variables: varMap, derived: derivedResults };
  }, [baseVarValues, derivedMetrics]);

  // Live per-scenario cascade:
  // base variables → this scenario's overrides → this scenario's own variables → metric formulas
  const scenarioPreviews = useMemo(() => {
    const out: Record<string, Record<string, number>> = {};
    scenarios.forEach(sc => {
      const varMap: Record<string, number> = { ...baseVarValues };
      sc.overrides.forEach(ov => {
        if (ov.name.trim()) varMap[normalizeName(ov.name)] = ov.value;
      });
      (sc.variables ?? []).forEach(sv => {
        if (sv.name.trim()) varMap[normalizeName(sv.name)] = sv.value;
      });
      derivedMetrics.forEach(dm => {
        if (!dm.name.trim()) return;
        const f = dm.scenario_formulas?.[sc.id] || dm.formula;
        if (!f?.trim()) return;
        const r = evaluateFormula(f, varMap);
        if (r.value !== null) varMap[normalizeName(dm.name)] = r.value;
      });
      out[sc.id] = varMap;
    });
    return out;
  }, [scenarios, derivedMetrics, baseVarValues]);

  // Stage 3 formula problems, cell by cell (Base Case + every scenario)
  const derivedIssues: CellIssues[] = useMemo(
    () => derivedMetrics.map((dm, i) => {
      const above = derivedMetrics.slice(0, i).map(d => d.name).filter(isUsableName);
      const below = derivedMetrics.slice(i + 1).map(d => d.name).filter(isUsableName);
      const ctx: ExplainCtx = { self: dm.name, later: below };
      const base = diagnose(dm.formula, [...globalVarNames, ...above], baseCasePreview.variables, ctx);
      const scn: Record<string, string | null> = {};
      scenarios.forEach(sc => {
        const scVars = (sc.variables ?? []).map(v => v.name).filter(isUsableName);
        scn[sc.id] = diagnose(
          dm.scenario_formulas?.[sc.id],
          uniqueNames([...globalVarNames, ...scVars, ...above]),
          scenarioPreviews[sc.id],
          ctx,
        );
      });
      return { base, scn };
    }),
    [derivedMetrics, scenarios, globalVarNames, baseCasePreview, scenarioPreviews]
  );
  const s3Issues = derivedIssues.reduce((n, i) => n + countIssues(i), 0);

  // Scenarios in display order: all stress, then shocks, then opportunities
  const orderedScenarios = useMemo(
    () => scenarios
      .map((s, i) => ({ s, i }))
      .sort((a, b) => (TYPE_ORDER[a.s.type] ?? 9) - (TYPE_ORDER[b.s.type] ?? 9) || a.i - b.i)
      .map(x => x.s),
    [scenarios]
  );

  // ── Stage 4: Table 1 (the live matrix) and the variables it creates ──

  const namedDerived = useMemo(() => derivedMetrics.filter(d => d.name.trim()), [derivedMetrics]);

  const stage3Value = useCallback((dm: DerivedItem, col: string): number | undefined => {
    const key = normalizeName(dm.name);
    if (col === 'base') {
      return dm.formula.trim() ? baseCasePreview.variables[key] : undefined;
    }
    return (dm.scenario_formulas?.[col] ?? '').trim() ? scenarioPreviews[col]?.[key] : undefined;
  }, [baseCasePreview, scenarioPreviews]);

  const table1Rows: MatrixRow[] = useMemo(
    () => namedDerived.map(dm => ({
      key: normalizeName(dm.name),
      label: dm.name,
      base: stage3Value(dm, 'base'),
      values: Object.fromEntries(scenarios.map(sc => [sc.id, stage3Value(dm, sc.id)])),
    })),
    [namedDerived, scenarios, stage3Value]
  );

  const stage3Vars = useMemo(
    () => buildStageVars(
      namedDerived.map(d => d.name.trim()),
      scenarios,
      (mi, col) => {
        const dm = namedDerived[mi];
        return dm ? stage3Value(dm, col) : undefined;
      }
    ),
    [namedDerived, scenarios, stage3Value]
  );

  const stage3Tokens = useMemo(() => stage3Vars.map(v => v.token), [stage3Vars]);
  const stage3Labels = useMemo(
    () => Object.fromEntries(stage3Vars.map(v => [v.token, v.label])) as Record<string, string>,
    [stage3Vars]
  );
  const stage3Map = useMemo(() => {
    const m: Record<string, number> = {};
    stage3Vars.forEach(v => { if (v.value !== undefined) m[v.token] = v.value; });
    return m;
  }, [stage3Vars]);

  // ── Stage 5: weighted metrics (one per derived metric, name locked) ──

  const weightedList: WeightedMetric[] = useMemo(
    () => namedDerived.map(d => {
      const src = d.name.trim();
      const found = (tableConfig.weighted_metrics ?? []).find(
        w => normalizeName(w.source) === normalizeName(src)
      );
      return {
        source: src,
        name: `${src} wghtd`,
        formula: found?.formula ?? '',
        scenario_formulas: found?.scenario_formulas ?? {},
      };
    }),
    [namedDerived, tableConfig.weighted_metrics]
  );

  const updateWeighted = (
    source: string,
    patch: { formula?: string; scenarioId?: string; scenarioFormula?: string }
  ) => {
    setTableConfig(tc => {
      const list = [...(tc.weighted_metrics ?? [])];
      const idx = list.findIndex(w => normalizeName(w.source) === normalizeName(source));
      const current: WeightedMetric = idx >= 0
        ? list[idx]!
        : { source, name: `${source} wghtd`, formula: '', scenario_formulas: {} };
      const next: WeightedMetric = {
        ...current,
        source,
        name: `${source} wghtd`,
        formula: patch.formula !== undefined ? patch.formula : current.formula,
        scenario_formulas: patch.scenarioId !== undefined
          ? { ...(current.scenario_formulas ?? {}), [patch.scenarioId]: patch.scenarioFormula ?? '' }
          : (current.scenario_formulas ?? {}),
      };
      if (idx >= 0) list[idx] = next; else list.push(next);
      return { ...tc, weighted_metrics: list };
    });
  };

  // Table 2 live values
  const weightedPreview = useMemo(
    () => weightedList.map(w => ({
      base: evalCell(w.formula, stage3Map),
      scn: Object.fromEntries(
        scenarios.map(sc => [sc.id, evalCell(w.scenario_formulas?.[sc.id], stage3Map)])
      ) as Record<string, number | undefined>,
    })),
    [weightedList, scenarios, stage3Map]
  );

  // Stage 5 formula problems
  const explainCtx5: ExplainCtx = useMemo(() => ({
    unknownHint: "isn't a Table 1 variable (its metric or scenario was probably renamed or deleted). Remove it and pick it again from the dropdown.",
  }), []);

  const weightedIssues: CellIssues[] = useMemo(
    () => weightedList.map(w => {
      const base = diagnose(w.formula, stage3Tokens, stage3Map, explainCtx5);
      const scn: Record<string, string | null> = {};
      scenarios.forEach(sc => {
        scn[sc.id] = diagnose(w.scenario_formulas?.[sc.id], stage3Tokens, stage3Map, explainCtx5);
      });
      return { base, scn };
    }),
    [weightedList, scenarios, stage3Tokens, stage3Map, explainCtx5]
  );
  const s5Issues = weightedIssues.reduce((n, i) => n + countIssues(i), 0);

  const table2Rows: MatrixRow[] = useMemo(
    () => weightedList.map((w, i) => ({
      key: normalizeName(w.name),
      label: w.name,
      base: weightedPreview[i]?.base,
      values: weightedPreview[i]?.scn ?? {},
    })),
    [weightedList, weightedPreview]
  );

  const stage5Vars = useMemo(
    () => buildStageVars(
      weightedList.map(w => w.name),
      scenarios,
      (mi, col) => {
        const p = weightedPreview[mi];
        if (!p) return undefined;
        return col === 'base' ? p.base : p.scn[col];
      }
    ),
    [weightedList, scenarios, weightedPreview]
  );

  const stage5Tokens = useMemo(() => stage5Vars.map(v => v.token), [stage5Vars]);
  const stage5Labels = useMemo(
    () => Object.fromEntries(stage5Vars.map(v => [v.token, v.label])) as Record<string, string>,
    [stage5Vars]
  );
  const stage5Map = useMemo(() => {
    const m: Record<string, number> = {};
    stage5Vars.forEach(v => { if (v.value !== undefined) m[v.token] = v.value; });
    return m;
  }, [stage5Vars]);

  // ── Stage 7: section tables ──

  const sectionMetrics = (key: SectionKey): SectionMetric[] => tableConfig.section_tables?.[key] ?? [];

  const setSectionMetrics = (key: SectionKey, list: SectionMetric[]) => {
    setTableConfig(tc => ({ ...tc, section_tables: { ...(tc.section_tables ?? {}), [key]: list } }));
  };

  const addSectionMetric = (key: SectionKey) =>
    setSectionMetrics(key, [...sectionMetrics(key), { name: '', formula: '' }]);

  const updateSectionMetric = (key: SectionKey, idx: number, patch: Partial<SectionMetric>) =>
    setSectionMetrics(key, sectionMetrics(key).map((m, i) => (i === idx ? { ...m, ...patch } : m)));

  const deleteSectionMetric = (key: SectionKey, idx: number) =>
    setSectionMetrics(key, sectionMetrics(key).filter((_, i) => i !== idx));

  // Live values for Tables 3–6
  const sectionPreview = useMemo(() => {
    const out = {} as Record<SectionKey, { name: string; value: number | undefined }[]>;
    SECTION_META.forEach(s => {
      out[s.key] = (tableConfig.section_tables?.[s.key] ?? []).map(m => ({
        name: m.name,
        value: evalCell(m.formula, stage5Map),
      }));
    });
    return out;
  }, [tableConfig.section_tables, stage5Map]);

  // Stage 7 formula problems
  const explainCtx7: ExplainCtx = useMemo(() => ({
    unknownHint: "isn't a Table 2 variable (its weighted metric or scenario was probably renamed or deleted). Remove it and pick it again from the dropdown.",
  }), []);

  const sectionIssues = useMemo(() => {
    const out = {} as Record<SectionKey, (string | null)[]>;
    SECTION_META.forEach(s => {
      out[s.key] = (tableConfig.section_tables?.[s.key] ?? []).map(m =>
        diagnose(m.formula, stage5Tokens, stage5Map, explainCtx7)
      );
    });
    return out;
  }, [tableConfig.section_tables, stage5Tokens, stage5Map, explainCtx7]);
  const s7Issues = SECTION_META.reduce((n, s) => n + (sectionIssues[s.key] ?? []).filter(Boolean).length, 0);

  // What gets saved: stages 4 / 6 / 8 are display-only, so only the editable parts are stored.
  const payloadTableConfig: TableConfig = useMemo(() => ({
    display_metrics: namedDerived.map(d => d.name.trim()),
    waterfall_metrics: [],
    weights: tableConfig.weights ?? DEFAULT_WEIGHTS,
    weighted_metrics: weightedList,
    section_tables: {
      stress: tableConfig.section_tables?.stress ?? [],
      shock: tableConfig.section_tables?.shock ?? [],
      opportunity: tableConfig.section_tables?.opportunity ?? [],
      combined: tableConfig.section_tables?.combined ?? [],
    },
    variables_source: variablesSource,
  }), [namedDerived, tableConfig.weights, tableConfig.section_tables, weightedList, variablesSource]);

  // ── Auto-save (every second, only when something changed) ──

  const savePayload: SavePayload = useMemo(() => ({
    name,
    year,
    description,
    currency_label: currencyLabel,
    global_variables: globalVars,
    derived_metrics: derivedMetrics,
    scenarios,
    table_config: payloadTableConfig,
  }), [name, year, description, currencyLabel, globalVars, derivedMetrics, scenarios, payloadTableConfig]);

  const savePayloadJson = useMemo(() => JSON.stringify(savePayload), [savePayload]);

  const latestRef = useRef<{ json: string; payload: SavePayload } | null>(null);
  latestRef.current = { json: savePayloadJson, payload: savePayload };

  const lastSavedRef = useRef<string | null>(null);
  const savingRef = useRef(false);
  const computingRef = useRef(false);

  // Remember what was loaded so opening a config doesn't trigger a save
  useEffect(() => {
    if (loaded && lastSavedRef.current === null) {
      lastSavedRef.current = savePayloadJson;
    }
  }, [loaded, savePayloadJson]);

  const flushSave = useCallback(async (): Promise<boolean> => {
    const latest = latestRef.current;
    if (!latest || lastSavedRef.current === null) return true;
    if (latest.json === lastSavedRef.current) return true;
    if (savingRef.current) return false;
    savingRef.current = true;
    setAutoStatus('saving');
    try {
      await updateConfig(configId, latest.payload);
      lastSavedRef.current = latest.json;
      setAutoStatus('saved');
      return true;
    } catch {
      setAutoStatus('error');
      return false;
    } finally {
      savingRef.current = false;
    }
  }, [configId]);

  useEffect(() => {
    if (!loaded) return;
    const id = setInterval(() => {
      if (!computingRef.current) void flushSave();
    }, 1000);
    return () => clearInterval(id);
  }, [loaded, flushSave]);

  // Save pending edits before leaving the editor
  const handleBack = useCallback(async () => {
    for (let i = 0; i < 6; i++) {
      if (!savingRef.current) {
        await flushSave();
        break;
      }
      await new Promise(r => setTimeout(r, 200));
    }
    onBack();
  }, [flushSave, onBack]);

  // Compute
  const handleCompute = useCallback(async () => {
    setComputing(true);
    computingRef.current = true;
    setError(null);
    try {
      // wait for any auto-save already in flight, then save the very latest state
      for (let i = 0; i < 10 && savingRef.current; i++) {
        await new Promise(r => setTimeout(r, 150));
      }
      const latest = latestRef.current;
      if (latest) {
        await updateConfig(configId, latest.payload);
        lastSavedRef.current = latest.json;
        setAutoStatus('saved');
      }

      const res = await computeConfig(configId, `Computed from UI on ${new Date().toLocaleString()}`);
      setResults(res.results);
      setShowResults(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Computation failed');
    } finally {
      computingRef.current = false;
      setComputing(false);
    }
  }, [configId]);

  // Variable operations
  // Any manual change after an Excel upload is flagged so the basis stays honest.
  const markEditedAfterUpload = () =>
    setVariablesSource(src => (src && !src.edited_after_upload ? { ...src, edited_after_upload: true } : src));
  const addGlobalVar = () => {
    setGlobalVars(v => [...v, { name: '', value: 0, description: '' }]);
    markEditedAfterUpload();
  };
  const updateGlobalVar = (idx: number, field: keyof VariableItem, value: string | number) => {
    setGlobalVars(v => v.map((item, i) => i === idx ? { ...item, [field]: value } : item));
    markEditedAfterUpload();
  };
  const deleteGlobalVar = (idx: number) => {
    setGlobalVars(v => v.filter((_, i) => i !== idx));
    markEditedAfterUpload();
  };

  const importExcelVars = (parsed: ParsedVariablesExcel, mode: 'replace' | 'merge') => {
    if (mode === 'replace') {
      setGlobalVars(parsed.variables);
    } else {
      setGlobalVars(current => {
        const out = current.filter(v => v.name.trim() !== '');
        for (const nv of parsed.variables) {
          const idx = out.findIndex(v => v.name.trim().toLowerCase() === nv.name.trim().toLowerCase());
          const match = idx >= 0 ? out[idx] : undefined;
          if (match) out[idx] = { ...match, value: nv.value, description: nv.description || match.description };
          else out.push(nv);
        }
        return out;
      });
    }
    setVariablesSource({
      type: 'excel',
      filename: parsed.filename,
      uploaded_at: parsed.uploaded_at,
      row_count: parsed.row_count,
      mode,
      edited_after_upload: false,
    });
  };
  const filledVarCount = globalVars.filter(v => v.name.trim() !== '').length;

  // Derived operations
  const addDerived = () => setDerivedMetrics(d => [...d, { name: '', formula: '', description: '', scenario_formulas: {} }]);
  const updateDerived = (idx: number, field: keyof DerivedItem, value: string) => {
    setDerivedMetrics(d => d.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };
  const updateScenarioFormula = (idx: number, scId: string, formula: string) => {
    setDerivedMetrics(d => d.map((item, i) =>
      i === idx ? { ...item, scenario_formulas: { ...(item.scenario_formulas ?? {}), [scId]: formula } } : item
    ));
  };
  const deleteDerived = (idx: number) => setDerivedMetrics(d => d.filter((_, i) => i !== idx));

  // Scenario operations
  // auto-generate name so step completion check never falsely fails
  const addScenario = useCallback((type: ScenarioItem['type']) => {
    const label = SCENARIO_TYPE_META[type]?.label ?? type;
    setScenarios(s => {
      const count = s.filter(sc => sc.type === type).length + 1;
      return [...s, {
        id: genId(),
        name: `${label} Scenario ${count}`,
        type,
        overrides: [],
        variables: [],
        derived: [],
      }];
    });
  }, []);

  // wrapped in useCallback to prevent stale-closure overwrites
  const updateScenario = useCallback((id: string, updated: ScenarioItem) => {
    setScenarios(s => s.map(sc => sc.id === id ? updated : sc));
  }, []);

  const deleteScenario = useCallback((id: string) => {
    setScenarios(s => s.filter(sc => sc.id !== id));
  }, []);

  // ── Step completion checks ──
  // 1 Variables → 2 Scenarios → 3 Derived Metrics → 4 Table 1 → 5 Weighted → 6 Table 2
  // → 7 Section tables → 8 Tables 3–6 → 9 Calculate
  const step1Complete =
    globalVars.length > 0 &&
    globalVars.every((v, i) => v.name.trim() && !globalNameIssues[i]);
  const step2Complete =
    scenarios.length > 0 &&
    scenarios.every(s => {
      const issues = scenarioVarIssues(s, globalVarNames, derivedNames);
      return s.name.trim() && (s.variables ?? []).every((v, i) => v.name.trim() && !issues[i]);
    });
  const step3Filled =
    derivedMetrics.length > 0 &&
    derivedMetrics.every((d, i) =>
      d.name.trim() && !derivedNameIssues[i] && d.formula.trim() &&
      scenarios.every(sc => (d.scenario_formulas?.[sc.id] ?? '').trim())
    );
  const step3Complete = step3Filled && s3Issues === 0;
  const step5Filled =
    weightedList.length > 0 &&
    weightedList.every(w =>
      w.formula.trim() && scenarios.every(sc => (w.scenario_formulas?.[sc.id] ?? '').trim())
    );
  const step5Complete = step5Filled && s5Issues === 0;
  const step7Filled =
    SECTION_META.some(s => sectionMetrics(s.key).length > 0) &&
    SECTION_META.every(s => {
      const list = sectionMetrics(s.key);
      const names = list.map(m => normalizeName(m.name));
      return list.every((m, i) =>
        m.name.trim() && m.formula.trim() && names.indexOf(normalizeName(m.name)) === i
      );
    });
  const step7Complete = step7Filled && s7Issues === 0;
  const totalSectionMetrics = SECTION_META.reduce((n, s) => n + sectionMetrics(s.key).length, 0);
  const canCalculate = step1Complete && step2Complete && step3Complete && step5Complete && step7Complete;
  const unit = currencyLabel.trim() || 'units';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-mtn-yellow/30 border-t-mtn-yellow rounded-full animate-spin" />
      </div>
    );
  }

  // ── Results View ──
  if (showResults && results) {
    return (
      <div className="space-y-6 pb-12 animate-in fade-in duration-500">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowResults(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-outline/20 text-on-surface-variant hover:text-on-surface transition-colors font-mono text-[10px] uppercase tracking-widest"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Editor
          </button>
          <h2 className="font-sans text-lg font-bold text-on-surface">{name} — Results</h2>
        </div>
        <SBResultsView
          results={results}
          scenarios={scenarios}
          currencyLabel={currencyLabel}
        />
      </div>
    );
  }

  const backBtn = (to: Step, label: string) => (
    <button
      onClick={() => setStep(to)}
      className="px-4 py-2 rounded-lg border border-outline/20 text-on-surface-variant font-mono text-[10px] uppercase tracking-widest hover:text-on-surface hover:border-outline/40 transition-colors"
    >
      ← {label}
    </button>
  );
  const nextBtn = (to: Step, label: string) => (
    <button
      onClick={() => setStep(to)}
      className="px-4 py-2 rounded-lg bg-mtn-yellow text-black font-mono text-[10px] uppercase tracking-widest font-bold hover:bg-mtn-yellow/90 transition-colors"
    >
      Next: {label} →
    </button>
  );

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      {/* Top Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handleBack}
          title="Back to all configurations"
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-outline/20 text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {/* Configuration name — click to rename anytime */}
        <label
          title="Rename this configuration"
          className="flex-1 min-w-[220px] flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container border border-outline/20 hover:border-outline/40 focus-within:border-mtn-yellow/50 transition-colors cursor-text"
        >
          <Pencil className="w-3.5 h-3.5 text-on-surface-variant/60 shrink-0" />
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={() => {
              if (!name.trim()) setName(config?.name?.trim() || `FY${year} Scenario Analysis`);
            }}
            className="flex-1 min-w-0 bg-transparent font-sans text-lg font-bold text-on-surface focus:outline-none placeholder:text-on-surface-variant/40"
            placeholder="Name this configuration…"
          />
        </label>

        <div className="flex items-center gap-2">
          <input
            type="number"
            value={year}
            onChange={e => setYear(parseInt(e.target.value) || new Date().getFullYear())}
            title="Financial year"
            className="w-20 px-2 py-1.5 rounded-lg bg-surface-container border border-outline/20 text-xs text-on-surface font-mono text-center focus:outline-none"
          />
          <input
            type="text"
            value={currencyLabel}
            onChange={e => setCurrencyLabel(e.target.value)}
            placeholder="Unit"
            title="Unit shown on every table and chart"
            className="w-20 px-2 py-1.5 rounded-lg bg-surface-container border border-outline/20 text-xs text-on-surface font-mono text-center focus:outline-none"
          />

          {/* Auto-save status */}
          <span
            className={`flex items-center gap-1 font-mono text-[10px] ${
              autoStatus === 'error' ? 'text-red-400' : autoStatus === 'saving' ? 'text-on-surface-variant' : 'text-green-400'
            }`}
          >
            {autoStatus === 'saving' && (
              <><div className="w-3 h-3 border-2 border-on-surface-variant/30 border-t-on-surface-variant rounded-full animate-spin" /> Saving…</>
            )}
            {autoStatus === 'saved' && (<><CheckCircle className="w-3 h-3" /> All changes saved</>)}
            {autoStatus === 'idle' && (<><CheckCircle className="w-3 h-3" /> Auto-save on</>)}
            {autoStatus === 'error' && (<><AlertTriangle className="w-3 h-3" /> Couldn&apos;t save — retrying</>)}
          </span>

          <button
            onClick={() => void flushSave()}
            title="Auto-save runs every second; this saves immediately"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline/20 text-on-surface-variant hover:text-on-surface hover:border-outline/40 transition-colors font-mono text-[10px] uppercase tracking-widest"
          >
            <Save className="w-3.5 h-3.5" />
            Save Now
          </button>

          {results && (
            <button
              onClick={() => setShowResults(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-colors font-mono text-[10px] uppercase tracking-widest"
            >
              <Eye className="w-3.5 h-3.5" /> View Results
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-error/10 border border-error/30 p-3 flex gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-error shrink-0 mt-0.5" />
          <p className="font-sans text-xs text-error">{error}</p>
        </div>
      )}

      {/* Step Navigation */}
      <div className="flex flex-wrap gap-2">
        <StepBadge step={1} label="Variables" active={step === 1} completed={step1Complete} onClick={() => setStep(1)} />
        <StepBadge step={2} label="Scenarios" active={step === 2} completed={step2Complete} onClick={() => setStep(2)} />
        <StepBadge step={3} label="Derived Metrics" active={step === 3} completed={step3Complete} issues={s3Issues} onClick={() => setStep(3)} />
        <StepBadge step={4} label="Table 1" active={step === 4} completed={step3Complete} onClick={() => setStep(4)} />
        <StepBadge step={5} label="Weighted Table" active={step === 5} completed={step5Complete} issues={s5Issues} onClick={() => setStep(5)} />
        <StepBadge step={6} label="Table 2" active={step === 6} completed={step5Complete} onClick={() => setStep(6)} />
        <StepBadge step={7} label="Section Tables" active={step === 7} completed={step7Complete} issues={s7Issues} onClick={() => setStep(7)} />
        <StepBadge step={8} label="Tables 3–6" active={step === 8} completed={step7Complete} onClick={() => setStep(8)} />
        <StepBadge step={9} label="Calculate" active={step === 9} completed={!!results} onClick={() => setStep(9)} />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Step 1: Global Variables */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="rounded-xl border border-outline/20 bg-surface-container-low p-5">
            <div className="flex items-start gap-3 mb-4">
              <Variable className="w-5 h-5 text-mtn-yellow shrink-0 mt-0.5" />
              <div>
                <p className="font-sans text-sm font-semibold text-on-surface">Global & Base Case Variables</p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Define all input variables and their base case values. These are the raw inputs that
                  your derived formulas will reference. Variable names become formula identifiers
                  (spaces become underscores, case-insensitive).
                </p>
              </div>
            </div>

            <ExcelImportPanel
              source={variablesSource}
              existingCount={filledVarCount}
              onImport={importExcelVars}
            />

            <NameTip className="mb-4" />

            <div className="space-y-2">
              {globalVars.map((v, i) => (
                <VariableRow
                  key={i}
                  item={v}
                  index={i}
                  nameError={globalNameIssues[i]}
                  onChange={updateGlobalVar}
                  onDelete={deleteGlobalVar}
                />
              ))}
            </div>

            <button
              onClick={addGlobalVar}
              className="mt-3 flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-outline/20 text-on-surface-variant hover:text-mtn-yellow hover:border-mtn-yellow/30 transition-colors font-mono text-[10px] uppercase tracking-widest w-full justify-center"
            >
              <Plus className="w-3.5 h-3.5" /> Add Variable
            </button>
          </div>

          {/* Live preview of variable names */}
          {globalVars.length > 0 && (
            <div className="rounded-lg border border-outline/10 bg-surface-container-low/50 p-3">
              <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant mb-2">
                Available in formulas:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {globalVars.filter(v => isUsableName(v.name)).map((v, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-surface-container border border-outline/20 font-mono text-[10px] text-on-surface">
                    {normalizeName(v.name)} <span className="text-on-surface-variant">= {v.value}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end">{nextBtn(2, 'Scenarios')}</div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Step 2: Scenarios (overrides + scenario-only variables) */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="rounded-xl border border-outline/20 bg-surface-container-low p-5">
            <div className="flex items-start gap-3 mb-4">
              <FlaskConical className="w-5 h-5 text-mtn-yellow shrink-0 mt-0.5" />
              <div>
                <p className="font-sans text-sm font-semibold text-on-surface">Define Scenarios</p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Create stress, shock, and opportunity scenarios. Each scenario can overwrite base case
                  variables and/or define its own new variables. Both apply only to that scenario.
                  You will define each metric&apos;s calculation for every scenario in the next step.
                </p>
              </div>
            </div>

            <NameTip className="mb-4" />

            {/* Add scenario buttons */}
            <div className="flex gap-2 mb-4 flex-wrap">
              <button
                onClick={() => addScenario('stress')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-mtn-yellow/30 bg-mtn-yellow/5 text-mtn-yellow font-mono text-[10px] uppercase tracking-widest hover:bg-mtn-yellow/10 transition-colors"
              >
                <ShieldAlert className="w-3 h-3" /> + Stress Scenario
              </button>
              <button
                onClick={() => addScenario('shock')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/5 text-red-400 font-mono text-[10px] uppercase tracking-widest hover:bg-red-500/10 transition-colors"
              >
                <Zap className="w-3 h-3" /> + Shock Scenario
              </button>
              <button
                onClick={() => addScenario('opportunity')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-green-500/30 bg-green-500/5 text-green-400 font-mono text-[10px] uppercase tracking-widest hover:bg-green-500/10 transition-colors"
              >
                <TrendingUp className="w-3 h-3" /> + Opportunity Scenario
              </button>
            </div>

            {/* Scenario list */}
            <div className="space-y-3">
              {scenarios.length === 0 && (
                <div className="text-center py-8 rounded-lg border border-dashed border-outline/15">
                  <p className="text-xs text-on-surface-variant/50">No scenarios defined yet</p>
                </div>
              )}
              {(['stress', 'shock', 'opportunity'] as const).map(type => {
                const typeScenarios = scenarios.filter(s => s.type === type);
                if (typeScenarios.length === 0) return null;
                const meta = SCENARIO_TYPE_META[type];
                return (
                  <div key={type} className="space-y-2">
                    <p className={`font-mono text-[9px] uppercase tracking-widest ${typeTextClass(type)}`}>
                      {meta.label} Scenarios ({typeScenarios.length})
                    </p>
                    {typeScenarios.map(sc => (
                      <ScenarioCard
                        key={sc.id}
                        scenario={sc}
                        allVariableNames={globalVarNames}
                        derivedNames={derivedNames}
                        onUpdate={updated => updateScenario(sc.id, updated)}
                        onDelete={() => deleteScenario(sc.id)}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-between">
            {backBtn(1, 'Variables')}
            {nextBtn(3, 'Derived Metrics')}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Step 3: Derived Metrics (collapsible; Base Case + every scenario) */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="rounded-xl border border-outline/20 bg-surface-container-low p-5">
            <div className="flex items-start gap-3 mb-4">
              <FunctionSquare className="w-5 h-5 text-mtn-yellow shrink-0 mt-0.5" />
              <div>
                <p className="font-sans text-sm font-semibold text-on-surface">Derived Metrics & Calculation Map</p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  These metrics fill the output tables. Click the arrow on a metric to expand it and
                  define the Base Case calculation and its calculation under every scenario. A
                  scenario&apos;s formula can use the base variables (with that scenario&apos;s overrides
                  applied), that scenario&apos;s own variables, and <strong>only the metrics listed above
                  it</strong>. Every metric must be filled for the Base Case and all {scenarios.length} scenario(s).
                </p>
              </div>
            </div>

            <NameTip className="mb-4" />

            {scenarios.length === 0 && (
              <div className="rounded-lg bg-mtn-yellow/5 border border-mtn-yellow/20 p-3 mb-3 flex gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-mtn-yellow shrink-0 mt-0.5" />
                <p className="text-xs text-mtn-yellow">Define scenarios in Step 2 first so each metric can have a value per scenario.</p>
              </div>
            )}

            <IssueBanner count={s3Issues} />

            <div className="space-y-3 mt-3">
              {derivedMetrics.map((d, i) => (
                <DerivedRow
                  key={i}
                  item={d}
                  index={i}
                  scenarios={scenarios}
                  globalVarNames={globalVarNames}
                  derivedAbove={derivedMetrics.slice(0, i).map(x => x.name).filter(isUsableName)}
                  derivedBelow={derivedMetrics.slice(i + 1).map(x => x.name).filter(isUsableName)}
                  baseVarValues={baseVarValues}
                  baseTestValues={baseCasePreview.variables}
                  scenarioTestValues={scenarioPreviews}
                  nameError={derivedNameIssues[i]}
                  issues={derivedIssues[i] ?? { base: null, scn: {} }}
                  onChange={updateDerived}
                  onChangeScenarioFormula={updateScenarioFormula}
                  onDelete={deleteDerived}
                />
              ))}
            </div>

            <button
              onClick={addDerived}
              className="mt-3 flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-outline/20 text-on-surface-variant hover:text-mtn-yellow hover:border-mtn-yellow/30 transition-colors font-mono text-[10px] uppercase tracking-widest w-full justify-center"
            >
              <Plus className="w-3.5 h-3.5" /> Add Derived Metric
            </button>
          </div>

          {/* Live matrix preview: metrics × (Base Case + scenarios) */}
          {derivedMetrics.some(d => d.name.trim()) && (
            <div className="rounded-xl border border-outline/20 bg-surface-container-low p-4 overflow-x-auto">
              <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant mb-3">
                Live Matrix Preview
              </p>
              <table className="w-full text-left text-[11px] font-mono">
                <thead>
                  <tr className="border-b border-outline/10">
                    <th className="p-2 text-on-surface-variant">Metric</th>
                    <th className="p-2 text-blue-400">Base Case</th>
                    {scenarios.map(sc => (
                      <th key={sc.id} className="p-2 text-on-surface-variant">{sc.name || sc.id}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {derivedMetrics.filter(d => d.name.trim()).map(d => {
                    const key = normalizeName(d.name);
                    const fmt = (v: number | undefined) => (v === undefined ? '—' : v.toFixed(2));
                    return (
                      <tr key={key} className="border-b border-outline/5">
                        <td className="p-2 text-on-surface">{d.name}</td>
                        <td className="p-2 text-green-400">{d.formula.trim() ? fmt(baseCasePreview.variables[key]) : '—'}</td>
                        {scenarios.map(sc => (
                          <td key={sc.id} className="p-2 text-on-surface-variant">
                            {(d.scenario_formulas?.[sc.id] ?? '').trim() ? fmt(scenarioPreviews[sc.id]?.[key]) : '—'}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-between">
            {backBtn(2, 'Scenarios')}
            {nextBtn(4, 'Table 1')}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Step 4: Table 1 (the live matrix, now the reference table) */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="rounded-xl border border-outline/20 bg-surface-container-low p-5">
            <div className="flex items-start gap-3">
              <TableProperties className="w-5 h-5 text-mtn-yellow shrink-0 mt-0.5" />
              <div>
                <p className="font-sans text-sm font-semibold text-on-surface">Table 1 — Full Scenario Matrix</p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  This is your first table: every derived metric for the Base Case and each scenario
                  (stress, then shock, then opportunity). It is the reference for the next step, where
                  each cell becomes a variable you can use in the weighted table.
                </p>
              </div>
            </div>
          </div>

          {(!step3Filled || s3Issues > 0) && (
            <div className="rounded-lg bg-mtn-yellow/5 border border-mtn-yellow/20 p-3 flex gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-mtn-yellow shrink-0 mt-0.5" />
              <p className="text-xs text-mtn-yellow">
                {s3Issues > 0
                  ? `Step 3 has ${s3Issues} formula issue${s3Issues !== 1 ? 's' : ''}, so some cells below are empty. Open Step 3 and fix the red messages.`
                  : 'Some cells are still empty. Finish Step 3 so every metric has a Base Case and scenario formula.'}
              </p>
            </div>
          )}

          <MatrixTable
            tag="Table 1"
            title="Full Scenario Matrix"
            rows={table1Rows}
            columns={orderedScenarios}
            unit={unit}
          />

          <StageVarChips title="Variables this table creates for Step 5" vars={stage3Vars} />

          <div className="flex justify-between">
            {backBtn(3, 'Derived Metrics')}
            {nextBtn(5, 'Weighted Table')}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Step 5: Weighted table (formulas use ONLY Table 1 variables) */}
      {step === 5 && (
        <div className="space-y-4">
          <div className="rounded-xl border border-outline/20 bg-surface-container-low p-5">
            <div className="flex items-start gap-3 mb-4">
              <FunctionSquare className="w-5 h-5 text-mtn-yellow shrink-0 mt-0.5" />
              <div>
                <p className="font-sans text-sm font-semibold text-on-surface">Weighted Table</p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Each derived metric gets a weighted version (name ending in <code>wghtd</code>, set
                  automatically). Define its Base Case and every scenario using only the variables from
                  Table 1, named like <code>contribution margin base case</code> or{' '}
                  <code>contribution margin &lt;scenario name&gt;</code>.
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 px-3 py-2 flex gap-2 mb-4">
              <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-blue-400 leading-relaxed">
                <strong>Heads up:</strong> these variables are named after your metrics and scenarios.
                If you rename a metric or scenario later, re-pick it in any formula that used it — the
                red message on that formula will tell you.
              </p>
            </div>

            <IssueBanner count={s5Issues} />

            {scenarios.length === 0 || weightedList.length === 0 ? (
              <div className="rounded-lg bg-mtn-yellow/5 border border-mtn-yellow/20 p-3 flex gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-mtn-yellow shrink-0 mt-0.5" />
                <p className="text-xs text-mtn-yellow">Complete Steps 2 and 3 first — the weighted table is built from your derived metrics and scenarios.</p>
              </div>
            ) : (
              <div className="space-y-3 mt-3">
                {weightedList.map((w, i) => (
                  <WeightedRow
                    key={w.source}
                    entry={w}
                    scenarios={scenarios}
                    tokens={stage3Tokens}
                    labels={stage3Labels}
                    testValues={stage3Map}
                    preview={weightedPreview[i] ?? { base: undefined, scn: {} }}
                    issues={weightedIssues[i] ?? { base: null, scn: {} }}
                    explainCtx={explainCtx5}
                    onChange={updateWeighted}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between">
            {backBtn(4, 'Table 1')}
            {nextBtn(6, 'Table 2')}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Step 6: Table 2 (weighted matrix) */}
      {step === 6 && (
        <div className="space-y-4">
          <div className="rounded-xl border border-outline/20 bg-surface-container-low p-5">
            <div className="flex items-start gap-3">
              <TableProperties className="w-5 h-5 text-mtn-yellow shrink-0 mt-0.5" />
              <div>
                <p className="font-sans text-sm font-semibold text-on-surface">Table 2 — Weighted Matrix</p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Your weighted metrics for the Base Case and each scenario. Each cell becomes a
                  variable for the four section tables in the next step.
                </p>
              </div>
            </div>
          </div>

          {(!step5Filled || s5Issues > 0) && (
            <div className="rounded-lg bg-mtn-yellow/5 border border-mtn-yellow/20 p-3 flex gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-mtn-yellow shrink-0 mt-0.5" />
              <p className="text-xs text-mtn-yellow">
                {s5Issues > 0
                  ? `Step 5 has ${s5Issues} formula issue${s5Issues !== 1 ? 's' : ''}, so some cells below are empty. Open Step 5 and fix the red messages.`
                  : 'Some cells are still empty. Finish Step 5 so every weighted metric has a Base Case and scenario formula.'}
              </p>
            </div>
          )}

          <MatrixTable
            tag="Table 2"
            title="Weighted Matrix"
            rows={table2Rows}
            columns={orderedScenarios}
            unit={unit}
          />

          <StageVarChips title="Variables this table creates for Step 7" vars={stage5Vars} />

          <div className="flex justify-between">
            {backBtn(5, 'Weighted Table')}
            {nextBtn(7, 'Section Tables')}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Step 7: Four section tables (formulas use ONLY Table 2 variables) */}
      {step === 7 && (
        <div className="space-y-4">
          <div className="rounded-xl border border-outline/20 bg-surface-container-low p-5">
            <div className="flex items-start gap-3 mb-4">
              <Settings2 className="w-5 h-5 text-mtn-yellow shrink-0 mt-0.5" />
              <div>
                <p className="font-sans text-sm font-semibold text-on-surface">Section Tables</p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Build one table per section: Stress, Shock, Opportunities (holding all other constant)
                  and Opportunities (considering stress scenarios). Name each metric as you like and
                  calculate it using only the variables from Table 2. Each section is independent, so
                  its metrics can be different.
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 px-3 py-2 flex gap-2">
              <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-blue-400 leading-relaxed">
                <strong>Waterfall order:</strong> the first metric is the start bar, the last is the total
                bar, and the ones in between are impact bars. Put them in the order you want them to cascade.
              </p>
            </div>
          </div>

          {!step5Complete && (
            <div className="rounded-lg bg-mtn-yellow/5 border border-mtn-yellow/20 p-3 flex gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-mtn-yellow shrink-0 mt-0.5" />
              <p className="text-xs text-mtn-yellow">Finish the weighted table (Step 5) first — its variables are the only inputs available here.</p>
            </div>
          )}

          <IssueBanner count={s7Issues} />

          <div className="space-y-4">
            {SECTION_META.map(s => (
              <SectionCard
                key={s.key}
                meta={s}
                metrics={sectionMetrics(s.key)}
                tokens={stage5Tokens}
                labels={stage5Labels}
                testValues={stage5Map}
                preview={sectionPreview[s.key] ?? []}
                issues={sectionIssues[s.key] ?? []}
                explainCtx={explainCtx7}
                onAdd={() => addSectionMetric(s.key)}
                onUpdate={(idx, patch) => updateSectionMetric(s.key, idx, patch)}
                onDelete={idx => deleteSectionMetric(s.key, idx)}
              />
            ))}
          </div>

          <div className="flex justify-between">
            {backBtn(6, 'Table 2')}
            {nextBtn(8, 'Tables 3–6')}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Step 8: Tables 3–6 */}
      {step === 8 && (
        <div className="space-y-4">
          <div className="rounded-xl border border-outline/20 bg-surface-container-low p-5">
            <div className="flex items-start gap-3">
              <TableProperties className="w-5 h-5 text-mtn-yellow shrink-0 mt-0.5" />
              <div>
                <p className="font-sans text-sm font-semibold text-on-surface">Tables 3–6 — Section Tables</p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  These four tables feed the four waterfall charts.
                </p>
              </div>
            </div>
          </div>

          {(!step7Filled || s7Issues > 0) && (
            <div className="rounded-lg bg-mtn-yellow/5 border border-mtn-yellow/20 p-3 flex gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-mtn-yellow shrink-0 mt-0.5" />
              <p className="text-xs text-mtn-yellow">
                {s7Issues > 0
                  ? `Step 7 has ${s7Issues} formula issue${s7Issues !== 1 ? 's' : ''}. Open Step 7 and fix the red messages.`
                  : 'Some metrics are missing a name or formula. Finish Step 7.'}
              </p>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {SECTION_META.map(s => (
              <SectionTable key={s.key} meta={s} rows={sectionPreview[s.key] ?? []} unit={unit} />
            ))}
          </div>

          <div className="flex justify-between">
            {backBtn(7, 'Section Tables')}
            {nextBtn(9, 'Calculate')}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Step 9: Save & Calculate → all tables + charts */}
      {step === 9 && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="rounded-xl border border-outline/20 bg-surface-container-low p-5">
            <p className="font-sans text-sm font-semibold text-on-surface mb-3">Configuration Summary</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-lg border border-outline/15 p-3 text-center">
                <p className="font-mono text-lg font-bold text-on-surface">{globalVars.length}</p>
                <p className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant mt-0.5">Variables</p>
              </div>
              <div className="rounded-lg border border-outline/15 p-3 text-center">
                <p className="font-mono text-lg font-bold text-on-surface">{derivedMetrics.length}</p>
                <p className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant mt-0.5">Derived Metrics</p>
              </div>
              <div className="rounded-lg border border-outline/15 p-3 text-center">
                <p className="font-mono text-lg font-bold text-on-surface">{scenarios.length}</p>
                <p className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant mt-0.5">Scenarios</p>
              </div>
              <div className="rounded-lg border border-outline/15 p-3 text-center">
                <p className="font-mono text-lg font-bold text-on-surface">{totalSectionMetrics}</p>
                <p className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant mt-0.5">Section Metrics</p>
              </div>
            </div>

            {/* Scenario breakdown */}
            <div className="mt-4 flex gap-3 flex-wrap">
              {(['stress', 'shock', 'opportunity'] as const).map(type => {
                const count = scenarios.filter(s => s.type === type).length;
                const meta = SCENARIO_TYPE_META[type];
                const Icon = meta.icon;
                return (
                  <div key={type} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${meta.borderClass} ${meta.bgClass}`}>
                    <Icon className={`w-3 h-3 ${typeTextClass(type)}`} />
                    <span className={`font-mono text-[9px] ${typeTextClass(type)}`}>{count} {meta.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Warnings — each one links to the stage where it can be fixed */}
          {!step1Complete && (
            <div className="rounded-lg bg-mtn-yellow/5 border border-mtn-yellow/20 p-3 flex gap-2 items-start">
              <AlertTriangle className="w-3.5 h-3.5 text-mtn-yellow shrink-0 mt-0.5" />
              <p className="text-xs text-mtn-yellow flex-1">Step 1 incomplete: Define at least one variable, and make sure every name is valid and unique (start with a letter; letters, numbers, spaces and _ only).</p>
              <button onClick={() => setStep(1)} className="font-mono text-[10px] uppercase tracking-widest text-mtn-yellow underline">Go to Step 1</button>
            </div>
          )}
          {!step2Complete && (
            <div className="rounded-lg bg-mtn-yellow/5 border border-mtn-yellow/20 p-3 flex gap-2 items-start">
              <AlertTriangle className="w-3.5 h-3.5 text-mtn-yellow shrink-0 mt-0.5" />
              <p className="text-xs text-mtn-yellow flex-1">Step 2 incomplete: Define at least one scenario with a name, and give every scenario variable a valid, unique name.</p>
              <button onClick={() => setStep(2)} className="font-mono text-[10px] uppercase tracking-widest text-mtn-yellow underline">Go to Step 2</button>
            </div>
          )}
          {!step3Complete && (
            <div className="rounded-lg bg-mtn-yellow/5 border border-mtn-yellow/20 p-3 flex gap-2 items-start">
              <AlertTriangle className="w-3.5 h-3.5 text-mtn-yellow shrink-0 mt-0.5" />
              <p className="text-xs text-mtn-yellow flex-1">
                {s3Issues > 0
                  ? `Step 3 has ${s3Issues} formula issue${s3Issues !== 1 ? 's' : ''} (for example a metric using one that is listed below it). The red messages show exactly where.`
                  : 'Step 3 incomplete: Every derived metric needs a valid, unique name, a base case formula, and a formula for each scenario.'}
              </p>
              <button onClick={() => setStep(3)} className="font-mono text-[10px] uppercase tracking-widest text-mtn-yellow underline">Go to Step 3</button>
            </div>
          )}
          {!step5Complete && (
            <div className="rounded-lg bg-mtn-yellow/5 border border-mtn-yellow/20 p-3 flex gap-2 items-start">
              <AlertTriangle className="w-3.5 h-3.5 text-mtn-yellow shrink-0 mt-0.5" />
              <p className="text-xs text-mtn-yellow flex-1">
                {s5Issues > 0
                  ? `Step 5 has ${s5Issues} formula issue${s5Issues !== 1 ? 's' : ''}. The red messages show exactly where.`
                  : 'Step 5 incomplete: Every weighted metric needs a base case formula and a formula for each scenario.'}
              </p>
              <button onClick={() => setStep(5)} className="font-mono text-[10px] uppercase tracking-widest text-mtn-yellow underline">Go to Step 5</button>
            </div>
          )}
          {!step7Complete && (
            <div className="rounded-lg bg-mtn-yellow/5 border border-mtn-yellow/20 p-3 flex gap-2 items-start">
              <AlertTriangle className="w-3.5 h-3.5 text-mtn-yellow shrink-0 mt-0.5" />
              <p className="text-xs text-mtn-yellow flex-1">
                {s7Issues > 0
                  ? `Step 7 has ${s7Issues} formula issue${s7Issues !== 1 ? 's' : ''}. The red messages show exactly where.`
                  : 'Step 7 incomplete: Add at least one section metric, and give every metric a unique name and a formula.'}
              </p>
              <button onClick={() => setStep(7)} className="font-mono text-[10px] uppercase tracking-widest text-mtn-yellow underline">Go to Step 7</button>
            </div>
          )}

          {/* Calculate Button */}
          <button
            onClick={handleCompute}
            disabled={computing || !canCalculate}
            className={`w-full py-4 rounded-xl font-mono font-bold text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed ${
              computing
                ? 'bg-mtn-yellow/70 text-black'
                : 'bg-mtn-yellow text-black hover:bg-mtn-yellow/90'
            }`}
          >
            {computing ? (
              <>
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Saving & Computing…
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-black" />
                Save & Create Tables and Charts
              </>
            )}
          </button>

          <div className="rounded-lg border border-outline/10 bg-surface-container-low/50 p-3 flex gap-2">
            <Info className="w-3.5 h-3.5 text-on-surface-variant shrink-0 mt-0.5" />
            <p className="text-[10px] text-on-surface-variant leading-relaxed">
              Your work is already saved automatically. This runs every calculation on the server and
              creates a versioned snapshot for audit tracking. You will get all six tables, the four
              waterfall charts built from Tables 3–6, and a stacked bar chart built from Table 1, all in {unit}.
            </p>
          </div>
          <div className="flex justify-start">{backBtn(8, 'Tables 3–6')}</div>
        </div>
      )}
    </div>
  );
}
