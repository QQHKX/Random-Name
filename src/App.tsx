import { useState, useEffect } from 'react'
import './App.css'
import { useAppStore } from './store/appStore'
import SettingsModal from './components/SettingsModal'
import MainScreen from './components/MainScreen'
import RouletteScreen from './pages/RouletteScreen'
import ResultScreen from './pages/ResultScreen'
import { sfx } from './lib/audioManager'
import type { Rarity } from './store/appStore'
import { drawRarity as configDrawRarity } from './config/rarityConfig'




// 页面状态枚举
type PageState = 'home' | 'roulette' | 'result'

function App() {
  const {
    settings,
    roster,
    drawNext,
    lastResult,
    selectedStudent,
  } = useAppStore()

  const [openSettings, setOpenSettings] = useState(false)
  const [currentPage, setCurrentPage] = useState<PageState>('home')
  const [rollItems, setRollItems] = useState<{ id: string; name: string; rarity: Rarity }[] | null>(null)
  const [targetIndex, setTargetIndex] = useState(0)
  const [audioStatus, setAudioStatus] = useState(() => sfx.getCacheStatus())

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

  return (
    <div className="min-h-screen bg-[var(--csgo-bg)] text-white relative">
      {/* 主界面页面 */}
      {currentPage === 'home' && (
        <MainScreen
          audioStatus={audioStatus}
          showAudioStatus={showAudioStatus}
          onStartDraw={handleDraw}
          isDrawing={currentPage !== 'home'}
          onOpenSettings={() => setOpenSettings(true)}
        />
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
