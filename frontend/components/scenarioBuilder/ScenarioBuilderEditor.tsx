


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

// function VariableRow({ item, index, onChange, onDelete }: {
//   item: VariableItem; index: number;
//   onChange: (index: number, field: keyof VariableItem, value: string | number) => void;
//   onDelete: (index: number) => void;
// }) {
//   return (
//     <div className="flex items-center gap-2 group">
//       <GripVertical className="w-3 h-3 text-on-surface-variant/30 shrink-0" />
//       <input
//         type="text"
//         placeholder="Variable name (e.g. revenue)"
//         value={item.name}
//         onChange={e => onChange(index, 'name', e.target.value)}
//         className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-surface-container border border-outline/20 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:border-mtn-yellow/50 focus:outline-none font-mono"
//       />
//       <input
//         type="number"
//         placeholder="Value"
//         value={item.value || ''}
//         onChange={e => onChange(index, 'value', parseFloat(e.target.value) || 0)}
//         className="w-32 px-3 py-2 rounded-lg bg-surface-container border border-outline/20 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:border-mtn-yellow/50 focus:outline-none font-mono text-right"
//       />
//       <input
//         type="text"
//         placeholder="Description (optional)"
//         value={item.description}
//         onChange={e => onChange(index, 'description', e.target.value)}
//         className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-surface-container border border-outline/20 text-xs text-on-surface-variant placeholder:text-on-surface-variant/30 focus:border-outline/40 focus:outline-none"
//       />
//       <button
//         onClick={() => onDelete(index)}
//         className="p-1.5 rounded-lg text-on-surface-variant/40 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
//       >
//         <Trash2 className="w-3.5 h-3.5" />
//       </button>
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
//   baseTestValues, scenarioTestValues,
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
//           className="w-48 px-3 py-2 rounded-lg bg-surface-container border border-outline/20 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:border-mtn-yellow/50 focus:outline-none font-mono"
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
//             const scVars = (sc.variables ?? []).filter(v => v.name.trim());
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

// function ScenarioCard({ scenario, allVariableNames, onUpdate, onDelete }: {
//   scenario: ScenarioItem;
//   allVariableNames: string[];
//   onUpdate: (updated: ScenarioItem) => void;
//   onDelete: () => void;
// }) {
//   const [collapsed, setCollapsed] = useState(false);
//   const meta = SCENARIO_TYPE_META[scenario.type] || SCENARIO_TYPE_META.stress;
//   const Icon = meta.icon;
//   const scenarioVariables = scenario.variables ?? [];

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
//               {scenarioVariables.map((sv, idx) => (
//                 <div key={idx} className="flex items-center gap-2">
//                   <input
//                     type="text"
//                     value={sv.name}
//                     onChange={e => updateScenarioVariable(idx, 'name', e.target.value)}
//                     placeholder="Variable name (e.g. failure_rate)"
//                     className={`flex-1 min-w-0 px-2 py-1.5 rounded-lg bg-surface-container border text-xs text-on-surface font-mono placeholder:text-on-surface-variant/40 focus:outline-none ${
//                       sv.name.trim() ? 'border-outline/20' : 'border-red-500/40'
//                     }`}
//                   />
//                   <input
//                     type="number"
//                     value={sv.value || ''}
//                     onChange={e => updateScenarioVariable(idx, 'value', parseFloat(e.target.value) || 0)}
//                     placeholder="Value"
//                     className="w-28 px-2 py-1.5 rounded-lg bg-surface-container border border-outline/20 text-xs text-on-surface font-mono text-right focus:outline-none"
//                   />
//                   <input
//                     type="text"
//                     value={sv.description ?? ''}
//                     onChange={e => updateScenarioVariable(idx, 'description', e.target.value)}
//                     placeholder="Description (optional)"
//                     className="flex-1 min-w-0 px-2 py-1.5 rounded-lg bg-surface-container border border-outline/20 text-[11px] text-on-surface-variant placeholder:text-on-surface-variant/30 focus:outline-none"
//                   />
//                   <button
//                     onClick={() => deleteScenarioVariable(idx)}
//                     className="p-1 rounded text-on-surface-variant/40 hover:text-red-400 transition-colors"
//                   >
//                     <Trash2 className="w-3 h-3" />
//                   </button>
//                 </div>
//               ))}
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

//   // Names of base variables only (scenario overrides can only target these)
//   const globalVarNames = useMemo(
//     () => globalVars.map(v => v.name).filter(Boolean),
//     [globalVars]
//   );

//   // Names of derived metrics
//   const derivedNames = useMemo(
//     () => derivedMetrics.map(d => d.name).filter(Boolean),
//     [derivedMetrics]
//   );

//   // Base case formulas can use base variables + derived metrics (NOT scenario-only variables)
//   const allVarNames = useMemo(
//     () => [...globalVarNames, ...derivedNames],
//     [globalVarNames, derivedNames]
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
//   const step1Complete = globalVars.length > 0 && globalVars.every(v => v.name.trim());
//   const step2Complete =
//     scenarios.length > 0 &&
//     scenarios.every(s => s.name.trim() && (s.variables ?? []).every(v => v.name.trim()));
//   const step3Complete =
//     derivedMetrics.length > 0 &&
//     derivedMetrics.every(d =>
//       d.name.trim() && d.formula.trim() &&
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

//             <div className="space-y-2">
//               {globalVars.map((v, i) => (
//                 <VariableRow
//                   key={i}
//                   item={v}
//                   index={i}
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
//                 {globalVars.filter(v => v.name.trim()).map((v, i) => (
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
//               <p className="text-xs text-mtn-yellow">Step 1 incomplete: Define at least one variable with a name.</p>
//             </div>
//           )}
//           {!step2Complete && (
//             <div className="rounded-lg bg-mtn-yellow/5 border border-mtn-yellow/20 p-3 flex gap-2">
//               <AlertTriangle className="w-3.5 h-3.5 text-mtn-yellow shrink-0 mt-0.5" />
//               <p className="text-xs text-mtn-yellow">Step 2 incomplete: Define at least one scenario with a name, and name every scenario variable.</p>
//             </div>
//           )}
//           {!step3Complete && (
//             <div className="rounded-lg bg-mtn-yellow/5 border border-mtn-yellow/20 p-3 flex gap-2">
//               <AlertTriangle className="w-3.5 h-3.5 text-mtn-yellow shrink-0 mt-0.5" />
//               <p className="text-xs text-mtn-yellow">Step 3 incomplete: Every derived metric needs a name, a base case formula, and a formula for each scenario.</p>
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





// frontend/components/scenarioBuilder/ScenarioBuilderEditor.tsx

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft, Save, Play, Plus, Trash2, GripVertical, CheckCircle,
  AlertTriangle, ChevronDown, ChevronRight, Info, Variable,
  FunctionSquare, ShieldAlert, Zap, TrendingUp, Settings2,
  Eye, FlaskConical, Delete,
} from 'lucide-react';
import {
  getConfig, updateConfig, computeConfig,
  type FullConfig, type VariableItem, type DerivedItem,
  type ScenarioItem, type ScenarioOverride, type ScenarioVariable,
  type TableConfig, type ComputedResults,
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

type Step = 1 | 2 | 3 | 4 | 5;

/** De-duplicate a list of variable names by their normalized form (first spelling wins). */
function uniqueNames(names: string[]): string[] {
  const seen = new Map<string, string>();
  names.forEach(n => {
    const key = normalizeName(n);
    if (key && !seen.has(key)) seen.set(key, n);
  });
  return Array.from(seen.values());
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
    return 'Must start with a letter (e.g use payout_2025, not 2025 payout). Else this variable wont be saved';
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

function StepBadge({ step, label, active, completed, onClick }: {
  step: number; label: string; active: boolean; completed: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition-all text-left ${
        active
          ? 'bg-mtn-yellow/10 border border-mtn-yellow/30'
          : completed
            ? 'bg-green-500/5 border border-green-500/20 hover:border-green-500/40'
            : 'border border-outline/15 hover:border-outline/30'
      }`}
    >
      <div className={`flex items-center justify-center w-6 h-6 rounded-full font-mono text-xs font-bold shrink-0 ${
        active
          ? 'bg-mtn-yellow text-black'
          : completed
            ? 'bg-green-500 text-black'
            : 'bg-surface-container text-on-surface-variant'
      }`}>
        {completed && !active ? '✓' : step}
      </div>
      <span className={`font-mono text-[10px] uppercase tracking-widest ${
        active ? 'text-mtn-yellow' : completed ? 'text-green-400' : 'text-on-surface-variant'
      }`}>
        {label}
      </span>
    </button>
  );
}

// ── Variable Row ──────────────────────────────────────────────────────────

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
        <input
          type="number"
          placeholder="Value"
          value={item.value || ''}
          onChange={e => onChange(index, 'value', parseFloat(e.target.value) || 0)}
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

// ── Formula Builder (visual, click-based) ─────────────────────────────────

function FormulaBuilder({ value, onChange, availableVars, testValues }: {
  value: string;
  onChange: (next: string) => void;
  availableVars: string[];
  testValues?: Record<string, number>;
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

  // Live preview using real base values (falls back to 1 only if testValues missing)
  const preview = useMemo(() => {
    if (!value.trim()) return null;
    const varMap: Record<string, number> = {};
    availableVars.forEach(v => {
      const key = normalizeName(v);
      const tv = testValues?.[key];
      varMap[key] = tv !== undefined ? tv : 1;
    });
    return evaluateFormula(value, varMap);
  }, [value, availableVars, testValues]);

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
    <div className="rounded-lg border border-outline/20 bg-surface-container-low p-3 space-y-2.5">
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
            <option key={v} value={v}>{normalizeName(v)}</option>
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
        <div className={`flex items-center gap-2 px-2 py-1.5 rounded font-mono text-[10px] ${
          preview.error
            ? 'bg-red-500/5 text-red-400'
            : 'bg-green-500/5 text-green-400'
        }`}>
          {preview.error ? (
            <>
              <AlertTriangle className="w-3 h-3 shrink-0" />
              <span>{preview.error}</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-3 h-3 shrink-0" />
              <span>Formula valid (test value: {preview.value?.toFixed(2)})</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Derived Metric Row (collapsible: Base Case + one formula per scenario) ─

function DerivedRow({
  item, index, scenarios, availableVars, globalVarNames, derivedNames, baseVarValues,
  baseTestValues, scenarioTestValues, nameError,
  onChange, onChangeScenarioFormula, onDelete,
}: {
  item: DerivedItem; index: number;
  scenarios: ScenarioItem[];
  availableVars: string[];                 // base case: global variables + derived metrics
  globalVarNames: string[];
  derivedNames: string[];
  baseVarValues: Record<string, number>;
  baseTestValues?: Record<string, number>;
  scenarioTestValues: Record<string, Record<string, number>>;
  nameError?: string | null;
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

  return (
    <div className="rounded-xl border border-white bg-surface-container-low/50 group">
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
              availableVars={availableVars}
              testValues={baseTestValues}
            />
          </div>

          {/* One formula per scenario */}
          {scenarios.map(sc => {
            const meta = SCENARIO_TYPE_META[sc.type] || SCENARIO_TYPE_META.stress;
            const val = item.scenario_formulas?.[sc.id] ?? '';

            // Variables visible ONLY in this scenario: base variables (with this scenario's
            // overrides applied) + this scenario's own new variables + derived metrics.
            const scVars = (sc.variables ?? []).filter(v => isUsableName(v.name));
            const overrideMap = new Map<string, number>();
            sc.overrides.forEach(o => {
              if (o.name.trim()) overrideMap.set(normalizeName(o.name), o.value);
            });
            const scAvailable = uniqueNames([
              ...globalVarNames,
              ...scVars.map(v => v.name),
              ...derivedNames,
            ]);

            return (
              <div key={sc.id} className="space-y-1.5">
                <p className={`font-mono text-[9px] uppercase tracking-widest text-${meta.color}`}>
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
        <Icon className={`w-4 h-4 text-${meta.color} shrink-0`} />
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
                  <input
                    type="number"
                    value={ov.value || ''}
                    onChange={e => updateOverride(idx, 'value', parseFloat(e.target.value) || 0)}
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
                      <input
                        type="number"
                        value={sv.value || ''}
                        onChange={e => updateScenarioVariable(idx, 'value', parseFloat(e.target.value) || 0)}
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

// ── Main Editor ───────────────────────────────────────────────────────────

export function ScenarioBuilderEditor({ configId, onBack }: { configId: number; onBack: () => void }) {
  const [config, setConfig] = useState<FullConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [computing, setComputing] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
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
    weights: { stress: 0.7, shock: 0.3, opportunity: 1.0 },
  });

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
        setTableConfig(c.table_config || {
          display_metrics: [],
          waterfall_metrics: [],
          weights: { stress: 0.7, shock: 0.3, opportunity: 1.0 },
        });
        if (c.computed_results) {
          setResults(c.computed_results);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, [configId]);

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

  // Base case formulas can use base variables + derived metrics (NOT scenario-only variables)
  const allVarNames = useMemo(
    () => [...globalVarNames, ...derivedNames],
    [globalVarNames, derivedNames]
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

  // Live base case preview (cascaded)
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

  // Save
  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveMsg(null);
    setError(null);
    try {
      await updateConfig(configId, {
        name,
        description,
        currency_label: currencyLabel,
        global_variables: globalVars,
        derived_metrics: derivedMetrics,
        scenarios,
        table_config: tableConfig,
      });
      setSaveMsg('Saved!');
      setTimeout(() => setSaveMsg(null), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }, [configId, name, description, currencyLabel, globalVars, derivedMetrics, scenarios, tableConfig]);

  // Compute
  const handleCompute = useCallback(async () => {
    setComputing(true);
    setError(null);
    try {
      await updateConfig(configId, {
        name,
        description,
        currency_label: currencyLabel,
        global_variables: globalVars,
        derived_metrics: derivedMetrics,
        scenarios,
        table_config: tableConfig,
      });

      const res = await computeConfig(configId, `Computed from UI on ${new Date().toLocaleString()}`);
      setResults(res.results);
      setShowResults(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Computation failed');
    } finally {
      setComputing(false);
    }
  }, [configId, name, description, currencyLabel, globalVars, derivedMetrics, scenarios, tableConfig]);

  // Variable operations
  const addGlobalVar = () => setGlobalVars(v => [...v, { name: '', value: 0, description: '' }]);
  const updateGlobalVar = (idx: number, field: keyof VariableItem, value: string | number) => {
    setGlobalVars(v => v.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };
  const deleteGlobalVar = (idx: number) => setGlobalVars(v => v.filter((_, i) => i !== idx));

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

  // Step completion checks
  // Step order: 1 Variables → 2 Scenarios → 3 Derived Metrics → 4 Table Config → 5 Calculate
  const step1Complete =
    globalVars.length > 0 &&
    globalVars.every((v, i) => v.name.trim() && !globalNameIssues[i]);
  const step2Complete =
    scenarios.length > 0 &&
    scenarios.every(s => {
      const issues = scenarioVarIssues(s, globalVarNames, derivedNames);
      return s.name.trim() && (s.variables ?? []).every((v, i) => v.name.trim() && !issues[i]);
    });
  const step3Complete =
    derivedMetrics.length > 0 &&
    derivedMetrics.every((d, i) =>
      d.name.trim() && !derivedNameIssues[i] && d.formula.trim() &&
      scenarios.every(sc => (d.scenario_formulas?.[sc.id] ?? '').trim())
    );
  const step4Complete = tableConfig.display_metrics.length > 0;

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

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      {/* Top Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-outline/20 text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-transparent font-sans text-lg font-bold text-on-surface focus:outline-none"
            placeholder="Configuration name…"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="number"
            value={year}
            onChange={e => setYear(parseInt(e.target.value) || new Date().getFullYear())}
            className="w-20 px-2 py-1.5 rounded-lg bg-surface-container border border-outline/20 text-xs text-on-surface font-mono text-center focus:outline-none"
          />
          <input
            type="text"
            value={currencyLabel}
            onChange={e => setCurrencyLabel(e.target.value)}
            placeholder="Unit"
            className="w-20 px-2 py-1.5 rounded-lg bg-surface-container border border-outline/20 text-xs text-on-surface font-mono text-center focus:outline-none"
          />

          {saveMsg && (
            <span className="flex items-center gap-1 text-green-400 font-mono text-[10px]">
              <CheckCircle className="w-3 h-3" /> {saveMsg}
            </span>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline/20 text-on-surface-variant hover:text-on-surface hover:border-outline/40 transition-colors font-mono text-[10px] uppercase tracking-widest disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving…' : 'Save Draft'}
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
        <StepBadge step={3} label="Derived Metrics" active={step === 3} completed={step3Complete} onClick={() => setStep(3)} />
        <StepBadge step={4} label="Table Config" active={step === 4} completed={step4Complete} onClick={() => setStep(4)} />
        <StepBadge step={5} label="Calculate" active={step === 5} completed={!!results} onClick={() => setStep(5)} />
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

          <div className="flex justify-end">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 rounded-lg bg-mtn-yellow text-black font-mono text-[10px] uppercase tracking-widest font-bold hover:bg-mtn-yellow/90 transition-colors"
            >
              Next: Scenarios →
            </button>
          </div>
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
                    <p className={`font-mono text-[9px] uppercase tracking-widest text-${meta.color}`}>
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
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded-lg border border-outline/20 text-on-surface-variant font-mono text-[10px] uppercase tracking-widest hover:text-on-surface hover:border-outline/40 transition-colors"
            >
              ← Variables
            </button>
            <button
              onClick={() => setStep(3)}
              className="px-4 py-2 rounded-lg bg-mtn-yellow text-black font-mono text-[10px] uppercase tracking-widest font-bold hover:bg-mtn-yellow/90 transition-colors"
            >
              Next: Derived Metrics →
            </button>
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
                  applied), that scenario&apos;s own variables, and metrics listed above. Every metric
                  must be filled for the Base Case and all {scenarios.length} scenario(s).
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

            <div className="space-y-3">
              {derivedMetrics.map((d, i) => (
                <DerivedRow
                  key={i}
                  item={d}
                  index={i}
                  scenarios={scenarios}
                  availableVars={allVarNames}
                  globalVarNames={globalVarNames}
                  derivedNames={derivedNames}
                  baseVarValues={baseVarValues}
                  baseTestValues={baseCasePreview.variables}
                  scenarioTestValues={scenarioPreviews}
                  nameError={derivedNameIssues[i]}
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
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 rounded-lg border border-outline/20 text-on-surface-variant font-mono text-[10px] uppercase tracking-widest hover:text-on-surface hover:border-outline/40 transition-colors"
            >
              ← Scenarios
            </button>
            <button
              onClick={() => setStep(4)}
              className="px-4 py-2 rounded-lg bg-mtn-yellow text-black font-mono text-[10px] uppercase tracking-widest font-bold hover:bg-mtn-yellow/90 transition-colors"
            >
              Next: Table Config →
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Step 4: Table & Output Configuration */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="rounded-xl border border-outline/20 bg-surface-container-low p-5">
            <div className="flex items-start gap-3 mb-4">
              <Settings2 className="w-5 h-5 text-mtn-yellow shrink-0 mt-0.5" />
              <div>
                <p className="font-sans text-sm font-semibold text-on-surface">Table & Output Configuration</p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Choose which metrics appear in your output tables and waterfall charts,
                  and set the probability weights for each scenario type.
                </p>
              </div>
            </div>

            {/* Display Metrics */}
            <div className="mb-6">
              <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant mb-2">
                Table Metrics (select which derived metrics to display)
              </p>
              <div className="flex flex-wrap gap-2">
                {derivedMetrics.filter(d => d.name.trim()).map(d => {
                  const selected = tableConfig.display_metrics.includes(d.name);
                  return (
                    <button
                      key={d.name}
                      onClick={() => {
                        setTableConfig(tc => ({
                          ...tc,
                          display_metrics: selected
                            ? tc.display_metrics.filter(m => m !== d.name)
                            : [...tc.display_metrics, d.name],
                        }));
                      }}
                      className={`px-3 py-1.5 rounded-lg font-mono text-[10px] transition-colors ${
                        selected
                          ? 'bg-mtn-yellow/10 border border-mtn-yellow/40 text-mtn-yellow'
                          : 'border border-outline/20 text-on-surface-variant hover:text-on-surface hover:border-outline/40'
                      }`}
                    >
                      {d.name}
                    </button>
                  );
                })}
                {derivedMetrics.filter(d => d.name.trim()).length === 0 && (
                  <p className="text-xs text-on-surface-variant/50 italic">Define derived metrics first (Step 3)</p>
                )}
              </div>

              {/* Quick select all */}
              {derivedMetrics.filter(d => d.name.trim()).length > 0 && (
                <button
                  onClick={() => {
                    setTableConfig(tc => ({
                      ...tc,
                      display_metrics: derivedMetrics.filter(d => d.name.trim()).map(d => d.name),
                    }));
                  }}
                  className="mt-2 text-[9px] font-mono text-mtn-yellow hover:underline"
                >
                  Select All
                </button>
              )}
            </div>

            {/* Waterfall Metrics */}
            <div className="mb-6">
              <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant mb-2">
                Waterfall Chart Metrics (the cascade order: e.g. Revenue → EBITDA → PAT)
              </p>
              <div className="flex flex-wrap gap-2">
                {tableConfig.display_metrics.map(m => {
                  const inWaterfall = tableConfig.waterfall_metrics.includes(m);
                  return (
                    <button
                      key={m}
                      onClick={() => {
                        setTableConfig(tc => ({
                          ...tc,
                          waterfall_metrics: inWaterfall
                            ? tc.waterfall_metrics.filter(w => w !== m)
                            : [...tc.waterfall_metrics, m],
                        }));
                      }}
                      className={`px-3 py-1.5 rounded-lg font-mono text-[10px] transition-colors ${
                        inWaterfall
                          ? 'bg-blue-500/10 border border-blue-500/40 text-blue-400'
                          : 'border border-outline/20 text-on-surface-variant hover:text-on-surface hover:border-outline/40'
                      }`}
                    >
                      {inWaterfall && <span className="mr-1 text-[8px]">{tableConfig.waterfall_metrics.indexOf(m) + 1}.</span>}
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Probability Weights */}
            <div>
              <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant mb-2">
                Probability Weights (for Table 2 — weighted impact matrix)
              </p>
              <div className="grid grid-cols-3 gap-3">
                {(['stress', 'shock', 'opportunity'] as const).map(type => {
                  const meta = SCENARIO_TYPE_META[type];
                  return (
                    <div key={type} className={`rounded-lg border ${meta.borderClass} ${meta.bgClass} p-3`}>
                      <p className={`font-mono text-[9px] uppercase tracking-widest text-${meta.color} mb-1.5`}>
                        {meta.label} Weight
                      </p>
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        max="1"
                        value={tableConfig.weights[type] ?? 1}
                        onChange={e => {
                          setTableConfig(tc => ({
                            ...tc,
                            weights: { ...tc.weights, [type]: parseFloat(e.target.value) || 0 },
                          }));
                        }}
                        className="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline/20 text-sm text-on-surface font-mono text-center focus:outline-none"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(3)}
              className="px-4 py-2 rounded-lg border border-outline/20 text-on-surface-variant font-mono text-[10px] uppercase tracking-widest hover:text-on-surface hover:border-outline/40 transition-colors"
            >
              ← Derived Metrics
            </button>
            <button
              onClick={() => setStep(5)}
              className="px-4 py-2 rounded-lg bg-mtn-yellow text-black font-mono text-[10px] uppercase tracking-widest font-bold hover:bg-mtn-yellow/90 transition-colors"
            >
              Next: Calculate →
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Step 5: Calculate */}
      {step === 5 && (
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
                <p className="font-mono text-lg font-bold text-on-surface">{tableConfig.display_metrics.length}</p>
                <p className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant mt-0.5">Output Metrics</p>
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
                    <Icon className={`w-3 h-3 text-${meta.color}`} />
                    <span className={`font-mono text-[9px] text-${meta.color}`}>{count} {meta.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Warnings */}
          {!step1Complete && (
            <div className="rounded-lg bg-mtn-yellow/5 border border-mtn-yellow/20 p-3 flex gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-mtn-yellow shrink-0 mt-0.5" />
              <p className="text-xs text-mtn-yellow">Step 1 incomplete: Define at least one variable, and make sure every name is valid and unique (start with a letter; letters, numbers, spaces and _ only).</p>
            </div>
          )}
          {!step2Complete && (
            <div className="rounded-lg bg-mtn-yellow/5 border border-mtn-yellow/20 p-3 flex gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-mtn-yellow shrink-0 mt-0.5" />
              <p className="text-xs text-mtn-yellow">Step 2 incomplete: Define at least one scenario with a name, and give every scenario variable a valid, unique name.</p>
            </div>
          )}
          {!step3Complete && (
            <div className="rounded-lg bg-mtn-yellow/5 border border-mtn-yellow/20 p-3 flex gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-mtn-yellow shrink-0 mt-0.5" />
              <p className="text-xs text-mtn-yellow">Step 3 incomplete: Every derived metric needs a valid, unique name, a base case formula, and a formula for each scenario.</p>
            </div>
          )}

          {/* Calculate Button */}
          <button
            onClick={handleCompute}
            disabled={computing || !step1Complete || !step2Complete || !step3Complete}
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
                Save & Calculate All Scenarios
              </>
            )}
          </button>

          <div className="rounded-lg border border-outline/10 bg-surface-container-low/50 p-3 flex gap-2">
            <Info className="w-3.5 h-3.5 text-on-surface-variant shrink-0 mt-0.5" />
            <p className="text-[10px] text-on-surface-variant leading-relaxed">
              This will save your configuration, run all {scenarios.length} scenario calculations on the server,
              and create a versioned snapshot for audit tracking. All data is preserved in the database.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
