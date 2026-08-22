import type { AIInsight, DiscoveryItem, ChatMessage } from '@/types';
import { type ParsedQuery, domainLabel, parseQuery } from './nlp';

// ============================================================================
// AI intelligence layer.
//
// STARTVATE treats AI as a behind-the-scenes intelligence layer, not a chatbot.
// `generateInsight` reads the search context + ranked results and produces the
// structured "who to talk to / opportunities / next steps" guidance shown atop
// the results screen. `askAI` powers the secondary deep-guidance feature.
//
// PRODUCTION SEAM ─────────────────────────────────────────────────────────────
// Both functions below are pure + synchronous-friendly heuristics so the app is
// fully self-contained and offline-capable. To wire real intelligence, implement
// `callLLM` against the Claude Messages API (or your backend) and have these
// functions await it. The rest of the app depends only on the returned shapes.
//
//   async function callLLM(system: string, user: string): Promise<string> {
//     const res = await fetch('https://api.anthropic.com/v1/messages', {
//       method: 'POST',
//       headers: {
//         'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
//         'anthropic-version': '2023-06-01',
//         'content-type': 'application/json',
//       },
//       body: JSON.stringify({
//         model: 'claude-sonnet-5',
//         max_tokens: 1024,
//         system,
//         messages: [{ role: 'user', content: user }],
//       }),
//     });
//     const data = await res.json();
//     return data.content?.[0]?.text ?? '';
//   }
//
// NOTE: never ship a raw provider key in a mobile bundle — proxy through your
// own backend. The seam is documented here so the swap is a localized change.
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
// Ask AI — deeper conversational guidance (secondary feature).
// ---------------------------------------------------------------------------

export const ASK_AI_SUGGESTIONS = [
  'How do I find a technical co-founder?',
  'What should my first 3 steps be?',
  'How do I validate my startup idea?',
  'Where can I get non-dilutive funding?',
  'How do I prepare for a pre-seed raise?',
];

/** Heuristic guidance responder. Swap for `callLLM` at the production seam. */
export async function askAI(
  question: string,
  history: ChatMessage[],
): Promise<string> {
  await new Promise((r) => setTimeout(r, 650)); // simulate thinking
  const q = question.toLowerCase();
  const parsed = parseQuery(question);
  const focus = parsed.domains.length ? domainsPhrase(parsed.domains) : 'your idea';

  const intro =
    history.length === 0
      ? `Great question. Here's how I'd think about it for ${focus}:\n\n`
      : '';

  if (/(co-?founder|cofounder|partner|team)/.test(q)) {
    return (
      intro +
      `Finding the right co-founder:\n\n` +
      `1. Get specific — write down the exact skills you're missing (e.g. ML, GTM, design).\n` +
      `2. Use STARTVATE's Discover tab and search your domain to see builders marked "available".\n` +
      `3. Post a clear "looking-for-co-founder" note on the Builder Feed with your traction and ask.\n` +
      `4. Do a paid trial project together before committing — chemistry and execution beat résumés.\n\n` +
      `Tip: complementary skills + shared values + aligned ambition is the combination that lasts.`
    );
  }

  if (/(validate|validation|idea|problem|pmf|product.?market)/.test(q)) {
    return (
      intro +
      `Validating before you build:\n\n` +
      `1. Write the problem in one sentence from the customer's point of view.\n` +
      `2. Talk to 5–10 potential users this week — ask about their last real experience of the problem, not hypotheticals.\n` +
      `3. Look at the "Similar Startups" your search surfaces — demand there is a signal you're onto something.\n` +
      `4. Get a signal of willingness to pay (a pre-order, a pilot, a waitlist) before writing much code.\n\n` +
      `You're looking for pull, not politeness.`
    );
  }

  if (/(fund|funding|raise|investor|grant|money|capital|pre-?seed|seed)/.test(q)) {
    return (
      intro +
      `On funding for ${focus}:\n\n` +
      `• Non-dilutive first: check the Grants section in your search — it's free money that also de-risks you.\n` +
      `• Angels & pre-seed: the Investors your search surfaces already back this space; warm intros beat cold ones.\n` +
      `• Traction is leverage: even a small pilot or waitlist makes every conversation easier.\n` +
      `• Raise for milestones, not vanity — enough to hit the next proof point plus buffer.\n\n` +
      `Start by listing the 3 investors most relevant to your domain and finding a mutual connection.`
    );
  }

  if (/(first|start|begin|next step|steps|roadmap|do next)/.test(q)) {
    return (
      intro +
      `A simple first-30-days plan:\n\n` +
      `Week 1 — Sharpen the problem & talk to 5 users.\n` +
      `Week 2 — Study 3 similar startups; define your wedge.\n` +
      `Week 3 — Build the scrappiest possible prototype.\n` +
      `Week 4 — Put it in front of real users; line up a hackathon or grant for momentum.\n\n` +
      `Use Discover to find the people and opportunities for each step, and post progress to the Feed for accountability.`
    );
  }

  if (/(market|competitor|competition|differentiat)/.test(q)) {
    return (
      intro +
      `Understanding your market:\n\n` +
      `1. Search your domain and open "Similar Startups & Competitors".\n` +
      `2. For each, note who they serve and what they *don't* do well — that gap is your wedge.\n` +
      `3. Position around a specific user and a sharp job-to-be-done rather than a broad category.\n\n` +
      `A crowded market is often validation; an empty one is often a warning.`
    );
  }

  // Generic fallback — still useful and on-brand.
  return (
    intro +
    `Here's how I'd approach that:\n\n` +
    `1. Get concrete about the outcome you want and the single biggest unknown right now.\n` +
    `2. Use Discover to find the people, competitors and opportunities tied to ${focus}.\n` +
    `3. Take one small, reversible step this week and post what you learn to the Feed.\n\n` +
    `Ask me to go deeper on co-founders, validation, funding, or your first steps — I can get specific.`
  );
}
