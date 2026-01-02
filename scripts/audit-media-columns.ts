
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Auditing 'media' table columns...");

    const columnsToCheck = [
        'latitude',
        'longitude',
        'lat',
        'lng',
        'media_type',
        'type',
        'storage_path',
        'path',
        'url',
        'taken_at',
        'created_at',
        'segment_id',
        'destination_id',
        'place_id',
        'location_name',
        'name',
        'user_id'
    ];

    for (const col of columnsToCheck) {
        // We select the column. If it succeeds, it exists. If error, likely doesn't.
        const { error } = await supabase.from('media').select(col).limit(1);
        if (!error) {
            console.log(`✅ [${col}] exists`);
        } else {
            console.log(`❌ [${col}] missing (Error: ${error.details || error.message})`);
        }
    }
}

check();
