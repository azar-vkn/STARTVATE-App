import { useTheme, type ThemePref } from '@/store/themeStore';

/** Compact icon button that cycles light → dark → system. */
export function ThemeToggle() {
  const pref = useTheme((s) => s.pref);
  const toggle = useTheme((s) => s.toggle);

  return (
    <button onClick={toggle} className="icon-btn" aria-label={`Theme: ${pref}`} title={`Theme: ${pref}`}>
      <ThemeIcon pref={pref} />
    </button>
  );
}

/** Segmented control for the settings/profile screen. */
export function ThemeSegmented() {
  const pref = useTheme((s) => s.pref);
  const setPref = useTheme((s) => s.setPref);
  const options: { value: ThemePref; label: string }[] = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' },
  ];

  return (
    <div className="flex gap-1 rounded-full border border-hair/[0.08] bg-surface p-1 dark:bg-elevated">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => setPref(o.value)}
          className={`flex-1 rounded-full px-3 py-2 text-xs font-bold transition ${
            pref === o.value ? 'grad-primary text-white' : 'text-ink-muted active:scale-95'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ThemeIcon({ pref }: { pref: ThemePref }) {
  if (pref === 'light') {
    return (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="2" />
        <path
          d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (pref === 'dark') {
    return (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
        <path
          d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4.5" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 20.5h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
