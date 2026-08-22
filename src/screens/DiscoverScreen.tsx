import { useNavigate } from 'react-router-dom';
import { useApp } from '@/store/appStore';
import { Brand } from '@/components/Brand';
import { SearchBar } from '@/components/SearchBar';
import { Avatar } from '@/components/Avatar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { TRENDING_SEARCHES } from '@/services/discoveryService';
import { CATEGORIES } from '@/data/categories';
import { ACCENT_BG } from '@/lib/format';

// Story-row builders — the "people currently building" strip from the design.
const STORY_BUILDERS = [
  { name: 'You', seed: 'brand', query: '' },
  { name: 'Aarav', seed: 'accent', query: 'AI Agriculture Startup' },
  { name: 'Lena', seed: 'sky', query: 'Satellite crop analytics' },
  { name: 'Diego', seed: 'rose', query: 'Fintech for emerging markets' },
  { name: 'Priya', seed: 'amber', query: 'Health monitoring wearables' },
  { name: 'Marcus', seed: 'brand', query: 'Climate battery software' },
];

export function DiscoverScreen() {
  const navigate = useNavigate();
  const doSearch = useApp((s) => s.doSearch);
  const recent = useApp((s) => s.recentSearches);
  const profile = useApp((s) => s.profile);

  const go = (q: string) => {
    doSearch(q);
    navigate('/results');
  };

  return (
    <div className="mx-auto max-w-lg pb-28">
      <header className="safe-top flex items-center justify-between px-4 pb-3">
        <Brand size="sm" />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button onClick={() => navigate('/profile')} className="active:scale-95">
            <Avatar name={profile.name} seed={profile.avatarColor} size={38} ring />
          </button>
        </div>
      </header>

      {/* Hero */}
      <div className="px-4 pt-4 text-center">
        <h1 className="text-[27px] font-extrabold leading-tight text-ink">
          Turn your idea into
          <br />
          <span className="text-gradient">a real company.</span>
        </h1>
        <p className="mx-auto mt-2.5 max-w-xs text-sm leading-relaxed text-ink-muted">
          Search once. Discover the people, opportunities and next steps to build — all in one place.
        </p>
      </div>

      {/* Search */}
      <div className="mt-6 px-4">
        <SearchBar onSubmit={go} />
      </div>

      {/* Story row — builders in the ecosystem */}
      <div className="mt-6">
        <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-1">
          {STORY_BUILDERS.map((b) => (
            <button
              key={b.name}
              onClick={() => (b.query ? go(b.query) : navigate('/profile'))}
              className="flex w-16 shrink-0 flex-col items-center gap-1.5 active:scale-95"
            >
              <Avatar
                name={b.name === 'You' ? profile.name : b.name}
                seed={b.seed}
                size={54}
                storyRing
              />
              <span className="truncate text-[11px] font-semibold text-ink-muted">{b.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Trending */}
      <div className="mt-7 px-4">
        <p className="mb-2.5 text-xs font-bold uppercase tracking-wide text-ink-faint">
          Try searching
        </p>
        <div className="flex flex-wrap gap-2">
          {TRENDING_SEARCHES.map((t) => (
            <button key={t} className="chip" onClick={() => go(t)}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Recent */}
      {recent.length > 0 && (
        <div className="mt-7 px-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-faint">Recent</p>
          <div className="card divide-y divide-hair/[0.05] overflow-hidden">
            {recent.map((r) => (
              <button
                key={r}
                onClick={() => go(r)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-hair/[0.03]"
              >
                <ClockIcon />
                <span className="flex-1 truncate text-sm text-ink">{r}</span>
                <ArrowIcon />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* What you'll discover */}
      <div className="mt-7 px-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-faint">
          What you'll discover
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          {CATEGORIES.slice(0, 8).map((c) => (
            <div key={c.key} className="card flex items-center gap-2.5 p-3">
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-xl text-base ${ACCENT_BG[c.accent]}`}
              >
                {c.icon}
              </span>
              <span className="text-[12.5px] font-semibold leading-tight text-ink">{c.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-ink-faint">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-ink-faint">
      <path
        d="m9 6 6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
