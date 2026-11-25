import { fetchNews, fetchAlerts, type SoWhatAnalysis } from './api';

/**
 * Short "so what" line for the office TV slides.
 *
 * The slideshow endpoint doesn't carry the analyst view, so the lines are built here
 * from the stored analysis returned by /api/news and /api/alerts and are matched to
 * slide items by id:   news items  → "news:<articleId>"   alerts → "alert:<alertId>"
 *
 * The line is the first recommended ACTION (the "and so what" management asked for);
 * if there is no action it falls back to why the item matters to MTN Ghana.
 */

export interface SoWhatLine {
  text: string;
  impact: 'positive' | 'negative' | 'neutral' | 'mixed';
}

const MAX_CHARS = 150;

function clip(text: string, limit: number): string {
  const s = text.replace(/\s+/g, ' ').trim();
  if (s.length <= limit) return s;
  const cut = s.slice(0, limit).replace(/\s+\S*$/, '');
  return `${cut.replace(/[\s,;:.-]+$/, '')}…`;
}

export function buildSoWhatLine(analysis: SoWhatAnalysis | null | undefined): SoWhatLine | null {
  if (!analysis) return null;

  const action = (analysis.recommended_actions ?? []).find(a => typeof a === 'string' && a.trim().length > 0);
  const source = action ?? analysis.why_it_matters_to_mtn;
  if (!source || !source.trim()) return null;

  const impact = (['positive', 'negative', 'neutral', 'mixed'] as const).includes(analysis.impact)
    ? analysis.impact
    : 'neutral';

  return { text: clip(source, MAX_CHARS), impact };
}

/** Fetch recent news + alerts once and index their "so what" lines by slide-item id. */
export async function fetchSoWhatLines(): Promise<Record<string, SoWhatLine>> {
  const lines: Record<string, SoWhatLine> = {};

  const [news, alerts] = await Promise.all([
    fetchNews({ limit: 300 }).catch(() => []),
    fetchAlerts({ limit: 300 }).catch(() => []),
  ]);

  news.forEach(n => {
    const line = buildSoWhatLine(n.analysis);
    if (line) lines[`news:${n.id}`] = line;
  });
  alerts.forEach(a => {
    const line = buildSoWhatLine(a.analysis);
    if (line) lines[`alert:${a.id}`] = line;
  });

  return lines;
}