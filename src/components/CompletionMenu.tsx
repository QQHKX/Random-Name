/**
 * 完成菜单组件的属性接口
 */
interface CompletionMenuProps {
  /** 继续按钮点击回调 */
  onContinue?: () => void
  /** 关闭按钮点击回调 */
  onClose?: () => void
}

/**
 * 完成菜单组件
 * 显示分割线和操作按钮（关闭、继续）
 */
const CompletionMenu: React.FC<CompletionMenuProps> = ({ 
  onContinue,
  onClose
}) => {
  /**
   * 处理关闭按钮点击事件
   * @param e 鼠标点击事件
   */
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClose?.()
  }

  /**
   * 处理继续按钮点击事件
   * @param e 鼠标点击事件
   */
  const handleContinue = (e: React.MouseEvent) => {
    e.stopPropagation()
    onContinue?.()
  }

  return (
    <div className="w-full flex flex-col items-center pb-2">
      {/* 分割线 */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-3" />
      
      {/* 按钮区域 */}
      <div className="w-full flex justify-end gap-3 pl-2 pr-16">
        <button
          className="px-6 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white/90 text-sm font-medium transition-all duration-200 hover:scale-105"
          onClick={handleClose}
        >
          关闭
        </button>
        <button
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 border border-blue-500 rounded-lg text-white text-sm font-medium transition-all duration-200 hover:scale-105"
          onClick={handleContinue}
        >
          继续
        </button>
      </div>
    </div>
  )
}

export default CompletionMenu