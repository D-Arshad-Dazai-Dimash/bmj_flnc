'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string
  email: string
  role: string
  profileId: string | null
  profileName: string
  accountType: 'Developer' | 'Client'
  avatarUrl?: string | null
  bio?: string | null
}

interface AuthState {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  /** @alias logout — для совместимости с компонентами, которые используют signOut */
  signOut: () => Promise<void>
  updateUser: (partial: Partial<AuthUser>) => void
  /** @deprecated TODO: реализовать через PATCH /api/auth/profile */
  updateProfile: (data: { full_name?: string; bio?: string; avatar_url?: string }) => Promise<void>
}

export interface RegisterData {
  email: string
  password: string
  name: string
  accountType: number   // 1 = Developer (Individual), 2 = Client (Company)
  bio?: string
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapAccountType(raw: string): 'Developer' | 'Client' {
  return raw === 'Company' ? 'Client' : 'Developer'
}

function toAuthUser(dto: {
  id: string
  email: string
  role: string
  profileId: string | null
  profileName: string
  accountType: string
}): AuthUser {
  return {
    id:          dto.id,
    email:       dto.email,
    role:        dto.role,
    profileId:   dto.profileId,
    profileName: dto.profileName,
    accountType: mapAccountType(dto.accountType),
  }
}

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',  // автоматически отправляет httpOnly cookies
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  })
  return res
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  })

  // При загрузке страницы — проверяем текущую сессию через /api/auth/me
  // Если cookie есть → вернёт данные пользователя, иначе 401
  useEffect(() => {
    apiFetch('/api/auth/me')
      .then(async res => {
        if (res.ok) {
          const dto = await res.json()
          setState({ user: toAuthUser(dto), isLoading: false, isAuthenticated: true })
        } else if (res.status === 401) {
          // access_token истёк — пробуем обновить через refresh_token
          const refresh = await apiFetch('/api/auth/refresh', { method: 'POST' })
          if (refresh.ok) {
            const dto = await refresh.json()
            setState({ user: toAuthUser(dto), isLoading: false, isAuthenticated: true })
          } else {
            setState({ user: null, isLoading: false, isAuthenticated: false })
          }
        } else {
          setState({ user: null, isLoading: false, isAuthenticated: false })
        }
      })
      .catch(() => {
        setState({ user: null, isLoading: false, isAuthenticated: false })
      })
  }, [])

  // ── Login ──────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error ?? 'Ошибка входа')
    }
    const dto = await res.json()
    setState({ user: toAuthUser(dto), isLoading: false, isAuthenticated: true })
  }, [])

  // ── Register ───────────────────────────────────────────────
  const register = useCallback(async (data: RegisterData) => {
    const res = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error ?? 'Ошибка регистрации')
    }
    const dto = await res.json()
    setState({ user: toAuthUser(dto), isLoading: false, isAuthenticated: true })
  }, [])

  // ── Logout ─────────────────────────────────────────────────
  const logout = useCallback(async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' })
    setState({ user: null, isLoading: false, isAuthenticated: false })
  }, [])

  // ── signOut (alias for logout) ─────────────────────────────
  const signOut = logout

  // ── updateProfile → PATCH /api/auth/profile ─────────────────
  const updateProfile = useCallback(async (data: { full_name?: string; bio?: string; avatar_url?: string }) => {
    const res = await apiFetch('/api/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify({ name: data.full_name, bio: data.bio }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error ?? 'Ошибка сохранения профиля')
    }
    // Обновляем локальное состояние
    setState(prev => prev.user
      ? { ...prev, user: {
          ...prev.user,
          profileName: data.full_name ?? prev.user.profileName,
          bio: data.bio ?? prev.user.bio,
          avatarUrl: data.avatar_url ?? prev.user.avatarUrl,
        }}
      : prev
    )
  }, [])

  // ── Update user (локально, без запроса к API) ──────────────
  const updateUser = useCallback((partial: Partial<AuthUser>) => {
    setState(prev => prev.user
      ? { ...prev, user: { ...prev.user, ...partial } }
      : prev
    )
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, signOut, updateUser, updateProfile }}>
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

