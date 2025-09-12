import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../store/appStore'
import type { Student } from '../store/appStore'

/**
 * 已抽取名单侧边栏组件属性接口
 */
export interface DrawnStudentsSidebarProps {
  /** 是否显示侧边栏 */
  visible: boolean
  /** 自定义类名 */
  className?: string
}

/**
 * 已抽取名单侧边栏组件
 * 显示已抽取的学生名单，包含进度信息和学生列表
 * @param props 组件属性
 * @returns JSX 元素
 */
const DrawnStudentsSidebar: React.FC<DrawnStudentsSidebarProps> = ({
  visible,
  className = ''
}) => {
  // 从状态管理中获取数据
  const { roster, settings, pool } = useAppStore()
  
  // 计算已抽取的学生
  const drawnStudents = React.useMemo(() => {
    if (!settings.noRepeat) return []
    return roster.filter(student => !pool.includes(student.id))
  }, [roster, pool, settings.noRepeat])

  // 如果不可见或没有已抽取学生，则不渲染
  if (!visible || drawnStudents.length === 0) {
    return null
  }

  /**
   * 渲染单个学生项
   * @param student 学生信息
   * @param index 索引
   * @returns JSX 元素
   */
  const renderStudentItem = (student: Student, index: number) => (
    <div 
      key={student.id} 
      className="flex items-center gap-1.5 p-1 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
    >
      <div className="w-4 h-4 lg:w-5 lg:h-5 rounded-full bg-gradient-to-r from-[var(--csgo-blue)] to-[var(--csgo-orange)] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
        {index + 1}
      </div>
      <div className="flex-1 truncate text-xs font-medium" title={student.name}>
        {student.name}
      </div>
    </div>
  )

  return (
    <AnimatePresence>
      {visible && drawnStudents.length > 0 && (
        <motion.div 
          className={`sticky top-3 ${className}`}
          initial={{ opacity: 0, x: -30, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -30, scale: 0.95 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <motion.div 
            className="bg-[var(--csgo-panel)]/80 backdrop-blur-xl rounded-2xl border border-white/10 p-3 lg:p-4 shadow-2xl"
            initial={{ y: 20 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
          >
            {/* 标题区域 */}
            <motion.div 
              className="flex items-center gap-3 mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <h3 className="text-base lg:text-lg font-semibold text-white">已抽取名单</h3>
            </motion.div>
            
            {/* 进度信息 */}
            <motion.div 
              className="text-sm text-white/60 mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              {drawnStudents.length} / {roster.length} 人
            </motion.div>
            
            {/* 学生列表 */}
            <motion.div 
              className="max-h-[40vh] lg:max-h-[60vh] overflow-y-auto space-y-0.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.4 }}
            >
              {drawnStudents.map((student, index) => (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.5 + index * 0.05 }}
                >
                  {renderStudentItem(student, index)}
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default DrawnStudentsSidebar