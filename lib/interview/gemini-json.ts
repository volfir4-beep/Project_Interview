import { requireEnv } from '@/lib/env';

export const GEMINI_CHAT_COMPLETIONS_URL =
  'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';

export const GEMINI_MODEL = 'gemini-3.6-flash';

function extractJsonObject(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = (fenced?.[1] ?? text).trim();
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Gemini did not return a JSON object');
  }
  return raw.slice(start, end + 1);
}

export async function geminiJsonObject<T>(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 900,
): Promise<T> {
  const apiKey = requireEnv('NEXT_GEMINI_API_KEY');
  const response = await fetch(GEMINI_CHAT_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GEMINI_MODEL,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gemini JSON call failed (${response.status}): ${detail.slice(0, 400)}`);
  }

  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = body.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Gemini JSON call returned an empty message');
  }
  return JSON.parse(extractJsonObject(content)) as T;
}
