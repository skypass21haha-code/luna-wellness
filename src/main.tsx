import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerNotificationService } from './lib/notifications'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    registerNotificationService()?.catch(() => undefined)
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
