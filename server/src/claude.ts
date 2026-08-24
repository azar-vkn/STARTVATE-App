import type { Env } from './types';

// ============================================================================
// Claude API access.
//
// Lives on the Worker, never in the app: a provider key shipped inside an APK
// is trivially extractable, and would let anyone spend your quota.
// ============================================================================

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-5';

export class ClaudeUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ClaudeUnavailableError';
  }
}

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeResponse {
  content?: { type: string; text?: string }[];
  error?: { message?: string };
}

export function claudeConfigured(env: Env): boolean {
  return Boolean(env.ANTHROPIC_API_KEY);
}

export async function callClaude(
  env: Env,
  system: string,
  messages: ClaudeMessage[],
  signal: AbortSignal,
  maxTokens = 1024,
): Promise<string> {
  if (!env.ANTHROPIC_API_KEY) {
    throw new ClaudeUnavailableError('No ANTHROPIC_API_KEY configured.');
  }

  const res = await fetch(API_URL, {
    method: 'POST',
    signal,
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new ClaudeUnavailableError(
      `Claude API ${res.status}: ${detail.slice(0, 160)}`.trim(),
    );
  }

  const data = (await res.json()) as ClaudeResponse;
  const text = data.content
    ?.filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('')
    .trim();

  if (!text) throw new ClaudeUnavailableError('Claude returned an empty response.');
  return text;
}

/** Shared persona so Ask AI sounds like STARTVATE, not a generic assistant. */
export const ADVISOR_SYSTEM = `You are the advisor inside STARTVATE, an app that helps people turn startup ideas into real companies by connecting them to founders, co-founders, mentors, investors, hackathons, accelerators, grants and communities.

Give specific, actionable guidance a founder can act on this week. Prefer concrete next steps over general encouragement. Be honest about trade-offs and risks; do not hype.

Keep replies under 200 words unless the question genuinely needs more. Use short paragraphs or a tight numbered list. No markdown headers.

You are not a lawyer, accountant or licensed financial adviser — for regulated questions, say what to consider and recommend a professional.

When it helps, point the user back to STARTVATE's search to find the actual people and opportunities for their domain.`;
