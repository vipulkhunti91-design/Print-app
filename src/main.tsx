import React, { Component, type ReactNode } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './theme.css'

class RootErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App uncaught error:', error, errorInfo)
  }

  handleReset = () => {
    localStorage.clear()
    sessionStorage.clear()
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            backgroundColor: '#0A0A0A',
            color: '#F2F3F7',
            fontFamily: 'Inter, sans-serif',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              padding: '28px 24px',
              maxWidth: 380,
              borderRadius: 16,
              background: '#171717',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 10px', color: '#F87171' }}>
              Something went wrong
            </h1>
            <p style={{ fontSize: 13, color: '#A3A9B8', margin: '0 0 18px', lineHeight: 1.45 }}>
              {this.state.error?.message || 'An unexpected rendering error occurred.'}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{
                  padding: '10px 18px',
                  borderRadius: 12,
                  background: '#F4D779',
                  color: '#1A1405',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Reload
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  padding: '10px 16px',
                  borderRadius: 12,
                  background: 'transparent',
                  color: '#A3A9B8',
                  border: '1px solid rgba(255,255,255,0.15)',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Clear Data &amp; Reset
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

if ('serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    // In dev mode, unregister any active service worker and clear cache to prevent stale scripts
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister()
      }
    })
    if ('caches' in window) {
      caches.keys().then((names) => {
        for (const name of names) {
          caches.delete(name)
        }
      })
    }
  } else {
    const appBase = new URL(import.meta.env.BASE_URL, window.location.href)
    if (appBase.origin === window.location.origin) {
      window.addEventListener('load', () => {
        void navigator.serviceWorker
          .register(new URL('sw.js', appBase), { scope: appBase.pathname })
          .catch(() => undefined)
      }, { once: true })
    }
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>,
)
