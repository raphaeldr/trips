
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: destinations, error } = await supabase.from('destinations').select('*');
    if (error) {
        console.error('Error:', error);
        return;
    }
    console.log('Destinations count:', destinations?.length);
    console.log('Destinations:', JSON.stringify(destinations, null, 2));

    const now = new Date();
    console.log('Current Server Time:', now.toISOString());
}

check();
