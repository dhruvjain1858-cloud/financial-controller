import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// DEBUG LOGS (Remove in production)
console.log("Supabase URL:", supabaseUrl)
console.log("Supabase Key Length:", supabaseKey?.length || 0)

if (!supabaseUrl || !supabaseKey) {
    console.error("Supabase environment variables are missing! Check your .env.local file.")
}

export const supabase = createClient(supabaseUrl, supabaseKey)