import { NextRequest, NextResponse } from 'next/server';
import { assessCandidateTurn } from '@/lib/interview/assess';
import { pushDirectorBrief } from '@/lib/interview/agora-update';
import { createCandidateState, fuseAssessment } from '@/lib/interview/fusion';
import { getCandidateState, setCandidateState } from '@/lib/interview/store';

type AssessRequest = {
  agent_id?: string;
  turn_id?: string;
  text?: string;
  timestamp_ms?: number;
  context?: string;
};

export async function GET(request: NextRequest) {
  const agentId = request.nextUrl.searchParams.get('agent_id');
  if (!agentId) {
    return NextResponse.json({ error: 'agent_id is required' }, { status: 400 });
  }
  const state = getCandidateState(agentId);
  if (!state) {
    return NextResponse.json({ error: 'No candidate state for this session' }, { status: 404 });
  }
  return NextResponse.json({ state });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AssessRequest;
    const agentId = body.agent_id?.trim();
    const text = body.text?.trim();
    const turnId = body.turn_id?.trim();

    if (!agentId || !text || !turnId) {
      return NextResponse.json(
        { error: 'agent_id, turn_id, and text are required' },
        { status: 400 },
      );
    }

    const existing = getCandidateState(agentId) ?? createCandidateState(agentId);
    if (existing.assessments.some((item) => item.turnId === turnId)) {
      return NextResponse.json({ state: existing, deduped: true });
    }

    const assessment = await assessCandidateTurn({
      turnId,
      timestampMs: typeof body.timestamp_ms === 'number' ? body.timestamp_ms : Date.now(),
      transcript: text,
      recentContext: body.context?.trim() ?? '',
    });

    const fused = fuseAssessment(existing, assessment);
    setCandidateState(fused);

    try {
      await pushDirectorBrief(agentId, fused.director.brief);
    } catch (error) {
      console.error('Director brief update failed:', error);
    }

    return NextResponse.json({
      assessment,
      state: fused,
    });
  } catch (error) {
    console.error('Error assessing turn:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to assess turn',
      },
      { status: 500 },
    );
  }
}
