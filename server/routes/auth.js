import express from 'express'
const router = express.Router()

router.post('/verify', (req, res) => {
  const { password } = req.body
  const correct = process.env.WEB_PASSWORD
  if (!correct) return res.status(500).json({ error: 'WEB_PASSWORD not set' })
  if (password === correct) {
    return res.json({ ok: true })
  }
  return res.status(401).json({ error: 'Incorrect password' })
})

export default router
