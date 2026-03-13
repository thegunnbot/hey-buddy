import { Database, Cpu, Bot, Zap, MessageSquare, Globe, Key, Layers, Brain, Code2, Repeat2, FlaskConical, ShieldCheck, CheckCircle2, Lock, AlertTriangle } from 'lucide-react'

function Section({ icon: Icon, color, title, children }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background: `${color}15` }}>
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
        <h2 className="text-lg font-bold" style={{ color: '#0f1924' }}>{title}</h2>
      </div>
      {children}
    </section>
  )
}

function Card({ icon: Icon, title, body, accent }) {
  return (
    <div className="rounded-xl p-5 space-y-2" style={{ border: '1px solid #e8e8e8', background: '#fafafa' }}>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 shrink-0" style={{ color: accent || '#848d9a' }} />}
        <p className="text-sm font-semibold" style={{ color: '#0f1924' }}>{title}</p>
      </div>
      <p className="text-sm leading-relaxed" style={{ color: '#505862' }}>{body}</p>
    </div>
  )
}

function Pill({ label, color }) {
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ background: `${color}18`, color }}>
      {label}
    </span>
  )
}

export default function MeetBuddy() {
  return (
    <div className="h-full overflow-auto" style={{ background: '#ffffff' }}>
      <div className="max-w-3xl mx-auto px-8 py-10 space-y-12">

        {/* Hero */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <Pill label="v0.1 MVP" color="#59bbb7" />
            <Pill label="Local build" color="#848d9a" />
          </div>
          <h1 className="text-3xl font-bold" style={{ color: '#0f1924' }}>Meet Buddy</h1>
          <p className="text-base leading-relaxed" style={{ color: '#505862', maxWidth: '60ch' }}>
            Hey Buddy is a champion relationship intelligence system built on MEDDICC principles.
            It helps senior sales executives build authentic, sustained relationships with the people
            who actually move deals forward — without relying on CRM fields or gut instinct alone.
          </p>
        </div>

        {/* Tech Stack */}
        <Section icon={Code2} color="#4e70f8" title="Tech stack">
          <div className="grid grid-cols-2 gap-3">
            <Card icon={Globe} accent="#49deff" title="Frontend"
              body="React 18 + Vite, Tailwind CSS utility styling with hx brand tokens, Lucide icons. Single-page app at localhost:5173 (or via ngrok static domain externally) proxying API calls to the backend. Also managed by PM2." />
            <Card icon={Database} accent="#59bbb7" title="Backend"
              body="Node.js + Express, running on port 3001. ES modules throughout. Rate limiting (60 req/min general, 20 req/min chat). Managed by PM2 — auto-restarts on crash, auto-starts on Mac login. Auth0 middleware stub ready for deployment." />
            <Card icon={Database} accent="#ee6c5b" title="Database"
              body="SQLite for local development (better-sqlite3). Schema is clean and portable — designed for a straight migration to PostgreSQL at production deployment on Railway or Render." />
            <Card icon={MessageSquare} accent="#f5a623" title="Telegram bot"
              body="Standalone @heybuddy_hx_bot via node-telegram-bot-api. Long-polling locally, webhook at production. Full access control with inline approval buttons and admin commands." />
            <Card icon={Repeat2} accent="#848d9a" title="Internal scheduler"
              body="node-cron powers four recurring jobs: daily 8am cadence alerts (overdue/approaching champions), every-15-min scheduled notification firing, nightly 7pm sports fixture check, and monthly travel check-in. Hey Buddy also fires push events to an OpenClaw webhook on new feedback — no polling required." />
            <Card icon={Key} accent="#ee6c5b" title="Security"
              body="Prompt injection defences, XML transcript sandboxing, rate limiting, API key auth for agent-to-agent calls. Auth0 JWT stub ready to activate at deployment." />
          </div>
        </Section>

        {/* Intelligence Layer */}
        <Section icon={Layers} color="#59bbb7" title="Intelligence layer">
          <p className="text-sm leading-relaxed mb-4" style={{ color: '#505862' }}>
            Hey Buddy's intelligence engine has three distinct layers that work together to surface the right action at the right moment.
          </p>
          <div className="space-y-3">
            <Card icon={Brain} accent="#59bbb7" title="Layer 1 — Relationship signals"
              body="Each champion has a live health score (0–100) built from recency, interaction depth, stage criteria, and momentum. The system tracks personal wins (outside-work interests), professional wins (career goals explicitly confirmed), and custom triggers — events that should always prompt a touchpoint." />
            <Card icon={Zap} accent="#49deff" title="Layer 2 — Subject registry & cross-reference"
              body="Interests extracted from conversations (sport, hobbies, life events) are stored in a global subject registry. When a signal fires — a sports result, a news event — it's matched across all champions to surface relevant touchpoints. One signal can generate personalised actions for multiple users' champions simultaneously." />
            <Card icon={Cpu} accent="#4e70f8" title="Layer 3 — User personalisation"
              body="Each user has a profile (sports teams, interests, home city, role) and tone samples (writing examples, split by WhatsApp/text vs email). The AI uses this to match message style to the user's voice, spot shared interests between user and champion (stronger touchpoints), flag rival-team banter, and improve over time via a feedback loop when users share what they actually sent." />
          </div>
          <div className="rounded-xl p-4 mt-2" style={{ background: '#f0faf9', border: '1px solid #59bbb730' }}>
            <p className="text-sm" style={{ color: '#2d7d79' }}>
              <strong>Location awareness:</strong> Champions store a city and country. Monthly travel check-ins via Telegram let you surface nearby champions when you're on the road — no calendar integration required.
            </p>
          </div>
        </Section>

        {/* AI */}
        <Section icon={Brain} color="#ee6c5b" title="How Hey Buddy uses AI">
          <div className="space-y-3">
            <Card icon={MessageSquare} accent="#ee6c5b" title="Agentic chat loop"
              body="The web chat uses Claude Sonnet (claude-sonnet-4-6) with a full tool-use loop. The Telegram bot uses Claude Haiku for cost efficiency. Both can read and write champion data directly — adding interactions, logging wins, proposing triggers, updating stage criteria — all from natural conversation. No form-filling required." />
            <Card icon={Layers} accent="#59bbb7" title="Personalised system prompt"
              body="Before every message, the system prompt is dynamically built from the user's profile and tone samples. Claude knows who the user is, how they write, what they care about, and what channel they prefer — so every suggestion feels like it came from the user, not a template." />
            <Card icon={Zap} accent="#49deff" title="Short/long message generation"
              body="Action cards suggest short (WhatsApp/text) messages by default. Users can toggle to email — Hey Buddy generates a polished version on demand, rewriting the short message in an appropriate email format while preserving the user's voice." />
            <Card icon={Brain} accent="#f5a623" title="Transcript intelligence"
              body="Paste or upload a call transcript and Hey Buddy extracts champion intel — personal wins, professional wins, stage signals — and proactively proposes triggers for any interests it spots. All in one pass, no manual tagging." />
          </div>
        </Section>

        {/* Buddy as an agent */}
        <Section icon={Bot} color="#49deff" title="Buddy as an agent">
          <p className="text-sm leading-relaxed mb-4" style={{ color: '#505862' }}>
            Hey Buddy is designed to work as a standalone agent — and to integrate cleanly with other agents in your personal AI ecosystem.
          </p>
          <div className="space-y-3">
            <Card icon={Bot} accent="#49deff" title="Using Buddy as your agent"
              body="Every interaction — via the web app or Telegram — is handled by an agentic Claude loop with access to your full champion graph. Ask in natural language: 'Who should I reach out to this week?', 'Add a trigger for Sarah when Chelsea play Arsenal', 'Log that I had dinner with James last night'. Buddy reads, reasons, and writes." />
            <Card icon={Key} accent="#4e70f8" title="API access for other agents"
              body="Hey Buddy exposes a REST API secured with an API key (X-HeyBuddy-Key header). Any external agent — including a personal AI assistant — can query or update Hey Buddy programmatically. Pass X-HeyBuddy-Agent-Id to tag which agent is calling. Useful for orchestration: a personal assistant can surface champion context without the user switching tools." />
            <Card icon={Globe} accent="#59bbb7" title="OpenClaw webhook integration"
              body="Hey Buddy pushes real-time events to an OpenClaw webhook (POST /hooks/agent) rather than relying on polling. New feedback triggers an immediate agent run which analyses it and sends Rich a Telegram alert with recommendations. The webhook URL is environment-variable driven — ready for Tailscale or any future hosting without code changes." />
            <Card icon={Globe} accent="#59bbb7" title="MCP — coming soon"
              body="Hey Buddy's tool definitions (get_champion, add_interaction, list_champions, propose_trigger and more) are already structured close to the Model Context Protocol standard. A future MCP server will expose these as first-class tools to any Claude-based agent — allowing direct tool calls rather than going through the chat API wrapper." />
          </div>
          <div className="rounded-xl p-4 mt-2" style={{ background: '#f0f8ff', border: '1px solid #49deff30' }}>
            <p className="text-xs font-mono" style={{ color: '#2d6e8e' }}>
              POST /api/chat<br />
              X-HeyBuddy-Key: {'<key>'}<br />
              X-HeyBuddy-Agent-Id: thegunnbot<br />
              {'{'} "messages": [{'{'}  "role": "user", "content": "Who is Rich behind on?" {'}'}] {'}'}
            </p>
          </div>
        </Section>

        {/* Testing */}
        <Section icon={FlaskConical} color="#59bbb7" title="Testing">
          <p className="text-sm leading-relaxed mb-4" style={{ color: '#505862' }}>
            Hey Buddy has a test suite covering the three layers of the stack — database, routes, and integration.
            Tests run in complete isolation using an in-memory SQLite database, so no test data ever touches the live DB.
          </p>
          <div className="space-y-3">
            <Card icon={Database} accent="#59bbb7" title="Layer 1 — Database (23 tests)"
              body="Covers all core db.js functions: addChampion, addInteraction, addPersonalWin, addProfessionalWin, updateStageCriteria, archiveChampion, addFeedback, getChampionsByLocation, computeHealthScore, and more. Each function is tested with realistic inputs and edge cases." />
            <Card icon={Globe} accent="#4e70f8" title="Layer 2 — Routes (7 tests)"
              body="Integration tests for the Champions REST API using supertest — GET /api/champions, POST (create), PATCH (update), archive/unarchive endpoints. Tests verify HTTP status codes, response shapes, and that DB state is correctly updated." />
            <Card icon={Zap} accent="#f5a623" title="Layer 3 — Feature routes (3 tests)"
              body="Tests for the /api/travel endpoint — verifying that location-based champion lookup returns correct results for known cities and gracefully handles unknown locations." />
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="rounded-xl p-4" style={{ background: '#f0faf9', border: '1px solid #59bbb730' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: '#2d7d79' }}>Stack</p>
              <p className="text-xs" style={{ color: '#505862' }}>vitest · supertest · @vitest/coverage-v8</p>
              <p className="text-xs mt-1" style={{ color: '#505862' }}>DB_PATH=:memory: via vitest.config.js</p>
              <p className="text-xs mt-1" style={{ color: '#505862' }}>resetDb() isolates each test suite</p>
            </div>
            <div className="rounded-xl p-4" style={{ background: '#f0faf9', border: '1px solid #59bbb730' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: '#2d7d79' }}>Commands</p>
              <p className="text-xs font-mono" style={{ color: '#505862' }}>npm test</p>
              <p className="text-xs font-mono mt-1" style={{ color: '#505862' }}>npm run test:watch</p>
              <p className="text-xs font-mono mt-1" style={{ color: '#505862' }}>npm run test:coverage</p>
            </div>
          </div>
          <div className="rounded-xl p-4 mt-1" style={{ background: '#fffbf0', border: '1px solid #f5a62330' }}>
            <p className="text-sm" style={{ color: '#8a6200' }}>
              <strong>Convention:</strong> every new route or DB function must have a corresponding test written in the same change.
              Tests are a manual gate today; they become the default pre-deploy CI/CD gate at the SaaS transition.
            </p>
          </div>
        </Section>

        {/* Security */}
        <Section icon={ShieldCheck} color="#ee6c5b" title="Security">
          <p className="text-sm leading-relaxed mb-4" style={{ color: '#505862' }}>
            Hey Buddy handles sensitive relationship data and has access to an LLM — both of which require deliberate security design.
            The approach layers defences across access control, AI safety, API protection, and data handling.
          </p>
          <div className="space-y-3">
            <Card icon={AlertTriangle} accent="#ee6c5b" title="Prompt injection defence"
              body="Two-layer protection against malicious content in transcripts or external data. The system prompt explicitly instructs the model to ignore instructions found in external content. Any transcript or pasted text is wrapped in an XML sandbox tag (<untrusted_external_transcript>) — the model is instructed to treat everything inside as data to analyse, never as instructions to follow." />
            <Card icon={Lock} accent="#4e70f8" title="Telegram access control"
              body="Hard allowlist gate — unknown users cannot interact with the bot at all. Any new user triggers an inline Approve/Deny notification to the admin. Admins can pre-approve users with /invite, list users with /users, and revoke access with /revoke. Access approval is only possible via the admin interface — there is no AI tool that can approve users, preventing prompt-based escalation." />
            <Card icon={Zap} accent="#f5a623" title="Rate limiting"
              body="express-rate-limit applied at two tiers: 60 requests/minute on the general API, 20 requests/minute on the chat endpoint. Protects against both accidental loops (e.g. a runaway agent) and deliberate abuse. Limits apply per IP." />
            <Card icon={Key} accent="#59bbb7" title="API key authentication (agent access)"
              body="Machine-to-machine calls use a separate X-HeyBuddy-Key header validated strictly — a wrong key always returns 401, even in dev mode with AUTH_ENABLED=false. An optional X-HeyBuddy-Agent-Id header tags the calling agent for audit purposes." />
            <Card icon={ShieldCheck} accent="#848d9a" title="Auth0 middleware stub"
              body="requireAuth middleware is applied to every protected route today. Currently a pass-through in local dev — activate at deployment by installing express-oauth2-jwt-bearer and setting AUTH_ENABLED=true, AUTH0_DOMAIN, and AUTH0_AUDIENCE. No route changes needed at that point." />
            <Card icon={Database} accent="#ee6c5b" title="Data handling"
              body="No hard deletes — champions are soft-archived (archived=1 flag) so data is always recoverable. API keys, bot tokens, and the Anthropic key live in .env only — excluded from git via .gitignore. Uploaded files (feedback screenshots) are stored in uploads/ which is also gitignored. DB file never leaves the local machine until an explicit production migration." />
          </div>
          <div className="mt-3 rounded-xl overflow-hidden" style={{ border: '1px solid #e8e8e8' }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: '#f8f8f8' }}>
                  <th className="text-left px-4 py-2.5 font-semibold" style={{ color: '#0f1924' }}>Threat</th>
                  <th className="text-left px-4 py-2.5 font-semibold" style={{ color: '#0f1924' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Prompt injection via chat message', '✅ System prompt rule'],
                  ['Malicious content in transcripts', '✅ XML sandbox wrapper'],
                  ['Unapproved Telegram access', '✅ Hard gate + inline approval'],
                  ['Approval via prompt manipulation', '✅ No AI tool exists for approval'],
                  ['API abuse / LLM cost overrun', '✅ Rate limited (60/min general, 20/min chat)'],
                  ['Agent impersonation', '✅ Strict API key — wrong key always 401'],
                  ['Secret leakage via git', '✅ .env + db + uploads all gitignored'],
                  ['Web app unauthenticated access', '⏳ Auth0 stub — activate at deployment'],
                ].map(([threat, status], i) => (
                  <tr key={i} style={{ borderTop: '1px solid #f0f0f0' }}>
                    <td className="px-4 py-2.5" style={{ color: '#505862' }}>{threat}</td>
                    <td className="px-4 py-2.5 font-medium" style={{ color: status.startsWith('✅') ? '#2d7d79' : '#8a6200' }}>{status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Footer */}
        <div className="pt-4 pb-8" style={{ borderTop: '1px solid #e8e8e8' }}>
          <p className="text-xs" style={{ color: '#c0c0c0' }}>
            Hey Buddy — built for hyperexponential · v0.1 local · designed for Railway/Render + Auth0 + PostgreSQL at production
          </p>
        </div>

      </div>
    </div>
  )
}
