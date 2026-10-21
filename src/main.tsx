import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './theme.css'

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const appBase = new URL(import.meta.env.BASE_URL, window.location.href)
  if (appBase.origin === window.location.origin) {
    window.addEventListener('load', () => {
      void navigator.serviceWorker
        .register(new URL('sw.js', appBase), { scope: appBase.pathname })
        .catch(() => undefined)
    }, { once: true })
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
