import { RARITY_PROBABILITIES, WEAR_PROBABILITIES, getRarityPercentage, getRarityProbability } from '../config/rarityConfig'
import type { Rarity, WearLevel } from '../config/rarityConfig'

export interface ProbabilityDisplayProps {
  /** 是否显示磨损等级概率 */
  showWearLevels?: boolean
}

/**
 * 概率公示组件
 * 展示当前的稀有度概率和磨损等级概率
 * 使用实时数据，不硬编码概率值
 */
export default function ProbabilityDisplay({ showWearLevels = false }: ProbabilityDisplayProps) {
  // 稀有度配置
  const rarityItems: Array<{ key: Rarity; label: string; color: string }> = [
    { key: 'blue', label: '军规级', color: '#4B69FF' },
    { key: 'purple', label: '受限级', color: '#8847FF' },
    { key: 'pink', label: '保密级', color: '#D32CE6' },
    { key: 'red', label: '隐秘级', color: '#EB4B4B' },
    { key: 'gold', label: '极其罕见特殊物品', color: '#FFD700' }
  ]

  // 磨损等级配置
  const wearItems: Array<{ key: WearLevel; label: string; color: string }> = [
    { key: 'factory-new', label: '崭新出厂', color: '#00FF00' },
    { key: 'minimal-wear', label: '略有磨损', color: '#7FFF00' },
    { key: 'field-tested', label: '久经沙场', color: '#FFFF00' },
    { key: 'well-worn', label: '破损不堪', color: '#FF7F00' },
    { key: 'battle-scarred', label: '战痕累累', color: '#FF0000' }
  ]

  return (
    <div className="space-y-4">
      {/* 稀有度概率 */}
      <div>
        <div className="text-sm font-medium mb-3 flex items-center gap-2">
          <span>稀有度概率</span>
          <span className="text-xs opacity-60">（实时数据）</span>
        </div>
        <div className="space-y-2">
          {rarityItems.map(({ key, label, color }) => {
            const percentage = getRarityPercentage(key)
            const probability = getRarityProbability(key)
            
            return (
              <div key={key} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded border border-white/20"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm" style={{ color }}>
                    {label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono">{percentage}</span>
                  <span className="text-xs opacity-60">({(probability * 100).toFixed(1)}%)</span>
                </div>
              </div>
            )
          })}
        </div>
        
        {/* 概率总和验证 */}
        <div className="mt-2 text-xs opacity-60 text-center">
          总概率：{Object.values(RARITY_PROBABILITIES).reduce((sum, prob) => sum + prob, 0).toFixed(3)} (100.0%)
        </div>
      </div>

      {/* 磨损等级概率（可选显示） */}
      {showWearLevels && (
        <div className="pt-4 border-t border-white/10">
          <div className="text-sm font-medium mb-3 flex items-center gap-2">
            <span>磨损等级概率</span>
            <span className="text-xs opacity-60">（实时数据）</span>
          </div>
          <div className="space-y-2">
            {wearItems.map(({ key, label, color }) => {
              const probability = WEAR_PROBABILITIES[key]
              const percentage = (probability * 100).toFixed(1)
              
              return (
                <div key={key} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded border border-white/20"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-sm" style={{ color }}>
                      {label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono">{percentage}%</span>
                  </div>
                </div>
              )
            })}
          </div>
          
          {/* 概率总和验证 */}
          <div className="mt-2 text-xs opacity-60 text-center">
            总概率：{Object.values(WEAR_PROBABILITIES).reduce((sum, prob) => sum + prob, 0).toFixed(3)} (100.0%)
          </div>
        </div>
      )}
      
      {/* 说明文字 */}
      <div className="text-xs opacity-60 p-3 rounded-lg bg-white/5 border border-white/10">
        <div className="font-medium mb-1">📊 概率说明</div>
        <div className="space-y-1">
          <div>• 以上概率为当前概率，实时更新</div>
          <div>• 稀有度概率影响轮盘中非目标项的随机生成</div>
          <div>• 目标学生的稀有度由系统随机分配</div>
          <div>• 目标学生的磨损等级由系统随机分配</div>
          {showWearLevels && <div>• 磨损等级仅影响视觉效果，不影响抽取结果</div>}
        </div>
      </div>
    </div>
  )
}