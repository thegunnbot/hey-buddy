import { useState } from 'react'
import {
  Search, Linkedin, Phone, MessageSquare,
  CheckCircle, Circle, ExternalLink,
  Trophy, Briefcase, User, Clock, Plus, Zap,
  Archive, ArchiveRestore, MapPin, Pencil, Sparkles
} from 'lucide-react'
import clsx from 'clsx'
import StageTag from '../components/StageTag'
import HealthScore from '../components/HealthScore'

const typeBadge = {
  prospect: 'bg-blue-50 text-blue-600 border-blue-200',
  customer: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  network: 'bg-violet-50 text-violet-600 border-violet-200',
}
import HealthDot from '../components/HealthDot'
import Avatar from '../components/Avatar'

const interactionTypeColour = {
  Call: 'bg-blue-100 text-blue-700',
  Email: 'bg-gray-100 text-gray-600',
  Meeting: 'bg-hx-teal-muted text-hx-teal',
  Dinner: 'bg-emerald-100 text-emerald-700',
  Event: 'bg-purple-100 text-purple-700',
  Gift: 'bg-rose-100 text-rose-700',
}

const stageTransitionLabel = {
  'identified-building': 'Identified → Building',
  'building-test': 'Building → Test',
  'test-leverage': 'Test → Leverage',
  'leverage': 'Leverage (sustaining)',
}

function ChampionRow({ champion, selected, onClick }) {
  const daysSince = Math.floor(
    (new Date() - new Date(champion.last_contact_date)) / (1000 * 60 * 60 * 24),
  )
  const hasNextAction = !!champion.nextAction

  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors border-b border-gray-100 last:border-0',
        selected ? '' : 'hover:bg-gray-50',
      )}
    >
      <Avatar initials={champion.initials} name={champion.name} size="md" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900 text-sm">{champion.name}</span>
          <StageTag stage={champion.stage} />
        </div>
        <p className="text-xs text-gray-500 mt-0.5 truncate">{champion.company} · <span className="capitalize">{champion.type}</span></p>
      </div>
      <div className="text-right shrink-0 space-y-1">
        <HealthDot health={champion.health} showLabel />
        <p className="text-xs text-gray-400">{daysSince}d ago</p>
      </div>
    </button>
  )
}

function StageCriteria({ champion, onDataChanged }) {
  const currentStageKey = Object.keys(champion.stageCriteria).find((k) => k.startsWith(champion.stage))
  if (!currentStageKey) return null
  const criteria = champion.stageCriteria[currentStageKey]
  const metCount = criteria.filter((c) => c.met).length

  async function toggleCriterion(c) {
    await fetch(`/api/champions/${champion.id}/stage-criteria`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transition: currentStageKey, criterion_key: c.key, met: !c.met }),
    })
    if (onDataChanged) onDataChanged()
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {stageTransitionLabel[currentStageKey]}
        </p>
        <span className="text-xs text-gray-500">{metCount}/{criteria.length}</span>
      </div>
      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-hx-teal-muted0 rounded-full transition-all"
          style={{ width: `${(metCount / criteria.length) * 100}%` }}
        />
      </div>
      <div className="space-y-1.5 mt-3">
        {criteria.map((c) => (
          <button key={c.key} onClick={() => toggleCriterion(c)}
            className="flex items-start gap-2 w-full text-left cursor-pointer hover:opacity-70 transition-opacity">
            {c.met ? (
              <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            ) : (
              <Circle className="h-4 w-4 text-gray-300 shrink-0 mt-0.5" />
            )}
            <span className={clsx('text-sm', c.met ? 'text-gray-500 line-through' : 'text-gray-700')}>
              {c.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function ChampionDetail({ champion, onArchiveToggle, onDataChanged }) {
  const [activeSection, setActiveSection] = useState('overview')
  const [archiving, setArchiving] = useState(false)
  const [editingFields, setEditingFields] = useState(false)
  const [fieldValues, setFieldValues] = useState({})
  const [editingTriggerId, setEditingTriggerId] = useState(null)
  const [triggerEditValues, setTriggerEditValues] = useState({})
  const daysSince = Math.floor(
    (new Date() - new Date(champion.last_contact_date)) / (1000 * 60 * 60 * 24),
  )

  const handleArchiveToggle = async () => {
    setArchiving(true)
    const action = champion.archived ? 'unarchive' : 'archive'
    await fetch(`/api/champions/${champion.id}/${action}`, { method: 'POST' })
    setArchiving(false)
    if (onArchiveToggle) onArchiveToggle()
  }

  function startEditFields() {
    setFieldValues({
      name: champion.name || '',
      role: champion.role || '',
      company: champion.company || '',
      personal_contact: champion.personal_contact || champion.personalContact || '',
      location_city: champion.location_city || '',
      location_country: champion.location_country || '',
    })
    setEditingFields(true)
  }

  async function saveFields() {
    await fetch(`/api/champions/${champion.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fieldValues),
    })
    setEditingFields(false)
    if (onDataChanged) onDataChanged()
  }

  function startEditTrigger(t) {
    setEditingTriggerId(t.id)
    setTriggerEditValues({
      title: t.title || '',
      description: t.description || '',
      suggested_message: t.suggested_message || '',
      fire_at: t.fire_at ? t.fire_at.slice(0, 16) : '',
    })
  }

  async function saveTrigger(triggerId) {
    await fetch(`/api/champions/triggers/${triggerId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(triggerEditValues),
    })
    setEditingTriggerId(null)
    if (onDataChanged) onDataChanged()
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-200 bg-white">
        <div className="flex items-start gap-4">
          <Avatar initials={champion.initials} name={champion.name} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                {editingFields ? (
                  <div className="space-y-2">
                    <div className="flex gap-2 flex-wrap">
                      <input value={fieldValues.name} onChange={e => setFieldValues(v => ({ ...v, name: e.target.value }))}
                        placeholder="Name" className="border border-gray-300 rounded px-2 py-1 text-sm font-bold text-gray-900 w-40 focus:outline-none focus:ring-1 focus:ring-hx-teal" />
                      <input value={fieldValues.role} onChange={e => setFieldValues(v => ({ ...v, role: e.target.value }))}
                        placeholder="Role" className="border border-gray-300 rounded px-2 py-1 text-sm text-gray-600 w-36 focus:outline-none focus:ring-1 focus:ring-hx-teal" />
                      <input value={fieldValues.company} onChange={e => setFieldValues(v => ({ ...v, company: e.target.value }))}
                        placeholder="Company" className="border border-gray-300 rounded px-2 py-1 text-sm text-gray-600 w-36 focus:outline-none focus:ring-1 focus:ring-hx-teal" />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <input value={fieldValues.personal_contact} onChange={e => setFieldValues(v => ({ ...v, personal_contact: e.target.value }))}
                        placeholder="Personal contact" className="border border-gray-300 rounded px-2 py-1 text-sm text-gray-600 w-36 focus:outline-none focus:ring-1 focus:ring-hx-teal" />
                      <input value={fieldValues.location_city} onChange={e => setFieldValues(v => ({ ...v, location_city: e.target.value }))}
                        placeholder="City" className="border border-gray-300 rounded px-2 py-1 text-sm text-gray-600 w-28 focus:outline-none focus:ring-1 focus:ring-hx-teal" />
                      <input value={fieldValues.location_country} onChange={e => setFieldValues(v => ({ ...v, location_country: e.target.value }))}
                        placeholder="Country" className="border border-gray-300 rounded px-2 py-1 text-sm text-gray-600 w-28 focus:outline-none focus:ring-1 focus:ring-hx-teal" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={saveFields} className="rounded px-3 py-1 text-xs font-medium text-white" style={{ background: '#0f1924' }}>Save</button>
                      <button onClick={() => setEditingFields(false)} className="rounded px-3 py-1 text-xs font-medium text-gray-600 border border-gray-300">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{champion.name}</h2>
                      <p className="text-sm text-gray-500">{champion.role} · {champion.company}</p>
                    </div>
                    <button onClick={startEditFields} title="Edit fields"
                      className="mt-1 p-1 rounded hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StageTag stage={champion.stage} size="md" />
                <HealthDot health={champion.health} showLabel />
                {champion.health_score != null && (
                  <HealthScore score={champion.health_score} size="sm" />
                )}
              </div>
            </div>
            {!editingFields && (
              <div className="flex items-center gap-3 mt-3">
                {champion.linkedinUrl && (
                  <a
                    href={champion.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs font-medium text-hx-teal hover:text-hx-teal transition-colors"
                  >
                    <Linkedin className="h-3.5 w-3.5" />
                    LinkedIn
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {champion.personalContact && (
                  <span className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Phone className="h-3.5 w-3.5" />
                    {champion.personalContact}
                  </span>
                )}
                {(champion.location_city || champion.location_country) && (
                  <span className="flex items-center gap-1.5 text-xs text-gray-500">
                    <MapPin className="h-3.5 w-3.5" />
                    {[champion.location_city, champion.location_country].filter(Boolean).join(', ')}
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Clock className="h-3.5 w-3.5" />
                  Last contact {daysSince} days ago
                </span>
                <span className={clsx(
                  'text-xs font-medium px-2 py-0.5 rounded-full border capitalize',
                  typeBadge[champion.type] || 'bg-gray-100 text-gray-600 border-gray-200'
                )}>
                  {champion.type}
                </span>
                <span className={clsx(
                  'text-xs font-medium px-2 py-0.5 rounded-full',
                  champion.deal_status === 'post-sfo'
                    ? 'bg-amber-100 text-amber-700'
                    : champion.deal_status === 'network'
                    ? 'bg-violet-100 text-violet-700'
                    : 'bg-gray-100 text-gray-600'
                )}>
                  {champion.deal_status === 'post-sfo' ? 'Active deal' : champion.deal_status === 'network' ? 'Network' : 'Pre-SQO'}
                </span>
                <button
                  onClick={handleArchiveToggle}
                  disabled={archiving}
                  className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors disabled:opacity-50 ml-1"
                  style={{
                    borderColor: champion.archived ? '#59bbb7' : '#e0e0e0',
                    color: champion.archived ? '#59bbb7' : '#848d9a',
                    background: 'transparent',
                  }}
                  title={champion.archived ? 'Restore champion' : 'Archive champion'}
                >
                  {champion.archived
                    ? <><ArchiveRestore className="h-3 w-3" /> Restore</>
                    : <><Archive className="h-3 w-3" /> Archive</>
                  }
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white px-6">
        {['overview', 'history', 'criteria'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSection(tab)}
            className={clsx(
              'px-4 py-3 text-sm font-medium capitalize border-b-2 -mb-px transition-colors',
              activeSection === tab
                ? 'border-hx-500 text-hx-teal'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto px-6 py-5 space-y-6 bg-gray-50">

        {/* OVERVIEW */}
        {activeSection === 'overview' && (
          <>
            {/* Next action */}
            {champion.nextAction && (
              <div className="rounded-xl bg-hx-teal-muted border border-hx-200 p-4 space-y-2">
                <p className="text-xs font-semibold text-hx-teal uppercase tracking-wide">Suggested next action</p>
                <p className="text-sm font-medium text-gray-800">{champion.nextAction.description}</p>
                {champion.nextAction.suggestedMessage && (
                  <div className="rounded-lg bg-white border border-hx-200 p-3">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="h-3.5 w-3.5 text-indigo-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-gray-700 italic">"{champion.nextAction.suggestedMessage}"</p>
                    </div>
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <button className="rounded-lg bg-hx-navy px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition-colors">
                    Mark done
                  </button>
                  <button className="rounded-lg border border-hx-300 bg-white px-3 py-1.5 text-xs font-medium text-hx-teal hover:bg-hx-teal-muted transition-colors">
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Interests & intelligence topics */}
            {champion.interests?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4" style={{ color: '#49deff' }} />
                  <h3 className="text-sm font-semibold text-gray-900">Interests & intelligence topics</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {champion.interests.map(interest => (
                    <div key={interest.id}
                      className="group relative rounded-lg px-3 py-2 text-xs"
                      style={{ background: 'rgba(73,222,255,0.08)', border: '1px solid rgba(73,222,255,0.25)' }}
                      title={interest.evidence}
                    >
                      <span className="font-medium" style={{ color: '#0f1924' }}>{interest.name}</span>
                      {interest.category && (
                        <span className="ml-1.5" style={{ color: '#848d9a' }}>· {interest.category}</span>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs mt-2" style={{ color: '#c0c0c0' }}>
                  These topics will drive proactive intelligence alerts when relevant news breaks.
                </p>
              </div>
            )}

            {/* Personal wins */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-gray-900">Personal wins</h3>
              </div>
              {champion.personalWins.length === 0 ? (
                <p className="text-sm text-gray-400 italic">None identified yet</p>
              ) : (
                <div className="space-y-2">
                  {champion.personalWins.map((pw) => (
                    <div key={pw.id} className="flex items-start gap-2.5 rounded-lg bg-white border border-gray-200 p-3">
                      <span className="text-lg leading-none">{pw.emoji}</span>
                      <div>
                        <p className="text-sm text-gray-800">{pw.description}</p>
                        <p className="text-xs text-gray-400 capitalize mt-0.5">{pw.category}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Professional wins */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Briefcase className="h-4 w-4 text-hx-teal" />
                <h3 className="text-sm font-semibold text-gray-900">Professional wins</h3>
              </div>
              {champion.professionalWins.length === 0 ? (
                <p className="text-sm text-gray-400 italic">None identified yet</p>
              ) : (
                <div className="space-y-2">
                  {champion.professionalWins.map((pw) => (
                    <div key={pw.id} className="rounded-lg bg-white border border-gray-200 p-3">
                      <p className="text-sm text-gray-800">{pw.description}</p>
                      <div className="flex items-center gap-1.5 mt-2">
                        {pw.confirmed ? (
                          <>
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                            <span className="text-xs text-emerald-600 font-medium">Explicitly confirmed</span>
                          </>
                        ) : (
                          <>
                            <Circle className="h-3.5 w-3.5 text-gray-300" />
                            <span className="text-xs text-gray-400">Not yet confirmed</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Outstanding actions */}
            {(() => {
              const pending = (champion.triggers || []).filter(t => t.status === 'pending')
              if (!pending.length) return null

              function nextDue(t) {
                if (t.fire_at) return new Date(t.fire_at)
                if (!t.schedule) return null
                const base = t.last_fired ? new Date(t.last_fired) : new Date(t.created_at)
                const days = t.schedule === 'weekly' ? 7 : t.schedule === 'monthly' ? 30 : null
                return days ? new Date(base.getTime() + days * 86400000) : null
              }

              const sorted = [...pending].sort((a, b) => {
                const da = nextDue(a), db = nextDue(b)
                if (da && db) return da - db
                if (da) return -1
                if (db) return 1
                return 0
              })

              return (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="h-4 w-4" style={{ color: '#59bbb7' }} />
                    <h3 className="text-sm font-semibold text-gray-900">Outstanding actions</h3>
                    <span className="text-xs font-medium rounded-full px-2 py-0.5" style={{ background: 'rgba(89,187,183,0.12)', color: '#59bbb7' }}>
                      {sorted.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {sorted.map(t => {
                      const due = nextDue(t)
                      const isOverdue = due && due < new Date()
                      const isToday = due && due.toDateString() === new Date().toDateString()
                      const isEditing = editingTriggerId === t.id
                      return (
                        <div key={t.id} className="rounded-lg bg-white border border-gray-200 p-3 space-y-1.5">
                          {isEditing ? (
                            <div className="space-y-2">
                              <input value={triggerEditValues.title} onChange={e => setTriggerEditValues(v => ({ ...v, title: e.target.value }))}
                                placeholder="Title" className="w-full border border-gray-300 rounded px-2 py-1 text-sm font-medium text-gray-900 focus:outline-none focus:ring-1 focus:ring-hx-teal" />
                              <input value={triggerEditValues.description} onChange={e => setTriggerEditValues(v => ({ ...v, description: e.target.value }))}
                                placeholder="Description" className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-gray-600 focus:outline-none focus:ring-1 focus:ring-hx-teal" />
                              <input value={triggerEditValues.suggested_message} onChange={e => setTriggerEditValues(v => ({ ...v, suggested_message: e.target.value }))}
                                placeholder="Suggested message" className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-gray-600 focus:outline-none focus:ring-1 focus:ring-hx-teal" />
                              <input type="datetime-local" value={triggerEditValues.fire_at} onChange={e => setTriggerEditValues(v => ({ ...v, fire_at: e.target.value }))}
                                className="border border-gray-300 rounded px-2 py-1 text-sm text-gray-600 focus:outline-none focus:ring-1 focus:ring-hx-teal" />
                              <div className="flex gap-2">
                                <button onClick={() => saveTrigger(t.id)} className="rounded px-3 py-1 text-xs font-medium text-white" style={{ background: '#0f1924' }}>Save</button>
                                <button onClick={() => setEditingTriggerId(null)} className="rounded px-3 py-1 text-xs font-medium text-gray-600 border border-gray-300">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-medium text-gray-900">{t.title}</p>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {t.schedule && (
                                    <span className="text-xs font-medium rounded-full px-2 py-0.5 capitalize" style={{ background: 'rgba(78,112,248,0.08)', color: '#4e70f8' }}>
                                      {t.schedule}
                                    </span>
                                  )}
                                  {due && (
                                    <span className="text-xs font-medium rounded-full px-2 py-0.5" style={{
                                      background: isOverdue ? 'rgba(238,108,91,0.1)' : isToday ? 'rgba(89,187,183,0.1)' : '#f5f5f5',
                                      color: isOverdue ? '#ee6c5b' : isToday ? '#59bbb7' : '#848d9a'
                                    }}>
                                      {isOverdue ? 'Overdue' : isToday
                                        ? `Today ${due.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
                                        : due.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                    </span>
                                  )}
                                  <button onClick={() => startEditTrigger(t)} title="Edit" className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                              {t.description && t.description !== t.title && (
                                <p className="text-xs text-gray-500">{t.description}</p>
                              )}
                              {t.suggested_message && (
                                <p className="text-xs italic text-gray-400 border-t border-gray-100 pt-1.5">"{t.suggested_message}"</p>
                              )}
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}
          </>
        )}

        {/* HISTORY */}
        {activeSection === 'history' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Interaction log</h3>
              <button className="flex items-center gap-1 text-xs font-medium text-hx-teal hover:text-hx-teal">
                <Plus className="h-3.5 w-3.5" /> Log interaction
              </button>
            </div>
            <div className="space-y-3">
              {champion.interactions.map((interaction) => (
                <div key={interaction.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="h-2.5 w-2.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                    <div className="flex-1 w-px bg-gray-200 mt-1" />
                  </div>
                  <div className="pb-4 flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-400">
                        {new Date(interaction.date).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      <span className={clsx(
                        'text-xs px-2 py-0.5 rounded-full font-medium',
                        interactionTypeColour[interaction.type] || 'bg-gray-100 text-gray-600'
                      )}>
                        {interaction.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{interaction.notes}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CRITERIA */}
        {activeSection === 'criteria' && (
          <div className="space-y-6">
            {Object.entries(champion.stageCriteria).map(([key, criteria]) => {
              const metCount = criteria.filter((c) => c.met).length
              const isCurrentStage = key.startsWith(champion.stage) || (champion.stage === 'leverage' && key === 'leverage')
              return (
                <div key={key} className={clsx(
                  'rounded-xl p-4 border',
                  isCurrentStage ? 'bg-white border-hx-200' : 'bg-gray-50 border-gray-200 opacity-70'
                )}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-gray-900">
                      {stageTransitionLabel[key]}
                      {isCurrentStage && (
                        <span className="ml-2 text-xs font-normal text-hx-teal">← current</span>
                      )}
                    </p>
                    <span className="text-xs text-gray-500">{metCount}/{criteria.length} met</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full bg-hx-teal-muted0 rounded-full"
                      style={{ width: `${(metCount / criteria.length) * 100}%` }}
                    />
                  </div>
                  <div className="space-y-2">
                    {criteria.map((c) => (
                      <button key={c.key} onClick={async () => {
                        await fetch(`/api/champions/${champion.id}/stage-criteria`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ transition: key, criterion_key: c.key, met: !c.met }),
                        })
                        if (onDataChanged) onDataChanged()
                      }} className="flex items-start gap-2 w-full text-left cursor-pointer hover:opacity-70 transition-opacity">
                        {c.met ? (
                          <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="h-4 w-4 text-gray-300 shrink-0 mt-0.5" />
                        )}
                        <span className={clsx('text-sm', c.met ? 'text-gray-400 line-through' : 'text-gray-700')}>
                          {c.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Champions({ champions = [], selectedChampion, onSelectChampion, onDataChanged }) {
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [showArchived, setShowArchived] = useState(false)

  const filtered = champions.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.company.toLowerCase().includes(search.toLowerCase())
    const matchStage = stageFilter === 'all' || c.stage === stageFilter
    const matchType = typeFilter === 'all' || c.type === typeFilter
    const matchArchived = showArchived ? c.archived : !c.archived
    return matchSearch && matchStage && matchType && matchArchived
  })

  return (
    <div className="flex h-full overflow-hidden">
      {/* List panel */}
      <div className="flex flex-col w-80 shrink-0 border-r border-gray-200 bg-white">
        <div className="px-4 py-4 space-y-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h1 className="text-base font-bold text-gray-900">Champions</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowArchived(a => !a)}
                className={clsx(
                  'flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
                  showArchived ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                )}
                title={showArchived ? 'Hide archived' : 'Show archived'}
              >
                <Archive className="h-3 w-3" />
                {showArchived ? 'Archived' : 'Archive'}
              </button>
              <button className="flex items-center gap-1 rounded-lg bg-hx-navy px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition-colors">
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search champions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-hx-teal/30"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {['all', 'identified', 'building', 'test', 'leverage', 'nurture'].map((s) => (
              <button
                key={s}
                onClick={() => setStageFilter(s)}
                className={clsx(
                  'rounded-full px-2.5 py-1 text-xs font-medium transition-colors capitalize',
                  stageFilter === s
                    ? 'bg-hx-navy text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                )}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex gap-1 flex-wrap">
            {['all', 'prospect', 'customer', 'network'].map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={clsx(
                  'rounded-full px-2.5 py-1 text-xs font-medium transition-colors capitalize',
                  typeFilter === t
                    ? 'bg-slate-700 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {filtered.map((c) => (
            <ChampionRow
              key={c.id}
              champion={c}
              selected={selectedChampion?.id === c.id}
              onClick={() => onSelectChampion(c)}
            />
          ))}
        </div>
      </div>

      {/* Detail panel */}
      <div className="flex-1 overflow-hidden">
        {selectedChampion ? (
          <ChampionDetail champion={selectedChampion} onArchiveToggle={onDataChanged} onDataChanged={onDataChanged} />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center space-y-2">
              <User className="h-10 w-10 text-gray-300 mx-auto" />
              <p className="text-sm text-gray-400">Select a champion to view their profile</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
