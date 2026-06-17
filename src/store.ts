import { create } from 'zustand'

export interface Round {
  id: number
  name: string
  deadline: string
  status: 'open' | 'closed' | 'drawn'
  createdAt: string
  categories: CategorySummary[]
}

export interface CategorySummary {
  name: string
  stockLimit: number
  claimed: number
}

export interface CategoryDetail extends CategorySummary {
  claimCount: number
  claims: Claim[]
}

export interface Claim {
  id: number
  roundId: number
  category: string
  memberCode: string
  quantity: number
  timestamp: string
  result: 'pending' | 'won' | 'lost'
}

export interface RoundDetail extends Omit<Round, 'categories'> {
  categories: CategoryDetail[]
}

interface CreateRoundRequest {
  name: string
  deadline: string
  categories: { name: string; stockLimit: number }[]
}

interface CreateClaimRequest {
  roundId: number
  memberCode: string
  category: string
  quantity: number
}

interface AppState {
  rounds: Round[]
  currentRound: RoundDetail | null
  memberClaims: Claim[]
  loadingRounds: boolean
  loadingRoundDetail: boolean
  loadingMemberClaims: boolean
  submitting: boolean
  error: string | null

  fetchRounds: () => Promise<void>
  fetchRoundDetail: (id: number) => Promise<void>
  createRound: (data: CreateRoundRequest) => Promise<boolean>
  submitClaim: (data: CreateClaimRequest) => Promise<boolean>
  fetchMemberClaims: (roundId: number, memberCode: string) => Promise<void>
  drawRound: (id: number) => Promise<void>
  clearError: () => void
  clearCurrentRound: () => void
  clearMemberClaims: () => void
}

function mapRound(raw: any): Round {
  return {
    id: raw.id,
    name: raw.name,
    deadline: raw.deadline,
    status: raw.status,
    createdAt: raw.created_at ?? raw.createdAt,
    categories: (raw.categories ?? []).map((c: any) => ({
      name: c.name,
      stockLimit: c.stockLimit ?? c.stock_limit,
      claimed: c.totalClaimed ?? c.claimCount ?? 0,
    })),
  }
}

function mapRoundDetail(raw: any): RoundDetail {
  return {
    id: raw.id,
    name: raw.name,
    deadline: raw.deadline,
    status: raw.status,
    createdAt: raw.created_at ?? raw.createdAt,
    categories: (raw.categories ?? []).map((c: any) => ({
      name: c.name,
      stockLimit: c.stockLimit ?? c.stock_limit,
      claimed: c.totalClaimed ?? 0,
      claimCount: c.claimCount ?? 0,
      claims: (c.claims ?? []).map((cl: any) => ({
        id: cl.id,
        roundId: cl.round_id ?? cl.roundId ?? raw.id,
        category: cl.category_name ?? cl.category,
        memberCode: cl.member_code ?? cl.memberCode,
        quantity: cl.quantity,
        timestamp: cl.timestamp,
        result: cl.result,
      })),
    })),
  }
}

export const useStore = create<AppState>((set) => ({
  rounds: [],
  currentRound: null,
  memberClaims: [],
  loadingRounds: false,
  loadingRoundDetail: false,
  loadingMemberClaims: false,
  submitting: false,
  error: null,

  fetchRounds: async () => {
    set({ loadingRounds: true, error: null })
    try {
      const res = await fetch('/api/rounds')
      if (!res.ok) throw new Error('获取轮次失败')
      const json = await res.json()
      const list = (json.data ?? json) as any[]
      set({ rounds: list.map(mapRound), loadingRounds: false })
    } catch (e: any) {
      set({ error: e.message, loadingRounds: false })
    }
  },

  fetchRoundDetail: async (id: number) => {
    set({ loadingRoundDetail: true, error: null })
    try {
      const res = await fetch(`/api/rounds/${id}`)
      if (!res.ok) throw new Error('获取轮次详情失败')
      const json = await res.json()
      set({ currentRound: mapRoundDetail(json.data ?? json), loadingRoundDetail: false })
    } catch (e: any) {
      set({ error: e.message, loadingRoundDetail: false })
    }
  },

  createRound: async (data: CreateRoundRequest) => {
    set({ submitting: true, error: null })
    try {
      const res = await fetch('/api/rounds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: '创建轮次失败' }))
        throw new Error(err.error || '创建轮次失败')
      }
      set({ submitting: false })
      return true
    } catch (e: any) {
      set({ error: e.message, submitting: false })
      return false
    }
  },

  submitClaim: async (data: CreateClaimRequest) => {
    set({ submitting: true, error: null })
    try {
      const res = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: '提交申领失败' }))
        throw new Error(err.error || '提交申领失败')
      }
      set({ submitting: false })
      return true
    } catch (e: any) {
      set({ error: e.message, submitting: false })
      return false
    }
  },

  fetchMemberClaims: async (roundId: number, memberCode: string) => {
    set({ loadingMemberClaims: true, error: null })
    try {
      const res = await fetch(`/api/claims/by-member/${roundId}/${encodeURIComponent(memberCode)}`)
      if (!res.ok) throw new Error('查询申领记录失败')
      const json = await res.json()
      const list = (json.data ?? json.claims ?? []) as any[]
      set({
        memberClaims: list.map((cl: any) => ({
          id: cl.id,
          roundId: cl.round_id ?? cl.roundId ?? roundId,
          category: cl.category_name ?? cl.category,
          memberCode: cl.member_code ?? cl.memberCode,
          quantity: cl.quantity,
          timestamp: cl.timestamp,
          result: cl.result,
        })),
        loadingMemberClaims: false,
      })
    } catch (e: any) {
      set({ error: e.message, loadingMemberClaims: false })
    }
  },

  drawRound: async (id: number) => {
    set({ submitting: true, error: null })
    try {
      const res = await fetch(`/api/rounds/${id}/draw`, { method: 'POST' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: '抽签失败' }))
        throw new Error(err.error || '抽签失败')
      }
      set({ submitting: false })
    } catch (e: any) {
      set({ error: e.message, submitting: false })
    }
  },

  clearError: () => set({ error: null }),
  clearCurrentRound: () => set({ currentRound: null }),
  clearMemberClaims: () => set({ memberClaims: [] }),
}))
