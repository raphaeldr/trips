import { createClient } from "@supabase/supabase-js";
import exifr from "exifr";
import { MAPBOX_TOKEN } from "@/lib/mapbox";

// Initialize Supabase Client (Standard Vite Env Vars)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Types
interface Location {
    latitude: number;
    longitude: number;
}

interface IngestionOptions {
    file?: File | null;
    manualLocation?: Location;
    noteText?: string; // For text notes if no file
}

/**
 * Calculates the Haversine distance between two points in kilometers.
 */
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function deg2rad(deg: number) {
    return deg * (Math.PI / 180);
}

/**
 * Reverse geocodes coordinates to get context (Country, Place Name).
 */
async function reverseGeocode(lat: number, lng: number) {
    try {
        const res = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=place,country&access_token=${MAPBOX_TOKEN}`
        );
        const data = await res.json();
        const country = data.features?.find((f: any) => f.place_type.includes("country"))?.text || "Unknown";
        const placeName = data.features?.find((f: any) => f.place_type.includes("place"))?.text || "Unknown Place";
        return { country, placeName };
    } catch (error) {
        console.error("Reverse geocoding failed", error);
        return { country: "Unknown", placeName: "Unknown" };
    }
}

/**
 * Main Media Ingestion Function
 */
export async function uploadMedia({ file, manualLocation, noteText }: IngestionOptions) {
    console.log("Starting ingestion...");

    // 1. Extract Metadata (EXIF)
    let latitude = manualLocation?.latitude || null;
    let longitude = manualLocation?.longitude || null;
    let takenAt = new Date();

    // If it's an image, try to get EXIF
    if (file && file.type.startsWith("image/")) {
        try {
            const output = await exifr.parse(file, ["GPSLatitude", "GPSLongitude", "DateTimeOriginal"]);
            if (output) {
                if (output.latitude && output.longitude) {
                    latitude = output.latitude;
                    longitude = output.longitude;
                }
                if (output.DateTimeOriginal) {
                    takenAt = output.DateTimeOriginal;
                }
            }
        } catch (e) {
            console.warn("EXIF extraction failed", e);
        }
    }

    // 2. Determine Location Context
    let country = "Unknown";
    let placeName = "Unknown Position";

    if (latitude && longitude) {
        const geo = await reverseGeocode(latitude, longitude);
        country = geo.country;
        placeName = geo.placeName;
    }

    // 3. Find or Create SEGMENT (Country-level)
    let segmentId: string | null = null;

    if (country !== "Unknown") {
        // Find existing segment for this country
        const { data: existingSegments } = await supabase
            .from("segments" as any)
            .select("id, country, is_current")
            .eq("country", country)
            .order("created_at", { ascending: false })
            .limit(1);

        if (existingSegments && existingSegments.length > 0) {
            segmentId = existingSegments[0].id;
        } else {
            // Create NEW Segment
            const { data: newSegment, error: segError } = await supabase
                .from("segments" as any)
                .insert({
                    name: country,
                    country: country,
                    arrival_date: takenAt.toISOString(), // Use takenAt for arrival if new
                    is_current: true,
                    latitude: latitude || 0,
                    longitude: longitude || 0
                })
                .select()
                .single();

            if (segError) {
                console.error("Failed to create segment", segError);
            } else {
                segmentId = newSegment.id;
            }
        }
    }

    // 4. Find or Create PLACE (City/Spot-level)
    let placeId: string | null = null;

    if (latitude && longitude && segmentId) {
        // Fetch all places linked to this segment? Or just all places to check distance.
        // Optimization: checking all places might be heavy, but fine for now.
        const { data: allPlaces } = await supabase.from("places" as any).select("*");

        if (allPlaces) {
            const nearest = allPlaces.reduce((prev, curr) => {
                const d = getDistanceFromLatLonInKm(latitude!, longitude!, curr.latitude, curr.longitude);
                if (d < prev.dist) return { dist: d, place: curr };
                return prev;
            }, { dist: Infinity, place: null });

            if (nearest.place && nearest.dist < 1.0) { // Within 1km
                placeId = nearest.place.id;
            }
        }

        // If no match, create new Place
        if (!placeId) {
            const { data: newPlace, error: placeError } = await supabase
                .from("places" as any)
                .insert({
                    segment_id: segmentId, // Link to Segment
                    name: placeName,
                    latitude: latitude,
                    longitude: longitude,
                    country: country,
                    first_visited_at: takenAt.toISOString(),
                    last_visited_at: takenAt.toISOString()
                })
                .select()
                .single();

            if (placeError) {
                console.error("Failed to create place", placeError);
            } else {
                placeId = newPlace.id;
            }
        }
    }

    // 5. Upload File
    let storagePath = null;
    if (file) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from("trip_media")
            .upload(filePath, file);

        if (uploadError) throw uploadError;
        storagePath = filePath;
    }

    // 6. Insert MEDIA Record
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error("User not authenticated");

    const { error: mediaError } = await supabase
        .from("media" as any) // Updated table name
        .insert({
            user_id: user.id,
            media_type: noteText ? "text" : (file?.type.startsWith("video") ? "video" : "photo"),
            storage_path: storagePath,
            description: noteText,
            taken_at: takenAt.toISOString(),
            latitude: latitude,
            longitude: longitude,
            segment_id: segmentId, // Updated FK
            place_id: placeId,     // Updated FK
            location_name: placeName,
        });

    if (mediaError) throw mediaError;

    return { success: true, segmentId, placeId };
}
