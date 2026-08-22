import type { DiscoveryItem, CategoryMeta } from '@/types';
import { Avatar } from './Avatar';
import { ACCENT_TEXT, ACCENT_BG } from '@/lib/format';

interface Props {
  item: DiscoveryItem;
  meta: CategoryMeta;
}

// Category kinds that represent people get an avatar; others get an icon tile.
const PEOPLE_KINDS = new Set(['founders', 'cofounders', 'mentors']);

export function ResultCard({ item, meta }: Props) {
  const isPerson = PEOPLE_KINDS.has(item.kind);
  const actionLabel = isPerson || item.kind === 'investors' ? 'Connect' : 'View';

  return (
    <div className="card w-[268px] shrink-0 p-4">
      <div className="mb-3 flex items-start gap-3">
        {isPerson ? (
          <Avatar name={item.title} seed={meta.accent} size={44} ring />
        ) : (
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-2xl text-xl ${ACCENT_BG[meta.accent]}`}
          >
            {meta.icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-bold text-ink">{item.title}</h4>
          <p className={`truncate text-xs font-semibold ${ACCENT_TEXT[meta.accent]}`}>
            {item.subtitle}
          </p>
        </div>
      </div>

      <p className="mb-3 line-clamp-3 text-[13px] leading-relaxed text-ink-muted">
        {item.description}
      </p>

      {item.stats && item.stats.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {item.stats.map((s) => (
            <span
              key={s.label}
              className="rounded-full bg-hair/[0.05] px-2.5 py-1 text-[11px] text-ink-muted"
            >
              <span className="text-ink-faint">{s.label} </span>
              <span className="font-bold text-ink">{s.value}</span>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 flex-col gap-0.5">
          {item.location && (
            <span className="flex items-center gap-1 truncate text-[11px] text-ink-faint">
              <PinIcon /> {item.location}
            </span>
          )}
          {item.source && (
            <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
              via {item.source}
            </span>
          )}
        </span>

        {item.link ? (
          <a
            href={item.link}
            target="_blank"
            rel="noreferrer noopener"
            className="grad-primary shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold text-white active:scale-95"
          >
            {actionLabel}
          </a>
        ) : (
          <button className="grad-primary shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold text-white active:scale-95">
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

function PinIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" className="text-ink-faint">
      <path
        d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="12" cy="10" r="2.2" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
