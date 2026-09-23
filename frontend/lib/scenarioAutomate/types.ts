// frontend/lib/scenarioAutomate/types.ts

export interface GlobalVariables {
  revenue: number;
  costOfSales: number;
  otherIncome: number;
  opex: number;
  capex: number;
  depreciationAmortizationGoodwillImpairment: number;
  financeCost: number;
  taxation: number;
  payout2025: number;
  payout2026: number;
  managementFees: number;
  groupDividendPayoutPortion: number;
  gbpManagementFeesPct: number;
  dataRevenue: number;
  fintechRevenue: number;
  gbpOpex: number;
  gbpCos: number;
  ggOpex: number;
  ggCos: number;
  ggCapex: number;
  ggRevenue: number;
  gbpCapex: number;
}

export interface DerivedVariables {
  contributionMargin: number;
  ebitda: number;
  ebit: number;
  pbt: number;
  pat: number;
  afcf: number;
  upstream: number;
  proportionCosToRevenue: number;
  managementFeesPct: number;
}

export interface MatrixRow {
  revenue: number;
  opex: number;
  ebitda: number;
  pat: number;
  afcf: number;
  capex: number;
  upstream: number;
}

export interface ScenarioXInputs {
  shockPct: number;
  bpPct: number;
  opex: number;
  rate1: number;
  rate2: number;
}

export interface ScenarioYInputs {
  bpPct: number;
  shockPct: number;
  rate3: number;
  rate4: number;
}

export interface ScenarioZInputs {
  rate1: number;
  rate2: number;
  rate3: number;
}

export interface ScenarioAInputs {
  constant1: number;
  constant2: number;
  constant3: number;
  constant4: number;
  rate1: number;
  rate2: number;
  rate3: number;
  rate4: number;
  rate5: number;
  rate6: number;
  rate7: number;
  rate8: number;
}

export interface ScenarioBInputs {
  rate1: number;
  rate2: number;
  rate3: number;
  rate4: number;
}

export interface ScenarioCInputs {
  transferPricingInterest: number;
  transferPricingCapital: number;
  rate1: number;
  rate2: number;
}

export interface ScenarioDInputs {
  bpPct: number;
  shockPct: number;
  rate1: number;
  rate2: number;
}

export interface ScenarioEInputs {
  bpPct: number;
  shockPct: number;
  rate1: number;
  rate2: number;
}

export interface ScenarioFInputs {
  shockPct: number;
  dataRevenue: number;
  rate1: number;
  rate2: number;
}

export interface ScenarioGInputs {
  constant1: number;
  constant2: number;
  constant3: number;
  constant4: number;
  constant5: number;
  constant6: number;
  constant7: number;
  capexPct: number;
  rate1: number;
  rate2: number;
}

export interface ScenarioHInputs {
  constant1: number;
  rate1: number;
  rate2: number;
}

export interface ScenarioIInputs {
  transferPricingInterest: number;
  rate1: number;
  rate2: number;
}

export interface ScenarioJInputs {
  rate1: number;
  rate2: number;
}

export interface ScenarioKInputs {
  rate1: number;
  stressPct: number;
  rate2: number;
  rate3: number;
  rate4: number;
  payoutRate2: number;
}

export interface ScenarioMInputs {
  constant1: number;
  constant2: number;
  constant3: number;
  constant4: number;
  capexPct: number;
  rate1: number;
  rate2: number;
}

export interface AllScenarioInputs {
  x: ScenarioXInputs;
  y: ScenarioYInputs;
  z: ScenarioZInputs;
  a: ScenarioAInputs;
  b: ScenarioBInputs;
  c: ScenarioCInputs;
  d: ScenarioDInputs;
  e: ScenarioEInputs;
  f: ScenarioFInputs;
  g: ScenarioGInputs;
  h: ScenarioHInputs;
  i: ScenarioIInputs;
  j: ScenarioJInputs;
  k: ScenarioKInputs;
  m: ScenarioMInputs;
}

export interface Table1Data {
  baseCase: MatrixRow;
  x: MatrixRow;
  y: MatrixRow;
  z: MatrixRow;
  a: MatrixRow;
  b: MatrixRow;
  c: MatrixRow;
  d: MatrixRow;
  e: MatrixRow;
  f: MatrixRow;
  g: MatrixRow;
  h: MatrixRow;
  i: MatrixRow;
  j: MatrixRow;
  k: MatrixRow;
  m: MatrixRow;
}

export type Table2Data = Omit<Table1Data, 'baseCase'>;

export interface WaterfallRow {
  label: string;
  value: number;
  type: 'base' | 'impact' | 'subtotal';
}

// ── This is the interface that was missing / mismatched: ──
export interface ScenarioAutomateOutput {
  table1: Table1Data;
  table2: Table2Data;
  table3: WaterfallRow[];
  table4: WaterfallRow[];
  table5: WaterfallRow[];
  table6: WaterfallRow[];
  derived: DerivedVariables;
}

export type ScenarioCategory = 'stress' | 'shock' | 'opportunity';

export interface ScenarioMeta {
  id: string;
  label: string;
  shortLabel: string;
  category: ScenarioCategory;
  weight: number;
  description: string;
}

export const SCENARIO_META: Record<string, ScenarioMeta> = {
  x: { id: 'x', label: '20% of Must Win Initiatives Fail', shortLabel: '20% MWI Fail', category: 'stress', weight: 0.7, description: 'Impact if 20% of critical strategic initiatives fail to deliver expected results.' },
  y: { id: 'y', label: '20% Customer Churn Impacting Data Revenue', shortLabel: '20% Data Churn', category: 'stress', weight: 0.7, description: 'Impact if 20% of data customers leave, reducing data revenue.' },
  z: { id: 'z', label: 'Additional 20% OPEX', shortLabel: '+20% OPEX', category: 'stress', weight: 0.7, description: 'Impact of an unexpected 20% increase in operating expenditure.' },
  a: { id: 'a', label: 'Local Currency Depreciation Above BP at 18:1', shortLabel: 'FX 18:1', category: 'stress', weight: 0.7, description: 'Currency depreciates to 18:1 against reference currency.' },
  b: { id: 'b', label: 'Average Inflation Above BP Target at 45%', shortLabel: 'Inflation 45%', category: 'stress', weight: 0.7, description: 'Inflation runs at 45%, increasing inflation-sensitive costs.' },
  c: { id: 'c', label: 'Transfer Pricing Base Case', shortLabel: 'TP Base', category: 'stress', weight: 0.7, description: 'Transfer pricing adjustments — best-case interpretation.' },
  d: { id: 'd', label: '50% Customer Churn Impacting Data Revenue', shortLabel: '50% Data Churn', category: 'shock', weight: 0.3, description: 'Severe 50% data customer churn scenario.' },
  e: { id: 'e', label: '50% of Must Win Initiatives Fail', shortLabel: '50% MWI Fail', category: 'shock', weight: 0.3, description: 'Half of all critical strategic initiatives fail.' },
  f: { id: 'f', label: 'Regulatory Concern on MML Dominance', shortLabel: 'MML Regulatory', category: 'shock', weight: 0.3, description: 'Regulatory action impacting Mobile Money and data revenue.' },
  g: { id: 'g', label: 'Local Currency Depreciation Above BP at 22:1', shortLabel: 'FX 22:1', category: 'shock', weight: 0.3, description: 'Severe currency depreciation to 22:1.' },
  h: { id: 'h', label: 'ATC Exit Mitigation', shortLabel: 'ATC Exit', category: 'shock', weight: 0.3, description: 'Additional depreciation from ATC tower lease exit.' },
  i: { id: 'i', label: 'Transfer Pricing Worse Case', shortLabel: 'TP Worst', category: 'shock', weight: 0.3, description: 'Worst-case transfer pricing scenario.' },
  j: { id: 'j', label: 'One-Time Unbudgeted Penalties and Fines', shortLabel: 'Penalties', category: 'shock', weight: 0.3, description: 'Unexpected regulatory penalties or fines.' },
  k: { id: 'k', label: 'Average Inflation Below BP Target at 9%', shortLabel: 'Inflation 9%', category: 'opportunity', weight: 1.0, description: 'Lower inflation at 9% reduces costs.' },
  m: { id: 'm', label: 'Local Currency Appreciation Below BP at 11:1', shortLabel: 'FX 11:1', category: 'opportunity', weight: 1.0, description: 'Currency strengthens to 11:1, reducing foreign costs.' },
};

export const MATRIX_ROWS: { key: keyof MatrixRow; label: string; format: 'currency' | 'number' }[] = [
  { key: 'revenue', label: 'Revenue', format: 'currency' },
  { key: 'opex', label: 'Operating Expenditure', format: 'currency' },
  { key: 'ebitda', label: 'EBITDA', format: 'currency' },
  { key: 'pat', label: 'PAT', format: 'currency' },
  { key: 'afcf', label: 'AFCF', format: 'currency' },
  { key: 'capex', label: 'CAPEX', format: 'currency' },
  { key: 'upstream', label: 'Upstream', format: 'currency' },
];