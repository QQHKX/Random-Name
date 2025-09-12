import React from 'react'
import { sfx } from '../lib/audioManager'

/**
 * 设置操作面板组件属性接口
 */
export interface SettingsPanelProps {
  /** 打开设置面板回调 */
  onOpenSettings: () => void
  /** 重置抽取池回调 */
  onResetPool: () => void
  /** 是否禁用重置按钮 */
  resetDisabled?: boolean
  /** 自定义类名 */
  className?: string
}

/**
 * 设置操作面板组件
 * 提供系统设置和重置抽取池等操作按钮
 * @param props 组件属性
 * @returns JSX 元素
 */
const SettingsPanel: React.FC<SettingsPanelProps> = ({
  onOpenSettings,
  onResetPool,
  resetDisabled = false,
  className = ''
}) => {
  /**
   * 处理设置按钮点击
   */
  const handleSettingsClick = () => {
    sfx.click()
    onOpenSettings()
  }

  /**
   * 处理重置按钮点击
   */
  const handleResetClick = () => {
    if (!resetDisabled) {
      onResetPool()
    }
  }

  return (
    <div className={`bg-[var(--csgo-panel)]/80 backdrop-blur-xl rounded-2xl border border-white/10 p-4 lg:p-6 shadow-2xl ${className}`}>
      {/* 标题 */}
      <h3 className="text-base lg:text-lg font-semibold text-white mb-3 lg:mb-4 flex items-center gap-2 lg:gap-3">
        <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" 
          />
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
          />
        </svg>
        <span className="hidden sm:inline">系统设置</span>
        <span className="sm:hidden">设置</span>
      </h3>
      
      {/* 操作按钮组 */}
      <div className="space-y-3">
        {/* 设置按钮 */}
        <button 
          className="w-full px-3 lg:px-4 py-2 lg:py-3 rounded-lg lg:rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-white text-sm lg:text-base font-medium" 
          onClick={handleSettingsClick}
        >
          <span className="hidden sm:inline">打开设置面板</span>
          <span className="sm:hidden">设置</span>
        </button>
        
        {/* 重置抽取池按钮 */}
        <button 
          className="w-full px-3 lg:px-4 py-2 lg:py-3 rounded-lg lg:rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-white/80 hover:text-white text-sm lg:text-base font-medium disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white/5 disabled:hover:text-white/80" 
          onClick={handleResetClick} 
          disabled={resetDisabled}
          title="重置抽取池"
        >
          <div className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
              />
            </svg>
            <span className="hidden sm:inline">重置抽取池</span>
            <span className="sm:hidden">重置</span>
          </div>
        </button>
      </div>
    </div>
  )
}

export default SettingsPanel