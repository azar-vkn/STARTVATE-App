import type { DiscoveryItem, CategoryMeta } from '@/types';
import { ResultCard } from './ResultCard';
import { ACCENT_BG, ACCENT_TEXT } from '@/lib/format';

interface Props {
  meta: CategoryMeta;
  items: DiscoveryItem[];
  index: number;
}

export function CategorySection({ meta, items, index }: Props) {
  return (
    <section
      className="animate-fade-up"
      style={{ animationDelay: `${Math.min(index * 60, 400)}ms` }}
    >
      <div className="mb-3 flex items-center gap-3 px-4">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-2xl text-lg ${ACCENT_BG[meta.accent]}`}
        >
          {meta.icon}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-bold text-ink">{meta.label}</h3>
          <p className="truncate text-xs text-ink-faint">{meta.blurb}</p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-bold ${ACCENT_BG[meta.accent]} ${ACCENT_TEXT[meta.accent]}`}
        >
          {items.length}
        </span>
      </div>

      <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-2">
        {items.map((item) => (
          <ResultCard key={item.id} item={item} meta={meta} />
        ))}
      </div>
    </section>
  );
}
