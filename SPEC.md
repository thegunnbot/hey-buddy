# Hey Buddy — Product Specification
_Version 0.1 — Mar 5, 2026_

---

## 1. Vision & Principles

**Hey Buddy** is a champion relationship intelligence system for enterprise sales. It helps the user build authentic, deep relationships with champions — moving them from Identified through to Leverage — by acting as his memory, accountability partner, and opportunity spotter.

**Core principles:**
- the user makes every decision and sends every message. Hey Buddy suggests, prompts, and prepares — it never acts autonomously.
- Relationships are built authentically. The system surfaces opportunities; the user brings the humanity.
- Push-first. Hey Buddy comes to the user with what matters. He doesn't have to go looking.
- Start small, scale deliberately. MVP handles 10 champions (5 prospects, 5 customers). Architected for 30.
- Built to be ported. MVP runs locally with Telegram. Designed for redeployment on a work estate with Teams and enterprise integrations.

---

## 2. The Champion Model

### Who is a champion?
A champion is a person inside a prospect or customer organisation who has power, influence, and credibility — and who can sell on the user's behalf when he's not in the room. Building a champion is about developing a genuine, mutual relationship: understanding what they care about personally and professionally, and investing in those things over time.

### Champion types
- **Prospect champion** — an exec at an active prospect account. Relationship has a deal endpoint.
- **Customer champion** — an exec at a closed/existing account. Enters nurture & leverage mode post-deal (references, introductions, expansions). v2 scope; stub in MVP.

### Champion profile fields
- Name, company, role, seniority
- LinkedIn profile URL
- Personal contact (mobile/WhatsApp) — added when available
- Stage (Identified / Building / Test / Leverage)
- Deal status (pre-SQO / post-SQO / closed-won / closed-lost)
- **Personal wins** — things they care about outside work: sports teams, hobbies, family context, personal ambitions
- **Professional wins** — how the user's project ties to their career goals and objectives
- Pain — the specific problem they're trying to solve in their role
- Internal context — org dynamics, key stakeholders, blockers (added as discovered)
- Interaction log — all touchpoints: date, type (call/email/WhatsApp/event), notes, messages sent
- Stage checklist — criteria met / outstanding for current stage transition
- Next suggested action + suggested date
- Health status (Green / Amber / Red)

---

## 3. Champion Lifecycle & Stage Criteria

### Stages
**Identified → Building → Test → Leverage**

---

### Identified → Building
_Bar: Do I know enough about this person to invest in them?_

Required:
1. Have had a 1-1 conversation (not just a group call)
2. Identified at least one **personal win** — something they care about outside the project (sport, hobby, ambition, family context)
3. Identified at least one **professional win** — how the user's project ties to their career goals or objectives

Nice to have:
- Personal contact (mobile/WhatsApp)

---

### Building → Test
_Bar: Have they shown real investment in me?_

Required:
1. They've **explicitly confirmed their professional win** — said it out loud, not just implied
2. They've shared internal context the user couldn't get elsewhere (org dynamics, blockers, key stakeholders)
3. At least one interaction in a **non-sales context** (dinner, event, informal call)
4. Have their **personal contact** (mobile/WhatsApp)

---

### Test → Leverage
_Bar: Have they proven they'll act for me when I'm not in the room?_

Required:
1. the user gave them a specific task and they **delivered**
2. They've proactively shared competitive or deal-critical intelligence
3. They've shown up for the user in a way that **wasn't directly in their interest**

---

### Leverage (sustaining)
_Bar: Are they actively selling for me — and is the personal relationship being maintained?_

Required:
1. They're influencing internal discussions without the user present
2. They're connected to deal acceleration (timeline, access, stakeholder alignment)
3. Active **personal win maintenance** — ongoing investment in the personal relationship (events, shared interests, meaningful moments)
4. Identifying expansion or new opportunity signals on the user's behalf

---

## 4. Cadence Rules

| Condition | Minimum touchpoint frequency |
|---|---|
| Any stage, no active deal | Monthly |
| Any stage, post-SQO (active deal) | Every 2 weeks |
| Event-driven trigger | As triggered (overrides cadence) |

**Health status:**
- 🟢 Green — last touchpoint within cadence window
- 🟡 Amber — approaching cadence deadline (within 5 days)
- 🔴 Red — overdue

---

## 5. Trigger Engine

The trigger engine monitors signals and surfaces outreach opportunities to the user via Telegram (MVP). the user always approves before anything is sent.

### Trigger types (MVP)

**Sports triggers**
- Chelsea FC result → suggest message to any champion who supports Chelsea
- England football / rugby result or fixture → same logic
- Custom sport per champion (e.g., champion supports Tottenham, follows golf)
- Upcoming sporting event relevant to a champion → suggest the user attends with them

**Cadence triggers**
- Champion approaching amber/red status → nudge the user to make contact

**Calendar triggers**
- Meeting with a known champion in the next 30 minutes → push pre-call brief

**Transcript triggers**
- New transcript uploaded → extract personal/professional wins, flag for the user to validate

### Trigger types (v2)
- Company/industry news relevant to a champion's organisation
- LinkedIn activity (role change, post, milestone)
- Internal Gong/Metaview call intel
- Salesforce deal stage change → adjust cadence automatically
- Notion/internal milestone → prompt outreach

### Trigger output format (Telegram)
```
🎯 Hey Buddy — Outreach Opportunity

Champion: James Mitchell (Meridian Insurance, CTO)
Trigger: Chelsea beat Man City 2-1 last night
Stage: Building | Last contact: 12 days ago

Suggested message:
"James — what a result last night! Cole Palmer was unreal. Hope you caught it 🔵"

Reply YES to send, EDIT to tweak, or SKIP to dismiss.
```
_(MVP: the user sends manually. v2: YES triggers send via WhatsApp/email integration.)_

---

## 6. Pre-Call Brief

Triggered 30 minutes before any calendar event that includes a known champion.

**Brief includes:**
- Champion name, role, company, stage
- Days since last touchpoint + what it was
- Personal wins to reference
- Professional wins + current deal context
- Outstanding stage criteria (what to try to advance)
- Suggested talking points / goals for the call
- Recent news about their company (if available)

---

## 7. Interfaces

### 7a. Telegram (MVP messaging layer)
- Receives push nudges (triggers, cadence alerts, pre-call briefs)
- the user can reply to interact: YES / EDIT / SKIP / INFO
- On Teams when ported to work estate

### 7b. Web Dashboard

**Tab 1: Home**
- Action queue: top 3–5 things needing attention today (overdue touchpoints, upcoming triggers, pre-call briefs)
- Pipeline board (kanban): four columns — Identified | Building | Test | Leverage
- Each champion card shows: name + company, health indicator (🟢🟡🔴), last interaction, next suggested action

**Tab 2: Champions**
- Full list view with filters: stage, health, deal status, last touchpoint
- Click into a champion → full profile view:
  - Personal wins, professional wins, pain, internal context
  - LinkedIn profile link
  - Stage checklist (criteria met / outstanding)
  - Full interaction log
  - AI-suggested next actions
  - Upcoming triggers

**Tab 3: Methodology**
- The Hey Buddy framework: stage definitions, criteria checklists, cadence rules
- Editable — the user can customise criteria over time
- Reference material for onboarding future users

**Tab 4: Settings** _(stubbed in MVP)_
- Cadence rules
- Notification preferences
- Integration connections (Salesforce, Gong, Notion, Teams)

---

## 8. Tech Stack

| Layer | MVP | Future |
|---|---|---|
| Backend | Node.js | Node.js |
| Database | SQLite (via better-sqlite3) | PostgreSQL |
| Web UI | React + Tailwind CSS | Same |
| Messaging | Telegram (via OpenClaw) | Microsoft Teams |
| AI | Anthropic Claude (via OpenClaw) | Same |
| Auth | None (local MVP) | SSO / work identity |
| Hosting | Local (the user's machine) | Work cloud estate |
| Integrations | None | Salesforce, Gong, Metaview, Notion, LinkedIn |

**Data storage:** Champion profiles stored as SQLite database. Portable — easy to migrate to Postgres when moving to work estate.

---

## 9. MVP Build Plan

### Phase 1 — Foundation & UI mockup
- [ ] Data model (SQLite schema for champion profiles, interactions, triggers)
- [ ] Web dashboard mockup — all 4 tabs, static data, no backend logic
- [ ] Validate UX with the user before building logic

### Phase 2 — Core intelligence
- [ ] Transcript upload + AI extraction (personal/professional wins)
- [ ] Validation flow (Rich reviews AI output before it's saved)
- [ ] Manual champion entry/editing via dashboard
- [ ] Stage checklist logic

### Phase 3 — Trigger engine & Telegram
- [ ] Sports trigger monitoring (Chelsea, England rugby/football)
- [ ] Cadence tracking + health status
- [ ] Telegram push notifications with suggested messages
- [ ] Pre-call brief (calendar integration)

### Phase 4 — Polish & prep for port
- [ ] Custom sport/interest triggers per champion
- [ ] Interaction log (Rich can log touchpoints)
- [ ] Methodology tab content
- [ ] Clean API layer ready for work estate deployment

---

## 10. Out of Scope (MVP)

- Salesforce, Gong, Metaview, Notion integrations
- LinkedIn monitoring (manual URL entry only)
- Teams integration
- Customer champion track (post-close nurture/leverage)
- Auto-sending messages on the user's behalf
- Multi-user / team access

---

## 11. Open Questions

- [ ] Confirm tech stack preferences (React + Tailwind acceptable?)
- [ ] Customer champion criteria — to be defined when prospect track is live
- [ ] Salesforce SQO field mapping — needed for auto-cadence switching in v2

---
_Next step: Phase 1 — data model + dashboard mockup_
