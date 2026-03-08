import { Router } from 'express'
import { addFeedback, listFeedback, updateFeedbackStatus } from '../db.js'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = join(__dirname, '../../uploads/feedback')

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
