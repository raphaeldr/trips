import { Database } from "@/integrations/supabase/types";

// --- Core Database Types ---
// These directly match your SQL tables. If you change the DB, these update automatically.
export type Destination = Database["public"]["Tables"]["destinations"]["Row"];
export type Moment = Database["public"]["Tables"]["moments"]["Row"];
export type Story = Database["public"]["Tables"]["stories"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

// --- Composite Types (Joins) ---
// Use these when you fetch data with relations (e.g. fetching a Story + its Moments)
export type StoryWithMoments = Story & {
  story_moments: {
    sort_order: number | null;
    moments: Pick<Moment, "storage_path" | "width" | "height"> | null;
  }[];
};
