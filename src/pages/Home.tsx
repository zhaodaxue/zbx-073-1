import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Layers, Loader2 } from 'lucide-react'
import { useStore } from '@/store'
import RoundCard from '@/components/RoundCard'
import MemberSidebar from '@/components/MemberSidebar'
import type { RoundDetail } from '@/store'

export default function Home() {
  const { rounds, loadingRounds, fetchRounds, fetchRoundDetail, currentRound } = useStore()
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [roundDetails, setRoundDetails] = useState<Record<number, RoundDetail>>({})

  useEffect(() => {
    fetchRounds()
  }, [fetchRounds])

  const handleToggle = async (roundId: number) => {
    if (expandedId === roundId) {
      setExpandedId(null)
      return
    }
    setExpandedId(roundId)
    if (!roundDetails[roundId]) {
      await fetchRoundDetail(roundId)
    }
  }

  useEffect(() => {
    if (currentRound && !roundDetails[currentRound.id]) {
      setRoundDetails((prev) => ({ ...prev, [currentRound.id]: currentRound }))
    }
  }, [currentRound])

  const getRoundDetail = (roundId: number): RoundDetail | null => {
    if (roundDetails[roundId]) return roundDetails[roundId]
    if (currentRound?.id === roundId) return currentRound
    const round = rounds.find((r) => r.id === roundId)
    if (!round) return null
    return { ...round, categories: round.categories.map((c) => ({ ...c, claimCount: 0, claims: [] })) }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl font-bold text-bark">轮次概览</h2>
          <Link
            to="/admin/rounds/new"
            className="inline-flex items-center gap-2 py-2 px-4 bg-wood text-cream rounded-xl font-medium text-sm hover:bg-wood/90 shadow-sm hover:shadow transition-all"
          >
            <Layers className="w-4 h-4" />
            发布轮次
          </Link>
        </div>

        {loadingRounds ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-wood animate-spin" />
          </div>
        ) : rounds.length === 0 ? (
          <div className="text-center py-20">
            <Layers className="w-12 h-12 text-sand mx-auto mb-3" />
            <p className="text-bark/50 text-lg">暂无轮次</p>
            <p className="text-bark/30 text-sm mt-1">点击右上角「发布轮次」创建新的材料申领轮次</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rounds.map((round) => {
              const detail = getRoundDetail(round.id)
              return (
                <RoundCard
                  key={round.id}
                  round={detail || { ...round, categories: round.categories.map((c) => ({ ...c, claimCount: 0, claims: [] })) }}
                  expanded={expandedId === round.id}
                  onToggle={() => handleToggle(round.id)}
                />
              )
            })}
          </div>
        )}
      </div>

      <div className="w-full lg:w-80 shrink-0">
        <div className="lg:sticky lg:top-24">
          <MemberSidebar rounds={rounds} />
        </div>
      </div>
    </div>
  )
}
