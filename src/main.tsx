import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// 仅在生产环境注册 Service Worker（避免开发阶段的 dev-dist 干扰）
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({
      immediate: true,
      onNeedRefresh() {
        console.log('[PWA] 检测到新版本，刷新后将应用更新')
      },
      onOfflineReady() {
        console.log('[PWA] 应用已就绪，可离线使用')
      },
    })
  }).catch(() => {})
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
