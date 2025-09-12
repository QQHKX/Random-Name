import { useState, useEffect, useMemo, useRef } from 'react'
import './App.css'
import { useAppStore } from './store/appStore'
import SettingsModal from './components/SettingsModal'
import RouletteScreen from './pages/RouletteScreen'
import ResultScreen from './pages/ResultScreen'
import Gallery from './components/Gallery'
import { sfx } from './lib/audioManager'
import type { Rarity, Student } from './store/appStore'
import { drawRarity as configDrawRarity } from './config/rarityConfig'




// 页面状态枚举
type PageState = 'home' | 'roulette' | 'result'

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

function App() {
  const {
    settings,
    roster,
    pool,
    resetPool,
    drawNext,
    lastResult,
    selectedStudent,
  } = useAppStore()

  const [openSettings, setOpenSettings] = useState(false)
  const [currentPage, setCurrentPage] = useState<PageState>('home')
  const [rollItems, setRollItems] = useState<{ id: string; name: string; rarity: Rarity }[] | null>(null)
  const [targetIndex, setTargetIndex] = useState(0)
  const [audioStatus, setAudioStatus] = useState(() => sfx.getCacheStatus())
  const galleryRef = useRef<HTMLDivElement | null>(null)
  
  // 计算已抽取学生列表
  const drawnStudents = getDrawnStudents(roster, pool, settings.noRepeat)
  
  // 计算抽取池人数
  const poolCount = settings.noRepeat ? pool.length : roster.length

  // 音量与设置联动（SFX + BGM）
  useEffect(() => {
    sfx.setVolume(settings.sfxVolume)
    sfx.setBgmVolume(settings.bgmVolume)
  }, [settings.sfxVolume, settings.bgmVolume])

  // 应用启动时自动预加载音频（静默预加载，不播放）
  useEffect(() => {
    const preloadAudio = async () => {
      try {
        // 静默预加载所有音频文件，不需要用户交互
        await sfx.preloadAllAudio((progress) => {
          // 更新音频状态到界面
          setAudioStatus(sfx.getCacheStatus())
          console.log(`音频预加载进度: ${Math.round(progress * 100)}%`)
        })
        // 最终更新状态
        setAudioStatus(sfx.getCacheStatus())
        console.log('音频预加载完成')
      } catch (error) {
        console.warn('音频预加载失败:', error)
        setAudioStatus(sfx.getCacheStatus())
      }
    }
    preloadAudio()
    
    // 定期更新音频状态（兜底机制）
    const statusInterval = setInterval(() => {
      setAudioStatus(sfx.getCacheStatus())
    }, 1000)
    
    return () => clearInterval(statusInterval)
  }, [])

  // 音频就绪状态自动消失
  const [showAudioStatus, setShowAudioStatus] = useState(true)
  useEffect(() => {
    if (audioStatus.loaded) {
      // 音频加载完成后3秒自动隐藏状态指示器
      const timer = setTimeout(() => {
        setShowAudioStatus(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [audioStatus.loaded])

  // 首次交互时解锁音频并淡入 BGM（只需在一次点击后触发）
  useEffect(() => {
    const onFirstUserGesture = async () => {
      window.removeEventListener('pointerdown', onFirstUserGesture)
      try {
        await sfx.unlock()
        sfx.playBgm()
        sfx.fadeBgmTo(settings.bgmVolume, 600)
      } catch {}
    }
    window.addEventListener('pointerdown', onFirstUserGesture, { once: true })
    return () => window.removeEventListener('pointerdown', onFirstUserGesture)
  }, [settings.bgmVolume])

  /**
   * 触发一次抽取流程
   * - 检查音频是否就绪
   * - 播放点击音效
   * - 调用 drawNext 更新全局状态（lastResult、selectedStudent 等）
   * - 使用全局状态中的 selectedStudent 构建滚动序列
   * - 动画联动：滚动开始时轻压 BGM，揭晓后恢复
   */
  const handleDraw = async () => {
    if (roster.length === 0) {
      alert('请先导入名单或添加学生。')
      return
    }

    // 检查音频缓存状态
    if (!audioStatus.loaded && audioStatus.progress < 100) {
      // 如果音频还在加载中，给用户提示
      const shouldContinue = confirm(
        `音频文件还在加载中（${audioStatus.progress}%），现在抽奖可能没有音效。\n\n是否继续抽奖？`
      )
      if (!shouldContinue) {
        return
      }
    }

    // 点击音效
    sfx.click()

    // 滚动阶段：稍微降低 BGM（避免与滴答冲突）
    sfx.fadeBgmTo(Math.max(0, settings.bgmVolume * 0.6), 300)

    // 切换到轮盘页面
    setCurrentPage('roulette')

    // 先计算结果，但暂不展示，拿到结果后构建滚动序列
    const result = drawNext()
    if (!result) {
      setCurrentPage('home')
      // 恢复 BGM 音量
      sfx.fadeBgmTo(settings.bgmVolume, 300)
      return
    }

    // 直接使用 result 中的名称，避免状态更新时序问题
    const finalName = result.name
    buildSequence(finalName, result.rarity)
  }







  /**
   * 根据抽取结果构建滚动序列
   * - 生成若干填充项（受速度影响数量）+ 目标项
   * - 填充项赋予随机稀有度（非全部蓝色），目标项使用真实稀有度
   * - 设置 targetIndex 为最后一项，使其停在中心
   * - 修复：未中奖项名称错误（此前误用 pool 的 id 作为名称），现改为从 roster 中取真实姓名
   * @param finalName 目标姓名
   * @param finalRarity 目标稀有度
   */
  function buildSequence(finalName: string, finalRarity: Rarity) {
    // 从全局状态读取 roster，构建姓名源，避免使用 pool（其为 id 列表）
    const { roster } = useAppStore.getState()
    const sourceNames: string[] = (roster && roster.length > 0) ? roster.map((s) => s.name) : [finalName]

    // 根据速度决定填充数量，保证视觉上先快后慢足够距离
    const fillerCount = settings.speed === 'fast' ? 12 : settings.speed === 'slow' ? 24 : 18

    // 采用步进采样保证分布均匀，避免连读同名
    const step = 7
    let start = Math.floor(Math.random() * Math.max(1, sourceNames.length))
    const fillers: string[] = []
    for (let i = 0; i < fillerCount; i++) {
      const n = sourceNames[(start + i * step) % Math.max(1, sourceNames.length)] || finalName
      fillers.push(n)
    }

    // 构建 items，最后一个为目标项（稀有度取真实结果，其余为随机稀有度）
    const seq = [...fillers, finalName]
    const items = seq.map((n, i) => ({
      id: `${i}-${n}`,
      name: n,
      rarity: i === seq.length - 1 ? finalRarity : rollRarity(),
    }))
    setRollItems(items)
    setTargetIndex(items.length - 1)
  }



  

  // 禁止滚动效果：在抽奖时禁止页面滚动
  useEffect(() => {
    if (currentPage !== 'home') {
      // 非主页时禁止滚动
      document.body.style.overflow = 'hidden'
    } else {
      // 主页时恢复滚动
      document.body.style.overflow = 'auto'
    }
    
    // 清理函数：组件卸载时恢复滚动
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [currentPage])

  /**
   * 处理轮盘滚动完成
   */
  const handleRouletteComplete = () => {
    // 揭晓音效
    const r = useAppStore.getState().lastResult
    if (r) sfx.reveal(r.rarity)
    // 揭晓后恢复 BGM 音量
    sfx.fadeBgmTo(settings.bgmVolume, 380)
    // 播放结束后清空队列
    setTimeout(() => setRollItems(null), 200)
    // 切换到结果页面
    setCurrentPage('result')
  }

  /**
   * 处理继续抽奖
   */
  const handleContinue = () => {
    setCurrentPage('home')
  }

  /**
   * 处理关闭结果弹窗
   */
  const handleCloseResult = () => {
    setCurrentPage('home')
  }

  /**
   * 处理重置抽取池按钮点击
   */
  const handleResetPool = () => {
    sfx.click()
    resetPool()
  }

  return (
    <div className="min-h-screen bg-[var(--csgo-bg)] text-white relative">
      {/* 主界面页面 */}
      {currentPage === 'home' && (
        <div className="min-h-screen bg-gradient-to-br from-[var(--csgo-bg)] via-gray-900 to-[var(--csgo-bg)] relative overflow-hidden">
          {/* 背景装饰效果 */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-20 left-20 w-96 h-96 bg-[var(--csgo-blue)]/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-[var(--csgo-orange)]/10 rounded-full blur-3xl"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-conic from-[var(--csgo-blue)]/5 via-transparent to-[var(--csgo-orange)]/5 rounded-full animate-spin-slow"></div>
          </div>

          {/* 网格布局容器 */}
          <div className="relative z-10 min-h-screen grid grid-cols-12 gap-6">
            
            {/* 左侧边栏：已抽取名单 */}
            <div className="col-span-12 lg:col-span-3 xl:col-span-2 order-3 lg:order-1 p-3 lg:pl-3 lg:pr-2">
              {settings.noRepeat && drawnStudents.length > 0 && currentPage === 'home' && (
                <div className="sticky top-3">
                  <div className="bg-[var(--csgo-panel)]/80 backdrop-blur-xl rounded-2xl border border-white/10 p-3 lg:p-4 shadow-2xl">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                      <h3 className="text-base lg:text-lg font-semibold text-white">已抽取名单</h3>
                    </div>
                    <div className="text-sm text-white/60 mb-4">
                      {drawnStudents.length} / {roster.length} 人
                    </div>
                    <div className="max-h-[40vh] lg:max-h-[60vh] overflow-y-auto space-y-0.5">
                      {drawnStudents.map((s, idx) => (
                        <div key={s.id} className="flex items-center gap-1.5 p-1 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                          <div className="w-4 h-4 lg:w-5 lg:h-5 rounded-full bg-gradient-to-r from-[var(--csgo-blue)] to-[var(--csgo-orange)] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                            {idx + 1}
                          </div>
                          <div className="flex-1 truncate text-xs font-medium" title={s.name}>
                            {s.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 主内容区域 */}
            <div className="col-span-12 lg:col-span-6 xl:col-span-8 order-1 lg:order-2 p-6 lg:px-3">
              <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3rem)] px-2 lg:px-0">
                
                {/* 顶部标题区域 */}
                <div className="text-center mb-6 lg:mb-8">
                  <div className="inline-flex items-center gap-3 lg:gap-4 mb-3 lg:mb-4">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-r from-[var(--csgo-blue)] to-[var(--csgo-orange)] rounded-xl lg:rounded-2xl flex items-center justify-center">
                      <svg className="w-5 h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <h1 className="text-3xl lg:text-5xl font-bold bg-gradient-to-r from-white via-white to-white/80 bg-clip-text text-transparent">
                      Roll Call
                    </h1>
                  </div>
                  <p className="text-white/60 text-base lg:text-lg">CSGO 风格班级点名系统</p>
                </div>

                {/* 主控制面板 */}
                 <div className="w-full max-w-2xl">
                   <div className="bg-[var(--csgo-panel)]/80 backdrop-blur-xl rounded-2xl lg:rounded-3xl border border-white/10 p-4 lg:p-8 shadow-2xl">
                     
                     {/* 状态信息卡片 */}
                     <div className="grid grid-cols-3 gap-2 lg:gap-4 mb-6 lg:mb-8">
                       <div className="bg-white/5 rounded-lg lg:rounded-xl p-3 lg:p-4 border border-white/10">
                         <div className="text-white/60 text-xs lg:text-sm mb-1">班级</div>
                         <div className="text-white text-sm lg:text-base font-semibold truncate">{settings.className}</div>
                       </div>
                       <div className="bg-white/5 rounded-lg lg:rounded-xl p-3 lg:p-4 border border-white/10">
                         <div className="text-white/60 text-xs lg:text-sm mb-1">总人数</div>
                         <div className="text-white text-sm lg:text-base font-semibold">{roster.length} 人</div>
                       </div>
                       <div className="bg-white/5 rounded-lg lg:rounded-xl p-3 lg:p-4 border border-white/10">
                         <div className="text-white/60 text-xs lg:text-sm mb-1">抽取池</div>
                         <div className="text-white text-sm lg:text-base font-semibold">{poolCount} 人</div>
                       </div>
                     </div>

                    {/* 音频状态指示器 */}
                    {showAudioStatus && (
                      <div className="mb-6">
                        {audioStatus.loaded ? (
                          <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                            <span className="text-green-400 font-medium">音频系统就绪</span>
                          </div>
                        ) : audioStatus.progress > 0 ? (
                          <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
                            <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
                            <span className="text-blue-400 font-medium">音频加载中 {Math.round(audioStatus.progress)}%</span>
                            <div className="flex-1 bg-white/10 rounded-full h-2 ml-3">
                              <div className="bg-blue-400 h-2 rounded-full transition-all duration-300" style={{width: `${audioStatus.progress}%`}}></div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                            <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                            <span className="text-yellow-400 font-medium">音频待加载</span>
                          </div>
                        )}
                      </div>
                    )}



                    {/* 操作按钮组 */}
                    <div className="flex flex-col sm:flex-row gap-4">
                      <button 
                        className="flex-1 px-8 py-4 rounded-xl bg-gradient-to-r from-[var(--csgo-blue)] to-blue-600 hover:from-blue-600 hover:to-[var(--csgo-blue)] transition-all duration-300 font-semibold text-white shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transform hover:scale-105 active:scale-95" 
                        onClick={handleDraw} 
                        disabled={roster.length === 0 || currentPage !== 'home'}
                      >
                        <div className="flex items-center justify-center gap-3">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{currentPage !== 'home' ? '抽取中...' : '开始抽取'}</span>
                        </div>
                      </button>
                      
                      <button 
                        className="px-6 py-4 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-orange-600 hover:to-amber-600 transition-all duration-300 font-medium text-white shadow-lg shadow-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transform hover:scale-105 active:scale-95" 
                        onClick={handleResetPool} 
                        disabled={roster.length === 0}
                        title="重置抽取池"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          <span>重置</span>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 右侧边栏：设置和快捷操作 */}
            <div className="col-span-12 lg:col-span-3 xl:col-span-2 order-2 lg:order-3 p-6 lg:pl-3 lg:pr-6">
              <div className="sticky top-6 space-y-4 lg:space-y-6">
                
                {/* 设置面板 */}
                <div className="bg-[var(--csgo-panel)]/80 backdrop-blur-xl rounded-2xl border border-white/10 p-4 lg:p-6 shadow-2xl">
                  <h3 className="text-base lg:text-lg font-semibold text-white mb-3 lg:mb-4 flex items-center gap-2 lg:gap-3">
                    <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="hidden sm:inline">系统设置</span>
                    <span className="sm:hidden">设置</span>
                  </h3>
                  <button 
                    className="w-full px-3 lg:px-4 py-2 lg:py-3 rounded-lg lg:rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-white text-sm lg:text-base font-medium" 
                    onClick={() => { sfx.click(); setOpenSettings(true); }}
                  >
                    <span className="hidden sm:inline">打开设置面板</span>
                    <span className="sm:hidden">设置</span>
                  </button>
                </div>

                {/* 系统状态 */}
                <div className="bg-[var(--csgo-panel)]/80 backdrop-blur-xl rounded-2xl border border-white/10 p-4 lg:p-6 shadow-2xl">
                  <h3 className="text-base lg:text-lg font-semibold text-white mb-3 lg:mb-4 flex items-center gap-2 lg:gap-3">
                    <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2-2z" />
                    </svg>
                    <span className="hidden sm:inline">系统状态</span>
                    <span className="sm:hidden">状态</span>
                  </h3>
                  <div className="space-y-2 lg:space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-white/60 text-xs lg:text-sm">不重复模式</span>
                      <div className={`w-2 h-2 rounded-full ${settings.noRepeat ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/60 text-xs lg:text-sm">音频系统</span>
                      <div className={`w-2 h-2 rounded-full ${audioStatus.loaded ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/60 text-xs lg:text-sm">抽奖状态</span>
                      <div className={`w-2 h-2 rounded-full ${currentPage !== 'home' ? 'bg-blue-400 animate-pulse' : 'bg-gray-400'}`}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 收藏馆（历史记录）- 移至底部 */}
          <div ref={galleryRef} className="relative z-10">
            <Gallery />
          </div>
        </div>
      )}

      {/* 抽奖轮盘页面 */}
      <RouletteScreen
        isOpen={currentPage === 'roulette'}
        rollItems={rollItems}
        targetIndex={targetIndex}
        speed={settings.speed}
        onComplete={handleRouletteComplete}
      />

      {/* 抽奖结果页面 */}
      <ResultScreen
        isOpen={currentPage === 'result'}
        lastResult={lastResult || null}
        selectedStudent={selectedStudent || null}
        onContinue={handleContinue}
        onClose={handleCloseResult}
      />

      {/* 设置面板挂载 */}
      <SettingsModal open={openSettings} onClose={() => setOpenSettings(false)} />
    </div>
  )
}

export default App

/**
 * 生成随机稀有度（与 store 内部 drawRarity 概率一致）
 * 使用统一的配置文件管理概率
 * 概率：blue 70%, purple 18%, pink 8%, red 3.5%, gold 0.5%
 * @returns {Rarity} 随机稀有度
 */
function rollRarity(): Rarity {
  return configDrawRarity();
}
