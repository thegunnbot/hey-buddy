/**
 * intelligence.js — shared scan, filter, format, and persistence logic
 * Used by: routes/chat.js (on-demand tool) and /api/intelligence/scan (scheduled)
 */

import { getDb } from './db.js'
import { randomUUID } from 'crypto'

const NOISE_PATTERNS = [
  /\bhiring\b/i, /\bjobs?\b/i, /\bcareers?\b/i, /\bapply now\b/i,
  /\bvacancy\b/i, /\brecruitment\b/i, /\bopen roles?\b/i,
]

function isNoise(title) {
  return NOISE_PATTERNS.some(re => re.test(title))
}

export async function fetchNewsForTopic(topic, days = 2) {
  const query = encodeURIComponent(topic)
  const url = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en&when=${days}d`
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(6000) })
    const text = await resp.text()
    const items = [...text.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 15)
    return items
      .map(([, xml]) => ({
        title: xml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || xml.match(/<title>(.*?)<\/title>/)?.[1] || '',
        link: xml.match(/<link>(.*?)<\/link>/)?.[1] || '',
        source: xml.match(/<source[^>]*>(.*?)<\/source>/)?.[1] || '',
        date: xml.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '',
      }))
      .filter(a => a.title && !isNoise(a.title))
      .filter(a => !a.date || new Date(a.date).getTime() >= cutoff)
      .slice(0, 4)
  } catch { return [] }
}

export async function scanChampionInterests(championId, days = 2) {
  const db = getDb()
  let champions = []
  if (championId) {
    const c = db.prepare('SELECT id, name, company, role, location_city, location_country FROM champions WHERE id = ?').get(championId)
    if (c) champions = [c]
  } else {
    champions = db.prepare('SELECT id, name, company, role, location_city, location_country FROM champions WHERE archived = 0').all()
  }

  const results = []
  for (const champion of champions) {
    const seenUrls = new Set()
    const sections = []

    const dedup = (articles) => articles.filter(a => {
      if (!a.link || seenUrls.has(a.link)) return false
      seenUrls.add(a.link)
      return true
    }).slice(0, 3)

    // 1. Registered interests
    const interests = db.prepare(`
      SELECT s.id, s.name, s.type FROM champion_subjects cs
      JOIN subjects s ON s.id = cs.subject_id
      WHERE cs.champion_id = ?
    `).all(champion.id)
    for (const interest of interests) {
      const raw = await fetchNewsForTopic(interest.name, days)
      const articles = dedup(raw)
      if (articles.length) sections.push({ section: 'interest', label: interest.name, articles })
    }

    // 2. Company news
    if (champion.company) {
      const raw = await fetchNewsForTopic(champion.company, days)
      const articles = dedup(raw)
      if (articles.length) sections.push({ section: 'company', label: `${champion.company}`, articles })
    }

    // 3. Press mentions
    if (champion.name && champion.company) {
      const raw = await fetchNewsForTopic(`"${champion.name}" "${champion.company}"`, days)
      const articles = dedup(raw)
      if (articles.length) sections.push({ section: 'press', label: `${champion.name} press mentions`, articles })
    }

    if (sections.length) {
      results.push({ champion: champion.name, champion_id: champion.id, topics: sections })
    }
  }

  // Persist to DB (skip duplicates by link)
  if (results.length) {
    const db = getDb()
    const now = new Date().toISOString()
    const insert = db.prepare(`
      INSERT OR IGNORE INTO intelligence_items
        (id, champion_id, champion_name, section, label, title, link, source, pub_date, scanned_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    // Use link as natural dedup key — add UNIQUE constraint via ignore
    for (const r of results) {
      for (const topic of r.topics) {
        for (const a of topic.articles) {
          // Check if already stored in last 7 days to avoid exact dupes
          const existing = db.prepare(
            `SELECT id FROM intelligence_items WHERE link = ? AND scanned_at > datetime('now', '-7 days')`
          ).get(a.link)
          if (!existing) {
            insert.run(randomUUID(), r.champion_id, r.champion, topic.section, topic.label,
              a.title, a.link, a.source || null, a.date || null, now)
          }
        }
      }
    }
  }

  return results.length ? results : null
}

export function listIntelligenceItems({ limit = 100, championId = null, dismissed = false } = {}) {
  const db = getDb()
  let query = `SELECT * FROM intelligence_items WHERE dismissed = ?`
  const params = [dismissed ? 1 : 0]
  if (championId) { query += ` AND champion_id = ?`; params.push(championId) }
  query += ` ORDER BY scanned_at DESC LIMIT ?`
  params.push(limit)
  return db.prepare(query).all(...params)
}

export function dismissIntelligenceItem(id) {
  const db = getDb()
  db.prepare(`UPDATE intelligence_items SET dismissed = 1 WHERE id = ?`).run(id)
}

export function championsInCity(city) {
  const db = getDb()
  const normalised = city.trim().toLowerCase()
  const champions = db.prepare(
    `SELECT id, name, company, role, stage, last_contact_date FROM champions WHERE archived = 0 AND lower(location_city) LIKE ?`
  ).all(`%${normalised}%`)
  if (!champions.length) return { city, message: `No champions found in ${city}.`, champions: [] }
  return {
    city,
    message: `Found ${champions.length} champion(s) in ${city}. Consider reaching out before or during your visit.`,
    champions: champions.map(c => ({
      id: c.id, name: c.name, company: c.company, role: c.role,
      stage: c.stage, last_contact_date: c.last_contact_date,
    })),
  }
}

const SECTION_EMOJI = { interest: '🎯', company: '🏢', press: '📰' }

export function formatDigest(results, days) {
  if (!results) return null

  const lines = []
  const dateLabel = days <= 1 ? 'last 24h' : `last ${days * 24}h`
  lines.push(`🔍 *Hey Buddy Intelligence Digest* (${dateLabel})\n`)

  for (const r of results) {
    lines.push(`*${r.champion}*`)
    for (const topic of r.topics) {
      const emoji = SECTION_EMOJI[topic.section] || '📌'
      lines.push(`${emoji} _${topic.label}_`)
      for (const a of topic.articles) {
        const age = a.date ? `· ${timeAgo(a.date)}` : ''
        lines.push(`  • [${a.title}](${a.link})${a.source ? ` (${a.source})` : ''} ${age}`)
      }
    }
    lines.push('')
  }

  return lines.join('\n').trim()
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
