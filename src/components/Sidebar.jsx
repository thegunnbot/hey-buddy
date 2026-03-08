import clsx from 'clsx'
import { LayoutDashboard, Users, BookOpen, Settings, Info } from 'lucide-react'

const nav = [
  { id: 'home', label: 'Home', icon: LayoutDashboard },
  { id: 'champions', label: 'Champions', icon: Users },
  { id: 'methodology', label: 'Methodology', icon: BookOpen },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export default function Sidebar({ activeTab, onTabChange, champions = [] }) {
  const overdueCount = champions.filter(c => c.health === 'red').length
  const actionCount = champions.filter(c => c.health !== 'green').length

  return (
    <div className="flex h-screen w-56 flex-col shrink-0" style={{ background: '#0f1924' }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5" style={{ borderBottom: '1px solid #1c2c3b' }}>
        <img src="/hx-logo.jpg" alt="hx" className="h-10 w-10 rounded-lg" />
        <p className="text-sm font-semibold" style={{ color: '#59bbb7' }}>Hey Buddy</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={clsx(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
              activeTab === id
                ? 'text-white'
                : 'text-gray-400 hover:text-white'
            )}
            style={activeTab === id ? { background: '#1c2c3b', color: '#59bbb7' } : {}}
          >
            <Icon className="h-4 w-4 shrink-0" style={activeTab === id ? { color: '#59bbb7' } : {}} />
            {label}
            {id === 'home' && actionCount > 0 && (
              <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
                style={{ background: '#59bbb7', color: '#0f1924' }}>
                {actionCount}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Meet Buddy — subtle bottom link */}
      <div className="px-3 pb-1">
        <button
          onClick={() => onTabChange('meet-buddy')}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 transition-all"
          style={{
            color: activeTab === 'meet-buddy' ? '#59bbb7' : '#4a5568',
            background: activeTab === 'meet-buddy' ? '#1c2c3b' : 'transparent',
            fontSize: '0.75rem',
          }}
        >
          <Info className="h-3.5 w-3.5 shrink-0" />
          Meet Buddy
        </button>
      </div>

      {/* Stats */}
      <div className="px-5 py-4 space-y-2" style={{ borderTop: '1px solid #1c2c3b' }}>
        <div className="flex items-center justify-between text-xs">
          <span style={{ color: '#848d9a' }}>Champions</span>
          <span className="font-medium text-white">{champions.length} active</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span style={{ color: '#848d9a' }}>Need attention</span>
          <span className="font-medium" style={{ color: overdueCount > 0 ? '#ee6c5b' : actionCount > 0 ? '#59bbb7' : '#848d9a' }}>
            {overdueCount > 0 ? `${overdueCount} overdue` : actionCount > 0 ? `${actionCount} due soon` : 'All on track'}
          </span>
        </div>
      </div>
    </div>
  )
}
