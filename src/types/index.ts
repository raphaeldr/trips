import { Database } from "@/integrations/supabase/types";

// --- Core Database Types ---
// These directly match your SQL tables.
export type Segment = Database["public"]["Tables"]["destinations"]["Row"] & {
  places?: (Place & {
    moments?: Media[];
  })[];
};
export type Media = Database["public"]["Tables"]["moments"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export interface Place {
  id: string;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  first_visited_at: string;
  last_visited_at: string;
  destination_id?: string;
}

