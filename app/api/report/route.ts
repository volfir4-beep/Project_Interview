import { NextRequest, NextResponse } from 'next/server';
import { generateFinalReport } from '@/lib/interview/report';
import { getCandidateState, getFinalReport, setFinalReport } from '@/lib/interview/store';

export async function GET(request: NextRequest) {
  const agentId = request.nextUrl.searchParams.get('agent_id');
  if (!agentId) {
    return NextResponse.json({ error: 'agent_id is required' }, { status: 400 });
  }

  const cached = getFinalReport(agentId);
  if (cached) {
    return NextResponse.json({ report: cached });
  }

  const state = getCandidateState(agentId);
  if (!state) {
    return NextResponse.json({ error: 'No interview state for this session' }, { status: 404 });
  }

  const report = await generateFinalReport(state);
  setFinalReport(agentId, report);
  return NextResponse.json({ report });
}
