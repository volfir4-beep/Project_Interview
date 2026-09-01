'use client';

import type { CandidateState } from '@/lib/interview/types';

const LABELS: Record<keyof CandidateState['averages'], string> = {
  knowledge: 'Knowledge',
  reasoning: 'Reasoning',
  relevance: 'Relevance',
  communication: 'Communication',
  vocabulary: 'Vocabulary',
  confidence: 'Delivery',
};

type LiveScoreStripProps = {
  state: CandidateState | null;
};

export function LiveScoreStrip({ state }: LiveScoreStripProps) {
  if (!state || state.turnCount === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Scores appear after your first completed answer.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {Object.entries(state.averages).map(([key, value]) => (
        <span
          key={key}
          className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
        >
          {LABELS[key as keyof typeof LABELS]} {value}
        </span>
      ))}
    </div>
  );
}
