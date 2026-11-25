


// import { getAccessToken, forceLogout } from './auth';

// const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://127.0.0.1:8001';

// export interface VariableItem {
//   name: string;
//   value: number;
//   description: string;
// }

// export interface DerivedItem {
//   name: string;
//   formula: string;                              // base case formula
//   description: string;
//   scenario_formulas?: Record<string, string>;   // scenarioId -> formula for that scenario
// }

// export interface ScenarioOverride {
//   name: string;
//   value: number;
// }

// /** A variable that exists only inside one scenario. */
// export interface ScenarioVariable {
//   name: string;
//   value: number;
//   description?: string;
// }

// export interface ScenarioDerived {
//   name: string;
//   formula: string;
// }

// export interface ScenarioItem {
//   id: string;
//   name: string;
//   type: 'stress' | 'shock' | 'opportunity';
//   overrides: ScenarioOverride[];        // overwrite base variables (this scenario only)
//   variables?: ScenarioVariable[];       // new variables (this scenario only)
//   derived: ScenarioDerived[];
// }

// export interface TableConfig {
//   display_metrics: string[];
//   waterfall_metrics: string[];
//   weights: Record<string, number>;
// }

// export interface ConfigSummary {
//   id: number;
//   name: string;
//   year: number;
//   description: string;
//   status: string;
//   currency_label: string;
//   created_at: string | null;
//   updated_at: string | null;
//   computed_at: string | null;
//   snapshot_count: number;
// }

// export interface FullConfig {
//   id: number;
//   name: string;
//   year: number;
//   description: string;
//   status: string;
//   currency_label: string;
//   global_variables: VariableItem[];
//   derived_metrics: DerivedItem[];
//   scenarios: ScenarioItem[];
//   table_config: TableConfig | null;
//   computed_results: ComputedResults | null;
//   created_at: string | null;
//   updated_at: string | null;
//   computed_at: string | null;
// }

// export interface Table1Row {
//   metric: string;
//   baseCase: number;
//   scenarios: Record<string, number>;
// }

// export interface Table2ScenarioDetail {
//   absolute: number;
//   delta: number;
//   weight: number;
//   weighted: number;
// }

// export interface Table2Row {
//   metric: string;
//   scenarios: Record<string, Table2ScenarioDetail>;
// }

// export interface WaterfallItem {
//   label: string;
//   value: number;
//   type: 'base' | 'positive' | 'negative' | 'total';
// }

// export interface ComputedResults {
//   baseCase: Record<string, number>;
//   scenarioResults: Record<string, Record<string, number>>;
//   table1: Table1Row[];
//   table2: Table2Row[];
//   waterfalls: Record<string, WaterfallItem[]>;
//   displayMetrics: string[];
//   errors: string[];
// }

// export interface SnapshotSummary {
//   id: number;
//   version: number;
//   notes: string;
//   created_at: string | null;
// }

// async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
//   const token = getAccessToken();
//   const res = await fetch(`${API_BASE}${path}`, {
//     ...init,
//     headers: {
//       'Content-Type': 'application/json',
//       ...(token ? { Authorization: `Bearer ${token}` } : {}),
//       ...(init?.headers ?? {}),
//     },
//   });
//   if (!res.ok) {
//     const body = await res.text();
//     throw new Error(`API ${path} → ${res.status}: ${body.slice(0, 200)}`);
//   }
//   if (res.status === 204) return undefined as unknown as T;
//   return res.json() as Promise<T>;
// }

// export async function listConfigs(year?: number): Promise<ConfigSummary[]> {
//   const params = year ? `?year=${year}` : '';
//   return apiFetch(`/api/scenario-builder/configs${params}`);
// }

// export async function getConfig(id: number): Promise<FullConfig> {
//   return apiFetch(`/api/scenario-builder/configs/${id}`);
// }

// export async function createConfig(data: {
//   name: string;
//   year: number;
//   description?: string;
//   currency_label?: string;
//   global_variables: VariableItem[];
//   derived_metrics: DerivedItem[];
//   scenarios: ScenarioItem[];
//   table_config?: TableConfig;
// }): Promise<{ id: number; message: string }> {
//   return apiFetch('/api/scenario-builder/configs', {
//     method: 'POST',
//     body: JSON.stringify(data),
//   });
// }

// export async function updateConfig(
//   id: number,
//   data: Partial<{
//     name: string;
//     description: string;
//     currency_label: string;
//     global_variables: VariableItem[];
//     derived_metrics: DerivedItem[];
//     scenarios: ScenarioItem[];
//     table_config: TableConfig;
//   }>
// ): Promise<{ message: string }> {
//   return apiFetch(`/api/scenario-builder/configs/${id}`, {
//     method: 'PUT',
//     body: JSON.stringify(data),
//   });
// }

// export async function deleteConfig(id: number): Promise<{ message: string }> {
//   return apiFetch(`/api/scenario-builder/configs/${id}`, { method: 'DELETE' });
// }

// export async function computeConfig(
//   id: number,
//   notes?: string
// ): Promise<{ message: string; snapshot_version: number; results: ComputedResults }> {
//   return apiFetch(`/api/scenario-builder/configs/${id}/compute`, {
//     method: 'POST',
//     body: JSON.stringify({ notes: notes || '' }),
//   });
// }

// export async function listSnapshots(configId: number): Promise<SnapshotSummary[]> {
//   return apiFetch(`/api/scenario-builder/configs/${configId}/snapshots`);
// }

// export async function getSnapshot(
//   configId: number,
//   snapshotId: number
// ): Promise<{ id: number; version: number; notes: string; data: unknown; created_at: string | null }> {
//   return apiFetch(`/api/scenario-builder/configs/${configId}/snapshots/${snapshotId}`);
// }

// export async function duplicateConfig(
//   id: number,
//   newName?: string,
//   newYear?: number
// ): Promise<{ id: number; message: string }> {
//   const params = new URLSearchParams();
//   if (newName) params.set('new_name', newName);
//   if (newYear) params.set('new_year', String(newYear));
//   return apiFetch(`/api/scenario-builder/configs/${id}/duplicate?${params}`, { method: 'POST' });
// }

// export async function validateFormula(
//   formula: string,
//   availableVariables: string[]
// ): Promise<{ valid: boolean; error: string | null }> {
//   return apiFetch('/api/scenario-builder/validate-formula', {
//     method: 'POST',
//     body: JSON.stringify({ formula, available_variables: availableVariables }),
//   });
// }




// import { getAccessToken, forceLogout } from './auth';

// const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://127.0.0.1:8001';

// export interface VariableItem {
//   name: string;
//   value: number;
//   description: string;
// }

// export interface DerivedItem {
//   name: string;
//   formula: string;                              // base case formula
//   description: string;
//   scenario_formulas?: Record<string, string>;   // scenarioId -> formula for that scenario
// }

// export interface ScenarioOverride {
//   name: string;
//   value: number;
// }

// /** A variable that exists only inside one scenario. */
// export interface ScenarioVariable {
//   name: string;
//   value: number;
//   description?: string;
// }

// export interface ScenarioDerived {
//   name: string;
//   formula: string;
// }

// export interface ScenarioItem {
//   id: string;
//   name: string;
//   type: 'stress' | 'shock' | 'opportunity';
//   overrides: ScenarioOverride[];        // overwrite base variables (this scenario only)
//   variables?: ScenarioVariable[];       // new variables (this scenario only)
//   derived: ScenarioDerived[];
// }

// /** Stage 5: one per derived metric. Display name is always "<source> wghtd". */
// export interface WeightedMetric {
//   source: string;                               // the derived metric this one mirrors
//   name: string;                                 // "<source> wghtd"
//   formula: string;                              // base case formula
//   scenario_formulas?: Record<string, string>;   // scenarioId -> formula
// }

// /** Stage 7: a metric inside one of the four section tables. */
// export interface SectionMetric {
//   name: string;
//   formula: string;
// }

// export type SectionKey = 'stress' | 'shock' | 'opportunity' | 'combined';

// export interface TableConfig {
//   display_metrics: string[];
//   waterfall_metrics: string[];
//   weights: Record<string, number>;
//   weighted_metrics?: WeightedMetric[];
//   section_tables?: Partial<Record<SectionKey, SectionMetric[]>>;
// }

// export interface ConfigSummary {
//   id: number;
//   name: string;
//   year: number;
//   description: string;
//   status: string;
//   currency_label: string;
//   created_at: string | null;
//   updated_at: string | null;
//   computed_at: string | null;
//   snapshot_count: number;
// }

// export interface FullConfig {
//   id: number;
//   name: string;
//   year: number;
//   description: string;
//   status: string;
//   currency_label: string;
//   global_variables: VariableItem[];
//   derived_metrics: DerivedItem[];
//   scenarios: ScenarioItem[];
//   table_config: TableConfig | null;
//   computed_results: ComputedResults | null;
//   created_at: string | null;
//   updated_at: string | null;
//   computed_at: string | null;
// }

// /** Used for Table 1 (derived metrics) and Table 2 (weighted metrics). */
// export interface Table1Row {
//   metric: string;
//   baseCase: number;
//   scenarios: Record<string, number>;
// }

// /** One metric row of a section table (Tables 3–6). */
// export interface SectionRow {
//   metric: string;
//   value: number;
// }

// export interface WaterfallItem {
//   label: string;
//   value: number;
//   type: 'base' | 'positive' | 'negative' | 'total';
// }

// export interface ComputedResults {
//   baseCase: Record<string, number>;
//   scenarioResults: Record<string, Record<string, number>>;
//   table1: Table1Row[];
//   table2: Table1Row[];                              // weighted table
//   sectionTables: Record<string, SectionRow[]>;      // stress | shock | opportunity | combined
//   waterfalls: Record<string, WaterfallItem[]>;
//   displayMetrics: string[];
//   errors: string[];
// }

// export interface SnapshotSummary {
//   id: number;
//   version: number;
//   notes: string;
//   created_at: string | null;
// }

// async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
//   const token = getAccessToken();
//   const res = await fetch(`${API_BASE}${path}`, {
//     ...init,
//     headers: {
//       'Content-Type': 'application/json',
//       ...(token ? { Authorization: `Bearer ${token}` } : {}),
//       ...(init?.headers ?? {}),
//     },
//   });
//   if (!res.ok) {
//     const body = await res.text();
//     throw new Error(`API ${path} → ${res.status}: ${body.slice(0, 200)}`);
//   }
//   if (res.status === 204) return undefined as unknown as T;
//   return res.json() as Promise<T>;
// }

// export async function listConfigs(year?: number): Promise<ConfigSummary[]> {
//   const params = year ? `?year=${year}` : '';
//   return apiFetch(`/api/scenario-builder/configs${params}`);
// }

// export async function getConfig(id: number): Promise<FullConfig> {
//   return apiFetch(`/api/scenario-builder/configs/${id}`);
// }

// export async function createConfig(data: {
//   name: string;
//   year: number;
//   description?: string;
//   currency_label?: string;
//   global_variables: VariableItem[];
//   derived_metrics: DerivedItem[];
//   scenarios: ScenarioItem[];
//   table_config?: TableConfig;
// }): Promise<{ id: number; message: string }> {
//   return apiFetch('/api/scenario-builder/configs', {
//     method: 'POST',
//     body: JSON.stringify(data),
//   });
// }

// export async function updateConfig(
//   id: number,
//   data: Partial<{
//     name: string;
//     description: string;
//     currency_label: string;
//     global_variables: VariableItem[];
//     derived_metrics: DerivedItem[];
//     scenarios: ScenarioItem[];
//     table_config: TableConfig;
//   }>
// ): Promise<{ message: string }> {
//   return apiFetch(`/api/scenario-builder/configs/${id}`, {
//     method: 'PUT',
//     body: JSON.stringify(data),
//   });
// }

// export async function deleteConfig(id: number): Promise<{ message: string }> {
//   return apiFetch(`/api/scenario-builder/configs/${id}`, { method: 'DELETE' });
// }

// export async function computeConfig(
//   id: number,
//   notes?: string
// ): Promise<{ message: string; snapshot_version: number; results: ComputedResults }> {
//   return apiFetch(`/api/scenario-builder/configs/${id}/compute`, {
//     method: 'POST',
//     body: JSON.stringify({ notes: notes || '' }),
//   });
// }

// export async function listSnapshots(configId: number): Promise<SnapshotSummary[]> {
//   return apiFetch(`/api/scenario-builder/configs/${configId}/snapshots`);
// }

// export async function getSnapshot(
//   configId: number,
//   snapshotId: number
// ): Promise<{ id: number; version: number; notes: string; data: unknown; created_at: string | null }> {
//   return apiFetch(`/api/scenario-builder/configs/${configId}/snapshots/${snapshotId}`);
// }

// export async function duplicateConfig(
//   id: number,
//   newName?: string,
//   newYear?: number
// ): Promise<{ id: number; message: string }> {
//   const params = new URLSearchParams();
//   if (newName) params.set('new_name', newName);
//   if (newYear) params.set('new_year', String(newYear));
//   return apiFetch(`/api/scenario-builder/configs/${id}/duplicate?${params}`, { method: 'POST' });
// }

// export async function validateFormula(
//   formula: string,
//   availableVariables: string[]
// ): Promise<{ valid: boolean; error: string | null }> {
//   return apiFetch('/api/scenario-builder/validate-formula', {
//     method: 'POST',
//     body: JSON.stringify({ formula, available_variables: availableVariables }),
//   });
// }



import { getAccessToken, forceLogout } from './auth';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://127.0.0.1:8001';

export interface VariableItem {
  name: string;
  value: number;
  description: string;
}

export interface DerivedItem {
  name: string;
  formula: string;                              // base case formula
  description: string;
  scenario_formulas?: Record<string, string>;   // scenarioId -> formula for that scenario
}

export interface ScenarioOverride {
  name: string;
  value: number;
}

/** A variable that exists only inside one scenario. */
export interface ScenarioVariable {
  name: string;
  value: number;
  description?: string;
}

export interface ScenarioDerived {
  name: string;
  formula: string;
}

export interface ScenarioItem {
  id: string;
  name: string;
  type: 'stress' | 'shock' | 'opportunity';
  overrides: ScenarioOverride[];        // overwrite base variables (this scenario only)
  variables?: ScenarioVariable[];       // new variables (this scenario only)
  derived: ScenarioDerived[];
}

/** Stage 5: one per derived metric. Display name is always "<source> wghtd". */
export interface WeightedMetric {
  source: string;                               // the derived metric this one mirrors
  name: string;                                 // "<source> wghtd"
  formula: string;                              // base case formula
  scenario_formulas?: Record<string, string>;   // scenarioId -> formula
}

/** Stage 7: a metric inside one of the four section tables. */
export interface SectionMetric {
  name: string;
  formula: string;
}

export type SectionKey = 'stress' | 'shock' | 'opportunity' | 'combined';

export interface TableConfig {
  display_metrics: string[];
  waterfall_metrics: string[];
  weights: Record<string, number>;
  weighted_metrics?: WeightedMetric[];
  section_tables?: Partial<Record<SectionKey, SectionMetric[]>>;
  /** Where the base variables came from. Missing / null = typed in manually. */
  variables_source?: VariablesSource | null;
}

export interface VariablesSource {
  type: 'excel';
  filename: string;
  uploaded_at: string;
  row_count: number;
  /** replace = Excel rows replaced the list; merge = matched names updated, new ones added */
  mode?: 'replace' | 'merge';
  edited_after_upload?: boolean;
}

export interface ParsedVariablesExcel {
  filename: string;
  uploaded_at: string;
  row_count: number;
  skipped: number;
  warnings: string[];
  variables: VariableItem[];
}

export interface ConfigSummary {
  id: number;
  name: string;
  year: number;
  description: string;
  status: string;
  currency_label: string;
  created_at: string | null;
  updated_at: string | null;
  computed_at: string | null;
  snapshot_count: number;
}

export interface FullConfig {
  id: number;
  name: string;
  year: number;
  description: string;
  status: string;
  currency_label: string;
  global_variables: VariableItem[];
  derived_metrics: DerivedItem[];
  scenarios: ScenarioItem[];
  table_config: TableConfig | null;
  computed_results: ComputedResults | null;
  created_at: string | null;
  updated_at: string | null;
  computed_at: string | null;
}

/** Used for Table 1 (derived metrics) and Table 2 (weighted metrics). */
export interface Table1Row {
  metric: string;
  baseCase: number;
  scenarios: Record<string, number>;
}

/** One metric row of a section table (Tables 3–6). */
export interface SectionRow {
  metric: string;
  value: number;
}

export interface WaterfallItem {
  label: string;
  value: number;
  type: 'base' | 'positive' | 'negative' | 'total';
}

export interface ComputedResults {
  baseCase: Record<string, number>;
  scenarioResults: Record<string, Record<string, number>>;
  table1: Table1Row[];
  table2: Table1Row[];                              // weighted table
  sectionTables: Record<string, SectionRow[]>;      // stress | shock | opportunity | combined
  waterfalls: Record<string, WaterfallItem[]>;
  displayMetrics: string[];
  errors: string[];
}

export interface SnapshotSummary {
  id: number;
  version: number;
  notes: string;
  created_at: string | null;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${path} → ${res.status}: ${body.slice(0, 200)}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

export async function listConfigs(year?: number): Promise<ConfigSummary[]> {
  const params = year ? `?year=${year}` : '';
  return apiFetch(`/api/scenario-builder/configs${params}`);
}

export async function getConfig(id: number): Promise<FullConfig> {
  return apiFetch(`/api/scenario-builder/configs/${id}`);
}

export async function createConfig(data: {
  name: string;
  year: number;
  description?: string;
  currency_label?: string;
  global_variables: VariableItem[];
  derived_metrics: DerivedItem[];
  scenarios: ScenarioItem[];
  table_config?: TableConfig;
}): Promise<{ id: number; message: string }> {
  return apiFetch('/api/scenario-builder/configs', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateConfig(
  id: number,
  data: Partial<{
    name: string;
    year: number;
    description: string;
    currency_label: string;
    global_variables: VariableItem[];
    derived_metrics: DerivedItem[];
    scenarios: ScenarioItem[];
    table_config: TableConfig;
  }>
): Promise<{ message: string }> {
  return apiFetch(`/api/scenario-builder/configs/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteConfig(id: number): Promise<{ message: string }> {
  return apiFetch(`/api/scenario-builder/configs/${id}`, { method: 'DELETE' });
}

export async function computeConfig(
  id: number,
  notes?: string
): Promise<{ message: string; snapshot_version: number; results: ComputedResults }> {
  return apiFetch(`/api/scenario-builder/configs/${id}/compute`, {
    method: 'POST',
    body: JSON.stringify({ notes: notes || '' }),
  });
}

export async function listSnapshots(configId: number): Promise<SnapshotSummary[]> {
  return apiFetch(`/api/scenario-builder/configs/${configId}/snapshots`);
}

export async function getSnapshot(
  configId: number,
  snapshotId: number
): Promise<{ id: number; version: number; notes: string; data: unknown; created_at: string | null }> {
  return apiFetch(`/api/scenario-builder/configs/${configId}/snapshots/${snapshotId}`);
}

export async function duplicateConfig(
  id: number,
  newName?: string,
  newYear?: number
): Promise<{ id: number; message: string }> {
  const params = new URLSearchParams();
  if (newName) params.set('new_name', newName);
  if (newYear) params.set('new_year', String(newYear));
  return apiFetch(`/api/scenario-builder/configs/${id}/duplicate?${params}`, { method: 'POST' });
}

export async function validateFormula(
  formula: string,
  availableVariables: string[]
): Promise<{ valid: boolean; error: string | null }> {
  return apiFetch('/api/scenario-builder/validate-formula', {
    method: 'POST',
    body: JSON.stringify({ formula, available_variables: availableVariables }),
  });
}

// ── Excel import for Global & Base Case Variables ─────────────────────────

async function readError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.detail === 'string') return data.detail;
  } catch {
    // not JSON
  }
  return `Request failed (${res.status})`;
}

/** Upload a workbook and get the variables back (nothing is saved server-side). */
export async function parseVariablesExcel(file: File): Promise<ParsedVariablesExcel> {
  const token = getAccessToken();
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/api/scenario-builder/variables/parse-excel`, {
    method: 'POST',
    body: form,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 401) {
    void forceLogout('expired');
    throw new Error('Session expired — please sign in again.');
  }
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

/** Download the .xlsx template with the exact column names. */
export async function downloadVariablesTemplate(): Promise<void> {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE}/api/scenario-builder/variables/template`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 401) {
    void forceLogout('expired');
    throw new Error('Session expired — please sign in again.');
  }
  if (!res.ok) throw new Error(await readError(res));
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'scenario_builder_variables_template.xlsx';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

