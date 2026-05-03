const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Маппинг backend AccountType → frontend-удобный тип */
export function mapAccountType(raw: string): 'Developer' | 'Client' {
  if (raw === 'Individual') return 'Developer'
  if (raw === 'Company')    return 'Client'
  // Clan тоже считаем Developer-стороной
  return 'Developer'
}

/** Маппинг frontend accountType → числовой код backend */
export function toBackendAccountType(t: 'Developer' | 'Client'): number {
  return t === 'Developer' ? 1 : 2
}

// ─── Auth Types ───────────────────────────────────────────────────────────────

export interface RegisterRequest {
  email: string
  password: string
  /** Отображаемое имя / name профиля */
  name: string
  /** 1 = Individual (Developer), 2 = Company (Client) */
  accountType: number
  bio?: string
}

export interface LoginRequest {
  email: string
  password: string
}

/** UserDto возвращаемый бэкендом */
export interface BackendUser {
  id: string
  email: string
  role: string
  profileId: string | null
  profileName: string
  accountType: string   // "Individual" | "Company" | "Clan"
  isEmailVerified: boolean
  createdAt: string
}

export interface AuthResponse {
  accessToken: string
  expiresAt: string
  user: BackendUser
}

// ─── Profile Types ────────────────────────────────────────────────────────────

export interface MyTeamDto {
  profileId: string
  name: string
  bio: string | null
  logoUrl: string | null
  accountType: string
  isVerified: boolean
  myRole: string
  status: string
  joinedAt: string | null
  memberCount: number
}

export interface ProfileSummaryDto {
  id: string
  name: string
  bio: string | null
  logoUrl: string | null
  accountType: string
  isVerified: boolean
  memberCount: number
  createdAt: string
}

export interface CreateProfileRequest {
  name: string
  bio?: string
  logoUrl?: string
  /** 2 = Company, 3 = Clan */
  accountType: number
}

// ─── Project Types ────────────────────────────────────────────────────────────

export interface ProjectSummaryDto {
  id: string
  title: string
  description: string | null
  budget: number | null
  deadline: string | null
  status: string
  clientProfileName: string
  clientProfileId: string
  clientProfileType: string
  applicationCount: number
  createdAt: string
}

export interface ProjectDetailDto {
  id: string
  title: string
  description: string | null
  budget: number | null
  deadline: string | null
  status: string
  clientProfileId: string
  clientProfileName: string
  clientProfileType: string
  executorProfileId: string | null
  executorProfileName: string | null
  applicationCount: number
  createdAt: string
  updatedAt: string
}

export interface CreateProjectRequest {
  title: string
  description?: string
  clientProfileId: string
  budget?: number
  deadline?: string
}

// ─── Assessment Types ─────────────────────────────────────────────────────────

export interface SkillDto {
  id: string
  name: string
  description: string | null
  category: string | null
  questionCount: number
}

export interface QuestionDto {
  id: string
  text: string
  options: string[]
  difficulty: string
}

export interface AssessmentResultDto {
  attemptId: string
  profileId: string
  skillId: string
  skillName: string
  correctCount: number
  totalCount: number
  scorePercent: number
  status: string
  badgeAwarded: boolean
  review: {
    questionId: string
    questionText: string
    correctIndex: number
    yourIndex: number
    isCorrect: boolean
  }[]
}

export interface SubmitAssessmentRequest {
  profileId: string
  skillId: string
  answers: { questionId: string; selectedIndex: number }[]
}

export interface ProfileBadgeDto {
  skillId: string
  skillName: string
  category: string | null
  bestScore: number
}

// ─── Error ────────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  statusCode: number
  fieldErrors?: Record<string, string[]>

  constructor(message: string, statusCode: number, fieldErrors?: Record<string, string[]>) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.fieldErrors = fieldErrors
    Object.setPrototypeOf(this, ApiError.prototype)
  }
}

// ─── Base fetch ───────────────────────────────────────────────────────────────

const REQUEST_TIMEOUT = 15_000 // 15 seconds

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }

  // AbortController with timeout to prevent hanging requests
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      credentials: 'include',  // httpOnly cookie-аутентификация
      headers,
      signal: options.signal ?? controller.signal,
    })

    if (!res.ok) {
      let message = `HTTP ${res.status}`
      try {
        const body = await res.json()
        message =
          body.error ?? body.title ?? body.message ??
          (body.errors
            ? Object.values(body.errors as Record<string, string[]>).flat().join(' • ')
            : message)
      } catch { /* ignore */ }
      throw new ApiError(message, res.status)
    }

    if (res.status === 204) return undefined as T
    return res.json() as Promise<T>
  } catch (err) {
    if (err instanceof ApiError) throw err
    if ((err as Error).name === 'AbortError') {
      throw new ApiError('Request timed out', 408)
    }
    throw new ApiError(
      `Network error: ${(err as Error).message ?? 'Failed to fetch'}`,
      0
    )
  } finally {
    clearTimeout(timeoutId)
  }
}

// ─── API client ───────────────────────────────────────────────────────────────

export const api = {

  // ── Auth ──────────────────────────────────────────────────────────────────
  auth: {
    login: (body: LoginRequest) =>
      request<AuthResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),

    register: (body: RegisterRequest) =>
      request<AuthResponse>('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),

    me: () =>
      request<{ userId: string; email: string; role: string; accountType: string; profileName: string }>(
        '/api/auth/me'
      ),

    /** Обновить имя и/или bio своего профиля */
    updateProfile: (data: { name?: string; bio?: string }) =>
      request<BackendUser>('/api/auth/profile', { method: 'PATCH', body: JSON.stringify(data) }),

    /** Сменить пароль (требует подтверждения текущего) */
    changePassword: (data: { currentPassword: string; newPassword: string }) =>
      request<void>('/api/auth/password', { method: 'PATCH', body: JSON.stringify(data) }),
  },

  // ── Users (управление аккаунтом) ───────────────────────────────────────────
  users: {
    /** Soft-delete текущего аккаунта; cookies очищаются на сервере */
    deleteMe: () =>
      request<void>('/api/users/me', { method: 'DELETE' }),
  },

  // ── Profiles (Clan / Company) ──────────────────────────────────────────────
  profiles: {
    /** Мои кланы и компании (активные + pending приглашения) */
    myTeams: () =>
      request<MyTeamDto[]>('/api/profiles/my-teams'),

    /** Публичный поиск профилей (кланы / компании) */
    search: (q?: string) =>
      request<ProfileSummaryDto[]>(`/api/profiles${q ? `?q=${encodeURIComponent(q)}` : ''}`),

    /** Создать клан (accountType: 3) или компанию (accountType: 2) */
    create: (data: CreateProfileRequest) =>
      request<ProfileSummaryDto>('/api/profiles/create', { method: 'POST', body: JSON.stringify(data) }),

    /** Пригласить участника по email */
    invite: (profileId: string, email: string) =>
      request<{ membershipId: string; invitedUserEmail: string; profileName: string; status: string }>(
        `/api/profiles/${profileId}/invite`,
        { method: 'POST', body: JSON.stringify({ email }) }
      ),
  },

  // ── Projects ───────────────────────────────────────────────────────────────
  projects: {
    /** Мои проекты (где я — заказчик) */
    list: () =>
      request<ProjectSummaryDto[]>('/api/projects/my'),

    /** Публичная лента открытых проектов */
    feed: (page = 1, pageSize = 20) =>
      request<ProjectSummaryDto[]>(`/api/projects/feed?page=${page}&pageSize=${pageSize}`),

    /** Создать проект (clientProfileId — профиль-заказчик) */
    create: (data: CreateProjectRequest) =>
      request<ProjectDetailDto>('/api/projects', { method: 'POST', body: JSON.stringify(data) }),

    /** Изменить статус проекта (cancel / complete) */
    patchStatus: (projectId: string, status: string) =>
      request<ProjectSummaryDto>(
        `/api/projects/${projectId}/status`,
        { method: 'PATCH', body: JSON.stringify({ status }) }
      ),

    /** Подать заявку на проект */
    apply: (projectId: string, data: { applicantProfileId: string; coverLetter?: string; proposedBudget?: number }) =>
      request<{ applicationId: string; status: string }>(
        `/api/projects/${projectId}/apply`,
        { method: 'POST', body: JSON.stringify(data) }
      ),
  },

  // ── Assessment ─────────────────────────────────────────────────────────────
  assessment: {
    /** Список доступных навыков */
    skills: () =>
      request<SkillDto[]>('/api/assessment/skills'),

    /** Вопросы теста по навыку */
    questions: (skillId: string, count = 10) =>
      request<QuestionDto[]>(`/api/assessment/questions/${skillId}?count=${count}`),

    /** Отправить ответы теста */
    submit: (data: SubmitAssessmentRequest) =>
      request<AssessmentResultDto>('/api/assessment/submit', { method: 'POST', body: JSON.stringify(data) }),

    /** Бейджи профиля */
    badges: (profileId: string) =>
      request<ProfileBadgeDto[]>(`/api/assessment/badges/${profileId}`),
  },
}
