import Database from 'better-sqlite3'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { v4 as uuidv4 } from 'uuid'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = process.env.DB_PATH || join(__dirname, '../db/hey-buddy.sqlite')
const SCHEMA_PATH = join(__dirname, '../db/schema.sql')

let db

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    const schema = readFileSync(SCHEMA_PATH, 'utf8')
    db.exec(schema)
    // Migrations for columns added after initial deploy
    try { db.exec('ALTER TABLE triggers ADD COLUMN fire_at TEXT') } catch {}
    try { db.exec('ALTER TABLE intelligence_items ADD COLUMN dismiss_reason TEXT') } catch {}
    try { db.exec('ALTER TABLE intelligence_items ADD COLUMN dismiss_note TEXT') } catch {}
  }
  return db
}

// For tests: reset the singleton so each test suite gets a fresh DB
export function resetDb() {
  if (db) { try { db.close() } catch {} }
  db = null
}

// ── Champions ──────────────────────────────────────────────

export function listChampions({ includeArchived = false } = {}) {
  const db = getDb()
  const sql = includeArchived
    ? 'SELECT * FROM champions ORDER BY updated_at DESC'
    : 'SELECT * FROM champions WHERE archived = 0 ORDER BY updated_at DESC'
  const champions = db.prepare(sql).all()
  return champions.map(enrichChampion)
}

export function getChampion(id) {
  const db = getDb()
  const champion = db.prepare('SELECT * FROM champions WHERE id = ?').get(id)
  if (!champion) return null
  return enrichChampion(champion)
}

function enrichChampion(champion) {
  const db = getDb()
  const latestScore = db.prepare('SELECT score FROM health_scores WHERE champion_id = ? ORDER BY computed_at DESC LIMIT 1').get(champion.id)
  return {
    ...champion,
    health_score: latestScore?.score ?? null,
    personalWins: db.prepare('SELECT * FROM personal_wins WHERE champion_id = ?').all(champion.id),
    professionalWins: db.prepare('SELECT * FROM professional_wins WHERE champion_id = ?').all(champion.id),
    stageCriteria: getStageCriteria(champion.id),
    interactions: db.prepare('SELECT * FROM interactions WHERE champion_id = ? ORDER BY date DESC').all(champion.id),
    triggers: db.prepare('SELECT * FROM triggers WHERE champion_id = ? ORDER BY created_at DESC').all(champion.id),
    interests: db.prepare(`
      SELECT s.id, s.name, s.type, cs.confidence, cs.evidence
      FROM champion_subjects cs
      JOIN subjects s ON s.id = cs.subject_id
      WHERE cs.champion_id = ?
      ORDER BY cs.confidence DESC, s.name ASC
    `).all(champion.id),
  }
}

function getStageCriteria(championId) {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM stage_criteria WHERE champion_id = ?').all(championId)
  const grouped = {}
  for (const row of rows) {
    if (!grouped[row.transition]) grouped[row.transition] = []
    grouped[row.transition].push({ key: row.criterion_key, label: row.criterion_label, met: !!row.met, metAt: row.met_at })
  }
  return grouped
}

export function addChampion(data) {
  const db = getDb()

  // Dedup: return existing champion if same name + company already exists
  if (data.name && data.company) {
    const existing = db.prepare(
      'SELECT id FROM champions WHERE LOWER(name) = LOWER(?) AND LOWER(company) = LOWER(?) AND archived = 0 LIMIT 1'
    ).get(data.name.trim(), data.company.trim())
    if (existing) return getChampion(existing.id)
  }

  const id = uuidv4()
  const now = new Date().toISOString()

  db.prepare(`
    INSERT INTO champions (id, name, initials, company, role, type, stage, deal_status, health, linkedin_url, personal_contact, location_city, location_country, owner_id, last_contact_date, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'green', ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.name,
    data.initials || data.name.split(' ').map(w => w[0]).join('').toUpperCase(),
    data.company,
    data.role,
    data.type || 'prospect',
    data.type === 'network' ? 'nurture' : 'identified',
    data.type === 'network' ? 'network' : 'pre-sfo',
    data.linkedin_url || null,
    data.personal_contact || null,
    data.location_city || null,
    data.location_country || null,
    data.owner_id || process.env.TELEGRAM_RICH_ID || null,
    now.split('T')[0],
    now,
    now,
  )

  // Seed stage criteria
  seedStageCriteria(id, data.type || 'prospect')

  return getChampion(id)
}

function seedStageCriteria(championId, type) {
  const db = getDb()

  if (type === 'network') {
    const nurtureCriteria = [
      { key: 'personal_maintenance', label: 'Active personal win maintenance ongoing' },
      { key: 'network_leverage', label: 'Leveraging network for influence to progress your goals' },
    ]
    for (const c of nurtureCriteria) {
      db.prepare(`INSERT INTO stage_criteria (id, champion_id, transition, criterion_key, criterion_label, met) VALUES (?, ?, 'nurture', ?, ?, 0)`)
        .run(uuidv4(), championId, c.key, c.label)
    }
    return
  }

  const allCriteria = {
    'identified-building': [
      { key: 'had_1on1', label: 'Had a 1-1 conversation (not just a group call)' },
      { key: 'personal_win', label: 'Identified at least one personal win' },
      { key: 'professional_win', label: 'Identified at least one professional win' },
    ],
    'building-test': [
      { key: 'confirmed_prof_win', label: 'Explicitly confirmed professional win' },
      { key: 'shared_internal', label: 'Shared internal context' },
      { key: 'non_sales_interaction', label: 'Non-sales interaction (dinner/event/informal)' },
      { key: 'personal_contact', label: 'Have personal contact (mobile/WhatsApp)' },
    ],
    'test-leverage': [
      { key: 'delivered_task', label: 'Delivered on a specific task' },
      { key: 'shared_intel', label: 'Proactively shared competitive/deal-critical intel' },
      { key: 'shown_up', label: "Shown up in a way not directly in their interest" },
    ],
    'leverage': [
      { key: 'influencing_internal', label: 'Influencing internal discussions without you present' },
      { key: 'deal_acceleration', label: 'Connected to deal acceleration' },
      { key: 'personal_maintenance', label: 'Active personal win maintenance ongoing' },
      { key: 'expansion_signals', label: 'Identifying expansion/new opportunity signals' },
    ],
  }

  for (const [transition, criteria] of Object.entries(allCriteria)) {
    for (const c of criteria) {
      db.prepare(`INSERT INTO stage_criteria (id, champion_id, transition, criterion_key, criterion_label, met) VALUES (?, ?, ?, ?, ?, 0)`)
        .run(uuidv4(), championId, transition, c.key, c.label)
    }
  }
}

export function updateChampion(id, data) {
  const db = getDb()
  const now = new Date().toISOString()
  const fields = Object.keys(data).filter(k => !['id', 'created_at'].includes(k))
  const setClause = fields.map(f => `${f} = ?`).join(', ')
  const values = fields.map(f => data[f])
  db.prepare(`UPDATE champions SET ${setClause}, updated_at = ? WHERE id = ?`).run(...values, now, id)
  return getChampion(id)
}

// ── Personal wins ──────────────────────────────────────────

export function addPersonalWin(championId, data) {
  const db = getDb()
  const id = uuidv4()
  db.prepare(`INSERT INTO personal_wins (id, champion_id, category, description, emoji) VALUES (?, ?, ?, ?, ?)`)
    .run(id, championId, data.category || 'other', data.description, data.emoji || null)
  touchChampion(championId)
  // Register subject and cross-reference other champions
  registerSubjectAndCrossReference(championId, data.description, data.category || 'topic', `Personal win: "${data.description}"`)
  return { id, champion_id: championId, ...data }
}

export function addProfessionalWin(championId, data) {
  const db = getDb()
  const id = uuidv4()
  db.prepare(`INSERT INTO professional_wins (id, champion_id, description, confirmed) VALUES (?, ?, ?, 0)`)
    .run(id, championId, data.description)
  touchChampion(championId)
  return { id, champion_id: championId, ...data, confirmed: 0 }
}

export function confirmProfessionalWin(winId) {
  const db = getDb()
  const now = new Date().toISOString()
  db.prepare(`UPDATE professional_wins SET confirmed = 1, confirmed_at = ? WHERE id = ?`).run(now, winId)
}

// ── Interactions ───────────────────────────────────────────

export function addInteraction(championId, data) {
  const db = getDb()
  const id = uuidv4()
  const date = data.date || new Date().toISOString().split('T')[0]
  db.prepare(`INSERT INTO interactions (id, champion_id, date, type, notes, message_sent) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(id, championId, date, data.type || 'Call', data.notes || null, data.message_sent || null)
  db.prepare(`UPDATE champions SET last_contact_date = ?, last_contact_type = ?, updated_at = ? WHERE id = ?`)
    .run(date, data.type || 'Call', new Date().toISOString(), championId)
  touchChampion(championId)
  return { id, champion_id: championId, date, ...data }
}

// ── Stage criteria ─────────────────────────────────────────

export function updateStageCriteria(championId, transition, criterionKey, met) {
  const db = getDb()
  const now = new Date().toISOString()
  db.prepare(`UPDATE stage_criteria SET met = ?, met_at = ? WHERE champion_id = ? AND transition = ? AND criterion_key = ?`)
    .run(met ? 1 : 0, met ? now : null, championId, transition, criterionKey)
  touchChampion(championId)
}

// ── Triggers ───────────────────────────────────────────────

export function addTrigger(championId, data) {
  const db = getDb()
  const id = uuidv4()
  const now = new Date().toISOString()
  db.prepare(`INSERT INTO triggers (id, champion_id, trigger_type, title, description, suggested_message, schedule, fire_at, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`)
    .run(id, championId, data.trigger_type || 'custom', data.title, data.description || null, data.suggested_message || null, data.schedule || null, data.fire_at || null, now)
  return { id, champion_id: championId, status: 'pending', ...data }
}

export function updateTriggerStatus(triggerId, status) {
  const db = getDb()
  db.prepare(`UPDATE triggers SET status = ? WHERE id = ?`).run(status, triggerId)
}

export function updateTrigger(triggerId, data) {
  const db = getDb()
  const fields = ['title', 'description', 'suggested_message', 'schedule', 'fire_at']
  const updates = fields.filter(f => data[f] !== undefined)
  if (!updates.length) return
  const sql = `UPDATE triggers SET ${updates.map(f => `${f} = ?`).join(', ')} WHERE id = ?`
  db.prepare(sql).run(...updates.map(f => data[f] ?? null), triggerId)
}

// ── Bot user allowlist ─────────────────────────────────────

export function isApprovedUser(platform, platformUserId) {
  const db = getDb()
  const user = db.prepare('SELECT id FROM bot_users WHERE platform = ? AND platform_user_id = ?').get(platform, String(platformUserId))
  return !!user
}

export function approveUser(platform, platformUserId, username, displayName, approvedBy, role = 'user') {
  const db = getDb()
  const existing = db.prepare('SELECT id FROM bot_users WHERE platform = ? AND platform_user_id = ?').get(platform, String(platformUserId))
  if (existing) return existing
  const id = uuidv4()
  db.prepare(`
    INSERT INTO bot_users (id, platform, platform_user_id, platform_username, display_name, role, approved_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, platform, String(platformUserId), username, displayName, role, String(approvedBy))
  return db.prepare('SELECT * FROM bot_users WHERE id = ?').get(id)
}

export function revokeUser(platform, platformUserId) {
  const db = getDb()
  db.prepare('DELETE FROM bot_users WHERE platform = ? AND platform_user_id = ?').run(platform, String(platformUserId))
}

export function listBotUsers(platform = 'telegram') {
  const db = getDb()
  return db.prepare('SELECT * FROM bot_users WHERE platform = ? ORDER BY created_at DESC').all(platform)
}

export function isAdmin(platform, platformUserId) {
  const db = getDb()
  const user = db.prepare('SELECT role FROM bot_users WHERE platform = ? AND platform_user_id = ?').get(platform, String(platformUserId))
  return user?.role === 'admin'
}

// ── Telegram sessions ──────────────────────────────────────

export function getTelegramSession(telegramUserId) {
  const db = getDb()
  const session = db.prepare('SELECT * FROM telegram_sessions WHERE telegram_user_id = ?').get(String(telegramUserId))
  if (!session) return { messages: [] }
  return { ...session, messages: JSON.parse(session.messages || '[]') }
}

export function saveTelegramSession(telegramUserId, messages, username = null) {
  const db = getDb()
  const now = new Date().toISOString()
  // Keep last 30 messages to control context window cost
  const trimmed = messages.slice(-30)
  const existing = db.prepare('SELECT id FROM telegram_sessions WHERE telegram_user_id = ?').get(String(telegramUserId))
  if (existing) {
    db.prepare('UPDATE telegram_sessions SET messages = ?, telegram_username = ?, updated_at = ? WHERE telegram_user_id = ?')
      .run(JSON.stringify(trimmed), username, now, String(telegramUserId))
  } else {
    db.prepare('INSERT INTO telegram_sessions (id, telegram_user_id, telegram_username, messages, updated_at) VALUES (?, ?, ?, ?, ?)')
      .run(uuidv4(), String(telegramUserId), username, JSON.stringify(trimmed), now)
  }
}

export function clearTelegramSession(telegramUserId) {
  const db = getDb()
  db.prepare('UPDATE telegram_sessions SET messages = ?, updated_at = ? WHERE telegram_user_id = ?')
    .run('[]', new Date().toISOString(), String(telegramUserId))
}

// ── Archive ────────────────────────────────────────────────

export function archiveChampion(id) {
  const db = getDb()
  const now = new Date().toISOString()
  db.prepare('UPDATE champions SET archived = 1, archived_at = ?, updated_at = ? WHERE id = ?').run(now, now, id)
  return getChampion(id)
}

export function unarchiveChampion(id) {
  const db = getDb()
  const now = new Date().toISOString()
  db.prepare('UPDATE champions SET archived = 0, archived_at = NULL, updated_at = ? WHERE id = ?').run(now, id)
  return getChampion(id)
}

// ── Feedback ───────────────────────────────────────────────

export function addFeedback(data) {
  const db = getDb()
  const id = uuidv4()
  db.prepare(`
    INSERT INTO feedback (id, type, title, description, screenshot_path, submitted_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, data.type || 'feature', data.title, data.description || null, data.screenshot_path || null, data.submitted_by || 'rich')
  return db.prepare('SELECT * FROM feedback WHERE id = ?').get(id)
}

export function listFeedback({ status } = {}) {
  const db = getDb()
  if (status) return db.prepare('SELECT * FROM feedback WHERE status = ? ORDER BY created_at DESC').all(status)
  return db.prepare('SELECT * FROM feedback ORDER BY created_at DESC').all()
}

export function updateFeedbackStatus(id, status) {
  const db = getDb()
  db.prepare('UPDATE feedback SET status = ? WHERE id = ?').run(status, id)
  return db.prepare('SELECT * FROM feedback WHERE id = ?').get(id)
}

// ── Location triggers ──────────────────────────────────────

export function getChampionsByLocation(city, country) {
  const db = getDb()
  const rows = db.prepare(`
    SELECT * FROM champions
    WHERE archived = 0
    AND (LOWER(location_city) = LOWER(?) OR LOWER(location_country) = LOWER(?))
    ORDER BY name
  `).all(city || '', country || '')
  return rows.map(enrichChampion)
}

// ── Subject registry ───────────────────────────────────────

export function listSubjects() {
  const db = getDb()
  return db.prepare('SELECT * FROM subjects ORDER BY name').all()
}

export function findOrCreateSubject(name, type = 'topic') {
  const db = getDb()
  const normalised = name.trim()

  // Try exact match first
  let subject = db.prepare('SELECT * FROM subjects WHERE LOWER(name) = LOWER(?)').get(normalised)
  if (subject) return subject

  // Try alias match
  const allSubjects = db.prepare('SELECT * FROM subjects WHERE aliases IS NOT NULL').all()
  for (const s of allSubjects) {
    try {
      const aliases = JSON.parse(s.aliases || '[]')
      if (aliases.some(a => a.toLowerCase() === normalised.toLowerCase())) return s
    } catch {}
  }

  // Fuzzy: check if any existing subject name is contained within the new name or vice versa
  const fuzzy = db.prepare('SELECT * FROM subjects').all()
  for (const s of fuzzy) {
    const a = s.name.toLowerCase()
    const b = normalised.toLowerCase()
    if (a.includes(b) || b.includes(a)) return s
  }

  // Create new subject
  const id = uuidv4()
  db.prepare(`INSERT INTO subjects (id, name, type) VALUES (?, ?, ?)`).run(id, normalised, type)
  return db.prepare('SELECT * FROM subjects WHERE id = ?').get(id)
}

export function linkChampionToSubject(championId, subjectId, confidence = 'explicit', evidence = null) {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM champion_subjects WHERE champion_id = ? AND subject_id = ?').get(championId, subjectId)
  if (existing) {
    // Upgrade confidence if better evidence
    const tier = { discovered: 0, inferred: 1, explicit: 2 }
    if ((tier[confidence] || 0) > (tier[existing.confidence] || 0)) {
      db.prepare('UPDATE champion_subjects SET confidence = ?, evidence = ? WHERE id = ?').run(confidence, evidence, existing.id)
    }
    return existing
  }
  const id = uuidv4()
  db.prepare(`INSERT INTO champion_subjects (id, champion_id, subject_id, confidence, evidence) VALUES (?, ?, ?, ?, ?)`)
    .run(id, championId, subjectId, confidence, evidence)
  return db.prepare('SELECT * FROM champion_subjects WHERE id = ?').get(id)
}

// When a personal win or trigger is added, register the subject and cross-reference other champions
export function registerSubjectAndCrossReference(newChampionId, subjectName, subjectType, evidence) {
  const db = getDb()
  const subject = findOrCreateSubject(subjectName, subjectType)

  // Link the originating champion explicitly
  linkChampionToSubject(newChampionId, subject.id, 'explicit', evidence)

  // Cross-reference all other champions — look in personal_wins and interactions
  const others = db.prepare('SELECT * FROM champions WHERE id != ?').all(newChampionId)
  const discovered = []

  for (const champ of others) {
    // Already linked?
    const alreadyLinked = db.prepare('SELECT id FROM champion_subjects WHERE champion_id = ? AND subject_id = ?').get(champ.id, subject.id)
    if (alreadyLinked) continue

    // Search personal wins
    const wins = db.prepare('SELECT * FROM personal_wins WHERE champion_id = ?').all(champ.id)
    const matched = wins.find(w => {
      const d = w.description.toLowerCase()
      const n = subjectName.toLowerCase()
      return d.includes(n) || n.split(' ').filter(w => w.length > 3).every(word => d.includes(word))
    })

    if (matched) {
      // Auto-link as 'discovered' — surfaces as a pending trigger for confirmation
      linkChampionToSubject(champ.id, subject.id, 'discovered', `Found in personal win: "${matched.description}"`)
      discovered.push({ champion: champ, subject, evidence: matched.description })
    }
  }

  return { subject, discovered }
}

// ── Pending triggers ───────────────────────────────────────

export function listPendingTriggers() {
  const db = getDb()
  const rows = db.prepare(`
    SELECT pt.*, c.name as champion_name, c.company as champion_company
    FROM pending_triggers pt
    JOIN champions c ON c.id = pt.champion_id
    WHERE pt.status = 'pending'
    ORDER BY pt.created_at DESC
  `).all()
  return rows
}

export function addPendingTrigger(championId, data) {
  const db = getDb()
  const id = uuidv4()
  db.prepare(`
    INSERT INTO pending_triggers (id, champion_id, subject_name, subject_type, evidence, confidence, proposed_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, championId, data.subject_name, data.subject_type || 'topic', data.evidence, data.confidence || 'high', data.proposed_by || 'agent')
  return db.prepare('SELECT * FROM pending_triggers WHERE id = ?').get(id)
}

export function resolvePendingTrigger(id, action) {
  const db = getDb()
  const pending = db.prepare('SELECT * FROM pending_triggers WHERE id = ?').get(id)
  if (!pending) return null

  db.prepare('UPDATE pending_triggers SET status = ? WHERE id = ?').run(action, id)

  if (action === 'approved') {
    // Register as an interest/subject — NOT a trigger/action
    const subject = findOrCreateSubject(pending.subject_name, pending.subject_type)
    linkChampionToSubject(pending.champion_id, subject.id, 'explicit', pending.evidence)
  }

  return pending
}

// ── Health scoring ─────────────────────────────────────────

export function computeHealthScore(championId, ownerId = 'rich') {
  const db = getDb()
  const champion = db.prepare('SELECT * FROM champions WHERE id = ?').get(championId)
  if (!champion) return null

  // Pull live cadence settings (falls back to defaults if not set)
  const s = getSettings(ownerId)
  const defaultCadenceDays = s.cadence_default_days
  const activeDealCadenceDays = s.cadence_active_deal_days

  const now = Date.now()

  // ── Recency score (0–40) ──
  let recencyScore = 0
  if (champion.last_contact_date) {
    const daysSince = Math.floor((now - new Date(champion.last_contact_date)) / 86400000)
    const cadence = champion.deal_status === 'post-sfo' ? activeDealCadenceDays : defaultCadenceDays
    const ratio = daysSince / cadence
    if (ratio <= 0.5) recencyScore = 40
    else if (ratio <= 1.0) recencyScore = Math.round(40 - (ratio - 0.5) * 40)
    else if (ratio <= 2.0) recencyScore = Math.round(20 - (ratio - 1.0) * 20)
    else recencyScore = 0
  }

  // ── Profile completeness (0–25) ──
  let profileScore = 0
  const personalWins = db.prepare('SELECT COUNT(*) as n FROM personal_wins WHERE champion_id = ?').get(championId)
  const professionalWins = db.prepare('SELECT * FROM professional_wins WHERE champion_id = ?').all(championId)
  if (personalWins.n > 0) profileScore += 8
  if (professionalWins.length > 0) profileScore += 7
  if (professionalWins.some(w => w.confirmed)) profileScore += 6
  if (champion.personal_contact) profileScore += 4

  // ── Momentum (0–20): interactions in last 90 days ──
  const cutoff = new Date(now - 90 * 86400000).toISOString().split('T')[0]
  const recentInteractions = db.prepare(`
    SELECT type FROM interactions WHERE champion_id = ? AND date >= ? ORDER BY date DESC
  `).all(championId, cutoff)

  let momentumScore = 0
  const highQuality = ['Call', 'Meeting', 'Dinner', 'Event']
  const highCount = recentInteractions.filter(i => highQuality.includes(i.type)).length
  const types = new Set(recentInteractions.map(i => i.type))
  momentumScore = Math.min(12, highCount * 4)       // up to 12 from quality interactions
  if (types.size >= 3) momentumScore += 5             // diversity bonus
  if (recentInteractions.length >= 5) momentumScore += 3 // volume bonus
  momentumScore = Math.min(20, momentumScore)

  // ── Stage progress (0–15): % of criteria met for current transition ──
  let stageScore = 0
  const stageTransitionMap = {
    identified: 'identified-building',
    building: 'building-test',
    test: 'test-leverage',
    leverage: 'leverage',
    nurture: 'nurture',
  }
  const transition = stageTransitionMap[champion.stage]
  if (transition) {
    const criteria = db.prepare('SELECT met FROM stage_criteria WHERE champion_id = ? AND transition = ?').all(championId, transition)
    if (criteria.length > 0) {
      const metCount = criteria.filter(c => c.met).length
      stageScore = Math.round((metCount / criteria.length) * 15)
    }
  }

  const score = recencyScore + profileScore + momentumScore + stageScore

  // Persist snapshot
  const id = uuidv4()
  db.prepare(`
    INSERT INTO health_scores (id, champion_id, score, recency_score, profile_score, momentum_score, stage_score)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, championId, score, recencyScore, profileScore, momentumScore, stageScore)

  // Update champion health traffic light
  const health = score >= 65 ? 'green' : score >= 35 ? 'amber' : 'red'
  db.prepare('UPDATE champions SET health = ? WHERE id = ?').run(health, championId)

  return { score, recencyScore, profileScore, momentumScore, stageScore, health }
}

export function getHealthScore(championId) {
  const db = getDb()
  const latest = db.prepare(`
    SELECT * FROM health_scores WHERE champion_id = ? ORDER BY computed_at DESC LIMIT 1
  `).get(championId)
  if (!latest) return computeHealthScore(championId)
  return latest
}

// ── Utilities ──────────────────────────────────────────────

function touchChampion(id) {
  const db = getDb()
  db.prepare(`UPDATE champions SET updated_at = ? WHERE id = ?`).run(new Date().toISOString(), id)
  // Recompute health score whenever champion data changes
  computeHealthScore(id)
}

export function seedMockData() {
  const db = getDb()
  const existing = db.prepare('SELECT COUNT(*) as count FROM champions').get()
  if (existing.count > 0) return // Already seeded

  const champions = [
    {
      id: 'c1', name: 'James Mitchell', initials: 'JM', company: 'Aviva',
      role: 'Chief Technology Officer', type: 'prospect', stage: 'building',
      deal_status: 'post-sfo', health: 'red', linkedin_url: 'https://www.linkedin.com/in/james-mitchell-aviva',
      personal_contact: '+44 7700 900123', last_contact_date: '2026-02-21', last_contact_type: 'Call',
      location_city: 'London', location_country: 'UK',
    },
    {
      id: 'c2', name: 'Sarah Clarke', initials: 'SC', company: "Lloyd's of London",
      role: 'Chief Risk Officer', type: 'prospect', stage: 'identified',
      deal_status: 'pre-sfo', health: 'green', linkedin_url: 'https://www.linkedin.com/in/sarah-clarke-lloyds',
      personal_contact: null, last_contact_date: '2026-02-08', last_contact_type: 'Call',
      location_city: 'London', location_country: 'UK',
    },
    {
      id: 'c3', name: 'Michael Chen', initials: 'MC', company: 'AXA UK',
      role: 'Chief Operating Officer', type: 'prospect', stage: 'test',
      deal_status: 'post-sfo', health: 'amber', linkedin_url: 'https://www.linkedin.com/in/michael-chen-axa',
      personal_contact: '+44 7911 123456', last_contact_date: '2026-02-23', last_contact_type: 'Email',
      location_city: 'London', location_country: 'UK',
    },
    {
      id: 'c4', name: 'Emma Walsh', initials: 'EW', company: 'Zurich Insurance',
      role: 'Chief Information Officer', type: 'prospect', stage: 'leverage',
      deal_status: 'post-sfo', health: 'green', linkedin_url: 'https://www.linkedin.com/in/emma-walsh-zurich',
      personal_contact: '+44 7800 234567', last_contact_date: '2026-03-01', last_contact_type: 'Call',
      location_city: 'Zurich', location_country: 'Switzerland',
    },
    {
      id: 'c5', name: 'David Patel', initials: 'DP', company: 'Allianz UK',
      role: 'Chief Data Officer', type: 'prospect', stage: 'building',
      deal_status: 'pre-sfo', health: 'amber', linkedin_url: 'https://www.linkedin.com/in/david-patel-allianz',
      personal_contact: null, last_contact_date: '2026-02-15', last_contact_type: 'Call',
      location_city: 'London', location_country: 'UK',
    },
    {
      id: 'c6', name: 'Claire Sutton', initials: 'CS', company: 'Swiss Re',
      role: 'Head of Innovation', type: 'network', stage: 'nurture',
      deal_status: 'network', health: 'green', linkedin_url: 'https://www.linkedin.com/in/claire-sutton-swissre',
      personal_contact: '+44 7722 456789', last_contact_date: '2026-02-20', last_contact_type: 'Call',
      location_city: 'Zurich', location_country: 'Switzerland',
    },
  ]

  const now = new Date().toISOString()
  const seedOwnerId = process.env.TELEGRAM_RICH_ID || null
  for (const c of champions) {
    db.prepare(`
      INSERT INTO champions (id, name, initials, company, role, type, stage, deal_status, health, linkedin_url, personal_contact, location_city, location_country, owner_id, last_contact_date, last_contact_type, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(c.id, c.name, c.initials, c.company, c.role, c.type, c.stage, c.deal_status, c.health,
      c.linkedin_url, c.personal_contact, c.location_city || null, c.location_country || null,
      seedOwnerId, c.last_contact_date, c.last_contact_type, now, now)
    seedStageCriteria(c.id, c.type)
  }

  // Personal wins
  const personalWins = [
    { id: 'pw1', champion_id: 'c1', category: 'sport', description: 'Chelsea FC season ticket holder', emoji: '⚽' },
    { id: 'pw2', champion_id: 'c1', category: 'ambition', description: 'Training for Ironman triathlon in 2026', emoji: '🏊' },
    { id: 'pw3', champion_id: 'c2', category: 'sport', description: 'England rugby fan — follows Six Nations closely', emoji: '🏉' },
    { id: 'pw4', champion_id: 'c3', category: 'sport', description: 'Golf — member at Wentworth, plays regularly', emoji: '⛳' },
    { id: 'pw5', champion_id: 'c3', category: 'hobby', description: 'Fine wine collector, particularly Burgundy', emoji: '🍷' },
    { id: 'pw6', champion_id: 'c4', category: 'sport', description: 'Tennis — plays club level, follows Wimbledon closely', emoji: '🎾' },
    { id: 'pw7', champion_id: 'c4', category: 'ambition', description: 'Aspires to Group CIO role — very career-driven', emoji: '🎯' },
    { id: 'pw8', champion_id: 'c5', category: 'sport', description: 'India cricket — huge fan, follows every series', emoji: '🏏' },
    { id: 'pw9', champion_id: 'c5', category: 'ambition', description: 'Building a data science capability from scratch — his legacy project', emoji: '📊' },
    { id: 'pw10', champion_id: 'c6', category: 'hobby', description: 'Loves positive news — sends a weekly feel-good newsletter to her network', emoji: '🌟' },
    { id: 'pw11', champion_id: 'c6', category: 'ambition', description: 'Building her own advisory practice on the side', emoji: '🚀' },
  ]
  for (const w of personalWins) {
    db.prepare(`INSERT INTO personal_wins (id, champion_id, category, description, emoji) VALUES (?, ?, ?, ?, ?)`).run(w.id, w.champion_id, w.category, w.description, w.emoji)
  }

  // Professional wins
  const professionalWins = [
    { id: 'prw1', champion_id: 'c1', description: 'Driving 40% reduction in claims processing time through AI — tied to our platform', confirmed: 1 },
    { id: 'prw2', champion_id: 'c2', description: 'Modernising risk modelling infrastructure — board pressure on exposure concentration', confirmed: 0 },
    { id: 'prw3', champion_id: 'c3', description: 'Consolidating 3 legacy ops platforms — must deliver by Q3 2026', confirmed: 1 },
    { id: 'prw4', champion_id: 'c4', description: 'First major tech transformation — career-defining. Success = Group CIO path opens.', confirmed: 1 },
    { id: 'prw5', champion_id: 'c5', description: 'Modernising data governance — our platform is the data layer for his team', confirmed: 0 },
  ]
  for (const w of professionalWins) {
    db.prepare(`INSERT INTO professional_wins (id, champion_id, description, confirmed) VALUES (?, ?, ?, ?)`).run(w.id, w.champion_id, w.description, w.confirmed)
  }

  // Some stage criteria met
  const metCriteria = [
    ['c1', 'identified-building', 'had_1on1'],
    ['c1', 'identified-building', 'personal_win'],
    ['c1', 'identified-building', 'professional_win'],
    ['c1', 'building-test', 'confirmed_prof_win'],
    ['c1', 'building-test', 'shared_internal'],
    ['c1', 'building-test', 'personal_contact'],
    ['c2', 'identified-building', 'had_1on1'],
    ['c2', 'identified-building', 'personal_win'],
    ['c3', 'identified-building', 'had_1on1'],
    ['c3', 'identified-building', 'personal_win'],
    ['c3', 'identified-building', 'professional_win'],
    ['c3', 'building-test', 'confirmed_prof_win'],
    ['c3', 'building-test', 'shared_internal'],
    ['c3', 'building-test', 'non_sales_interaction'],
    ['c3', 'building-test', 'personal_contact'],
    ['c3', 'test-leverage', 'delivered_task'],
    ['c3', 'test-leverage', 'shared_intel'],
    ['c4', 'identified-building', 'had_1on1'],
    ['c4', 'identified-building', 'personal_win'],
    ['c4', 'identified-building', 'professional_win'],
    ['c4', 'building-test', 'confirmed_prof_win'],
    ['c4', 'building-test', 'shared_internal'],
    ['c4', 'building-test', 'non_sales_interaction'],
    ['c4', 'building-test', 'personal_contact'],
    ['c4', 'test-leverage', 'delivered_task'],
    ['c4', 'test-leverage', 'shared_intel'],
    ['c4', 'test-leverage', 'shown_up'],
    ['c4', 'leverage', 'influencing_internal'],
    ['c4', 'leverage', 'deal_acceleration'],
    ['c5', 'identified-building', 'had_1on1'],
    ['c5', 'identified-building', 'personal_win'],
    ['c5', 'identified-building', 'professional_win'],
    ['c6', 'nurture', 'personal_maintenance'],
  ]

  const metAt = now
  for (const [cid, transition, key] of metCriteria) {
    db.prepare(`UPDATE stage_criteria SET met = 1, met_at = ? WHERE champion_id = ? AND transition = ? AND criterion_key = ?`)
      .run(metAt, cid, transition, key)
  }

  // Interactions
  const interactions = [
    { id: 'i1', champion_id: 'c1', date: '2026-02-21', type: 'Call', notes: 'Quarterly review. Confirmed professional win re: claims processing. Mentioned Chelsea at weekend.' },
    { id: 'i2', champion_id: 'c1', date: '2026-01-15', type: 'Email', notes: 'Sent article on generative AI in insurance claims. He replied positively.' },
    { id: 'i3', champion_id: 'c1', date: '2025-12-10', type: 'Meeting', notes: 'In-person at Aviva HQ. First real 1-1. Got his mobile.' },
    { id: 'i4', champion_id: 'c2', date: '2026-02-08', type: 'Call', notes: 'First call via intro from account team. England rugby mentioned unprompted.' },
    { id: 'i5', champion_id: 'c3', date: '2026-02-23', type: 'Email', notes: "Forwarded competitor proposal (Guidewire) unprompted. Massive signal." },
    { id: 'i6', champion_id: 'c3', date: '2026-02-10', type: 'Dinner', notes: 'Dinner at The Ledbury. Opened up about Q3 board pressure.' },
    { id: 'i7', champion_id: 'c3', date: '2026-01-28', type: 'Call', notes: '"This could make or break my year" — he said it explicitly.' },
    { id: 'i8', champion_id: 'c4', date: '2026-03-01', type: 'Call', notes: 'She ran the steering committee and pushed our solution through. Deal near close.' },
    { id: 'i9', champion_id: 'c4', date: '2026-02-14', type: 'Gift', notes: 'Sent Wimbledon debenture tickets. She was thrilled.' },
    { id: 'i10', champion_id: 'c4', date: '2026-02-05', type: 'Call', notes: 'She shared the internal decision timeline. Trust fully established.' },
    { id: 'i11', champion_id: 'c5', date: '2026-02-15', type: 'Call', notes: 'Second call. Opened up on data governance ambitions. India cricket passion noted.' },
    { id: 'i12', champion_id: 'c5', date: '2026-01-22', type: 'Call', notes: 'Intro call via LinkedIn. Good vibes. Data modernisation discussion.' },
    { id: 'i13', champion_id: 'c6', date: '2026-02-20', type: 'Call', notes: 'Monthly catch-up. Discussed innovation trends in re-insurance. Good energy.' },
  ]
  for (const i of interactions) {
    db.prepare(`INSERT INTO interactions (id, champion_id, date, type, notes) VALUES (?, ?, ?, ?, ?)`).run(i.id, i.champion_id, i.date, i.type, i.notes)
  }

  // Triggers
  const triggers = [
    { id: 't1', champion_id: 'c1', trigger_type: 'sports', title: 'Chelsea beat Aston Villa 4-1', description: 'Great result last night', status: 'pending', suggested_message: "James — what a result last night! Cole Palmer was unreal. Hope you caught it 🔵", schedule: null },
    { id: 't2', champion_id: 'c2', trigger_type: 'sports', title: 'Italy vs England — Six Nations, Sat Mar 7', description: 'England rugby away in Rome', status: 'pending', suggested_message: "Sarah — big game on Saturday! Italy away is always tricky. Fingers crossed 🏉", schedule: null },
    { id: 't3', champion_id: 'c6', trigger_type: 'custom', title: 'Weekly positive news newsletter', description: 'Send Claire the weekly feel-good news digest she loves', status: 'pending', suggested_message: null, schedule: 'weekly' },
  ]
  for (const t of triggers) {
    db.prepare(`INSERT INTO triggers (id, champion_id, trigger_type, title, description, suggested_message, schedule, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(t.id, t.champion_id, t.trigger_type, t.title, t.description, t.suggested_message, t.schedule, t.status, now)
  }

  // Compute initial health scores for all seeded champions
  for (const c of champions) {
    computeHealthScore(c.id)
  }

  // Seed Rich as admin
  const richId = process.env.TELEGRAM_RICH_ID
  if (richId) {
    approveUser('telegram', richId, 'rich', 'Rich Gunn', richId, 'admin')
  }
}

// ── User profiles ─────────────────────────────────────────────────────────────

export function getUserProfile(ownerId) {
  const db = getDb()
  const row = db.prepare('SELECT * FROM user_profiles WHERE owner_id = ?').get(ownerId)
  if (!row) return null
  return {
    ...row,
    sports_teams: JSON.parse(row.sports_teams || '[]'),
    interests: JSON.parse(row.interests || '[]'),
  }
}

export function saveUserProfile(ownerId, data) {
  const db = getDb()
  const existing = db.prepare('SELECT id FROM user_profiles WHERE owner_id = ?').get(ownerId)
  const now = new Date().toISOString()
  if (existing) {
    db.prepare(`
      UPDATE user_profiles SET
        display_name = COALESCE(?, display_name),
        role_title = COALESCE(?, role_title),
        home_city = COALESCE(?, home_city),
        sports_teams = COALESCE(?, sports_teams),
        interests = COALESCE(?, interests),
        comms_preference = COALESCE(?, comms_preference),
        preferred_channel = COALESCE(?, preferred_channel),
        onboarding_complete = COALESCE(?, onboarding_complete),
        updated_at = ?
      WHERE owner_id = ?
    `).run(
      data.display_name ?? null,
      data.role_title ?? null,
      data.home_city ?? null,
      data.sports_teams != null ? JSON.stringify(data.sports_teams) : null,
      data.interests != null ? JSON.stringify(data.interests) : null,
      data.comms_preference ?? null,
      data.preferred_channel ?? null,
      data.onboarding_complete != null ? data.onboarding_complete : null,
      now,
      ownerId
    )
  } else {
    db.prepare(`
      INSERT INTO user_profiles (id, owner_id, display_name, role_title, home_city, sports_teams, interests, comms_preference, preferred_channel, onboarding_complete, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      ownerId,
      data.display_name ?? null,
      data.role_title ?? null,
      data.home_city ?? null,
      JSON.stringify(data.sports_teams ?? []),
      JSON.stringify(data.interests ?? []),
      data.comms_preference ?? 'casual',
      data.preferred_channel ?? 'short',
      data.onboarding_complete ?? 0,
      now, now
    )
  }
  return getUserProfile(ownerId)
}

// ── Tone samples ──────────────────────────────────────────────────────────────

export function addToneSample(ownerId, sampleText, channel = 'short', source = 'onboarding') {
  const db = getDb()
  const id = crypto.randomUUID()
  db.prepare(`
    INSERT INTO tone_samples (id, owner_id, sample_text, channel, source, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, ownerId, sampleText, channel, source, new Date().toISOString())
  return id
}

export function listToneSamples(ownerId, channel = null) {
  const db = getDb()
  if (channel) {
    return db.prepare('SELECT * FROM tone_samples WHERE owner_id = ? AND channel = ? ORDER BY created_at DESC').all(ownerId, channel)
  }
  return db.prepare('SELECT * FROM tone_samples WHERE owner_id = ? ORDER BY channel, created_at DESC').all(ownerId)
}

export function deleteToneSample(id, ownerId) {
  const db = getDb()
  db.prepare('DELETE FROM tone_samples WHERE id = ? AND owner_id = ?').run(id, ownerId)
}

// ── Sent messages (feedback loop) ────────────────────────────────────────────

export function addSentMessage(ownerId, championId, suggestedText, actualText, channel = 'short') {
  const db = getDb()
  const id = crypto.randomUUID()
  db.prepare(`
    INSERT INTO sent_messages (id, owner_id, champion_id, suggested_text, actual_text, channel, sent_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, ownerId, championId || null, suggestedText || null, actualText, channel, new Date().toISOString())
  return id
}

export function listSentMessages(ownerId, { limit = 20 } = {}) {
  const db = getDb()
  return db.prepare('SELECT * FROM sent_messages WHERE owner_id = ? ORDER BY sent_at DESC LIMIT ?').all(ownerId, limit)
}

// ── Settings ─────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS = {
  cadence_default_days: 30,
  cadence_active_deal_days: 14,
  overdue_threshold_days: 5,
  notify_pre_call_briefs: 1,
  notify_sports_triggers: 1,
  notify_cadence_alerts: 1,
  notify_stage_prompts: 0,
}

export function getSettings(ownerId = 'rich') {
  const db = getDb()
  const row = db.prepare('SELECT * FROM settings WHERE owner_id = ?').get(ownerId)
  if (row) return row
  // Auto-create defaults on first read
  const id = crypto.randomUUID()
  db.prepare(`
    INSERT INTO settings (id, owner_id, cadence_default_days, cadence_active_deal_days,
      overdue_threshold_days, notify_pre_call_briefs, notify_sports_triggers,
      notify_cadence_alerts, notify_stage_prompts)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, ownerId,
    DEFAULT_SETTINGS.cadence_default_days,
    DEFAULT_SETTINGS.cadence_active_deal_days,
    DEFAULT_SETTINGS.overdue_threshold_days,
    DEFAULT_SETTINGS.notify_pre_call_briefs,
    DEFAULT_SETTINGS.notify_sports_triggers,
    DEFAULT_SETTINGS.notify_cadence_alerts,
    DEFAULT_SETTINGS.notify_stage_prompts,
  )
  return db.prepare('SELECT * FROM settings WHERE owner_id = ?').get(ownerId)
}

export function updateSettings(ownerId = 'rich', patch) {
  const db = getDb()
  const allowed = [
    'cadence_default_days', 'cadence_active_deal_days', 'overdue_threshold_days',
    'notify_pre_call_briefs', 'notify_sports_triggers', 'notify_cadence_alerts', 'notify_stage_prompts',
  ]
  const fields = Object.keys(patch).filter(k => allowed.includes(k))
  if (fields.length === 0) return getSettings(ownerId)
  // Ensure row exists
  getSettings(ownerId)
  const sets = fields.map(f => `${f} = ?`).join(', ')
  const vals = fields.map(f => patch[f])
  db.prepare(`UPDATE settings SET ${sets}, updated_at = ? WHERE owner_id = ?`)
    .run(...vals, new Date().toISOString(), ownerId)
  return getSettings(ownerId)
}

// ── Cadence + notification scheduling ─────────────────────────────────────────

/**
 * Returns champions that are overdue or approaching overdue.
 * Each result includes: champion fields + daysSince + cadenceDays + status ('overdue'|'approaching')
 */
export function listOverdueChampions(ownerId = 'rich') {
  const db = getDb()
  const s = getSettings(ownerId)
  const now = Date.now()
  const champions = db.prepare(
    "SELECT * FROM champions WHERE archived = 0 AND last_contact_date IS NOT NULL ORDER BY last_contact_date ASC"
  ).all()

  const results = []
  for (const c of champions) {
    const daysSince = Math.floor((now - new Date(c.last_contact_date)) / 86400000)
    const cadenceDays = c.deal_status === 'post-sfo' ? s.cadence_active_deal_days : s.cadence_default_days
    const overdueBy = daysSince - cadenceDays
    const approachingWindow = s.overdue_threshold_days

    if (overdueBy >= 0) {
      results.push({ ...c, daysSince, cadenceDays, overdueBy, status: 'overdue' })
    } else if (overdueBy >= -approachingWindow) {
      results.push({ ...c, daysSince, cadenceDays, overdueBy, status: 'approaching' })
    }
  }
  return results
}

/**
 * Returns one-shot scheduled notifications due to fire now.
 */
export function getDueScheduledNotifications() {
  const db = getDb()
  const now = new Date().toISOString()
  return db.prepare(`
    SELECT n.*, c.name as champion_name, c.company as champion_company
    FROM scheduled_notifications n
    LEFT JOIN champions c ON c.id = n.champion_id
    WHERE n.status = 'pending'
      AND n.fire_at <= ?
    ORDER BY n.fire_at ASC
  `).all(now)
}

/**
 * Mark a scheduled notification as fired.
 */
export function markTriggerFired(id) {
  const db = getDb()
  db.prepare(
    "UPDATE scheduled_notifications SET status = 'fired', fired_at = ? WHERE id = ?"
  ).run(new Date().toISOString(), id)
}

// ── Interests / Wins CRUD ─────────────────────────────────

export function deleteChampionInterest(championId, subjectId) {
  const db = getDb()
  db.prepare('DELETE FROM champion_subjects WHERE champion_id = ? AND subject_id = ?').run(championId, subjectId)
}

export function updatePersonalWin(winId, data) {
  const db = getDb()
  db.prepare('UPDATE personal_wins SET description = ?, category = ?, date_noted = ?, updated_at = ? WHERE id = ?')
    .run(data.description, data.category || 'Other', data.date_noted || data.date || null, new Date().toISOString(), winId)
}

export function deletePersonalWin(winId) {
  const db = getDb()
  db.prepare('DELETE FROM personal_wins WHERE id = ?').run(winId)
}

export function updateProfessionalWin(winId, data) {
  const db = getDb()
  db.prepare('UPDATE professional_wins SET description = ?, confirmed = ?, updated_at = ? WHERE id = ?')
    .run(data.description, data.confirmed ? 1 : 0, new Date().toISOString(), winId)
}

export function deleteProfessionalWin(winId) {
  const db = getDb()
  db.prepare('DELETE FROM professional_wins WHERE id = ?').run(winId)
}

/**
 * Schedule a one-shot notification (used by the schedule_notification Claude tool).
 */
export function scheduleNotification({ championId = null, title, message, fireAt }) {
  const db = getDb()
  const id = crypto.randomUUID()
  // Validate champion_id — if it doesn't exist, store null rather than failing the FK constraint
  let resolvedChampionId = null
  if (championId) {
    const exists = db.prepare('SELECT id FROM champions WHERE id = ?').get(championId)
    resolvedChampionId = exists ? championId : null
  }
  db.prepare(`
    INSERT INTO scheduled_notifications (id, champion_id, title, message, fire_at, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'pending', ?)
  `).run(id, resolvedChampionId, title, message, fireAt, new Date().toISOString())
  return { id, title, fire_at: fireAt }
}
