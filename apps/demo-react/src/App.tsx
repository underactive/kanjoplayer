import { useEffect, useCallback } from 'react'
import KanjoPlayerDemo from './components/KanjoPlayerDemo'

function App() {
  const handleCustomEvent = useCallback((e: Event) => {
    const detail = (e as CustomEvent).detail
    if (detail.eventKey === 'set_dark_mode') {
      document.documentElement.classList.add('dark-mode')
    } else if (detail.eventKey === 'set_light_mode') {
      document.documentElement.classList.remove('dark-mode')
    }
  }, [])

  useEffect(() => {
    document.addEventListener('kanjo-custom-event', handleCustomEvent)
    return () => {
      document.removeEventListener('kanjo-custom-event', handleCustomEvent)
    }
  }, [handleCustomEvent])

  return (
    <div className="app">
      <header>
        <h1>KanjoPlayer Demo</h1>
        <p className="subtitle">React Implementation</p>
      </header>
      <main>
        <KanjoPlayerDemo />
      </main>
    </div>
  )
}

export default App
