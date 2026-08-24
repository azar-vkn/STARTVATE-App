-- ============================================================================
-- STARTVATE — initial schema
--
-- Tables: profiles, projects, posts, post_likes, post_comments
-- Every table has Row Level Security ON. The policies below are the only way
-- data is reachable, so a leaked anon key cannot read or write anything a
-- signed-in user shouldn't be able to.
--
-- Run in the Supabase SQL editor, or `supabase db push` with the CLI.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- profiles — 1:1 with auth.users, created automatically on signup
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users on delete cascade,
  name          text not null default '',
  headline      text not null default '',
  bio           text not null default '',
  location      text not null default '',
  avatar_color  text not null default 'brand',
  avatar_url    text,
  skills        text[] not null default '{}',
  interests     text[] not null default '{}',
  startup       text,
  stage         text not null default 'exploring',
  looking_for   text[] not null default '{}',
  requirements  text not null default '',
  portfolio_url text,
  domains       text[] not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint profiles_stage_check check (
    stage in ('exploring','ideating','building-mvp','launched','scaling','fundraising')
  ),
  constraint profiles_name_len check (char_length(name) <= 80),
  constraint profiles_bio_len check (char_length(bio) <= 1000)
);

comment on table public.profiles is 'Builder profiles, one per authenticated user.';

-- ---------------------------------------------------------------------------
-- projects — things a builder has built
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles on delete cascade,
  name       text not null,
  one_liner  text not null default '',
  link       text,
  position   int  not null default 0,
  created_at timestamptz not null default now(),

  constraint projects_name_len check (char_length(name) between 1 and 120)
);

create index if not exists projects_profile_idx on public.projects (profile_id, position);

-- ---------------------------------------------------------------------------
-- posts — the Builder Feed
-- ---------------------------------------------------------------------------
create table if not exists public.posts (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid not null references public.profiles on delete cascade,
  type       text not null,
  body       text not null,
  tags       text[] not null default '{}',
  created_at timestamptz not null default now(),

  constraint posts_type_check check (
    type in ('idea','launch','looking-for-cofounder','hiring','progress',
             'question','feedback','opportunity','showcase')
  ),
  constraint posts_body_len check (char_length(body) between 1 and 2000)
);

-- Feed is read newest-first; this index serves that directly.
create index if not exists posts_created_idx on public.posts (created_at desc);
create index if not exists posts_author_idx  on public.posts (author_id, created_at desc);
create index if not exists posts_type_idx    on public.posts (type, created_at desc);

-- ---------------------------------------------------------------------------
-- post_likes — composite PK prevents double-liking without extra logic
-- ---------------------------------------------------------------------------
create table if not exists public.post_likes (
  post_id    uuid not null references public.posts    on delete cascade,
  user_id    uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists post_likes_user_idx on public.post_likes (user_id);

-- ---------------------------------------------------------------------------
-- post_comments
-- ---------------------------------------------------------------------------
create table if not exists public.post_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts    on delete cascade,
  author_id  uuid not null references public.profiles on delete cascade,
  body       text not null,
  created_at timestamptz not null default now(),

  constraint comments_body_len check (char_length(body) between 1 and 1000)
);

create index if not exists post_comments_post_idx on public.post_comments (post_id, created_at);

-- ============================================================================
-- Auto-provision a profile whenever a user signs up.
-- Google gives us name and avatar in raw_user_meta_data — seed them so the
-- profile is never empty on first launch.
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, ''), '@', 1),
      'Builder'
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep updated_at honest.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles      enable row level security;
alter table public.projects      enable row level security;
alter table public.posts         enable row level security;
alter table public.post_likes    enable row level security;
alter table public.post_comments enable row level security;

-- profiles: public directory, but you may only edit your own.
drop policy if exists "profiles are viewable by everyone"  on public.profiles;
drop policy if exists "users can insert their own profile" on public.profiles;
drop policy if exists "users can update their own profile" on public.profiles;

create policy "profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "users can update their own profile"
  on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- projects: readable by all, writable only by their owner.
drop policy if exists "projects are viewable by everyone" on public.projects;
drop policy if exists "users manage their own projects"   on public.projects;

create policy "projects are viewable by everyone"
  on public.projects for select using (true);

create policy "users manage their own projects"
  on public.projects for all
  using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- posts: public feed; authors control their own posts.
drop policy if exists "posts are viewable by everyone" on public.posts;
drop policy if exists "users can create their posts"   on public.posts;
drop policy if exists "users can update their posts"   on public.posts;
drop policy if exists "users can delete their posts"   on public.posts;

create policy "posts are viewable by everyone"
  on public.posts for select using (true);

create policy "users can create their posts"
  on public.posts for insert with check (auth.uid() = author_id);

create policy "users can update their posts"
  on public.posts for update using (auth.uid() = author_id) with check (auth.uid() = author_id);

create policy "users can delete their posts"
  on public.posts for delete using (auth.uid() = author_id);

-- likes: counts are public; you may only like as yourself.
drop policy if exists "likes are viewable by everyone" on public.post_likes;
drop policy if exists "users can like"                 on public.post_likes;
drop policy if exists "users can unlike"               on public.post_likes;

create policy "likes are viewable by everyone"
  on public.post_likes for select using (true);

create policy "users can like"
  on public.post_likes for insert with check (auth.uid() = user_id);

create policy "users can unlike"
  on public.post_likes for delete using (auth.uid() = user_id);

-- comments
drop policy if exists "comments are viewable by everyone" on public.post_comments;
drop policy if exists "users can comment"                 on public.post_comments;
drop policy if exists "users can delete their comments"   on public.post_comments;

create policy "comments are viewable by everyone"
  on public.post_comments for select using (true);

create policy "users can comment"
  on public.post_comments for insert with check (auth.uid() = author_id);

create policy "users can delete their comments"
  on public.post_comments for delete using (auth.uid() = author_id);

-- ============================================================================
-- Feed view — posts joined with author info and engagement counts.
-- security_invoker makes the underlying tables' RLS apply to the caller,
-- rather than the view owner's rights. Without it a view silently bypasses RLS.
-- ============================================================================
create or replace view public.feed_posts
with (security_invoker = true) as
select
  p.id,
  p.author_id,
  p.type,
  p.body,
  p.tags,
  p.created_at,
  pr.name         as author_name,
  pr.headline     as author_headline,
  pr.avatar_color as avatar_color,
  pr.avatar_url   as avatar_url,
  (select count(*) from public.post_likes    l where l.post_id = p.id) as likes,
  (select count(*) from public.post_comments c where c.post_id = p.id) as comments
from public.posts p
join public.profiles pr on pr.id = p.author_id;

comment on view public.feed_posts is 'Feed posts with author details and engagement counts.';
