import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import './App.css'
import { useAppStore } from './store/appStore'
import SettingsModal from './components/SettingsModal'
import StorageModal from './components/StorageModal'
import RouletteScreen from './pages/RouletteScreen'
import ResultScreen from './pages/ResultScreen'
import Gallery from './components/Gallery'
import Footer from './components/Footer'
import DrawnStudentsSidebar from './components/DrawnStudentsSidebar'
import SystemStatusPanel from './components/SystemStatusPanel'
import SettingsPanel from './components/SettingsPanel'
import { sfx } from './lib/audioManager'
import type { Rarity, Student, RollResult } from './store/appStore'
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
  } = useAppStore()

  const [openSettings, setOpenSettings] = useState(false)
  const [openStorage, setOpenStorage] = useState(false)
  // 结果覆盖层（在轮盘页面之上显示，不切换页面）
  const [showResultOverlay, setShowResultOverlay] = useState(false)
  const [currentPage, setCurrentPage] = useState<PageState>('home')
  const [rollItems, setRollItems] = useState<{ id: string; name: string; rarity: Rarity }[] | null>(null)
  const [targetIndex, setTargetIndex] = useState(0)
  const [rollSessionId, setRollSessionId] = useState<string>('')
  const [audioStatus, setAudioStatus] = useState(() => sfx.getCacheStatus())
  const galleryRef = useRef<HTMLDivElement | null>(null)
  // 单次抽取的本地结果（作为结果页的唯一真相来源，避免竞态）
  const [activeResult, setActiveResult] = useState<RollResult | null>(null)
  
  // 5连抽状态
  const [isAutoRolling, setIsAutoRolling] = useState(false)
  const autoRollCountRef = useRef(0)
  const autoRollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 计算已抽取学生列表
  const drawnStudents = getDrawnStudents(roster, pool, settings.noRepeat)
  


  // 音量与设置联动（仅SFX）
  useEffect(() => {
    sfx.setVolume(settings.sfxVolume)
    // 移除 BGM 音量联动
  }, [settings.sfxVolume])

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



  // 首次交互时仅解锁音频环境（移除BGM）
  useEffect(() => {
    const onFirstUserGesture = async () => {
      window.removeEventListener('pointerdown', onFirstUserGesture)
      try {
        await sfx.unlockAudio()
        // 不再播放或淡入BGM
      } catch {}
    }
    window.addEventListener('pointerdown', onFirstUserGesture, { once: true })
    return () => window.removeEventListener('pointerdown', onFirstUserGesture)
  }, [])

  /**
   * 根据速度计算在结果页的停留时间（毫秒）
   * - 目的：5连抽时每次揭晓后给予用户清晰可见的间隔
   * @returns {number} 停留时间（ms）
   */
  function resultPauseMs(): number {
    switch (settings.speed) {
      case 'slow':
        return 1500
      case 'fast':
        return 900
      default:
        return 1200
    }
  }

  /**
   * 触发一次抽取流程
   * - 检查音频是否就绪（可选择跳过，供自动连抽使用）
   * - 播放点击音效
   * - 调用 drawNext 更新全局状态（lastResult、selectedStudent 等）
   * - 使用全局状态中的 selectedStudent 构建滚动序列
   * - 动画联动：滚动开始时轻压 BGM，揭晓后恢复
   * @param opts 可选项：skipAudioPrompt 是否跳过音频加载提示（用于自动连抽）
   */
  const handleDraw = async (opts?: { skipAudioPrompt?: boolean }) => {
    if (roster.length === 0) {
      alert('请先导入名单或添加学生。')
      return
    }

    // 检查音频缓存状态（可跳过，用于自动连抽）
    if (!opts?.skipAudioPrompt && !audioStatus.loaded && audioStatus.progress < 100) {
      const shouldContinue = confirm(
        `音频文件还在加载中（${audioStatus.progress}%），现在抽奖可能没有音效。\n\n是否继续抽奖？`
      )
      if (!shouldContinue) {
        return
      }
    }

    // 点击音效
    sfx.click()

    // 移除：滚动阶段降低/恢复BGM逻辑

    // 切换到轮盘页面
    setCurrentPage('roulette')
    // 生成新的会话 id（用于稳定 Roulette 渲染 key）
    setRollSessionId(`sess-${Date.now()}-${Math.floor(Math.random()*1e4)}`)

    // 先计算结果，但暂不展示，拿到结果后构建滚动序列
    const result = drawNext()
    if (!result) {
      setCurrentPage('home')
      // 移除：恢复BGM音量逻辑
      if (isAutoRolling) {
        setIsAutoRolling(false)
      }
      return
    }

    // 直接使用 result 中的 id 与名称，避免状态更新时序问题
    const finalName = result.name
    const finalStudentId = result.studentId
    // 记录本次抽取的结果，用于结果展示与揭晓音效
    setActiveResult(result)
    buildSequence(finalStudentId, finalName, result.rarity)
  }

  /**
   * 发起一次自动连抽的下一次抽取
   * - 复用 handleDraw（跳过音频提示）
   * - 若名单为空或出现异常则自动终止
   */
  function performNextAutoRoll() {
    if (roster.length === 0) {
      setIsAutoRolling(false)
      return
    }
    // 回到主页后再触发下一次抽取，保证页面状态正确
    setCurrentPage('home')
    setTimeout(() => {
      handleDraw({ skipAudioPrompt: true })
    }, 10)
  }

  /**
   * 启动 5 连抽
   * - 自动执行 5 次抽奖：动画 → 揭晓 → 短暂停留 → 下一次
   * - 期间禁用手动按钮，避免中断
   */
  function handleFiveDraws() {
    if (isAutoRolling) return
    if (roster.length === 0) {
      alert('请先导入名单或添加学生。')
      return
    }
    sfx.click()
    setIsAutoRolling(true)
    autoRollCountRef.current = 0
    performNextAutoRoll()
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
  function buildSequence(finalStudentId: string, finalName: string, finalRarity: Rarity) {
    // 从全局状态读取 roster，构建姓名源与 id 映射，避免使用 pool（其为 id 列表）
    const { roster } = useAppStore.getState()
    const sourceStudents = Array.isArray(roster) ? roster : []
    const sourceNames: string[] = sourceStudents.length > 0 ? sourceStudents.map((s) => s.name) : [finalName]
    const nameToId = new Map<string, string>()
    for (const s of sourceStudents) {
      if (!nameToId.has(s.name)) nameToId.set(s.name, s.id)
    }
    // 排除最终姓名，避免视觉上出现同名卡片导致误判
    const fillerNames = sourceNames.filter((n) => n !== finalName)
    const namePool = fillerNames.length > 0 ? fillerNames : [finalName]

    // 根据速度决定填充数量，保证视觉上先快后慢足够距离
    const fillerCount = settings.speed === 'fast' ? 12 : settings.speed === 'slow' ? 24 : 18

    // 采用步进采样保证分布均匀，避免连读同名
    const step = 7
    let start = Math.floor(Math.random() * Math.max(1, namePool.length))
    const fillers: string[] = []
    for (let i = 0; i < fillerCount; i++) {
      const n = namePool[(start + i * step) % Math.max(1, namePool.length)] || finalName
      fillers.push(n)
    }

    // 构建 items，最后一个为目标项（稀有度取真实结果，其余为随机稀有度）
    const seq = [...fillers, finalName]
    const items = seq.map((n, i) => {
      const isTarget = i === seq.length - 1
      const sid = isTarget ? finalStudentId : (nameToId.get(n) ?? `filler-${i}-${n}`)
      return {
        id: sid,
        name: n,
        rarity: isTarget ? finalRarity : rollRarity(),
      }
    })
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
    if (activeResult) sfx.reveal(activeResult.rarity)
    // 显示结果覆盖层，不切换页面，轮盘保持在下层
    setShowResultOverlay(true)

    // 若处于自动连抽：统计次数并在短暂停留后继续下一次
    if (isAutoRolling) {
      autoRollCountRef.current += 1
      const finished = autoRollCountRef.current >= 5
      if (!finished) {
        // 在结果覆盖层停留一段时间，随后关闭覆盖层并继续下一抽
        if (autoRollTimerRef.current) clearTimeout(autoRollTimerRef.current)
        autoRollTimerRef.current = setTimeout(() => {
          setShowResultOverlay(false)
          // 返回主页并清理当前轮盘数据，再触发下一次抽取
          setCurrentPage('home')
          setRollItems(null)
          performNextAutoRoll()
        }, resultPauseMs())
      } else {
        // 完成 5 连抽，退出自动模式（保留最后一次结果覆盖层）
        setIsAutoRolling(false)
      }
    }
  }

  /**
   * 处理继续抽奖
   */
  const handleContinue = () => {
    // 关闭结果覆盖层并返回主页，清理当前轮盘数据
    setShowResultOverlay(false)
    setCurrentPage('home')
    setRollItems(null)
  }

  /**
   * 处理关闭结果弹窗
   */
  const handleCloseResult = () => {
    // 关闭结果覆盖层并返回主页，清理当前轮盘数据
    setShowResultOverlay(false)
    setCurrentPage('home')
    setRollItems(null)
  }

  /**
   * 处理重置抽取池按钮点击
   */
  const handleResetPool = () => {
    sfx.click()
    resetPool()
  }

  // 组件卸载或模式切换时清理定时器
  useEffect(() => {
    return () => {
      if (autoRollTimerRef.current) clearTimeout(autoRollTimerRef.current)
    }
  }, [])

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
            <motion.div 
              className="col-span-12 lg:col-span-3 xl:col-span-2 order-3 lg:order-1 p-3 lg:pl-3 lg:pr-2"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            >
              <DrawnStudentsSidebar 
                visible={settings.noRepeat && drawnStudents.length > 0 && currentPage === 'home'}
              />
            </motion.div>

            {/* 主内容区域 */}
            <motion.div 
              className="col-span-12 lg:col-span-6 xl:col-span-8 order-1 lg:order-2 p-6 lg:px-3"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
            >
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
                  <p className="text-white/60 text-base lg:text-lg">QQHKX 班级点名系统</p>
                </div>

                {/* 主控制面板 */}
                <div className="w-full max-w-2xl">
                  <div className="bg-[var(--csgo-panel)]/80 backdrop-blur-xl rounded-2xl lg:rounded-3xl border border-white/10 p-4 lg:p-8 shadow-2xl">
                    {/* 操作按钮组 */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-stretch">
                      {/* 主要抽取按钮 */}
                      <button 
                        className="w-full h-full md:col-span-3 px-12 py-8 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 hover:border-white/30 transition-all duration-300 font-bold text-white text-xl disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white/10 disabled:hover:border-white/20" 
                        onClick={() => handleDraw()} 
                        disabled={roster.length === 0 || currentPage !== 'home' || isAutoRolling}
                      >
                        <div className="flex items-center justify-center gap-4">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{currentPage !== 'home' ? '抽取中...' : '开始抽取'}</span>
                        </div>
                      </button>
                      
                      {/* 5 连抽按钮 */}
                      <button 
                        className="w-full h-full md:col-span-1 px-12 py-8 rounded-2xl bg-[var(--csgo-blue)]/15 hover:bg-[var(--csgo-blue)]/20 border border-white/15 hover:border-white/25 transition-all duration-300 font-bold text-white text-xl disabled:opacity-40 disabled:cursor-not-allowed"
                        onClick={handleFiveDraws}
                        disabled={roster.length === 0 || currentPage !== 'home' || isAutoRolling}
                        title="自动执行 5 次抽奖（动画与结果会逐一展示）"
                      >
                        <div className="flex items-center justify-center gap-3">
                          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
                          </svg>
                          <span>5 连抽</span>
                          {isAutoRolling && (
                            <span className="text-white/70 text-sm">(第 {autoRollCountRef.current + 1} 次)</span>
                          )}
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* 右侧边栏：设置和快捷操作 */}
            <motion.div 
              className="col-span-12 lg:col-span-3 xl:col-span-2 order-2 lg:order-3 p-6 lg:pl-3 lg:pr-6"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
            >
              <div className="sticky top-6 space-y-4 lg:space-y-6">
                
                {/* 系统状态 */}
              <SystemStatusPanel audioStatus={audioStatus} />

              {/* 设置面板 */}
              <SettingsPanel 
                  onOpenSettings={() => setOpenSettings(true)}
                  onOpenStorage={() => setOpenStorage(true)}
                  onResetPool={handleResetPool}
                  resetDisabled={roster.length === 0}
                />
              </div>
            </motion.div>
          </div>

          {/* 收藏馆（历史记录）- 移至底部 */}
          <motion.div 
            ref={galleryRef} 
            className="relative z-10"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
          >
            <Gallery />
          </motion.div>
        </div>
      )}

      {/* 抽奖轮盘页面 */}
      <RouletteScreen
        isOpen={currentPage === 'roulette'}
        rollItems={rollItems}
        targetIndex={targetIndex}
        targetId={rollItems ? rollItems[targetIndex]?.id : undefined}
        speed={settings.speed}
        sessionId={rollSessionId}
        onComplete={handleRouletteComplete}
      />

      {/* 抽奖结果覆盖层（在轮盘页面之上显示） */}
      <ResultScreen
        isOpen={showResultOverlay}
        lastResult={activeResult || null}
        selectedStudent={(activeResult ? (roster.find(s => s.id === activeResult.studentId) || null) : null)}
        onContinue={handleContinue}
        onClose={handleCloseResult}
        lockClose={isAutoRolling}
        autoRolling={isAutoRolling}
        progressText={isAutoRolling ? `自动连抽中 · 第 ${Math.min(autoRollCountRef.current, 5)}/5 次` : undefined}
      />

      {/* 页脚组件 */}
      {currentPage === 'home' && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6, ease: "easeOut" }}
        >
          <Footer />
        </motion.div>
      )}

      {/* 设置面板挂载 */}
      <SettingsModal open={openSettings} onClose={() => setOpenSettings(false)} />
      
      {/* 存储管理弹窗 */}
      <StorageModal open={openStorage} onClose={() => setOpenStorage(false)} />
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
