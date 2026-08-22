import type { FeedPost } from '@/types';
import { Avatar } from './Avatar';
import { timeAgo, POST_TYPE_META } from '@/lib/format';

interface Props {
  post: FeedPost;
  onLike: (id: string) => void;
}

export function PostCard({ post, onLike }: Props) {
  const meta = POST_TYPE_META[post.type];
  const handle = '@' + post.authorName.toLowerCase().replace(/\s+/g, '');

  return (
    <article className="card overflow-hidden">
      <header className="flex items-center gap-3 px-4 pt-4">
        <Avatar name={post.authorName} seed={post.avatarColor} size={42} ring />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-ink">{post.authorName}</p>
          <p className="truncate text-xs text-ink-faint">{handle}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={`rounded-full bg-hair/[0.05] px-2.5 py-1 text-[11px] font-bold ${meta.color}`}
          >
            {meta.icon} {meta.label}
          </span>
          <span className="text-[11px] text-ink-faint">{timeAgo(post.createdAt)}</span>
        </div>
      </header>

      <p className="whitespace-pre-wrap px-4 pt-3 text-[14px] leading-relaxed text-ink/85">
        {post.body}
      </p>

      {post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pt-3">
          {post.tags.map((t) => (
            <span key={t} className="text-xs font-semibold text-primary">
              #{t}
            </span>
          ))}
        </div>
      )}

      <footer className="mt-4 flex items-center gap-4 border-t border-hair/[0.05] px-4 py-3">
        <button
          onClick={() => onLike(post.id)}
          className={`flex items-center gap-1.5 text-xs font-bold transition active:scale-90 ${
            post.liked ? 'text-rose' : 'text-ink-faint'
          }`}
        >
          <HeartIcon filled={!!post.liked} /> {post.likes}
        </button>
        <span className="flex items-center gap-1.5 text-xs font-bold text-ink-faint">
          <CommentIcon /> {post.comments}
        </span>
        <button className="ml-auto grad-primary rounded-full px-3.5 py-1.5 text-xs font-bold text-white active:scale-95">
          Connect
        </button>
      </footer>
    </article>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'}>
      <path
        d="M12 20s-7-4.35-7-9.5A3.5 3.5 0 0 1 12 7a3.5 3.5 0 0 1 7 3.5C19 15.65 12 20 12 20Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function CommentIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v8A1.5 1.5 0 0 1 18.5 15H9l-4 4z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
