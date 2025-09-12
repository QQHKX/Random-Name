import React from 'react'

/**
 * 状态指示器组件属性接口
 */
export interface StatusIndicatorProps {
  /** 状态类型 */
  status: 'active' | 'inactive' | 'warning' | 'error'
  /** 自定义颜色类名 */
  colorClass?: string
  /** 是否显示动画效果 */
  animated?: boolean
  /** 指示器大小 */
  size?: 'sm' | 'md' | 'lg'
  /** 自定义类名 */
  className?: string
}

/**
 * 状态指示器组件
 * 用于显示各种状态的小圆点指示器，支持不同状态、颜色和动画效果
 * @param props 组件属性
 * @returns JSX 元素
 */
const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  colorClass,
  animated = false,
  size = 'md',
  className = ''
}) => {
  /**
   * 获取状态对应的默认颜色类名
   * @param status 状态类型
   * @returns 颜色类名
   */
  const getStatusColor = (status: StatusIndicatorProps['status']): string => {
    switch (status) {
      case 'active':
        return 'bg-green-400'
      case 'inactive':
        return 'bg-gray-400'
      case 'warning':
        return 'bg-yellow-400'
      case 'error':
        return 'bg-red-400'
      default:
        return 'bg-gray-400'
    }
  }

  /**
   * 获取指示器大小对应的类名
   * @param size 大小类型
   * @returns 大小类名
   */
  const getSizeClass = (size: StatusIndicatorProps['size']): string => {
    switch (size) {
      case 'sm':
        return 'w-2 h-2'
      case 'md':
        return 'w-3 h-3'
      case 'lg':
        return 'w-4 h-4'
      default:
        return 'w-3 h-3'
    }
  }

  // 使用自定义颜色或默认状态颜色
  const colorClassName = colorClass || getStatusColor(status)
  
  // 组合所有类名
  const combinedClassName = [
    getSizeClass(size),
    colorClassName,
    'rounded-full',
    animated ? 'animate-pulse' : '',
    className
  ].filter(Boolean).join(' ')

  return (
    <div className={combinedClassName} />
  )
}

export default StatusIndicator