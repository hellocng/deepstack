import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types'

let supabaseClient: SupabaseClient<Database> | null = null

export function createClient(): SupabaseClient<Database> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  // Use singleton pattern to ensure consistent client instance
  if (!supabaseClient) {
    supabaseClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
  }

  return supabaseClient
}
