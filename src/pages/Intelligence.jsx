import { useState, useEffect, useCallback, useRef } from 'react'
import { Zap, Building2, Newspaper, Target, RefreshCw, X, ExternalLink, ChevronDown, ChevronUp, CheckCircle, Eye, Ban } from 'lucide-react'
import clsx from 'clsx'

const SECTION_CONFIG = {
  interest: { icon: Target, label: 'Interest', colour: 'bg-violet-50 text-violet-600 border-violet-200' },
  company:  { icon: Building2, label: 'Company news', colour: 'bg-blue-50 text-blue-600 border-blue-200' },
  press:    { icon: Newspaper, label: 'Press mention', colour: 'bg-amber-50 text-amber-700 border-amber-200' },
}

function timeAgo(dateStr) {
  try {
    const diff = Date.now() - new Date(dateStr).getTime()
    const h = Math.round(diff / 3600000)
    if (h < 1) return 'just now'
    if (h < 24) return `${h}h ago`
    return `${Math.round(h / 24)}d ago`
  } catch { return '' }
}

function groupByChampionAndDate(items) {
  // Group: { date -> { champion_id -> { name, items[] } } }
  const byDate = {}
  for (const item of items) {
    const date = item.scanned_at?.slice(0, 10) || 'Unknown'
    if (!byDate[date]) byDate[date] = {}
    if (!byDate[date][item.champion_id]) {
      byDate[date][item.champion_id] = { name: item.champion_name, id: item.champion_id, items: [] }
    }
    byDate[date][item.champion_id].items.push(item)
  }
  // Sort dates descending
  return Object.entries(byDate).sort(([a], [b]) => b.localeCompare(a))
}

function formatDate(dateStr) {
  try {
    const d = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    if (d.toDateString() === today.toDateString()) return 'Today'
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  } catch { return dateStr }
}

function DismissPopover({ onDismiss, onClose }) {
  const [reason, setReason] = useState(null)
  const [note, setNote] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  const options = [
    { id: 'acted', icon: CheckCircle, label: 'Acted on it', colour: 'text-emerald-600' },
    { id: 'saw', icon: Eye, label: 'Already saw it', colour: 'text-blue-600' },
    { id: 'not_relevant', icon: Ban, label: 'Not relevant', colour: 'text-red-500' },
  ]

  function submit(r) {
    if (r === 'not_relevant' && !note.trim()) return // require note before submit
    onDismiss(r, r === 'not_relevant' ? note.trim() : null)
  }

  return (
    <div ref={ref} className="absolute right-0 top-7 z-50 w-56 bg-white rounded-xl shadow-xl border border-gray-200 p-2">
      {!reason ? (
        <div className="space-y-0.5">
          {options.map(({ id, icon: Icon, label, colour }) => (
            <button
              key={id}
              onClick={() => id === 'not_relevant' ? setReason(id) : submit(id)}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors text-left"
            >
              <Icon className={clsx('h-3.5 w-3.5 shrink-0', colour)} />
              <span className="text-gray-700">{label}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-2 p-1">
          <p className="text-xs font-medium text-gray-600">Why isn't it relevant? <span className="text-gray-400">(optional)</span></p>
          <textarea
            autoFocus
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="e.g. wrong company, too generic, old news…"
            className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-hx-teal/30"
            rows={3}
          />
          <div className="flex gap-1.5">
            <button onClick={() => submit('not_relevant')}
              className="flex-1 text-xs py-1.5 rounded-lg font-medium text-white bg-red-500 hover:bg-red-600 transition-colors">
              Dismiss
            </button>
            <button onClick={() => setReason(null)}
              className="px-3 text-xs py-1.5 rounded-lg text-gray-500 border border-gray-200 hover:bg-gray-50">
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Intelligence({ onChampionClick }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [showDismissed, setShowDismissed] = useState(false)
  const [collapsedDates, setCollapsedDates] = useState({})
  const [openPopover, setOpenPopover] = useState(null) // item id

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/intelligence${showDismissed ? '?dismissed=true' : ''}`)
      setItems(await res.json())
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [showDismissed])

  useEffect(() => { load() }, [load])

  async function dismiss(id, reason, note) {
    setItems(prev => prev.filter(i => i.id !== id))
    setOpenPopover(null)
    await fetch(`/api/intelligence/${id}/dismiss`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, note }),
    })
  }

  async function runScan() {
    setScanning(true)
    try {
      await fetch('/api/intelligence/run-scan', { method: 'POST' })
      await load()
    } catch (e) { console.error(e) }
    finally { setScanning(false) }
  }

  const grouped = groupByChampionAndDate(items)

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-gray-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg" style={{ background: '#0f1924' }}>
            <Zap className="h-4 w-4" style={{ color: '#59bbb7' }} />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900">Intelligence</h1>
            <p className="text-xs text-gray-400">{items.length} item{items.length !== 1 ? 's' : ''} · scans weekdays 7:30am</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDismissed(v => !v)}
            className={clsx(
              'text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors',
              showDismissed ? 'bg-gray-100 text-gray-600 border-gray-300' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
            )}
          >
            {showDismissed ? 'Hide dismissed' : 'Show dismissed'}
          </button>
          <button
            onClick={runScan}
            disabled={scanning}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium text-white transition-colors disabled:opacity-50"
            style={{ background: '#0f1924' }}
          >
            <RefreshCw className={clsx('h-3 w-3', scanning && 'animate-spin')} />
            {scanning ? 'Scanning…' : 'Scan now'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto px-6 py-4 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-sm text-gray-400">Loading…</div>
        ) : grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-center">
            <Zap className="h-8 w-8 text-gray-200" />
            <p className="text-sm text-gray-400">No intelligence yet.</p>
            <p className="text-xs text-gray-300">Hit "Scan now" or wait for the 7:30am weekday scan.</p>
          </div>
        ) : grouped.map(([date, champMap]) => {
          const collapsed = collapsedDates[date]
          const toggle = () => setCollapsedDates(prev => ({ ...prev, [date]: !prev[date] }))
          const champEntries = Object.values(champMap)
          const totalItems = champEntries.reduce((n, c) => n + c.items.length, 0)

          return (
            <div key={date}>
              {/* Date header */}
              <button
                onClick={toggle}
                className="flex items-center gap-2 mb-3 w-full text-left group"
              >
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {formatDate(date)}
                </span>
                <span className="text-xs text-gray-300">{totalItems} item{totalItems !== 1 ? 's' : ''}</span>
                <div className="flex-1 h-px bg-gray-200" />
                {collapsed
                  ? <ChevronDown className="h-3 w-3 text-gray-300 group-hover:text-gray-500" />
                  : <ChevronUp className="h-3 w-3 text-gray-300 group-hover:text-gray-500" />
                }
              </button>

              {!collapsed && (
                <div className="space-y-3">
                  {champEntries.map(champ => (
                    <div key={champ.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      {/* Champion header */}
                      <button
                        onClick={() => onChampionClick && onChampionClick(champ.id)}
                        className="flex items-center gap-2 px-4 py-3 w-full text-left hover:bg-gray-50 transition-colors border-b border-gray-100"
                      >
                        <span className="text-sm font-semibold text-gray-900">{champ.name}</span>
                        <span className="text-xs text-gray-400">{champ.items.length} item{champ.items.length !== 1 ? 's' : ''}</span>
                      </button>

                      {/* Items */}
                      <div className="divide-y divide-gray-50">
                        {champ.items.map(item => {
                          const cfg = SECTION_CONFIG[item.section] || SECTION_CONFIG.press
                          const Icon = cfg.icon
                          return (
                            <div key={item.id} className="flex items-start gap-3 px-4 py-3 group">
                              <div className="shrink-0 mt-0.5">
                                <span className={clsx('inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border', cfg.colour)}>
                                  <Icon className="h-2.5 w-2.5" />
                                  {item.label}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <a
                                  href={item.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-gray-800 hover:text-hx-teal font-medium leading-snug flex items-start gap-1 group/link"
                                >
                                  <span className="flex-1">{item.title}</span>
                                  <ExternalLink className="h-3 w-3 shrink-0 mt-0.5 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                                </a>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {item.source && <span className="text-xs text-gray-400">{item.source}</span>}
                                  {item.pub_date && <span className="text-xs text-gray-300">{timeAgo(item.pub_date)}</span>}
                                </div>
                              </div>
                              <div className="relative shrink-0">
                                <button
                                  onClick={() => setOpenPopover(openPopover === item.id ? null : item.id)}
                                  className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-100 text-gray-300 hover:text-gray-500 transition-all"
                                  title="Dismiss"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                                {openPopover === item.id && (
                                  <DismissPopover
                                    onDismiss={(reason, note) => dismiss(item.id, reason, note)}
                                    onClose={() => setOpenPopover(null)}
                                  />
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
