import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/store/appStore';
import { SearchBar } from '@/components/SearchBar';
import { AIInsightPanel } from '@/components/AIInsightPanel';
import { CategorySection } from '@/components/CategorySection';
import { ResultsSkeleton } from '@/components/Skeletons';
import { EmptyState } from '@/components/EmptyState';

export function ResultsScreen() {
  const navigate = useNavigate();
  const { query, searching, result, searchError, doSearch } = useApp();

  // If someone deep-links here without a search, send them to Discover.
  useEffect(() => {
    if (!searching && !result && !searchError && !query) {
      navigate('/', { replace: true });
    }
  }, [searching, result, searchError, query, navigate]);

  return (
    <div className="mx-auto max-w-lg pb-28">
      <header className="safe-top sticky top-0 z-30 flex items-center gap-2 border-b border-hair/[0.05] bg-bg/92 px-3 pb-3 backdrop-blur-xl">
        <button onClick={() => navigate('/')} className="icon-btn shrink-0" aria-label="Back">
          <BackIcon />
        </button>
        <div className="flex-1">
          <SearchBar initial={query} onSubmit={doSearch} compact />
        </div>
      </header>

      {searching && <ResultsSkeleton />}

      {!searching && searchError && (
        <EmptyState
          icon="⚠️"
          title="Search failed"
          subtitle={searchError}
          action={
            <button className="btn-primary" onClick={() => doSearch(query)}>
              Retry
            </button>
          }
        />
      )}

      {!searching && !searchError && result && (
        <>
          {result.totalCount === 0 ? (
            <EmptyState
              icon="🔍"
              title="No matches yet"
              subtitle={`We couldn't find ecosystem results for "${result.query}". Try a broader domain like "AI", "climate" or "fintech".`}
              action={
                <button className="btn-ghost" onClick={() => navigate('/')}>
                  New search
                </button>
              }
            />
          ) : (
            <>
              <AIInsightPanel insight={result.insight} />
              <div className="px-4 pb-1 pt-5">
                <p className="text-sm font-bold text-ink">
                  {result.totalCount} results
                  <span className="font-medium text-ink-faint">
                    {' '}
                    across {result.sections.length} categories
                  </span>
                </p>
              </div>
              <div className="space-y-7 pt-3">
                {result.sections.map((section, i) => (
                  <CategorySection
                    key={section.meta.key}
                    meta={section.meta}
                    items={section.items}
                    index={i}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="m15 6-6 6 6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
