import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'

let client: ReturnType<typeof createClient<Database>> | null = null
const memoryStorage = new Map<string, string>()
let warnedStorageFallback = false

function warnStorageFallbackOnce() {
  if (warnedStorageFallback) return
  warnedStorageFallback = true
  console.warn('AsyncStorage is unavailable. Supabase auth session is using in-memory fallback storage.')
}

const guardedStorage = {
  async getItem(key: string) {
    try {
      const value = await AsyncStorage.getItem(key)
      if (value !== null) {
        return value
      }
    } catch {
      warnStorageFallbackOnce()
    }

    return memoryStorage.get(key) ?? null
  },
  async setItem(key: string, value: string) {
    memoryStorage.set(key, value)

    try {
      await AsyncStorage.setItem(key, value)
    } catch {
      warnStorageFallbackOnce()
    }
  },
  async removeItem(key: string) {
    memoryStorage.delete(key)

    try {
      await AsyncStorage.removeItem(key)
    } catch {
      warnStorageFallbackOnce()
    }
  },
}

function getEnvConfig() {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
  const supabaseKey =
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  return { supabaseUrl, supabaseKey }
}

export function getSupabaseClient() {
  if (client) {
    return client
  }

  const { supabaseUrl, supabaseKey } = getEnvConfig()

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase env. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY).',
    )
  }

  client = createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })

  return client
}