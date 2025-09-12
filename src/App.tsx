import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import './App.css'
import { useAppStore } from './store/appStore'
import SettingsModal from './components/SettingsModal'
import RouletteScreen from './pages/RouletteScreen'
import ResultScreen from './pages/ResultScreen'
import Gallery from './components/Gallery'
import Footer from './components/Footer'
import DrawnStudentsSidebar from './components/DrawnStudentsSidebar'
import SystemStatusPanel from './components/SystemStatusPanel'
import SettingsPanel from './components/SettingsPanel'
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
    // 先清空队列，再切换页面，避免轮盘在结果页面显示时抽动
    setRollItems(null)
    // 延迟切换到结果页面，让轮盘退出动画完成（0.4秒）
    setTimeout(() => {
      setCurrentPage('result')
    }, 10)
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
                     <div className="flex flex-col gap-6">
                       {/* 主要抽取按钮 */}
                       <button 
                         className="w-full px-12 py-8 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 hover:border-white/30 transition-all duration-300 font-bold text-white text-xl disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white/10 disabled:hover:border-white/20" 
                         onClick={handleDraw} 
                         disabled={roster.length === 0 || currentPage !== 'home'}
                       >
                         <div className="flex items-center justify-center gap-4">
                           <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z" />
                           </svg>
                           <span>{currentPage !== 'home' ? '抽取中...' : '开始抽取'}</span>
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
