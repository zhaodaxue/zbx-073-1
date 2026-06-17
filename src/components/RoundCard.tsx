import { ChevronDown, ChevronUp, Clock, Package, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { RoundDetail } from '@/store'
import CategoryBar from './CategoryBar'

interface RoundCardProps {
  round: RoundDetail
  expanded: boolean
  onToggle: () => void
}

const statusConfig = {
  open: { label: '进行中', bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
  closed: { label: '已截止', bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500' },
  drawn: { label: '已抽签', bg: 'bg-slate-200', text: 'text-slate-700', dot: 'bg-slate-500' },
}

export default function RoundCard({ round, expanded, onToggle }: RoundCardProps) {
  const status = statusConfig[round.status]
  const deadline = new Date(round.deadline)

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-300 border border-sand/60 overflow-hidden">
      <div
        className="p-5 cursor-pointer select-none"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-display text-lg font-semibold text-bark leading-tight">
            {round.name}
          </h3>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.text} shrink-0 ml-2`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>
        </div>

        <div className="flex items-center gap-4 text-sm text-bark/60">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {deadline.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })} {deadline.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className="flex items-center gap-1">
            <Package className="w-3.5 h-3.5" />
            {round.categories.length} 类目
          </span>
        </div>

        <div className="flex justify-center mt-2">
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-wood" />
          ) : (
            <ChevronDown className="w-5 h-5 text-wood/60" />
          )}
        </div>
      </div>

      {expanded && round.categories.length > 0 && (
        <div className="px-5 pb-5 border-t border-sand/60 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 mb-4">
            {round.categories.map((cat) => (
              <CategoryBar
                key={cat.name}
                name={cat.name}
                claimed={cat.claimed}
                stockLimit={cat.stockLimit}
              />
            ))}
          </div>
          {round.status === 'open' && (
            <Link
              to={`/claim/${round.id}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-wood text-cream rounded-xl font-medium text-sm hover:bg-wood/90 shadow-sm hover:shadow transition-all"
            >
              前往申领
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
