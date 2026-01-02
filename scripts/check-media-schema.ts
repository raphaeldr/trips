
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase.from('media').select('*').limit(1);

    if (error) {
        console.error('Error selecting media:', error);
        // If error, maybe valid but empty? Or connection error?
        // To get schema, we might just try to insert dummy or inspect error if helpful, 
        // but selecting * gives us keys if row exists. If no row, keys are unknown.
        // Actually, we can assume typical cols if this fails, but let's see.
    }

    console.log('Media sample:', data);

    // Check segments too just in case
    const { data: segments } = await supabase.from('segments').select('*').limit(1);
    console.log('Segments sample:', segments);
}

check();
