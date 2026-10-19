import { getAccessToken } from './auth';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://127.0.0.1:8001';

export interface VariableItem {
  name: string;
  value: number;
  description: string;
}

export interface DerivedItem {
  name: string;
  formula: string;
  description: string;
}

export interface ScenarioOverride {
  name: string;
  value: number;
}

export interface ScenarioDerived {
  name: string;
  formula: string;
}

export interface ScenarioItem {
  id: string;
  name: string;
  type: 'stress' | 'shock' | 'opportunity';
  overrides: ScenarioOverride[];
  derived: ScenarioDerived[];
}

export interface TableConfig {
  display_metrics: string[];
  waterfall_metrics: string[];
  weights: Record<string, number>;
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

export interface Table1Row {
  metric: string;
  baseCase: number;
  scenarios: Record<string, number>;
}

export interface Table2ScenarioDetail {
  absolute: number;
  delta: number;
  weight: number;
  weighted: number;
}

export interface Table2Row {
  metric: string;
  scenarios: Record<string, Table2ScenarioDetail>;
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
  table2: Table2Row[];
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