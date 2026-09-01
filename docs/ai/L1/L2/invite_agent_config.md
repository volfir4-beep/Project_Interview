> **When to Read This:** Load this document when you are changing the agent's prompt, voice, VAD behavior, model selection, or wiring a bring-your-own-key (BYOK) provider.

# Invite Agent Config

## Where It Lives

All of the managed agent configuration is built in `app/api/invite-agent/route.ts`. The route receives `{ requester_id, channel_name }` from `LandingPage`, constructs an `Agent` from `agora-agents`, and starts a session bound to the requester's RTC channel.

## Top-Level Constants

| Constant            | Default                                              | Purpose                                                   |
| ------------------- | ---------------------------------------------------- | --------------------------------------------------------- |
| `INTERVIEW_PANEL_PROMPT` | Voice-native multi-persona interview instructions | The system prompt for the LLM. |
| `GREETING`               | AI disclosure plus the first interviewer question | Spoken on session start. |

Agent behavior is configured in code: edit `GREETING` or `INTERVIEW_PANEL_PROMPT` directly.

## The Agent Builder Chain

`AgoraClient` is constructed first — it carries the region and credentials for all API calls. `area` belongs here, not on the session.

```ts
const client = new AgoraClient({ area: Area.US, appId, appCertificate });

const agent = new Agent({
  name: `conversation-${Date.now()}-${randomHex}`,
  instructions: INTERVIEW_PANEL_PROMPT,
  greeting: GREETING,
  failureMessage: 'Please wait a moment.',
  maxHistory: 50,
  turnDetection: {
    config: {
      speech_threshold: 0.5,
      start_of_speech: { /* VAD on-start params */ },
      end_of_speech:   { /* VAD on-end params */ },
    },
  },
  advancedFeatures: { enable_rtm: true, enable_tools: true },
  parameters: {
    data_channel: 'rtm',
    enable_error_message: true,
    enable_metrics: true,
  },
})
  .withStt(new DeepgramSTT({ model: 'nova-3', language: 'en' }))
  .withLlm(new OpenAI({
    model: 'gpt-4o-mini',
    greetingMessage: GREETING,
    failureMessage: 'Please wait a moment.',
    maxHistory: 15,
    params: { max_tokens: 1024, temperature: 0.7, top_p: 0.95 },
  }))
  .withTts(new MiniMaxTTS({
    model: 'speech_2_6_turbo',
    voiceId: 'English_captivating_female1',
  }));
```

## Session Options

`createSession` takes the `AgoraClient` as its first argument, then the session options object. `session.start()` is called separately and returns the `agentId`.

```ts
const session = agent.createSession(client, {
  channel: channel_name,
  agentUid,
  remoteUids: [requester_id],
  idleTimeout: 30,
  expiresIn: ExpiresIn.hours(1),
  debug: false,
});
const agentId = await session.start();
```

| Option        | Effect                                                                               |
| ------------- | ------------------------------------------------------------------------------------ |
| `channel`     | The RTC channel name the agent joins.                                                |
| `agentUid`    | The UID the agent occupies in the channel, shared through `lib/agora.ts`.             |
| `remoteUids`  | Restricts the agent to the requester's UID — protects against cross-channel sniping. |
| `idleTimeout` | Seconds of silence before the session ends.                                          |
| `expiresIn`   | Hard ceiling on session length, mirrors the 1-hour RTC token.                        |
| `debug`       | Logs Agora REST API calls to the console when `true`.                                |

## Editing Each Surface

### Change the prompt

Edit `INTERVIEW_PANEL_PROMPT`. Keep it under the LLM's context window — long prompts add latency on a voice turn.

### Swap the LLM

The live voice LLM uses Agora's native `Gemini` vendor (`style: "gemini"`), model `gemini-3.6-flash`, and `NEXT_GEMINI_API_KEY`. Do not send `thinking_budget` or OpenAI `extra_body` — Gemini 3.6 returns `400 INVALID_ARGUMENT`. Scoring/report JSON calls still use the OpenAI-compatible chat-completions URL in `lib/interview/gemini-json.ts`.

### Change the greeting

Edit `GREETING` in `app/api/invite-agent/route.ts`.

### Change VAD behavior

Edit `turnDetection.config.start_of_speech` and `turnDetection.config.end_of_speech`. Both blocks accept the new VAD param shape — do **not** revert to the deprecated `turnDetection.type: 'agora_vad'`.

### Swap the STT model

Replace the `DeepgramSTT` constructor. To use Deepgram with a BYOK key, set `NEXT_DEEPGRAM_API_KEY` and pass `apiKey: process.env.NEXT_DEEPGRAM_API_KEY` to the constructor.

### Swap the TTS

Replace `MiniMaxTTS`. ElevenLabs is the common BYOK choice — use `NEXT_ELEVENLABS_API_KEY` and `NEXT_ELEVENLABS_VOICE_ID`. The commented BYOK example in the route shows the constructor shape.

## Response Contract

On success the route returns `AgentResponse`:

```json
{
  "agent_id": "string",
  "create_ts": 1700000000,
  "state": "RUNNING"
}
```

`agent_id` is what `LandingPage` later passes to `/api/stop-conversation`.

## Verification

`scripts/verify-api-contracts.ts` mocks `Agent.prototype.createSession` and asserts:

- Missing `channel_name` or `requester_id` → `400`.
- Mocked success → `200` with `agent_id`, `create_ts`, `state`.

After editing this file, run:

```bash
pnpm run verify:api
pnpm run typecheck
```

## Failure Modes

| Symptom                                                | Cause                                                          |
| ------------------------------------------------------ | -------------------------------------------------------------- |
| `400 channel_name and requester_id are required`       | Browser sent an empty body or wrong field names.               |
| `500 Agora credentials are not set`                    | `NEXT_AGORA_APP_CERTIFICATE` missing in env.                   |
| Agent joins but never speaks                           | TTS misconfigured (wrong `voiceId` or missing BYOK key).       |
| Agent state stuck on `IDLE`                            | `enable_rtm: true` missing or RTM client not subscribed yet.   |
| `verify:api` fails on the route                        | New required field added without updating the harness.         |

## See Also

- [Back to Workflows](../05_workflows.md)
- [Back to Interfaces](../06_interfaces.md)
- [Token Model](token_model.md)
