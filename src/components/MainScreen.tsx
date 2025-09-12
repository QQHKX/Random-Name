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
    <>
      {/* 左侧：已抽取名单（仅在不重复模式显示，且大屏显示，动画结束后才显示避免透露结果） */}
      {settings.noRepeat && drawnStudents.length > 0 && !isDrawing && (
        <div className="hidden lg:block fixed left-4 top-1/2 -translate-y-1/2 z-30 w-48 max-h-[80vh] overflow-y-auto">
          <div className="p-3 rounded-xl border border-white/10 bg-[var(--csgo-panel)]/70 backdrop-blur-sm shadow-[0_0_24px_rgba(0,162,255,0.12)]">
            <div className="mb-2 text-sm font-semibold opacity-90">已抽取（{drawnStudents.length}/{roster.length}）</div>
            <ul className="space-y-1">
              {drawnStudents.map((s, idx) => (
                <li key={s.id} className="flex items-center gap-2 px-2 py-1 rounded-md bg-white/5 border border-white/10">
                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs">{idx + 1}</div>
                  <div className="truncate text-sm" title={s.name}>{s.name}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 主抽奖区域 */}
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center p-8 rounded-xl border border-white/10 bg-[var(--csgo-panel)]/60 backdrop-blur-sm w-[min(900px,95vw)] max-w-4xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold tracking-wide">Roll Call</h1>
              </div>
              <button className="px-3 py-1.5 rounded-md bg-zinc-700 hover:bg-zinc-600 border border-white/10 text-xs" onClick={() => { sfx.click(); onOpenSettings(); }}>
                设置
              </button>
            </div>

            <div className="mb-6 text-sm text-white/80">
              <span className="inline-block px-3 py-1 rounded-full bg-white/5 border border-white/10 mr-2">班级：{settings.className}</span>
              <span className="inline-block px-3 py-1 rounded-full bg-white/5 border border-white/10 mr-2">名单：{roster.length} 人</span>
              <span className="inline-block px-3 py-1 rounded-full bg-white/5 border border-white/10 mr-2">抽取池：{poolCount} 人</span>
              
              {/* 音频状态指示器 - 就绪后自动消失 */}
              {showAudioStatus && (
                audioStatus.loaded ? (
                  <span className="inline-block px-3 py-1 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 transition-opacity duration-500">
                    <span className="inline-block w-2 h-2 bg-green-400 rounded-full mr-1.5"></span>
                    音频就绪
                  </span>
                ) : audioStatus.progress > 0 ? (
                  <span className="inline-block px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400">
                    <span className="inline-block w-2 h-2 bg-blue-400 rounded-full mr-1.5 animate-pulse"></span>
                    音频加载中 {Math.round(audioStatus.progress)}%
                  </span>
                ) : (
                  <span className="inline-block px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400">
                    <span className="inline-block w-2 h-2 bg-yellow-400 rounded-full mr-1.5"></span>
                    音频待加载
                  </span>
                )
              )}
            </div>

            {/* 轮盘滚动区域（非抽奖状态时显示占位） */}
            <div className="mb-6 min-h-[120px] flex items-center justify-center">
              {!isDrawing && (
                <div className="text-white/40 text-sm">
                  点击"开始抽取"开始抽奖
                </div>
              )}
            </div>

            {/* 操作按钮组 */}
            <div className="relative h-[64px] flex items-center justify-center gap-4 mb-2">
              <button className="px-6 py-3 rounded-lg bg-[var(--csgo-blue)] hover:bg-sky-500 transition-colors font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed" onClick={onStartDraw} disabled={roster.length === 0 || isDrawing}>
                {isDrawing ? '抽取中…' : '开始抽取'}
              </button>
              <button className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 border border-amber-300/30 text-sm font-medium transition-colors" onClick={handleResetPool} disabled={roster.length === 0} title="重置抽取池">
                重置抽取池
              </button>

            </div>
        </div>
      </div>

      {/* 收藏馆（历史记录） */}
      <div ref={galleryRef}>
        <Gallery />
      </div>
    </>
  )
}