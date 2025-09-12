import { AnimatePresence, motion } from 'framer-motion'
import ResultCard from '../components/ResultCard'
import CompletionMenu from '../components/CompletionMenu'
import type { Student, RollResult } from '../store/appStore'

/**
 * ResultScreen 页面组件属性接口
 */
interface ResultScreenProps {
  /** 是否显示结果界面 */
  isOpen: boolean
  /** 抽奖结果 */
  lastResult: RollResult | null
  /** 选中的学生 */
  selectedStudent: Student | null
  /** 继续抽奖回调 */
  onContinue: () => void
  /** 返回主界面回调 */
  onClose: () => void
}

/**
 * 抽奖完成界面页面组件
 * 专门负责显示抽奖结果和提供后续操作选项
 * @param props 组件属性
 * @returns JSX 元素
 */
export default function ResultScreen({
  isOpen,
  lastResult,
  selectedStudent,
  onContinue,
  onClose
}: ResultScreenProps) {
  return (
    <AnimatePresence>
      {isOpen && lastResult && selectedStudent && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md"
          onClick={onClose}
        >
          {/* 主要内容区域 */}
          <div className="absolute inset-0 flex items-center justify-center p-8">
            {/* 背景装饰效果 */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {/* 径向渐变背景 */}
              <div className="absolute inset-0 bg-gradient-radial from-yellow-900/10 via-transparent to-transparent"></div>
              
              {/* 动态光效 */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="w-[800px] h-[800px] bg-gradient-conic from-yellow-500/5 via-orange-500/5 to-yellow-500/5 rounded-full animate-spin-slow"></div>
              </div>
              
              {/* 庆祝粒子效果 */}
              <div className="absolute inset-0">
                {Array.from({ length: 30 }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ 
                      opacity: 0, 
                      scale: 0,
                      x: Math.random() * window.innerWidth,
                      y: Math.random() * window.innerHeight
                    }}
                    animate={{ 
                      opacity: [0, 1, 0], 
                      scale: [0, 1, 0],
                      y: [0, -100, -200]
                    }}
                    transition={{
                      duration: 3,
                      delay: Math.random() * 2,
                      repeat: Infinity,
                      repeatDelay: Math.random() * 5
                    }}
                    className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                  ></motion.div>
                ))}
              </div>
            </div>

            {/* 顶部标题 */}
            <motion.div
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="absolute top-8 left-1/2 -translate-x-1/2 text-center"
            >
              <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                🎉 抽奖结果
              </h1>
            </motion.div>

            {/* 结果展示容器 */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: -20 }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 25,
                duration: 0.6
              }}
              className="relative max-w-2xl w-full"
              onClick={(e) => e.stopPropagation()}
            >

              {/* 结果卡片 */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.6, ease: "easeOut" }}
                className="flex justify-center"
              >
                <ResultCard
                  selectedStudent={selectedStudent}
                  lastResult={lastResult}
                />
              </motion.div>

              {/* 装饰边框 */}
              <div className="absolute -inset-8 border border-yellow-500/20 rounded-2xl pointer-events-none">
                {/* 四角光效 */}
                <div className="absolute -top-1 -left-1 w-4 h-4 bg-yellow-400/50 rounded-full blur-sm"></div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400/50 rounded-full blur-sm"></div>
                <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-yellow-400/50 rounded-full blur-sm"></div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-yellow-400/50 rounded-full blur-sm"></div>
              </div>
            </motion.div>

            {/* 操作菜单 - 横跨整个屏幕底部 */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="absolute bottom-0 left-0 right-0 flex justify-center py-4"
            >
              <CompletionMenu
                onContinue={onContinue}
                onClose={onClose}
              />
            </motion.div>


          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}