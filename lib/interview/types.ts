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
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type InterviewStatus = 'active' | 'complete';

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
  attemptId?: string;
  ownerUserId?: string;
  ownerName?: string;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  status: InterviewStatus;
  turnCount: number;
  targetQuestionCount: number;
  currentDifficulty: DifficultyLevel;
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
  attemptId?: string;
  agentId?: string;
  candidateName?: string;
  summary: string;
  overallScore: number;
  dimensions: Record<ScoreDimension, number>;
  questionCount: number;
  targetQuestionCount: number;
  highestDifficulty: DifficultyLevel;
  strengths: string[];
  weaknesses: string[];
  shortcomings: string[];
  evidence: EvidenceEntry[];
  contradictions: string[];
  recommendations: string[];
  generatedAt: number;
};
