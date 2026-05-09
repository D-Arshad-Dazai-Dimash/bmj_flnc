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
  // ── ТОО/ИП (заполняются только для Company) ──────────────
  legalForm?: string
  bin?: string
  iinEntrepreneur?: string
  legalName?: string
  legalAddress?: string
  directorName?: string
  contactPhone?: string
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
  /** Машиночитаемый код ошибки backend (например, kyc_required, invalid_iin, rate_limited) */
  code?: string
  /** Произвольные дополнительные поля из тела ответа (current/required для kyc_required и т.п.) */
  details?: Record<string, unknown>

  constructor(message: string, statusCode: number, fieldErrors?: Record<string, string[]>, code?: string, details?: Record<string, unknown>) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.fieldErrors = fieldErrors
    this.code = code
    this.details = details
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
      let code: string | undefined
      let details: Record<string, unknown> | undefined
      let fieldErrors: Record<string, string[]> | undefined
      try {
        const body = await res.json()
        message =
          body.error ?? body.title ?? body.message ??
          (body.errors
            ? Object.values(body.errors as Record<string, string[]>).flat().join(' • ')
            : message)
        if (typeof body?.code === 'string') code = body.code
        if (body?.errors && typeof body.errors === 'object') fieldErrors = body.errors as Record<string, string[]>
        details = body as Record<string, unknown>
        // Глобальный хук для kyc_required: позволяет UI-слою показать KycGate.
        if (res.status === 403 && code === 'kyc_required' && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('barnamaj:kyc-required', { detail: body }))
        }
      } catch { /* ignore */ }
      throw new ApiError(message, res.status, fieldErrors, code, details)
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

  // ── KYC (рынок РК) ─────────────────────────────────────────────────────────
  kyc: {
    /** Запросить SMS-код подтверждения телефона. Формат: +7XXXXXXXXXX. */
    sendPhoneCode: (phone: string) =>
      request<{ ok: true }>('/api/kyc/phone/send-code', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      }),

    /** Подтвердить телефон 6-значным кодом из SMS. */
    verifyPhone: (phone: string, code: string) =>
      request<{ ok: true }>('/api/kyc/phone/verify', {
        method: 'POST',
        body: JSON.stringify({ phone, code }),
      }),

    /** Сохранить ИИН (12 цифр, валидируется по контрольной сумме РК). */
    setIin: (iin: string) =>
      request<{ ok: true }>('/api/kyc/iin', {
        method: 'POST',
        body: JSON.stringify({ iin }),
      }),

    /** Текущий KYC-статус и краткая сводка. */
    getStatus: () =>
      request<KycStatusDto>('/api/kyc/status'),

    /**
     * Загрузить документ удостоверения личности.
     * NationalId требует обе стороны (front + back) и selfie.
     * Passport / ResidencePermit — только front + selfie.
     */
    uploadDocument: async (
      documentType: KycDocumentType,
      front: File,
      selfie: File,
      back?: File | null
    ): Promise<KycDocumentSummaryDto> => {
      const fd = new FormData()
      fd.append('documentType', String(documentType))
      fd.append('front', front)
      fd.append('selfie', selfie)
      if (back) fd.append('back', back)
      return uploadMultipart<KycDocumentSummaryDto>('/api/kyc/document', fd)
    },

    /** Финализирует Individual KYC: создаёт submission из загруженного документа. */
    submitIndividual: () =>
      request<KycSubmissionSummaryDto>('/api/kyc/individual/submit', { method: 'POST' }),

    /** Поиск юр. лица по БИН в реестре (для autofill). */
    lookupBin: (bin: string) =>
      request<LegalEntityLookupDto>(`/api/kyc/legal/lookup/${encodeURIComponent(bin)}`),

    /**
     * Подаёт Legal KYC-заявку (multipart).
     * Обязательно: responsibleIdFront + responsibleIdSelfie.
     * authorityDocument обязателен, кроме случая ИП с responsibleRole=Owner.
     */
    submitLegal: async (
      fields: LegalKycFields,
      files: {
        responsibleIdFront: File
        responsibleIdSelfie: File
        responsibleIdBack?: File | null
        authorityDocument?: File | null
        companyRegistration?: File | null
      }
    ): Promise<KycSubmissionSummaryDto> => {
      const fd = new FormData()
      fd.append('LegalForm',       fields.legalForm)
      fd.append('Bin',             fields.bin)
      fd.append('LegalName',       fields.legalName)
      if (fields.legalAddress)  fd.append('LegalAddress',    fields.legalAddress)
      if (fields.contactPhone)  fd.append('ContactPhone',    fields.contactPhone)
      fd.append('ResponsibleRole', fields.responsibleRole)
      fd.append('ResponsibleName', fields.responsibleName)

      fd.append('responsibleIdFront',  files.responsibleIdFront)
      fd.append('responsibleIdSelfie', files.responsibleIdSelfie)
      if (files.responsibleIdBack)   fd.append('responsibleIdBack',   files.responsibleIdBack)
      if (files.authorityDocument)   fd.append('authorityDocument',   files.authorityDocument)
      if (files.companyRegistration) fd.append('companyRegistration', files.companyRegistration)

      return uploadMultipart<KycSubmissionSummaryDto>('/api/kyc/legal/submit', fd)
    },
  },

  // ── Admin: KYC moderation (submissions) ────────────────────────────────────
  adminKyc: {
    listSubmissions: (kind?: KycSubmissionKindStr, limit = 50) => {
      const qs = new URLSearchParams()
      if (kind) qs.set('kind', kind)
      qs.set('limit', String(limit))
      return request<PendingSubmissionDto[]>(`/api/kyc/moderation/submissions?${qs.toString()}`)
    },
    approveSubmission: (id: string) =>
      request<{ ok: true }>(`/api/kyc/moderation/submissions/${id}/approve`, { method: 'POST' }),
    rejectSubmission: (id: string, reason: string) =>
      request<{ ok: true }>(`/api/kyc/moderation/submissions/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
  },

  // ── Wallet ──────────────────────────────────────────────────────────────────
  wallet: {
    /** Мой кошелёк (создаётся автоматически при первом запросе) */
    me: () => request<WalletDto>('/api/wallet/me'),
    /** История транзакций (paginated) */
    history: (page = 1, pageSize = 20) =>
      request<WalletHistoryDto>(`/api/wallet/history?page=${page}&pageSize=${pageSize}`),
  },

  // ── Admin: Finance ──────────────────────────────────────────────────────────
  adminFinance: {
    wallets: () => request<AdminWalletSummaryDto[]>('/api/admin/finance/wallets'),
    adjust: (userId: string, amount: number, description?: string) =>
      request<WalletDto>(`/api/admin/finance/wallets/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ amount, description: description ?? null }),
      }),
  },

  // ── Admin: Role Grants ──────────────────────────────────────────────────
  adminRoleGrants: {
    getForUser: (userId: string) =>
      request<RoleGrantDto[]>(`/api/admin/role-grants/${userId}`),
    getEffectiveRole: (userId: string) =>
      request<{ role: string; roleValue: number }>(`/api/admin/role-grants/${userId}/effective`),
    grant: (userId: string, data: GrantRoleRequest) =>
      request<RoleGrantDto>(`/api/admin/role-grants/${userId}`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    revoke: (grantId: string) =>
      request<void>(`/api/admin/role-grants/${grantId}`, { method: 'DELETE' }),
  },

  // ── Admin: Specialties ──────────────────────────────────────────────────────
  adminSpecialties: {
    getForUser: (userId: string) =>
      request<SpecialtyGrantDto[]>(`/api/admin/specialties/${userId}`),
    grant: (userId: string, data: GrantSpecialtyRequest) =>
      request<SpecialtyGrantDto>(`/api/admin/specialties/${userId}`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    revoke: (userId: string, specialty: string) =>
      request<void>(`/api/admin/specialties/${userId}/${specialty}`, { method: 'DELETE' }),
  },

  // ── Admin: Audit Log ────────────────────────────────────────────────────────
  adminAudit: {
    getLogs: (params?: { page?: number; pageSize?: number; adminId?: string; targetUserId?: string; action?: string }) => {
      const qs = new URLSearchParams()
      if (params?.page)         qs.set('page',         String(params.page))
      if (params?.pageSize)     qs.set('pageSize',      String(params.pageSize))
      if (params?.adminId)      qs.set('adminId',       params.adminId)
      if (params?.targetUserId) qs.set('targetUserId',  params.targetUserId)
      if (params?.action)       qs.set('action',        params.action)
      return request<AuditLogPageDto>(`/api/admin/audit?${qs.toString()}`)
    },
  },

  // ── Project roles ───────────────────────────────────────────────────────────
  projectRoles: {
    getForProject: (projectId: string) =>
      request<ProjectRoleGrantDto[]>(`/api/projects/${projectId}/roles`),
    grant: (projectId: string, data: GrantProjectRoleRequest) =>
      request<ProjectRoleGrantDto>(`/api/projects/${projectId}/roles`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    revoke: (projectId: string, grantId: string) =>
      request<void>(`/api/projects/${projectId}/roles/${grantId}`, { method: 'DELETE' }),
  },

  // ── Reviews / Ratings ───────────────────────────────────────────────────────
  reviews: {
    create: (projectId: string, dto: CreateReviewRequest) =>
      request<ReviewDto>(`/api/projects/${projectId}/reviews`, {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    forProject: (projectId: string) =>
      request<ReviewDto[]>(`/api/projects/${projectId}/reviews`),
    forProfile: (profileId: string, page = 1, pageSize = 10) =>
      request<ReviewsPageDto>(
        `/api/profiles/${profileId}/reviews?page=${page}&pageSize=${pageSize}`,
      ),
    summary: (profileId: string) =>
      request<RatingSummaryDto>(`/api/profiles/${profileId}/rating`),
    tags: () => request<string[]>(`/api/reviews/tags`),
  },

  adminReviews: {
    hide: (reviewId: string, reason: string) =>
      request<{ ok: true }>(`/api/admin/reviews/${reviewId}/hide`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    restore: (reviewId: string) =>
      request<{ ok: true }>(`/api/admin/reviews/${reviewId}/restore`, { method: 'POST' }),
  },
}

// ─── Reviews types ────────────────────────────────────────────────────────────
export type ReviewDirectionStr = 'ClientToExecutor' | 'ExecutorToClient'

export interface ReviewDto {
  id: string
  projectId: string
  projectTitle: string
  direction: ReviewDirectionStr
  authorProfileId: string
  authorName: string
  authorLogoUrl?: string | null
  targetProfileId: string
  stars: number
  comment?: string | null
  tags: string[]
  isHidden: boolean
  createdAt: string
}

export interface RatingSummaryDto {
  avgRating: number | null
  ratingsCount: number
  breakdown: Record<string, number>
}

export interface ReviewsPageDto {
  total: number
  page: number
  pageSize: number
  items: ReviewDto[]
}

export interface CreateReviewRequest {
  stars: number
  comment?: string | null
  tags?: string[] | null
}

// ─── KYC types ────────────────────────────────────────────────────────────────

export type KycStatusValue = 'None' | 'Lite' | 'DocPending' | 'Full' | 'Rejected'

/** Соответствует backend enum DocumentType (byte). */
export const KycDocumentType = {
  NationalId:           1,
  Passport:             2,
  ResidencePermit:      3,
  // ── Legal KYC ─────────────────────────────────
  ResponsiblePersonId:  10,
  AuthorityDocument:    11,
  CompanyRegistration:  12,
} as const
export type KycDocumentType = typeof KycDocumentType[keyof typeof KycDocumentType]

export interface KycDocumentSummaryDto {
  id: string
  documentType: string
  status: string
  rejectionReason: string | null
  createdAt: string
  updatedAt: string
  reviewedAt: string | null
}

export type KycSubmissionKindStr = 'Individual' | 'Legal'
export type KycSubmissionStatusStr =
  | 'Pending' | 'AiApproved' | 'AiRejected' | 'ManualReview' | 'Approved' | 'Rejected'

export interface KycSubmissionSummaryDto {
  id: string
  kind: KycSubmissionKindStr
  status: KycSubmissionStatusStr
  aiDecision: 'approve' | 'reject' | 'manual' | null
  createdAt: string
  reviewedAt: string | null
  rejectionReason: string | null
}

export interface KycStatusDto {
  status: KycStatusValue
  isPhoneVerified: boolean
  phone: string | null
  hasIin: boolean
  iinMasked: string | null
  kycVerifiedAt: string | null
  latestDocument: KycDocumentSummaryDto | null
  latestSubmission: KycSubmissionSummaryDto | null
  /** "Individual" | "Company" | "Clan" — определяет ветку KYC-визарда. */
  accountType: 'Individual' | 'Company' | 'Clan'
}

export interface LegalEntityLookupDto {
  bin: string
  legalForm: string
  name: string
  address: string | null
  director: string | null
  isActive: boolean
  source: string
}

export type ResponsibleRoleStr = 'Owner' | 'Director' | 'Proxy' | 'Accountant'

export interface LegalKycFields {
  legalForm: 'ТОО' | 'АО' | 'ИП'
  bin: string
  legalName: string
  legalAddress?: string | null
  contactPhone?: string | null
  responsibleRole: ResponsibleRoleStr
  responsibleName: string
}

export interface SubmissionDocumentDto {
  id: string
  documentType: string
  frontUrl: string
  backUrl: string | null
  selfieUrl: string
}

export interface PendingSubmissionDto {
  id: string
  userId: string
  userEmail: string
  kind: KycSubmissionKindStr
  status: KycSubmissionStatusStr
  legalForm: string | null
  bin: string | null
  legalName: string | null
  legalAddress: string | null
  contactPhone: string | null
  responsibleRole: ResponsibleRoleStr | null
  responsibleName: string | null
  aiDecision: string | null
  aiConfidence: number | null
  aiReasoning: string | null
  createdAt: string
  documents: SubmissionDocumentDto[]
}

// ─── Wallet types ─────────────────────────────────────────────────────────────

export interface WalletDto {
  walletId: string
  availableBalance: number
  frozenBalance: number
  pendingWithdrawal: number
  updatedAt: string
}

export interface TransactionDto {
  id: string
  type: string
  status: string
  amount: number
  description: string | null
  relatedProjectId: string | null
  createdAt: string
}

export interface WalletHistoryDto {
  wallet: WalletDto
  transactions: TransactionDto[]
  total: number
  page: number
  pageSize: number
}

export interface AdminWalletSummaryDto {
  userId: string
  email: string
  fullName: string
  walletId: string
  availableBalance: number
  frozenBalance: number
  pendingWithdrawal: number
  updatedAt: string
}

// ─── Role Grant types ──────────────────────────────────────────────────────────

export interface RoleGrantDto {
  id: string
  grantedRole: string
  expiresAt: string | null
  grantedByAdminId: string
  reason: string | null
  isRevoked: boolean
  isActive: boolean
  createdAt: string
}

export interface GrantRoleRequest {
  grantedRole: string
  expiresAt?: string | null
  reason?: string | null
}

// ─── Project Role types ────────────────────────────────────────────────────────

export interface ProjectRoleGrantDto {
  id: string
  projectId: string
  userId: string
  role: string
  grantedByAdminId: string
  createdAt: string
}

export interface GrantProjectRoleRequest {
  userId: string
  role: string
}

// ─── Specialty types ───────────────────────────────────────────────────────────

export interface SpecialtyGrantDto {
  id: string
  specialty: string
  expiresAt: string | null
  grantedByAdminId: string
  note: string | null
  createdAt: string
  isActive: boolean
}

export interface GrantSpecialtyRequest {
  specialty: string
  expiresAt?: string | null
  note?: string | null
}

// ─── Audit types ───────────────────────────────────────────────────────────────

export interface AuditLogDto {
  id: string
  adminId: string
  adminEmail: string
  action: string
  targetUserId: string | null
  targetEmail: string | null
  payload: string | null
  ipAddress: string | null
  createdAt: string
}

export interface AuditLogPageDto {
  items: AuditLogDto[]
  total: number
  page: number
  pageSize: number
}

// ─── Multipart upload (KYC документы) ─────────────────────────────────────────

async function uploadMultipart<T>(path: string, formData: FormData): Promise<T> {
  // 60 секунд: загрузка фото может занимать дольше JSON-запроса
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 60_000)

  try {
    // НЕ задаём Content-Type — браузер сам выставит с boundary.
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
      signal: controller.signal,
    })

    if (!res.ok) {
      let message = `HTTP ${res.status}`
      let code: string | undefined
      let details: Record<string, unknown> | undefined
      try {
        const body = await res.json()
        message = body.error ?? body.title ?? body.message ?? message
        if (typeof body?.code === 'string') code = body.code
        details = body as Record<string, unknown>
        if (res.status === 403 && code === 'kyc_required' && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('barnamaj:kyc-required', { detail: body }))
        }
      } catch { /* ignore */ }
      throw new ApiError(message, res.status, undefined, code, details)
    }

    if (res.status === 204) return undefined as T
    return res.json() as Promise<T>
  } catch (err) {
    if (err instanceof ApiError) throw err
    if ((err as Error).name === 'AbortError') {
      throw new ApiError('Upload timed out', 408)
    }
    throw new ApiError(`Network error: ${(err as Error).message ?? 'Failed to fetch'}`, 0)
  } finally {
    clearTimeout(timeoutId)
  }
}
