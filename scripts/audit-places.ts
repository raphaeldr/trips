
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Auditing 'places' table columns...");

    const columnsToCheck = [
        'latitude',
        'longitude',
        'segment_id',
        'country',
        'name',
        'first_visited_at'
    ];

    for (const col of columnsToCheck) {
        const { error } = await supabase.from('places').select(col).limit(1);
        if (!error) {
            console.log(`✅ [${col}] exists`);
        } else {
            console.log(`❌ [${col}] missing`);
        }
    }
}

check();
