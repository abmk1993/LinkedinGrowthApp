/**
 * Hand-written to match supabase/schema.sql. Once the project is wired
 * to a real Supabase instance, replace this with the output of
 * `supabase gen types typescript` and delete this note.
 *
 * IMPORTANT: every table needs `Relationships: []` (or real entries)
 * and the schema needs `Views`/`Functions` present, even if empty —
 * @supabase/postgrest-js's GenericSchema requires this shape. Omitting
 * it doesn't error at the type level; it silently makes every query
 * resolve to `never`, which typecheck alone won't catch unless you
 * also typecheck the routes that use it (learned this the hard way
 * scaffolding this file the first time — see git history).
 */

type Cadence = "daily" | "few_times_week" | "weekly";
type PostStatus = "draft" | "approved" | "published";
type AuditSection = "headline" | "about" | "experience";
type AuditStatus = "pending" | "accepted" | "edited" | "rejected";
type PhotoStatus = "pending" | "approved_as_is" | "corrected" | "downloaded";
type ResearchRunStatus = "pending" | "completed" | "failed";
type ResearchCategory = "update" | "trend" | "post_opportunity";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          profession: string | null;
          industry: string | null;
          experience_level: string | null;
          career_goal: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          profession?: string | null;
          industry?: string | null;
          experience_level?: string | null;
          career_goal?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      skills: {
        Row: { id: string; profile_id: string; name: string };
        Insert: { id?: string; profile_id: string; name: string };
        Update: Partial<Database["public"]["Tables"]["skills"]["Insert"]>;
        Relationships: [];
      };
      interests: {
        Row: { id: string; profile_id: string; name: string };
        Insert: { id?: string; profile_id: string; name: string };
        Update: Partial<Database["public"]["Tables"]["interests"]["Insert"]>;
        Relationships: [];
      };
      profile_snapshots: {
        Row: {
          id: string;
          profile_id: string;
          headline_raw: string | null;
          about_raw: string | null;
          experience_raw: string | null;
          screenshot_urls: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          headline_raw?: string | null;
          about_raw?: string | null;
          experience_raw?: string | null;
          screenshot_urls?: string[];
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profile_snapshots"]["Insert"]>;
        Relationships: [];
      };
      profile_audit_items: {
        Row: {
          id: string;
          profile_snapshot_id: string;
          section: AuditSection;
          critique: string | null;
          suggested_rewrite: string | null;
          score: number | null;
          status: AuditStatus;
          final_text: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_snapshot_id: string;
          section: AuditSection;
          critique?: string | null;
          suggested_rewrite?: string | null;
          score?: number | null;
          status?: AuditStatus;
          final_text?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profile_audit_items"]["Insert"]>;
        Relationships: [];
      };
      profile_photos: {
        Row: {
          id: string;
          profile_id: string;
          original_url: string;
          score: number | null;
          critique: string | null;
          issues: string[];
          corrected_url: string | null;
          status: PhotoStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          original_url: string;
          score?: number | null;
          critique?: string | null;
          issues?: string[];
          corrected_url?: string | null;
          status?: PhotoStatus;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profile_photos"]["Insert"]>;
        Relationships: [];
      };
      growth_plans: {
        Row: { id: string; profile_id: string; cadence: Cadence; created_at: string };
        Insert: { id?: string; profile_id: string; cadence: Cadence; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["growth_plans"]["Insert"]>;
        Relationships: [];
      };
      positioning: {
        Row: {
          id: string;
          profile_id: string;
          pillars: string[];
          content_style: string | null;
          target_audience: string | null;
          generated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          pillars: string[];
          content_style?: string | null;
          target_audience?: string | null;
          generated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["positioning"]["Insert"]>;
        Relationships: [];
      };
      research_runs: {
        Row: {
          id: string;
          profile_id: string;
          status: ResearchRunStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          status?: ResearchRunStatus;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["research_runs"]["Insert"]>;
        Relationships: [];
      };
      research_items: {
        Row: {
          id: string;
          research_run_id: string;
          topic: string;
          why_it_matters: string | null;
          why_you: string | null;
          suggested_angle: string | null;
          source_url: string | null;
          source_name: string | null;
          category: ResearchCategory | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          research_run_id: string;
          topic: string;
          why_it_matters?: string | null;
          why_you?: string | null;
          suggested_angle?: string | null;
          source_url?: string | null;
          source_name?: string | null;
          category?: ResearchCategory | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["research_items"]["Insert"]>;
        Relationships: [];
      };
      posts: {
        Row: {
          id: string;
          profile_id: string;
          research_item_id: string | null;
          hooks: string[] | null;
          selected_hook: string | null;
          body: string | null;
          cta: string | null;
          hashtags: string[] | null;
          status: PostStatus;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          research_item_id?: string | null;
          hooks?: string[] | null;
          selected_hook?: string | null;
          body?: string | null;
          cta?: string | null;
          hashtags?: string[] | null;
          status?: PostStatus;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["posts"]["Insert"]>;
        Relationships: [];
      };
      post_metrics: {
        Row: {
          id: string;
          post_id: string;
          impressions: number | null;
          reactions: number | null;
          comments: number | null;
          shares: number | null;
          recorded_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          impressions?: number | null;
          reactions?: number | null;
          comments?: number | null;
          shares?: number | null;
          recorded_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["post_metrics"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
