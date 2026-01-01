import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Define Types (approximating Schema since strict types might be lagging)
export interface TimelineMoment {
    id: string;
    media_type: 'photo' | 'video' | 'text' | 'audio';
    storage_path: string | null;
    caption: string | null;
    taken_at: string;
    latitude: number | null;
    longitude: number | null;
    width: number | null;
    height: number | null;
}

export interface TimelinePlace {
    id: string;
    name: string;
    country: string;
    latitude: number;
    longitude: number;
    first_visited_at: string;
    moments: TimelineMoment[];
}

export interface TimelineSegment {
    id: string;
    name: string; // "Trip to X" or Place Name
    country: string;
    arrival_date: string;
    departure_date: string | null;
    is_current: boolean;
    description: string | null;
    places: TimelinePlace[];
}

/**
 * Fetches the full journey timeline.
 * Structure: Segments (Destinations) -> Places -> Media (Moments).
 */
export async function fetchJourneyTimeline(): Promise<TimelineSegment[]> {
    console.log("Fetching journey timeline...");

    // Assuming Relationships:
    // destinations.id -> places.destination_id
    // places.id -> moments.visited_place_id

    const { data, error } = await supabase
        .from("destinations")
        .select(`
            *,
            places (
                *,
                moments (
                    *
                )
            )
        `)
        .order("arrival_date", { ascending: true }); // Order Segments

    if (error) {
        console.error("Error fetching timeline:", error);
        throw error;
    }

    // Client-side sort might be safer for nested arrays if Supabase order syntax is tricky with deep nesting
    // but filtering/sorting in select is preferred if possible: places(..., moments(..., order(taken_at)))
    // Supabase JS allows: places(..., moments(*).order(taken_at)).
    // However, the object syntax for modifying nested query is: places(*, moments(*))
    // To sort nested, we usually rely on DB or sort in JS.
    // Let's sort in JS to be robust.

    const timeline = (data || []).map((segment: any) => ({
        ...segment,
        places: (segment.places || [])
            .sort((a: any, b: any) => new Date(a.first_visited_at).getTime() - new Date(b.first_visited_at).getTime())
            .map((place: any) => ({
                ...place,
                moments: (place.moments || []).sort((a: any, b: any) => new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime())
            }))
    }));

    return timeline as TimelineSegment[];
}
