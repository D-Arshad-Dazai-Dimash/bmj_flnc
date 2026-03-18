// ── Supabase Database Definitions ─────────────────────────────────────────────
// Сгенерировано вручную под схему profiles + projects + escrow.
// После изменений в БД пересгенерировать: npx supabase gen types typescript

export type UserRole          = 'freelancer' | 'client'
export type OrderType         = 'PROJECT' | 'OUTSTAFF' | 'AUDIT' | 'SUPERVISION' | 'CONSULTATION'
export type ProjectStatus     = 'open' | 'in_progress' | 'completed' | 'cancelled'
export type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn'
export type ContractStatus    = 'active' | 'completed' | 'disputed' | 'cancelled'
export type EscrowStatus      = 'frozen' | 'released' | 'refunded'
export type NotificationType  = 'new_application' | 'application_accepted' | 'work_submitted' | 'escrow_released' | 'info'
export type ClanRole          = 'leader' | 'member' | 'architect'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id:                string
          full_name:         string
          role:              UserRole
          avatar_url:        string | null
          bio:               string
          is_admin:                    boolean
          is_blocked:                  boolean
          is_tech_supervisor:          boolean
          attestation_level:           string | null
          attestation_specialization:  string | null
          created_at:                  string
          updated_at:                  string
        }
        Insert: {
          id:                           string
          full_name?:                   string
          role?:                        UserRole
          avatar_url?:                  string | null
          bio?:                         string
          is_admin?:                    boolean
          is_blocked?:                  boolean
          is_tech_supervisor?:          boolean
          attestation_level?:           string | null
          attestation_specialization?:  string | null
          created_at?:                  string
          updated_at?:                  string
        }
        Update: {
          id?:                          string
          full_name?:                   string
          role?:                        UserRole
          avatar_url?:                  string | null
          bio?:                         string
          is_admin?:                    boolean
          is_blocked?:                  boolean
          is_tech_supervisor?:          boolean
          attestation_level?:           string | null
          attestation_specialization?:  string | null
          updated_at?:        string
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey'
            columns: ['id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      projects: {
        Row: {
          id:            string
          title:         string
          description:   string | null
          budget:        number | null
          deadline:      string | null
          status:        ProjectStatus
          order_type:    OrderType
          client_id:     string
          executor_id:       string | null
          package_tier:        number | null
          commission_amount:   number | null
          total_amount:        number | null
          tech_supervisor_id:  string | null
          supervision_status:  string
          supervision_report:  string | null
          repository_url:      string | null
          created_at:          string
          updated_at:          string
        }
        Insert: {
          id?:                  string
          title:                string
          description?:         string | null
          budget?:              number | null
          deadline?:            string | null
          status?:              ProjectStatus
          order_type?:          OrderType
          client_id:            string
          executor_id?:         string | null
          package_tier?:        number | null
          commission_amount?:   number | null
          total_amount?:        number | null
          tech_supervisor_id?:  string | null
          supervision_status?:  string
          supervision_report?:  string | null
          repository_url?:      string | null
          created_at?:          string
          updated_at?:          string
        }
        Update: {
          title?:               string
          description?:         string | null
          budget?:              number | null
          deadline?:            string | null
          status?:              ProjectStatus
          order_type?:          OrderType
          executor_id?:         string | null
          package_tier?:        number | null
          commission_amount?:   number | null
          total_amount?:        number | null
          tech_supervisor_id?:  string | null
          supervision_status?:  string
          supervision_report?:  string | null
          repository_url?:      string | null
          updated_at?:          string
        }
        Relationships: [
          {
            foreignKeyName: 'projects_client_id_fkey'
            columns: ['client_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'projects_executor_id_fkey'
            columns: ['executor_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      project_applications: {
        Row: {
          id:              string
          created_at:      string
          project_id:      string
          freelancer_id:   string
          cover_letter:    string | null
          proposed_budget: number | null
          status:          ApplicationStatus
          deadline_days:   number | null
        }
        Insert: {
          id?:              string
          created_at?:      string
          project_id:       string
          freelancer_id:    string
          cover_letter?:    string | null
          proposed_budget?: number | null
          status?:          ApplicationStatus
          deadline_days?:   number | null
        }
        Update: {
          cover_letter?:    string | null
          proposed_budget?: number | null
          status?:          ApplicationStatus
          deadline_days?:   number | null
        }
        Relationships: [
          {
            foreignKeyName: 'project_applications_project_id_fkey'
            columns: ['project_id']
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'project_applications_freelancer_id_fkey'
            columns: ['freelancer_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      contracts: {
        Row: {
          id:                  string
          created_at:          string
          updated_at:          string
          project_id:          string
          client_id:           string
          freelancer_id:       string
          application_id:      string
          amount:              number
          platform_fee:        number
          escrow_status:       EscrowStatus
          status:              ContractStatus
          frozen_at:           string
          released_at:         string | null
          completed_at:        string | null
          disputed_at:         string | null
          work_submission_url: string | null
          work_description:    string | null
          submitted_at:        string | null
        }
        Insert: {
          id?:                  string
          created_at?:          string
          updated_at?:          string
          project_id:           string
          client_id:            string
          freelancer_id:        string
          application_id:       string
          amount:               number
          platform_fee?:        number
          escrow_status?:       EscrowStatus
          status?:              ContractStatus
          frozen_at?:           string
          released_at?:         string | null
          completed_at?:        string | null
          disputed_at?:         string | null
          work_submission_url?: string | null
          work_description?:    string | null
          submitted_at?:        string | null
        }
        Update: {
          escrow_status?:       EscrowStatus
          status?:              ContractStatus
          released_at?:         string | null
          completed_at?:        string | null
          disputed_at?:         string | null
          updated_at?:          string
          work_submission_url?: string | null
          work_description?:    string | null
          submitted_at?:        string | null
        }
        Relationships: [
          {
            foreignKeyName: 'contracts_project_id_fkey'
            columns: ['project_id']
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'contracts_client_id_fkey'
            columns: ['client_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'contracts_freelancer_id_fkey'
            columns: ['freelancer_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'contracts_application_id_fkey'
            columns: ['application_id']
            referencedRelation: 'project_applications'
            referencedColumns: ['id']
          }
        ]
      }
      notifications: {
        Row: {
          id:         string
          user_id:    string
          title:      string
          message:    string
          type:       NotificationType
          link:       string | null
          is_read:    boolean
          created_at: string
        }
        Insert: {
          id?:         string
          user_id:     string
          title:       string
          message?:    string
          type?:       NotificationType
          link?:       string | null
          is_read?:    boolean
          created_at?: string
        }
        Update: {
          title?:   string
          message?: string
          type?:    NotificationType
          link?:    string | null
          is_read?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      messages: {
        Row: {
          id:          string
          contract_id: string
          sender_id:   string
          reply_to_id: string | null
          text:        string
          is_read:     boolean
          created_at:  string
        }
        Insert: {
          id?:          string
          contract_id:  string
          sender_id:    string
          reply_to_id?: string | null
          text:         string
          is_read?:     boolean
          created_at?:  string
        }
        Update: {
          is_read?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'messages_contract_id_fkey'
            columns: ['contract_id']
            referencedRelation: 'contracts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'messages_sender_id_fkey'
            columns: ['sender_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      clans: {
        Row: {
          id:          string
          name:        string
          leader_id:   string
          description: string | null
          avatar_url:  string | null
          created_at:  string
        }
        Insert: {
          id?:          string
          name:         string
          leader_id:    string
          description?: string | null
          avatar_url?:  string | null
          created_at?:  string
        }
        Update: {
          name?:        string
          description?: string | null
          avatar_url?:  string | null
        }
        Relationships: [
          {
            foreignKeyName: 'clans_leader_id_fkey'
            columns: ['leader_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      favorites: {
        Row: {
          id:         string
          user_id:    string
          project_id: string
          created_at: string
        }
        Insert: {
          id?:         string
          user_id:     string
          project_id:  string
          created_at?: string
        }
        Update: Record<string, never>
        Relationships: [
          {
            foreignKeyName: 'favorites_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'favorites_project_id_fkey'
            columns: ['project_id']
            referencedRelation: 'projects'
            referencedColumns: ['id']
          }
        ]
      }
      clan_members: {
        Row: {
          clan_id:   string
          user_id:   string
          role:      ClanRole
          joined_at: string
        }
        Insert: {
          clan_id:   string
          user_id:   string
          role?:     ClanRole
          joined_at?: string
        }
        Update: {
          role?: ClanRole
        }
        Relationships: [
          {
            foreignKeyName: 'clan_members_clan_id_fkey'
            columns: ['clan_id']
            referencedRelation: 'clans'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'clan_members_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      attestations: {
        Row: {
          id:             string
          user_id:        string
          specialization: string
          level:          string
          score:          number
          feedback:       string
          completed_at:   string
          can_retake_at:  string
          created_at:     string
        }
        Insert: {
          id?:             string
          user_id:         string
          specialization:  string
          level:           string
          score:           number
          feedback?:       string
          completed_at?:   string
          can_retake_at?:  string
          created_at?:     string
        }
        Update: {
          specialization?: string
          level?:          string
          score?:          number
          feedback?:       string
        }
        Relationships: [
          {
            foreignKeyName: 'attestations_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      payments: {
        Row: {
          id:                 string
          order_id:           string
          payer_id:           string
          amount_tiyn:        number
          commission_tiyn:    number
          status:             string
          gateway_payment_id: string | null
          created_at:         string
        }
        Insert: {
          id?:                 string
          order_id:            string
          payer_id:            string
          amount_tiyn:         number
          commission_tiyn?:    number
          status?:             string
          gateway_payment_id?: string | null
          created_at?:         string
        }
        Update: {
          status?:             string
          gateway_payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'payments_order_id_fkey'
            columns: ['order_id']
            referencedRelation: 'projects'
            referencedColumns: ['id']
          }
        ]
      }
      payouts: {
        Row: {
          id:           string
          user_id:      string
          amount_tiyn:  number
          status:       string
          processed_at: string | null
          created_at:   string
        }
        Insert: {
          id?:           string
          user_id:       string
          amount_tiyn:   number
          status?:       string
          processed_at?: string | null
          created_at?:   string
        }
        Update: {
          status?:       string
          processed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'payouts_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      supervision_applications: {
        Row: {
          id:         string
          user_id:    string
          status:     string
          created_at: string
        }
        Insert: {
          id?:         string
          user_id:     string
          status?:     string
          created_at?: string
        }
        Update: {
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: 'supervision_applications_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      ai_manager_sessions: {
        Row: {
          id:         string
          user_id:    string
          title:      string | null
          messages:   unknown
          tz_result:  string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?:         string
          user_id:     string
          title?:      string | null
          messages?:   unknown
          tz_result?:  string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?:      string | null
          messages?:   unknown
          tz_result?:  string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ai_manager_sessions_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      user_features: {
        Row: {
          id:           string
          user_id:      string
          feature_name: string
          enabled:      boolean
        }
        Insert: {
          id?:           string
          user_id:       string
          feature_name:  string
          enabled?:      boolean
        }
        Update: {
          enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'user_features_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      announcements: {
        Row: {
          id:           string
          title:        string
          body:         string
          published_at: string
          expires_at:   string | null
          is_active:    boolean
          sort_order:   number
          created_at:   string
        }
        Insert: {
          id?:           string
          title:         string
          body?:         string
          published_at?: string
          expires_at?:   string | null
          is_active?:    boolean
          sort_order?:   number
          created_at?:   string
        }
        Update: {
          title?:        string
          body?:         string
          published_at?: string
          expires_at?:   string | null
          is_active?:    boolean
          sort_order?:   number
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      accept_application: {
        Args: { p_application_id: string }
        Returns: string
      }
      submit_work: {
        Args: { p_contract_id: string; p_url: string; p_description?: string }
        Returns: undefined
      }
      release_escrow_payout: {
        Args: { p_contract_id: string }
        Returns: undefined
      }
      mark_notifications_read: {
        Args: { p_ids: string[] }
        Returns: undefined
      }
      mark_all_notifications_read: {
        Args: Record<string, never>
        Returns: undefined
      }
      invite_to_clan: {
        Args: { p_clan_id: string; p_email: string }
        Returns: string
      }
    }
    Enums: {
      user_role:          UserRole
      order_type:         OrderType
      project_status:     ProjectStatus
      application_status: ApplicationStatus
      contract_status:      ContractStatus
      escrow_status:        EscrowStatus
      notification_type:    NotificationType
      clan_role:            ClanRole
    }
  }
}

// ── Удобные алиасы ──────────────────────────────────────────
export type Profile       = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type Project       = Database['public']['Tables']['projects']['Row']
export type ProjectInsert = Database['public']['Tables']['projects']['Insert']
export type ProjectUpdate = Database['public']['Tables']['projects']['Update']

export type Application       = Database['public']['Tables']['project_applications']['Row']
export type ApplicationInsert = Database['public']['Tables']['project_applications']['Insert']
export type ApplicationUpdate = Database['public']['Tables']['project_applications']['Update']

export type Contract       = Database['public']['Tables']['contracts']['Row']
export type ContractInsert = Database['public']['Tables']['contracts']['Insert']
export type ContractUpdate = Database['public']['Tables']['contracts']['Update']

export type Notification       = Database['public']['Tables']['notifications']['Row']
export type NotificationInsert = Database['public']['Tables']['notifications']['Insert']
export type NotificationUpdate = Database['public']['Tables']['notifications']['Update']

/** Проект + имя заказчика (join) */
export interface ProjectWithClient extends Project {
  client: Pick<Profile, 'full_name' | 'avatar_url'> | null
}

/** Отклик + имя фрилансера (join) */
export interface ApplicationWithFreelancer extends Application {
  freelancer: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
}

/** Контракт + проект + имена сторон */
export interface ContractWithDetails extends Contract {
  project: Pick<Project, 'id' | 'title' | 'budget'> | null
  client_profile: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
  freelancer_profile: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
}

export type Favorite     = Database['public']['Tables']['favorites']['Row']
export type Announcement = Database['public']['Tables']['announcements']['Row']

// ── Sprint 3: Messages, Clans ────────────────────────────────
export type Message       = Database['public']['Tables']['messages']['Row']
export type MessageInsert = Database['public']['Tables']['messages']['Insert']

export type Clan          = Database['public']['Tables']['clans']['Row']
export type ClanInsert    = Database['public']['Tables']['clans']['Insert']

export type ClanMember    = Database['public']['Tables']['clan_members']['Row']

/** Сообщение + профиль отправителя + (опционально) реплай */
export interface MessageWithSender extends Message {
  sender: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>
  reply_to?: (Message & { sender: Pick<Profile, 'id' | 'full_name'> }) | null
}

/** Клан с участниками и ролью текущего пользователя */
export interface ClanWithMembers extends Clan {
  member_count: number
  my_role:      ClanRole | null
  members:      (ClanMember & { profile: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'role'> })[]
}
