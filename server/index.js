import 'dotenv/config'

// Global safety net — log crashes instead of dying silently
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught exception:', err)
})
process.on('unhandledRejection', (reason) => {
  console.error('💥 Unhandled rejection:', reason)
})
import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import rateLimit from 'express-rate-limit'
import { seedMockData, getHealthScore, computeHealthScore, listSubjects, archiveChampion, unarchiveChampion, listChampions, getChampionsByLocation, addPendingTrigger } from './db.js'
import { startBot, sendTelegramMessage } from './bot.js'
import { scanChampionInterests, formatDigest } from './intelligence.js'
import { requireAuth } from './middleware/auth.js'
import championsRouter from './routes/champions.js'
import chatRouter from './routes/chat.js'
import uploadRouter from './routes/upload.js'
import pendingTriggersRouter from './routes/pending-triggers.js'
import feedbackRouter from './routes/feedback.js'
import usersRouter from './routes/users.js'
import profileRouter from './routes/profile.js'
import settingsRouter from './routes/settings.js'
import authRouter from './routes/auth.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '50mb' }))

// Rate limiting — prevent abuse
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute window
  max: 60,               // 60 requests per minute per IP (generous for local dev)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — slow down.' },
})
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,               // 20 chat messages per minute (prevents runaway LLM costs)
  message: { error: 'Chat rate limit reached — wait a moment.' },
})
app.use('/api/', apiLimiter)
app.use('/api/chat', chatLimiter)

// Auth route — public (no requireAuth)
app.use('/api/auth', authRouter)

// API routes — all protected by auth middleware (no-op locally, Auth0 JWT in production)
app.use('/api/champions', requireAuth, championsRouter)
app.use('/api/chat', requireAuth, chatRouter)
app.use('/api/upload', requireAuth, uploadRouter)
app.use('/api/pending-triggers', requireAuth, pendingTriggersRouter)
app.use('/api/feedback', requireAuth, feedbackRouter)
app.use('/api/users', requireAuth, usersRouter)
app.use('/api/profile', requireAuth, profileRouter)
app.use('/api/settings', requireAuth, settingsRouter)

// Serve uploaded feedback screenshots
app.use('/uploads', express.static(join(__dirname, '../uploads')))

// Archive / unarchive champions
app.post('/api/champions/:id/archive', requireAuth, (req, res) => {
  try { res.json(archiveChampion(req.params.id)) }
  catch (err) { res.status(500).json({ error: err.message }) }
})
app.post('/api/champions/:id/unarchive', requireAuth, (req, res) => {
  try { res.json(unarchiveChampion(req.params.id)) }
  catch (err) { res.status(500).json({ error: err.message }) }
})

// Archived champions list
app.get('/api/champions/archived', requireAuth, (req, res) => {
  try { res.json(listChampions({ includeArchived: true }).filter(c => c.archived)) }
  catch (err) { res.status(500).json({ error: err.message }) }
})

// Location-based champion lookup
app.get('/api/champions/location', requireAuth, (req, res) => {
  try {
    const { city, country } = req.query
    res.json(getChampionsByLocation(city, country))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// Travel trigger: given a city/country + travel note, find local champions and queue pending triggers
app.post('/api/travel', requireAuth, (req, res) => {
  try {
    const { city, country, travel_note } = req.body
    if (!city && !country) return res.status(400).json({ error: 'city or country required' })
    const champions = getChampionsByLocation(city, country)
    const created = []
    for (const c of champions) {
      const location = [city, country].filter(Boolean).join(', ')
      const pt = addPendingTrigger(c.id, {
        subject_name: `Travel to ${location}`,
        subject_type: 'topic',
        evidence: travel_note || `You're travelling to ${location} — good opportunity to meet in person`,
        confidence: 'high',
        proposed_by: 'travel-check',
      })
      created.push({ champion: { id: c.id, name: c.name, company: c.company }, pending_trigger: pt })
    }
    res.json({ location: [city, country].filter(Boolean).join(', '), champions_found: champions.length, triggers_created: created })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// Health score endpoints
app.get('/api/champions/:id/health-score', (req, res) => {
  try { res.json(getHealthScore(req.params.id)) }
  catch (err) { res.status(500).json({ error: err.message }) }
})
app.post('/api/champions/:id/health-score/refresh', (req, res) => {
  try { res.json(computeHealthScore(req.params.id)) }
  catch (err) { res.status(500).json({ error: err.message }) }
})

// Subject registry
app.get('/api/subjects', (req, res) => {
  try { res.json(listSubjects()) }
  catch (err) { res.status(500).json({ error: err.message }) }
})

// Intelligence scan — internal endpoint (protected by SCAN_SECRET)
app.post('/api/intelligence/scan', async (req, res) => {
  const secret = process.env.SCAN_SECRET
  if (!secret || req.headers['x-scan-secret'] !== secret) {
    return res.status(401).json({ error: 'Unauthorised' })
  }
  try {
    const days = parseInt(req.query.days) || 2
    const results = await scanChampionInterests(null, days)
    const digest = formatDigest(results, days)
    if (digest) {
      await sendTelegramMessage(process.env.TELEGRAM_RICH_ID, digest, { parse_mode: 'Markdown' })
      res.json({ ok: true, championsWithNews: results.length, sent: true })
    } else {
      res.json({ ok: true, championsWithNews: 0, sent: false, message: 'No news found — nothing sent.' })
    }
  } catch (err) {
    console.error('Intelligence scan error:', err)
    res.status(500).json({ error: err.message })
  }
})

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true }))

// Seed DB on start
try {
  seedMockData()
  console.log('✅ Database ready')
} catch (err) {
  console.error('DB seed error:', err)
}

app.listen(PORT, () => {
  console.log(`🤝 Hey Buddy server running on http://localhost:${PORT}`)
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('⚠️  ANTHROPIC_API_KEY not set — chat will not work until you add it to .env')
  }
  // Start standalone Telegram bot
  startBot()
})
