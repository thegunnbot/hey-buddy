import { useState, useEffect } from 'react'
import { Sparkles, Check, X, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'

export default function PendingTriggers({ onResolved, onChampionClick }) {
  const [pending, setPending] = useState([])
  const [collapsed, setCollapsed] = useState(false)
  const [resolving, setResolving] = useState({}) // id -> 'approved' | 'rejected'

  useEffect(() => {
    fetch('/api/pending-triggers')
      .then(r => r.json())
      .then(setPending)
      .catch(() => {})
  }, [])

  const resolve = async (id, action) => {
    // Show inline feedback before removing
    setResolving(r => ({ ...r, [id]: action }))
    await fetch(`/api/pending-triggers/${id}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    // Brief delay so user sees the confirmation state
    setTimeout(() => {
      setPending(p => p.filter(t => t.id !== id))
      setResolving(r => { const n = { ...r }; delete n[id]; return n })
      if (onResolved) onResolved()
    }, 700)
  }

  if (pending.length === 0) return null

  const confidenceColour = { high: '#59bbb7', medium: '#f59e0b', low: '#848d9a' }

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#e0e0e0', background: '#fff' }}>
      {/* Header */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        style={{ borderBottom: collapsed ? 'none' : '1px solid #e0e0e0' }}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" style={{ color: '#59bbb7' }} />
          <span className="text-sm font-semibold" style={{ color: '#0f1924' }}>Suggested interests</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{ background: '#59bbb7' }}>
            {pending.length}
          </span>
        </div>
        {collapsed
          ? <ChevronDown className="h-4 w-4" style={{ color: '#848d9a' }} />
          : <ChevronUp className="h-4 w-4" style={{ color: '#848d9a' }} />
        }
      </button>

      {!collapsed && (
        <div className="divide-y" style={{ borderColor: '#f0f0f0' }}>
          {pending.map(t => {
            const status = resolving[t.id]
            const isApproved = status === 'approved'
            const isRejected = status === 'rejected'

            return (
              <div
                key={t.id}
                className="px-4 py-3 transition-colors"
                style={{
                  background: isApproved ? 'rgba(89,187,183,0.06)' : isRejected ? 'rgba(0,0,0,0.02)' : 'white',
                  opacity: status ? 0.7 : 1,
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold" style={{ color: '#0f1924' }}>{t.subject_name}</span>
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                        style={{ background: `${confidenceColour[t.confidence]}20`, color: confidenceColour[t.confidence] }}
                      >
                        {t.confidence}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: '#848d9a' }}>
                      {onChampionClick ? (
                        <button
                          onClick={() => onChampionClick(t.champion_id)}
                          className="font-medium hover:underline inline-flex items-center gap-0.5"
                          style={{ color: '#505862' }}
                        >
                          {t.champion_name}
                          <ExternalLink className="h-2.5 w-2.5" />
                        </button>
                      ) : (
                        <span className="font-medium" style={{ color: '#505862' }}>{t.champion_name}</span>
                      )}
                      {' · '}
                      {t.evidence}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {status ? (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-lg" style={{
                        color: isApproved ? '#59bbb7' : '#848d9a',
                        background: isApproved ? 'rgba(89,187,183,0.12)' : '#f0f0f0',
                      }}>
                        {isApproved ? `✓ Added to interests` : `✕ Dismissed`}
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => resolve(t.id, 'approved')}
                          className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors hover:opacity-80"
                          style={{ background: 'rgba(89,187,183,0.15)', color: '#59bbb7' }}
                          title={`Add "${t.subject_name}" to ${t.champion_name}'s interests`}
                        >
                          <Check className="h-3 w-3" /> Add to interests
                        </button>
                        <button
                          onClick={() => resolve(t.id, 'rejected')}
                          className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors hover:opacity-80"
                          style={{ background: '#f0f0f0', color: '#848d9a' }}
                          title="Not relevant — dismiss this suggestion"
                        >
                          <X className="h-3 w-3" /> Not relevant
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
