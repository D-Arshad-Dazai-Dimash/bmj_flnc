const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5001'

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
  accountType: 1 | 2  // 1=Individual, 2=Company
}

export interface AuthResponse {
  accessToken: string
  expiresAt: string
  user: {
    id: string
    email: string
    role: string
    profileId: string
    profileName: string
    accountType: string
    isEmailVerified: boolean
    createdAt: string
  }
}

export interface ApiError {
  error?: string
  errors?: Record<string, string[]>
  title?: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  if (!res.ok) {
    const err: ApiError = await res.json().catch(() => ({ error: res.statusText }))
    const message =
      err.error ??
      err.title ??
      Object.values(err.errors ?? {}).flat().join(', ') ??
      'Произошла ошибка'
    throw new Error(message)
  }

  return res.json() as Promise<T>
}

export const api = {
  auth: {
    login: (data: LoginRequest) =>
      request<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    register: (data: RegisterRequest) =>
      request<AuthResponse>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    me: (token: string) =>
      request<AuthResponse['user']>('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      }),
  },
}
