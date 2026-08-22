import { useState } from 'react';
import type { AIInsight } from '@/types';
import { SparkMark } from './Brand';
import { domainLabel } from '@/services/nlp';

interface Props {
  insight: AIInsight;
}

const BLOCKS: { key: keyof AIInsight; title: string; icon: string }[] = [
  { key: 'peopleToTalkTo', title: 'People you should talk to', icon: '👥' },
  { key: 'opportunities', title: 'Opportunities for you', icon: '🎯' },
  { key: 'competitorsToStudy', title: 'Startups to study', icon: '🔬' },
  { key: 'nextSteps', title: 'Your next steps', icon: '🧭' },
];

export function AIInsightPanel({ insight }: Props) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="mx-4 mt-4 overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-b from-primary/[0.09] to-transparent">
      <button
        className="flex w-full items-center gap-3 px-4 pt-4 text-left"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15">
          <SparkMark size={21} />
        </div>
        <div className="flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wide text-primary">
            AI Intelligence
          </p>
          <p className="text-sm font-bold text-ink">Your read on this idea</p>
        </div>
        <ConfidencePill value={insight.confidence} />
        <Chevron open={expanded} />
      </button>

      <p className="px-4 pb-1 pt-2.5 text-[13px] leading-relaxed text-ink-muted">
        {insight.summary}
      </p>

      {insight.domains.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pt-2.5">
          {insight.domains.map((d) => (
            <span key={d} className="chip chip-active">
              {domainLabel(d)}
            </span>
          ))}
        </div>
      )}

      {expanded && (
        <div className="space-y-4 p-4">
          {BLOCKS.map((block) => {
            const items = insight[block.key] as string[];
            if (!items || items.length === 0) return null;
            return (
              <div key={block.key}>
                <p className="mb-2 flex items-center gap-2 text-[13px] font-bold text-ink">
                  <span>{block.icon}</span>
                  {block.title}
                </p>
                <ul className="space-y-1.5">
                  {items.map((it, i) => (
                    <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-ink-muted">
                      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ConfidencePill({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <span className="rounded-full bg-primary/12 px-2.5 py-1 text-[10px] font-bold text-primary">
      {pct}% match
    </span>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      className={`text-ink-faint transition-transform ${open ? '' : '-rotate-90'}`}
    >
      <path
        d="m6 9 6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
