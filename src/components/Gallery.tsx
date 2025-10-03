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
 * 排序条件类型
 */
type SortKey = 'time' | 'rarity' | 'wear' | 'name'

/**
 * 排序规则接口
 */
interface SortRule {
  key: SortKey
  order: 'asc' | 'desc'
  priority: number // 优先级，数字越小优先级越高
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

// 已废弃：此前用于名称兼容的函数，现改为直接从 roster 或历史记录读取

/**
 * 收藏馆组件
 * 显示历史抽奖记录，支持搜索和多重排序功能
 * @param props 组件属性
 * @returns JSX 元素
 */
const Gallery = forwardRef<HTMLDivElement, GalleryProps>(({ className = '' }, ref) => {
  const { history, roster } = useAppStore()
  
  // 收藏馆：搜索与多重排序控制
  const [query, setQuery] = useState('')
  const [sortRules, setSortRules] = useState<SortRule[]>([
    { key: 'time', order: 'desc', priority: 1 }
  ])
  const [showAdvancedSort, setShowAdvancedSort] = useState(false)

  /**
   * 添加排序规则
   * @param key 排序字段
   * @param order 排序方向
   */
  const addSortRule = (key: SortKey, order: 'asc' | 'desc') => {
    const existingIndex = sortRules.findIndex(rule => rule.key === key)
    if (existingIndex >= 0) {
      // 如果已存在该字段，更新排序方向
      const newRules = [...sortRules]
      newRules[existingIndex].order = order
      setSortRules(newRules)
    } else {
      // 添加新的排序规则
      const newRule: SortRule = {
        key,
        order,
        priority: Math.max(...sortRules.map(r => r.priority), 0) + 1
      }
      setSortRules([...sortRules, newRule])
    }
  }

  /**
   * 移除排序规则
   * @param key 要移除的排序字段
   */
  const removeSortRule = (key: SortKey) => {
    setSortRules(sortRules.filter(rule => rule.key !== key))
  }

  /**
   * 调整排序规则优先级
   * @param key 排序字段
   * @param direction 调整方向
   */
  const adjustPriority = (key: SortKey, direction: 'up' | 'down') => {
    const newRules = [...sortRules]
    const index = newRules.findIndex(rule => rule.key === key)
    if (index < 0) return

    if (direction === 'up' && index > 0) {
      // 与前一个交换优先级
      const temp = newRules[index].priority
      newRules[index].priority = newRules[index - 1].priority
      newRules[index - 1].priority = temp
      newRules.sort((a, b) => a.priority - b.priority)
    } else if (direction === 'down' && index < newRules.length - 1) {
      // 与后一个交换优先级
      const temp = newRules[index].priority
      newRules[index].priority = newRules[index + 1].priority
      newRules[index + 1].priority = temp
      newRules.sort((a, b) => a.priority - b.priority)
    }
    
    setSortRules(newRules)
  }

  /**
   * 重置排序规则为默认状态
   */
  const resetSortRules = () => {
    setSortRules([{ key: 'time', order: 'desc', priority: 1 }])
  }
  
  /**
   * 过滤和多重排序后的历史记录
   */
  const filteredAndSortedHistory = useMemo(() => {
    // 过滤
    let filtered = history.filter(item => {
      const student = roster.find(s => s.id === item.studentId)
      const studentName = student?.name || '未知学生'
      return studentName.toLowerCase().includes(query.toLowerCase())
    })

    // 多重排序
    if (sortRules.length > 0) {
      filtered.sort((a, b) => {
        // 按优先级顺序应用排序规则
        const sortedRules = [...sortRules].sort((x, y) => x.priority - y.priority)
        
        for (const rule of sortedRules) {
          let comparison = 0
          
          switch (rule.key) {
            case 'time':
              comparison = a.timestamp - b.timestamp
              break
            case 'rarity':
              comparison = rarityOrderValue(a.rarity) - rarityOrderValue(b.rarity)
              break
            case 'wear':
              comparison = wearOrderValue(a.wearLevel) - wearOrderValue(b.wearLevel)
              break
            case 'name':
              const studentA = roster.find(s => s.id === a.studentId)
              const studentB = roster.find(s => s.id === b.studentId)
              const nameA = studentA?.name || '未知学生'
              const nameB = studentB?.name || '未知学生'
              comparison = nameA.localeCompare(nameB, 'zh-CN')
              break
          }
          
          if (comparison !== 0) {
            return rule.order === 'desc' ? -comparison : comparison
          }
        }
        
        return 0
      })
    }

    return filtered
  }, [history, roster, query, sortRules])

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
            
            {/* 统一的排序控制区域 */}
            {!showAdvancedSort ? (
              <>
                <select
                  value={sortRules[0]?.key || 'time'}
                  onChange={(e) => {
                    const key = e.target.value as SortKey
                    setSortRules([{ key, order: sortRules[0]?.order || 'desc', priority: 1 }])
                  }}
                  className="px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-sm [&>option]:bg-gray-800 [&>option]:text-white"
                  title="排序字段"
                >
                  <option value="time">按时间</option>
                  <option value="rarity">按稀有度</option>
                  <option value="wear">按磨损</option>
                  <option value="name">按姓名</option>
                </select>
                <select
                  value={sortRules[0]?.order || 'desc'}
                  onChange={(e) => {
                    const order = e.target.value as 'asc' | 'desc'
                    const key = sortRules[0]?.key || 'time'
                    setSortRules([{ key, order, priority: 1 }])
                  }}
                  className="px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-sm [&>option]:bg-gray-800 [&>option]:text-white"
                  title="排序方向"
                >
                  <option value="desc">倒序</option>
                  <option value="asc">正序</option>
                </select>
              </>
            ) : (
              <div className="text-sm text-white/70">
                多重排序已启用
              </div>
            )}
            
            <button
              onClick={() => setShowAdvancedSort(!showAdvancedSort)}
              className="px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-sm hover:bg-white/20 transition-colors"
              title={showAdvancedSort ? '切换到简单排序' : '切换到多重排序'}
            >
              {showAdvancedSort ? '简单' : '多重'}
            </button>
          </div>
        </div>
        
        {/* 多重排序控制面板 */}
        {showAdvancedSort && (
          <div className="mt-3 p-3 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium">排序规则（按优先级顺序）</div>
              <button
                onClick={resetSortRules}
                className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors"
              >
                重置
              </button>
            </div>
            
            {/* 当前排序规则列表 */}
            <div className="space-y-2 mb-3">
              {sortRules.map((rule, index) => (
                <div key={rule.key} className="flex items-center gap-2 p-2 rounded bg-white/5">
                  <div className="text-xs bg-sky-500/20 text-sky-300 px-2 py-1 rounded">
                    {index + 1}
                  </div>
                  <div className="flex-1 text-sm">
                    {rule.key === 'time' && '时间'}
                    {rule.key === 'rarity' && '稀有度'}
                    {rule.key === 'wear' && '磨损'}
                    {rule.key === 'name' && '姓名'}
                    <span className="ml-2 opacity-70">
                      ({rule.order === 'desc' ? '倒序' : '正序'})
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => adjustPriority(rule.key, 'up')}
                      disabled={index === 0}
                      className="text-xs px-1 py-1 rounded hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="提高优先级"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => adjustPriority(rule.key, 'down')}
                      disabled={index === sortRules.length - 1}
                      className="text-xs px-1 py-1 rounded hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="降低优先级"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => removeSortRule(rule.key)}
                      disabled={sortRules.length === 1}
                      className="text-xs px-2 py-1 rounded hover:bg-red-500/20 text-red-300 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="移除规则"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {/* 添加新排序规则 */}
            <div className="flex flex-wrap gap-2">
              {(['time', 'rarity', 'wear', 'name'] as SortKey[]).map(key => {
                const isActive = sortRules.some(rule => rule.key === key)
                const labels = { time: '时间', rarity: '稀有度', wear: '磨损', name: '姓名' }
                
                return (
                  <div key={key} className="flex items-center gap-1">
                    <button
                      onClick={() => addSortRule(key, 'desc')}
                      disabled={isActive}
                      className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
                      title={`按${labels[key]}倒序`}
                    >
                      {labels[key]}↓
                    </button>
                    <button
                      onClick={() => addSortRule(key, 'asc')}
                      disabled={isActive}
                      className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
                      title={`按${labels[key]}正序`}
                    >
                      {labels[key]}↑
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
        
        <div className="text-xs opacity-70 mt-2">
          共 {filteredAndSortedHistory.length} 条记录
          {sortRules.length > 1 && (
            <span className="ml-2">
              • 多重排序：{sortRules.map((rule, i) => {
                const labels = { time: '时间', rarity: '稀有度', wear: '磨损', name: '姓名' }
                return `${i + 1}.${labels[rule.key]}${rule.order === 'desc' ? '↓' : '↑'}`
              }).join(' → ')}
            </span>
          )}
        </div>
      </div>

      {/* 网格卡片 */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filteredAndSortedHistory.map((r) => {
          const student = roster.find(s => s.id === r.studentId)
          const displayName = student?.name || r.name || '未知学生'
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