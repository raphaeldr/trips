import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://siesptpsycezvpxirxlb.supabase.co'
const supabaseKey = 'sb_publishable_jTo56nK9cDvWuLjHP97JiA_z-lyTzNq'
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
    console.log('Fetching an existing moment to get valid storage_path...')
    const { data: existing } = await supabase.from('moments').select('storage_path').limit(1).single()

    const storagePath = existing?.storage_path || 'placeholder/image.jpg'
    console.log('Using storage path:', storagePath)

    const { data, error } = await supabase
        .from('moments')
        .insert([
            {
                location_name: 'Onomichi, Japan',
                country: 'Japan',
                caption: 'Simulated Future Moment (April 2026)',
                taken_at: '2026-04-15 12:00:00+00',
                latitude: 34.4077,
                longitude: 133.1932,
                media_type: 'photo',
                storage_path: storagePath,
                status: 'published'
            }
        ])
        .select()

    if (error) {
        console.error('Insert Error:', error)
    } else {
        console.log('Successfully inserted moment:', data)
    }
}

run()
