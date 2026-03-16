/**
 * db.js unit tests
 * Uses in-memory SQLite (DB_PATH=:memory: set in vitest.config.js)
 * Run with: npm test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  getDb, resetDb,
  addChampion, getChampion, listChampions, updateChampion,
  archiveChampion, unarchiveChampion,
  addPersonalWin, addProfessionalWin,
  addInteraction,
  computeHealthScore, getHealthScore,
  findOrCreateSubject, linkChampionToSubject,
  addPendingTrigger, resolvePendingTrigger, listPendingTriggers,
  addFeedback, listFeedback,
  getChampionsByLocation,
} from '../db.js'

beforeEach(() => {
  resetDb()
  getDb() // initialise schema
})

afterEach(() => {
  resetDb()
})

// ── Helpers ────────────────────────────────────────────────

function makeChampion(overrides = {}) {
  return addChampion({
    name: 'Test User',
    company: 'Test Co',
    role: 'CTO',
    type: 'prospect',
    location_city: 'London',
    location_country: 'UK',
    ...overrides,
  })
}

// ── Champion CRUD ──────────────────────────────────────────

describe('addChampion', () => {
  it('creates a champion with defaults', () => {
    const c = makeChampion()
    expect(c.name).toBe('Test User')
    expect(c.stage).toBe('identified')
    expect(c.archived).toBe(0)
    expect(c.health).toBe('green')
  })

  it('sets stage to nurture for network type', () => {
    const c = makeChampion({ type: 'network' })
    expect(c.stage).toBe('nurture')
    expect(c.deal_status).toBe('network')
  })

  it('seeds stage criteria on creation', () => {
    const c = makeChampion()
    expect(c.stageCriteria['identified-building']).toBeDefined()
    expect(c.stageCriteria['identified-building'].length).toBeGreaterThan(0)
  })

  it('stores location fields', () => {
    const c = makeChampion({ location_city: 'New York', location_country: 'US' })
    expect(c.location_city).toBe('New York')
    expect(c.location_country).toBe('US')
  })
})

describe('listChampions', () => {
  it('excludes archived by default', () => {
    const c = makeChampion()
    archiveChampion(c.id)
    const list = listChampions()
    expect(list.find(x => x.id === c.id)).toBeUndefined()
  })

  it('includes archived when requested', () => {
    const c = makeChampion()
    archiveChampion(c.id)
    const list = listChampions({ includeArchived: true })
    expect(list.find(x => x.id === c.id)).toBeDefined()
  })
})

// ── Archive ────────────────────────────────────────────────

describe('archiveChampion / unarchiveChampion', () => {
  it('sets archived=1 and archived_at', () => {
    const c = makeChampion()
    const archived = archiveChampion(c.id)
    expect(archived.archived).toBe(1)
    expect(archived.archived_at).toBeTruthy()
  })

  it('restores champion', () => {
    const c = makeChampion()
    archiveChampion(c.id)
    const restored = unarchiveChampion(c.id)
    expect(restored.archived).toBe(0)
    expect(restored.archived_at).toBeNull()
  })
})

// ── Health score ───────────────────────────────────────────

describe('computeHealthScore', () => {
  it('returns a score between 0 and 100', () => {
    const c = makeChampion()
    const result = computeHealthScore(c.id)
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(100)
  })

  it('scores higher with recent contact + profile data', () => {
    const c = makeChampion()
    const today = new Date().toISOString().split('T')[0]
    addInteraction(c.id, { date: today, type: 'Call', notes: 'Great chat' })
    addPersonalWin(c.id, { category: 'sport', description: 'Chelsea FC fan', emoji: '⚽' })
    addProfessionalWin(c.id, { description: 'Career-defining project' })
    const result = computeHealthScore(c.id)
    expect(result.score).toBeGreaterThan(30)
    expect(result.recencyScore).toBe(40) // contacted today
  })

  it('scores lower with stale contact and no profile data', () => {
    // Champion with very old last contact (90 days) and no wins → low score
    const c = addChampion({ name: 'Ghost', company: 'Acme', role: 'VP', type: 'prospect' })
    // Manually set last contact to 90 days ago
    const oldDate = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]
    updateChampion(c.id, { last_contact_date: oldDate })
    const result = computeHealthScore(c.id)
    expect(result.recencyScore).toBe(0) // way over cadence
    expect(result.profileScore).toBeLessThan(10) // no wins
    expect(result.score).toBeLessThan(35)
  })

  it('persists score and is retrievable via getHealthScore', () => {
    const c = makeChampion()
    const computed = computeHealthScore(c.id)
    const retrieved = getHealthScore(c.id)
    expect(retrieved.score).toBe(computed.score)
  })
})

// ── Subject registry ───────────────────────────────────────

describe('findOrCreateSubject', () => {
  it('creates a new subject', () => {
    const s = findOrCreateSubject('Chelsea FC', 'sport')
    expect(s.name).toBe('Chelsea FC')
    expect(s.type).toBe('sport')
  })

  it('returns existing subject on exact match', () => {
    const s1 = findOrCreateSubject('Chelsea FC', 'sport')
    const s2 = findOrCreateSubject('Chelsea FC', 'sport')
    expect(s1.id).toBe(s2.id)
  })

  it('fuzzy matches substrings', () => {
    const s1 = findOrCreateSubject('Chelsea FC', 'sport')
    const s2 = findOrCreateSubject('Chelsea', 'sport')
    expect(s1.id).toBe(s2.id)
  })
})

// ── Pending triggers ───────────────────────────────────────

describe('pending triggers', () => {
  it('creates a pending trigger', () => {
    const c = makeChampion()
    const pt = addPendingTrigger(c.id, {
      subject_name: 'England Rugby',
      subject_type: 'sport',
      evidence: 'Mentioned Six Nations in call',
      confidence: 'high',
    })
    expect(pt.status).toBe('pending')
    expect(pt.subject_name).toBe('England Rugby')
  })

  it('lists only pending triggers', () => {
    const c = makeChampion()
    addPendingTrigger(c.id, { subject_name: 'Test', evidence: 'test', confidence: 'high' })
    const list = listPendingTriggers()
    expect(list.length).toBeGreaterThan(0)
    expect(list.every(t => t.status === 'pending')).toBe(true)
  })

  it('approved trigger creates a real trigger', () => {
    const c = makeChampion()
    const pt = addPendingTrigger(c.id, {
      subject_name: 'England Rugby',
      subject_type: 'sport',
      evidence: 'Six Nations fan',
      confidence: 'high',
    })
    resolvePendingTrigger(pt.id, 'approved')
    const champion = getChampion(c.id)
    expect(champion.triggers.length).toBeGreaterThan(0)
  })

  it('rejected trigger does not create a real trigger', () => {
    const c = makeChampion()
    const pt = addPendingTrigger(c.id, {
      subject_name: 'Knitting',
      subject_type: 'hobby',
      evidence: 'Not sure',
      confidence: 'low',
    })
    resolvePendingTrigger(pt.id, 'rejected')
    const champion = getChampion(c.id)
    expect(champion.triggers.length).toBe(0)
  })
})

// ── Location lookup ────────────────────────────────────────

describe('getChampionsByLocation', () => {
  it('finds champions by city', () => {
    makeChampion({ name: 'London Person', location_city: 'London', location_country: 'UK' })
    makeChampion({ name: 'Continental Re Person', location_city: 'Continental Re', location_country: 'Switzerland' })
    const results = getChampionsByLocation('London', 'UK')
    expect(results.some(c => c.name === 'London Person')).toBe(true)
    expect(results.some(c => c.name === 'Continental Re Person')).toBe(false)
  })

  it('excludes archived champions', () => {
    const c = makeChampion({ name: 'Gone', location_city: 'London', location_country: 'UK' })
    archiveChampion(c.id)
    const results = getChampionsByLocation('London', 'UK')
    expect(results.some(x => x.id === c.id)).toBe(false)
  })
})

// ── Feedback ───────────────────────────────────────────────

describe('feedback', () => {
  it('creates a feedback item', () => {
    const f = addFeedback({ type: 'bug', title: 'Something broke', description: 'Details here' })
    expect(f.type).toBe('bug')
    expect(f.status).toBe('open')
  })

  it('lists feedback items', () => {
    addFeedback({ type: 'feature', title: 'Add dark mode' })
    const list = listFeedback()
    expect(list.length).toBeGreaterThan(0)
  })
})
