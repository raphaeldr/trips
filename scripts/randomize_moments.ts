
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import path from "path";

// Load environment variables
config({ path: path.resolve(process.cwd(), ".env") });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function randomizeMoments() {
    console.log("Fetching moments with Picsum URLs...");
    const { data: moments, error } = await supabase
        .from("moments")
        .select("id, storage_path")
        .like("storage_path", "%picsum%");

    if (error) {
        console.error("Error fetching moments:", error);
        return;
    }

    if (!moments || moments.length === 0) {
        console.log("No Picsum moments found.");
        return;
    }

    console.log(`Found ${moments.length} moments. Updating dimensions...`);

    for (const moment of moments) {
        // Generate random dimensions between 400-800w and 300-800h
        // This ensures variances in aspect ratio (portrait vs landscape)
        const width = 400 + Math.floor(Math.random() * 401);
        const height = 300 + Math.floor(Math.random() * 501);

        // Preserve ID if possible, or just use a random one
        // Picsum format: https://picsum.photos/id/{id}/{width}/{height}
        // or https://picsum.photos/{width}/{height}

        let newPath = moment.storage_path;
        if (newPath.includes("/id/")) {
            // Try to preserve the ID part: .../id/123/800/1000
            const parts = newPath.split("/id/");
            if (parts.length > 1) {
                const subParts = parts[1].split("/");
                const id = subParts[0];
                newPath = `${parts[0]}/id/${id}/${width}/${height}`;
            }
        } else {
            // Fallback regex replacer for generic picsum links
            // Replace last two numbers
            newPath = `https://picsum.photos/${width}/${height}`;
        }

        const { error: updateError } = await supabase
            .from("moments")
            .update({
                storage_path: newPath,
                width: width,   // Update metadata too
                height: height
            })
            .eq("id", moment.id);

        if (updateError) {
            console.error(`Failed to update moment ${moment.id}:`, updateError);
        }
    }

    console.log("Done randomizing dimensions!");
}

randomizeMoments();
