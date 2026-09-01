import {
  SCORE_DIMENSIONS,
  type CandidateState,
  type Difficulty,
  type DifficultyLevel,
  type ScoreDimension,
  type TurnAssessment,
} from './types';

const PERSONA_LABEL: Record<CandidateState['director']['nextPersona'], string> = {
  technical: 'Technical Interviewer',
  product: 'Product Manager',
  hiring: 'Hiring Manager',
  customer: 'Customer / Stakeholder',
  behavioural: 'Behavioural Interviewer',
};

function emptyAverages(): Record<ScoreDimension, number> {
  return {
    knowledge: 50,
    reasoning: 50,
    relevance: 50,
    communication: 50,
    vocabulary: 50,
    confidence: 50,
  };
}

function mean(values: number[]): number {
  if (values.length === 0) return 50;
  return values.reduce((sum, n) => sum + n, 0) / values.length;
}

function trend(values: number[]): 'up' | 'down' | 'flat' {
  if (values.length < 2) return 'flat';
  const recent = mean(values.slice(-2));
  const earlier = mean(values.slice(0, -2).length ? values.slice(0, -2) : values.slice(0, 1));
  const delta = recent - earlier;
  if (delta >= 6) return 'up';
  if (delta <= -6) return 'down';
  return 'flat';
}

function applyDifficultyShift(
  current: DifficultyLevel,
  shift: Difficulty,
): DifficultyLevel {
  const order: DifficultyLevel[] = ['easy', 'medium', 'hard'];
  const index = order.indexOf(current);
  if (shift === 'harder') return order[Math.min(order.length - 1, index + 1)];
  if (shift === 'easier') return order[Math.max(0, index - 1)];
  return current;
}

export function createCandidateState(
  agentId: string,
  options?: {
    attemptId?: string;
    ownerUserId?: string;
    ownerName?: string;
    targetQuestionCount?: number;
  },
): CandidateState {
  const now = Date.now();
  return {
    agentId,
    attemptId: options?.attemptId,
    ownerUserId: options?.ownerUserId,
    ownerName: options?.ownerName,
    createdAt: now,
    updatedAt: now,
    status: 'active',
    turnCount: 0,
    targetQuestionCount: options?.targetQuestionCount ?? 6,
    currentDifficulty: 'easy',
    averages: emptyAverages(),
    strengths: [],
    weaknesses: [],
    uncertainty: 80,
    trends: Object.fromEntries(SCORE_DIMENSIONS.map((key) => [key, 'flat'])) as CandidateState['trends'],
    evidenceLog: [],
    redFlags: [],
    assessments: [],
    director: {
      nextPersona: 'technical',
      difficulty: 'same',
      questionType: 'follow-up',
      brief:
        'Start as Technical Interviewer at easy difficulty. Ask one concrete opening question.',
    },
  };
}

export function fuseAssessment(
  previous: CandidateState,
  assessment: TurnAssessment,
): CandidateState {
  const assessments = [
    ...previous.assessments.filter((item) => item.turnId !== assessment.turnId),
    assessment,
  ];

  const averages = emptyAverages();
  for (const dimension of SCORE_DIMENSIONS) {
    averages[dimension] = Math.round(
      mean(assessments.map((item) => item.scores[dimension].score)),
    );
  }

  const series = (dimension: ScoreDimension) =>
    assessments.map((item) => item.scores[dimension].score);

  const strengths = SCORE_DIMENSIONS.filter((dimension) => averages[dimension] >= 72);
  const weaknesses = SCORE_DIMENSIONS.filter((dimension) => averages[dimension] <= 52);
  const spread =
    Math.max(...SCORE_DIMENSIONS.map((d) => averages[d])) -
    Math.min(...SCORE_DIMENSIONS.map((d) => averages[d]));
  const uncertainty = Math.max(
    8,
    Math.min(90, Math.round(70 / Math.max(1, assessments.length) + spread / 4)),
  );
  const latestTurnAverage = Math.round(
    mean(SCORE_DIMENSIONS.map((dimension) => assessment.scores[dimension].score)),
  );
  const shift =
    latestTurnAverage >= 78
      ? 'harder'
      : latestTurnAverage <= 52
        ? 'easier'
        : assessment.recommendedDifficulty;
  const currentDifficulty = applyDifficultyShift(previous.currentDifficulty, shift);
  const turnCount = assessments.length;
  const isComplete = turnCount >= previous.targetQuestionCount;

  const redFlags = Array.from(
    new Set([
      ...previous.redFlags,
      ...assessment.contradictions,
      ...assessment.fillersOrHedging.slice(0, 2).map((item) => `Hedging/filler: ${item}`),
    ]),
  ).slice(-12);

  const evidenceLog = [
    ...previous.evidenceLog,
    ...SCORE_DIMENSIONS.map((dimension) => ({
      turnId: assessment.turnId,
      timestampMs: assessment.timestampMs,
      dimension,
      score: assessment.scores[dimension].score,
      quote: assessment.scores[dimension].quote,
      evidence: assessment.scores[dimension].evidence,
    })),
  ].slice(-80);

  const director = {
    nextPersona: assessment.recommendedPersona,
    difficulty: shift,
    questionType: assessment.recommendedQuestionType,
    brief: [
      isComplete
        ? 'The interview is complete. Do not ask another question. Give a short closing thank-you and stop.'
        : '',
      `Next speaker: ${PERSONA_LABEL[assessment.recommendedPersona]}.`,
      `Question type: ${assessment.recommendedQuestionType}.`,
      `Difficulty adjustment: ${shift}.`,
      `Current level: ${currentDifficulty}.`,
      `Progress: ${turnCount}/${previous.targetQuestionCount} candidate answers.`,
      strengths.length
        ? `Lean on strengths: ${strengths.join(', ')}.`
        : 'No clear strength yet — keep probing.',
      weaknesses.length
        ? `Probe weaknesses: ${weaknesses.join(', ')}.`
        : 'No severe weakness yet.',
      assessment.contradictions[0]
        ? `Clarify this contradiction: ${assessment.contradictions[0]}`
        : '',
    ]
      .filter(Boolean)
      .join(' '),
  };

  return {
    ...previous,
    updatedAt: Date.now(),
    completedAt: isComplete ? Date.now() : previous.completedAt,
    status: isComplete ? 'complete' : previous.status,
    turnCount,
    currentDifficulty,
    averages,
    strengths,
    weaknesses,
    uncertainty,
    trends: Object.fromEntries(
      SCORE_DIMENSIONS.map((dimension) => [dimension, trend(series(dimension))]),
    ) as CandidateState['trends'],
    evidenceLog,
    redFlags,
    assessments,
    director,
  };
}
