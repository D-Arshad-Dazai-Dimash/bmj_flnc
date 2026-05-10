/**
 * MVP-эскроу-контракты и предложения проектов на localStorage.
 *
 * Бекенд-модуль платежей пока не подключён, поэтому контракт здесь —
 * клиентская модель, отображающая жизненный цикл сделки. Когда появится
 * платёжный шлюз и реальные таблицы Contracts/Milestones, заменим эти
 * функции на API-вызовы; UI можно оставить.
 *
 * Особое внимание безопасности (на уровне UX-инвариантов):
 *   • status контракта не может «откатываться» назад от Released
 *   • milestone нельзя пометить выполненным, если предыдущий не Approved
 *   • release возможен только если ВСЕ milestone Approved
 *   • любые изменения логируются в `history` с `actorProfileId` + ts
 */

const CONTRACTS_KEY = 'bj.contracts.v1'
const OFFERS_KEY    = 'bj.offers.v1'

// ─── Contract types ───────────────────────────────────────────────

export type ContractStatus =
  | 'Draft'        // только что создан клиентом, ждёт согласия исполнителя
  | 'Active'       // обе стороны согласились, работы идут
  | 'Funded'       // средства зарезервированы (эскроу-аналог)
  | 'InReview'     // исполнитель сдал все этапы
  | 'Released'     // средства освобождены, контракт закрыт
  | 'Disputed'     // спор
  | 'Cancelled'

export type MilestoneStatus =
  | 'Pending'      // ещё не начат
  | 'Submitted'    // исполнитель отметил «готово»
  | 'Approved'     // заказчик принял
  | 'Rejected'     // заказчик отклонил, нужно переделать

export interface Milestone {
  id:        string
  title:     string
  amount:    number          // в тенге
  dueDate?:  string | null   // YYYY-MM-DD
  status:    MilestoneStatus
  notes?:    string
  updatedAt: string
}

export interface ContractEvent {
  id:        string
  ts:        string
  actorProfileId: string
  actorName: string
  action:    string
  details?:  string
}

export interface Contract {
  id:                  string
  projectId?:          string
  projectTitle:        string
  clientProfileId:     string
  clientName:          string
  executorProfileId:   string
  executorName:        string
  totalAmount:         number          // сумма контракта в тенге
  status:              ContractStatus
  milestones:          Milestone[]
  history:             ContractEvent[]
  createdAt:           string
  updatedAt:           string
}

// ─── Offers types (заказчик → исполнитель) ────────────────────────

export type OfferStatus = 'Pending' | 'Accepted' | 'Declined' | 'Expired' | 'Withdrawn'

export interface ProjectOffer {
  id:                string
  fromClientProfileId: string
  fromClientName:    string
  toExecutorProfileId: string
  toExecutorName:    string
  projectId?:        string
  projectTitle:      string
  message:           string
  budget?:           number | null
  deadline?:         string | null
  status:            OfferStatus
  createdAt:         string
  decidedAt?:        string
}

// ─── helpers ──────────────────────────────────────────────────────

function readContracts(): Contract[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(CONTRACTS_KEY)
    return raw ? (JSON.parse(raw) as Contract[]) : []
  } catch { return [] }
}

function writeContracts(arr: Contract[]): void {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(CONTRACTS_KEY, JSON.stringify(arr)) } catch { /* ignore */ }
}

function readOffers(): ProjectOffer[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(OFFERS_KEY)
    return raw ? (JSON.parse(raw) as ProjectOffer[]) : []
  } catch { return [] }
}

function writeOffers(arr: ProjectOffer[]): void {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(OFFERS_KEY, JSON.stringify(arr)) } catch { /* ignore */ }
}

function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

// ─── public API: contracts ────────────────────────────────────────

export function listContractsFor(profileId: string | null | undefined): Contract[] {
  if (!profileId) return []
  return readContracts()
    .filter(c => c.clientProfileId === profileId || c.executorProfileId === profileId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function getContract(id: string): Contract | null {
  return readContracts().find(c => c.id === id) ?? null
}

export interface CreateContractInput {
  projectId?:        string
  projectTitle:      string
  clientProfileId:   string
  clientName:        string
  executorProfileId: string
  executorName:      string
  totalAmount:       number
  milestones:        Array<Omit<Milestone, 'id' | 'status' | 'updatedAt'>>
  initiatorProfileId: string
  initiatorName:     string
}

export function createContract(input: CreateContractInput): Contract {
  const now = new Date().toISOString()
  const c: Contract = {
    id: genId('ct'),
    projectId:         input.projectId,
    projectTitle:      input.projectTitle,
    clientProfileId:   input.clientProfileId,
    clientName:        input.clientName,
    executorProfileId: input.executorProfileId,
    executorName:      input.executorName,
    totalAmount:       input.totalAmount,
    status:            'Draft',
    milestones: input.milestones.map(m => ({
      id:        genId('ms'),
      title:     m.title,
      amount:    m.amount,
      dueDate:   m.dueDate ?? null,
      notes:     m.notes,
      status:    'Pending',
      updatedAt: now,
    })),
    history: [{
      id:             genId('ev'),
      ts:             now,
      actorProfileId: input.initiatorProfileId,
      actorName:      input.initiatorName,
      action:         'CREATED',
      details:        `Создан черновик контракта на ${input.totalAmount.toLocaleString('ru-RU')} ₸`,
    }],
    createdAt: now,
    updatedAt: now,
  }
  const all = readContracts()
  all.push(c)
  writeContracts(all)
  return c
}

function pushEvent(c: Contract, actorProfileId: string, actorName: string, action: string, details?: string) {
  c.history.push({
    id:             genId('ev'),
    ts:             new Date().toISOString(),
    actorProfileId, actorName, action, details,
  })
  c.updatedAt = new Date().toISOString()
}

export function transitionStatus(
  contractId: string,
  next: ContractStatus,
  actor: { profileId: string; name: string },
): Contract | null {
  const all = readContracts()
  const c = all.find(x => x.id === contractId)
  if (!c) return null

  // безопасность: запретить откат после Released
  if (c.status === 'Released' && next !== 'Released') {
    throw new Error('Контракт уже закрыт — статус нельзя изменить.')
  }
  // запрет release если есть невыполненные milestone
  if (next === 'Released' && c.milestones.some(m => m.status !== 'Approved')) {
    throw new Error('Нельзя освободить средства: есть неподтверждённые этапы.')
  }
  // только участник может менять статус
  if (actor.profileId !== c.clientProfileId && actor.profileId !== c.executorProfileId) {
    throw new Error('Только участники контракта могут менять статус.')
  }

  c.status = next
  pushEvent(c, actor.profileId, actor.name, 'STATUS', `→ ${next}`)
  writeContracts(all)
  return c
}

export function updateMilestoneStatus(
  contractId: string,
  milestoneId: string,
  next: MilestoneStatus,
  actor: { profileId: string; name: string },
  notes?: string,
): Contract | null {
  const all = readContracts()
  const c = all.find(x => x.id === contractId)
  if (!c) return null
  if (actor.profileId !== c.clientProfileId && actor.profileId !== c.executorProfileId) {
    throw new Error('Только участники контракта могут изменять этапы.')
  }
  const idx = c.milestones.findIndex(m => m.id === milestoneId)
  if (idx < 0) return null
  const m = c.milestones[idx]

  // правила переходов
  const role: 'client' | 'executor' = actor.profileId === c.clientProfileId ? 'client' : 'executor'
  const allowed: Record<MilestoneStatus, MilestoneStatus[]> = {
    Pending:   role === 'executor' ? ['Submitted'] : [],
    Submitted: role === 'client'   ? ['Approved', 'Rejected'] : [],
    Rejected:  role === 'executor' ? ['Submitted'] : [],
    Approved:  [],   // после одобрения нельзя ничего менять
  }
  if (!allowed[m.status].includes(next)) {
    throw new Error(`Недопустимый переход для роли «${role === 'client' ? 'заказчик' : 'исполнитель'}»: ${m.status} → ${next}.`)
  }
  // нельзя сабмитить milestone, если предыдущий не Approved
  if (next === 'Submitted' && idx > 0 && c.milestones[idx - 1].status !== 'Approved') {
    throw new Error('Сначала завершите предыдущий этап.')
  }

  m.status = next
  m.notes = notes ?? m.notes
  m.updatedAt = new Date().toISOString()
  pushEvent(c, actor.profileId, actor.name, 'MILESTONE', `${m.title}: ${next}`)

  // авто-перевод контракта в InReview если все milestone Submitted/Approved
  const allSubmittedOrApproved = c.milestones.every(x => x.status === 'Submitted' || x.status === 'Approved')
  const allApproved = c.milestones.every(x => x.status === 'Approved')
  if (allApproved && c.status !== 'Released') {
    c.status = 'Released'
    pushEvent(c, actor.profileId, actor.name, 'STATUS', '→ Released (все этапы одобрены)')
  } else if (allSubmittedOrApproved && c.status === 'Active') {
    c.status = 'InReview'
    pushEvent(c, actor.profileId, actor.name, 'STATUS', '→ InReview (всё передано на проверку)')
  }
  writeContracts(all)
  return c
}

export function deleteContract(id: string): void {
  writeContracts(readContracts().filter(c => c.id !== id))
}

// ─── public API: offers ───────────────────────────────────────────

export function listOffersFromMe(profileId: string | null | undefined): ProjectOffer[] {
  if (!profileId) return []
  return readOffers().filter(o => o.fromClientProfileId === profileId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function listOffersToMe(profileId: string | null | undefined): ProjectOffer[] {
  if (!profileId) return []
  return readOffers().filter(o => o.toExecutorProfileId === profileId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function getOffer(id: string): ProjectOffer | null {
  return readOffers().find(o => o.id === id) ?? null
}

export function createOffer(input: Omit<ProjectOffer, 'id' | 'status' | 'createdAt'>): ProjectOffer {
  const o: ProjectOffer = {
    ...input,
    id: genId('of'),
    status: 'Pending',
    createdAt: new Date().toISOString(),
  }
  const all = readOffers()
  all.push(o)
  writeOffers(all)
  return o
}

export function decideOffer(id: string, status: 'Accepted' | 'Declined' | 'Withdrawn'): ProjectOffer | null {
  const all = readOffers()
  const o = all.find(x => x.id === id)
  if (!o) return null
  if (o.status !== 'Pending') return o
  o.status = status
  o.decidedAt = new Date().toISOString()
  writeOffers(all)
  return o
}

export const STATUS_LABELS: Record<ContractStatus, string> = {
  Draft:    'Черновик',
  Active:   'В работе',
  Funded:   'Средства зарезервированы',
  InReview: 'На проверке',
  Released: 'Закрыт (выплачено)',
  Disputed: 'Спор',
  Cancelled:'Отменён',
}

export const MILESTONE_LABELS: Record<MilestoneStatus, string> = {
  Pending:   'Ожидает',
  Submitted: 'Сдан',
  Approved:  'Принят',
  Rejected:  'Отклонён',
}
