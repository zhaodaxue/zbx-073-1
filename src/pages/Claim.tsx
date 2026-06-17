import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Loader2, Send, Check, Minus, Plus } from 'lucide-react'
import { useStore } from '@/store'

export default function Claim() {
  const { roundId } = useParams<{ roundId: string }>()
  const { currentRound, fetchRoundDetail, submitClaim, memberClaims, fetchMemberClaims, submitting, error, clearError } = useStore()

  const [memberCode, setMemberCode] = useState('')
  const [category, setCategory] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [submitResult, setSubmitResult] = useState<'success' | null>(null)

  useEffect(() => {
    if (roundId) {
      fetchRoundDetail(Number(roundId))
    }
  }, [roundId, fetchRoundDetail])

  const canSubmit = memberCode.trim() && category && quantity >= 1 && quantity <= 5

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || !roundId) return
    clearError()

    const result = await submitClaim({
      roundId: Number(roundId),
      memberCode: memberCode.trim(),
      category,
      quantity,
    })

    if (result) {
      await fetchRoundDetail(Number(roundId))
      await fetchMemberClaims(Number(roundId), memberCode.trim())
      setSubmitResult('success')
    }
  }

  const handleNewClaim = () => {
    setSubmitResult(null)
    setCategory('')
    setQuantity(1)
  }

  const deadline = currentRound ? new Date(currentRound.deadline) : null

  if (!currentRound) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-wood animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-wood hover:text-wood/80 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        返回首页
      </Link>

      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-md border border-sand/60 p-6 mb-6">
        <h2 className="font-display text-xl font-bold text-bark mb-1">{currentRound.name}</h2>
        {deadline && (
          <p className="text-sm text-bark/60">
            截止：{deadline.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })} {deadline.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>

      {submitResult === 'success' ? (
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-md border border-sand/60 p-6 text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Check className="w-7 h-7 text-green-600" />
          </div>
          <h3 className="font-display text-lg font-semibold text-bark mb-2">申领成功</h3>
          <p className="text-sm text-bark/60 mb-4">
            已为 <span className="font-medium text-bark">{memberCode}</span> 申领 <span className="font-medium text-bark">{category}</span> x{quantity}
          </p>
          <button
            onClick={handleNewClaim}
            className="inline-flex items-center gap-2 py-2 px-4 bg-wood text-cream rounded-xl font-medium text-sm hover:bg-wood/90 shadow-sm hover:shadow transition-all"
          >
            继续申领
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-md border border-sand/60 p-6 space-y-4">
          <h3 className="font-display text-lg font-semibold text-bark">提交申领</h3>

          <div>
            <label className="block text-sm font-medium text-bark/70 mb-1">成员代号</label>
            <input
              type="text"
              value={memberCode}
              onChange={(e) => setMemberCode(e.target.value)}
              placeholder="输入你的成员代号"
              className="w-full px-4 py-2.5 border border-sand rounded-xl bg-cream/50 text-bark placeholder:text-bark/30 focus:outline-none focus:ring-2 focus:ring-wood/30 focus:border-wood text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-bark/70 mb-1">材料类目</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2.5 border border-sand rounded-xl bg-cream/50 text-bark focus:outline-none focus:ring-2 focus:ring-wood/30 focus:border-wood text-sm"
            >
              <option value="">选择类目</option>
              {currentRound.categories.map((cat) => (
                <option key={cat.name} value={cat.name}>{cat.name}（剩余 {cat.stockLimit - cat.claimed}）</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-bark/70 mb-1">申领份额</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 flex items-center justify-center border border-sand rounded-xl bg-cream/50 text-bark hover:bg-sand/50 transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-xl font-semibold text-bark w-8 text-center">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity(Math.min(5, quantity + 1))}
                className="w-10 h-10 flex items-center justify-center border border-sand rounded-xl bg-cream/50 text-bark hover:bg-sand/50 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-ochre/10 border border-ochre/30 rounded-xl px-4 py-2.5 text-sm text-ochre">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-wood text-cream rounded-xl font-medium hover:bg-wood/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow transition-all"
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
            {submitting ? '提交中...' : '提交申领'}
          </button>
        </form>
      )}

      {memberClaims.length > 0 && (
        <div className="mt-6 bg-white/90 backdrop-blur-sm rounded-2xl shadow-md border border-sand/60 p-6">
          <h3 className="font-display text-lg font-semibold text-bark mb-3">我的申领</h3>
          <div className="space-y-2">
            {memberClaims.map((claim) => {
              const resultBadge = () => {
                switch (claim.result) {
                  case 'won': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">中签</span>
                  case 'lost': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">未中签</span>
                  default: return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">待抽签</span>
                }
              }
              return (
                <div key={claim.id} className="flex items-center justify-between bg-cream/70 rounded-xl p-3 border border-sand/50">
                  <div>
                    <span className="text-sm font-medium text-bark">{claim.category}</span>
                    <span className="text-xs text-bark/50 ml-2">x{claim.quantity}</span>
                  </div>
                  {resultBadge()}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
