import { useState, useEffect, useCallback } from 'react'
import PasswordGate from './components/PasswordGate'
import Sidebar from './components/Sidebar'
import FloatingChat from './components/FloatingChat'
import Home from './pages/Home'
import Champions from './pages/Champions'
import Methodology from './pages/Methodology'
import Settings from './pages/Settings'
import MeetBuddy from './pages/MeetBuddy'
import { fetchChampions } from './api'

export default function App() {
  const [activeTab, setActiveTab] = useState('home')
  const [selectedChampion, setSelectedChampion] = useState(null)
  const [champions, setChampions] = useState([])
  const [loading, setLoading] = useState(true)

  const loadChampions = useCallback(async () => {
    try {
      const data = await fetchChampions()
      setChampions(data)
    } catch {
      // Fallback handled in pages
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadChampions() }, [loadChampions])

  function handleChampionClick(champion) {
    setSelectedChampion(champion)
    setActiveTab('champions')
  }

  function handleDataChanged() {
    loadChampions()
    if (selectedChampion) {
      // Refresh selected champion detail
      fetchChampions().then(data => {
        const updated = data.find(c => c.id === selectedChampion.id)
        if (updated) setSelectedChampion(updated)
      })
    }
  }

  return (
    <PasswordGate>
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} champions={champions} />
      <main className="flex-1 overflow-hidden">
        {/* Home is always mounted — CSS-hidden when inactive to preserve chat state */}
        <div style={{ display: activeTab === 'home' ? '' : 'none', height: '100%', overflow: 'hidden' }}>
          <Home champions={champions} loading={loading} onChampionClick={handleChampionClick} onDataChanged={handleDataChanged} />
        </div>
        {activeTab === 'champions' && (
          <Champions
            champions={champions}
            selectedChampion={selectedChampion}
            onSelectChampion={setSelectedChampion}
            onDataChanged={handleDataChanged}
          />
        )}
        {activeTab === 'methodology' && <Methodology />}
        {activeTab === 'settings' && <Settings />}
        {activeTab === 'meet-buddy' && <MeetBuddy />}
      </main>
      {activeTab !== 'home' && <FloatingChat onDataChanged={handleDataChanged} />}
    </div>
    </PasswordGate>
  )
}
