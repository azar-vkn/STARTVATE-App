import { useState, type FormEvent } from 'react';

interface Props {
  initial?: string;
  onSubmit: (q: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  compact?: boolean;
}

export function SearchBar({
  initial = '',
  onSubmit,
  placeholder = 'Search a startup idea, domain, or person…',
  autoFocus = false,
  compact = false,
}: Props) {
  const [value, setValue] = useState(initial);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (q) onSubmit(q);
    (document.activeElement as HTMLElement | null)?.blur();
  };

  return (
    <form onSubmit={submit}>
      <div
        className={`flex items-center gap-2.5 rounded-full border border-hair/[0.08] bg-surface dark:bg-elevated ${
          compact ? 'px-4 py-2.5' : 'px-5 py-3.5 shadow-card'
        } transition focus-within:border-primary/60`}
      >
        <SearchIcon />
        <input
          className="w-full bg-transparent text-[15px] text-ink placeholder:text-ink-faint outline-none"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          enterKeyHint="search"
          inputMode="search"
          aria-label="Search the startup ecosystem"
        />
        {value && (
          <button
            type="button"
            onClick={() => setValue('')}
            className="text-ink-faint active:text-ink"
            aria-label="Clear"
          >
            <ClearIcon />
          </button>
        )}
        {!compact && (
          <button
            type="submit"
            className="grad-primary rounded-full px-4 py-2 text-sm font-semibold text-white active:scale-95"
          >
            Go
          </button>
        )}
      </div>
    </form>
  );
}

function SearchIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" className="text-ink-faint" />
      <path
        d="m20 20-3.5-3.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="text-ink-faint"
      />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.18" />
      <path d="m9 9 6 6M15 9l-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
