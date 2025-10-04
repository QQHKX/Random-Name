import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../store/appStore'
import { getMaxHistoryRecords, formatStorageSize } from '../config/storageConfig'
import { sfx } from '../lib/audioManager'

export interface StorageModalProps {
  /** 是否显示弹窗 */
  open: boolean
  /** 关闭弹窗回调 */
  onClose: () => void
}

/**
 * 存储管理弹窗组件
 * - 显示历史记录存储状态与管理操作
 * - 弹窗形式，支持滚动浏览
 */
export default function StorageModal({ open, onClose }: StorageModalProps) {
  const clearHistory = useAppStore((s) => s.clearHistory)
  const historyCount = useAppStore((s) => s.history.length)
  const history = useAppStore((s) => s.history)

  const maxRecords = getMaxHistoryRecords()
  const usage = Math.min((historyCount / maxRecords) * 100, 100)
  const usageColor = historyCount / maxRecords > 0.8
    ? 'bg-red-500'
    : historyCount / maxRecords > 0.6
    ? 'bg-yellow-500'
    : 'bg-green-500'

  /**
   * 处理清空历史记录
   */
  const handleClearHistory = () => {
    sfx.click()
    if (historyCount === 0) return
    if (confirm(`确定删除全部 ${historyCount} 条抽奖记录？该操作不可恢复。`)) {
      clearHistory()
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            className="absolute inset-0 bg-black/60" 
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
          <motion.div 
            className="relative w-[min(680px,95vw)] max-h-[85vh] rounded-xl border border-white/10 bg-[var(--csgo-panel)] shadow-2xl text-white overflow-hidden flex flex-col"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between p-6 pb-4 flex-shrink-0 border-b border-white/10">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold">存储管理</h2>
                <span className="text-xs px-2 py-1 rounded bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  {historyCount} / {maxRecords} 条
                </span>
              </div>
              <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">✕</button>
            </div>
            
            {/* 可滚动内容区 */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              {/* 存储状态卡片 */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">历史记录存储</h3>
                  <div className="text-xs opacity-60">
                    使用率: {usage.toFixed(1)}%
                  </div>
                </div>
                
                {/* 存储进度条 */}
                <div className="mb-3">
                  <div className="w-full bg-white/10 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-300 ${usageColor}`}
                      style={{ width: `${usage}%` }}
                    />
                  </div>
                </div>
                
                <div className="text-xs opacity-60 mb-3">
                  当前存储限制：{formatStorageSize(maxRecords)}，
                  {historyCount >= maxRecords 
                    ? '已达到存储上限，新记录将覆盖最旧的记录' 
                    : `还可存储 ${maxRecords - historyCount} 条记录`}
                </div>
                
                {/* 操作按钮 */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    disabled={historyCount === 0}
                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 border border-red-300/30 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="清空抽奖记录"
                  >
                    清空记录
                  </button>
                </div>
              </div>

              {/* 历史记录列表 */}
              {historyCount > 0 && (
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h3 className="text-sm font-medium mb-3">最近记录</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {history.slice(-10).reverse().map((record, index) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            record.rarity === 'gold' ? 'bg-yellow-500' :
                            record.rarity === 'red' ? 'bg-red-500' :
                            record.rarity === 'pink' ? 'bg-pink-500' :
                            record.rarity === 'purple' ? 'bg-purple-500' :
                            'bg-blue-500'
                          }`} />
                          <span className="text-sm font-medium">{record.name}</span>
                        </div>
                        <div className="text-xs opacity-60">
                          {new Date(record.timestamp).toLocaleString('zh-CN', {
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  {historyCount > 10 && (
                    <div className="text-xs opacity-60 mt-2 text-center">
                      仅显示最近 10 条记录，共 {historyCount} 条
                    </div>
                  )}
                </div>
              )}

              {/* 空状态 */}
              {historyCount === 0 && (
                <div className="p-8 text-center">
                  <div className="text-4xl mb-3 opacity-30">📊</div>
                  <div className="text-sm opacity-60 mb-2">暂无历史记录</div>
                  <div className="text-xs opacity-40">开始抽取后，记录将显示在这里</div>
                </div>
              )}

              {/* 提示信息 */}
              <div className="p-4 rounded-xl bg-blue-600/10 border border-blue-500/20">
                <div className="text-xs opacity-80">
                  💡 提示：收藏馆现已支持存储 {formatStorageSize(maxRecords)}，相比之前的200条大幅提升。
                  当存储满时，系统会自动删除最旧的记录以腾出空间。
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}