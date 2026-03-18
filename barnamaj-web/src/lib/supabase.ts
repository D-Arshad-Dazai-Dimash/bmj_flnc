import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

// Lock no-op prevents "Lock broken by another request with the 'steal' option" errors
// that occur due to Navigator LockManager contention (especially in React Strict Mode)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function lockNoOp(_name: string, _acquireTimeout: number, fn: () => Promise<any>) {
  return await fn()
}

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      isSingleton: true,
      auth: {
        flowType: 'pkce',
        persistSession: true,
        detectSessionInUrl: true,
        lock: lockNoOp,
        storageKey: 'barnamaj-auth',
      },
    }
  )
}
