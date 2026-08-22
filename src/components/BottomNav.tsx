import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/', label: 'Discover', icon: DiscoverIcon, end: true },
  { to: '/feed', label: 'Feed', icon: FeedIcon, end: false },
  { to: '/ask', label: 'Ask AI', icon: AskIcon, end: false },
  { to: '/profile', label: 'Profile', icon: ProfileIcon, end: false },
];

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-hair/[0.06] bg-surface/90 backdrop-blur-xl safe-bottom dark:bg-surface/85">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 pt-2">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className="flex flex-1 flex-col items-center gap-1 py-1"
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex h-9 w-14 items-center justify-center rounded-full transition ${
                    isActive ? 'bg-primary/12' : ''
                  }`}
                >
                  <tab.icon active={isActive} />
                </span>
                <span
                  className={`text-[10px] font-semibold ${
                    isActive ? 'text-primary' : 'text-ink-faint'
                  }`}
                >
                  {tab.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

type IconProps = { active: boolean };

/** Icons inherit color via currentColor so they follow the theme. */
function wrap(active: boolean) {
  return active ? 'text-primary' : 'text-ink-faint';
}

function DiscoverIcon({ active }: IconProps) {
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" className={wrap(active)}>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function FeedIcon({ active }: IconProps) {
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" className={wrap(active)}>
      <rect x="3" y="4" width="18" height="4.5" rx="1.8" stroke="currentColor" strokeWidth="2" />
      <rect x="3" y="11.5" width="18" height="8.5" rx="1.8" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
function AskIcon({ active }: IconProps) {
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" className={wrap(active)}>
      <path
        d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9A1.5 1.5 0 0 1 18.5 16H9l-4 4v-4H5.5A1.5 1.5 0 0 1 4 14.5z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="1" fill="currentColor" />
      <circle cx="8" cy="10" r="1" fill="currentColor" />
      <circle cx="16" cy="10" r="1" fill="currentColor" />
    </svg>
  );
}
function ProfileIcon({ active }: IconProps) {
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" className={wrap(active)}>
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="2" />
      <path d="M5 20a7 7 0 0 1 14 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
