import { useMemo, useRef } from 'react'
import { useAppStore } from '../store/appStore'
import { sfx } from '../lib/audioManager'
import Gallery from './Gallery'
import type { Student } from '../store/appStore'

/**
 * MainScreen 组件属性接口
 */
interface MainScreenProps {
  /** 音频状态信息 */
  audioStatus: {
    loaded: boolean
    progress: number
  }
  /** 是否显示音频状态指示器 */
  showAudioStatus: boolean
  /** 开始抽奖的回调函数 */
  onStartDraw: () => void
  /** 是否正在抽奖中 */
  isDrawing: boolean
  /** 打开设置面板的回调函数 */
  onOpenSettings: () => void
}

/**
 * 计算已抽取学生列表（用于不重复模式）
 * - 当开启不重复模式时，已抽取集合 = roster - pool
 * - 当关闭不重复模式时，返回空列表
 * @param roster 全部学生列表
 * @param pool 当前抽取池（学生ID列表）
 * @param noRepeat 是否开启不重复模式
 * @returns 已抽取的学生列表（顺序按 roster 原顺序）
 */
function getDrawnStudents(roster: Student[], pool: string[], noRepeat: boolean): Student[] {
  if (!noRepeat) return []
  const poolSet = new Set(pool)
  return roster.filter(s => !poolSet.has(s.id))
}



/**
 * 主界面组件
 * 包含班级信息、音频状态、操作按钮和收藏馆等功能
 * @param props 组件属性
 * @returns JSX 元素
 */
/**
 * 首页主界面组件（MainScreen）
 * - 采用现代化三栏布局（信息侧栏 / 抽奖主区 / 快捷侧栏）
 * - 深色主题与 CSGO 风格渐变、光晕与毛玻璃效果
 * - 完整保留原功能（设置、抽取、重置、历史展示等）
 * @param audioStatus 音频加载与进度
 * @param showAudioStatus 是否显示音频状态提示
 * @param onStartDraw 开始抽奖回调
 * @param isDrawing 抽奖中状态，用于按钮禁用与占位切换
 * @param onOpenSettings 打开设置面板回调
 * @returns JSX.Element
 */
export default function MainScreen({ audioStatus, showAudioStatus, onStartDraw, isDrawing, onOpenSettings }: MainScreenProps) {
  const {
    settings,
    roster,
    pool,
    resetPool
  } = useAppStore()
  
  const galleryRef = useRef<HTMLDivElement | null>(null)
  
  // 计算已抽取学生列表
  const drawnStudents = getDrawnStudents(roster, pool, settings.noRepeat)
  
  // 计算抽取池人数
  const poolCount = settings.noRepeat ? pool.length : roster.length
  

  
  /**
   * 处理重置抽取池按钮点击
   */
  const handleResetPool = () => {
    sfx.click()
    resetPool()
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--csgo-bg)] via-gray-900 to-black relative overflow-hidden">
      {/* 背景装饰效果 */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--csgo-blue)]/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[var(--csgo-orange)]/10 rounded-full blur-3xl"></div>
      </div>
      
      {/* 网格背景 */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
        backgroundSize: '50px 50px'
      }}></div>

      {/* 顶部导航栏 */}
      <header className="relative z-10 border-b border-white/10 bg-[var(--csgo-panel)]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gradient-to-br from-[var(--csgo-blue)] to-[var(--csgo-orange)] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">RC</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Roll Call System
                </h1>
                <p className="text-sm text-gray-400">CSGO风格班级点名系统</p>
              </div>
            </div>
            <button 
              className="px-4 py-2 rounded-lg bg-[var(--csgo-panel)] hover:bg-gray-700 border border-white/20 text-sm font-medium transition-all duration-200 hover:shadow-lg hover:shadow-[var(--csgo-blue)]/20" 
              onClick={() => { sfx.click(); onOpenSettings(); }}
            >
              <span className="mr-2">⚙️</span>
              设置
            </button>
          </div>
        </div>
      </header>

      {/* 主要内容区域 */}
      <main className="relative z-10 flex-1">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-[calc(100vh-200px)]">
            
            {/* 左侧信息面板 */}
            <div className="lg:col-span-3 space-y-6">
              {/* 班级信息卡片 */}
              <div className="bg-[var(--csgo-panel)]/80 backdrop-blur-sm rounded-xl border border-white/10 p-6 shadow-xl">
                <h3 className="text-lg font-semibold mb-4 text-white">班级信息</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                    <span className="text-gray-300">班级名称</span>
                    <span className="font-medium text-[var(--csgo-blue)]">{settings.className}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                    <span className="text-gray-300">总人数</span>
                    <span className="font-medium text-green-400">{roster.length} 人</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                    <span className="text-gray-300">抽取池</span>
                    <span className="font-medium text-[var(--csgo-orange)]">{poolCount} 人</span>
                  </div>
                </div>
              </div>

              {/* 音频状态卡片 */}
              {showAudioStatus && (
                <div className="bg-[var(--csgo-panel)]/80 backdrop-blur-sm rounded-xl border border-white/10 p-6 shadow-xl">
                  <h3 className="text-lg font-semibold mb-4 text-white">音频状态</h3>
                  <div className="p-4 rounded-lg border border-white/10">
                    {audioStatus.loaded ? (
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-green-400 font-medium">音频就绪</span>
                      </div>
                    ) : audioStatus.progress > 0 ? (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
                          <span className="text-blue-400 font-medium">加载中 {Math.round(audioStatus.progress)}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div className="bg-blue-400 h-2 rounded-full transition-all duration-300" style={{width: `${audioStatus.progress}%`}}></div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                        <span className="text-yellow-400 font-medium">音频待加载</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 已抽取名单（不重复模式） */}
              {settings.noRepeat && drawnStudents.length > 0 && !isDrawing && (
                <div className="bg-[var(--csgo-panel)]/80 backdrop-blur-sm rounded-xl border border-white/10 p-6 shadow-xl">
                  <h3 className="text-lg font-semibold mb-4 text-white">
                    已抽取名单 ({drawnStudents.length}/{roster.length})
                  </h3>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {drawnStudents.map((s, idx) => (
                      <div key={s.id} className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg border border-white/10">
                        <div className="w-8 h-8 bg-gradient-to-br from-gray-600 to-gray-700 rounded-full flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </div>
                        <span className="text-gray-300 truncate" title={s.name}>{s.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 中央抽奖区域 */}
            <div className="lg:col-span-6 flex flex-col items-center justify-center">
              <div className="w-full max-w-2xl">
                {/* 抽奖主面板 */}
                <div className="bg-[var(--csgo-panel)]/80 backdrop-blur-sm rounded-2xl border border-white/10 p-8 shadow-2xl">
                  {/* 轮盘区域 */}
                  <div className="mb-8 min-h-[200px] flex items-center justify-center relative">
                    {!isDrawing ? (
                      <div className="text-center">
                        <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-[var(--csgo-blue)]/20 to-[var(--csgo-orange)]/20 rounded-full border-2 border-dashed border-white/30 flex items-center justify-center">
                          <span className="text-4xl">🎯</span>
                        </div>
                        <p className="text-gray-400 text-lg">准备开始抽奖</p>
                        <p className="text-gray-500 text-sm mt-2">点击下方按钮开始抽取</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-[var(--csgo-blue)] to-[var(--csgo-orange)] rounded-full flex items-center justify-center animate-spin">
                          <span className="text-4xl">🎲</span>
                        </div>
                        <p className="text-white text-xl font-semibold">抽取中...</p>
                      </div>
                    )}
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button 
                      className="px-8 py-4 rounded-xl bg-gradient-to-r from-[var(--csgo-blue)] to-blue-600 hover:from-blue-600 hover:to-[var(--csgo-blue)] text-white font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-[var(--csgo-blue)]/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg" 
                      onClick={onStartDraw} 
                      disabled={roster.length === 0 || isDrawing}
                    >
                      {isDrawing ? (
                        <span className="flex items-center space-x-2">
                          <span className="animate-spin">⚡</span>
                          <span>抽取中...</span>
                        </span>
                      ) : (
                        <span className="flex items-center space-x-2">
                          <span>🎯</span>
                          <span>开始抽取</span>
                        </span>
                      )}
                    </button>
                    
                    <button 
                      className="px-6 py-4 rounded-xl bg-gradient-to-r from-[var(--csgo-orange)] to-orange-600 hover:from-orange-600 hover:to-[var(--csgo-orange)] text-white font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-[var(--csgo-orange)]/30 disabled:opacity-50 disabled:cursor-not-allowed" 
                      onClick={handleResetPool} 
                      disabled={roster.length === 0}
                      title="重置抽取池"
                    >
                      <span className="flex items-center space-x-2">
                        <span>🔄</span>
                        <span>重置抽取池</span>
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 右侧功能面板 */}
            <div className="lg:col-span-3">
              <div className="bg-[var(--csgo-panel)]/80 backdrop-blur-sm rounded-xl border border-white/10 p-6 shadow-xl">
                <h3 className="text-lg font-semibold mb-4 text-white">快捷操作</h3>
                <div className="space-y-3">
                  <button 
                    className="w-full p-3 text-left bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors"
                    onClick={() => { sfx.click(); onOpenSettings(); }}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">⚙️</span>
                      <div>
                        <div className="text-white font-medium">系统设置</div>
                        <div className="text-gray-400 text-xs">配置班级信息和参数</div>
                      </div>
                    </div>
                  </button>
                  
                  <button 
                    className="w-full p-3 text-left bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors"
                    onClick={handleResetPool}
                    disabled={roster.length === 0}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">🔄</span>
                      <div>
                        <div className="text-white font-medium">重置抽取池</div>
                        <div className="text-gray-400 text-xs">恢复所有学生到抽取池</div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 收藏馆（历史记录） */}
      <div ref={galleryRef}>
        <Gallery />
      </div>
    </div>
  )
}