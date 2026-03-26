import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Handle missing environment variables gracefully during build
const url = supabaseUrl || 'https://placeholder.supabase.co'
const anonKey = supabaseAnonKey || 'placeholder-key'

export const supabase = createClient(url, anonKey)

export const supabaseAdmin = createClient(url, supabaseServiceKey || anonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})
