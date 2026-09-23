// frontend/lib/scenarioAutomate/format.ts

/**
 * All user inputs are in millions (e.g. 59.78 = GHS 59.78M).
 * The engine works in millions throughout.
 * This formatter displays values with the "M" suffix.
 */
export function formatCurrency(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs >= 1_000) {
    return `${sign}${(abs / 1_000).toFixed(2)}B`;
  }
  if (abs >= 1) {
    return `${sign}${abs.toFixed(2)}M`;
  }
  if (abs >= 0.001) {
    return `${sign}${(abs * 1_000).toFixed(2)}K`;
  }
  return `${sign}${abs.toFixed(4)}M`;
}

export function formatCurrencyShort(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs >= 1_000) {
    return `${sign}${(abs / 1_000).toFixed(1)}B`;
  }
  if (abs >= 10) {
    return `${sign}${abs.toFixed(1)}M`;
  }
  if (abs >= 1) {
    return `${sign}${abs.toFixed(2)}M`;
  }
  if (abs >= 0.001) {
    return `${sign}${(abs * 1_000).toFixed(1)}K`;
  }
  return `${sign}${abs.toFixed(2)}M`;
}

export function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatAxisTick(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(0)}B`;
  if (abs >= 1) return `${sign}${abs.toFixed(0)}M`;
  if (abs >= 0.01) return `${sign}${abs.toFixed(1)}M`;
  return `${sign}${abs.toFixed(2)}M`;
}