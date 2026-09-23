// frontend/lib/scenarioAutomate/engine.ts

import type {
  GlobalVariables,
  DerivedVariables,
  MatrixRow,
  AllScenarioInputs,
  Table1Data,
  Table2Data,
  WaterfallRow,
  ScenarioAutomateOutput,
} from './types';

// ── Derived variables ────────────────────────────────────────────────────────

export function computeDerived(g: GlobalVariables): DerivedVariables {
  const contributionMargin = g.revenue - g.costOfSales;
  const ebitda = (contributionMargin + g.otherIncome) - g.opex;
  const ebit = ebitda - g.depreciationAmortizationGoodwillImpairment;
  const pbt = ebit - g.financeCost;
  const pat = pbt - g.taxation;
  const afcf = ebitda - g.capex;
  const upstream = g.groupDividendPayoutPortion + g.managementFees;
  const proportionCosToRevenue = g.revenue !== 0 ? g.costOfSales / g.revenue : 0;
  const managementFeesPct = g.revenue !== 0 ? g.managementFees / g.revenue : 0;

  return { contributionMargin, ebitda, ebit, pbt, pat, afcf, upstream, proportionCosToRevenue, managementFeesPct };
}

// ── Base Case ────────────────────────────────────────────────────────────────

export function computeBaseCase(g: GlobalVariables, d: DerivedVariables): MatrixRow {
  return {
    revenue: g.revenue,
    opex: g.opex,
    ebitda: d.ebitda,
    pat: d.pat,
    afcf: d.afcf,
    capex: g.capex,
    upstream: d.upstream,
  };
}

// ── Scenario Calculations ───────────────────────────────────────────────────

function computeX(g: GlobalVariables, d: DerivedVariables, s: AllScenarioInputs['x']): MatrixRow {
  const xRevenue = g.revenue * (1 - (s.shockPct * s.bpPct));
  const xCos = xRevenue * d.proportionCosToRevenue;
  const xContrib = xRevenue - xCos;
  const xEbitda = (xContrib + g.otherIncome) - s.opex;
  const xEbit = xEbitda - g.depreciationAmortizationGoodwillImpairment;
  const xPbt = xEbit - g.financeCost;
  const xPat = xPbt - g.taxation;
  const xMgmtFees = xRevenue * d.managementFeesPct;
  const xPayout2026 = s.rate2 * xPat;
  const xTotalDiv = g.payout2025 + xPayout2026;
  const xGroupDiv = xTotalDiv * s.rate1;
  const xUpstream = xGroupDiv + xMgmtFees;

  return { revenue: xRevenue, opex: s.opex, ebitda: xEbitda, pat: xPat, afcf: d.afcf, capex: g.capex, upstream: xUpstream };
}

function computeY(g: GlobalVariables, d: DerivedVariables, s: AllScenarioInputs['y']): MatrixRow {
  const yDataRev = (g.dataRevenue * s.bpPct) * s.shockPct;
  const yRevenue = g.revenue - yDataRev;
  const yCos = yRevenue * d.proportionCosToRevenue;
  const yContrib = yRevenue - yCos;
  const yEbitda = (yContrib + g.otherIncome) - g.opex;
  const yEbit = yEbitda - g.depreciationAmortizationGoodwillImpairment;
  const yPbt = yEbit - g.financeCost;
  const yPat = yPbt - g.taxation;
  const yMgmtFees = d.managementFeesPct * yRevenue;
  const yPayout2026 = s.rate4 * yPat;
  const yTotalDiv = g.payout2025 + yPayout2026;
  const yGroupDiv = yTotalDiv * s.rate3;
  const yUpstream = yGroupDiv + yMgmtFees;

  return { revenue: yRevenue, opex: g.opex, ebitda: yEbitda, pat: yPat, afcf: d.afcf, capex: g.capex, upstream: yUpstream };
}

function computeZ(g: GlobalVariables, d: DerivedVariables, s: AllScenarioInputs['z']): MatrixRow {
  const zOpex = g.opex * (1 + s.rate1);
  const zContrib = g.revenue - g.costOfSales;
  const zEbitda = (zContrib + g.otherIncome) - zOpex;
  const zEbit = zEbitda - g.depreciationAmortizationGoodwillImpairment;
  const zPbt = zEbit - g.financeCost;
  const zPat = zPbt - g.taxation;
  const zMgmtFees = d.managementFeesPct * g.revenue;
  const zPayout2026 = s.rate3 * zPat;
  const zTotalDiv = g.payout2025 + zPayout2026;
  const zGroupDiv = zTotalDiv * s.rate2;
  const zUpstream = zGroupDiv + zMgmtFees;

  return { revenue: g.revenue, opex: zOpex, ebitda: zEbitda, pat: zPat, afcf: d.afcf, capex: g.capex, upstream: zUpstream };
}

function computeA(g: GlobalVariables, d: DerivedVariables, s: AllScenarioInputs['a']): MatrixRow {
  const ggOpex = g.opex * s.rate1;
  const gbpOpex = g.opex - ggOpex;
  const aOpex = ((ggOpex / s.constant1) * 18) + gbpOpex;

  const ggCos = g.costOfSales * s.rate4;
  const gbpCos = g.costOfSales - (g.costOfSales * s.rate5);
  const aCos = ((ggCos / s.constant2) * s.rate3) + gbpCos;

  const aContrib = g.revenue - aCos;
  const aEbitda = (aContrib + g.otherIncome) - aOpex;

  const ggCapex = g.capex * s.rate6;
  const gbpCapex = g.capex - ggCapex;
  const aCapex = ((ggCapex / s.constant3) * s.rate6) + gbpCapex;

  const aDepn = s.constant4 !== 0 ? (aCapex - g.capex) / s.constant4 : 0;
  const aDna = g.depreciationAmortizationGoodwillImpairment + aDepn;
  const aEbit = aEbitda - aDna;
  const aPbt = aEbit - g.financeCost;
  const aPat = aPbt - g.taxation;

  const aMgmtFees = g.revenue * g.gbpManagementFeesPct;
  const aPayout2026 = aPat * s.rate8;
  const aTotalDiv = g.payout2025 + aPayout2026;
  const aGroupDiv = aTotalDiv * s.rate7;
  const aUpstream = aGroupDiv + aMgmtFees;

  return { revenue: g.revenue, opex: aOpex, ebitda: aEbitda, pat: aPat, afcf: d.afcf, capex: aCapex, upstream: aUpstream };
}

function computeB(g: GlobalVariables, d: DerivedVariables, s: AllScenarioInputs['b']): MatrixRow {
  const bOpexPct = 1 - s.rate1;
  const bOpex = ((g.opex * bOpexPct) * s.rate2) + (g.opex - (g.opex * bOpexPct));

  const bCosPct = 1 - s.rate1;
  const bCos = (((g.revenue * d.proportionCosToRevenue) * bCosPct) * s.rate2) + (g.costOfSales - g.gbpCos);

  const bContrib = g.revenue - bCos;
  const bEbitda = (bContrib + g.otherIncome) - bOpex;
  const bEbit = bEbitda - g.depreciationAmortizationGoodwillImpairment;
  const bPbt = bEbit - g.financeCost;
  const bPat = bPbt - g.taxation;

  const bCapexPct = 1 - s.rate1;
  const bCapex = ((g.capex * bCapexPct) * s.rate2) + (g.capex - (g.capex * bCapexPct));

  const bMgmtFees = g.revenue * g.gbpManagementFeesPct;
  const bPayout2026 = bPat * s.rate4;
  const bTotalDiv = g.payout2025 + bPayout2026;
  const bGroupDiv = bTotalDiv * s.rate3;
  const bUpstream = bGroupDiv + bMgmtFees;

  return { revenue: g.revenue, opex: bOpex, ebitda: bEbitda, pat: bPat, afcf: d.afcf, capex: bCapex, upstream: bUpstream };
}

function computeC(g: GlobalVariables, d: DerivedVariables, s: AllScenarioInputs['c']): MatrixRow {
  const cOpex = g.opex + s.transferPricingInterest;
  const cContrib = g.revenue - g.costOfSales;
  const cEbitda = (cContrib + g.otherIncome) - cOpex;
  const cEbit = cEbitda - g.depreciationAmortizationGoodwillImpairment;
  const cPbt = cEbit - g.financeCost;
  const cTaxation = g.taxation + s.transferPricingCapital;
  const cPat = cPbt - cTaxation;

  const cMgmtFees = g.revenue * d.managementFeesPct;
  const cPayout2026 = cPat * s.rate2;
  const cTotalDiv = g.payout2025 + cPayout2026;
  const cGroupDiv = cTotalDiv * s.rate1;
  const cUpstream = cGroupDiv + cMgmtFees;

  return { revenue: g.revenue, opex: cOpex, ebitda: cEbitda, pat: cPat, afcf: d.afcf, capex: g.capex, upstream: cUpstream };
}

function computeD(g: GlobalVariables, d: DerivedVariables, s: AllScenarioInputs['d']): MatrixRow {
  const dDataRev = (g.dataRevenue * s.bpPct) * s.shockPct;
  const dRevenue = g.revenue - dDataRev;
  const dCos = dRevenue * d.proportionCosToRevenue;
  const dContrib = dRevenue - dCos;
  const dEbitda = (dContrib + g.otherIncome) - g.opex;
  const dEbit = dEbitda - g.depreciationAmortizationGoodwillImpairment;
  const dPbt = dEbit - g.financeCost;
  const dPat = dPbt - g.taxation;

  const dMgmtFees = dRevenue * d.managementFeesPct;
  const dPayout2026 = dPat * s.rate2;
  const dTotalDiv = g.payout2025 + dPayout2026;
  const dGroupDiv = dTotalDiv * s.rate1;
  const dUpstream = dGroupDiv + dMgmtFees;

  return { revenue: dRevenue, opex: g.opex, ebitda: dEbitda, pat: dPat, afcf: d.afcf, capex: g.capex, upstream: dUpstream };
}

function computeE(g: GlobalVariables, d: DerivedVariables, s: AllScenarioInputs['e']): MatrixRow {
  const eRevRate = 1 - (s.bpPct * s.shockPct);
  const eRevenue = g.revenue * eRevRate;
  const eCos = eRevenue * d.proportionCosToRevenue;
  const eContrib = eRevenue - eCos;
  const eEbitda = (eContrib + g.otherIncome) - g.opex;
  const eEbit = eEbitda - g.depreciationAmortizationGoodwillImpairment;
  const ePbt = eEbit - g.financeCost;
  const ePat = ePbt - g.taxation;

  const eMgmtFees = eRevenue * d.managementFeesPct;
  const ePayout2026 = ePat * s.rate2;
  const eTotalDiv = g.payout2025 + ePayout2026;
  const eGroupDiv = eTotalDiv * s.rate1;
  const eUpstream = eGroupDiv + eMgmtFees;

  return { revenue: eRevenue, opex: g.opex, ebitda: eEbitda, pat: ePat, afcf: d.afcf, capex: g.capex, upstream: eUpstream };
}

function computeF(g: GlobalVariables, d: DerivedVariables, s: AllScenarioInputs['f']): MatrixRow {
  const fMmlRev = g.fintechRevenue * s.shockPct;
  const fRevenue = g.revenue - fMmlRev - s.dataRevenue;
  const fContrib = fRevenue - g.costOfSales;
  const fEbitda = (fContrib + g.otherIncome) - g.opex;
  const fEbit = fEbitda - g.depreciationAmortizationGoodwillImpairment;
  const fPbt = fEbit - g.financeCost;
  const fPat = fPbt - g.taxation;

  const fMgmtFees = fRevenue * d.managementFeesPct;
  const fPayout2026 = fPat * s.rate2;
  const fTotalDiv = g.payout2025 + fPayout2026;
  const fGroupDiv = fTotalDiv * s.rate1;
  const fUpstream = fGroupDiv + fMgmtFees;

  return { revenue: fRevenue, opex: g.opex, ebitda: fEbitda, pat: fPat, afcf: d.afcf, capex: g.capex, upstream: fUpstream };
}

function computeG(g: GlobalVariables, d: DerivedVariables, s: AllScenarioInputs['g']): MatrixRow {
  const gOpex = ((g.ggOpex / s.constant1) * s.constant2) + g.gbpOpex;
  const gCos = ((g.ggCos / s.constant3) * s.constant4) + g.gbpCos;
  const gContrib = g.revenue - gCos;
  const gEbitda = (gContrib + g.otherIncome) - gOpex;

  const ggCapex = g.capex * s.capexPct;
  const gbpCapex = g.capex - ggCapex;
  const gCapex = ((ggCapex / s.constant5) * s.constant6) + gbpCapex;

  const gDepn = s.constant7 !== 0 ? (gCapex - g.capex) / s.constant7 : 0;
  const gDna = g.depreciationAmortizationGoodwillImpairment + gDepn;
  const gEbit = gEbitda - gDna;
  const gPbt = gEbit - g.financeCost;
  const gPat = gPbt - g.taxation;

  const gMgmtFees = g.revenue * g.gbpManagementFeesPct;
  const gPayout2026 = gPat * s.rate2;
  const gTotalDiv = g.payout2025 + gPayout2026;
  const gGroupDiv = gTotalDiv * s.rate1;
  const gUpstream = gGroupDiv + gMgmtFees;

  return { revenue: g.revenue, opex: gOpex, ebitda: gEbitda, pat: gPat, afcf: d.afcf, capex: gCapex, upstream: gUpstream };
}

function computeH(g: GlobalVariables, d: DerivedVariables, s: AllScenarioInputs['h']): MatrixRow {
  const hContrib = g.revenue - g.costOfSales;
  const hEbitda = (hContrib + g.otherIncome) - g.opex;
  const hDna = g.depreciationAmortizationGoodwillImpairment + s.constant1;
  const hEbit = hEbitda - hDna;
  const hPbt = hEbit - g.financeCost;
  const hPat = hPbt - g.taxation;

  const hMgmtFees = g.revenue * d.managementFeesPct;
  const hPayout2026 = hPat * s.rate2;
  const hTotalDiv = g.payout2025 + hPayout2026;
  const hGroupDiv = hTotalDiv * s.rate1;
  const hUpstream = hGroupDiv + hMgmtFees;

  return { revenue: g.revenue, opex: g.opex, ebitda: hEbitda, pat: hPat, afcf: d.afcf, capex: g.capex, upstream: hUpstream };
}

function computeI(g: GlobalVariables, d: DerivedVariables, s: AllScenarioInputs['i']): MatrixRow {
  const iOpex = g.opex + s.transferPricingInterest;
  const iContrib = g.revenue - g.costOfSales;
  const iEbitda = (iContrib + g.otherIncome) - iOpex;
  const iEbit = iEbitda - g.depreciationAmortizationGoodwillImpairment;
  const iPbt = iEbit - g.financeCost;
  const iPat = iPbt - g.taxation;

  const iMgmtFees = g.revenue * d.managementFeesPct;
  const iPayout2026 = iPat * s.rate2;
  const iTotalDiv = g.payout2025 + iPayout2026;
  const iGroupDiv = iTotalDiv * s.rate1;
  const iUpstream = iGroupDiv + iMgmtFees;

  return { revenue: g.revenue, opex: iOpex, ebitda: iEbitda, pat: iPat, afcf: d.afcf, capex: g.capex, upstream: iUpstream };
}

function computeJ(g: GlobalVariables, d: DerivedVariables, s: AllScenarioInputs['j']): MatrixRow {
  const jContrib = g.revenue - g.costOfSales;
  const jEbitda = (jContrib + g.otherIncome) - g.opex;
  const jEbit = jEbitda - g.depreciationAmortizationGoodwillImpairment;
  const jPbt = jEbit - g.financeCost;
  const jPat = jPbt - g.taxation;

  const jMgmtFees = g.revenue * g.gbpManagementFeesPct;
  const jPayout2026 = jPat * s.rate2;
  const jTotalDiv = g.payout2025 + jPayout2026;
  const jGroupDiv = jTotalDiv * s.rate1;
  const jUpstream = jGroupDiv + jMgmtFees;

  return { revenue: g.revenue, opex: g.opex, ebitda: jEbitda, pat: jPat, afcf: d.afcf, capex: g.capex, upstream: jUpstream };
}

function computeK(g: GlobalVariables, d: DerivedVariables, s: AllScenarioInputs['k']): MatrixRow {
  const kOpexPct = 1 - s.rate1;
  const kOpex = ((g.opex * kOpexPct) * s.stressPct) + (g.opex - (g.opex * kOpexPct));

  const kCosPct = 1 - s.rate2;
  const kCos = (((g.revenue * d.proportionCosToRevenue) * kCosPct) * s.stressPct) + (g.costOfSales - g.gbpCos);

  const kContrib = g.revenue - kCos;
  const kEbitda = (kContrib + g.otherIncome) - kOpex;
  const kEbit = kEbitda - g.depreciationAmortizationGoodwillImpairment;
  const kPbt = kEbit - g.financeCost;
  const kPat = kPbt - g.taxation;

  const kCapexPct = 1 - s.rate3;
  const kCapex = ((g.capex * kCapexPct) * s.stressPct) + (g.capex - (g.capex * kCapexPct));

  const kMgmtFees = g.revenue * g.gbpManagementFeesPct;
  const kPayout2026 = kPat * s.payoutRate2;
  const kTotalDiv = g.payout2025 + kPayout2026;
  const kGroupDiv = kTotalDiv * s.rate4;
  const kUpstream = kGroupDiv + kMgmtFees;

  return { revenue: g.revenue, opex: kOpex, ebitda: kEbitda, pat: kPat, afcf: d.afcf, capex: kCapex, upstream: kUpstream };
}

function computeM(g: GlobalVariables, d: DerivedVariables, s: AllScenarioInputs['m']): MatrixRow {
  const mOpex = ((g.ggOpex / s.constant1) * 11) + g.gbpOpex;
  const mCos = ((g.ggCos / s.constant2) * 11) + g.gbpCos;
  const mContrib = g.revenue - mCos;
  const mEbitda = (mContrib + g.otherIncome) - mOpex;

  const ggCapex = g.capex * s.capexPct;
  const gbpCapex = g.capex - ggCapex;
  const mCapex = ((ggCapex / s.constant3) * s.constant4) + gbpCapex;
  const mDepn = s.constant4 !== 0 ? (mCapex - g.capex) / s.constant4 : 0;
  const mDna = g.depreciationAmortizationGoodwillImpairment + mDepn;
  const mEbit = mEbitda - mDna;
  const mPbt = mEbit - g.financeCost;
  const mPat = mPbt - g.taxation;

  const mMgmtFees = g.revenue * g.gbpManagementFeesPct;
  const mPayout2026 = mPat * s.rate2;
  const mTotalDiv = g.payout2025 + mPayout2026;
  const mGroupDiv = mTotalDiv * s.rate1;
  const mUpstream = mGroupDiv + mMgmtFees;

  return { revenue: g.revenue, opex: mOpex, ebitda: mEbitda, pat: mPat, afcf: d.afcf, capex: mCapex, upstream: mUpstream };
}

// ── Tables ───────────────────────────────────────────────────────────────────

function buildTable1(g: GlobalVariables, d: DerivedVariables, s: AllScenarioInputs): Table1Data {
  return {
    baseCase: computeBaseCase(g, d),
    x: computeX(g, d, s.x),
    y: computeY(g, d, s.y),
    z: computeZ(g, d, s.z),
    a: computeA(g, d, s.a),
    b: computeB(g, d, s.b),
    c: computeC(g, d, s.c),
    d: computeD(g, d, s.d),
    e: computeE(g, d, s.e),
    f: computeF(g, d, s.f),
    g: computeG(g, d, s.g),
    h: computeH(g, d, s.h),
    i: computeI(g, d, s.i),
    j: computeJ(g, d, s.j),
    k: computeK(g, d, s.k),
    m: computeM(g, d, s.m),
  };
}

function weightedImpact(base: MatrixRow, scenario: MatrixRow, weight: number): MatrixRow {
  const keys: (keyof MatrixRow)[] = ['revenue', 'opex', 'ebitda', 'pat', 'afcf', 'capex', 'upstream'];
  const result: Partial<MatrixRow> = {};
  for (const k of keys) {
    result[k] = -(base[k] - scenario[k]) * weight;
  }
  return result as MatrixRow;
}

function buildTable2(t1: Table1Data): Table2Data {
  const b = t1.baseCase;
  return {
    x: weightedImpact(b, t1.x, 0.7),
    y: weightedImpact(b, t1.y, 0.7),
    z: weightedImpact(b, t1.z, 0.7),
    a: weightedImpact(b, t1.a, 0.7),
    b: weightedImpact(b, t1.b, 0.7),
    c: weightedImpact(b, t1.c, 0.7),
    d: weightedImpact(b, t1.d, 0.3),
    e: weightedImpact(b, t1.e, 0.3),
    f: weightedImpact(b, t1.f, 0.3),
    g: weightedImpact(b, t1.g, 0.3),
    h: weightedImpact(b, t1.h, 0.3),
    i: weightedImpact(b, t1.i, 0.3),
    j: weightedImpact(b, t1.j, 0.3),
    k: weightedImpact(b, t1.k, 1.0),
    m: weightedImpact(b, t1.m, 1.0),
  };
}

function buildTable3(t1: Table1Data, t2: Table2Data): WaterfallRow[] {
  const row1 = t1.baseCase.revenue;
  const row2 = t2.x.revenue;
  const row3 = t2.y.revenue;
  const row4 = row1 + row2 + row3;
  const row5 = t2.a.ebitda;
  const row6 = t2.b.ebitda;
  const row7 = t2.z.ebitda;
  const row8 = row4 + row5 + row6 + row7;
  const row9 = t2.c.pat;
  const row10 = row8 + row9;

  return [
    { label: 'Revenue (Base Case)', value: row1, type: 'base' },
    { label: '20% Must Win Initiatives Fail', value: row2, type: 'impact' },
    { label: '20% Customer Churn (Data Revenue)', value: row3, type: 'impact' },
    { label: 'Adjusted Revenue', value: row4, type: 'subtotal' },
    { label: 'FX Depreciation at 18:1', value: row5, type: 'impact' },
    { label: 'Inflation at 45%', value: row6, type: 'impact' },
    { label: 'Additional 20% OPEX', value: row7, type: 'impact' },
    { label: 'Adjusted EBITDA', value: row8, type: 'subtotal' },
    { label: 'Transfer Pricing Base Case', value: row9, type: 'impact' },
    { label: 'Adjusted PAT', value: row10, type: 'subtotal' },
  ];
}

function buildTable4(t1: Table1Data, t2: Table2Data): WaterfallRow[] {
  const row1 = t1.baseCase.revenue;
  const row2 = t2.d.revenue;
  const row3 = t2.e.revenue;
  const row4 = t2.f.revenue;
  const row5 = row2 + row3 + row4;
  const row6 = t2.g.ebitda;
  const row7 = t2.j.ebitda;
  const row8 = row5 + row7;
  const row9 = t2.h.pat;
  const row10 = t2.i.pat;
  const row11 = row8 + row9 + row10;

  return [
    { label: 'Revenue (Base Case)', value: row1, type: 'base' },
    { label: '50% Customer Churn (Data Revenue)', value: row2, type: 'impact' },
    { label: '50% Must Win Initiatives Fail', value: row3, type: 'impact' },
    { label: 'Regulatory Concern (MML Dominance)', value: row4, type: 'impact' },
    { label: 'Adjusted Revenue', value: row5, type: 'subtotal' },
    { label: 'FX Depreciation at 22:1', value: row6, type: 'impact' },
    { label: 'One-Time Penalties and Fines', value: row7, type: 'impact' },
    { label: 'Adjusted EBITDA', value: row8, type: 'subtotal' },
    { label: 'ATC Exit Mitigation', value: row9, type: 'impact' },
    { label: 'Transfer Pricing Worse Case', value: row10, type: 'impact' },
    { label: 'Adjusted PAT', value: row11, type: 'subtotal' },
  ];
}

function buildTable5(t1: Table1Data, t2: Table2Data): WaterfallRow[] {
  const row1 = t1.baseCase.revenue;
  const row2 = row1;
  const row3 = t2.m.ebitda;
  const row4 = t2.k.ebitda;
  const row5 = row2 + row3 + row4;
  const row6 = t2.m.pat;
  const row7 = t2.k.pat;
  const row8 = t1.baseCase.pat + row6 + row7;

  return [
    { label: 'Revenue (Base Case)', value: row1, type: 'base' },
    { label: 'Adjusted Revenue', value: row2, type: 'subtotal' },
    { label: 'FX Appreciation at 11:1', value: row3, type: 'impact' },
    { label: 'Inflation Below BP at 9%', value: row4, type: 'impact' },
    { label: 'Adjusted EBITDA', value: row5, type: 'subtotal' },
    { label: 'FX Appreciation at 11:1 (PAT)', value: row6, type: 'impact' },
    { label: 'Inflation Below BP at 9% (PAT)', value: row7, type: 'impact' },
    { label: 'Adjusted PAT', value: row8, type: 'subtotal' },
  ];
}

function buildTable6(t1: Table1Data, t2: Table2Data): WaterfallRow[] {
  const row1 = t1.baseCase.revenue;
  const row2 = t2.x.revenue;
  const row3 = t2.y.revenue;
  const row4 = row1 + row2 + row3;
  const row5 = t2.m.ebitda;
  const row6 = t2.k.ebitda;
  const row7 = t2.z.ebitda;
  const row8 = row4 + row5 + row6 + row7;
  const row9 = t2.c.pat;
  const row10 = row8 + row9;

  return [
    { label: 'Revenue (Base Case)', value: row1, type: 'base' },
    { label: '20% Must Win Initiatives Fail', value: row2, type: 'impact' },
    { label: '20% Customer Churn (Data Revenue)', value: row3, type: 'impact' },
    { label: 'Adjusted Revenue', value: row4, type: 'subtotal' },
    { label: 'FX Appreciation at 11:1', value: row5, type: 'impact' },
    { label: 'Inflation Below BP at 9%', value: row6, type: 'impact' },
    { label: 'Additional 20% OPEX', value: row7, type: 'impact' },
    { label: 'Adjusted EBITDA', value: row8, type: 'subtotal' },
    { label: 'Transfer Pricing Base Case', value: row9, type: 'impact' },
    { label: 'Adjusted PAT', value: row10, type: 'subtotal' },
  ];
}

export function computeAll(globals: GlobalVariables, scenarios: AllScenarioInputs): ScenarioAutomateOutput {
  const derived = computeDerived(globals);
  const table1 = buildTable1(globals, derived, scenarios);
  const table2 = buildTable2(table1);
  const table3 = buildTable3(table1, table2);
  const table4 = buildTable4(table1, table2);
  const table5 = buildTable5(table1, table2);
  const table6 = buildTable6(table1, table2);

  return { table1, table2, table3, table4, table5, table6, derived };
}