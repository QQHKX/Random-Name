import { AnimatePresence, motion } from 'framer-motion'
import Roulette from '../components/Roulette'
import type { Rarity } from '../store/appStore'

/**
 * RouletteScreen 页面组件属性接口
 */
interface RouletteScreenProps {
  /** 是否显示轮盘界面 */
  isOpen: boolean
  /** 轮盘滚动项目列表 */
  rollItems: { id: string; name: string; rarity: Rarity }[] | null
  /** 目标项目索引 */
  targetIndex: number
  /** 抽奖速度设置 */
  speed: 'slow' | 'normal' | 'fast'
  /** 轮盘滚动完成回调 */
  onComplete: () => void
}

/**
 * 抽奖轮盘界面页面组件
 * 专门负责全屏轮盘滚动动画和抽奖过程展示
 * @param props 组件属性
 * @returns JSX 元素
 */
export default function RouletteScreen({
  isOpen,
  rollItems,
  targetIndex,
  speed,
  onComplete
}: RouletteScreenProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm"
        >
          {/* 全屏轮盘容器 */}
          <div className="absolute inset-0 flex items-center justify-center">
            {/* 背景装饰 */}
            <div className="absolute inset-0 overflow-hidden">
              {/* 径向渐变背景 */}
              <div className="absolute inset-0 bg-gradient-radial from-blue-900/20 via-transparent to-transparent"></div>
              
              {/* 动态光效 */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="w-96 h-96 bg-gradient-conic from-blue-500/10 via-purple-500/10 to-blue-500/10 rounded-full animate-spin-slow"></div>
              </div>
              
              {/* 粒子效果背景 */}
              <div className="absolute inset-0">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-1 h-1 bg-blue-400/30 rounded-full animate-pulse"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 2}s`,
                      animationDuration: `${2 + Math.random() * 3}s`
                    }}
                  ></div>
                ))}
              </div>
            </div>

            {/* 轮盘组件容器 */}
            <div className="relative z-10 w-full max-w-6xl mx-auto px-8">
              {/* 顶部提示文字 */}
              <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="text-center mb-8"
              >
                <h2 className="text-4xl font-bold text-white mb-2">
                  🎲 抽奖进行中
                </h2>
                <p className="text-xl text-gray-300">
                  请等待轮盘停止...
                </p>
              </motion.div>

              {/* 轮盘组件 */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0, duration: 0.2, ease: "easeOut" }}
                className="relative flex justify-center"
              >
                {rollItems && (
                  <Roulette
                    items={rollItems}
                    targetIndex={targetIndex}
                    speed={speed}
                    onComplete={onComplete}
                  />
                )}
              </motion.div>

              {/* 底部装饰 */}
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="text-center mt-8"
              >
                <div className="flex items-center justify-center gap-2 text-gray-400">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  <span className="text-sm">QQHKX 抽奖系统</span>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                </div>
              </motion.div>
            </div>

            {/* 边框装饰 */}
            <div className="absolute inset-4 border border-blue-500/20 rounded-lg pointer-events-none">
              {/* 四角装饰 */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-blue-400/50"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-blue-400/50"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-blue-400/50"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-blue-400/50"></div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}