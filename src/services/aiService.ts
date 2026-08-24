import type { AIInsight, DiscoveryItem, ChatMessage } from '@/types';
import { type ParsedQuery, domainLabel } from './nlp';
import { askApi, type AskMessage } from './apiClient';

// ============================================================================
// AI intelligence layer.
//
// STARTVATE treats AI as a behind-the-scenes intelligence layer, not a chatbot.
//
// `generateInsight` is deterministic and runs on-device. It does NOT invent
// anything: every name, opportunity and competitor it cites is taken from the
// real items the discovery API just returned, so it stays accurate and works
// without an API key. It summarises real data rather than generating claims.
//
// `askAI` is genuinely generative and calls Claude through the Worker, which
// holds the API key. A provider key shipped inside an APK is trivially
// extractable, so it must never live in this bundle.
// ============================================================================

function domainsPhrase(domains: string[]): string {
  if (domains.length === 0) return 'this space';
  const labels = domains.map(domainLabel);
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} × ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')} & ${labels[labels.length - 1]}`;
}

/** Build the structured intelligence read for a results screen. */
export function generateInsight(
  parsed: ParsedQuery,
  rankedItems: DiscoveryItem[],
): AIInsight {
  const focus = domainsPhrase(parsed.domains);
  const byKind = (k: DiscoveryItem['kind']) => rankedItems.filter((i) => i.kind === k);

  const founders = byKind('founders');
  const cofounders = byKind('cofounders');
  const mentors = byKind('mentors');
  const investors = byKind('investors');
  const startups = byKind('startups');
  const hackathons = byKind('hackathons');
  const grants = byKind('grants');
  const incubators = byKind('incubators');
  const events = byKind('events');

  const peopleToTalkTo: string[] = [];
  if (cofounders[0])
    peopleToTalkTo.push(`${cofounders[0].title} — ${cofounders[0].subtitle.toLowerCase()}, and available now.`);
  if (mentors[0])
    peopleToTalkTo.push(`${mentors[0].title} can advise you on ${focus.toLowerCase()}.`);
  if (founders[0])
    peopleToTalkTo.push(`${founders[0].title} is already building here — worth a founder-to-founder chat.`);
  if (investors[0])
    peopleToTalkTo.push(`${investors[0].title} invests in this space (${investors[0].stats?.[0]?.value ?? 'active'}).`);

  const opportunities: string[] = [];
  if (hackathons[0])
    opportunities.push(`${hackathons[0].title} — ${hackathons[0].stats?.map((s) => `${s.label}: ${s.value}`).join(', ') ?? 'open now'}.`);
  if (grants[0])
    opportunities.push(`${grants[0].title} offers non-dilutive funding (${grants[0].stats?.[0]?.value ?? 'grant'}).`);
  if (incubators[0])
    opportunities.push(`Apply to ${incubators[0].title} to accelerate.`);
  if (events[0])
    opportunities.push(`Be at ${events[0].title} (${events[0].location}) to meet the ecosystem.`);

  const competitorsToStudy = startups
    .slice(0, 3)
    .map((s) => `${s.title} — ${s.subtitle.toLowerCase()}.`);

  const nextSteps: string[] = [];
  nextSteps.push(
    cofounders.length
      ? 'Reach out to 2–3 potential co-founders this week and compare visions.'
      : 'Sharpen your one-line pitch and post it to the Builder Feed for feedback.',
  );
  nextSteps.push(
    startups.length
      ? `Study ${Math.min(3, startups.length)} similar startups to find your wedge and differentiation.`
      : 'Talk to 5 potential users to validate the core problem before building.',
  );
  nextSteps.push(
    grants.length || hackathons.length
      ? 'Line up a hackathon or grant to get early momentum and non-dilutive proof.'
      : 'Ship a scrappy prototype and get it in front of real users.',
  );
  if (mentors.length) nextSteps.push('Book a mentor call to pressure-test your go-to-market.');

  const totalSignals =
    founders.length + startups.length + investors.length + mentors.length;
  const confidence = Math.max(0.35, Math.min(0.95, 0.4 + totalSignals * 0.06));

  const summary =
    parsed.domains.length || parsed.keywords.length
      ? `Here's your read on ${focus}. STARTVATE surfaced the founders, competitors, ` +
        `people and opportunities most relevant to "${parsed.raw}", and mapped the next moves to turn it into a company.`
      : `Explore the ecosystem below. Add a domain like "AI", "agriculture" or "fintech" to your search for a sharper, more personal read.`;

  return {
    query: parsed.raw,
    domains: parsed.domains,
    summary,
    peopleToTalkTo,
    opportunities,
    competitorsToStudy,
    nextSteps,
    confidence,
  };
}

// ---------------------------------------------------------------------------
// Ask AI — answered by Claude via the STARTVATE Worker.
//
// There is no local fallback. A templated reply dressed up as an AI answer
// would be worse than an honest error: a founder could act on generic advice
// believing it was reasoned about their situation.
// ---------------------------------------------------------------------------

export const ASK_AI_SUGGESTIONS = [
  'How do I find a technical co-founder?',
  'What should my first 3 steps be?',
  'How do I validate my startup idea?',
  'Where can I get non-dilutive funding?',
  'How do I prepare for a pre-seed raise?',
];

export { AskUnavailableError } from './apiClient';

export async function askAI(
  question: string,
  history: ChatMessage[],
): Promise<string> {
  const conversation: AskMessage[] = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));
  return askApi(question, conversation);
}
