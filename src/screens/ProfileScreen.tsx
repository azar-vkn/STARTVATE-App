import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/store/appStore';
import { Avatar } from '@/components/Avatar';
import { ThemeSegmented } from '@/components/ThemeToggle';
import { EXAMPLE_PROFILE } from '@/data/seed';
import { STAGE_META, LOOKING_FOR_META } from '@/lib/format';
import { domainLabel } from '@/services/nlp';
import type { BuilderProfile } from '@/types';

type Tab = 'about' | 'projects' | 'settings';

export function ProfileScreen() {
  const navigate = useNavigate();
  const profile = useApp((s) => s.profile);
  const saveProfile = useApp((s) => s.saveProfile);
  const posts = useApp((s) => s.posts);
  const [tab, setTab] = useState<Tab>('about');

  const isEmpty = profile.skills.length === 0 && profile.name === 'Your Name';
  const myPosts = posts.filter((p) => p.authorId === profile.id).length;

  return (
    <div className="mx-auto max-w-lg pb-28">
      {/* Gradient cover banner, as in the design */}
      <div className="grad-primary relative h-32">
        <div className="safe-top flex items-start justify-between px-4">
          <button
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/25 text-white backdrop-blur active:scale-95"
            aria-label="Back"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="m15 6-6 6 6 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            onClick={() => navigate('/profile/edit')}
            className="flex h-9 items-center gap-1.5 rounded-full bg-white/25 px-4 text-xs font-bold text-white backdrop-blur active:scale-95"
          >
            {isEmpty ? 'Set up' : 'Edit'}
          </button>
        </div>
      </div>

      {/* Avatar overlapping the banner */}
      <div className="-mt-12 flex flex-col items-center px-4">
        <div className="rounded-full bg-bg p-1.5">
          <Avatar name={profile.name} seed={profile.avatarColor} size={92} />
        </div>
        <h2 className="mt-3 text-xl font-extrabold text-ink">{profile.name}</h2>
        <p className="mt-0.5 text-center text-sm text-ink-muted">{profile.headline}</p>
        <p className="mt-1 text-xs text-ink-faint">📍 {profile.location}</p>

        {/* Stats row */}
        <div className="mt-5 flex w-full items-center justify-around">
          <Stat value={String(profile.projects.length)} label="Projects" />
          <Divider />
          <Stat value={String(profile.skills.length)} label="Skills" />
          <Divider />
          <Stat value={String(myPosts)} label="Posts" />
        </div>

        {/* Action pills */}
        <div className="mt-5 flex w-full gap-2.5">
          <button className="btn-primary flex-1" onClick={() => navigate('/feed/new')}>
            Share update
          </button>
          <button className="btn-ghost flex-1" onClick={() => navigate('/profile/edit')}>
            Edit profile
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex border-b border-hair/[0.06] px-4">
        {(['about', 'projects', 'settings'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 pb-3 text-sm font-bold capitalize transition ${
              tab === t
                ? 'border-b-2 border-primary text-primary'
                : 'border-b-2 border-transparent text-ink-faint'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="px-4 pt-5">
        {tab === 'about' &&
          (isEmpty ? (
            <SetupPrompt
              onFillExample={() => saveProfile({ ...EXAMPLE_PROFILE, id: 'me' })}
              onEdit={() => navigate('/profile/edit')}
            />
          ) : (
            <AboutTab profile={profile} />
          ))}

        {tab === 'projects' && <ProjectsTab profile={profile} onEdit={() => navigate('/profile/edit')} />}

        {tab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="text-lg font-extrabold text-ink">{value}</p>
      <p className="text-[11px] font-semibold text-ink-faint">{label}</p>
    </div>
  );
}

function Divider() {
  return <span className="h-8 w-px bg-hair/[0.08]" />;
}

function AboutTab({ profile }: { profile: BuilderProfile }) {
  return (
    <div className="space-y-5">
      <div className="card p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          <span className="chip chip-active">🌱 {STAGE_META[profile.stage]}</span>
          {profile.startup && <span className="chip">🏢 {profile.startup}</span>}
        </div>
        {profile.bio && (
          <p className="text-[13px] leading-relaxed text-ink-muted">{profile.bio}</p>
        )}
      </div>

      {profile.lookingFor.length > 0 && (
        <Section title="Looking for">
          <div className="flex flex-wrap gap-2">
            {profile.lookingFor.map((l) => (
              <span key={l} className="chip chip-active">
                {LOOKING_FOR_META[l]}
              </span>
            ))}
          </div>
          {profile.requirements && (
            <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">{profile.requirements}</p>
          )}
        </Section>
      )}

      {profile.skills.length > 0 && (
        <Section title="Skills">
          <TagRow items={profile.skills} />
        </Section>
      )}

      {profile.domains.length > 0 && (
        <Section title="Areas of interest">
          <div className="flex flex-wrap gap-2">
            {profile.domains.map((d) => (
              <span key={d} className="chip">
                {domainLabel(d)}
              </span>
            ))}
          </div>
        </Section>
      )}

      {profile.interests.length > 0 && (
        <Section title="Interests">
          <TagRow items={profile.interests} />
        </Section>
      )}
    </div>
  );
}

function ProjectsTab({ profile, onEdit }: { profile: BuilderProfile; onEdit: () => void }) {
  if (profile.projects.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-3xl">🧩</p>
        <p className="mt-3 text-sm font-bold text-ink">No projects yet</p>
        <p className="mt-1.5 text-[13px] text-ink-muted">
          Add what you've built so collaborators can see your work.
        </p>
        <button className="btn-primary mt-5" onClick={onEdit}>
          Add a project
        </button>
      </div>
    );
  }
  return (
    <div className="space-y-2.5">
      {profile.projects.map((p) => (
        <div key={p.id} className="card p-4">
          <p className="text-sm font-bold text-ink">{p.name}</p>
          <p className="mt-0.5 text-[13px] text-ink-muted">{p.oneLiner}</p>
        </div>
      ))}
      {profile.portfolioUrl && (
        <a
          href={profile.portfolioUrl}
          target="_blank"
          rel="noreferrer"
          className="card flex items-center gap-2 p-4 text-sm font-bold text-primary"
        >
          🔗 View portfolio
        </a>
      )}
    </div>
  );
}

function SettingsTab() {
  return (
    <div className="space-y-5">
      <div>
        <p className="label">Appearance</p>
        <ThemeSegmented />
        <p className="mt-2 text-[12px] leading-relaxed text-ink-faint">
          "System" follows your phone's light or dark setting automatically.
        </p>
      </div>

      <div className="card divide-y divide-hair/[0.05]">
        <Row label="Version" value="1.0.0" />
        <Row label="Storage" value="On device" />
      </div>

      <p className="px-1 text-center text-[11px] leading-relaxed text-ink-faint">
        STARTVATE — the discovery and networking layer for the startup ecosystem.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <span className="text-sm text-ink">{label}</span>
      <span className="text-sm font-semibold text-ink-faint">{value}</span>
    </div>
  );
}

function SetupPrompt({
  onFillExample,
  onEdit,
}: {
  onFillExample: () => void;
  onEdit: () => void;
}) {
  return (
    <div>
      <div className="card p-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/12 text-2xl">
          🧑‍🚀
        </div>
        <h2 className="text-base font-extrabold text-ink">Create your Builder Profile</h2>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-ink-muted">
          A clear profile helps STARTVATE surface the right co-founders, mentors and opportunities
          for you — and helps them find you.
        </p>
        <button className="btn-primary mt-5 w-full" onClick={onEdit}>
          Build my profile
        </button>
        <button
          className="mt-3 w-full text-xs font-bold text-ink-faint active:text-ink"
          onClick={onFillExample}
        >
          Load an example profile to explore
        </button>
      </div>

      <div className="mt-6">
        <p className="mb-2.5 text-xs font-bold uppercase tracking-wide text-ink-faint">
          A Builder Profile shows
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          {[
            'Skills',
            'Interests',
            'Startup & stage',
            'What you seek',
            'Projects',
            'Portfolio',
            'Location',
            'Focus areas',
          ].map((t) => (
            <div key={t} className="card px-3.5 py-3 text-[13px] font-semibold text-ink">
              {t}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="mb-2.5 text-xs font-bold uppercase tracking-wide text-ink-faint">{title}</p>
      {children}
    </section>
  );
}

function TagRow({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((t) => (
        <span key={t} className="chip">
          {t}
        </span>
      ))}
    </div>
  );
}
