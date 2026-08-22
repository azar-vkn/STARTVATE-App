import type { CategoryMeta, CategoryKey } from '@/types';

// Order here defines the order sections appear on the results screen.
export const CATEGORIES: CategoryMeta[] = [
  {
    key: 'founders',
    label: 'Relevant Founders',
    blurb: 'People already building in this space',
    icon: '🚀',
    accent: 'brand',
  },
  {
    key: 'startups',
    label: 'Similar Startups & Competitors',
    blurb: 'Companies to study and benchmark against',
    icon: '🏢',
    accent: 'sky',
  },
  {
    key: 'cofounders',
    label: 'Potential Co-founders',
    blurb: 'Builders looking to team up',
    icon: '🤝',
    accent: 'accent',
  },
  {
    key: 'mentors',
    label: 'Mentors & Experts',
    blurb: 'Advisors who know this domain',
    icon: '🧭',
    accent: 'amber',
  },
  {
    key: 'investors',
    label: 'Investors',
    blurb: 'Angels & funds active in this space',
    icon: '💰',
    accent: 'accent',
  },
  {
    key: 'hackathons',
    label: 'Hackathons & Competitions',
    blurb: 'Build, ship and win',
    icon: '⚡',
    accent: 'rose',
  },
  {
    key: 'events',
    label: 'Conferences & Events',
    blurb: 'Where the ecosystem meets',
    icon: '🎟️',
    accent: 'sky',
  },
  {
    key: 'incubators',
    label: 'Incubators & Accelerators',
    blurb: 'Programs to accelerate your journey',
    icon: '🌱',
    accent: 'accent',
  },
  {
    key: 'grants',
    label: 'Grants & Funding',
    blurb: 'Non-dilutive capital opportunities',
    icon: '🎯',
    accent: 'amber',
  },
  {
    key: 'news',
    label: 'News & Signals',
    blurb: 'What is moving in this domain',
    icon: '📰',
    accent: 'brand',
  },
  {
    key: 'communities',
    label: 'Communities & Discussions',
    blurb: 'Where builders gather and talk',
    icon: '💬',
    accent: 'sky',
  },
  {
    key: 'resources',
    label: 'Useful Resources',
    blurb: 'Guides, tools and playbooks',
    icon: '📚',
    accent: 'amber',
  },
];

export const CATEGORY_MAP: Record<CategoryKey, CategoryMeta> = CATEGORIES.reduce(
  (acc, c) => {
    acc[c.key] = c;
    return acc;
  },
  {} as Record<CategoryKey, CategoryMeta>,
);
