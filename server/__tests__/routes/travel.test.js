/**
 * /api/travel route integration tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import { getDb, resetDb, addChampion, addPendingTrigger } from '../../db.js'

// Minimal app with just the travel endpoint wired in
async function makeApp() {
  const app = express()
  app.use(express.json())
  // Inline the travel route to avoid importing full index.js
  const { getChampionsByLocation, addPendingTrigger: apt } = await import('../../db.js')
  app.post('/api/travel', (req, res) => {
    try {
      const { city, country, travel_note } = req.body
      if (!city && !country) return res.status(400).json({ error: 'city or country required' })
      const champions = getChampionsByLocation(city, country)
      const created = []
      for (const c of champions) {
        const location = [city, country].filter(Boolean).join(', ')
        const pt = apt(c.id, {
          subject_name: `Travel to ${location}`,
          subject_type: 'topic',
          evidence: travel_note || `Travelling to ${location}`,
          confidence: 'high',
          proposed_by: 'travel-check',
        })
        created.push({ champion: { id: c.id, name: c.name }, pending_trigger: pt })
      }
      res.json({ location: [city, country].filter(Boolean).join(', '), champions_found: champions.length, triggers_created: created })
    } catch (err) { res.status(500).json({ error: err.message }) }
  })
  return app
}

beforeEach(() => {
  resetDb()
  getDb()
})

afterEach(() => {
  resetDb()
})

describe('POST /api/travel', () => {
  it('returns 400 if no city or country', async () => {
    const app = await makeApp()
    const res = await request(app).post('/api/travel').send({})
    expect(res.status).toBe(400)
  })

  it('finds champions in the given city and queues triggers', async () => {
    addChampion({ name: 'London Champ', company: 'Meridian Insurance', role: 'CTO', type: 'prospect', location_city: 'London', location_country: 'UK' })
    addChampion({ name: 'Paris Champ', company: 'Apex General', role: 'CTO', type: 'prospect', location_city: 'Paris', location_country: 'France' })
    const app = await makeApp()
    const res = await request(app).post('/api/travel').send({ city: 'London', country: 'UK', travel_note: 'Visiting next week' })
    expect(res.status).toBe(200)
    expect(res.body.champions_found).toBe(1)
    expect(res.body.triggers_created[0].champion.name).toBe('London Champ')
  })

  it('returns 0 champions for a city with no matches', async () => {
    const app = await makeApp()
    const res = await request(app).post('/api/travel').send({ city: 'Tokyo', country: 'Japan' })
    expect(res.status).toBe(200)
    expect(res.body.champions_found).toBe(0)
  })
})
