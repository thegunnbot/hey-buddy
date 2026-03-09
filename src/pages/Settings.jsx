import { useState, useEffect, useCallback } from 'react'
import { Bell, Link, Sliders, Users, Plus, Trash2, Crown, User, Loader2, UserCircle, X, MessageSquare, Mail } from 'lucide-react'

const integrations = [
  { name: 'Salesforce', description: 'Sync deal status and auto-adjust cadence post-SQO', status: 'coming-soon' },
  { name: 'Gong', description: 'Auto-import call transcripts and extract champion intel', status: 'coming-soon' },
  { name: 'Metaview', description: 'Import meeting recordings for AI analysis', status: 'coming-soon' },
  { name: 'Notion', description: 'Pull internal project milestones as triggers', status: 'coming-soon' },
  { name: 'Microsoft Teams', description: 'Push notifications when deployed on work estate', status: 'coming-soon' },
  { name: 'LinkedIn', description: 'Monitor role changes and activity for champions', status: 'coming-soon' },
]

function Section({ icon: Icon, title, children }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" style={{ color: '#848d9a' }} />
        <h2 className="text-sm font-semibold" style={{ color: '#0f1924' }}>{title}</h2>
      </div>
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #e0e0e0', background: '#fff' }}>
        {children}
      </div>
    </section>
  )
}

function Row({ children }) {
  return (
    <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #f0f0f0' }}>
      {children}
    </div>
  )
}

// ── Profile section ────────────────────────────────────────

function TagInput({ values, onChange, placeholder }) {
  const [input, setInput] = useState('')
  const add = () => {
    const v = input.trim()
    if (v && !values.includes(v)) onChange([...values, v])
    setInput('')
  }
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {values.map(v => (
          <span key={v} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
            style={{ background: '#59bbb720', color: '#59bbb7' }}>
            {v}
            <button onClick={() => onChange(values.filter(x => x !== v))}><X className="h-3 w-3" /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder={placeholder}
          className="flex-1 rounded-lg px-3 py-2 text-sm"
          style={{ border: '1px solid #e0e0e0', color: '#0f1924' }} />
        <button onClick={add} className="px-3 py-2 rounded-lg text-sm font-medium"
          style={{ background: '#f0f0f0', color: '#505862' }}>Add</button>
      </div>
    </div>
  )
}

function ToneSamplesEditor({ channel, label, icon: Icon, placeholder }) {
  const [samples, setSamples] = useState([])
  const [input, setInput] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/profile/tone-samples?channel=${channel}`)
      .then(r => r.json()).then(setSamples).catch(() => {})
  }, [channel])

  const add = async () => {
    if (!input.trim()) return
    setSaving(true)
    const res = await fetch('/api/profile/tone-samples', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sample_text: input.trim(), channel }),
    })
    if (res.ok) {
      const { id } = await res.json()
      setSamples(prev => [{ id, sample_text: input.trim(), channel }, ...prev])
      setInput('')
    }
    setSaving(false)
  }

  const remove = async (id) => {
    await fetch(`/api/profile/tone-samples/${id}`, { method: 'DELETE' })
    setSamples(prev => prev.filter(s => s.id !== id))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3.5 w-3.5" style={{ color: '#848d9a' }} />
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#848d9a' }}>{label}</span>
        <span className="text-xs" style={{ color: '#c0c0c0' }}>({samples.length}/5)</span>
      </div>
      {samples.map(s => (
        <div key={s.id} className="flex items-start gap-2 rounded-lg p-3"
          style={{ background: '#f8f8f8', border: '1px solid #e8e8e8' }}>
          <p className="flex-1 text-sm italic" style={{ color: '#505862' }}>"{s.sample_text}"</p>
          <button onClick={() => remove(s.id)} className="shrink-0">
            <X className="h-3.5 w-3.5" style={{ color: '#c0c0c0' }} />
          </button>
        </div>
      ))}
      {samples.length < 5 && (
        <div className="flex gap-2">
          <textarea value={input} onChange={e => setInput(e.target.value)}
            placeholder={placeholder} rows={2}
            className="flex-1 rounded-lg px-3 py-2 text-sm resize-none"
            style={{ border: '1px solid #e0e0e0', color: '#0f1924' }} />
          <button onClick={add} disabled={saving}
            className="px-3 rounded-lg text-sm font-medium disabled:opacity-40"
            style={{ background: '#0f1924', color: '#59bbb7' }}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          </button>
        </div>
      )}
    </div>
  )
}

function ProfileSection() {
  const [profile, setProfile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/profile').then(r => r.json()).then(d => {
      setProfile({
        display_name: d.display_name || '',
        role_title: d.role_title || '',
        home_city: d.home_city || '',
        sports_teams: d.sports_teams || [],
        interests: d.interests || [],
        preferred_channel: d.preferred_channel || 'short',
      })
    }).catch(() => setProfile({ display_name: '', role_title: '', home_city: '', sports_teams: [], interests: [], preferred_channel: 'short' }))
  }, [])

  const save = async () => {
    setSaving(true)
    await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!profile) return (
    <Section icon={UserCircle} title="Profile">
      <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin" style={{ color: '#59bbb7' }} /></div>
    </Section>
  )

  return (
    <Section icon={UserCircle} title="Profile">
      {/* Basic info */}
      {[
        { key: 'display_name', label: 'Name', placeholder: 'Rich Gunn' },
        { key: 'role_title', label: 'Role', placeholder: 'Senior Account Executive' },
        { key: 'home_city', label: 'Home city', placeholder: 'London' },
      ].map(f => (
        <Row key={f.key}>
          <label className="text-sm font-medium w-28 shrink-0" style={{ color: '#0f1924' }}>{f.label}</label>
          <input value={profile[f.key]} onChange={e => setProfile(p => ({ ...p, [f.key]: e.target.value }))}
            placeholder={f.placeholder}
            className="flex-1 rounded-lg px-3 py-1.5 text-sm"
            style={{ border: '1px solid #e0e0e0', color: '#0f1924' }} />
        </Row>
      ))}

      {/* Sports teams */}
      <div className="px-5 py-4" style={{ borderBottom: '1px solid #f0f0f0' }}>
        <p className="text-sm font-medium mb-2" style={{ color: '#0f1924' }}>Sports teams</p>
        <p className="text-xs mb-3" style={{ color: '#848d9a' }}>Used to spot shared interests and rival-team banter with champions.</p>
        <TagInput values={profile.sports_teams} onChange={v => setProfile(p => ({ ...p, sports_teams: v }))} placeholder="e.g. Chelsea, England rugby" />
      </div>

      {/* Interests */}
      <div className="px-5 py-4" style={{ borderBottom: '1px solid #f0f0f0' }}>
        <p className="text-sm font-medium mb-2" style={{ color: '#0f1924' }}>Other interests</p>
        <p className="text-xs mb-3" style={{ color: '#848d9a' }}>Helps find authentic overlap with your champions beyond sport.</p>
        <TagInput values={profile.interests} onChange={v => setProfile(p => ({ ...p, interests: v }))} placeholder="e.g. running, live music, travel" />
      </div>

      {/* Preferred channel */}
      <Row>
        <div>
          <p className="text-sm font-medium" style={{ color: '#0f1924' }}>Default message format</p>
          <p className="text-xs mt-0.5" style={{ color: '#848d9a' }}>Short = WhatsApp/text · Long = email. Toggle per-suggestion anytime.</p>
        </div>
        <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid #e0e0e0' }}>
          {[{ value: 'short', label: '💬 Text', icon: MessageSquare }, { value: 'long', label: '✉️ Email', icon: Mail }].map(opt => (
            <button key={opt.value} onClick={() => setProfile(p => ({ ...p, preferred_channel: opt.value }))}
              className="px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                background: profile.preferred_channel === opt.value ? '#0f1924' : '#fff',
                color: profile.preferred_channel === opt.value ? '#59bbb7' : '#848d9a',
              }}>
              {opt.label}
            </button>
          ))}
        </div>
      </Row>

      {/* Save */}
      <div className="px-5 py-4" style={{ borderTop: '1px solid #f0f0f0' }}>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-40"
          style={{ background: '#0f1924', color: '#fff' }}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {saved ? '✓ Saved' : 'Save profile'}
        </button>
      </div>

      {/* Tone samples */}
      <div className="px-5 py-4 space-y-6" style={{ borderTop: '1px solid #e0e0e0' }}>
        <div>
          <p className="text-sm font-semibold mb-1" style={{ color: '#0f1924' }}>Tone of voice</p>
          <p className="text-xs" style={{ color: '#848d9a' }}>Paste real messages you've sent to champions. The AI will match your style when suggesting outreach.</p>
        </div>
        <ToneSamplesEditor channel="short" label="WhatsApp / text examples" icon={MessageSquare}
          placeholder="e.g. 'Mate — what a result last night! Cole Palmer was unreal 🔵'" />
        <ToneSamplesEditor channel="long" label="Email examples (optional)" icon={Mail}
          placeholder="e.g. 'Hi James, Hope you're well. Wanted to reach out ahead of our call...'" />
      </div>
    </Section>
  )
}

// ── Users section ──────────────────────────────────────────

function UsersSection() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ platform: 'telegram', platform_user_id: '', display_name: '' })
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState(null)

  const load = () => {
    setLoading(true)
    fetch('/api/users')
      .then(r => r.json())
      .then(data => { setUsers(data); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(load, [])

  const add = async () => {
    if (!form.platform_user_id.trim()) return setError('User ID is required')
    setAdding(true)
    setError(null)
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setForm({ platform: 'telegram', platform_user_id: '', display_name: '' })
      setShowForm(false)
      load()
    } else {
      const d = await res.json()
      setError(d.error || 'Failed to add user')
    }
    setAdding(false)
  }

  const revoke = async (user) => {
    if (!confirm(`Remove access for ${user.display_name || user.platform_user_id}?`)) return
    await fetch(`/api/users/${user.platform_user_id}?platform=${user.platform}`, { method: 'DELETE' })
    load()
  }

  const platformLabel = { telegram: 'Telegram', teams: 'Teams' }
  const platformColour = { telegram: '#49deff', teams: '#4e70f8' }

  return (
    <Section icon={Users} title="Users & access">
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin" style={{ color: '#59bbb7' }} />
        </div>
      ) : (
        <>
          {users.map(u => (
            <Row key={u.id}>
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full"
                  style={{ background: '#f0f0f0' }}>
                  {u.role === 'admin'
                    ? <Crown className="h-3.5 w-3.5" style={{ color: '#59bbb7' }} />
                    : <User className="h-3.5 w-3.5" style={{ color: '#848d9a' }} />}
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: '#0f1924' }}>
                    {u.display_name || u.platform_username || u.platform_user_id}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                      style={{ background: `${platformColour[u.platform]}20`, color: platformColour[u.platform] }}>
                      {platformLabel[u.platform] || u.platform}
                    </span>
                    <span className="text-xs" style={{ color: '#848d9a' }}>ID: {u.platform_user_id}</span>
                    {u.role === 'admin' && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                        style={{ background: '#59bbb720', color: '#59bbb7' }}>Admin</span>
                    )}
                  </div>
                </div>
              </div>
              {u.role !== 'admin' && (
                <button onClick={() => revoke(u)}
                  className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors"
                  style={{ background: '#fee2e2', color: '#ef4444' }}>
                  <Trash2 className="h-3 w-3" /> Revoke
                </button>
              )}
            </Row>
          ))}

          {/* Add user form */}
          {showForm ? (
            <div className="px-5 py-4 space-y-3" style={{ borderTop: '1px solid #f0f0f0' }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#848d9a' }}>Pre-approve a user</p>
              <div className="flex gap-2">
                <select
                  value={form.platform}
                  onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
                  className="rounded-lg px-3 py-2 text-sm"
                  style={{ border: '1px solid #e0e0e0', color: '#0f1924', background: '#fff' }}>
                  <option value="telegram">Telegram</option>
                  <option value="teams">Teams</option>
                </select>
                <input
                  type="text"
                  placeholder="User ID"
                  value={form.platform_user_id}
                  onChange={e => setForm(f => ({ ...f, platform_user_id: e.target.value }))}
                  className="flex-1 rounded-lg px-3 py-2 text-sm"
                  style={{ border: '1px solid #e0e0e0', color: '#0f1924' }}
                />
                <input
                  type="text"
                  placeholder="Name (optional)"
                  value={form.display_name}
                  onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                  className="flex-1 rounded-lg px-3 py-2 text-sm"
                  style={{ border: '1px solid #e0e0e0', color: '#0f1924' }}
                />
              </div>
              {error && <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>}
              <p className="text-xs" style={{ color: '#848d9a' }}>
                Find a Telegram user ID by asking them to message <strong>@userinfobot</strong>.
              </p>
              <div className="flex gap-2">
                <button onClick={add} disabled={adding}
                  className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-40"
                  style={{ background: '#0f1924', color: '#fff' }}>
                  {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Add user
                </button>
                <button onClick={() => { setShowForm(false); setError(null) }}
                  className="text-sm px-4 py-2 rounded-lg"
                  style={{ background: '#f0f0f0', color: '#505862' }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="px-5 py-3" style={{ borderTop: users.length ? '1px solid #f0f0f0' : 'none' }}>
              <button onClick={() => setShowForm(true)}
                className="flex items-center gap-1.5 text-sm font-medium"
                style={{ color: '#59bbb7' }}>
                <Plus className="h-3.5 w-3.5" /> Pre-approve a user
              </button>
            </div>
          )}
        </>
      )}
    </Section>
  )
}

// ── Cadence + Notifications (shared settings load) ────────────────────────

const CADENCE_OPTIONS = [
  { label: 'Weekly', days: 7 },
  { label: 'Every 2 weeks', days: 14 },
  { label: 'Monthly', days: 30 },
  { label: 'Every 6 weeks', days: 42 },
  { label: 'Every 2 months', days: 60 },
]
const OVERDUE_OPTIONS = [
  { label: '3 days', days: 3 },
  { label: '5 days', days: 5 },
  { label: '7 days', days: 7 },
  { label: '10 days', days: 10 },
]

function CadenceSection({ settings, onChange }) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [local, setLocal] = useState(null)

  useEffect(() => { if (settings) setLocal(settings.cadence) }, [settings])

  const save = async () => {
    setSaving(true)
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cadence: local }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    onChange?.()
  }

  if (!local) return (
    <Section icon={Sliders} title="Cadence rules">
      <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin" style={{ color: '#59bbb7' }} /></div>
    </Section>
  )

  return (
    <Section icon={Sliders} title="Cadence rules">
      <Row>
        <div>
          <p className="text-sm font-medium" style={{ color: '#0f1924' }}>Default cadence</p>
          <p className="text-xs mt-0.5" style={{ color: '#848d9a' }}>Any champion, no active deal</p>
        </div>
        <select value={local.default_days}
          onChange={e => setLocal(p => ({ ...p, default_days: Number(e.target.value) }))}
          className="rounded-lg px-3 py-1.5 text-sm focus:outline-none"
          style={{ border: '1px solid #e0e0e0', background: '#ffffff', color: '#0f1924' }}>
          {CADENCE_OPTIONS.map(o => <option key={o.days} value={o.days}>{o.label}</option>)}
        </select>
      </Row>
      <Row>
        <div>
          <p className="text-sm font-medium" style={{ color: '#0f1924' }}>Active deal cadence</p>
          <p className="text-xs mt-0.5" style={{ color: '#848d9a' }}>Post-SQO champions</p>
        </div>
        <select value={local.active_deal_days}
          onChange={e => setLocal(p => ({ ...p, active_deal_days: Number(e.target.value) }))}
          className="rounded-lg px-3 py-1.5 text-sm focus:outline-none"
          style={{ border: '1px solid #e0e0e0', background: '#ffffff', color: '#0f1924' }}>
          {CADENCE_OPTIONS.map(o => <option key={o.days} value={o.days}>{o.label}</option>)}
        </select>
      </Row>
      <Row>
        <div>
          <p className="text-sm font-medium" style={{ color: '#0f1924' }}>Overdue threshold</p>
          <p className="text-xs mt-0.5" style={{ color: '#848d9a' }}>Days overdue before marking as red</p>
        </div>
        <select value={local.overdue_threshold_days}
          onChange={e => setLocal(p => ({ ...p, overdue_threshold_days: Number(e.target.value) }))}
          className="rounded-lg px-3 py-1.5 text-sm focus:outline-none"
          style={{ border: '1px solid #e0e0e0', background: '#ffffff', color: '#0f1924' }}>
          {OVERDUE_OPTIONS.map(o => <option key={o.days} value={o.days}>{o.label}</option>)}
        </select>
      </Row>
      <div className="px-5 py-3" style={{ borderTop: '1px solid #f0f0f0' }}>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-40"
          style={{ background: '#0f1924', color: '#fff' }}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {saved ? '✓ Saved' : 'Save cadence rules'}
        </button>
      </div>
    </Section>
  )
}

function NotificationsSection({ settings, onChange }) {
  const [local, setLocal] = useState(null)
  const [saving, setSaving] = useState(null) // key of the toggle being saved

  useEffect(() => { if (settings) setLocal(settings.notifications) }, [settings])

  const toggle = async (key) => {
    const next = { ...local, [key]: !local[key] }
    setLocal(next)
    setSaving(key)
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notifications: { [key]: next[key] } }),
    })
    setSaving(null)
    onChange?.()
  }

  const items = [
    { key: 'pre_call_briefs', label: 'Pre-call briefs', desc: '30 minutes before a meeting with a champion' },
    { key: 'sports_triggers', label: 'Sports triggers', desc: 'Results and fixtures relevant to champions' },
    { key: 'cadence_alerts', label: 'Cadence alerts', desc: 'When a champion is approaching or overdue' },
    { key: 'stage_prompts', label: 'Stage progression prompts', desc: "Suggestions to advance a champion's stage" },
  ]

  if (!local) return (
    <Section icon={Bell} title="Notifications">
      <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin" style={{ color: '#59bbb7' }} /></div>
    </Section>
  )

  return (
    <Section icon={Bell} title="Notifications">
      {items.map(n => (
        <Row key={n.key}>
          <div>
            <p className="text-sm font-medium" style={{ color: '#0f1924' }}>{n.label}</p>
            <p className="text-xs mt-0.5" style={{ color: '#848d9a' }}>{n.desc}</p>
          </div>
          <button
            onClick={() => toggle(n.key)}
            disabled={saving === n.key}
            className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-60"
            style={{ background: local[n.key] ? '#59bbb7' : '#e0e0e0' }}>
            {saving === n.key
              ? <Loader2 className="absolute inset-0 m-auto h-3 w-3 animate-spin" style={{ color: local[n.key] ? '#fff' : '#848d9a' }} />
              : <span className="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform"
                  style={{ transform: local[n.key] ? 'translateX(18px)' : 'translateX(2px)' }} />
            }
          </button>
        </Row>
      ))}
    </Section>
  )
}

// ── Main Settings page ─────────────────────────────────────

export default function Settings() {
  const [settings, setSettings] = useState(null)

  const loadSettings = useCallback(() => {
    fetch('/api/settings').then(r => r.json()).then(setSettings).catch(() => {})
  }, [])

  useEffect(() => { loadSettings() }, [loadSettings])

  return (
    <div className="h-full overflow-auto" style={{ background: '#ffffff' }}>
      <div className="max-w-2xl mx-auto px-8 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0f1924' }}>Settings</h1>
          <p className="text-sm mt-1" style={{ color: '#848d9a' }}>Configure Hey Buddy to work the way you work.</p>
        </div>

        <ProfileSection />

        <UsersSection />

        <CadenceSection settings={settings} onChange={loadSettings} />

        <NotificationsSection settings={settings} onChange={loadSettings} />

        <Section icon={Link} title="Integrations">
          {integrations.map(int => (
            <Row key={int.name}>
              <div>
                <p className="text-sm font-medium" style={{ color: '#0f1924' }}>{int.name}</p>
                <p className="text-xs mt-0.5" style={{ color: '#848d9a' }}>{int.description}</p>
              </div>
              <span className="rounded-full px-2.5 py-1 text-xs font-medium"
                style={{ background: '#f0f0f0', color: '#848d9a' }}>Coming soon</span>
            </Row>
          ))}
        </Section>
      </div>
    </div>
  )
}
