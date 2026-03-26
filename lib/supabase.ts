import { createClient } from '@supabase/supabase-js'

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Use placeholder values if env vars are not available (for build-time compatibility)
const url = supabaseUrl || 'https://placeholder.supabase.co'
const anonKey = supabaseAnonKey || 'placeholder-key'

// Initialize Supabase clients with graceful fallbacks
export const supabase = createClient(url, anonKey)

export const supabaseAdmin = createClient(url, supabaseServiceKey || anonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})
