import { CheckCircle, Circle, ArrowRight } from 'lucide-react'
import StageTag from '../components/StageTag'

const networkStage = {
  stage: 'nurture',
  title: 'Nurture (Network only)',
  description:
    'Network contacts are insurance industry or partner connections you want to maintain ongoing relationships with — outside of any active deal. They sit permanently in Nurture and are maintained on a monthly cadence.',
  criteria: [
    { label: 'Active personal win maintenance — ongoing investment in what they care about', required: true },
    { label: 'Leveraging the network for influence to progress your goals (referrals, introductions, intel)', required: true },
  ],
}

const stages = [
  {
    stage: 'identified',
    title: 'Identified',
    description:
      'You have found someone with power, influence, and credibility who could become a champion. You have enough to begin investing in the relationship.',
    criteria: [
      { label: 'Had a 1-1 conversation (not just a group call)', required: true },
      { label: 'Identified at least one personal win — something they care about outside the project', required: true },
      { label: 'Identified at least one professional win — how your project ties to their goals', required: true },
      { label: 'Have their personal contact (mobile/WhatsApp)', required: false, note: 'Nice to have' },
    ],
  },
  {
    stage: 'building',
    title: 'Building',
    description:
      'You are actively investing in this person. They have begun to show real investment in you. The relationship is deepening beyond the transactional.',
    criteria: [
      { label: 'They have explicitly confirmed their professional win — said it out loud, not just implied', required: true },
      { label: 'They have shared internal context you couldn\'t get elsewhere (org dynamics, blockers, key stakeholders)', required: true },
      { label: 'At least one interaction in a non-sales context (dinner, event, informal call)', required: true },
      { label: 'Have their personal contact (mobile/WhatsApp)', required: true },
    ],
  },
  {
    stage: 'test',
    title: 'Test',
    description:
      'They have proven they will act for you when you\'re not in the room. You\'ve given them a task and they delivered. This is the proof point.',
    criteria: [
      { label: 'You gave them a specific task and they delivered', required: true },
      { label: 'They have proactively shared competitive or deal-critical intelligence', required: true },
      { label: "They have shown up for you in a way that wasn't directly in their interest", required: true },
    ],
  },
  {
    stage: 'leverage',
    title: 'Leverage',
    description:
      'They are actively selling internally on your behalf. Your success is tied to their personal win. Maintain the personal relationship — this is a long-term investment.',
    criteria: [
      { label: 'They are influencing internal discussions without you present', required: true },
      { label: 'They are connected to deal acceleration (timeline, access, stakeholder alignment)', required: true },
      { label: 'Active personal win maintenance — ongoing investment in the personal relationship', required: true },
      { label: 'Identifying expansion or new opportunity signals on your behalf', required: true },
    ],
  },
]

const cadenceRules = [
  { condition: 'Any stage, no active deal', frequency: 'Monthly', colour: 'text-gray-700' },
  { condition: 'Any stage, post-SQO (active deal)', frequency: 'Every 2 weeks', colour: 'text-amber-700' },
  { condition: 'Network / Nurture', frequency: 'Monthly', colour: 'text-violet-700' },
  { condition: 'Event-driven trigger (sports, news, milestone, custom)', frequency: 'As triggered', colour: 'text-emerald-700' },
]

export default function Methodology() {
  return (
    <div className="h-full overflow-auto">
      <div className="max-w-3xl mx-auto px-8 py-8 space-y-10">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hey Buddy Methodology</h1>
          <p className="text-gray-500 mt-2 text-sm leading-relaxed">
            A champion is someone inside a prospect or customer organisation who has power, influence, and credibility —
            and who will sell on your behalf when you're not in the room. Building a champion is about developing a
            genuine, mutual relationship: understanding what they care about personally and professionally, and investing
            in those things over time.
          </p>
        </div>

        {/* Champion types */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Champion types</h2>
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden divide-y divide-gray-100">
            {[
              { type: 'Prospect', colour: 'bg-blue-100 text-blue-700', desc: 'An exec at an active sales opportunity. Progresses through Identified → Building → Test → Leverage. Relationship has a deal endpoint.', stages: 'Identified → Building → Test → Leverage' },
              { type: 'Customer', colour: 'bg-emerald-100 text-emerald-700', desc: 'An exec at a closed or existing account. Same stage track as prospect, but focus shifts to retention, expansion, references, and introductions.', stages: 'Identified → Building → Test → Leverage' },
              { type: 'Network', colour: 'bg-violet-100 text-violet-700', desc: 'An insurance industry or partner contact worth maintaining a relationship with, regardless of any active deal. Always in Nurture stage. Monthly cadence.', stages: 'Nurture only' },
            ].map(t => (
              <div key={t.type} className="px-5 py-4 flex items-start gap-4">
                <span className={`mt-0.5 shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${t.colour}`}>{t.type}</span>
                <div>
                  <p className="text-sm text-gray-700">{t.desc}</p>
                  <p className="text-xs text-gray-400 mt-1">Stages: {t.stages}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Champion lifecycle */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Champion lifecycle</h2>

          {/* Stage flow */}
          <div className="flex items-center gap-2 flex-wrap">
            {stages.map((s, i) => (
              <>
                <StageTag key={s.stage} stage={s.stage} size="md" />
                {i < stages.length - 1 && <ArrowRight key={`arrow-${i}`} className="h-4 w-4 text-gray-400" />}
              </>
            ))}
          </div>

          {/* Stage cards */}
          <div className="space-y-4">
            {[...stages, networkStage].map((s) => (
              <div key={s.stage} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <StageTag stage={s.stage} />
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{s.description}</p>
                  </div>
                </div>
                <div className="px-5 py-4 space-y-2.5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Criteria to progress
                  </p>
                  {s.criteria.map((c, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className={`h-4 w-4 rounded-full shrink-0 mt-0.5 flex items-center justify-center text-white text-xs font-bold
                        ${c.required ? 'bg-hx-teal-muted0' : 'bg-gray-300'}`}>
                        {c.required ? '✓' : '○'}
                      </div>
                      <div>
                        <span className="text-sm text-gray-700">{c.label}</span>
                        {c.note && (
                          <span className="ml-2 text-xs text-gray-400 italic">{c.note}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Cadence rules */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Cadence rules</h2>
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden divide-y divide-gray-100">
            {cadenceRules.map((r, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-4">
                <p className="text-sm text-gray-600">{r.condition}</p>
                <span className={`text-sm font-semibold ${r.colour}`}>{r.frequency}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            Event-driven triggers (e.g. sports results relevant to the champion, company news, internal milestones)
            always override cadence rules — act on them when they arise.
          </p>
          <p className="text-xs text-gray-400 leading-relaxed">
            Cadence thresholds (how many days before "approaching" and "overdue" alerts fire) are configurable in Settings. The values above are the defaults.
          </p>
        </section>

        {/* Core principles */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Core principles</h2>
          <div className="space-y-3">
            {[
              {
                title: 'Personal wins are not project-related',
                body: "A personal win is something the champion cares about outside of work — sport, family, ambition, hobby. Investing in these is what makes the relationship authentic. Help them experience their passions: take them to a game, find them a ticket, remember what matters to them.",
              },
              {
                title: 'Professional wins must be confirmed, not assumed',
                body: "Identifying a professional win is not enough. The champion must explicitly confirm it — they need to say it out loud. Until they do, it\'s your hypothesis, not their commitment.",
              },
              {
                title: 'Test before you leverage',
                body: "A champion who has never been tested is a risk. Before you count on someone to sell internally, give them a task. If they deliver, you have proof. If they don\'t, you know where you stand.",
              },
              {
                title: 'Leverage requires maintenance',
                body: "Getting to Leverage is not the end. The personal relationship needs continuous investment — especially post-deal, when the transactional reason to stay in touch disappears. The champions who drive renewals, expansions, and referrals are the ones who feel genuinely valued.",
              },
            ].map((p, i) => (
              <div key={i} className="rounded-xl bg-white border border-gray-200 px-5 py-4">
                <p className="text-sm font-semibold text-gray-900 mb-1">{p.title}</p>
                <p className="text-sm text-gray-600 leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  )
}
