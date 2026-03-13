import { Router } from 'express'
import { addFeedback, listFeedback, updateFeedbackStatus } from '../db.js'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = join(__dirname, '../../uploads/feedback')

// OpenClaw webhook — push feedback notifications instead of polling
const OPENCLAW_HOOK_URL = process.env.OPENCLAW_HOOK_URL || 'http://localhost:18789/hooks/agent'
const OPENCLAW_HOOK_TOKEN = process.env.OPENCLAW_HOOK_TOKEN || '[REDACTED]'

async function notifyOpenClaw(item) {
  if (!OPENCLAW_HOOK_TOKEN) return

  const typeLabel = item.type || 'feedback'
  const submittedBy = item.submitted_by ? ` from ${item.submitted_by}` : ''

  const message = `New Hey Buddy feedback received${submittedBy}:

Type: ${typeLabel}
Title: ${item.title}
Description: ${item.description || '(none)'}
Submitted at: ${item.created_at || new Date().toISOString()}
Feedback ID: ${item.id}

Please review this feedback and send Rich a Telegram message with:
1. A summary of what the user is reporting
2. Your assessment of the priority (critical / high / medium / low)
3. A recommended fix or next step

Deliver via: message tool, action=send, channel=telegram, to=8648088226`

  try {
    const res = await fetch(OPENCLAW_HOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENCLAW_HOOK_TOKEN}`,
      },
      body: JSON.stringify({
        name: 'Hey Buddy Feedback',
        message,
        deliver: true,
        channel: 'telegram',
        to: '8648088226',
        timeoutSeconds: 60,
      }),
    })
    if (!res.ok) {
      console.error(`[feedback] OpenClaw hook failed: ${res.status} ${await res.text()}`)
    }
  } catch (err) {
    // Non-fatal — feedback is saved regardless; just log
    console.error('[feedback] OpenClaw hook error:', err.message)
  }
}

const router = Router()

// GET /api/feedback
router.get('/', (req, res) => {
  try {
    res.json(listFeedback({ status: req.query.status }))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/feedback
router.post('/', async (req, res) => {
  try {
    const { type, title, description, screenshot, submitted_by } = req.body
    if (!title) return res.status(400).json({ error: 'title is required' })

    let screenshotPath = null
    if (screenshot) {
      // screenshot is base64 data URL
      mkdirSync(UPLOADS_DIR, { recursive: true })
      const ext = screenshot.startsWith('data:image/png') ? 'png' : 'jpg'
      const filename = `feedback-${Date.now()}.${ext}`
      const base64Data = screenshot.replace(/^data:image\/\w+;base64,/, '')
      writeFileSync(join(UPLOADS_DIR, filename), Buffer.from(base64Data, 'base64'))
      screenshotPath = `/uploads/feedback/${filename}`
    }

    const item = addFeedback({ type, title, description, screenshot_path: screenshotPath, submitted_by })

    // Fire-and-forget: notify OpenClaw immediately (non-blocking)
    notifyOpenClaw(item).catch(() => {}) // already logged inside

    res.json(item)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/feedback/:id
router.patch('/:id', (req, res) => {
  try {
    const { status } = req.body
    res.json(updateFeedbackStatus(req.params.id, status))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
