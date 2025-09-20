/**
 * 完成菜单组件的属性接口
 */
interface CompletionMenuProps {
  /** 继续按钮点击回调 */
  onContinue?: () => void
  /** 关闭按钮点击回调 */
  onClose?: () => void
  /** 是否锁定关闭（连抽中隐藏关闭按钮，防止误触） */
  lockClose?: boolean
  /** 是否处于自动连抽（用于禁用继续按钮与提示进度） */
  autoRolling?: boolean
  /** 进度文案（例如："自动连抽中 · 第 2/5 次"） */
  progressText?: string
}

/**
 * 完成菜单组件
 * 显示分割线和操作按钮（关闭、继续）
 * - 在 autoRolling=true 时：隐藏关闭按钮，禁用继续按钮，显示进度文案
 */
const CompletionMenu: React.FC<CompletionMenuProps> = ({ 
  onContinue,
  onClose,
  lockClose = false,
  autoRolling = false,
  progressText
}) => {
  /**
   * 处理关闭按钮点击事件
   * @param e 鼠标点击事件
   */
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (lockClose) return
    onClose?.()
  }

  /**
   * 处理继续按钮点击事件
   * @param e 鼠标点击事件
   */
  const handleContinue = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (autoRolling) return
    onContinue?.()
  }

  return (
    <div className="w-full flex flex-col items-center pb-2">
      {/* 分割线 */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-3" />
      
      {/* 按钮区域 */}
      <div className="w-full flex justify-end gap-3 pl-2 pr-16">
        {/* 关闭按钮：连抽中隐藏，防止误触 */}
        {!lockClose && (
          <button
            className="px-6 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white/90 text-sm font-medium transition-all duration-200 hover:scale-105"
            onClick={handleClose}
            title="关闭结果并返回"
          >
            关闭
          </button>
        )}
        <button
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 border border-blue-500 rounded-lg text-white text-sm font-medium transition-all duration-200 hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
          onClick={handleContinue}
          disabled={autoRolling}
          aria-disabled={autoRolling}
          title={autoRolling ? '自动连抽进行中，稍候将自动继续' : '继续回到主页'}
        >
          {autoRolling && progressText ? progressText : '继续'}
        </button>
      </div>
    </div>
  )
}

export default CompletionMenu