import { Router } from 'express'
import {
  listChampions, getChampion, addChampion, updateChampion,
  addPersonalWin, addProfessionalWin, confirmProfessionalWin,
  addInteraction, updateStageCriteria, addTrigger, updateTriggerStatus, updateTrigger,
  findOrCreateSubject, linkChampionToSubject,
  deleteChampionInterest,
  updatePersonalWin, deletePersonalWin, restorePersonalWin,
  updateProfessionalWin, deleteProfessionalWin, restoreProfessionalWin,
} from '../db.js'

const router = Router()

router.get('/', (req, res) => {
  const includeArchived = req.query.includeArchived === 'true'
  res.json(listChampions({ includeArchived }))
})

// Personal wins — must be before /:id
router.patch('/personal-wins/:winId', (req, res) => {
  updatePersonalWin(req.params.winId, req.body)
  res.json({ ok: true })
})
router.delete('/personal-wins/:winId', (req, res) => {
  deletePersonalWin(req.params.winId)
  res.json({ ok: true })
})
router.post('/personal-wins/:winId/restore', (req, res) => {
  restorePersonalWin(req.params.winId)
  res.json({ ok: true })
})

// Professional wins — must be before /:id
router.patch('/professional-wins/:winId', (req, res) => {
  updateProfessionalWin(req.params.winId, req.body)
  res.json({ ok: true })
})
router.delete('/professional-wins/:winId', (req, res) => {
  deleteProfessionalWin(req.params.winId)
  res.json({ ok: true })
})
router.post('/professional-wins/:winId/restore', (req, res) => {
  restoreProfessionalWin(req.params.winId)
  res.json({ ok: true })
})

router.get('/:id', (req, res) => {
  const c = getChampion(req.params.id)
  if (!c) return res.status(404).json({ error: 'Not found' })
  res.json(c)
})

router.post('/', (req, res) => {
  const c = addChampion(req.body)
  res.status(201).json(c)
})

router.patch('/:id', (req, res) => {
  const c = updateChampion(req.params.id, req.body, { source: 'user' })
  res.json(c)
})

router.post('/:id/personal-wins', (req, res) => {
  res.status(201).json(addPersonalWin(req.params.id, req.body))
})

router.post('/:id/professional-wins', (req, res) => {
  res.status(201).json(addProfessionalWin(req.params.id, req.body))
})

router.patch('/professional-wins/:winId/confirm', (req, res) => {
  confirmProfessionalWin(req.params.winId)
  res.json({ ok: true })
})

router.post('/:id/interactions', (req, res) => {
  res.status(201).json(addInteraction(req.params.id, req.body))
})

router.patch('/:id/stage-criteria', (req, res) => {
  const { transition, criterion_key, met } = req.body
  updateStageCriteria(req.params.id, transition, criterion_key, met)
  res.json({ ok: true })
})

router.post('/:id/triggers', (req, res) => {
  res.status(201).json(addTrigger(req.params.id, req.body))
})

router.patch('/triggers/:triggerId/status', (req, res) => {
  updateTriggerStatus(req.params.triggerId, req.body.status)
  res.json({ ok: true })
})

router.patch('/triggers/:triggerId', (req, res) => {
  updateTrigger(req.params.triggerId, req.body)
  res.json({ ok: true })
})

router.post('/:id/interests', (req, res) => {
  try {
    const { name, type = 'topic', evidence = '' } = req.body
    if (!name) return res.status(400).json({ error: 'name is required' })
    const subject = findOrCreateSubject(name, type)
    linkChampionToSubject(req.params.id, subject.id, 'explicit', evidence)
    res.status(201).json({ ok: true, subject })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:id/interests/:subjectId', (req, res) => {
  deleteChampionInterest(req.params.id, req.params.subjectId)
  res.json({ ok: true })
})

export default router
