"use client";

import React, { useState } from 'react';
import { Target, ChevronDown, ChevronUp } from 'lucide-react';
import type { SoWhatAnalysis } from '@/lib/api';

/**
 * "So what?" analyst view for one news article / alert.
 *
 *   defaultOpen  – start expanded (news page) or collapsed (alerts page)
 *   When collapsed, the headline row (impact badge) and the one-line
 *   "why it matters to MTN Ghana" stay visible so the card is still useful at a glance.
 *
 * Renders nothing for older articles that have no stored analysis.
 */

const IMPACT_STYLE: Record<string, { label: string; badge: string; border: string; text: string }> = {
  positive: {
    label: 'Positive for MTN Ghana',
    badge: 'text-green-400 border-green-400/30 bg-green-400/10',
    border: 'border-green-400/60',
    text: 'text-green-400',
  },
  negative: {
    label: 'Negative for MTN Ghana',
    badge: 'text-red-400 border-red-400/30 bg-red-400/10',
    border: 'border-red-400/60',
    text: 'text-red-400',
  },
  mixed: {
    label: 'Mixed impact',
    badge: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
    border: 'border-yellow-400/60',
    text: 'text-yellow-400',
  },
  neutral: {
    label: 'Neutral / indirect',
    badge: 'text-slate-300 border-slate-400/30 bg-slate-400/10',
    border: 'border-slate-400/50',
    text: 'text-slate-300',
  },
};

function Block({
  label,
  borderClass,
  textClass,
  children,
}: {
  label: string;
  borderClass: string;
  textClass: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`border-l-2 pl-3 ${borderClass}`}>
      <p className={`text-[10px] font-mono font-bold uppercase tracking-wider mb-0.5 ${textClass}`}>{label}</p>
      <div className="text-xs font-sans text-on-surface leading-relaxed">{children}</div>
    </div>
  );
}

export function SoWhatPanel({
  analysis,
  defaultOpen = true,
}: {
  analysis: SoWhatAnalysis | null | undefined;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (!analysis) return null;

  const impact = (IMPACT_STYLE[analysis.impact] ?? IMPACT_STYLE['neutral'])!;
  const actions = Array.isArray(analysis.recommended_actions) ? analysis.recommended_actions : [];
  const isLlm = (analysis.generated_by ?? '').startsWith('llm');

  return (
    <div
      className="rounded-lg border space-y-3 p-3.5"
      style={{ borderColor: 'rgba(52,211,153,0.25)', background: 'rgba(52,211,153,0.04)' }}
    >
      {/* Header (always visible) */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 text-left"
        aria-expanded={open}
      >
        <Target className="w-4 h-4 text-emerald-400 shrink-0" />
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
          Implications
        </span>
        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-mono font-bold ${impact.badge}`}>
          {impact.label}
        </span>
        <span className="ml-auto shrink-0 text-on-surface-variant">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {/* One-line takeaway while collapsed */}
      {!open && analysis.why_it_matters_to_mtn && (
        <p className="text-xs font-sans text-on-surface-variant leading-relaxed">{analysis.why_it_matters_to_mtn}</p>
      )}

      {open && (
        <div className="space-y-3">
          <Block label="Why this matters to MTN Ghana" borderClass="border-blue-400/60" textClass="text-blue-400">
            {analysis.why_it_matters_to_mtn}
          </Block>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Block label="What is happening" borderClass="border-slate-400/50" textClass="text-slate-300">
              {analysis.what_happening}
            </Block>
            <Block label="Why it is happening" borderClass="border-slate-400/50" textClass="text-slate-300">
              {analysis.why_happening}
            </Block>
            <Block label="Good or bad?" borderClass={impact.border} textClass={impact.text}>
              {analysis.impact_reason}
            </Block>
            <Block label="What is likely next" borderClass="border-orange-400/60" textClass="text-orange-400">
              {analysis.outlook}
            </Block>
          </div>

          <Block label="What we should do" borderClass="border-mtn-yellow/60" textClass="text-mtn-yellow">
            <ul className="list-disc pl-4 space-y-0.5">
              {actions.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </Block>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Block label="If we act" borderClass="border-green-400/60" textClass="text-green-400">
              {analysis.if_we_act}
            </Block>
            <Block label="If we do not" borderClass="border-red-400/60" textClass="text-red-400">
              {analysis.if_we_dont}
            </Block>
          </div>

          <p className="text-[10px] font-mono text-on-surface-variant/70">
            {isLlm
              ? 'AI-assisted analysis. Verify before acting.'
              : 'Automated rule-based view (AI model was unavailable). Verify before acting.'}
            {analysis.confidence ? ` Confidence: ${analysis.confidence}.` : ''}
          </p>
        </div>
      )}
    </div>
  );
}
