import { AlertCircle, Clock, Zap, Trophy, MessageSquare, Copy, Loader2, Mail } from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'
import StageTag from '../components/StageTag'
import HealthDot from '../components/HealthDot'
import Avatar from '../components/Avatar'
import ChatInterface from '../components/ChatInterface'
import PendingTriggers from '../components/PendingTriggers'
import HealthScore from '../components/HealthScore'

const actionTypeConfig = {
  overdue:    { icon: AlertCircle, color: '#ee6c5b', bg: 'rgba(238,108,91,0.08)',  border: 'rgba(238,108,91,0.25)' },
  trigger:    { icon: Zap,         color: '#59bbb7', bg: 'rgba(89,187,183,0.08)',  border: 'rgba(89,187,183,0.25)' },
  approaching:{ icon: Clock,       color: '#f5a623', bg: 'rgba(245,166,35,0.08)',  border: 'rgba(245,166,35,0.25)' },
  sports:     { icon: Trophy,      color: '#49deff', bg: 'rgba(73,222,255,0.08)',  border: 'rgba(73,222,255,0.25)' },
  custom:     { icon: Zap,         color: '#4e70f8', bg: 'rgba(78,112,248,0.08)',  border: 'rgba(78,112,248,0.25)' },
}

const stageColours = {
  identified: { border: '#28323f', header: 'rgba(132,141,154,0.1)' },
  building:   { border: 'rgba(89,187,183,0.4)',  header: 'rgba(89,187,183,0.08)' },
  test:       { border: 'rgba(238,108,91,0.4)',  header: 'rgba(238,108,91,0.08)' },
  leverage:   { border: 'rgba(73,222,255,0.4)',  header: 'rgba(73,222,255,0.08)' },
  nurture:    { border: 'rgba(78,112,248,0.4)',  header: 'rgba(78,112,248,0.08)' },
}

const stages = ['identified', 'building', 'test', 'leverage']

function buildActions(champions) {
  const actions = []
  const today = new Date()
  for (const c of champions) {
    if (!c.last_contact_date) continue
    const daysSince = Math.floor((today - new Date(c.last_contact_date)) / 86400000)
    const cadence = c.deal_status === 'post-sfo' ? 14 : 30
    if (daysSince >= cadence) {
      actions.push({ id: `overdue-${c.id}`, type: 'overdue', priority: 1, champion: c,
        description: `${daysSince} days since last contact — overdue on ${cadence}-day cadence`,
        suggestedAction: 'Reach out to stay on track', suggestedMessage: null })
    } else if (daysSince >= cadence - 5) {
      actions.push({ id: `approaching-${c.id}`, type: 'approaching', priority: 2, champion: c,
        description: `${daysSince} days since last contact — due within ${cadence - daysSince} days`,
        suggestedAction: 'Plan your next touchpoint', suggestedMessage: null })
    }
    for (const t of (c.triggers || [])) {
      if (t.status === 'pending') {
        actions.push({ id: `trigger-${t.id}`, type: t.trigger_type === 'sports' ? 'sports' : t.trigger_type === 'custom' ? 'custom' : 'trigger',
          priority: 2, champion: c, description: t.title,
          suggestedAction: t.description || t.title, suggestedMessage: t.suggested_message, triggerId: t.id })
      }
    }
  }
  return actions.sort((a, b) => a.priority - b.priority).slice(0, 6)
}

function ActionCard({ action, onChampionClick, onFeedbackTriggered, onActionTaken }) {
  const { icon: Icon, color, bg, border } = actionTypeConfig[action.type] || actionTypeConfig.trigger
  const [channel, setChannel] = useState('short') // short | long
  const [longMsg, setLongMsg] = useState(null)
  const [loadingLong, setLoadingLong] = useState(false)
  const [copied, setCopied] = useState(false)

  const currentMsg = channel === 'long' && longMsg ? longMsg : action.suggestedMessage

  async function handleAction(type) {
    // For trigger-based cards: update trigger status in DB
    if (action.triggerId) {
      const status = type === 'done' ? 'acted' : 'dismissed'
      await fetch(`/api/champions/triggers/${action.triggerId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }).catch(() => {})
    }
    // For overdue/approaching cards marked done: log an interaction to reset the cadence
    if (type === 'done' && !action.triggerId) {
      await fetch(`/api/champions/${action.champion.id}/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'Note', notes: 'Marked done from action card', date: new Date().toISOString().split('T')[0] }),
      }).catch(() => {})
    }
    onActionTaken(action.id)
  }

  async function switchToLong() {
    if (longMsg) { setChannel('long'); return }
    setLoadingLong(true)
    setChannel('long')
    try {
      const prompt = `Rewrite this short message as a polished, professional email to ${action.champion.name} at ${action.champion.company}. Keep it warm and authentic — do NOT make it generic or stiff. Context: ${action.description}. Original message: "${action.suggestedMessage}". Reply with only the email body, no subject line.`
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
      })
      const data = await res.json()
      setLongMsg(data.message || action.suggestedMessage)
    } catch {
      setLongMsg(action.suggestedMessage)
    }
    setLoadingLong(false)
  }

  function handleCopy() {
    if (!currentMsg) return
    navigator.clipboard.writeText(currentMsg)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
    // Trigger feedback prompt in the chat
    if (onFeedbackTriggered) {
      onFeedbackTriggered(action.champion.name, action.champion.id, currentMsg, channel)
    }
  }

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: bg, border: `1px solid ${border}` }}>
      <div className="flex items-start gap-3">
        <Icon className="h-4 w-4 mt-0.5 shrink-0" style={{ color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => onChampionClick(action.champion)}
              className="font-semibold text-sm transition-colors hover:underline" style={{ color: '#0f1924' }}>
              {action.champion.name}
            </button>
            <span className="text-xs" style={{ color: '#848d9a' }}>{action.champion.company}</span>
            <StageTag stage={action.champion.stage} />
          </div>
          <p className="text-sm mt-0.5" style={{ color: '#505862' }}>{action.description}</p>
          <p className="text-sm font-medium mt-1" style={{ color: '#0f1924' }}>{action.suggestedAction}</p>
        </div>
      </div>

      {action.suggestedMessage && (
        <div className="ml-7 space-y-2">
          {/* Channel toggle */}
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid #e0e0e0' }}>
              <button onClick={() => setChannel('short')}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition-colors"
                style={{ background: channel === 'short' ? '#0f1924' : '#fff', color: channel === 'short' ? '#59bbb7' : '#848d9a' }}>
                <MessageSquare className="h-3 w-3" /> Text
              </button>
              <button onClick={channel === 'long' ? () => setChannel('long') : switchToLong}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition-colors"
                style={{ background: channel === 'long' ? '#0f1924' : '#fff', color: channel === 'long' ? '#59bbb7' : '#848d9a' }}>
                <Mail className="h-3 w-3" />
                {loadingLong ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Email'}
              </button>
            </div>
          </div>

          {/* Message bubble */}
          <div className="rounded-lg p-3 flex items-start justify-between gap-2"
            style={{ background: '#fff', border: '1px solid #e0e0e0' }}>
            <div className="flex items-start gap-2">
              {channel === 'long'
                ? <Mail className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: '#848d9a' }} />
                : <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: '#848d9a' }} />}
              <p className="text-sm italic whitespace-pre-wrap" style={{ color: '#505862' }}>
                {loadingLong && channel === 'long' ? 'Writing email...' : `"${currentMsg}"`}
              </p>
            </div>
            <button title={copied ? 'Copied!' : 'Copy'} onClick={handleCopy}
              className="shrink-0 transition-colors"
              style={{ color: copied ? '#59bbb7' : '#848d9a' }}>
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      <div className="ml-7 flex gap-2">
        <button onClick={() => handleAction('done')} className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
          style={{ background: '#0f1924', color: '#59bbb7' }}>Mark done</button>
        <button onClick={() => handleAction('snooze')} className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
          style={{ background: '#fff', color: '#505862', border: '1px solid #e0e0e0' }}>Snooze</button>
        <button onClick={() => handleAction('dismiss')} className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
          style={{ background: '#fff', color: '#505862', border: '1px solid #e0e0e0' }}>Dismiss</button>
      </div>
    </div>
  )
}

function PipelineCard({ champion, onClick }) {
  const daysSince = champion.last_contact_date
    ? Math.floor((new Date() - new Date(champion.last_contact_date)) / 86400000)
    : null
  const currentTransitionKey = { identified: 'identified-building', building: 'building-test', test: 'test-leverage', leverage: 'leverage' }[champion.stage]
  const criteria = champion.stageCriteria?.[currentTransitionKey] || []
  const nextCriteria = criteria.find(c => !c.met)

  return (
    <button onClick={() => onClick(champion)}
      className="w-full text-left rounded-xl p-3.5 transition-all space-y-2.5"
      style={{ background: '#fff', border: '1px solid #e0e0e0' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#59bbb7'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(89,187,183,0.15)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#e0e0e0'; e.currentTarget.style.boxShadow = 'none' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Avatar initials={champion.initials} name={champion.name} size="sm" />
          <div>
            <p className="text-sm font-semibold leading-tight" style={{ color: '#0f1924' }}>{champion.name}</p>
            <p className="text-xs" style={{ color: '#848d9a' }}>{champion.company}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {champion.health_score != null && (
            <HealthScore score={champion.health_score} size="sm" />
          )}
          <HealthDot health={champion.health} />
        </div>
      </div>
      {daysSince !== null && (
        <p className="text-xs" style={{ color: '#848d9a' }}>
          Last contact: <span className="font-medium" style={{ color: '#505862' }}>{daysSince}d ago</span>
        </p>
      )}
      {nextCriteria && (
        <div className="rounded-md px-2.5 py-1.5" style={{ background: '#ffffff' }}>
          <p className="text-xs leading-snug" style={{ color: '#848d9a' }}>
            <span className="font-medium" style={{ color: '#505862' }}>Next: </span>{nextCriteria.label}
          </p>
        </div>
      )}
    </button>
  )
}

function PipelineSection({ title, stageList, champions, onChampionClick, networkSection = false }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#848d9a' }}>{title}</h2>
      <div className={clsx('grid gap-4', networkSection ? 'grid-cols-4' : 'grid-cols-4')}>
        {stageList.map(stage => {
          const sc = stageColours[stage] || stageColours.identified
          const stageChampions = champions.filter(c => c.stage === stage)
          return (
            <div key={stage} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${sc.border}` }}>
              <div className="px-3 py-2.5 flex items-center justify-between" style={{ background: sc.header }}>
                <StageTag stage={stage} />
                <span className="text-xs font-medium" style={{ color: '#848d9a' }}>{stageChampions.length}</span>
              </div>
              <div className="p-2 space-y-2 min-h-20" style={{ background: '#ffffff' }}>
                {stageChampions.length === 0 && (
                  <p className="text-xs text-center pt-4" style={{ color: '#c6c7c8' }}>Empty</p>
                )}
                {stageChampions.map(c => <PipelineCard key={c.id} champion={c} onClick={onChampionClick} />)}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default function Home({ champions, loading, onChampionClick, onDataChanged }) {
  const today = new Date()
  const dayName = today.toLocaleDateString('en-GB', { weekday: 'long' })
  const dateStr = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const prospectCustomer = champions.filter(c => c.type !== 'network')
  const network = champions.filter(c => c.type === 'network')
  const actions = buildActions(champions).filter(a => !dismissedActionIds.has(a.id))

  // Track actioned cards so they disappear immediately
  const [dismissedActionIds, setDismissedActionIds] = useState(new Set())
  function handleActionTaken(actionId) {
    setDismissedActionIds(prev => new Set([...prev, actionId]))
  }

  // Inject feedback prompt into chat when user copies a message
  const [feedbackInjection, setFeedbackInjection] = useState(null)

  function handleFeedbackTriggered(championName, championId, message, channel) {
    setFeedbackInjection({ championName, championId, message, channel, key: Date.now() })
  }

  return (
    <div className="h-full overflow-auto" style={{ background: '#ffffff' }}>
      <div className="max-w-6xl mx-auto px-8 py-8 space-y-8">
        {/* Header */}
        <div>
          <p className="text-sm" style={{ color: '#848d9a' }}>{dayName}, {dateStr}</p>
          <h1 className="text-2xl font-bold mt-0.5" style={{ color: '#0f1924' }}>Good morning, Rich</h1>
        </div>

        {/* Chat */}
        <ChatInterface onDataChanged={onDataChanged} feedbackInjection={feedbackInjection} />

        {/* Pending trigger proposals */}
        <PendingTriggers onResolved={onDataChanged} />

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: '#59bbb7' }} />
          </div>
        ) : (
          <>
            {actions.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#848d9a' }}>Today's actions</h2>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
                    style={{ background: '#59bbb7', color: '#0f1924' }}>{actions.length}</span>
                </div>
                <div className="space-y-3">
                  {actions.map(a => <ActionCard key={a.id} action={a} onChampionClick={onChampionClick} onFeedbackTriggered={handleFeedbackTriggered} onActionTaken={handleActionTaken} />)}
                </div>
              </section>
            )}
            <PipelineSection title="Prospect & Customer Pipeline" stageList={stages} champions={prospectCustomer} onChampionClick={onChampionClick} />
            {network.length > 0 && (
              <PipelineSection title="Network" stageList={['nurture']} champions={network} onChampionClick={onChampionClick} networkSection />
            )}
          </>
        )}
      </div>
    </div>
  )
}
