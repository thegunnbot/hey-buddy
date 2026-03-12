/**
 * Hey Buddy — Telegram Bot
 * Standalone, self-contained. No dependency on OpenClaw.
 * Access-controlled: only approved users can interact.
 */

import TelegramBot from 'node-telegram-bot-api'
import Anthropic from '@anthropic-ai/sdk'
import cron from 'node-cron'
import {
  getTelegramSession, saveTelegramSession, clearTelegramSession,
  isApprovedUser, isAdmin, approveUser, revokeUser, listBotUsers,
  listOverdueChampions, getDueScheduledNotifications, markTriggerFired,
} from './db.js'
import { executeTool, TOOLS, SYSTEM_PROMPT } from './routes/chat.js'
import { runSportsCheck } from './sports.js'

const TOKEN = process.env.TELEGRAM_BOT_TOKEN
const RICH_ID = process.env.TELEGRAM_RICH_ID

let bot = null
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Pending access requests: userId → { from, chatId }
const pendingRequests = new Map()

// ── Bot initialisation ─────────────────────────────────────

export function startBot() {
  if (!TOKEN) {
    console.warn('⚠️  TELEGRAM_BOT_TOKEN not set — Telegram bot disabled')
    return null
  }

  bot = new TelegramBot(TOKEN, { polling: true })
  console.log('🤖 Hey Buddy Telegram bot started (@heybuddy_hx_bot)')

  bot.on('message', handleMessage)
  bot.on('callback_query', handleCallback)
  bot.on('polling_error', (err) => {
    if (err.code !== 'ETELEGRAM') console.error('Telegram polling error:', err.message)
  })

  startScheduler()
  return bot
}

// ── Access control ─────────────────────────────────────────

function checkAccess(msg) {
  const userId = String(msg.from?.id)
  return isApprovedUser('telegram', userId)
}

async function handleUnauthorised(msg) {
  const userId = String(msg.from?.id)
  const username = msg.from?.username ? `@${msg.from.username}` : msg.from?.first_name || 'Unknown'
  const chatId = msg.chat.id

  // Tell the user
  await bot.sendMessage(chatId,
    `🔒 Hey Buddy is a private assistant. If you think you should have access, ask Rich to approve you.`
  )

  // Notify Rich (admin) with approve/deny buttons — but only once per user
  if (RICH_ID && !pendingRequests.has(userId)) {
    pendingRequests.set(userId, { from: msg.from, chatId })
    await bot.sendMessage(RICH_ID,
      `🔔 Access request\n\n${username} (ID: ${userId}) just tried to use Hey Buddy.\n\nApprove them?`,
      {
        reply_markup: {
          inline_keyboard: [[
            { text: '✅ Approve', callback_data: `approve:${userId}` },
            { text: '❌ Deny', callback_data: `deny:${userId}` },
          ]],
        },
      }
    )
  }
}

// ── Callback handler (inline button presses) ───────────────

async function handleCallback(query) {
  const adminId = String(query.from?.id)
  if (!isAdmin('telegram', adminId)) return

  const [action, targetUserId] = query.data.split(':')
  const pending = pendingRequests.get(targetUserId)

  await bot.answerCallbackQuery(query.id)

  if (action === 'approve' && pending) {
    const { from, chatId: targetChatId } = pending
    const username = from?.username || null
    const displayName = [from?.first_name, from?.last_name].filter(Boolean).join(' ') || username || targetUserId
    approveUser('telegram', targetUserId, username, displayName, adminId, 'user')
    pendingRequests.delete(targetUserId)

    // Update the admin notification
    await bot.editMessageText(
      `✅ Approved ${displayName} (${targetUserId})`,
      { chat_id: query.message.chat.id, message_id: query.message.message_id }
    )
    // Notify the newly approved user
    await bot.sendMessage(targetChatId, `✅ You've been approved! Send me a message to get started.`)

  } else if (action === 'deny' && pending) {
    pendingRequests.delete(targetUserId)
    await bot.editMessageText(
      `❌ Denied access for user ${targetUserId}`,
      { chat_id: query.message.chat.id, message_id: query.message.message_id }
    )
  }
}

// ── Message handler ────────────────────────────────────────

async function handleMessage(msg) {
  const chatId = msg.chat.id
  const userId = String(msg.from?.id)
  const text = msg.text
  if (!text) return

  // Access check
  if (!checkAccess(msg)) {
    return handleUnauthorised(msg)
  }

  // Admin commands
  if (text.startsWith('/') && isAdmin('telegram', userId)) {
    return handleAdminCommand(msg)
  }

  // Standard commands
  if (text === '/start') {
    return bot.sendMessage(chatId,
      `👋 Hey Rich — I'm Hey Buddy, your champion relationship assistant.\n\nAsk me anything, log an interaction, or paste a call transcript and I'll extract the intel.`
    )
  }
  if (text === '/new') {
    clearTelegramSession(userId)
    return bot.sendMessage(chatId, '🔄 Fresh start — conversation history cleared.')
  }

  if (text === '/help') {
    return bot.sendMessage(chatId,
      `What I can do:\n\n` +
      `• "Who should I reach out to today?"\n` +
      `• "Log a call with James — he mentioned Chelsea"\n` +
      `• "What's my weakest relationship right now?"\n` +
      `• "Add Sarah Clarke at Lloyd's as a new prospect"\n` +
      `• Paste a call transcript → I'll extract champion intel\n\n` +
      `Type /new to start a fresh conversation.\n\n` +
      `Just talk naturally.`
    )
  }

  // Easter egg 🇨🇦
  if (text.trim().toLowerCase() === 'hey buddy') {
    return bot.sendMessage(chatId, "I'm not your buddy, friend. 🇨🇦\n\nhttps://youtu.be/m1JakODvYhA?si=X7fqez78mIIB9EgA")
  }

  // Show typing
  bot.sendChatAction(chatId, 'typing')

  // Load history + run agent
  const session = getTelegramSession(userId)
  const messages = [...session.messages, { role: 'user', content: text }]

  try {
    const response = await runAgentLoop(messages)
    saveTelegramSession(userId, [...messages, { role: 'assistant', content: response.text }], msg.from?.username)
    await sendLongMessage(chatId, response.text)
  } catch (err) {
    console.error('Bot message error:', err)
    bot.sendMessage(chatId, '⚠️ Something went wrong. Try again in a moment.')
  }
}

// ── Admin commands ─────────────────────────────────────────

async function handleAdminCommand(msg) {
  const chatId = msg.chat.id
  const text = msg.text.trim()

  if (text === '/users') {
    const users = listBotUsers('telegram')
    if (!users.length) return bot.sendMessage(chatId, 'No approved users yet.')
    const lines = users.map(u =>
      `${u.role === 'admin' ? '👑' : '👤'} ${u.display_name || u.platform_username || u.platform_user_id} (${u.platform_user_id})`
    )
    return bot.sendMessage(chatId, `Approved users:\n\n${lines.join('\n')}`)
  }

  if (text.startsWith('/revoke ')) {
    const targetId = text.replace('/revoke ', '').trim()
    revokeUser('telegram', targetId)
    return bot.sendMessage(chatId, `✅ Revoked access for ${targetId}`)
  }

  if (text.startsWith('/invite ')) {
    const targetId = text.replace('/invite ', '').trim()
    if (!targetId) return bot.sendMessage(chatId, 'Usage: /invite <telegram_user_id>')
    approveUser('telegram', targetId, null, null, userId, 'user')
    // Try to notify the invited user (only works if they've started the bot before)
    try {
      await bot.sendMessage(targetId,
        `👋 You've been given access to Hey Buddy by Rich. Send me a message to get started, or type /help to see what I can do.`
      )
    } catch {
      // User hasn't started the bot yet — that's fine
    }
    return bot.sendMessage(chatId,
      `✅ Pre-approved user ${targetId}.\n\nIf they've already started the bot they'll receive a notification. Otherwise, ask them to message @heybuddy_hx_bot to get started.`
    )
  }

  if (text === '/start' || text === '/help') return // handled above
}

// ── Agentic loop ───────────────────────────────────────────

async function runAgentLoop(messages) {
  const msgHistory = [...messages]
  let response

  while (true) {
    response = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1024,
      system: SYSTEM_PROMPT + '\n\nYou are responding via Telegram. Keep responses concise — short paragraphs, plain text. Avoid heavy markdown.',
      tools: TOOLS,
      messages: msgHistory,
    })

    if (response.stop_reason === 'tool_use') {
      msgHistory.push({ role: 'assistant', content: response.content })
      const toolResults = []
      for (const block of response.content) {
        if (block.type === 'tool_use') {
          const result = executeTool(block.name, block.input)
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) })
        }
      }
      msgHistory.push({ role: 'user', content: toolResults })
    } else {
      break
    }
  }

  const textBlock = response.content.find(b => b.type === 'text')
  return { text: textBlock?.text || '' }
}

// ── Utilities ──────────────────────────────────────────────

async function sendLongMessage(chatId, text) {
  const MAX = 4000
  if (text.length <= MAX) return bot.sendMessage(chatId, text)
  const chunks = []
  let current = ''
  for (const para of text.split('\n\n')) {
    if ((current + para).length > MAX) {
      if (current) chunks.push(current.trim())
      current = para
    } else {
      current += (current ? '\n\n' : '') + para
    }
  }
  if (current) chunks.push(current.trim())
  for (const chunk of chunks) {
    await bot.sendMessage(chatId, chunk)
    await new Promise(r => setTimeout(r, 300))
  }
}

export function sendTelegramMessage(chatId, text, options = {}) {
  if (!bot) return
  return bot.sendMessage(chatId || RICH_ID, text, options)
}

// ── Internal scheduler ─────────────────────────────────────

function startScheduler() {

  // ── 8:00 AM ET daily — cadence alerts ─────────────────────
  cron.schedule('0 8 * * *', async () => {
    if (!bot || !RICH_ID) return
    try {
      await sendCadenceAlert()
    } catch (err) {
      console.error('[scheduler] Cadence alert error:', err.message)
    }
  }, { timezone: 'America/New_York' })

  // ── Every 15 min — fire due scheduled notifications ────────
  cron.schedule('*/15 * * * *', async () => {
    if (!bot || !RICH_ID) return
    try {
      await fireScheduledNotifications()
    } catch (err) {
      console.error('[scheduler] Notification firing error:', err.message)
    }
  })

  // ── 7:00 PM ET daily — nightly sports fixture check ───────
  cron.schedule('0 19 * * *', async () => {
    if (!bot || !RICH_ID) return
    try {
      const result = await runSportsCheck()
      if (result.created > 0) {
        await bot.sendMessage(RICH_ID,
          `⚽ Sports check — ${result.created} new match trigger${result.created > 1 ? 's' : ''} queued.\n\nOpen Hey Buddy to review and approve them.`
        )
      }
    } catch (err) {
      console.error('[scheduler] Sports check error:', err.message)
    }
  }, { timezone: 'America/New_York' })

  // ── 1st of month, 9:00 AM ET — travel check-in ────────────
  cron.schedule('0 9 1 * *', () => {
    if (bot && RICH_ID) {
      bot.sendMessage(RICH_ID,
        `🗺️ Hey Buddy monthly check-in — do you have any travel coming up in the next few weeks?\n\nIf so, where and when? I'll pull up your champions in those cities and queue some suggested outreach.`
      )
    }
  }, { timezone: 'America/New_York' })

  console.log('📅 Scheduler started — cadence alerts 8am ET | notifications every 15min | sports check 7pm ET | travel check-in 1st of month')
}

// ── Cadence alert ──────────────────────────────────────────

async function sendCadenceAlert() {
  const overdue = listOverdueChampions()
  if (!overdue.length) return

  const overdueList = overdue.filter(c => c.status === 'overdue')
  const approachingList = overdue.filter(c => c.status === 'approaching')

  if (!overdueList.length && !approachingList.length) return

  const lines = []

  if (overdueList.length) {
    lines.push(`🔴 *Overdue* (${overdueList.length})`)
    for (const c of overdueList) {
      const cadenceLabel = c.cadenceDays === 7 ? 'weekly' : c.cadenceDays === 14 ? 'fortnightly' : 'monthly'
      lines.push(`• ${c.name} (${c.company}) — ${c.daysSince}d since last contact (${cadenceLabel} cadence)`)
    }
  }

  if (approachingList.length) {
    lines.push(`\n🟡 *Approaching* (${approachingList.length})`)
    for (const c of approachingList) {
      const daysLeft = c.cadenceDays - c.daysSince
      lines.push(`• ${c.name} (${c.company}) — due in ${daysLeft}d`)
    }
  }

  lines.push(`\nReply to chat or open Hey Buddy to see suggested outreach.`)

  const total = overdueList.length + approachingList.length
  const header = `📊 *Cadence check — ${total} champion${total > 1 ? 's' : ''} need${total === 1 ? 's' : ''} attention*\n`

  await bot.sendMessage(RICH_ID, header + lines.join('\n'), { parse_mode: 'Markdown' })
}

// ── Fire scheduled notifications ──────────────────────────

async function fireScheduledNotifications() {
  const due = getDueScheduledNotifications()
  for (const trigger of due) {
    const championContext = trigger.champion_name
      ? ` (re: ${trigger.champion_name}, ${trigger.champion_company})`
      : ''
    const msg = `🔔 *${trigger.title}*${championContext}\n\n${trigger.description}`
    await bot.sendMessage(RICH_ID, msg, { parse_mode: 'Markdown' })
    markTriggerFired(trigger.id)
    console.log(`[scheduler] Fired notification: ${trigger.title}`)
  }
}
