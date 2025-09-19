import { motion } from 'framer-motion'
import type { Student } from '../store/appStore'
import { getWearLevelInfo, drawWearLevel } from '../config/rarityConfig'
import type { Rarity } from '../store/appStore'

/**
 * 结果卡片组件的属性接口
 */
interface ResultCardProps {
  /** 选中的学生信息 */
  selectedStudent: Student | null
  /** 抽取结果信息 */
  lastResult: {
    rarity: Rarity
    wearLevel?: any
    wearValue?: number
    /**
     * 中奖者姓名（来自持久化的 lastResult，作为结果展示的唯一真相来源）
     */
    name?: string
  } | null
  /** 点击卡片时的回调函数 */
  onClick?: (e: React.MouseEvent) => void
}

/**
 * 获取稀有度对应的背景样式
 * @param r 稀有度等级
 * @returns 背景样式字符串
 */
export function rarityBg(r: Rarity) {
  const gradients = {
    blue: 'linear-gradient(135deg, rgba(75,105,255,0.15) 0%, rgba(75,105,255,0.08) 50%, rgba(75,105,255,0.15) 100%)',
    purple: 'linear-gradient(135deg, rgba(136,71,255,0.18) 0%, rgba(136,71,255,0.10) 50%, rgba(136,71,255,0.18) 100%)',
    pink: 'linear-gradient(135deg, rgba(211,44,230,0.18) 0%, rgba(211,44,230,0.10) 50%, rgba(211,44,230,0.18) 100%)',
    red: 'linear-gradient(135deg, rgba(235,75,75,0.22) 0%, rgba(235,75,75,0.12) 50%, rgba(235,75,75,0.22) 100%)',
    gold: 'linear-gradient(135deg, rgba(255,215,0,0.25) 0%, rgba(255,215,0,0.15) 50%, rgba(255,215,0,0.25) 100%)',
  }
  return gradients[r] || gradients.blue
}

/**
 * 获取稀有度的中文标签
 * @param r 稀有度等级
 * @returns 中文标签
 */
export function rarityLabelCN(r: Rarity): string {
  const labels = {
    blue: '军规级',
    purple: '受限',
    pink: '保密',
    red: '隐秘',
    gold: '非凡',
  }
  return labels[r] || '未知'
}

/**
 * 结果卡片组件
 * 显示抽取结果的卡片，包含学生信息、稀有度、磨损等信息
 * - 姓名展示采用 lastResult.name 作为唯一真相来源，确保与动画页（finalName）和历史存储（history[].name）一致
 */
const ResultCard: React.FC<ResultCardProps> = ({ selectedStudent, lastResult, onClick }) => {
  // 如果数据不完整，显示加载状态
  if (!selectedStudent || !lastResult) {
    return (
      <motion.div
        className="relative"
        initial={{ y: 20, scale: 0.78, opacity: 0 }}
        animate={{ y: 0, scale: 1.25, opacity: 1 }}
        exit={{ y: -10, scale: 0.92, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 240, damping: 22 }}
      >
        <div className="w-[420px] max-w-[92vw] h-[200px] rounded-2xl border border-white/12 bg-gray-800 flex items-center justify-center">
          <p className="text-gray-400">加载中...</p>
        </div>
      </motion.div>
    )
  }

  // 统一的展示姓名：优先 lastResult.name（来自存储），回退 selectedStudent.name，最终回退 "Unknown"
  const displayName = (lastResult?.name as string | undefined) ?? selectedStudent?.name ?? 'Unknown'
  const displayInitial = displayName.length > 0 ? displayName.charAt(0).toUpperCase() : '?'

  return (
    <motion.div
      className="relative"
      initial={{ y: 20, scale: 0.78, opacity: 0 }}
      animate={{ y: 0, scale: 1.25, opacity: 1 }}
      exit={{ y: -10, scale: 0.92, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 240, damping: 22 }}
      onClick={onClick}
    >
      {/* 主卡片 */}
      <div
        className="w-[420px] max-w-[92vw] h-[200px] rounded-2xl border border-white/12 box-border flex items-center justify-start gap-6 px-8 py-4 relative shadow-[0_0_40px_rgba(0,0,0,0.35)]"
        style={{
          background: rarityBg(lastResult.rarity),
        }}
      >
        {/* 稀有度色带边框与内发光 */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ boxShadow: `inset 0 0 0 2px var(--rarity-${lastResult.rarity})` }}
        />
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ boxShadow: `0 0 42px 10px var(--rarity-${lastResult.rarity})`, animation: 'shimmer 1.6s linear infinite' }}
        />
        {(lastResult.rarity === 'gold' || lastResult.rarity === 'red') && (
          <div
            className="absolute -inset-3 rounded-3xl pointer-events-none"
            style={{
              background:
                'linear-gradient(120deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 28%, rgba(255,255,255,0) 72%, rgba(255,255,255,0.10) 100%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.8s linear infinite',
              mixBlendMode: 'screen',
            }}
          />
        )}

        <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center text-2xl font-bold text-white/90 flex-shrink-0">
          {displayInitial}
        </div>
        <div className="text-left flex-1 flex flex-col justify-center">
          <div className="text-3xl font-bold tracking-wide mb-1">{displayName}</div>
          <div className="text-sm opacity-90 mb-2">稀有度：{rarityLabelCN(lastResult.rarity)}</div>
          <div className="text-[10px] text-white/60 whitespace-nowrap truncate">
            磨损：
            {(() => {
              const wl = (lastResult?.wearLevel ?? drawWearLevel());
              const info = getWearLevelInfo(wl);
              return (
                <span className="font-medium ml-1 opacity-80" style={{ color: info.color }}>
                  {info.label}
                </span>
              );
            })()}
            <span className="mx-1">·</span>
            磨损值：{(lastResult?.wearValue ?? 0).toFixed(4)}
          </div>
        </div>
      </div>

      {/* 稀有度色值与特效关键帧 */}
      <style>{`
        :root {
          --rarity-blue: rgba(75,105,255,0.75);
          --rarity-purple: rgba(136,71,255,0.85);
          --rarity-pink: rgba(211,44,230,0.85);
          --rarity-red: rgba(235,75,75,0.9);
          --rarity-gold: rgba(255,215,0,0.9);
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 1; }
        }
      `}</style>
    </motion.div>
  )
}

export default ResultCard