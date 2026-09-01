import { geminiJsonObject } from './gemini-json';
import {
  SCORE_DIMENSIONS,
  type InterviewerPersona,
  type QuestionType,
  type Difficulty,
  type DimensionScore,
  type ScoreDimension,
  type TurnAssessment,
} from './types';

type RawAssessment = {
  knowledge?: Partial<DimensionScore>;
  reasoning?: Partial<DimensionScore>;
  relevance?: Partial<DimensionScore>;
  communication?: Partial<DimensionScore>;
  vocabulary?: Partial<DimensionScore>;
  confidence?: Partial<DimensionScore>;
  fillersOrHedging?: unknown;
  contradictions?: unknown;
  recommendedPersona?: unknown;
  recommendedDifficulty?: unknown;
  recommendedQuestionType?: unknown;
};

const PERSONAS: InterviewerPersona[] = [
  'technical',
  'product',
  'hiring',
  'customer',
  'behavioural',
];

function clampScore(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function dimension(
  raw: Partial<DimensionScore> | undefined,
  transcript: string,
): DimensionScore {
  return {
    score: clampScore(raw?.score),
    evidence: asText(raw?.evidence) || 'No specific evidence in this turn.',
    quote: asText(raw?.quote) || transcript.slice(0, 160),
  };
}

function persona(value: unknown): InterviewerPersona {
  return PERSONAS.includes(value as InterviewerPersona)
    ? (value as InterviewerPersona)
    : 'technical';
}

function difficulty(value: unknown): Difficulty {
  return value === 'easier' || value === 'harder' || value === 'same'
    ? value
    : 'same';
}

function questionType(value: unknown): QuestionType {
  return value === 'scenario' || value === 'role-play' || value === 'follow-up'
    ? value
    : 'follow-up';
}

const ASSESS_SYSTEM = `You are six specialized interview evaluators working in parallel on one candidate turn.
Score only from the transcript quote. Do not invent facts that are not in the text.
Return JSON with keys: knowledge, reasoning, relevance, communication, vocabulary, confidence.
Each of those is { "score": 0-100, "evidence": string, "quote": short transcript excerpt }.
Also return fillersOrHedging: string[], contradictions: string[], recommendedPersona (technical|product|hiring|customer|behavioural), recommendedDifficulty (easier|same|harder), recommendedQuestionType (follow-up|scenario|role-play).
Confidence is inferred from hedging, fillers, truncated answers, and certainty language — there is no audio.`;

export async function assessCandidateTurn(input: {
  turnId: string;
  timestampMs: number;
  transcript: string;
  recentContext: string;
}): Promise<TurnAssessment> {
  const raw = await geminiJsonObject<RawAssessment>(
    ASSESS_SYSTEM,
    `Recent interview context:\n${input.recentContext || '(none)'}\n\nCandidate turn:\n${input.transcript}`,
    800,
  );

  const scores = Object.fromEntries(
    SCORE_DIMENSIONS.map((key) => [key, dimension(raw[key], input.transcript)]),
  ) as Record<ScoreDimension, DimensionScore>;

  return {
    turnId: input.turnId,
    timestampMs: input.timestampMs,
    transcript: input.transcript,
    scores,
    fillersOrHedging: asStringArray(raw.fillersOrHedging),
    contradictions: asStringArray(raw.contradictions),
    recommendedPersona: persona(raw.recommendedPersona),
    recommendedDifficulty: difficulty(raw.recommendedDifficulty),
    recommendedQuestionType: questionType(raw.recommendedQuestionType),
  };
}
