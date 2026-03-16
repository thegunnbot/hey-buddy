# Hey Buddy 🤝

**AI-powered champion relationship intelligence for enterprise sales.**

Built at 3am on paternity leave, using an AI agent, to build an AI agent.

---

## What is this?

In complex B2B sales, deals are won by *champions* — the internal advocates who drive buying decisions from inside an account. Keeping those relationships warm is everything. But the human details get lost. The moment passes. The deal dies.

No CRM tracks what actually matters.

Hey Buddy does.

---

## What it does

**Two things simultaneously:**

### 1. A full-stack web application
- Champion profiles with relationship health scores
- Personal wins, professional milestones, family context, interest tracking
- Full interaction history
- MEDDICC-aligned deal stage progression
- Action management — mark done, dismiss, snooze with duration

### 2. A proactive standalone agent
- Runs a daily intelligence scan across all champions (weekdays, 7:30am)
- Surfaces signals: company news, press mentions, topics matching a champion's known interests
- Generates contextually-aware outreach — warm, personalised, grounded in relationship history
- Pushes alerts via Telegram bot with suggested actions ready to take
- Doesn't wait to be asked

---

## The intelligence layer

Every morning the agent scans for *moments* — not reminders, but genuine reasons to reach out. An Arsenal win for a season ticket holder. A company announcement. A topic that maps to something a champion cares about. It tags, links, and surfaces them for the user to act on.

---

## The meta layer

When a user reports a bug or requests a feature inside the app, a webhook fires to an AI agent on Telegram. The agent analyses the feedback, recommends a fix, and on approval — implements it.

The tool that manages relationships is also the tool that builds itself.

---

## Tech stack

| Layer | Stack |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Node.js, Express |
| Database | SQLite (better-sqlite3) |
| AI | Anthropic Claude (claude-3-5-sonnet, claude-3-5-haiku) |
| Bot | Telegram (node-telegram-bot-api) |
| Process | pm2 |

---

## Running locally

```bash
# Install dependencies
npm install

# Copy env template and fill in your keys
cp .env.example .env

# Start everything (server + UI dev server)
npm run dev
```

**Required env vars:**
```
ANTHROPIC_API_KEY=        # Required — powers the AI layer
TELEGRAM_BOT_TOKEN=       # Optional — enables the Telegram bot
TELEGRAM_RICH_ID=         # Your Telegram user ID (bot allowlist)
WEB_PASSWORD=             # Simple passphrase for the web UI
```

---

## Project structure

```
hey-buddy/
├── src/              # React frontend
│   ├── pages/        # Home, Champions, Intelligence, Settings
│   └── components/   # Shared UI components
├── server/           # Express backend
│   ├── routes/       # API routes
│   ├── db.js         # SQLite database layer
│   └── bot.js        # Telegram bot
├── db/               # SQLite schema (data excluded from repo)
└── .env.example      # Environment variable template
```

---

## Origin story

v1 was built between 3am–4:30am on paternity leave, via Telegram, using an OpenClaw AI agent. No IDE. No laptop. Just chat and a newborn who wouldn't sleep.

Submitted to [Agent Madness 2026](https://www.agentmadness.ai) — a 64-entry bracket tournament to find the coolest AI agent of the year.

---

## Status

Active personal tool. Used in production on real deals.

Not open for contributions currently, but issues and feedback welcome.

---

*Built by a revenue leader who got tired of forgetting the things that matter.*
