
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Auditing 'segments' table columns...");

    const columnsToCheck = [
        'latitude',
        'longitude',
        'country',
        'arrival_date',
        'is_current'
    ];

    for (const col of columnsToCheck) {
        const { error } = await supabase.from('segments').select(col).limit(1);
        if (!error) {
            console.log(`✅ [${col}] exists`);
        } else {
            console.log(`❌ [${col}] missing`);
        }
    }
}

check();
