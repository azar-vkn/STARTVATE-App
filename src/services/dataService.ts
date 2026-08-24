import { requireSupabase } from './supabase';
import type {
  BuilderProfile,
  BuilderStage,
  LookingFor,
  FeedPost,
  PostType,
  BuilderProject,
} from '@/types';
import type { ProfileRow, ProjectRow, FeedPostRow } from '@/types/database';

// ============================================================================
// Supabase data access.
//
// The database uses snake_case; the app uses camelCase. All translation lives
// here so screens and stores only ever see app-shaped types.
// ============================================================================

const STAGES: BuilderStage[] = [
  'exploring', 'ideating', 'building-mvp', 'launched', 'scaling', 'fundraising',
];
const LOOKING: LookingFor[] = [
  'co-founder', 'team-member', 'mentor', 'investor', 'customers', 'feedback',
];
const POST_TYPES: PostType[] = [
  'idea', 'launch', 'looking-for-cofounder', 'hiring', 'progress',
  'question', 'feedback', 'opportunity', 'showcase',
];

/** Coerce free-form DB text into a known union, falling back to a safe value. */
function asEnum<T extends string>(value: string, allowed: T[], fallback: T): T {
  return (allowed as string[]).includes(value) ? (value as T) : fallback;
}

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

function toProfile(row: ProfileRow, projects: ProjectRow[]): BuilderProfile {
  return {
    id: row.id,
    name: row.name || 'Builder',
    headline: row.headline,
    bio: row.bio,
    location: row.location,
    avatarColor: row.avatar_color || 'brand',
    skills: row.skills ?? [],
    interests: row.interests ?? [],
    startup: row.startup ?? undefined,
    stage: asEnum(row.stage, STAGES, 'exploring'),
    lookingFor: (row.looking_for ?? []).filter((l): l is LookingFor =>
      (LOOKING as string[]).includes(l),
    ),
    requirements: row.requirements,
    projects: projects.map<BuilderProject>((p) => ({
      id: p.id,
      name: p.name,
      oneLiner: p.one_liner,
      link: p.link ?? undefined,
    })),
    portfolioUrl: row.portfolio_url ?? undefined,
    domains: row.domains ?? [],
  };
}

export async function fetchProfile(userId: string): Promise<BuilderProfile | null> {
  const sb = requireSupabase();

  const [{ data: profile, error }, { data: projects }] = await Promise.all([
    sb.from('profiles').select('*').eq('id', userId).maybeSingle(),
    sb.from('projects').select('*').eq('profile_id', userId).order('position'),
  ]);

  if (error) throw error;
  if (!profile) return null;

  return toProfile(profile as ProfileRow, (projects ?? []) as ProjectRow[]);
}

export async function saveProfileRemote(
  userId: string,
  profile: BuilderProfile,
): Promise<void> {
  const sb = requireSupabase();

  const { error } = await sb.from('profiles').update({
    name: profile.name,
    headline: profile.headline,
    bio: profile.bio,
    location: profile.location,
    avatar_color: profile.avatarColor,
    skills: profile.skills,
    interests: profile.interests,
    startup: profile.startup ?? null,
    stage: profile.stage,
    looking_for: profile.lookingFor,
    requirements: profile.requirements,
    portfolio_url: profile.portfolioUrl ?? null,
    domains: profile.domains,
  }).eq('id', userId);

  if (error) throw error;

  // Projects are a small, fully-owned list — replace rather than diff.
  const { error: delErr } = await sb.from('projects').delete().eq('profile_id', userId);
  if (delErr) throw delErr;

  if (profile.projects.length > 0) {
    const { error: insErr } = await sb.from('projects').insert(
      profile.projects.map((p, i) => ({
        profile_id: userId,
        name: p.name,
        one_liner: p.oneLiner,
        link: p.link ?? null,
        position: i,
      })),
    );
    if (insErr) throw insErr;
  }
}

// ---------------------------------------------------------------------------
// Feed
// ---------------------------------------------------------------------------

function toPost(row: FeedPostRow, likedIds: Set<string>): FeedPost {
  return {
    id: row.id,
    authorId: row.author_id,
    authorName: row.author_name || 'Builder',
    authorHeadline: row.author_headline,
    avatarColor: row.avatar_color || 'brand',
    type: asEnum(row.type, POST_TYPES, 'idea'),
    body: row.body,
    tags: row.tags ?? [],
    createdAt: new Date(row.created_at).getTime(),
    likes: Number(row.likes) || 0,
    comments: Number(row.comments) || 0,
    liked: likedIds.has(row.id),
  };
}

export async function fetchFeed(userId: string | null, limit = 50): Promise<FeedPost[]> {
  const sb = requireSupabase();

  const { data, error } = await sb
    .from('feed_posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  const rows = (data ?? []) as FeedPostRow[];

  // Fetch the viewer's likes in one query so cards render the correct state.
  let likedIds = new Set<string>();
  if (userId && rows.length > 0) {
    const { data: likes } = await sb
      .from('post_likes')
      .select('post_id')
      .eq('user_id', userId)
      .in('post_id', rows.map((r) => r.id));
    likedIds = new Set((likes ?? []).map((l) => l.post_id));
  }

  return rows.map((r) => toPost(r, likedIds));
}

export async function createPost(
  userId: string,
  input: { type: PostType; body: string; tags: string[] },
): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from('posts').insert({
    author_id: userId,
    type: input.type,
    body: input.body,
    tags: input.tags,
  });
  if (error) throw error;
}

/** Insert or delete a like. The composite PK makes double-likes impossible. */
export async function setLike(
  userId: string,
  postId: string,
  liked: boolean,
): Promise<void> {
  const sb = requireSupabase();

  if (liked) {
    const { error } = await sb.from('post_likes').insert({ post_id: postId, user_id: userId });
    // 23505 = unique violation: already liked, which is the desired end state.
    if (error && error.code !== '23505') throw error;
  } else {
    const { error } = await sb
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);
    if (error) throw error;
  }
}
