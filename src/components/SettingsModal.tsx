import React, { useEffect, useState } from 'react'
import { useAppStore } from '../store/appStore'
import type { Speed } from '../store/appStore'
import * as XLSX from 'xlsx'
import { sfx } from '../lib/audioManager'

export interface SettingsModalProps {
  /** 是否显示弹窗 */
  open: boolean
  /** 关闭弹窗回调 */
  onClose: () => void
}

/**
 * SettingsModal 设置面板
 * - 对接全局 store：班级名 / 不重复模式 / 速度 / 音量
 * - 表单受控，提交时写回 store
 */
export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { settings, setClassName, toggleNoRepeat, setSpeed, setVolumes, importFromText, resetPool, roster } = useAppStore()
  const replaceRosterFromText = useAppStore((s) => s.replaceRosterFromText)
  const clearHistory = useAppStore((s) => s.clearHistory)
  const historyCount = useAppStore((s) => s.history.length)
  // 本地受控状态，避免直接影响全局设置（提交时写回）
  const [className, setClassNameLocal] = useState(settings.className)
  const [noRepeat, setNoRepeatLocal] = useState(settings.noRepeat)
  const [speed, setSpeedLocal] = useState<Speed>(settings.speed)
  const [volume, setVolumeLocal] = useState(settings.sfxVolume)
  const [bgmVolume, setBgmVolumeLocal] = useState(settings.bgmVolume)
  
  // 手动导入相关状态
  const [showManualImport, setShowManualImport] = useState(false)
  const [manualText, setManualText] = useState('')
  
  // 音频缓存相关状态
  const [cacheStatus, setCacheStatus] = useState({ loaded: false, progress: 0 })
  const [isCaching, setIsCaching] = useState(false)

  // 弹窗开启时，同步最新设置到本地表单
  useEffect(() => {
    if (open) {
      setClassNameLocal(settings.className)
      setNoRepeatLocal(settings.noRepeat)
      setSpeedLocal(settings.speed)
      setVolumeLocal(settings.sfxVolume)
      setBgmVolumeLocal(settings.bgmVolume)
      // 更新缓存状态
      setCacheStatus(sfx.getCacheStatus())
    }
  }, [open, settings])

  /** 提交设置（写回 store，并关闭弹窗） */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sfx.click()
    setClassName(className.trim())
    toggleNoRepeat(noRepeat)
    setSpeed(speed)
    // 同步写回 BGM 与 SFX 音量
    setVolumes(bgmVolume, volume)
    onClose()
  }

  /**
   * 从 public 目录导入示例名单
   * - 首选 MD.csv（支持单列或含 name/姓名 表头）
   * - 失败则回退到 MD.xlsx
   * - 导入成功后重置抽取池
   */
  const handleImportDemo = async () => {
    try {
      // 若已存在名单，提示覆盖确认
      if (roster.length > 0) {
        const ok = confirm('当前已有名单，确定要覆盖为示例名单吗？')
        if (!ok) return
      }
      let importedCount = 0
      // 尝试 CSV
      try {
        const respCsv = await fetch('/MD.csv')
        if (respCsv.ok) {
          const txt = await respCsv.text()
          const wb = XLSX.read(txt, { type: 'string' })
          const first = wb.SheetNames[0]
          const ws = wb.Sheets[first]
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][]
          const names = rows
            .map((r) => String(r?.[0] ?? '').trim())
            .filter((n) => n && n.toLowerCase() !== 'name' && n !== '姓名')
          if (names.length > 0) {
            importedCount = importFromText(names.join('\n'))
          }
        }
      } catch {}

      // 回退到 XLSX
      if (importedCount === 0) {
        const resp = await fetch('/MD.xlsx')
        if (resp.ok) {
          const arrayBuf = await resp.arrayBuffer()
          const wb = XLSX.read(arrayBuf, { type: 'array' })
          const first = wb.SheetNames[0]
          const ws = wb.Sheets[first]
          const json: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' })
          const names: string[] = []
          json.forEach((row) => {
            if (row.name && typeof row.name === 'string') names.push(String(row.name).trim())
            else {
              const firstKey = Object.keys(row)[0]
              if (firstKey) names.push(String(row[firstKey]).trim())
            }
          })
          const text = names.filter(Boolean).join('\n')
          importedCount = importFromText(text)
        }
      }

      if (importedCount > 0) {
        resetPool()
        alert(`已导入示例名单：${importedCount} 人`)
      } else {
        alert('未能解析到姓名，请检查 public/MD.csv 或 MD.xlsx 文件内容。')
      }
    } catch (e) {
      console.warn('导入示例名单失败：', e)
      alert('导入失败，请查看控制台日志。')
    }
  }

  /**
   * 强制重新读取 public/MD.csv（跳过缓存）并覆盖当前名单
   * - 使用 cache: 'no-store' + 时间戳避免缓存
   * - 解析单列或含 name/姓名 表头
   * - 成功后重置抽取池
   */
  const handleReloadRoster = async () => {
    try {
      const ok = confirm('将覆盖当前名单，是否继续？')
      if (!ok) return
      const url = `/MD.csv?ts=${Date.now()}`
      const resp = await fetch(url, { cache: 'no-store' })
      if (!resp.ok) throw new Error(`Fetch failed: ${resp.status}`)
      const txt = await resp.text()
      const wb = XLSX.read(txt, { type: 'string' })
      const first = wb.SheetNames[0]
      const ws = wb.Sheets[first]
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][]
      const names = rows
        .map((r) => String(r?.[0] ?? '').trim())
        .filter((n) => n && n.toLowerCase() !== 'name' && n !== '姓名')
      const text = names.join('\n')
      const cnt = replaceRosterFromText(text)
      if (cnt > 0) {
        resetPool()
        alert(`已重新加载名单：${cnt} 人`)
      } else {
        alert('CSV 解析为空，请检查文件内容。')
      }
    } catch (e) {
      console.warn('重新读取 CSV 失败：', e)
      alert('重新读取失败，请检查控制台与文件是否位于 public/MD.csv')
    }
  }

  /**
   * 处理文件上传导入（CSV/XLSX）
   * - 支持 CSV 和 XLSX 格式
   * - 自动解析第一列或 name/姓名 字段
   * - 导入成功后重置抽取池
   */
  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      // 检查文件类型
      const isCSV = file.name.toLowerCase().endsWith('.csv')
      const isXLSX = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')
      
      if (!isCSV && !isXLSX) {
        alert('请选择 CSV 或 XLSX 格式的文件')
        return
      }

      // 确认覆盖
      if (roster.length > 0) {
        const ok = confirm('当前已有名单，确定要覆盖吗？')
        if (!ok) return
      }

      let names: string[] = []

      if (isCSV) {
        // 处理 CSV 文件
        const text = await file.text()
        const wb = XLSX.read(text, { type: 'string' })
        const first = wb.SheetNames[0]
        const ws = wb.Sheets[first]
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][]
        names = rows
          .map((r) => String(r?.[0] ?? '').trim())
          .filter((n) => n && n.toLowerCase() !== 'name' && n !== '姓名')
      } else {
        // 处理 XLSX 文件
        const arrayBuf = await file.arrayBuffer()
        const wb = XLSX.read(arrayBuf, { type: 'array' })
        const first = wb.SheetNames[0]
        const ws = wb.Sheets[first]
        const json: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' })
        json.forEach((row) => {
          if (row.name && typeof row.name === 'string') {
            names.push(String(row.name).trim())
          } else if (row['姓名'] && typeof row['姓名'] === 'string') {
            names.push(String(row['姓名']).trim())
          } else {
            const firstKey = Object.keys(row)[0]
            if (firstKey) names.push(String(row[firstKey]).trim())
          }
        })
        names = names.filter(Boolean)
      }

      if (names.length > 0) {
        const cnt = replaceRosterFromText(names.join('\n'))
        if (cnt > 0) {
          resetPool()
          alert(`已导入名单：${cnt} 人`)
        }
      } else {
        alert('未能解析到有效姓名，请检查文件格式')
      }
    } catch (e) {
      console.warn('文件导入失败：', e)
      alert('文件导入失败，请检查文件格式')
    }

    // 清空文件输入
    event.target.value = ''
  }

  /**
   * 处理手动文本导入
   * - 支持每行一个姓名的格式
   * - 自动过滤空行和重复项
   * - 导入成功后重置抽取池
   */
  const handleManualImport = () => {
    if (!manualText.trim()) {
      alert('请输入名单内容')
      return
    }

    // 确认覆盖
    if (roster.length > 0) {
      const ok = confirm('当前已有名单，确定要覆盖吗？')
      if (!ok) return
    }

    try {
      const cnt = replaceRosterFromText(manualText.trim())
      if (cnt > 0) {
        resetPool()
        alert(`已导入名单：${cnt} 人`)
        setManualText('')
        setShowManualImport(false)
      } else {
        alert('未能解析到有效姓名')
      }
    } catch (e) {
      console.warn('手动导入失败：', e)
      alert('导入失败，请检查输入格式')
    }
  }

  /**
   * 一键缓存所有音频文件
   * - 预加载BGM和所有SFX音效到内存
   * - 显示加载进度
   * - 永不过期，直到页面刷新或手动清除
   */
  const handleCacheAllAudio = async () => {
    if (isCaching) return
    
    setIsCaching(true)
    setCacheStatus({ loaded: false, progress: 0 })
    
    try {
      // 先解锁音频环境
      await sfx.unlockAudio()
      
      // 开始预加载
      const success = await sfx.preloadAllAudio((progress) => {
        setCacheStatus({ loaded: false, progress })
      })
      
      if (success) {
        setCacheStatus({ loaded: true, progress: 100 })
        alert('🎵 所有音频文件已成功缓存到内存！\n\n缓存将保持到页面刷新，避免重复加载。')
      } else {
        alert('⚠️ 部分音频文件缓存失败，请检查网络连接或音频文件是否存在。')
      }
    } catch (error) {
      console.error('音频缓存失败：', error)
      alert('❌ 音频缓存失败，请查看控制台了解详情。')
    } finally {
      setIsCaching(false)
    }
  }

  /**
   * 清除音频缓存
   * - 释放内存中的所有音频文件
   * - 重置缓存状态
   */
  const handleClearCache = () => {
    const ok = confirm('确定要清除所有音频缓存吗？\n\n清除后需要重新缓存才能避免重复加载。')
    if (!ok) return
    
    sfx.clearAudioCache()
    setCacheStatus({ loaded: false, progress: 0 })
    alert('🗑️ 音频缓存已清除')
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-[min(560px,95vw)] max-h-[90vh] rounded-xl border border-white/10 bg-[var(--csgo-panel)] shadow-2xl text-white overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 pb-4 flex-shrink-0">
          <h2 className="text-xl font-semibold">设置</h2>
          <button onClick={onClose} className="text-white/70 hover:text-white">✕</button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-6">
            <form id="settings-form" onSubmit={handleSubmit} className="space-y-5 pb-6">
          {/* 班级名 */}
          <div>
            <label className="block mb-2 text-sm opacity-80">班级名</label>
            <input
              value={className}
              onChange={(e) => setClassNameLocal(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 outline-none focus:ring-2 focus:ring-[var(--csgo-blue)] transition-colors"
              placeholder="例如：高一(3)班"
            />
          </div>

          {/* 不重复模式 */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm mb-1">不重复模式</div>
              <div className="text-xs opacity-60">抽中过的学生将临时移出抽取池，全部抽完后自动重置</div>
            </div>
            <label className="inline-flex items-center gap-2 select-none cursor-pointer">
              <input
                type="checkbox"
                checked={noRepeat}
                onChange={(e) => setNoRepeatLocal(e.target.checked)}
                className="accent-sky-500 w-4 h-4"
              />
              <span className="text-sm">启用</span>
            </label>
          </div>

          {/* 动画速度 */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm mb-1">动画速度</div>
              <div className="text-xs opacity-60">影响“开箱”滚动与揭晓的整体时长</div>
            </div>
            <select
              value={speed}
              onChange={(e) => setSpeedLocal(e.target.value as Speed)}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10"
            >
              <option value="slow">慢速</option>
              <option value="normal">标准</option>
              <option value="fast">快速</option>
            </select>
          </div>

          {/* 音量设置 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="text-sm">音量（SFX）</div>
              <div className="text-xs opacity-60">当前：{Math.round(volume * 100)}%</div>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolumeLocal(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          {/* 音量设置（BGM） */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <div className="text-sm">背景音乐（BGM）</div>
              <div className="text-xs opacity-60">当前：{Math.round(bgmVolume * 100)}%</div>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={bgmVolume}
              onChange={(e) => setBgmVolumeLocal(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          {/* 名单管理 */}
          <div className="pt-4 border-t border-white/10">
            <div className="text-sm font-medium mb-3">名单管理</div>
            
            {/* 预设导入按钮 */}
            <div className="flex items-center gap-3 flex-wrap mb-3">
              <button type="button" className="px-3 py-2 rounded-lg bg-[var(--csgo-blue)] hover:bg-sky-500 border border-sky-300/30 text-sm font-medium transition-colors" onClick={() => { sfx.click(); handleImportDemo(); }}>
                导入示例名单 (MD.csv/MD.xlsx)
              </button>
              <button type="button" className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 border border-amber-300/30 text-sm font-medium transition-colors" onClick={() => { sfx.click(); handleReloadRoster(); }} title="强制重新载入 public/MD.csv">
                重新读取 MD.csv（跳过缓存）
              </button>
            </div>
            
            {/* 手动导入区域 */}
            <div className="border border-white/10 rounded-lg p-3 bg-white/5">
              <div className="text-sm font-medium mb-2">手动导入名单</div>
              
              {/* 文件上传 */}
              <div className="mb-3">
                <label className="block text-xs opacity-80 mb-1">上传文件（CSV/XLSX）</label>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileImport}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 outline-none focus:ring-2 focus:ring-[var(--csgo-blue)] transition-colors text-sm text-white/70 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-sky-600 file:text-white hover:file:bg-sky-500 file:cursor-pointer"
                />
              </div>
              
              {/* 手动输入切换 */}
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => { sfx.click(); setShowManualImport(!showManualImport); }}
                  className="px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 border border-white/10 text-xs font-medium transition-colors"
                >
                  {showManualImport ? '收起' : '展开'}手动输入
                </button>
              </div>
              
              {/* 手动输入区域 */}
              {showManualImport && (
                <div className="space-y-2">
                  <label className="block text-xs opacity-80">手动输入名单（每行一个姓名）</label>
                  <textarea
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    placeholder="张三\n李四\n王五\n..."
                    className="w-full h-24 px-3 py-2 rounded-lg bg-white/5 border border-white/10 outline-none focus:ring-2 focus:ring-[var(--csgo-blue)] transition-colors text-sm resize-none"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleManualImport}
                      className="px-3 py-1.5 rounded-lg bg-[var(--csgo-blue)] hover:bg-sky-500 border border-sky-300/30 text-xs font-medium transition-colors"
                    >
                      导入
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setManualText('')
                        setShowManualImport(false)
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="text-xs opacity-60 mt-2">提示：导入/重载将覆盖当前名单，并自动重置抽取池。支持CSV、XLSX文件或手动输入。</div>
          </div>

          {/* 音频缓存管理 */}
          <div className="pt-4 border-t border-white/10">
            <div className="text-sm font-medium mb-3">音频缓存管理</div>
            
            {/* 缓存状态显示 */}
            <div className="mb-3 p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">缓存状态</span>
                <span className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
                  cacheStatus.loaded 
                    ? 'bg-green-600/20 text-green-400 border border-green-500/30' 
                    : isCaching
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'bg-gray-600/20 text-gray-400 border border-gray-500/30'
                }`}>
                  {cacheStatus.loaded ? (
                    <>
                      <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                      已缓存
                    </>
                  ) : isCaching ? (
                    <>
                      <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                      加载中
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                      未缓存
                    </>
                  )}
                </span>
              </div>
              
              {/* 进度条 */}
              {(isCaching || cacheStatus.progress > 0) && (
                <div className="mb-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span>加载进度</span>
                    <span>{cacheStatus.progress}%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        cacheStatus.loaded ? 'bg-green-500' : 'bg-[var(--csgo-blue)]'
                      }`}
                      style={{ width: `${cacheStatus.progress}%` }}
                    />
                  </div>
                </div>
              )}
              
              {/* 预加载提示 */}
              {isCaching && (
                <div className="mb-2 text-xs text-blue-400 flex items-center gap-1">
                  <span className="animate-spin">⟳</span>
                  正在预加载音频文件，请稍候...
                </div>
              )}
              
              <div className="text-xs opacity-60">
                {cacheStatus.loaded 
                  ? '所有音频文件已缓存到内存，播放时无需重复加载' 
                  : '音频文件将在首次播放时加载，可能造成延迟'}
              </div>
            </div>
            
            {/* 缓存操作按钮 */}
            <div className="flex items-center gap-3 flex-wrap">
              <button 
                type="button" 
                onClick={() => { sfx.click(); handleCacheAllAudio(); }}
                disabled={isCaching || cacheStatus.loaded}
                className="px-4 py-2 rounded-lg bg-[var(--csgo-blue)] hover:bg-sky-500 border border-sky-300/30 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCaching ? '缓存中...' : '一键缓存所有音频'}
              </button>
              
              {cacheStatus.loaded && (
                <button 
                  type="button" 
                  onClick={() => { sfx.click(); handleClearCache(); }}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 border border-red-300/30 text-sm font-medium transition-colors"
                >
                  清除缓存
                </button>
              )}
            </div>
            
            <div className="text-xs opacity-60 mt-2">
              提示：缓存将保持到页面刷新，建议在使用前先缓存以获得最佳体验。包含BGM和所有音效文件。
            </div>
          </div>

            </form>
        </div>
        
        {/* 历史记录管理 */}
        <div className="px-6 pb-2 w-full">
          <div className="flex items-center justify-between">
            <div className="text-sm opacity-75">历史记录：{historyCount} 条</div>
            <button
              type="button"
              onClick={() => {
                sfx.click()
                if (historyCount === 0) return
                if (confirm(`确定删除全部 ${historyCount} 条抽奖记录？该操作不可恢复。`)) {
                  clearHistory()
                }
              }}
              disabled={historyCount === 0}
              className="px-3 py-2 rounded-md bg-red-600 hover:bg-red-500 border border-red-300/30 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="清空抽奖记录"
            >
              清空抽奖记录
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 pt-4 border-t border-white/10 flex-shrink-0">
          <button type="button" onClick={() => { sfx.click(); onClose(); }} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium transition-colors">
            取消
          </button>
          <button type="submit" form="settings-form" className="px-4 py-2 rounded-lg bg-[var(--csgo-blue)] hover:bg-sky-500 border border-sky-300/30 text-sm font-semibold transition-colors shadow-lg">
            保存设置
          </button>
        </div>
      </div>
    </div>
  )
}