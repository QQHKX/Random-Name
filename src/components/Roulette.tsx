import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useAnimation } from 'framer-motion'
import type { Rarity } from '../store/appStore'
import { sfx } from '../lib/audioManager'

/**
 * 轮盘滚动组件（Roulette）
 * - 接收一组 items（包含姓名与稀有度），以及目标索引 targetIndex
 * - 根据 speed 计算滚动时长，采用单段 CSGO 风格的强减速 cubic-bezier(0.22, 1, 0.36, 1)
 * - 在滚动过程中按卡片经过中心触发滴答声；到达终点后，对目标卡片做“停帧高亮”并触发 onComplete
 * @param props.items 待渲染的滚动项
 * @param props.targetIndex 目标项在 items 中的索引（最终停在中心指示线）
 * @param props.speed 动画速度档位
 * @param props.onComplete 动画完成后的回调
 */
export interface RouletteItem {
  id: string
  name: string
  rarity: Rarity
}

export interface RouletteProps {
  /** 待渲染的滚动项（最后一个通常为目标项） */
  items: RouletteItem[]
  /** 目标项索引（将停在中心） */
  targetIndex: number
  /** 动画速度 */
  speed: 'slow' | 'normal' | 'fast'
  /** 动画完成回调（减速停止并高亮后触发） */
  onComplete?: () => void
}

const TILE_W = 180 // 单卡片宽度
const TILE_GAP = 12 // 卡片间隙
const STEP = TILE_W + TILE_GAP // 每步距离

/** CSGO 风格强减速缓动（越接近终点减速越明显，最后阶段大幅减速） */
const CSGO_EASE: [number, number, number, number] = [0.15, 0.8, 0.25, 1]

/** 稀有度到背景渐变映射 */
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

/** 根据速度返回总时长（秒） */
function speedDuration(speed: RouletteProps['speed']) {
  // 调整速度档位：快速→标准，标准→缓慢，缓慢再降一档
  if (speed === 'fast') return 5.2   // 原标准速度
  if (speed === 'slow') return 9.0   // 比原缓慢更慢
  return 7.0  // 原缓慢速度
}

/**
 * 将当前 X 位置映射为“中心经过的卡片索引”，用于滴答触发
 * @param x 当前 translateX 像素
 * @param centerOffset 中心补偿偏移
 * @returns 经过中心的卡片索引（四舍五入到最接近的卡片）
 */
function xToIndex(x: number, centerOffset: number) {
  // 当某卡片中心与容器中心重合时，有 centerOffset - x ≈ idx * STEP
  return Math.round((centerOffset - x) / STEP)
}

/**
 * 轮盘动画组件（含低性能降级策略）
 * 功能：以单段 ease-out 缓动滚动到目标卡片，并在 onAnimationComplete 时回调；在低 GPU/高分辨率设备上自动降低特效并节流滴答音效，保障流畅度。
 * @param items 展示的滚动项（包含名称与稀有度）
 * @param targetIndex 目标命中项在 items 中的索引
 * @param speed 动画速度（fast/normal/slow），决定总时长与滴答节奏
 * @param onComplete 动画完成回调（停在中心后执行）
 * @returns JSX.Element 轮盘视图
 */
export default function Roulette({ items, targetIndex, speed, onComplete }: RouletteProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [centerOffset, setCenterOffset] = useState(0)
  const [stopped, setStopped] = useState(false)
  const controls = useAnimation()

  // 新增：低开销/低配置启发式，自动降低特效强度
  const reducedEffects = useMemo(() => {
    try {
      const prefers = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
      const w = typeof window !== 'undefined' ? window.innerWidth || 0 : 0
      const cores = (navigator as any)?.hardwareConcurrency || 4
      return prefers || (dpr >= 2 && w >= 1600) || cores <= 4
    } catch {
      return false
    }
  }, [])

  // 滴答判定状态
  const lastTickStepRef = useRef<number | null>(null)
  const totalDistRef = useRef<number>(0)
  const lastTickTsRef = useRef<number>(0) // 新增：滴答节流（按时间）

  // 当数据或目标改变时，重置停帧高亮状态
  useEffect(() => {
    setStopped(false)
    lastTickStepRef.current = null
  }, [items, targetIndex])

  // 计算需要滚动到的 X 距离（考虑左侧预补齐 prepad）
  const finalX = useMemo(() => {
    const el = wrapRef.current
    const rectW = el?.getBoundingClientRect().width || 0
    const cw = el?.clientWidth || 0
    const width = rectW || cw
    const styles = el ? getComputedStyle(el) : null
    const padL = styles ? parseFloat(styles.paddingLeft || '0') : 0
    const padR = styles ? parseFloat(styles.paddingRight || '0') : 0
    const contentW = Math.max(0, width - padL - padR)
    const visibleCount = contentW > 0 ? Math.ceil((contentW + TILE_GAP) / STEP) + 1 : 0
    const half = Math.ceil(visibleCount / 2)
    const prepad = half + 1

    // 目标卡片在displayItems中的位置
    const targetDisplayIndex = targetIndex + prepad
    // 目标卡片左边缘的位置
    const targetLeft = targetDisplayIndex * STEP
    // 目标卡片中心的位置
    const targetCenter = targetLeft + TILE_W / 2
    // 容器中心的位置（相对于容器左边缘）
    const containerCenter = padL + contentW / 2
    
    // 修复：为确保指针所指即为抽取结果，移除随机偏移，精确对齐目标卡片中心到容器中心
    return containerCenter - targetCenter
  }, [targetIndex, centerOffset])

  // 初次渲染与窗口大小变化时，计算中心偏移
  useEffect(() => {
    const calc = () => {
      const el = wrapRef.current
      const w = el?.clientWidth || 0
      if (!el || w <= 0) {
        setCenterOffset(0)
        return
      }
      const styles = getComputedStyle(el)
      const padL = parseFloat(styles.paddingLeft || '0')
      const padR = parseFloat(styles.paddingRight || '0')
      const contentW = w - padL - padR
      // centerOffset 采用“包含左 padding”的坐标，以便与绝对定位的中心指示线对齐
      setCenterOffset(padL + contentW / 2 - TILE_W / 2)
    }
    calc()
    const ro = new ResizeObserver(calc)
    if (wrapRef.current) ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [])

  // 速度映射到滴答频率与动画总时长
  const duration = speedDuration(speed)
  const baseTickFreq = useMemo(() => {
    const f = speed === 'fast' ? 980 : speed === 'slow' ? 800 : 880
    return reducedEffects ? f - 80 : f
  }, [speed, reducedEffects])

  /**
   * 计算展示用的 items：在不改变目标索引的前提下，左侧预补齐 prepad，右侧按需补齐，
   * 确保从起点到终点整个滚动过程，视口两侧都不会出现空白。
   */
  const displayItems = useMemo(() => {
    const el = wrapRef.current
    const rectW = el?.getBoundingClientRect().width || 0
    const cw = el?.clientWidth || 0
    const width = rectW || cw
    if (width <= 0 || items.length === 0 || !el) return items

    const styles = getComputedStyle(el)
    const padL = parseFloat(styles.paddingLeft || '0')
    const padR = parseFloat(styles.paddingRight || '0')
    const contentW = width - padL - padR

    const visibleCount = Math.ceil((contentW + TILE_GAP) / STEP) + 1
    const half = Math.ceil(visibleCount / 2)
    const prepad = half + 1
    const buffer = reducedEffects ? 4 : 10 // 优化：减少离屏渲染数量

    // 左侧克隆 prepad 项（从原数组尾部取）
    const leftClones: RouletteItem[] = []
    for (let i = 0; i < prepad; i++) {
      const src = items[(items.length - prepad + i + items.length) % items.length]
      leftClones.push({ ...src, id: `${src.id}__pre${i}` })
    }

    const base = leftClones.concat(items)

    // 右侧最小需要长度：目标显示索引 + 完整可视数量 + 冗余 buffer
    const targetDisplayIndex = prepad + targetIndex
    const minCount = Math.max(base.length, targetDisplayIndex + visibleCount + buffer)

    const extended = base.slice()
    let padIdx = 0
    while (extended.length < minCount) {
      const src = items[padIdx % items.length]
      extended.push({ ...src, id: `${src.id}__pad${padIdx}` })
      padIdx++
    }
    return extended
  }, [items, targetIndex, centerOffset, reducedEffects])

  // 新增：基于最终位移几何计算目标索引，确保与实际停留位置一致
  const displayTargetIndex = useMemo(() => {
    // 使用最终位移与中心偏移换算获得中心处卡片索引
    const idx = Math.round((centerOffset - finalX) / STEP)
    return Number.isFinite(idx) ? idx : -1
  }, [finalX, centerOffset])

  // 启动动画（单段 CSGO 曲线），同步考虑 prepad 以确保初始位置即有足够左侧内容
  useEffect(() => {
    if (!wrapRef.current) return
    if (!items || items.length === 0) return

    setStopped(false)

    // 计算 prepad（基于当前容器宽度与可视卡片数）
    let prepad = 0
    {
      const el = wrapRef.current
      const rectW = el?.getBoundingClientRect().width || 0
      const cw = el?.clientWidth || 0
      const width = rectW || cw
      if (width > 0 && el) {
        const styles = getComputedStyle(el)
        const padL = parseFloat(styles.paddingLeft || '0')
        const padR = parseFloat(styles.paddingRight || '0')
        const contentW = Math.max(0, width - padL - padR)
        const visibleCount = Math.ceil((contentW + TILE_GAP) / STEP) + 1
        const half = Math.ceil(visibleCount / 2)
        prepad = half + 1
      }
    }

    const targetDisplayIndex = prepad + targetIndex
    // 终点 X：让目标卡片中心对齐指示线
    const localFinalX = centerOffset - (targetDisplayIndex * STEP)

    const x0 = centerOffset
    const x3 = localFinalX

    // 记录总距离用于 onUpdate 计算音量强度
    {
      const dist = Math.abs(x3 - x0)
      totalDistRef.current = dist
    }

    // 先设置起始位置
    controls.set({ x: x0 })

    // 播放一次开场提示（可选）：轻微滴答，营造开动的感觉
    try { sfx.tick(0.9, baseTickFreq) } catch {}

    requestAnimationFrame(() => {
      controls.start({
        x: x3,
        transition: { duration, ease: CSGO_EASE },
      })
    })
  }, [items, targetIndex, centerOffset, duration, controls])

  // onUpdate 里做滴答触发：当“经过的卡片索引”变化时播放一次（加入时间节流）
  const handleUpdate = (latest: any) => {
    const x: number = typeof latest.x === 'number' ? latest.x : (latest.x?.get ? latest.x.get() : 0)
    const step = xToIndex(x, centerOffset)
    if (!Number.isFinite(step)) return

    if (lastTickStepRef.current === null || step !== lastTickStepRef.current) {
      const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()
      const minGap = reducedEffects ? 24 : 12 // ms，低性能设备降低滴答频率
      if (now - lastTickTsRef.current >= minGap) {
        // 计算强度：随剩余距离降低（越接近终点声音越轻）
        const remaining = Math.max(0, Math.abs(finalX - x))
        const total = Math.max(1, totalDistRef.current)
        const intensity = 0.35 + 0.65 * (remaining / total)
        try { sfx.tick(intensity, baseTickFreq) } catch {}
        lastTickTsRef.current = now
        lastTickStepRef.current = step
      }
    }
  }

  return (
    <div className="relative w-[min(1200px,90vw)] select-none">
      {/* 中心指示器 */}
      <div className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-[2px] bg-cyan-400/70 shadow-[0_0_10px_rgba(34,211,238,0.6)] z-20" />

      {/* 渐变遮罩，提升拟物质感（低性能设备关闭） */}
      <div className={reducedEffects ? "pointer-events-none absolute inset-0 z-10" : "pointer-events-none absolute inset-0 z-10 bg-gradient-to-r from-[rgba(0,0,0,0.35)] via-transparent to-[rgba(0,0,0,0.35)]"} />

      {/* 滚动视口 */}
      <div ref={wrapRef} className="overflow-hidden px-2 py-3 border border-white/10 rounded-xl bg-black/20 backdrop-blur-sm">
        <motion.div
           key={`${displayItems.length}-${targetIndex}-${Math.round(centerOffset)}`}
            className="flex items-center"
            style={{ gap: TILE_GAP, willChange: 'transform' }}
            initial={{ x: centerOffset }}
            animate={controls}
            onUpdate={handleUpdate}
            onAnimationComplete={() => {
              // 强制对齐到精确终点，避免浮点误差导致的半像素偏差
              controls.set({ x: Math.round(finalX) })
              setStopped(true)
              onComplete?.()
            }}
        >
          {displayItems.map((it, idx) => {
            const isTarget = stopped && idx === displayTargetIndex
            const colorVar = `var(--rarity-${it.rarity})`
            return (
               <div
                 key={`${it.id}-${idx}`}
                 className="w-[180px] h-[108px] rounded-lg border box-border shrink-0 flex-none text-center flex items-center justify-center relative text-lg font-medium"
                  style={{
                    background: rarityBg(it.rarity),
                    borderColor: 'rgba(255,255,255,0.10)',
                    boxShadow: isTarget ? (reducedEffects ? `0 0 0 2px ${colorVar} inset` : `0 0 0 2px ${colorVar} inset, 0 0 18px ${colorVar}`) : undefined,
                  }}
                >
                {/* 稀有度色带边框 */}
                <div
                  className="absolute inset-0 rounded-lg pointer-events-none"
                  style={{ boxShadow: `inset 0 0 0 2px var(--rarity-${it.rarity})` }}
                />

                {/* 目标卡片：稀有度扫光与脉冲（低性能设备下仅保留外环高亮） */}
                {isTarget && (
                  <>
                    {/* 外环高亮框 */}
                    <div className="absolute -inset-1 rounded-xl border-2 border-cyan-300/70 shadow-[0_0_24px_rgba(34,211,238,0.6)]" />
                    {!reducedEffects && (
                      <>
                        {/* 稀有度脉冲光晕等重特效保留在高性能模式 */}
                      </>
                    )}
                  </>
                )}

                <span className="px-2 truncate max-w-[168px]">{it.name}</span>
              </div>
            )
          })}
        </motion.div>
      </div>
    </div>
  )
}