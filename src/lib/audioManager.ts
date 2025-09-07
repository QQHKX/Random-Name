import { Howl, Howler } from 'howler'

/**
 * audioManager 简易音效管理器（无外部资源版本）
 * - 使用 Web Audio API 生成短促提示音，避免打包二进制音频
 * - 暴露 click / tick / reveal 三个音效 API，支持 setVolume 调整音量
 */

let ctx: AudioContext | null = null
let masterVolume = 0.6 // 默认音量，可被 setVolume 覆盖（0..1）

// 新增：可选 BGM 播放器
let bgmHowl: Howl | null = null
let bgmTargetVolume = 0.5

/**
 * 解锁音频环境（移动端/浏览器策略下需用户手势后激活）
 * - 允许在首次点击/触发时调用，确保 AudioContext 与 Howler 都处于可播放状态
 */
export async function unlockAudio(): Promise<void> {
  try {
    const ac = getCtx()
    // WebAudio 解锁
    // 某些浏览器首次调用 resume 可能抛错，catch 即可
    // @ts-ignore
    if (ac.state === 'suspended' && ac.resume) await ac.resume()
  } catch {}
  try {
    // Howler 基于 WebAudio，通常会在首次交互自动解锁，这里容错处理
    // @ts-ignore
    if (Howler && (Howler.ctx?.state === 'suspended')) {
      // @ts-ignore
      await Howler.ctx.resume()
    }
  } catch {}
}

/** 设置 BGM 音量（0..1） */
function setBgmVolume(v: number) {
  bgmTargetVolume = clamp01(v)
  try {
    if (bgmHowl) bgmHowl.volume(bgmTargetVolume)
  } catch {}
}

/**
 * 播放/启动 BGM（若未创建会自动创建）
 * @param url 可选自定义 BGM 地址（默认 /audio/bgm.mp3）
 */
function playBgm(url?: string) {
  try {
    if (!bgmHowl) {
      bgmHowl = new Howl({
        src: [url || '/audio/bgm.mp3'],
        loop: true,
        volume: bgmTargetVolume,
        html5: false,
      })
    }
    if (!bgmHowl.playing()) bgmHowl.play()
  } catch {}
}

/** 停止 BGM 播放 */
function stopBgm() {
  try {
    if (bgmHowl) bgmHowl.stop()
  } catch {}
}

/**
 * 渐变 BGM 音量
 * @param v 目标音量（0..1）
 * @param ms 渐变时长（毫秒）
 */
function fadeBgmTo(v: number, ms = 500) {
  try {
    if (bgmHowl) bgmHowl.fade(bgmHowl.volume(), clamp01(v), Math.max(0, ms))
    bgmTargetVolume = clamp01(v)
  } catch {}
}

/** 获取/创建全局 AudioContext（在首次交互时会成功激活） */
function getCtx(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
  return ctx
}

/** 规范化到 0..1 */
function clamp01(n: number) {
  return Math.max(0, Math.min(1, n))
}

/**
 * 播放一个短促音调
 * @param freq 频率（Hz）
 * @param durationMs 持续时间（毫秒）
 * @param volume 音量（0..1，会乘以 masterVolume）
 * @param type 振荡器类型（默认 triangle，tick 用 square 更脆）
 */
async function playTone(freq: number, durationMs: number, volume = 1, type: OscillatorType = 'triangle') {
  const ac = getCtx()
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.value = freq
  // 计算最终音量并做一个极短攻击-释放包络，避免爆音
  const gv = clamp01(volume) * clamp01(masterVolume) * 0.45
  gain.gain.setValueAtTime(0.0001, ac.currentTime)
  gain.gain.exponentialRampToValueAtTime(Math.max(0.001, gv), ac.currentTime + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + durationMs / 1000)
  osc.connect(gain)
  gain.connect(ac.destination)
  osc.start()
  osc.stop(ac.currentTime + durationMs / 1000 + 0.01)
  // 清理节点
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      osc.disconnect()
      gain.disconnect()
      resolve()
    }, durationMs + 30)
  })
}

/** 映射稀有度到揭晓音调 */
function rarityFreq(rarity?: 'blue' | 'purple' | 'pink' | 'red' | 'gold'): number {
  switch (rarity) {
    case 'gold':
      return 880
    case 'red':
      return 820
    case 'pink':
      return 760
    case 'purple':
      return 700
    case 'blue':
    default:
      return 640
  }
}

/** 设置主音量（0..1） */
function setVolume(v: number) {
  masterVolume = clamp01(v)
}

/**
 * 点击音效：短促高一点的提示音
 * @returns Promise<void>
 */
async function click() {
  try {
    await playTone(720, 110, 1)
  } catch {}
}

/**
 * 滴答音效：滚动阶段按卡片经过中心触发，采用方波营造清脆的机械感
 * - 频率随速度略微变化以增强动感
 * @param intensity 强度（0..1），可用于在减速阶段逐渐降低音量
 * @param freq 可选自定义频率
 * @returns Promise<void>
 */
async function tick(intensity = 1, freq?: number) {
  try {
    const f = freq ?? 980
    const vol = 0.7 * clamp01(intensity)
    await playTone(f, 34, vol, 'square')
  } catch {}
}

/**
 * 揭晓音效：根据稀有度给不同的音高
 * @param rarity 稀有度
 * @returns Promise<void>
 */
async function reveal(rarity?: 'blue' | 'purple' | 'pink' | 'red' | 'gold') {
  try {
    const f = rarityFreq(rarity)
    // 做一个两段音高，略有“揭晓”感
    await playTone(f * 0.95, 90, 1)
    await playTone(f, 140, 1)
  } catch {}
}

export const sfx = {
  /** 设置 SFX 主音量（0..1） */
  setVolume,
  /** 点击音效 */
  click,
  /** 滴答音效（滚动阶段） */
  tick,
  /** 揭晓音效（可传入稀有度增强反馈） */
  reveal,
  
  /**
   * 音频环境解锁（在用户交互时调用一次）
   */
  unlock: unlockAudio,
  /** 设置 BGM 音量（0..1） */
  setBgmVolume,
  /** 播放/启动 BGM（若未创建自动创建） */
  playBgm,
  /** 停止 BGM */
  stopBgm,
  /** 渐变 BGM 音量 */
  fadeBgmTo,
}