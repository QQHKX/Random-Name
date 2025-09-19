import { useMemo, useState, forwardRef } from 'react'
import { useAppStore } from '../store/appStore'
import { rarityBg, rarityLabelCN } from './ResultCard'
import { getWearLevelInfo, drawWearLevel } from '../config/rarityConfig'
import type { Rarity } from '../store/appStore'
import type { WearLevel } from '../config/rarityConfig'

/**
 * Gallery 组件属性接口
 */
interface GalleryProps {
  /** 自定义类名 */
  className?: string
}

/**
 * 将稀有度映射为可比较的权重（值越大稀有度越高）
 * @param r 稀有度键
 * @returns 数值权重
 */
function rarityOrderValue(r: Rarity): number {
  switch (r) {
    case 'gold': return 5
    case 'red': return 4
    case 'pink': return 3
    case 'purple': return 2
    case 'blue': return 1
    default: return 0
  }
}

/**
 * 将磨损等级映射为可比较的权重（值越大品质越好）
 * @param level 磨损等级
 * @returns 数值权重
 */
function wearOrderValue(level: WearLevel): number {
  switch (level) {
    case 'factory-new': return 5
    case 'minimal-wear': return 4
    case 'field-tested': return 3
    case 'well-worn': return 2
    case 'battle-scarred': return 1
    default: return 0
  }
}

/**
 * 格式化时间戳为可读字符串
 * @param ts 时间戳（毫秒）
 * @returns 格式化的时间字符串
 */
function formatTime(ts: number): string {
  const date = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - ts
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  
  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins}分钟前`
  if (diffHours < 24) return `${diffHours}小时前`
  if (diffDays < 7) return `${diffDays}天前`
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/**
 * 根据历史记录和 roster 生成安全的显示名称
 * - 优先使用历史记录中的 name，确保与当时抽取结果一致
 * - 回退到 roster 中的姓名（若历史数据缺失 name）
 * - 最终回退到 'Unknown'
 */
function safeDisplayName(studentId: string, historyName: string | undefined, roster: { id: string, name: string }[]): string {
  if (historyName && historyName.trim().length > 0) return historyName
  const rosterMap = new Map(roster.map(s => [s.id, s]))
  return rosterMap.get(studentId)?.name ?? 'Unknown'
}

/**
 * 收藏馆组件
 * 显示历史抽奖记录，支持搜索和排序功能
 * @param props 组件属性
 * @returns JSX 元素
 */
const Gallery = forwardRef<HTMLDivElement, GalleryProps>(({ className = '' }, ref) => {
  const { history, roster } = useAppStore()
  
  // 收藏馆：搜索与排序控制
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<'time' | 'rarity' | 'wear'>('time')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')
  
  /**
   * 基于搜索与排序规则生成可见的历史记录列表
   * - 默认时间倒序（最新在前）
   * - 搜索按姓名包含匹配（不区分大小写）
   */
  const visibleRecords = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = q ? history.filter(h => safeDisplayName(h.studentId, h.name, roster).toLowerCase().includes(q)) : history.slice()
    base.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'time') {
        cmp = a.timestamp - b.timestamp
      } else if (sortKey === 'rarity') {
        cmp = rarityOrderValue(a.rarity) - rarityOrderValue(b.rarity)
      } else {
        // wear：按等级权重排序（更新 → 更旧）
        cmp = wearOrderValue(a.wearLevel) - wearOrderValue(b.wearLevel)
      }
      return sortOrder === 'asc' ? cmp : -cmp
    })
    return base
  }, [history, query, sortKey, sortOrder, roster])

  return (
    <div ref={ref} className={`max-w-[980px] mx-auto px-4 md:px-0 pb-12 ${className}`}>
      <div className="h-10" />
      <div className="sticky top-0 z-10 -mx-4 md:mx-0 px-4 md:px-0 py-3 backdrop-blur border-b border-white/10">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="text-2xl font-bold tracking-wide">收藏馆</div>
          <div className="flex items-center gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索姓名…"
              className="px-3 py-2 rounded-lg bg-white/10 border border-white/15 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
            />
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as any)}
              className="px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-sm [&>option]:bg-gray-800 [&>option]:text-white"
              title="排序字段"
            >
              <option value="time">按时间</option>
              <option value="rarity">按稀有度</option>
              <option value="wear">按磨损</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-sm [&>option]:bg-gray-800 [&>option]:text-white"
              title="排序方向"
            >
              <option value="desc">倒序</option>
              <option value="asc">正序</option>
            </select>
          </div>
        </div>
        <div className="text-xs opacity-70 mt-1">共 {visibleRecords.length} 条记录，默认按抽中时间倒序</div>
      </div>

      {/* 网格卡片 */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {visibleRecords.map((r) => {
          const displayName = safeDisplayName(r.studentId, r.name, roster)
          const initial = displayName.length > 0 ? displayName.charAt(0).toUpperCase() : '?'
          return (
            <div
              key={`${r.id}-${r.timestamp}`}
              className="rounded-xl border border-white/10 p-3 bg-black/20 shadow-md hover:shadow-lg transition-shadow"
              style={{ background: rarityBg(r.rarity) }}
              title={`${displayName} @ ${formatTime(r.timestamp)}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold text-white/90">
                  {initial}
                </div>
                <div className="font-semibold truncate" title={displayName}>{displayName}</div>
              </div>
              <div className="text-[10px] opacity-80 mb-1">稀有度：{rarityLabelCN(r.rarity)}</div>
              <div className="text-[10px] opacity-80">磨损：
                {(() => {
                  const wl = (r.wearLevel ?? drawWearLevel())
                  const info = getWearLevelInfo(wl)
                  return (
                    <span className="ml-1 font-medium" style={{ color: info.color }}>
                      {info.label}
                    </span>
                  )
                })()}
                <span className="ml-1 opacity-70">({(r.wearValue ?? 0).toFixed(4)})</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
})

Gallery.displayName = 'Gallery'

export default Gallery