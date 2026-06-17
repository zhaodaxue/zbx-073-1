import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Plus, Check, ArrowLeft, Loader2 } from 'lucide-react'
import { useStore } from '@/store'

const ALL_CATEGORIES = [
  '木材', '金属', '布料', '皮革', '陶瓷', '玻璃',
  '纸张', '颜料', '线绳', '粘合剂', '工具', '电子元件',
]

export default function NewRound() {
  const { createRound, submitting, error, clearError } = useStore()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [deadline, setDeadline] = useState('')
  const [selected, setSelected] = useState<Record<string, number | ''>>({})
  const [success, setSuccess] = useState(false)

  const toggleCategory = (cat: string) => {
    setSelected((prev) => {
      const next = { ...prev }
      if (next[cat] !== undefined) {
        delete next[cat]
      } else {
        next[cat] = ''
      }
      return next
    })
  }

  const handleStockChange = (cat: string, val: string) => {
    const num = val === '' ? '' : parseInt(val, 10)
    setSelected((prev) => ({ ...prev, [cat]: num === '' ? '' : Math.max(1, num as number) }))
  }

  const canSubmit = name.trim() && deadline && Object.keys(selected).length > 0
    && Object.values(selected).every((v) => v !== '' && v > 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    clearError()

    const categories = Object.entries(selected).map(([name, limit]) => ({
      name,
      stockLimit: limit as number,
    }))

    const result = await createRound({ name: name.trim(), deadline, categories })
    if (result) {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="font-display text-2xl font-bold text-bark mb-2">轮次已发布</h2>
        <p className="text-bark/60 mb-6">成员现在可以提交申领了</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 py-2.5 px-5 bg-wood text-cream rounded-xl font-medium text-sm hover:bg-wood/90 shadow-sm hover:shadow transition-all"
        >
          返回首页
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-wood hover:text-wood/80 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        返回首页
      </Link>

      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-md border border-sand/60 p-6">
        <h2 className="font-display text-2xl font-bold text-bark mb-6">发布新轮次</h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-bark/70 mb-1">轮次名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：6月材料申领"
              className="w-full px-4 py-2.5 border border-sand rounded-xl bg-cream/50 text-bark placeholder:text-bark/30 focus:outline-none focus:ring-2 focus:ring-wood/30 focus:border-wood"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-bark/70 mb-1">截止时刻</label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-4 py-2.5 border border-sand rounded-xl bg-cream/50 text-bark focus:outline-none focus:ring-2 focus:ring-wood/30 focus:border-wood"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-bark/70 mb-3">材料类目与库存上限</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {ALL_CATEGORIES.map((cat) => {
                const isSelected = selected[cat] !== undefined
                return (
                  <div key={cat} className="relative">
                    <button
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                        isSelected
                          ? 'bg-wood/10 border-wood text-bark shadow-sm'
                          : 'bg-cream/50 border-sand text-bark/50 hover:border-wood/40'
                      }`}
                    >
                      <span>{cat}</span>
                      {isSelected && <Check className="w-4 h-4 text-wood" />}
                    </button>
                    {isSelected && (
                      <div className="mt-1.5">
                        <input
                          type="number"
                          min={1}
                          value={selected[cat] === '' ? '' : selected[cat]}
                          onChange={(e) => handleStockChange(cat, e.target.value)}
                          placeholder="库存上限"
                          className="w-full px-3 py-1.5 border border-sand rounded-lg bg-cream/50 text-bark text-sm placeholder:text-bark/30 focus:outline-none focus:ring-2 focus:ring-wood/30 focus:border-wood"
                        />
                      </div>
                    )}
                  </div>
                )
              })}
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
              <Plus className="w-5 h-5" />
            )}
            {submitting ? '发布中...' : '发布轮次'}
          </button>
        </form>
      </div>
    </div>
  )
}
