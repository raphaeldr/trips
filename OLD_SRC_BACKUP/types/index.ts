
import { Database } from "@/integrations/supabase/types";

// --- The Trinity Types ---
export type Segment = Database["public"]["Tables"]["segments"]["Row"];
export type Place = Database["public"]["Tables"]["places"]["Row"];
export type Media = Database["public"]["Tables"]["media"]["Row"];

// --- Helper for Nested Data ---
export type PlaceWithMedia = Place & {
  media: Media[];
};

export type SegmentWithPlaces = Segment & {
  places: PlaceWithMedia[];
};