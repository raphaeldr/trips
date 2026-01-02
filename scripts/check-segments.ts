
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: segments, error } = await supabase.from('segments').select('*');
    if (error) {
        console.error('Error:', error);
        return;
    }
    console.log('Segments count:', segments?.length);
    console.log('Segments:', JSON.stringify(segments, null, 2));
}

check();
