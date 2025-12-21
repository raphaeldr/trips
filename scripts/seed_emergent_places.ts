
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import path from "path";

// Load environment variables from .env file
config({ path: path.resolve(process.cwd(), ".env") });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY; // Fallback to anon/publishable if service not found

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function getRandomOffset(radiusKm: number) {
    const earthRadius = 6371;
    const latOffset = (Math.random() - 0.5) * 2 * (radiusKm / earthRadius) * (180 / Math.PI);
    const lngOffset = (Math.random() - 0.5) * 2 * (radiusKm / earthRadius) * (180 / Math.PI) / Math.cos(0); // Approximate
    return { latOffset, lngOffset };
}
import fs from "fs";

// ... (supabase setup remain)

async function seed() {
    console.log("Fetching destinations...");
    const { data: destinations, error: destError } = await supabase
        .from("destinations")
        .select("*")
        .order("arrival_date");

    if (destError || !destinations) {
        console.error("Error fetching destinations:", destError);
        return;
    }

    console.log(`state: found ${destinations.length} destinations.`);

    let sql = `-- Auto-generated seed file for visited_places
-- 1. Clean up old Santiago entries
DELETE FROM visited_places WHERE name ILIKE '%Santiago%';

-- 2. Insert new random places
INSERT INTO visited_places (name, latitude, longitude, first_visited_at) VALUES 
`;

    const placeNames = ["Hidden Gem", "Local Market", "Scenic View", "Cozy Cafe", "Historic Ruins", "Mountain Trail", "Secret Beach", "Art Gallery", "Street Food Stall", "Ancient Temple"];

    const values = [];
    for (let i = 0; i < 20; i++) {
        const dest = destinations[Math.floor(Math.random() * destinations.length)];
        const distanceKm = 20 + Math.random() * 980;
        const { latOffset, lngOffset } = getRandomOffset(distanceKm);

        // Date logic
        const arrival = new Date(dest.arrival_date);
        const dateOffsetDays = Math.floor(Math.random() * 5);
        const visitDate = new Date(arrival);
        visitDate.setDate(arrival.getDate() + dateOffsetDays);

        const name = `${placeNames[Math.floor(Math.random() * placeNames.length)]} near ${dest.name}`.replace(/'/g, "''"); // Escape quotes
        const lat = (dest.latitude + latOffset).toFixed(6);
        const lng = (dest.longitude + lngOffset).toFixed(6);
        const dateStr = visitDate.toISOString();

        values.push(`('${name}', ${lat}, ${lng}, '${dateStr}')`);
    }

    sql += values.join(",\n") + ";\n";

    const outputPath = path.resolve(process.cwd(), "supabase/seed_places.sql");
    fs.writeFileSync(outputPath, sql);
    console.log(`SQL file generated at: ${outputPath}`);
}

seed();
