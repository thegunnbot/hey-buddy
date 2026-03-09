import { Router } from 'express'
import { getSettings, updateSettings } from '../db.js'

const router = Router()

// Resolve owner from Auth0 sub or fall back to 'rich' locally
function ownerId(req) {
  return req.user?.sub || 'rich'
}

// GET /api/settings
router.get('/', (req, res) => {
  try {
    const s = getSettings(ownerId(req))
    res.json({
      cadence: {
        default_days: s.cadence_default_days,
        active_deal_days: s.cadence_active_deal_days,
        overdue_threshold_days: s.overdue_threshold_days,
      },
      notifications: {
        pre_call_briefs: !!s.notify_pre_call_briefs,
        sports_triggers: !!s.notify_sports_triggers,
        cadence_alerts: !!s.notify_cadence_alerts,
        stage_prompts: !!s.notify_stage_prompts,
      },
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/settings
// Body shape matches GET response — partial updates accepted
router.put('/', (req, res) => {
  try {
    const { cadence, notifications } = req.body
    const patch = {}
    if (cadence) {
      if (cadence.default_days != null) patch.cadence_default_days = Number(cadence.default_days)
      if (cadence.active_deal_days != null) patch.cadence_active_deal_days = Number(cadence.active_deal_days)
      if (cadence.overdue_threshold_days != null) patch.overdue_threshold_days = Number(cadence.overdue_threshold_days)
    }
    if (notifications) {
      if (notifications.pre_call_briefs != null) patch.notify_pre_call_briefs = notifications.pre_call_briefs ? 1 : 0
      if (notifications.sports_triggers != null) patch.notify_sports_triggers = notifications.sports_triggers ? 1 : 0
      if (notifications.cadence_alerts != null) patch.notify_cadence_alerts = notifications.cadence_alerts ? 1 : 0
      if (notifications.stage_prompts != null) patch.notify_stage_prompts = notifications.stage_prompts ? 1 : 0
    }
    const s = updateSettings(ownerId(req), patch)
    res.json({
      cadence: {
        default_days: s.cadence_default_days,
        active_deal_days: s.cadence_active_deal_days,
        overdue_threshold_days: s.overdue_threshold_days,
      },
      notifications: {
        pre_call_briefs: !!s.notify_pre_call_briefs,
        sports_triggers: !!s.notify_sports_triggers,
        cadence_alerts: !!s.notify_cadence_alerts,
        stage_prompts: !!s.notify_stage_prompts,
      },
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
