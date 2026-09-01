import { geminiJsonObject } from './gemini-json';
import { SCORE_DIMENSIONS, type CandidateState, type FinalReport } from './types';

function overallFromAverages(state: CandidateState): number {
  const values = SCORE_DIMENSIONS.map((key) => state.averages[key]);
  return Math.round(values.reduce((sum, n) => sum + n, 0) / values.length);
}

function fallbackReport(state: CandidateState): FinalReport {
  const shortcomings = state.weaknesses.map(
    (dimension) =>
      `${dimension}: average score ${state.averages[dimension]}/100 and needs more specific evidence.`,
  );
  return {
    attemptId: state.attemptId,
    agentId: state.agentId,
    candidateName: state.ownerName,
    summary: `Completed ${state.turnCount} of ${state.targetQuestionCount} planned answers. The strongest areas were ${state.strengths[0] ?? 'still emerging'}, while the main improvement areas were ${state.weaknesses[0] ?? 'answer depth and specificity'}.`,
    overallScore: overallFromAverages(state),
    dimensions: { ...state.averages },
    questionCount: state.turnCount,
    targetQuestionCount: state.targetQuestionCount,
    highestDifficulty: state.currentDifficulty,
    strengths: state.strengths.map(
      (dimension) => `${dimension}: consistent evidence around ${state.averages[dimension]}/100`,
    ),
    weaknesses: state.weaknesses.map(
      (dimension) => `${dimension}: trailing at ${state.averages[dimension]}/100`,
    ),
    shortcomings,
    evidence: state.evidenceLog.slice(-18),
    contradictions: state.redFlags,
    recommendations: [
      shortcomings[0]
        ? `Practice a concrete example that shows ${state.weaknesses[0]} with a clear situation, action, and result.`
        : 'Keep answers specific: name the constraint, the trade-off, and the outcome.',
      'Pause instead of filling with hedges; finish one thought before the next.',
    ],
    generatedAt: Date.now(),
  };
}

export async function generateFinalReport(state: CandidateState): Promise<FinalReport> {
  if (state.assessments.length === 0) {
    return fallbackReport(state);
  }

  try {
    const raw = await geminiJsonObject<{
      overallScore?: number;
      summary?: string;
      strengths?: string[];
      weaknesses?: string[];
      shortcomings?: string[];
      contradictions?: string[];
      recommendations?: string[];
    }>(
      'Write a hiring-style interview report. Use only the provided scores and quotes. Return JSON with overallScore (0-100), summary (2 sentences), strengths[], weaknesses[], shortcomings[], contradictions[], recommendations[] (actionable solutions for the shortcomings).',
      JSON.stringify({
        candidateName: state.ownerName,
        averages: state.averages,
        currentDifficulty: state.currentDifficulty,
        questionCount: state.turnCount,
        targetQuestionCount: state.targetQuestionCount,
        evidence: state.evidenceLog.slice(-24),
        redFlags: state.redFlags,
        turns: state.assessments.map((item) => ({
          turnId: item.turnId,
          transcript: item.transcript,
          scores: Object.fromEntries(
            SCORE_DIMENSIONS.map((key) => [key, item.scores[key].score]),
          ),
        })),
      }),
      900,
    );

    const overall =
      typeof raw.overallScore === 'number'
        ? Math.max(0, Math.min(100, Math.round(raw.overallScore)))
        : overallFromAverages(state);

    return {
      attemptId: state.attemptId,
      agentId: state.agentId,
      candidateName: state.ownerName,
      summary:
        typeof raw.summary === 'string' && raw.summary.trim().length > 0
          ? raw.summary.trim()
          : fallbackReport(state).summary,
      overallScore: overall,
      dimensions: { ...state.averages },
      questionCount: state.turnCount,
      targetQuestionCount: state.targetQuestionCount,
      highestDifficulty: state.currentDifficulty,
      strengths: Array.isArray(raw.strengths) ? raw.strengths.filter((s) => typeof s === 'string') : [],
      weaknesses: Array.isArray(raw.weaknesses)
        ? raw.weaknesses.filter((s) => typeof s === 'string')
        : [],
      shortcomings: Array.isArray(raw.shortcomings)
        ? raw.shortcomings.filter((s) => typeof s === 'string')
        : fallbackReport(state).shortcomings,
      evidence: state.evidenceLog.slice(-18),
      contradictions: Array.isArray(raw.contradictions)
        ? raw.contradictions.filter((s) => typeof s === 'string')
        : state.redFlags,
      recommendations: Array.isArray(raw.recommendations)
        ? raw.recommendations.filter((s) => typeof s === 'string')
        : fallbackReport(state).recommendations,
      generatedAt: Date.now(),
    };
  } catch (error) {
    console.error('Final report Gemini call failed, using fused scores:', error);
    return fallbackReport(state);
  }
}
