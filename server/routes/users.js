import { Router } from 'express'
import { listBotUsers, approveUser, revokeUser } from '../db.js'

const router = Router()

// GET /api/users
router.get('/', (req, res) => {
  try {
    const platform = req.query.platform || 'telegram'
    res.json(listBotUsers(platform))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/users — add/pre-approve a user
router.post('/', (req, res) => {
  try {
    const { platform = 'telegram', platform_user_id, platform_username, display_name, role = 'user' } = req.body
    if (!platform_user_id) return res.status(400).json({ error: 'platform_user_id is required' })
    const adminId = process.env.TELEGRAM_RICH_ID || 'web-admin'
    const user = approveUser(platform, platform_user_id, platform_username, display_name, adminId, role)
    res.status(201).json(user)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/users/:platformUserId
router.delete('/:platformUserId', (req, res) => {
  try {
    const platform = req.query.platform || 'telegram'
    revokeUser(platform, req.params.platformUserId)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
