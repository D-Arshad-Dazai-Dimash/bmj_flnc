'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'
import { createClient } from '@/lib/supabase'
import type { Profile, UserRole } from '@/lib/database.types'
import type { User, Session, AuthError } from '@supabase/supabase-js'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string
  email: string
  role: string
  profileId: string
  profileName: string
  accountType: 'Developer' | 'Client'
  avatarUrl?: string | null
  bio?: string
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  session: Session | null
  profile: Profile | null
  isLoading: boolean
  isAuthenticated: boolean
}

interface AuthContextValue extends AuthState {
  /** Legacy: сохранить JWT + user напрямую (используется api.auth.login) */
  login: (token: string, user: AuthUser) => void
  /** Legacy: выйти (очистить всё) */
  logout: () => void
  /** Legacy: частичное обновление user */
  updateUser: (partial: Partial<AuthUser>) => void
  /** Supabase: регистрация с ролью */
  signUp: (
    email: string,
    password: string,
    meta: { full_name: string; role: UserRole }
  ) => Promise<{ error: AuthError | null }>
  /** Supabase: вход по email/password */
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: AuthError | null }>
  /** Supabase: выход */
  signOut: () => Promise<void>
  /** Supabase: обновить профиль в БД */
  updateProfile: (
    data: Partial<Pick<Profile, 'full_name' | 'bio' | 'avatar_url'>>
  ) => Promise<void>
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null)

const TOKEN_KEY = 'barnamaj_token'
const USER_KEY  = 'barnamaj_user'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function roleToAccountType(role: UserRole): 'Developer' | 'Client' {
  return role === 'freelancer' ? 'Developer' : 'Client'
}

function profileToAuthUser(supaUser: User, profile: Profile): AuthUser {
  return {
    id:          supaUser.id,
    email:       supaUser.email ?? '',
    role:        profile.role,
    profileId:   profile.id,
    profileName: profile.full_name,
    accountType: roleToAccountType(profile.role),
    avatarUrl:   profile.avatar_url,
    bio:         profile.bio,
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), [])

  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    session: null,
    profile: null,
    isLoading: true,
    isAuthenticated: false,
  })

  // ── Загрузка профиля из public.profiles ───────────────────
  const fetchProfile = useCallback(
    async (userId: string): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()  // returns null (not error) when no row found

      if (error) {
        console.error('[AuthProvider] fetchProfile error:', error.message)
        return null
      }
      return data as Profile | null
    },
    [supabase]
  )

  // ── Синхронизация Supabase-сессии в состояние ─────────────
  const syncSession = useCallback(
    async (session: Session | null) => {
      try {
        if (!session?.user) {
          // Нет Supabase-сессии — проверяем legacy localStorage
          try {
            const token = localStorage.getItem(TOKEN_KEY)
            const raw   = localStorage.getItem(USER_KEY)
            if (token && raw) {
              // Validate token is still live against Supabase
              const { data: { user: supaUser } } = await supabase.auth.getUser(token)
              if (supaUser) {
                const stored: AuthUser = JSON.parse(raw)
                // Use Supabase's authoritative ID to avoid stale-UUID bugs after db resets
                const user: AuthUser = { ...stored, id: supaUser.id }
                setState({
                  user, token, session: null, profile: null,
                  isLoading: false, isAuthenticated: true,
                })
                return
              }
              // Token is invalid — wipe stale data
              localStorage.removeItem(TOKEN_KEY)
              localStorage.removeItem(USER_KEY)
            }
          } catch { /* ignore */ }

          setState({
            user: null, token: null, session: null, profile: null,
            isLoading: false, isAuthenticated: false,
          })
          return
        }

        // Supabase-сессия есть — загружаем профиль
        let profile = await fetchProfile(session.user.id)

        // Триггер мог не успеть создать профиль — retry
        if (!profile) {
          await new Promise(r => setTimeout(r, 1000))
          profile = await fetchProfile(session.user.id)
        }

        if (!profile) {
          // Профиль не найден — всё равно пускаем в дашборд с минимальными данными
          console.warn('[AuthProvider] profile not found, creating minimal user')
          const minimalUser: AuthUser = {
            id:          session.user.id,
            email:       session.user.email ?? '',
            role:        'freelancer',
            profileId:   session.user.id,
            profileName: session.user.email?.split('@')[0] ?? 'User',
            accountType: 'Developer',
          }
          setState({
            user: minimalUser,
            token: session.access_token,
            session,
            profile: null,
            isLoading: false,
            isAuthenticated: true,
          })
          return
        }

        const authUser = profileToAuthUser(session.user, profile)
        // Также сохраняем в localStorage для DashboardLayout-совместимости
        localStorage.setItem(TOKEN_KEY, session.access_token)
        localStorage.setItem(USER_KEY, JSON.stringify(authUser))

        setState({
          user: authUser,
          token: session.access_token,
          session,
          profile,
          isLoading: false,
          isAuthenticated: true,
        })
      } catch (err) {
        // Любая ошибка в syncSession — разблокируем isLoading чтобы не зависнуть
        console.error('[AuthProvider] syncSession error:', err)
        setState(s => ({ ...s, isLoading: false }))
      }
    },
    [fetchProfile]
  )

  // ── Init: пробуем Supabase-сессию, fallback на localStorage ──
  // Используем ref чтобы не перепривязывать subscription при изменении syncSession
  const syncSessionRef = useRef(syncSession)
  useEffect(() => { syncSessionRef.current = syncSession }, [syncSession])

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (mounted) syncSessionRef.current(session)
      })
      .catch(err => {
        // Supabase may be unavailable — don't crash, just mark as unauthenticated
        console.warn('[AuthProvider] getSession error (Supabase may be offline):', err?.message ?? err)
        if (mounted) setState(s => ({ ...s, isLoading: false }))
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (mounted) {
          try {
            syncSessionRef.current(session)
          } catch (err) {
            console.warn('[AuthProvider] onAuthStateChange error:', err)
          }
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

  // ── Supabase signUp ───────────────────────────────────────
  const signUp = useCallback(
    async (
      email: string,
      password: string,
      meta: { full_name: string; role: UserRole }
    ) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: meta.full_name, role: meta.role } },
      })
      return { error }
    },
    [supabase]
  )

  // ── Supabase signIn ───────────────────────────────────────
  const signIn = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return { error }
    },
    [supabase]
  )

  // ── Supabase signOut ──────────────────────────────────────
  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setState({
      user: null, token: null, session: null, profile: null,
      isLoading: false, isAuthenticated: false,
    })
  }, [supabase])

  // ── Supabase updateProfile ────────────────────────────────
  const updateProfile = useCallback(
    async (data: Partial<Pick<Profile, 'full_name' | 'bio' | 'avatar_url'>>) => {
      const userId = state.session?.user?.id ?? state.user?.id
      if (!userId) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', userId)

      if (error) throw error

      const fresh = await fetchProfile(userId)
      if (fresh && state.session?.user) {
        const authUser = profileToAuthUser(state.session.user, fresh)
        localStorage.setItem(USER_KEY, JSON.stringify(authUser))
        setState(prev => ({ ...prev, profile: fresh, user: authUser }))
      }
    },
    [supabase, state.session, state.user, fetchProfile]
  )

  // ── Legacy login (для api.auth.login / api.auth.register) ──
  const login = useCallback((token: string, user: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    setState({
      user, token, session: null, profile: null,
      isLoading: false, isAuthenticated: true,
    })
  }, [])

  // ── Legacy logout ─────────────────────────────────────────
  const logout = useCallback(() => {
    signOut()
  }, [signOut])

  // ── Legacy updateUser ─────────────────────────────────────
  const updateUser = useCallback((partial: Partial<AuthUser>) => {
    setState(prev => {
      if (!prev.user) return prev
      const updated = { ...prev.user, ...partial }
      localStorage.setItem(USER_KEY, JSON.stringify(updated))
      return { ...prev, user: updated }
    })
  }, [])

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login, logout, updateUser,
        signUp, signIn, signOut, updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
