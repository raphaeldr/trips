
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    // Try to query Postgres information_schema via RPC if available, or just standard query if permissions allow.
    // Usually Supabase exposes a definition via PostgREST, but checking columns directly via rpc is harder if not set up.
    // However, we can try to assume standard Supabase "public" schema access.

    // We can't query information_schema directly via supabase-js client unless we have a view or rpc.
    // BUT, we can try to just select 'description' and see if it fails.

    console.log("Checking 'caption' column...");
    const { error: errCaption } = await supabase.from('media').select('caption').limit(1);
    console.log("Caption error:", errCaption?.message || "None");

    console.log("Checking 'description' column...");
    const { error: errDesc } = await supabase.from('media').select('description').limit(1);
    console.log("Description error:", errDesc?.message || "None");

    console.log("Checking 'text' column...");
    const { error: errText } = await supabase.from('media').select('text').limit(1);
    console.log("Text error:", errText?.message || "None");
}

check();
