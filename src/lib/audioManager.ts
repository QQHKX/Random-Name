import { Howl, Howler } from 'howler'

/**
 * audioManager CSGO风格音效管理器
 * - 使用真实CSGO音频文件提供沉浸式体验
 * - 支持BGM循环播放和各类SFX音效
 * - 暴露 click / tick / reveal / unlock 等音效 API
 */

let ctx: AudioContext | null = null
let masterVolume = 0.6 // 默认音量，可被 setVolume 覆盖（0..1）
let sfxVolume = 0.8 // SFX音量

// BGM 播放器
let bgmHowl: Howl | null = null
let bgmTargetVolume = 0.3

// SFX 音效播放器缓存
let sfxCache: { [key: string]: Howl } = {}

// 音频文件路径配置
const AUDIO_FILES = {
  bgm: {
    main: '/audio/bgm_main_loop.mp3'
  },
  sfx: {
    button_click: '/audio/sfx/ui_button_click.wav',
    item_scroll: '/audio/sfx/item_scroll.wav',
    case_unlock: '/audio/sfx/case_unlock.wav',
    reveal_blue: '/audio/sfx/reveal_blue.wav',
    reveal_purple: '/audio/sfx/reveal_purple.wav',
    reveal_pink: '/audio/sfx/reveal_pink.wav',
    reveal_red: '/audio/sfx/reveal_red.wav',
    reveal_gold_legendary: '/audio/sfx/reveal_gold_legendary.wav'
  }
}

// 缓存状态
let isCacheLoaded = false
let cacheProgress = 0

/**
 * 预加载所有音频文件到缓存
 * @param onProgress 进度回调函数，参数为0-1之间的进度值
 * @returns Promise<boolean> 是否成功加载所有文件
 */
export async function preloadAllAudio(onProgress?: (progress: number) => void): Promise<boolean> {
  if (isCacheLoaded) {
    onProgress?.(1)
    return true
  }

  const allFiles = [
    ...Object.values(AUDIO_FILES.bgm),
    ...Object.values(AUDIO_FILES.sfx)
  ]
  
  let loadedCount = 0
  const totalCount = allFiles.length
  
  // 初始进度
  onProgress?.(0)
  
  const loadPromises = allFiles.map((url, _index) => {
    return new Promise<boolean>((resolve) => {
      console.log(`🎵 开始加载音频: ${url}`)
      const howl = new Howl({
        src: [url],
        preload: true,
        volume: 0, // 静音预加载
        html5: false, // 使用Web Audio API以获得更好的性能
        pool: 3, // 允许同时播放多个实例
        onload: () => {
          console.log(`✅ 音频加载成功: ${url}`)
          loadedCount++
          const progress = loadedCount / totalCount
          cacheProgress = Math.round(progress * 100)
          console.log(`📊 加载进度: ${loadedCount}/${totalCount} (${cacheProgress}%)`)
          onProgress?.(progress)
          
          // 根据文件类型缓存到对应位置
          if (url.includes('/sfx/')) {
            const fileName = url.split('/').pop()?.replace('.wav', '') || ''
            if (fileName) {
              sfxCache[fileName] = howl
            }
          } else if (url.includes('bgm_main_loop')) {
            bgmHowl = howl
            bgmHowl.volume(bgmTargetVolume)
          }
          
          resolve(true)
        },
        onloaderror: (_id, error) => {
          console.error(`❌ 音频加载失败: ${url}`, error)
          loadedCount++
          const progress = loadedCount / totalCount
          cacheProgress = Math.round(progress * 100)
          console.log(`📊 加载进度: ${loadedCount}/${totalCount} (${cacheProgress}%) - 失败`)
          onProgress?.(progress)
          resolve(false)
        }
      })
      
      // 设置超时，避免某些文件卡住整个预加载过程
      setTimeout(() => {
        if (howl.state() !== 'loaded') {
          console.warn(`⏰ 音频文件加载超时: ${url} (状态: ${howl.state()})`)
          loadedCount++
          const progress = loadedCount / totalCount
          cacheProgress = Math.round(progress * 100)
          console.log(`📊 加载进度: ${loadedCount}/${totalCount} (${cacheProgress}%) - 超时`)
          onProgress?.(progress)
          resolve(false)
        }
      }, 10000) // 10秒超时
    })
  })
  
  const results = await Promise.all(loadPromises)
  const successCount = results.filter(Boolean).length
  
  isCacheLoaded = successCount === totalCount
  
  if (isCacheLoaded) {
    console.log('🎵 所有音频文件已成功缓存到内存，缓存已就绪')
    onProgress?.(1)
  } else {
    console.warn(`⚠️ 音频缓存不完整: ${successCount}/${totalCount} 文件加载成功`)
  }
  
  return isCacheLoaded
}

/**
 * 获取缓存状态
 * @returns { loaded: boolean, progress: number }
 */
export function getCacheStatus() {
  return {
    loaded: isCacheLoaded,
    progress: isCacheLoaded ? 100 : cacheProgress
  }
}

/**
 * 清除所有音频缓存
 */
export function clearAudioCache() {
  // 停止并卸载所有SFX
  Object.values(sfxCache).forEach(howl => {
    try {
      howl.stop()
      howl.unload()
    } catch {}
  })
  sfxCache = {}
  
  // 停止并卸载BGM
  if (bgmHowl) {
    try {
      bgmHowl.stop()
      bgmHowl.unload()
    } catch {}
    bgmHowl = null
  }
  
  isCacheLoaded = false
  cacheProgress = 0
  
  console.log('🗑️ 音频缓存已清除')
}

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
 * 获取或创建SFX音效（优先使用预加载缓存）
 * @param name 音效名称
 * @param url 音效文件路径
 */
function getSfx(name: string, url: string): Howl {
  // 优先使用预加载的缓存实例
  if (sfxCache[name]) {
    const cachedSfx = sfxCache[name]
    // 确保音量设置正确
    cachedSfx.volume(sfxVolume * masterVolume)
    return cachedSfx
  }
  
  // 如果缓存中没有，则动态创建（兜底方案）
  console.warn(`音效 ${name} 未在缓存中找到，动态加载中...`)
  sfxCache[name] = new Howl({
    src: [url],
    volume: sfxVolume * masterVolume,
    preload: true,
    html5: false,
    pool: 2
  })
  
  return sfxCache[name]
}

/**
 * 播放SFX音效
 * @param name 音效名称
 * @param url 音效文件路径
 */
function playSfx(name: string, url: string) {
  try {
    const sfx = getSfx(name, url)
    sfx.volume(sfxVolume * masterVolume)
    sfx.play()
  } catch (e) {
    console.warn(`Failed to play SFX: ${name}`, e)
  }
}

/**
 * 播放/启动 BGM（优先使用预加载实例）
 * @param url 可选自定义 BGM 地址（默认 /audio/bgm_main_loop.mp3）
 */
function playBgm(url?: string) {
  try {
    if (!bgmHowl) {
      // 如果BGM未预加载，则动态创建（兜底方案）
      console.warn('BGM未预加载，动态创建中...')
      bgmHowl = new Howl({
        src: [url || '/audio/bgm_main_loop.mp3'],
        loop: true,
        volume: bgmTargetVolume,
        html5: false
      })
    }
    
    // 确保音量设置正确
    bgmHowl.volume(bgmTargetVolume)
    
    if (!bgmHowl.playing()) {
      bgmHowl.play()
    }
  } catch (e) {
    console.warn('BGM 播放失败:', e)
  }
}

/** 停止 BGM */
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
    if (bgmHowl) bgmHowl.fade(bgmHowl.volume(), clamp01(v), ms)
  } catch {}
}

function getCtx(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
  return ctx
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n))
}

/** 设置主音量（0..1） */
function setVolume(v: number) {
  masterVolume = clamp01(v)
  // 更新已缓存的SFX音量
  Object.values(sfxCache).forEach(sfx => {
    sfx.volume(sfxVolume * masterVolume)
  })
}

/**
 * 设置SFX音量（0..1）
 */
function setSfxVolume(v: number) {
  sfxVolume = clamp01(v)
  Object.values(sfxCache).forEach(sfx => {
    sfx.volume(sfxVolume * masterVolume)
  })
}

/**
 * 点击音效：使用CSGO原版按钮点击声
 */
function click() {
  playSfx('button_click', '/audio/sfx/ui_button_click.wav')
}

/**
 * 滚动滴答音效：使用CSGO物品滚动声
 * @param intensity 音效强度 (0-1)，默认为1
 * @param frequency 播放频率控制，默认为1
 */
function tick(intensity: number = 1, frequency: number = 1) {
  // 根据强度调整音量
  const volume = Math.max(0, Math.min(1, intensity)) * sfxVolume
  
  // 简单的频率控制：可以根据需要扩展
  if (Math.random() < frequency) {
    const howl = getSfx('item_scroll', '/audio/sfx/item_scroll.wav')
    howl.volume(volume)
    howl.play()
  }
}

/**
 * 开箱解锁音效：使用CSGO开箱解锁声
 */
/**
 * 开锁音效：已禁用
 */
function unlock() {
  // 开锁音效已被禁用
  // playSfx('case_unlock', '/audio/sfx/case_unlock.wav')
}

/**
 * 揭晓音效：根据稀有度播放不同的CSGO音效
 * @param rarity 稀有度等级
 */
function reveal(rarity?: 'blue' | 'purple' | 'pink' | 'red' | 'gold') {
  const rarityMap = {
    blue: '/audio/sfx/reveal_blue.wav',
    purple: '/audio/sfx/reveal_purple.wav', 
    pink: '/audio/sfx/reveal_pink.wav',
    red: '/audio/sfx/reveal_red.wav',
    gold: '/audio/sfx/reveal_gold_legendary.wav'
  }
  
  const audioFile = rarityMap[rarity || 'blue']
  playSfx(`reveal_${rarity || 'blue'}`, audioFile)
}

export const sfx = {
  /** 设置 SFX 主音量（0..1） */
  setVolume,
  /** 设置 SFX 音量（0..1） */
  setSfxVolume,
  /** 点击音效 */
  click,
  /** 滴答音效（滚动阶段） */
  tick,
  /** 开箱解锁音效 */
  unlock,
  /** 揭晓音效（可传入稀有度增强反馈） */
  reveal,
  
  /**
   * 音频环境解锁（在用户交互时调用一次）
   */
  unlockAudio,
  /** 设置 BGM 音量（0..1） */
  setBgmVolume,
  /** 播放/启动 BGM（若未创建自动创建） */
  playBgm,
  /** 停止 BGM */
  stopBgm,
  /** 渐变 BGM 音量 */
  fadeBgmTo,
  /** 预加载所有音频文件 */
  preloadAllAudio,
  /** 获取缓存状态 */
  getCacheStatus,
  /** 清除音频缓存 */
  clearAudioCache,
}