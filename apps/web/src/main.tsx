import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { Logo } from './components/Logo'
import { AuthProvider } from './context/AuthContext'
import { I18nProvider } from './lib/i18n'
import './index.css'

const portal = import.meta.env.VITE_PORTAL as string | undefined
if (portal && window.location.pathname === '/') {
  window.location.replace(`/${portal}/login`)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <I18nProvider>
        <Suspense
          fallback={
            <div className="grid min-h-screen place-items-center bg-ink-950">
              <Logo />
            </div>
          }
        >
          <App />
        </Suspense>
      </I18nProvider>
    </AuthProvider>
  </StrictMode>,
)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Offline shell is an enhancement; the app still works without it.
    })
  })
}
