import { Router } from 'express'
import { listPendingTriggers, resolvePendingTrigger, addPendingTrigger, listSubjects } from '../db.js'

const router = Router()

// GET /api/pending-triggers
router.get('/', (req, res) => {
  try {
    res.json(listPendingTriggers())
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/pending-triggers
router.post('/', (req, res) => {
  try {
    const { champion_id, subject_name, subject_type, evidence, confidence } = req.body
    if (!champion_id || !subject_name || !evidence) {
      return res.status(400).json({ error: 'champion_id, subject_name, and evidence are required' })
    }
    const pending = addPendingTrigger(champion_id, { subject_name, subject_type, evidence, confidence, proposed_by: 'user' })
    res.json(pending)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/pending-triggers/:id/resolve
router.post('/:id/resolve', (req, res) => {
  try {
    const { action } = req.body // 'approved' | 'rejected'
    if (!['approved', 'rejected'].includes(action)) {
      return res.status(400).json({ error: 'action must be approved or rejected' })
    }
    const result = resolvePendingTrigger(req.params.id, action)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/pending-triggers/subjects
router.get('/subjects', (req, res) => {
  try {
    res.json(listSubjects())
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
