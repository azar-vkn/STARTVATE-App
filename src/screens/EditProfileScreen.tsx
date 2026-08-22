import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/store/appStore';
import { Avatar } from '@/components/Avatar';
import {
  STAGES,
  STAGE_META,
  LOOKING_FOR_OPTIONS,
  LOOKING_FOR_META,
  AVATAR_GRADIENTS,
} from '@/lib/format';
import { domainLabel } from '@/services/nlp';
import type { BuilderProfile, BuilderStage, LookingFor, BuilderProject } from '@/types';

const DOMAIN_OPTIONS = [
  'agriculture',
  'ai',
  'fintech',
  'payments',
  'healthtech',
  'biotech',
  'climate',
  'energy',
  'edtech',
  'robotics',
  'saas',
  'iot',
  'mobility',
  'geospatial',
];

/** Parse a comma/newline separated string into a clean list. */
function toList(v: string): string[] {
  return v
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);
}

export function EditProfileScreen() {
  const navigate = useNavigate();
  const profile = useApp((s) => s.profile);
  const saveProfile = useApp((s) => s.saveProfile);

  const [draft, setDraft] = useState<BuilderProfile>(profile);
  const [skillsText, setSkillsText] = useState(profile.skills.join(', '));
  const [interestsText, setInterestsText] = useState(profile.interests.join(', '));
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof BuilderProfile>(key: K, value: BuilderProfile[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const toggleLookingFor = (l: LookingFor) =>
    set(
      'lookingFor',
      draft.lookingFor.includes(l)
        ? draft.lookingFor.filter((x) => x !== l)
        : [...draft.lookingFor, l],
    );

  const toggleDomain = (d: string) =>
    set('domains', draft.domains.includes(d) ? draft.domains.filter((x) => x !== d) : [...draft.domains, d]);

  const addProject = () =>
    set('projects', [
      ...draft.projects,
      { id: `pr-${Date.now()}`, name: '', oneLiner: '' },
    ]);

  const updateProject = (id: string, patch: Partial<BuilderProject>) =>
    set(
      'projects',
      draft.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    );

  const removeProject = (id: string) =>
    set('projects', draft.projects.filter((p) => p.id !== id));

  const canSave = draft.name.trim().length > 0 && !saving;

  const submit = async () => {
    if (!canSave) return;
    setSaving(true);
    await saveProfile({
      ...draft,
      name: draft.name.trim(),
      skills: toList(skillsText),
      interests: toList(interestsText),
      projects: draft.projects.filter((p) => p.name.trim()),
    });
    navigate('/profile');
  };

  return (
    <div className="mx-auto max-w-lg pb-10">
      <header className="safe-top sticky top-0 z-30 flex items-center justify-between border-b border-hair/[0.05] bg-bg/92 px-4 pb-3 backdrop-blur-xl">
        <button onClick={() => navigate(-1)} className="text-sm font-semibold text-ink-muted">
          Cancel
        </button>
        <span className="text-sm font-bold text-ink">Edit profile</span>
        <button
          onClick={submit}
          disabled={!canSave}
          className="grad-primary rounded-full px-5 py-2 text-sm font-bold text-white disabled:opacity-30"
        >
          Save
        </button>
      </header>

      <div className="space-y-6 px-4 pt-5">
        {/* Avatar color picker */}
        <div className="flex flex-col items-center">
          <Avatar name={draft.name || '?'} seed={draft.avatarColor} size={80} />
          <div className="mt-3 flex gap-2">
            {Object.keys(AVATAR_GRADIENTS).map((seed) => (
              <button
                key={seed}
                onClick={() => set('avatarColor', seed)}
                className={`h-8 w-8 rounded-full transition active:scale-90 ${
                  draft.avatarColor === seed ? 'ring-2 ring-primary ring-offset-2 ring-offset-bg' : ''
                }`}
                style={{ background: AVATAR_GRADIENTS[seed] }}
                aria-label={`Avatar color ${seed}`}
              />
            ))}
          </div>
        </div>

        <Field label="Name">
          <input
            className="input"
            value={draft.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Your full name"
          />
        </Field>

        <Field label="Headline">
          <input
            className="input"
            value={draft.headline}
            onChange={(e) => set('headline', e.target.value)}
            placeholder="e.g. Founder, TerraSense · Agri AI"
          />
        </Field>

        <Field label="Bio">
          <textarea
            className="input min-h-[100px] resize-none leading-relaxed"
            value={draft.bio}
            maxLength={400}
            onChange={(e) => set('bio', e.target.value)}
            placeholder="What are you building, and what drives you?"
          />
        </Field>

        <Field label="Location">
          <input
            className="input"
            value={draft.location}
            onChange={(e) => set('location', e.target.value)}
            placeholder="City, Country or Remote"
          />
        </Field>

        <Field label="Startup / project name">
          <input
            className="input"
            value={draft.startup ?? ''}
            onChange={(e) => set('startup', e.target.value || undefined)}
            placeholder="Optional"
          />
        </Field>

        <Field label="Current stage">
          <div className="flex flex-wrap gap-2">
            {STAGES.map((s: BuilderStage) => (
              <button
                key={s}
                onClick={() => set('stage', s)}
                className={`chip ${draft.stage === s ? 'chip-active' : ''}`}
              >
                {STAGE_META[s]}
              </button>
            ))}
          </div>
        </Field>

        <Field label="What are you looking for?">
          <div className="flex flex-wrap gap-2">
            {LOOKING_FOR_OPTIONS.map((l) => (
              <button
                key={l}
                onClick={() => toggleLookingFor(l)}
                className={`chip ${draft.lookingFor.includes(l) ? 'chip-active' : ''}`}
              >
                {LOOKING_FOR_META[l]}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Co-founder / mentor / investor requirements">
          <textarea
            className="input min-h-[80px] resize-none leading-relaxed"
            value={draft.requirements}
            maxLength={300}
            onChange={(e) => set('requirements', e.target.value)}
            placeholder="Be specific about who you need and why."
          />
        </Field>

        <Field label="Skills (comma separated)">
          <input
            className="input"
            value={skillsText}
            onChange={(e) => setSkillsText(e.target.value)}
            placeholder="Product, Python, GTM, Design"
          />
        </Field>

        <Field label="Interests (comma separated)">
          <input
            className="input"
            value={interestsText}
            onChange={(e) => setInterestsText(e.target.value)}
            placeholder="Regenerative farming, Edge AI"
          />
        </Field>

        <Field label="Areas you want to work in">
          <div className="flex flex-wrap gap-2">
            {DOMAIN_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => toggleDomain(d)}
                className={`chip ${draft.domains.includes(d) ? 'chip-active' : ''}`}
              >
                {domainLabel(d)}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Projects">
          <div className="space-y-2.5">
            {draft.projects.map((p) => (
              <div key={p.id} className="card space-y-2 p-3.5">
                <div className="flex items-center gap-2">
                  <input
                    className="input flex-1 py-2"
                    value={p.name}
                    onChange={(e) => updateProject(p.id, { name: e.target.value })}
                    placeholder="Project name"
                  />
                  <button
                    onClick={() => removeProject(p.id)}
                    className="icon-btn shrink-0"
                    aria-label="Remove project"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="m9 9 6 6M15 9l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
                <input
                  className="input py-2"
                  value={p.oneLiner}
                  onChange={(e) => updateProject(p.id, { oneLiner: e.target.value })}
                  placeholder="One line about it"
                />
              </div>
            ))}
            <button onClick={addProject} className="btn-ghost w-full">
              + Add project
            </button>
          </div>
        </Field>

        <Field label="Portfolio URL">
          <input
            className="input"
            value={draft.portfolioUrl ?? ''}
            onChange={(e) => set('portfolioUrl', e.target.value || undefined)}
            placeholder="https://…"
            inputMode="url"
          />
        </Field>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="label">{label}</p>
      {children}
    </div>
  );
}
