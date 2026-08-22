import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/store/appStore';
import { PostCard } from '@/components/PostCard';
import { ThemeToggle } from '@/components/ThemeToggle';
import { POST_TYPE_META, POST_TYPES } from '@/lib/format';
import type { PostType } from '@/types';

export function FeedScreen() {
  const navigate = useNavigate();
  const posts = useApp((s) => s.posts);
  const toggleLike = useApp((s) => s.toggleLike);
  const [filter, setFilter] = useState<PostType | 'all'>('all');

  const visible = useMemo(
    () => (filter === 'all' ? posts : posts.filter((p) => p.type === filter)),
    [posts, filter],
  );

  return (
    <div className="mx-auto max-w-lg pb-28">
      <header className="safe-top sticky top-0 z-30 border-b border-hair/[0.05] bg-bg/92 px-4 pb-3 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-ink">Builder Feed</h1>
            <p className="text-[11px] text-ink-faint">Build · Collaborate · Grow</p>
          </div>
          <ThemeToggle />
        </div>
        <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
          <button
            className={`chip whitespace-nowrap ${filter === 'all' ? 'chip-active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          {POST_TYPES.map((t) => (
            <button
              key={t}
              className={`chip whitespace-nowrap ${filter === t ? 'chip-active' : ''}`}
              onClick={() => setFilter(t)}
            >
              {POST_TYPE_META[t].icon} {POST_TYPE_META[t].label}
            </button>
          ))}
        </div>
      </header>

      <div className="space-y-3.5 px-4 pt-4">
        {visible.map((post) => (
          <PostCard key={post.id} post={post} onLike={toggleLike} />
        ))}
        {visible.length === 0 && (
          <p className="py-16 text-center text-sm text-ink-muted">
            No{' '}
            {filter === 'all' ? '' : POST_TYPE_META[filter as PostType].label.toLowerCase()} posts
            yet.
          </p>
        )}
      </div>

      {/* Floating compose button */}
      <button
        onClick={() => navigate('/feed/new')}
        className="grad-primary fixed bottom-24 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-pop active:scale-95"
        aria-label="Create post"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
