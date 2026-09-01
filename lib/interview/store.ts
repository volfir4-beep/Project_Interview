import type { CandidateState, FinalReport } from './types';

const sessions = new Map<string, CandidateState>();
const reports = new Map<string, FinalReport>();

export function getCandidateState(agentId: string): CandidateState | undefined {
  return sessions.get(agentId);
}

export function setCandidateState(state: CandidateState): void {
  sessions.set(state.agentId, state);
}

export function deleteCandidateState(agentId: string): void {
  sessions.delete(agentId);
}

export function getFinalReport(agentId: string): FinalReport | undefined {
  return reports.get(agentId);
}

export function setFinalReport(agentId: string, report: FinalReport): void {
  reports.set(agentId, report);
}
