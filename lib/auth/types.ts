import type { ScoreDimension } from '@/lib/interview/types';

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

export type AppStore = {
  users: StoredUser[];
  leaderboard: LeaderboardEntry[];
};
