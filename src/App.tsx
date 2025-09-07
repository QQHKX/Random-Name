import { useMemo, useState, useEffect } from 'react'
import './App.css'
import { useAppStore } from './store/appStore'
import SettingsModal from './components/SettingsModal'
import { AnimatePresence, motion } from 'framer-motion'
import { sfx } from './lib/audioManager'
import Roulette from './components/Roulette'
import type { Rarity, Student } from './store/appStore'
import * as XLSX from 'xlsx'

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
    importFromText,
    drawNext,
    lastResult,
    selectedStudent,
    resetPool,
    replaceRosterFromText,
  } = useAppStore()

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

  // 音量与设置联动（SFX + BGM）
  useEffect(() => {
    sfx.setVolume(settings.sfxVolume)
    sfx.setBgmVolume(settings.bgmVolume)
  }, [settings.sfxVolume, settings.bgmVolume])

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
    <div className="min-h-screen w-full bg-[var(--csgo-bg)] text-white flex items-center justify-center">
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

      <div className="text-center p-8 rounded-xl border border-white/10 bg-[var(--csgo-panel)]/60 backdrop-blur-sm w-[min(900px,95vw)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-wide">Roll Call</h1>
          </div>
          <button className="px-3 py-1.5 rounded-md bg-zinc-700 hover:bg-zinc-600 border border-white/10 text-xs" onClick={() => setOpenSettings(true)}>
            设置
          </button>
        </div>

        <div className="mb-6 text-sm text-white/80">
          <span className="inline-block px-3 py-1 rounded-full bg-white/5 border border-white/10 mr-2">班级：{settings.className}</span>
          <span className="inline-block px-3 py-1 rounded-full bg-white/5 border border-white/10 mr-2">名单：{roster.length} 人</span>
          <span className="inline-block px-3 py-1 rounded-full bg-white/5 border border-white/10">抽取池：{poolCount} 人</span>
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
          <button className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 border border-amber-300/30 text-sm font-medium transition-colors" onClick={resetPool} disabled={roster.length === 0} title="重置抽取池">
            重置抽取池
          </button>
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
              animate={{ y: 0, scale: 1.06, opacity: 1 }}
              exit={{ y: -10, scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 240, damping: 22 }}
              onClick={(e) => { e.stopPropagation(); setRevealOpen(false) }}
            >
              <div
                className="w-[360px] max-w-[92vw] h-[160px] rounded-2xl border border-white/12 box-border flex items-center justify-start gap-4 px-6 relative shadow-[0_0_40px_rgba(0,0,0,0.35)]"
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

                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-xl font-semibold">
                  {selectedStudent.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-left">
                  <div className="text-2xl font-bold tracking-wide">{selectedStudent.name}</div>
                  <div className="text-xs opacity-80">稀有度：{rarityLabelCN(lastResult.rarity)}</div>
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
 * 概率：blue 60%, purple 20%, pink 12%, red 7%, gold 1%
 * @returns {Rarity} 随机稀有度
 */
function rollRarity(): Rarity {
  const r = Math.random()
  if (r < 0.60) return 'blue'
  if (r < 0.80) return 'purple'
  if (r < 0.92) return 'pink'
  if (r < 0.99) return 'red'
  return 'gold'
}

/**
 * 稀有度到背景渐变映射（与 Roulette 渐变风格保持一致）
 * @param r 稀有度
 * @returns 对应的线性渐变 CSS 字符串
 */
function rarityBg(r: Rarity) {
  switch (r) {
    case 'gold':
      return 'linear-gradient(135deg, rgba(255,215,0,0.22), rgba(255,153,0,0.10))'
    case 'red':
      return 'linear-gradient(135deg, rgba(235,75,75,0.22), rgba(255,153,153,0.08))'
    case 'pink':
      return 'linear-gradient(135deg, rgba(211,44,230,0.20), rgba(211,44,230,0.08))'
    case 'purple':
      return 'linear-gradient(135deg, rgba(136,71,255,0.20), rgba(136,71,255,0.08))'
    case 'blue':
    default:
      return 'linear-gradient(135deg, rgba(75,105,255,0.18), rgba(75,105,255,0.08))'
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
