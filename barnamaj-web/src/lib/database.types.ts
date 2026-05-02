// ─── database.types.ts — STUB FILE ───────────────────────────────────────────
//
// Оригинальный файл был сгенерирован из Supabase schema и удалён как часть
// миграции на ASP.NET Core + PostgreSQL (Docker).
//
// Этот стаб сохраняет TypeScript-совместимость. По мере реализации каждого
// модуля типы будут заменяться на реальные DTO из .NET API.
// TODO (Неделя 1+): заменить на типы из src/types/api.ts
// ─────────────────────────────────────────────────────────────────────────────

// ── Auth / User ───────────────────────────────────────────────────────────────

export type UserRole = 'freelancer' | 'client'

export interface Profile {
  id: string
  full_name: string
  bio?: string | null
  avatar_url?: string | null
  role: UserRole
  created_at: string
  updated_at?: string
}

// ── Notifications ─────────────────────────────────────────────────────────────

export type NotificationType =
  | 'new_application'
  | 'application_accepted'
  | 'work_submitted'
  | 'escrow_released'
  | 'info'

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: NotificationType
  is_read: boolean
  link?: string | null
  created_at: string
}

// ── Projects ─────────────────────────────────────────────────────────────────

export type ProjectStatus = 'open' | 'in_progress' | 'completed' | 'cancelled'
export type OrderType = 'fixed' | 'hourly' | 'PROJECT' | 'CONSULTATION' | 'AUDIT' | 'OUTSTAFF' | 'SUPERVISION'

export interface Project {
  id: string
  client_id: string
  title: string
  description?: string | null
  budget?: number | null
  status: ProjectStatus
  order_type?: OrderType | null
  package_tier?: string | null
  deadline?: string | null
  executor_id?: string | null
  created_at: string
  updated_at?: string
}

export interface ProjectWithClient extends Project {
  client: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
}

// ── Contracts ─────────────────────────────────────────────────────────────────

export type ContractStatus = 'pending' | 'active' | 'completed' | 'cancelled' | 'disputed'
export type EscrowStatus = 'pending' | 'held' | 'released' | 'refunded' | 'frozen'

export interface ContractWithDetails {
  id: string
  project_id: string
  freelancer_id: string
  client_id: string
  amount: number
  status: ContractStatus
  escrow_status: EscrowStatus
  submitted_at?: string | null
  work_submission_url?: string | null
  work_description?: string | null
  created_at: string
  project?: Pick<Project, 'id' | 'title'> | null
  freelancer_profile?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
  client_profile?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
  /** @deprecated use freelancer_profile */
  freelancer?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
  /** @deprecated use client_profile */
  client?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
}

// ── Applications ──────────────────────────────────────────────────────────────

export type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn'

export interface ApplicationWithFreelancer {
  id: string
  project_id: string
  freelancer_id: string
  message?: string | null
  cover_letter?: string | null
  proposed_budget?: number | null
  status: ApplicationStatus
  created_at: string
  freelancer?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
}

// ── Simple Contract ───────────────────────────────────────────────────────────

export interface Contract {
  id: string
  project_id: string
  freelancer_id: string
  client_id: string
  amount: number
  status: ContractStatus
  escrow_status: EscrowStatus
  created_at: string
  platform_fee?: number | null
  frozen_at?: string | null
  released_at?: string | null
  completed_at?: string | null
  submitted_at?: string | null
  work_description?: string | null
  work_submission_url?: string | null
  project?: Pick<Project, 'id' | 'title'> | null
}

// ── Clans ─────────────────────────────────────────────────────────────────────

export type ClanRole = 'owner' | 'admin' | 'member' | 'leader' | 'architect'

export interface ClanWithMembers {
  id: string
  name: string
  description?: string | null
  avatar_url?: string | null
  my_role?: ClanRole | null
  member_count?: number
  created_at: string
  members: Array<{
    user_id?: string
    profile: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
    role: ClanRole
  }>
}

// ── Chat ──────────────────────────────────────────────────────────────────────

export interface MessageWithSender {
  id: string
  contract_id: string
  sender_id: string
  text: string
  created_at: string
  reply_to_id: string | null
  sender: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
  reply_to: {
    id: string
    text: string
    sender_id: string
    sender: Pick<Profile, 'id' | 'full_name'> | null
  } | null
}

// ── Announcements ─────────────────────────────────────────────────────────────

export interface AnnouncementItem {
  id: string
  title: string
  body: string
  published_at: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Re-export Supabase-like auth types for backwards compat
// TODO: удалить после полного рефакторинга страниц
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthError {
  message: string
  status?: number
}
