// frontend/lib/fiscalFortress/defaults.ts

import type { GlobalVariables, AllScenarioInputs } from './types';

export const DEFAULT_GLOBALS: GlobalVariables = {
  revenue: 0,
  costOfSales: 0,
  otherIncome: 0,
  opex: 0,
  capex: 0,
  depreciationAmortizationGoodwillImpairment: 0,
  financeCost: 0,
  taxation: 0,
  payout2025: 0,
  payout2026: 0,
  managementFees: 0,
  groupDividendPayoutPortion: 0,
  gbpManagementFeesPct: 0,
  dataRevenue: 0,
  fintechRevenue: 0,
  gbpOpex: 0,
  gbpCos: 0,
  ggOpex: 0,
  ggCos: 0,
  ggCapex: 0,
  ggRevenue: 0,
  gbpCapex: 0,
};

export const DEFAULT_SCENARIO_INPUTS: AllScenarioInputs = {
  x: { shockPct: 0.20, bpPct: 0.50, opex: 0, rate1: 0.55, rate2: 0.30 },
  y: { bpPct: 1.0, shockPct: 0.20, rate3: 0.55, rate4: 0.30 },
  z: { rate1: 0.20, rate2: 0.55, rate3: 0.30 },
  a: { constant1: 15, constant2: 15, constant3: 15, constant4: 5, rate1: 0.30, rate2: 0.70, rate3: 18, rate4: 0.30, rate5: 0.70, rate6: 0.30, rate7: 0.55, rate8: 0.30 },
  b: { rate1: 0.30, rate2: 1.45, rate3: 0.55, rate4: 0.30 },
  c: { transferPricingInterest: 0, transferPricingCapital: 0, rate1: 0.55, rate2: 0.30 },
  d: { bpPct: 1.0, shockPct: 0.50, rate1: 0.55, rate2: 0.30 },
  e: { bpPct: 0.50, shockPct: 0.50, rate1: 0.55, rate2: 0.30 },
  f: { shockPct: 0.50, dataRevenue: 0, rate1: 0.55, rate2: 0.30 },
  g: { constant1: 15, constant2: 22, constant3: 15, constant4: 22, constant5: 15, constant6: 22, constant7: 5, capexPct: 0.30, rate1: 0.55, rate2: 0.30 },
  h: { constant1: 0, rate1: 0.55, rate2: 0.30 },
  i: { transferPricingInterest: 0, rate1: 0.55, rate2: 0.30 },
  j: { rate1: 0.55, rate2: 0.30 },
  k: { rate1: 0.30, stressPct: 1.09, rate2: 0.30, rate3: 0.30, rate4: 0.55, payoutRate2: 0.30 },
  m: { constant1: 15, constant2: 15, constant3: 15, constant4: 11, capexPct: 0.30, rate1: 0.55, rate2: 0.30 },
};