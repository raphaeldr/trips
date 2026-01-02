
import { createClient } from "@supabase/supabase-js";
import exifr from "exifr";
import { MAPBOX_TOKEN } from "@/lib/mapbox";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

interface IngestionOptions {
    file?: File;
    manualLocation?: { lat: number; lng: number };
    noteText?: string;
    userProvidedName?: string;
}

// --- Helpers ---
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

async function getCountryFromCoords(lat: number, lng: number) {
    try {
        const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=country&access_token=${MAPBOX_TOKEN}`);
        const data = await res.json();
        return data.features?.[0]?.properties?.short_code?.toUpperCase() || "XX";
    } catch (e) { return "XX"; }
}

async function getCoordsFromName(placeName: string) {
    try {
        const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(placeName)}.json?limit=1&access_token=${MAPBOX_TOKEN}`);
        const data = await res.json();
        const [lng, lat] = data.features?.[0]?.center || [null, null];
        return { lat, lng };
    } catch (e) { return { lat: null, lng: null }; }
}

async function getPlaceNameFromCoords(lat: number, lng: number) {
    try {
        const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=place,locality&access_token=${MAPBOX_TOKEN}`);
        const data = await res.json();
        return data.features?.[0]?.text || "Unknown Location";
    } catch (e) { return "Unknown Location"; }
}

// --- MAIN UPLOAD FUNCTION ---
export async function uploadMedia({ file, manualLocation, noteText, userProvidedName }: IngestionOptions) {
    console.log("Starting ingestion...");

    // 1. EXTRACT TRUTH
    let latitude = manualLocation?.lat || null;
    let longitude = manualLocation?.lng || null;
    let takenAt = new Date();
    let mediaType = "text";

    if (file) {
        mediaType = file.type.startsWith("video") ? "video" : "image";
        if (file.type.startsWith("image")) {
            try {
                const exif = await exifr.parse(file);
                if (exif) {
                    if (exif.latitude && exif.longitude) {
                        latitude = exif.latitude;
                        longitude = exif.longitude;
                    }
                    if (exif.DateTimeOriginal) takenAt = exif.DateTimeOriginal;
                }
            } catch (e) { console.warn("No EXIF"); }
        }
    }

    // Failsafe: Name Lookup
    if ((!latitude || !longitude) && userProvidedName) {
        const coords = await getCoordsFromName(userProvidedName);
        latitude = coords.lat; longitude = coords.lng;
    }

    if (!latitude || !longitude) throw new Error("No location found. Please enable GPS or type a city name.");

    // 2. SEGMENT
    const countryCode = await getCountryFromCoords(latitude, longitude);
    let { data: segment } = await supabase.from("segments").select("*").eq("country_code", countryCode).in("status", ["ACTIVE", "PLANNED"]).single();

    if (!segment) {
        // Check if there is an ACTIVE segment to complete? 
        // The user code logic says:
        await supabase.from("segments").update({ status: "COMPLETED", end_date: new Date().toISOString() }).eq("status", "ACTIVE");

        // Create new
        const { data: newSeg } = await supabase.from("segments").insert({
            country_code: countryCode,
            status: "ACTIVE",
            start_date: takenAt.toISOString(),
            title: `Trip to ${countryCode}`
        }).select().single();
        segment = newSeg;
    } else if (segment.status === "PLANNED") {
        // Complete any other active
        await supabase.from("segments").update({ status: "COMPLETED", end_date: new Date().toISOString() }).eq("status", "ACTIVE");
        // Activate this one
        await supabase.from("segments").update({ status: "ACTIVE", start_date: takenAt.toISOString() }).eq("id", segment.id);
    }

    // 3. PLACE
    const { data: places } = await supabase.from("places").select("*").eq("segment_id", segment.id);
    let matchPlace = null;

    if (userProvidedName && places) matchPlace = places.find(p => p.name.toLowerCase() === userProvidedName.toLowerCase());
    if (!matchPlace && places) {
        for (const place of places) {
            if (place.centroid_lat && place.centroid_lng) {
                if (getDistanceFromLatLonInKm(latitude, longitude, place.centroid_lat, place.centroid_lng) < 1.0) {
                    matchPlace = place; break;
                }
            }
        }
    }
    if (!matchPlace) {
        const finalName = userProvidedName || await getPlaceNameFromCoords(latitude, longitude);
        const { data: newPlace } = await supabase.from("places").insert({
            segment_id: segment.id,
            centroid_lat: latitude,
            centroid_lng: longitude,
            name: finalName
        }).select().single();
        matchPlace = newPlace;
    }

    // 4. UPLOAD
    let publicUrl = null;
    if (file) {
        const fileName = `${matchPlace.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, "")}`;
        const { error } = await supabase.storage.from("trip_media").upload(fileName, file);
        if (error) throw error;
        const { data } = supabase.storage.from("trip_media").getPublicUrl(fileName);
        publicUrl = data.publicUrl;
    }

    // 5. INSERT MEDIA
    const { error } = await supabase.from("media").insert({
        place_id: matchPlace.id,
        url: publicUrl,
        type: mediaType,
        captured_at: takenAt.toISOString(),
        description: noteText || "",
        latitude,
        longitude
    });
    if (error) throw error;

    return { success: true, placeName: matchPlace.name };
}