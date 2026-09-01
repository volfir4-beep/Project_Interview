export const SCORE_DIMENSIONS = [
  'knowledge',
  'reasoning',
  'relevance',
  'communication',
  'vocabulary',
  'confidence',
] as const;

export type ScoreDimension = (typeof SCORE_DIMENSIONS)[number];

export type InterviewerPersona =
  | 'technical'
  | 'product'
  | 'hiring'
  | 'customer'
  | 'behavioural';

export type QuestionType = 'follow-up' | 'scenario' | 'role-play';
export type Difficulty = 'easier' | 'same' | 'harder';

export type DimensionScore = {
  score: number;
  evidence: string;
  quote: string;
};

export type TurnAssessment = {
  turnId: string;
  timestampMs: number;
  transcript: string;
  scores: Record<ScoreDimension, DimensionScore>;
  fillersOrHedging: string[];
  contradictions: string[];
  recommendedPersona: InterviewerPersona;
  recommendedDifficulty: Difficulty;
  recommendedQuestionType: QuestionType;
};

export type EvidenceEntry = {
  turnId: string;
  timestampMs: number;
  dimension: ScoreDimension;
  score: number;
  quote: string;
  evidence: string;
};

export type CandidateState = {
  agentId: string;
  createdAt: number;
  updatedAt: number;
  turnCount: number;
  averages: Record<ScoreDimension, number>;
  strengths: ScoreDimension[];
  weaknesses: ScoreDimension[];
  uncertainty: number;
  trends: Record<ScoreDimension, 'up' | 'down' | 'flat'>;
  evidenceLog: EvidenceEntry[];
  redFlags: string[];
  assessments: TurnAssessment[];
  director: {
    nextPersona: InterviewerPersona;
    difficulty: Difficulty;
    questionType: QuestionType;
    brief: string;
  };
};

export type FinalReport = {
  overallScore: number;
  dimensions: Record<ScoreDimension, number>;
  strengths: string[];
  weaknesses: string[];
  evidence: EvidenceEntry[];
  contradictions: string[];
  recommendations: string[];
  generatedAt: number;
};
