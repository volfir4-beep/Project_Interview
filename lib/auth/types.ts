import type {
  CandidateState,
  DifficultyLevel,
  FinalReport,
  InterviewStatus,
  ScoreDimension,
} from '@/lib/interview/types';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

export type StoredUser = AuthUser & {
  passwordHash: string;
  createdAt: number;
};

export type LeaderboardEntry = {
  id: string;
  userId: string;
  name: string;
  overallScore: number;
  dimensions: Record<ScoreDimension, number>;
  turnCount: number;
  createdAt: number;
};

export type InterviewAttempt = {
  id: string;
  agentId: string;
  userId: string;
  candidateName: string;
  status: InterviewStatus;
  currentDifficulty: DifficultyLevel;
  questionCount: number;
  targetQuestionCount: number;
  overallScore?: number;
  dimensions: Record<ScoreDimension, number>;
  startedAt: number;
  completedAt?: number;
  report?: FinalReport;
  latestState?: CandidateState;
};

export type AppStore = {
  users: StoredUser[];
  leaderboard: LeaderboardEntry[];
  interviews: InterviewAttempt[];
  activeSessions: CandidateState[];
};
