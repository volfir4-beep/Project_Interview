import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { ScoreDimension } from '@/lib/interview/types';
import { SCORE_DIMENSIONS } from '@/lib/interview/types';
import type { AppStore, AuthUser, LeaderboardEntry, StoredUser } from './types';

const emptyStore = (): AppStore => ({ users: [], leaderboard: [] });

let cache: AppStore | null = null;
let queue: Promise<unknown> = Promise.resolve();

function storePath(): string {
  return (
    process.env.ECHOSPHERE_DATA_PATH ||
    path.join(process.cwd(), 'data', 'echosphere.json')
  );
}

async function readStore(): Promise<AppStore> {
  if (cache) return cache;
  try {
    const raw = await readFile(storePath(), 'utf8');
    const parsed = JSON.parse(raw) as Partial<AppStore>;
    cache = {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      leaderboard: Array.isArray(parsed.leaderboard) ? parsed.leaderboard : [],
    };
  } catch {
    cache = emptyStore();
  }
  return cache;
}

async function writeStore(next: AppStore): Promise<void> {
  cache = next;
  const file = storePath();
  try {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(next, null, 2), 'utf8');
  } catch (error) {
    console.error('Failed to persist EchoSphere store (in-memory still used):', error);
  }
}

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function publicUser(user: StoredUser): AuthUser {
  return { id: user.id, name: user.name, email: user.email };
}

export async function getUserById(id: string): Promise<AuthUser | null> {
  const store = await readStore();
  const user = store.users.find((item) => item.id === id);
  return user ? publicUser(user) : null;
}

export async function getStoredUserByEmail(
  email: string,
): Promise<StoredUser | undefined> {
  const store = await readStore();
  return store.users.find((item) => item.email === email);
}

export async function createUser(input: {
  name: string;
  email: string;
  passwordHash: string;
}): Promise<AuthUser> {
  return withLock(async () => {
    const store = await readStore();
    if (store.users.some((item) => item.email === input.email)) {
      throw new Error('EMAIL_TAKEN');
    }
    const user: StoredUser = {
      id: randomUUID(),
      name: input.name,
      email: input.email,
      passwordHash: input.passwordHash,
      createdAt: Date.now(),
    };
    await writeStore({ ...store, users: [...store.users, user] });
    return publicUser(user);
  });
}

export async function addLeaderboardEntry(input: {
  userId: string;
  name: string;
  overallScore: number;
  dimensions: Record<ScoreDimension, number>;
  turnCount: number;
}): Promise<LeaderboardEntry> {
  return withLock(async () => {
    const store = await readStore();
    const entry: LeaderboardEntry = {
      id: randomUUID(),
      userId: input.userId,
      name: input.name,
      overallScore: input.overallScore,
      dimensions: { ...input.dimensions },
      turnCount: input.turnCount,
      createdAt: Date.now(),
    };
    const leaderboard = [entry, ...store.leaderboard]
      .sort((a, b) => b.overallScore - a.overallScore || b.createdAt - a.createdAt)
      .slice(0, 100);
    await writeStore({ ...store, leaderboard });
    return entry;
  });
}

export async function listLeaderboard(): Promise<LeaderboardEntry[]> {
  const store = await readStore();
  return [...store.leaderboard].sort(
    (a, b) => b.overallScore - a.overallScore || b.createdAt - a.createdAt,
  );
}

export function emptyDimensions(): Record<ScoreDimension, number> {
  return Object.fromEntries(SCORE_DIMENSIONS.map((key) => [key, 0])) as Record<
    ScoreDimension,
    number
  >;
}
