import { Router } from 'express'
import {
  getUserProfile, saveUserProfile,
  addToneSample, listToneSamples, deleteToneSample,
  addSentMessage, listSentMessages,
} from '../db.js'

const router = Router()

const DEFAULT_OWNER = process.env.TELEGRAM_RICH_ID || 'rich'

function getOwner(req) {
  return req.user?.sub || DEFAULT_OWNER
}

// ── Profile ───────────────────────────────────────────────────────────────────

router.get('/', (req, res) => {
  const profile = getUserProfile(getOwner(req))
  res.json(profile || {})
})

router.put('/', (req, res) => {
  try {
    const profile = saveUserProfile(getOwner(req), req.body)
    res.json(profile)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Tone samples ──────────────────────────────────────────────────────────────

router.get('/tone-samples', (req, res) => {
  const { channel } = req.query
  res.json(listToneSamples(getOwner(req), channel || null))
})

router.post('/tone-samples', (req, res) => {
  const { sample_text, channel, source } = req.body
  if (!sample_text?.trim()) return res.status(400).json({ error: 'sample_text required' })
  const id = addToneSample(getOwner(req), sample_text, channel || 'short', source || 'onboarding')
  res.status(201).json({ id })
})

router.delete('/tone-samples/:id', (req, res) => {
  deleteToneSample(req.params.id, getOwner(req))
  res.json({ ok: true })
})

// ── Sent messages (feedback loop) ────────────────────────────────────────────

router.get('/sent-messages', (req, res) => {
  res.json(listSentMessages(getOwner(req)))
})

router.post('/sent-messages', (req, res) => {
  const { champion_id, suggested_text, actual_text, channel } = req.body
  if (!actual_text?.trim()) return res.status(400).json({ error: 'actual_text required' })
  const id = addSentMessage(getOwner(req), champion_id, suggested_text, actual_text, channel || 'short')
  res.status(201).json({ id })
})

export default router
