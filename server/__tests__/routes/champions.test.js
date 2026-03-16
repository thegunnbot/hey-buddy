/**
 * /api/champions route integration tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import { getDb, resetDb } from '../../db.js'
import championsRouter from '../../routes/champions.js'

function makeApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/champions', championsRouter)
  return app
}

beforeEach(() => {
  resetDb()
  getDb()
})

afterEach(() => {
  resetDb()
})

describe('GET /api/champions', () => {
  it('returns empty array with no champions', async () => {
    const res = await request(makeApp()).get('/api/champions')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('excludes archived champions by default', async () => {
    const app = makeApp()
    const create = await request(app).post('/api/champions').send({
      name: 'Archived Person', company: 'Old Co', role: 'VP', type: 'prospect'
    })
    // Archive directly via db (archive endpoint lives in index.js, not champions router)
    const { archiveChampion } = await import('../../db.js')
    archiveChampion(create.body.id)
    const res = await request(app).get('/api/champions')
    expect(res.body.find(c => c.id === create.body.id)).toBeUndefined()
  })

  it('includes archived when includeArchived=true', async () => {
    const app = makeApp()
    const create = await request(app).post('/api/champions').send({
      name: 'Archived Person', company: 'Old Co', role: 'VP', type: 'prospect'
    })
    // Manually archive via db
    const { archiveChampion } = await import('../../db.js')
    archiveChampion(create.body.id)
    const res = await request(app).get('/api/champions?includeArchived=true')
    expect(res.body.find(c => c.id === create.body.id)).toBeDefined()
  })
})

describe('POST /api/champions', () => {
  it('creates a champion', async () => {
    const res = await request(makeApp()).post('/api/champions').send({
      name: 'Jane Smith', company: 'Meridian Insurance', role: 'CTO', type: 'prospect'
    })
    expect(res.status).toBe(201)
    expect(res.body.name).toBe('Jane Smith')
    expect(res.body.stage).toBe('identified')
  })

  it('sets network champion to nurture stage', async () => {
    const res = await request(makeApp()).post('/api/champions').send({
      name: 'Network Person', company: 'Lloyd\'s', role: 'Director', type: 'network'
    })
    expect(res.body.stage).toBe('nurture')
  })
})

describe('GET /api/champions/:id', () => {
  it('returns full champion with enriched data', async () => {
    const app = makeApp()
    const create = await request(app).post('/api/champions').send({
      name: 'Rich Data', company: 'Apex General', role: 'CDO', type: 'prospect'
    })
    const res = await request(app).get(`/api/champions/${create.body.id}`)
    expect(res.status).toBe(200)
    expect(res.body.personalWins).toBeDefined()
    expect(res.body.stageCriteria).toBeDefined()
    expect(res.body.interactions).toBeDefined()
  })

  it('returns 404 for unknown id', async () => {
    const res = await request(makeApp()).get('/api/champions/does-not-exist')
    expect(res.status).toBe(404)
  })
})
