/**
 * Hey Buddy — Sports Integration
 *
 * Fetches upcoming fixtures via football-data.org (free tier).
 * Creates pending_triggers for match days so Rich gets reminded to
 * reach out to champions who share a team interest.
 *
 * Requires: FOOTBALL_DATA_API_KEY in .env
 * Free tier: 10 req/min, covers PL, Championship, World Cup, Euros etc.
 *
 * Rich's teams (hardcoded): Chelsea FC (ID 61), England national (ID 66)
 * Champions' teams: read from personal_wins descriptions + champion_subjects
 */

import { getDb, addPendingTrigger, listChampions } from './db.js'

const API_BASE = 'https://api.football-data.org/v4'

// football-data.org team IDs for Rich's own teams
export const RICH_TEAMS = [
  { id: 61,  name: 'Chelsea FC',   short: 'Chelsea'  },
  { id: 66,  name: 'England',      short: 'England'  },
  // England rugby: not covered by football-data.org — add ESPN/BBC source later
]

// How many days ahead to look for fixtures
const LOOKAHEAD_DAYS = 7

async function fdFetch(path) {
  const key = process.env.FOOTBALL_DATA_API_KEY
  if (!key) return null

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 'X-Auth-Token': key },
    })
    if (res.status === 429) {
      console.warn('[sports] Rate limited by football-data.org — will retry next run')
      return null
    }
    if (!res.ok) {
      console.warn(`[sports] API error ${res.status} for ${path}`)
      return null
    }
    return res.json()
  } catch (err) {
    console.warn('[sports] Fetch error:', err.message)
    return null
  }
}

/**
 * Fetch upcoming fixtures for a team within the lookahead window.
 * Returns array of { teamName, opponent, utcDate, competition, isHome }
 */
export async function fetchUpcomingFixtures(teamId, teamName) {
  const dateFrom = new Date().toISOString().split('T')[0]
  const dateTo = new Date(Date.now() + LOOKAHEAD_DAYS * 86400000).toISOString().split('T')[0]

  const data = await fdFetch(`/teams/${teamId}/matches?status=SCHEDULED&dateFrom=${dateFrom}&dateTo=${dateTo}`)
  if (!data?.matches) return []

  return data.matches.map(m => {
    const isHome = m.homeTeam.id === teamId
    const opponent = isHome ? m.awayTeam.name : m.homeTeam.name
    return {
      teamName,
      teamId,
      opponent,
      utcDate: m.utcDate,
      matchDate: m.utcDate.split('T')[0],
      competition: m.competition.name,
      isHome,
      matchId: m.id,
    }
  })
}

/**
 * Find champion IDs who have an interest in a given team/sport.
 * Searches personal_wins descriptions and champion_subjects.
 */
function findChampionsInterestedIn(teamName) {
  const db = getDb()
  const keywords = teamName.toLowerCase().split(' ')

  // Search personal_wins
  const wins = db.prepare(
    "SELECT DISTINCT champion_id FROM personal_wins WHERE category = 'sport'"
  ).all()

  const matchingChampionIds = new Set()
  for (const w of wins) {
    const fullWin = db.prepare('SELECT description FROM personal_wins WHERE id = ? OR champion_id = ?').all(w.champion_id, w.champion_id)
    for (const pw of fullWin) {
      if (keywords.some(kw => pw.description?.toLowerCase().includes(kw))) {
        matchingChampionIds.add(w.champion_id)
      }
    }
  }

  // Also search champion_subjects
  const subjects = db.prepare(`
    SELECT cs.champion_id FROM champion_subjects cs
    JOIN subjects s ON s.id = cs.subject_id
    WHERE LOWER(s.name) LIKE ?
  `).all(`%${teamName.toLowerCase()}%`)
  subjects.forEach(r => matchingChampionIds.add(r.champion_id))

  return [...matchingChampionIds]
}

/**
 * Main entry point: check for upcoming fixtures and create pending_triggers.
 * Called nightly from the scheduler.
 */
export async function runSportsCheck() {
  if (!process.env.FOOTBALL_DATA_API_KEY) {
    console.log('[sports] FOOTBALL_DATA_API_KEY not set — skipping sports check')
    return { processed: 0 }
  }

  console.log('[sports] Running nightly fixture check...')
  const db = getDb()
  let created = 0

  for (const team of RICH_TEAMS) {
    const fixtures = await fetchUpcomingFixtures(team.id, team.name)
    if (!fixtures.length) continue

    for (const fixture of fixtures) {
      const key = `sports:${team.id}:${fixture.matchId}`

      // Skip if we've already proposed this fixture (check by evidence match)
      const existing = db.prepare(`
        SELECT id FROM pending_triggers
        WHERE subject_name = ? AND created_at >= date('now', '-8 days') AND status != 'rejected'
      `).get(team.name)
      if (existing) continue

      const matchDateStr = new Date(fixture.utcDate).toLocaleDateString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short',
      })
      const venue = fixture.isHome ? 'home' : 'away'
      const evidence = `${team.name} play ${fixture.opponent} (${venue}) in the ${fixture.competition} on ${matchDateStr}.`

      // 1. Trigger for Rich himself (his team is playing — reach out to fan champions)
      const interestedChampions = findChampionsInterestedIn(team.name)

      if (interestedChampions.length > 0) {
        for (const championId of interestedChampions) {
          const existing2 = db.prepare(`
            SELECT id FROM pending_triggers
            WHERE champion_id = ? AND subject_name = ? AND created_at >= date('now', '-8 days') AND status != 'rejected'
          `).get(championId, team.name)
          if (existing2) continue

          addPendingTrigger(championId, {
            subject_name: team.name,
            subject_type: 'sport',
            evidence,
            confidence: 'high',
            proposed_by: 'sports-check',
          })
          created++
        }
      } else {
        // No specific champion match — create a general pending trigger with no champion attached
        // (stored against first champion as a workaround — TODO: support champion_id = NULL in pending_triggers)
        const allChampions = listChampions()
        if (allChampions.length > 0) {
          const existing2 = db.prepare(`
            SELECT id FROM pending_triggers
            WHERE subject_name = ? AND created_at >= date('now', '-8 days') AND status != 'rejected'
          `).get(team.name)
          if (!existing2) {
            addPendingTrigger(allChampions[0].id, {
              subject_name: team.name,
              subject_type: 'sport',
              evidence: `${evidence} Consider using this as outreach context with champions who might follow football.`,
              confidence: 'medium',
              proposed_by: 'sports-check',
            })
            created++
          }
        }
      }

      // Small delay to respect free-tier rate limits
      await new Promise(r => setTimeout(r, 200))
    }
  }

  console.log(`[sports] Fixture check complete — ${created} pending trigger(s) created`)
  return { processed: RICH_TEAMS.length, created }
}
