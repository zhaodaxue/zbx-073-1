import { useState } from 'react'
import { Search, User, Tag, Hash } from 'lucide-react'
import { useStore } from '@/store'
import type { Round } from '@/store'

interface MemberSidebarProps {
  rounds: Round[]
}

export default function MemberSidebar({ rounds }: MemberSidebarProps) {
  const { memberClaims, loadingMemberClaims, fetchMemberClaims } = useStore()
  const [memberCode, setMemberCode] = useState('')
  const [selectedRoundId, setSelectedRoundId] = useState<number | ''>('')

  const handleSearch = () => {
    if (!memberCode.trim() || !selectedRoundId) return
    fetchMemberClaims(Number(selectedRoundId), memberCode.trim())
  }

  const resultBadge = (result: string) => {
    switch (result) {
      case 'won':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">中签</span>
      case 'lost':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">未中签</span>
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">待抽签</span>
    }
  }

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-md border border-sand/60 p-5">
      <h3 className="font-display text-lg font-semibold text-bark mb-4">成员查询</h3>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-bark/70 mb-1">成员代号</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-wood/50" />
            <input
              type="text"
              value={memberCode}
              onChange={(e) => setMemberCode(e.target.value)}
              placeholder="输入成员代号"
              className="w-full pl-9 pr-3 py-2 border border-sand rounded-xl bg-cream/50 text-bark placeholder:text-bark/30 focus:outline-none focus:ring-2 focus:ring-wood/30 focus:border-wood text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-bark/70 mb-1">选择轮次</label>
          <select
            value={selectedRoundId}
            onChange={(e) => setSelectedRoundId(e.target.value ? Number(e.target.value) : '')}
            className="w-full px-3 py-2 border border-sand rounded-xl bg-cream/50 text-bark focus:outline-none focus:ring-2 focus:ring-wood/30 focus:border-wood text-sm"
          >
            <option value="">选择轮次</option>
            {rounds.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleSearch}
          disabled={!memberCode.trim() || !selectedRoundId || loadingMemberClaims}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-wood text-cream rounded-xl font-medium text-sm hover:bg-wood/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow transition-all"
        >
          <Search className="w-4 h-4" />
          {loadingMemberClaims ? '查询中...' : '查询'}
        </button>
      </div>

      {memberClaims.length > 0 && (
        <div className="mt-5 space-y-2.5">
          <h4 className="text-sm font-medium text-bark/70">查询结果</h4>
          {memberClaims.map((claim) => (
            <div
              key={claim.id}
              className="bg-cream/70 rounded-xl p-3 border border-sand/50"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5 text-sm text-bark">
                  <Tag className="w-3.5 h-3.5 text-wood" />
                  {claim.category}
                </span>
                {resultBadge(claim.result)}
              </div>
              <span className="flex items-center gap-1.5 text-xs text-bark/50">
                <Hash className="w-3 h-3" />
                份额: {claim.quantity}
              </span>
            </div>
          ))}
        </div>
      )}

      {memberClaims.length === 0 && selectedRoundId && memberCode && !loadingMemberClaims && (
        <p className="mt-4 text-center text-sm text-bark/40">暂无申领记录</p>
      )}
    </div>
  )
}
