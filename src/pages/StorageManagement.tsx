import { useAppStore } from '../store/appStore'
import { getMaxHistoryRecords, formatStorageSize } from '../config/storageConfig'
import { sfx } from '../lib/audioManager'

interface StorageManagementProps {
  onBack: () => void
}

/**
 * 存储管理独立页面
 * - 显示历史记录存储状态与管理操作
 * - 可滚动浏览，提升操作便捷性
 */
export default function StorageManagement({ onBack }: StorageManagementProps) {
  const clearHistory = useAppStore((s) => s.clearHistory)
  const historyCount = useAppStore((s) => s.history.length)

  const maxRecords = getMaxHistoryRecords()
  const usage = Math.min((historyCount / maxRecords) * 100, 100)
  const usageColor = historyCount / maxRecords > 0.8
    ? 'bg-red-500'
    : historyCount / maxRecords > 0.6
    ? 'bg-yellow-500'
    : 'bg-green-500'

  return (
    <div className="min-h-screen w-full bg-[var(--csgo-panel)]/60 backdrop-blur-xl">
      {/* 顶部栏 */}
      <div className="sticky top-0 z-20 bg-[var(--csgo-panel)]/80 border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => { sfx.click(); onBack() }}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-white transition-colors"
            title="返回首页"
          >
            返回
          </button>
          <h1 className="text-base lg:text-lg font-semibold">存储管理</h1>
        </div>
        <span className="text-xs px-2 py-1 rounded bg-blue-600/20 text-blue-400 border border-blue-500/30">
          {historyCount} / {maxRecords} 条
        </span>
      </div>

      {/* 可滚动内容区 */}
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* 存储状态卡片 */}
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm">历史记录存储</span>
            <span className="text-xs px-2 py-1 rounded bg-blue-600/20 text-blue-400 border border-blue-500/30">
              {historyCount} / {maxRecords} 条
            </span>
          </div>

          {/* 存储进度条 */}
          <div className="mb-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span>存储使用率</span>
              <span>{usage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${usageColor}`}
                style={{ width: `${usage}%` }}
              />
            </div>
          </div>

          <div className="text-xs opacity-60">
            当前存储限制：{formatStorageSize(maxRecords)}，
            {historyCount >= maxRecords
              ? '已达到存储上限，新记录将覆盖最旧的记录'
              : `还可存储 ${maxRecords - historyCount} 条记录`}
          </div>
        </div>

        {/* 管理操作区域 */}
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm opacity-75">历史记录管理</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  sfx.click()
                  if (historyCount === 0) return
                  if (confirm(`确定删除全部 ${historyCount} 条抽奖记录？该操作不可恢复。`)) {
                    clearHistory()
                  }
                }}
                disabled={historyCount === 0}
                className="px-3 py-2 rounded-md bg-red-600 hover:bg-red-500 border border-red-300/30 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="清空抽奖记录"
              >
                清空记录
              </button>
            </div>
          </div>

          <div className="text-xs opacity-60">
            收藏馆现已支持存储 {formatStorageSize(maxRecords)}，当存储满时会自动删除最旧记录以腾出空间。
          </div>
        </div>

        {/* 预留：未来可扩展更多存储相关功能，滚动查看更便捷 */}
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="text-sm font-medium mb-2">更多设置（占位）</div>
          <p className="text-xs opacity-60">此页面支持纵向滚动，便于未来添加更多存储相关的设置与工具。</p>
        </div>
      </div>
    </div>
  )
}