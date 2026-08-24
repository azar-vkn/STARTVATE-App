// ============================================================================
// Supabase schema types, mirroring supabase/migrations/0001_init.sql.
//
// Hand-written so the app has no codegen step. If you change the schema,
// regenerate or update these to match:
//   npx supabase gen types typescript --project-id <ref> > src/types/database.ts
//
// NOTE: everything here is a `type` alias, never an `interface`. supabase-js
// constrains rows to `Record<string, unknown>`, and TypeScript only grants
// implicit index signatures to type aliases — an interface fails that
// constraint and silently collapses the client's generics to `never`.
// ============================================================================

export type ProfileRow = {
  id: string;
  name: string;
  headline: string;
  bio: string;
  location: string;
  avatar_color: string;
  avatar_url: string | null;
  skills: string[];
  interests: string[];
  startup: string | null;
  stage: string;
  looking_for: string[];
  requirements: string;
  portfolio_url: string | null;
  domains: string[];
  created_at: string;
  updated_at: string;
};

export type ProjectRow = {
  id: string;
  profile_id: string;
  name: string;
  one_liner: string;
  link: string | null;
  position: number;
  created_at: string;
};

export type PostRow = {
  id: string;
  author_id: string;
  type: string;
  body: string;
  tags: string[];
  created_at: string;
};

export type FeedPostRow = PostRow & {
  author_name: string;
  author_headline: string;
  avatar_color: string;
  avatar_url: string | null;
  likes: number;
  comments: number;
};

export type PostLikeRow = {
  post_id: string;
  user_id: string;
  created_at: string;
};

export type CommentRow = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
};

/**
 * supabase-js requires each table to declare `Relationships`, and the schema to
 * declare `Tables`, `Views` and `Functions`. Omitting any of them makes the
 * client's generics resolve to `never`, which surfaces as confusing
 * "not assignable to parameter of type 'never'" errors at every call site.
 */
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & { id: string };
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      projects: {
        Row: ProjectRow;
        Insert: Omit<ProjectRow, 'id' | 'created_at'> & { id?: string };
        Update: Partial<ProjectRow>;
        Relationships: [];
      };
      posts: {
        Row: PostRow;
        Insert: Omit<PostRow, 'id' | 'created_at'> & { id?: string };
        Update: Partial<PostRow>;
        Relationships: [];
      };
      post_likes: {
        Row: PostLikeRow;
        Insert: Omit<PostLikeRow, 'created_at'> & { created_at?: string };
        Update: Partial<PostLikeRow>;
        Relationships: [];
      };
      post_comments: {
        Row: CommentRow;
        Insert: Omit<CommentRow, 'id' | 'created_at'> & { id?: string };
        Update: Partial<CommentRow>;
        Relationships: [];
      };
    };
    Views: {
      feed_posts: {
        Row: FeedPostRow;
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
