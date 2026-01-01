
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY // Use publishable queries are public
const supabase = createClient(supabaseUrl, supabaseKey)

async function verify() {
    console.log('--- Verifying State ---')
    const now = new Date()
    console.log('Current Time (Simulated):', now.toISOString())

    // 1. Fetch Destinations
    const { data: destinations, error: destError } = await supabase
        .from("destinations")
        .select("*")
        .order("arrival_date", { ascending: true });

    if (destError) {
        console.error('Error fetching destinations:', destError)
        return
    }
    console.log(`Found ${destinations.length} destinations`)

    // 2. Fetch Recent Moments
    const { data: recentMoments, error: momError } = await supabase
        .from("moments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1);

    if (momError) {
        console.error('Error fetching moments:', momError)
        return
    }
    console.log(`Found ${recentMoments.length} recent moments`)
    if (recentMoments.length > 0) {
        console.log('Latest Moment:', {
            id: recentMoments[0].id,
            location: recentMoments[0].location_name,
            taken_at: recentMoments[0].taken_at,
            created_at: recentMoments[0].created_at
        })
    }

    // 3. Logic Simulation
    console.log('--- Simulating Logic ---')

    // Check Active
    const activeDestination = destinations.find((d) => {
        const start = new Date(d.arrival_date);
        const end = d.departure_date ? new Date(d.departure_date) : new Date(3000, 0, 1);
        return now >= start && now <= end;
    });

    if (activeDestination) {
        console.log('[RESULT] Active Destination Found:', activeDestination.name)
        console.log('Reason: Date range', activeDestination.arrival_date, '-', activeDestination.departure_date, 'includes now.')
        return
    } else {
        console.log('No Active Destination found.')
    }

    // Fallback Logic
    const lastDestination = destinations
        .filter((d) => new Date(d.arrival_date) <= now)
        .sort((a, b) => new Date(b.arrival_date).getTime() - new Date(a.arrival_date).getTime())[0];

    const latestMoment = recentMoments?.[0];

    const lastDestDate = lastDestination
        ? new Date(lastDestination.departure_date || lastDestination.arrival_date).getTime()
        : 0;

    const momentDate = latestMoment
        ? new Date(latestMoment.taken_at || latestMoment.created_at).getTime()
        : 0;

    console.log('Comparison:')
    console.log(`Last Dest Date: ${new Date(lastDestDate).toISOString()} (${lastDestination?.name})`)
    console.log(`Moment Date:    ${new Date(momentDate).toISOString()} (${latestMoment?.location_name})`)

    if (latestMoment && momentDate > lastDestDate) {
        console.log('[RESULT] Latest Moment Wins ->', latestMoment.location_name)
    } else if (lastDestination) {
        console.log('[RESULT] Last Destination Wins ->', lastDestination.name)
    } else {
        console.log('[RESULT] Default (Luxembourg)')
    }
}

verify()
