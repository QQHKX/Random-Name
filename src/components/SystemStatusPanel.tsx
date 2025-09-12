import React from 'react'
import { useAppStore } from '../store/appStore'
import StatusIndicator from './StatusIndicator'

/**
 * 系统状态面板组件属性接口
 */
export interface SystemStatusPanelProps {
  /** 音频系统状态 */
  audioStatus: {
    loaded: boolean
  }
  /** 自定义类名 */
  className?: string
}

/**
 * 系统状态面板组件
 * 显示系统的各种状态信息，包括班级信息、人数统计、模式状态等
 * @param props 组件属性
 * @returns JSX 元素
 */
const SystemStatusPanel: React.FC<SystemStatusPanelProps> = ({
  audioStatus,
  className = ''
}) => {
  // 从状态管理中获取数据
  const { roster, settings, pool } = useAppStore()
  
  // 计算抽取池人数
  const poolCount = settings.noRepeat ? pool.length : roster.length

  /**
   * 渲染状态行
   * @param label 标签文本
   * @param value 值内容
   * @param isIndicator 是否为指示器类型
   * @param indicatorStatus 指示器状态
   * @returns JSX 元素
   */
  const renderStatusRow = (
    label: string, 
    value: string | React.ReactNode, 
    isIndicator = false, 
    indicatorStatus?: 'active' | 'inactive' | 'warning' | 'error'
  ) => (
    <div className="flex items-center justify-between">
      <span className="text-white/60 text-xs lg:text-sm">{label}</span>
      {isIndicator && indicatorStatus ? (
        <StatusIndicator 
          status={indicatorStatus} 
          size="sm" 
          animated={indicatorStatus === 'active'}
        />
      ) : (
        <span className="text-white font-semibold text-xs lg:text-sm">{value}</span>
      )}
    </div>
  )

  return (
    <div className={`bg-[var(--csgo-panel)]/80 backdrop-blur-xl rounded-2xl border border-white/10 p-4 lg:p-6 shadow-2xl ${className}`}>
      {/* 标题 */}
      <h3 className="text-base lg:text-lg font-semibold text-white mb-3 lg:mb-4 flex items-center gap-2 lg:gap-3">
        <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2-2z" 
          />
        </svg>
        <span className="hidden sm:inline">系统状态</span>
        <span className="sm:hidden">状态</span>
      </h3>
      
      {/* 状态信息列表 */}
      <div className="space-y-2 lg:space-y-3">
        {renderStatusRow('班级', settings.className)}
        {renderStatusRow('总人数', `${roster.length} 人`)}
        {renderStatusRow('抽取池', `${poolCount} 人`)}
        {renderStatusRow(
          '不重复模式', 
          '', 
          true, 
          settings.noRepeat ? 'active' : 'inactive'
        )}
        {renderStatusRow(
          '音频系统', 
          '', 
          true, 
          audioStatus.loaded ? 'active' : 'warning'
        )}
      </div>
    </div>
  )
}

export default SystemStatusPanel