
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://siesptpsycezvpxirxlb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_jTo56nK9cDvWuLjHP97JiA_z-lyTzNq'; // Using publishable key is fine for Anon RPC calls

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function verifyRpc() {
    console.log("Verifying RPC get_visited_places_from_moments...");

    const { data, error } = await supabase.rpc('get_visited_places_from_moments');

    if (error) {
        console.error("RPC Error:", error);
    } else {
        console.log("RPC Success! Row count:", data?.length);
        console.log("First 5 rows:", data?.slice(0, 5));
    }
}

verifyRpc();
