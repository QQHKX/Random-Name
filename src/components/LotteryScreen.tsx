import { AnimatePresence, motion } from 'framer-motion'
import Roulette from './Roulette'
import ResultCard from './ResultCard'
import CompletionMenu from './CompletionMenu'
import type { Rarity, Student, RollResult } from '../store/appStore'

/**
 * LotteryScreen 组件属性接口
 */
interface LotteryScreenProps {
  /** 是否显示抽奖界面 */
  isOpen: boolean
  /** 轮盘滚动项目列表 */
  rollItems: { id: string; name: string; rarity: Rarity }[] | null
  /** 目标项目索引 */
  targetIndex: number
  /** 抽奖速度设置 */
  speed: 'slow' | 'normal' | 'fast'
  /** 轮盘滚动完成回调 */
  onRoulettComplete: () => void
  /** 是否显示结果揭晓 */
  showReveal: boolean
  /** 抽奖结果 */
  lastResult: RollResult | null
  /** 选中的学生 */
  selectedStudent: Student | null
  /** 继续抽奖回调 */
  onContinue: () => void
  /** 点击遮罩关闭回调 */
  onClose: () => void
}

/**
 * 抽奖界面组件
 * 包含全屏轮盘滚动、结果揭晓和完成菜单等功能
 * @param props 组件属性
 * @returns JSX 元素
 */
export default function LotteryScreen({
  isOpen,
  rollItems,
  targetIndex,
  speed,
  onRoulettComplete,
  showReveal,
  lastResult,
  selectedStudent,
  onContinue,
  onClose
}: LotteryScreenProps) {
  return (
    <>
      {/* 抽奖全屏覆盖层 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50 bg-[var(--csgo-bg)] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* 全屏轮盘滚动区域 */}
            <div className="w-full h-full flex items-center justify-center relative">
              <AnimatePresence initial={false}>
                {rollItems && (
                  <Roulette
                    items={rollItems}
                    targetIndex={targetIndex}
                    speed={speed}
                    onComplete={onRoulettComplete}
                  />
                )}
              </AnimatePresence>
            </div>
            
            {/* CSGO风格透明圆形遮罩 - 放在最上层 */}
            <div 
              className="absolute inset-0 pointer-events-none z-20"
              style={{
                background: 'radial-gradient(circle at center, transparent 3%, rgba(0,0,0,0.3) 35%, rgba(0,0,0,0.6) 60%, rgba(0,0,0,1) 100%)'
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 居中放大揭晓层：将当选卡片移动到屏幕中央并放大，渲染稀有度光效 */}
      <AnimatePresence>
        {showReveal && lastResult && selectedStudent && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            // 点击遮罩关闭结果弹窗并退出全屏
            onClick={onClose}
          >
            <div className="relative w-full h-full">
              {/* 卡片容器 - 绝对居中 */}
              <div className="absolute inset-0 flex items-center justify-center">
                <ResultCard
                  selectedStudent={selectedStudent}
                  lastResult={lastResult}
                  onClick={(e) => { 
                    e.stopPropagation();
                  }}
                />
              </div>
              
              {/* 底部区域：分割线和按钮 - 固定在底部 */}
              <div className="absolute bottom-0 left-0 right-0">
                <CompletionMenu
                  selectedStudent={selectedStudent}
                  onContinue={onContinue}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}