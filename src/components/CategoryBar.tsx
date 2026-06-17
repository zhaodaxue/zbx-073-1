import { AlertTriangle } from 'lucide-react'

interface CategoryBarProps {
  name: string
  claimed: number
  stockLimit: number
}

export default function CategoryBar({ name, claimed, stockLimit }: CategoryBarProps) {
  const isOver = claimed > stockLimit
  const pct = stockLimit > 0 ? Math.min((claimed / stockLimit) * 100, 100) : 0
  const overPct = stockLimit > 0 && isOver ? ((claimed - stockLimit) / stockLimit) * 100 : 0

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-bark">{name}</span>
        {isOver && <AlertTriangle className="w-4 h-4 text-ochre" />}
      </div>
      <div className="w-full h-3 bg-sand rounded-full overflow-hidden relative">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isOver ? 'bg-ochre' : 'bg-wood'}`}
          style={{ width: `${pct}%` }}
        />
        {isOver && (
          <div
            className="absolute top-0 h-full bg-ochre/50 rounded-r-full transition-all duration-500"
            style={{ left: '100%', width: `${Math.min(overPct, 50)}%` }}
          />
        )}
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className={`text-xs ${isOver ? 'text-ochre font-semibold' : 'text-bark/70'}`}>
          已申领 {claimed} / 上限 {stockLimit}
        </span>
        {isOver && (
          <span className="text-xs text-ochre font-semibold">
            超额 {claimed - stockLimit}
          </span>
        )}
      </div>
    </div>
  )
}
