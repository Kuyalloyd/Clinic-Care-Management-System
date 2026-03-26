import { createClient } from '@supabase/supabase-js'

// Get environment variables with sensible defaults for build time
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

let supabaseInstance: any = null
let supabaseAdminInstance: any = null

export const supabase = new Proxy({}, {
  get: (target, prop) => {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Supabase environment variables not set')
      // Return a mock that won't crash
      return () => Promise.reject(new Error('Supabase not configured'))
    }
    if (!supabaseInstance) {
      supabaseInstance = createClient(supabaseUrl, supabaseAnonKey)
    }
    return (supabaseInstance as any)[prop]
  },
}) as any

export const supabaseAdmin = new Proxy({}, {
  get: (target, prop) => {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Supabase environment variables not set')
      return () => Promise.reject(new Error('Supabase not configured'))
    }
    if (!supabaseAdminInstance) {
      supabaseAdminInstance = createClient(
        supabaseUrl,
        supabaseServiceKey || supabaseAnonKey,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        }
      )
    }
    return (supabaseAdminInstance as any)[prop]
  },
}) as any
