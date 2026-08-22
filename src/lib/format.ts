import type { PostType, BuilderStage, LookingFor } from '@/types';

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  const wk = Math.floor(day / 7);
  return `${wk}w`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Deterministic gradient for an avatar seed name (warm Claude-forward set). */
export const AVATAR_GRADIENTS: Record<string, string> = {
  brand: 'linear-gradient(135deg,#E08A5F,#D0602F)',
  accent: 'linear-gradient(135deg,#4FB0A2,#2E8377)',
  sky: 'linear-gradient(135deg,#7E80D8,#5457B8)',
  rose: 'linear-gradient(135deg,#DB7E9B,#C25574)',
  amber: 'linear-gradient(135deg,#E9B45C,#D68A2E)',
};

export function avatarGradient(seed: string): string {
  return AVATAR_GRADIENTS[seed] ?? AVATAR_GRADIENTS.brand;
}

export const POST_TYPE_META: Record<PostType, { label: string; icon: string; color: string }> = {
  idea: { label: 'Idea', icon: '💡', color: 'text-amber' },
  launch: { label: 'Launch', icon: '🚀', color: 'text-coral' },
  'looking-for-cofounder': { label: 'Co-founder', icon: '🤝', color: 'text-teal' },
  hiring: { label: 'Hiring', icon: '📣', color: 'text-indigo' },
  progress: { label: 'Progress', icon: '📈', color: 'text-teal' },
  question: { label: 'Question', icon: '❓', color: 'text-indigo' },
  feedback: { label: 'Feedback', icon: '🔍', color: 'text-amber' },
  opportunity: { label: 'Opportunity', icon: '🎯', color: 'text-rose' },
  showcase: { label: 'Showcase', icon: '✨', color: 'text-coral' },
};

export const POST_TYPES: PostType[] = [
  'idea',
  'launch',
  'looking-for-cofounder',
  'hiring',
  'progress',
  'question',
  'feedback',
  'opportunity',
  'showcase',
];

export const STAGE_META: Record<BuilderStage, string> = {
  exploring: 'Exploring',
  ideating: 'Ideating',
  'building-mvp': 'Building MVP',
  launched: 'Launched',
  scaling: 'Scaling',
  fundraising: 'Fundraising',
};

export const STAGES: BuilderStage[] = [
  'exploring',
  'ideating',
  'building-mvp',
  'launched',
  'scaling',
  'fundraising',
];

export const LOOKING_FOR_META: Record<LookingFor, string> = {
  'co-founder': 'Co-founder',
  'team-member': 'Team member',
  mentor: 'Mentor',
  investor: 'Investor',
  customers: 'Customers',
  feedback: 'Feedback',
};

export const LOOKING_FOR_OPTIONS: LookingFor[] = [
  'co-founder',
  'team-member',
  'mentor',
  'investor',
  'customers',
  'feedback',
];

/** accent name -> tailwind text color class for result cards */
export const ACCENT_TEXT: Record<string, string> = {
  brand: 'text-coral',
  accent: 'text-teal',
  amber: 'text-amber',
  rose: 'text-rose',
  sky: 'text-indigo',
};

export const ACCENT_BG: Record<string, string> = {
  brand: 'bg-coral/12',
  accent: 'bg-teal/12',
  amber: 'bg-amber/12',
  rose: 'bg-rose/12',
  sky: 'bg-indigo/12',
};
