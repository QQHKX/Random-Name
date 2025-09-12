import { useMemo, useState, useEffect, useRef } from 'react'
import './App.css'
import { useAppStore } from './store/appStore'
import SettingsModal from './components/SettingsModal'
import { AnimatePresence, motion } from 'framer-motion'
import { sfx } from './lib/audioManager'
import Roulette from './components/Roulette'
import type { Rarity, Student } from './store/appStore'
import { drawRarity as configDrawRarity, getWearLevelInfo, drawWearLevel } from './config/rarityConfig'
import type { WearLevel } from './config/rarityConfig'

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
    drawNext,
    lastResult,
    selectedStudent,
    resetPool,
  } = useAppStore()
  const history = useAppStore((s) => s.history)

  // 移除仅用于重新读取 CSV 的选择器，逻辑迁移至设置面板
  // const replaceRosterFromText = useAppStore((s) => s.replaceRosterFromText)

  // 已导入标记不参与 UI，移除避免未使用告警
  // const [imported, setImported] = useState(false)
  const [openSettings, setOpenSettings] = useState(false)
  const [opening, setOpening] = useState(false)
  const [rollItems, setRollItems] = useState<{ id: string; name: string; rarity: Rarity }[] | null>(null)
  const [targetIndex, setTargetIndex] = useState(0)
  // 揭晓后居中放大展示开关
  const [revealOpen, setRevealOpen] = useState(false)
  const [audioStatus, setAudioStatus] = useState(() => sfx.getCacheStatus())
  // 收藏馆：搜索与排序控制
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<'time' | 'rarity' | 'wear'>('time')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')
  const galleryRef = useRef<HTMLDivElement | null>(null)

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

    setOpening(true)

    // 先计算结果，但暂不展示，拿到结果后构建滚动序列
    const result = drawNext()
    if (!result) {
      setOpening(false)
      // 恢复 BGM 音量
      sfx.fadeBgmTo(settings.bgmVolume, 300)
      return
    }

    // 使用 store 中的 selectedStudent（drawNext 已设置）
    const student = useAppStore.getState().selectedStudent
    const finalName = student?.name || 'Unknown'
    buildSequence(finalName, result.rarity)
  }



  /**
   * 将稀有度映射为可比较的权重（值越大稀有度越高）
   * @param r 稀有度键
   * @returns 数值权重
   */
  function rarityOrderValue(r: Rarity): number {
    switch (r) {
      case 'gold': return 5
      case 'red': return 4
      case 'pink': return 3
      case 'purple': return 2
      case 'blue':
      default: return 1
    }
  }

  /**
   * 将磨损等级映射为可比较的权重（值越小越新）
   * @param level 磨损等级
   * @returns 数值权重
   */
  function wearOrderValue(level: WearLevel): number {
     // 由于类型推导限制，直接根据键名比较
     switch (String(level)) {
       case 'factory-new': return 1
       case 'minimal-wear': return 2
       case 'field-tested': return 3
       case 'well-worn': return 4
       case 'battle-scarred':
       default: return 5
     }
   }

  /**
   * 将时间戳格式化为 yyyy-MM-dd HH:mm:ss
   * @param ts 毫秒时间戳
   * @returns 格式化后的字符串
   */
  function formatTime(ts: number): string {
    const d = new Date(ts)
    const pad = (n: number) => String(n).padStart(2, '0')
    const y = d.getFullYear()
    const m = pad(d.getMonth() + 1)
    const day = pad(d.getDate())
    const hh = pad(d.getHours())
    const mm = pad(d.getMinutes())
    const ss = pad(d.getSeconds())
    return `${y}-${m}-${day} ${hh}:${mm}:${ss}`
  }

  /**
   * 基于搜索与排序规则生成可见的历史记录列表
   * - 默认时间倒序（最新在前）
   * - 搜索按姓名包含匹配（不区分大小写）
   */
  const visibleRecords = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = q ? history.filter(h => h.name.toLowerCase().includes(q)) : history.slice()
    base.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'time') {
        cmp = a.timestamp - b.timestamp
      } else if (sortKey === 'rarity') {
        cmp = rarityOrderValue(a.rarity) - rarityOrderValue(b.rarity)
      } else {
        // wear：按等级权重排序（更新 → 更旧）
        cmp = wearOrderValue(a.wearLevel) - wearOrderValue(b.wearLevel)
      }
      return sortOrder === 'asc' ? cmp : -cmp
    })
    return base
  }, [history, query, sortKey, sortOrder])

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



  const poolCount = useMemo(() => pool.length, [pool])

  // 计算“已抽取名单”（仅不重复模式）
  const drawnStudents = useMemo(
    () => getDrawnStudents(roster, pool, settings.noRepeat),
    [roster, pool, settings.noRepeat]
  )

  return (
    <div className="min-h-screen bg-[var(--csgo-bg)] text-white relative">
      {/* 左侧：已抽取名单（仅在不重复模式显示，且大屏显示，动画结束后才显示避免透露结果） */}
      {settings.noRepeat && drawnStudents.length > 0 && !opening && (
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
              <button className="px-3 py-1.5 rounded-md bg-zinc-700 hover:bg-zinc-600 border border-white/10 text-xs" onClick={() => { sfx.click(); setOpenSettings(true); }}>
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

            {/* 轮盘滚动区域 */}
            <div className="mb-6 min-h-[120px] flex items-center justify-center">
              <AnimatePresence initial={false}>
                {opening && rollItems && (
                  <Roulette
                    items={rollItems}
                    targetIndex={targetIndex}
                    speed={settings.speed}
                    onComplete={() => {
                      // 揭晓音效
                      const r = useAppStore.getState().lastResult
                      if (r) sfx.reveal(r.rarity)
                      // 揭晓后恢复 BGM 音量
                      sfx.fadeBgmTo(settings.bgmVolume, 380)
                      setOpening(false)
                      // 播放结束后清空队列，显示到下方结果卡片
                      setTimeout(() => setRollItems(null), 200)
                      // 开启"居中放大"结果展示，改为点击关闭（无限展示）
                      setRevealOpen(true)
                      // 删除自动关闭逻辑
                    }}
                  />
                )}
              </AnimatePresence>
            </div>

            {/* 操作按钮组 */}
            <div className="relative h-[64px] flex items-center justify-center gap-4 mb-2">
              <button className="px-6 py-3 rounded-lg bg-[var(--csgo-blue)] hover:bg-sky-500 transition-colors font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed" onClick={handleDraw} disabled={roster.length === 0 || opening}>
                {opening ? '抽取中…' : '开始抽取'}
              </button>
              <button className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 border border-amber-300/30 text-sm font-medium transition-colors" onClick={() => { sfx.click(); resetPool(); }} disabled={roster.length === 0} title="重置抽取池">
                重置抽取池
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-sm font-medium transition-colors"
                onClick={() => { sfx.click(); galleryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
                title="查看收藏馆"
              >
                查看收藏馆
              </button>
            </div>
        </div>
      </div>

      {/* 收藏馆（历史记录） */}
      <div ref={galleryRef} className="max-w-[980px] mx-auto px-4 md:px-0 pb-12">
        <div className="h-10" />
        <div className="sticky top-0 z-10 -mx-4 md:mx-0 px-4 md:px-0 py-3 backdrop-blur border-b border-white/10">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="text-2xl font-bold tracking-wide">收藏馆</div>
            <div className="flex items-center gap-3">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索姓名…"
                className="px-3 py-2 rounded-lg bg-white/10 border border-white/15 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
              />
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as any)}
                className="px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-sm"
                title="排序字段"
              >
                <option value="time">按时间</option>
                <option value="rarity">按稀有度</option>
                <option value="wear">按磨损</option>
              </select>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-sm"
                title="排序方向"
              >
                <option value="desc">倒序</option>
                <option value="asc">正序</option>
              </select>
            </div>
          </div>
          <div className="text-xs opacity-70 mt-1">共 {visibleRecords.length} 条记录，默认按抽中时间倒序</div>
        </div>

        {/* 网格卡片 */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {visibleRecords.map((r) => (
          <div
              key={`${r.id}-${r.timestamp}`}
               className="rounded-xl border border-white/10 p-3 bg-black/20 shadow-md hover:shadow-lg transition-shadow"
               style={{ background: rarityBg(r.rarity) }}
               title={`${r.name} @ ${formatTime(r.timestamp)}`}
             >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold text-white/90">
                  {/* 安全首字母显示：优先历史记录中的 name，回退到 roster 中的姓名，再回退 '?' */}
                  {(() => {
                    const rosterMap = new Map(roster.map(s => [s.id, s]));
                    const displayName = r.name ?? rosterMap.get(r.studentId)?.name ?? 'Unknown';
                    const initial = (displayName && displayName.length > 0) ? displayName.charAt(0).toUpperCase() : '?';
                    return initial;
                  })()}
                </div>
                {/* 显示安全的名称 */}
                {(() => {
                  const rosterMap = new Map(roster.map(s => [s.id, s]));
                  const displayName = r.name ?? rosterMap.get(r.studentId)?.name ?? 'Unknown';
                  return <div className="font-semibold truncate" title={displayName}>{displayName}</div>;
                })()}
              </div>
              <div className="text-[10px] opacity-80 mb-1">时间：{formatTime(r.timestamp)}</div>
              <div className="text-[10px] opacity-80 mb-1">稀有度：{rarityLabelCN(r.rarity)}</div>
              <div className="text-[10px] opacity-80">磨损：
                {(() => {
                  const wl = (r.wearLevel ?? drawWearLevel());
                  const info = getWearLevelInfo(wl);
                  return (
                    <span className="ml-1 font-medium" style={{ color: info.color }}>
                      {info.label}
                    </span>
                  );
                })()}
                <span className="ml-1 opacity-70">({(r.wearValue ?? 0).toFixed(4)})</span>
               </div>
            </div>
          ))}
        </div>
      </div>

      {/* 居中放大揭晓层：将当选卡片移动到屏幕中央并放大，渲染稀有度光效 */}
      <AnimatePresence>
        {revealOpen && lastResult && selectedStudent && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            // 点击遮罩关闭
            onClick={() => setRevealOpen(false)}
          >
            <motion.div
              className="relative"
              initial={{ y: 20, scale: 0.78, opacity: 0 }}
              animate={{ y: 0, scale: 1.25, opacity: 1 }}
              exit={{ y: -10, scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 240, damping: 22 }}
              onClick={(e) => { e.stopPropagation(); setRevealOpen(false) }}
            >
              <div
                className="w-[420px] max-w-[92vw] h-[200px] rounded-2xl border border-white/12 box-border flex items-center justify-start gap-6 px-8 py-4 relative shadow-[0_0_40px_rgba(0,0,0,0.35)]"
                style={{
                  background: rarityBg(lastResult.rarity),
                }}
              >
                {/* 稀有度色带边框与内发光 */}
                <div
                  className="absolute inset-0 rounded-2xl pointer-events-none"
                  style={{ boxShadow: `inset 0 0 0 2px var(--rarity-${lastResult.rarity})` }}
                />
                <div
                  className="absolute inset-0 rounded-2xl pointer-events-none"
                  style={{ boxShadow: `0 0 42px 10px var(--rarity-${lastResult.rarity})`, animation: 'shimmer 1.6s linear infinite' }}
                />
                {(lastResult.rarity === 'gold' || lastResult.rarity === 'red') && (
                  <div
                    className="absolute -inset-3 rounded-3xl pointer-events-none"
                    style={{
                      background:
                        'linear-gradient(120deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 28%, rgba(255,255,255,0) 72%, rgba(255,255,255,0.10) 100%)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 1.8s linear infinite',
                      mixBlendMode: 'screen',
                    }}
                  />
                )}

                <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center text-2xl font-bold text-white/90 flex-shrink-0">
                  {selectedStudent.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-left flex-1 flex flex-col justify-center">
                  <div className="text-3xl font-bold tracking-wide mb-1">{selectedStudent?.name ?? 'Unknown'}</div>
                   <div className="text-sm opacity-90 mb-2">稀有度：{rarityLabelCN(lastResult.rarity)}</div>
                   <div className="text-[10px] text-white/60 whitespace-nowrap truncate">
                     磨损：
                    {(() => {
                      const wl = (lastResult?.wearLevel ?? drawWearLevel());
                      const info = getWearLevelInfo(wl);
                      return (
                        <span className="font-medium ml-1 opacity-80" style={{ color: info.color }}>
                          {info.label}
                        </span>
                      );
                    })()}
                     <span className="mx-1">·</span>
                    磨损值：{(lastResult?.wearValue ?? 0).toFixed(4)}
                   </div>
                 </div>
              </div>

              {/* 稀有度色值与特效关键帧 */}
              <style>{`
                :root {
                  --rarity-blue: rgba(75,105,255,0.75);
                  --rarity-purple: rgba(136,71,255,0.85);
                  --rarity-pink: rgba(211,44,230,0.85);
                  --rarity-red: rgba(235,75,75,0.9);
                  --rarity-gold: rgba(255,215,0,0.9);
                }
                @keyframes shimmer {
                  0% { background-position: 200% 0; }
                  100% { background-position: -200% 0; }
                }
                @keyframes pulseGlow {
                  0%, 100% { opacity: 0.55; }
                  50% { opacity: 1; }
                }
              `}</style>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

/**
 * 稀有度到背景渐变映射（与 Roulette 渐变风格保持一致）
 * @param r 稀有度
 * @returns 对应的线性渐变 CSS 字符串
 */
function rarityBg(r: Rarity) {
  switch (r) {
    case 'gold':
      // 提高不透明度，使卡片更清晰
      return 'linear-gradient(135deg, rgba(255,215,0,0.38), rgba(255,153,0,0.20))'
    case 'red':
      return 'linear-gradient(135deg, rgba(235,75,75,0.34), rgba(255,153,153,0.16))'
    case 'pink':
      return 'linear-gradient(135deg, rgba(211,44,230,0.30), rgba(211,44,230,0.14))'
    case 'purple':
      return 'linear-gradient(135deg, rgba(136,71,255,0.28), rgba(136,71,255,0.12))'
    case 'blue':
    default:
      return 'linear-gradient(135deg, rgba(75,105,255,0.24), rgba(75,105,255,0.12))'
  }
}

// 导入示例名单（优先 public/MD.csv，失败回退到 public/MD.xlsx）
// - CSV 支持两种格式：
//   1) 单列姓名（每行一个名字，无表头）
//   2) 有表头 name/姓名 的 CSV
// - 导入成功后重置抽取池
// }

/**
 * 将稀有度英文键映射为 CS2 中文命名
 * 蓝-军规级, 紫-受限级, 粉-保密级, 红-隐秘级, 金-极其罕见特殊物品
 * @param r 稀有度键
 * @returns CS2 中文稀有度名称
 */
function rarityLabelCN(r: Rarity): string {
  switch (r) {
    case 'blue':
      return '蓝（军规级）'
    case 'purple':
      return '紫（受限级）'
    case 'pink':
      return '粉（保密级）'
    case 'red':
      return '红（隐秘级）'
    case 'gold':
      return '金（极其罕见特殊物品）'
    default:
      return r
  }
}
