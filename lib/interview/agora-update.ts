import { AgoraClient, Area, generateConvoAIToken } from 'agora-agents';
import { requireEnv } from '@/lib/env';
import { directorBriefMessage, INTERVIEW_PANEL_PROMPT } from './prompt';

export function createAgoraClient() {
  return new AgoraClient({
    area: Area.US,
    appId: requireEnv('NEXT_PUBLIC_AGORA_APP_ID'),
    appCertificate: requireEnv('NEXT_AGORA_APP_CERTIFICATE'),
  });
}

export async function pushDirectorBrief(agentId: string, brief: string): Promise<void> {
  const appId = requireEnv('NEXT_PUBLIC_AGORA_APP_ID');
  const appCertificate = requireEnv('NEXT_AGORA_APP_CERTIFICATE');
  const client = createAgoraClient();
  const token = generateConvoAIToken({
    appId,
    appCertificate,
    channelName: 'update',
    uid: 0,
  });

  await client.agents.update(
    {
      appid: appId,
      agentId,
      properties: {
        llm: {
          system_messages: [
            { role: 'system', content: INTERVIEW_PANEL_PROMPT },
            directorBriefMessage(brief),
          ],
        },
      },
    },
    { headers: { Authorization: `agora token=${token}` } },
  );
}
