import {
  getDb, listChampions,
  addPersonalWin, addProfessionalWin, confirmProfessionalWin,
  addInteraction, addFamilyMember,
  findOrCreateSubject, linkChampionToSubject
} from '../server/db.js';

const demos = listChampions({ includeArchived: false });
const sarah = demos.find(c => c.name === 'Sarah Chen');
const james = demos.find(c => c.name === 'James Holloway');
const priya = demos.find(c => c.name === 'Priya Mehta');

// ── SARAH CHEN ──────────────────────────────────────────────

// Personal wins
addPersonalWin(sarah.id, { category: 'sport', description: 'Arsenal fan — season ticket holder at the Emirates', emoji: '⚽' });
addPersonalWin(sarah.id, { category: 'family', description: 'Just got back from a family trip to Tokyo with her two kids', emoji: '✈️' });
addPersonalWin(sarah.id, { category: 'fitness', description: 'Running her first half marathon in May', emoji: '🏃' });

// Professional wins
const spw1 = addProfessionalWin(sarah.id, { description: 'Led the migration of Meridian Re\'s core platform to cloud — delivered on time and under budget' });
confirmProfessionalWin(spw1.id);
const spw2 = addProfessionalWin(sarah.id, { description: 'Promoted to VP Underwriting Technology in Jan 2026' });
confirmProfessionalWin(spw2.id);

// Interests
const aiTopic = findOrCreateSubject('AI in Underwriting', 'topic');
linkChampionToSubject(sarah.id, aiTopic.id, 'Actively following AI tooling for underwriting workflows');

// Interactions
addInteraction(sarah.id, { type: 'Meeting', date: '2026-02-28', notes: 'Full platform demo with Sarah and her team. Very positive reaction — asked detailed questions about the AI layer.' });
addInteraction(sarah.id, { type: 'Email', date: '2026-02-10', notes: 'Sent over the technical integration docs she requested.' });
addInteraction(sarah.id, { type: 'Call', date: '2026-01-22', notes: 'Intro call — warm and engaged. Said she\'d been looking for something like this for two years.' });

// ── JAMES HOLLOWAY ──────────────────────────────────────────

// Personal wins
addPersonalWin(james.id, { category: 'family', description: 'Dad of three — youngest just started secondary school', emoji: '👨‍👩‍👧‍👦' });
addPersonalWin(james.id, { category: 'hobby', description: 'Keen golfer — plays off a 12 handicap', emoji: '⛳' });
addPersonalWin(james.id, { category: 'travel', description: 'Spent Christmas in New Zealand visiting family', emoji: '🌏' });

// Professional wins
const jpw1 = addProfessionalWin(james.id, { description: 'Appointed CDO at Beacon Insurance in September 2025 — first digital-native hire at exec level' });
confirmProfessionalWin(jpw1.id);
addProfessionalWin(james.id, { description: 'Reportedly shortlisted for Insurance Digital Leader of the Year 2026' });

// Interests
const cloudTopic = findOrCreateSubject('Cloud & Core Systems', 'topic');
linkChampionToSubject(james.id, cloudTopic.id, 'Running a 3-year modernisation programme');
const insurtech = findOrCreateSubject('InsurTech', 'topic');
linkChampionToSubject(james.id, insurtech.id, 'Actively tracking the InsurTech landscape');

// Interactions
addInteraction(james.id, { type: 'Email', date: '2026-02-20', notes: 'Warm intro from mutual connection at Lloyd\'s. James replied within the hour — expressed interest in a call.' });
addInteraction(james.id, { type: 'Call', date: '2026-03-01', notes: 'Introductory call — 45 mins. Strong fit. Mentioned digital transformation is his top priority for 2026.' });

// ── PRIYA MEHTA ─────────────────────────────────────────────

// Personal wins
addPersonalWin(priya.id, { category: 'family', description: 'Recently moved to a new house in Wimbledon', emoji: '🏠' });
addPersonalWin(priya.id, { category: 'sport', description: 'Big cricket fan — follows the IPL and England test matches closely', emoji: '🏏' });
addPersonalWin(priya.id, { category: 'hobby', description: 'Volunteers as a mentor for women in finance programme', emoji: '🤝' });

// Professional wins
const ppw1 = addProfessionalWin(priya.id, { description: 'Closed Atlas Capital\'s largest reinsurance treaty of the year in Q4 2025' });
confirmProfessionalWin(ppw1.id);
const ppw2 = addProfessionalWin(priya.id, { description: 'Championed hx internally — key driver of the initial procurement decision' });
confirmProfessionalWin(ppw2.id);

// Interests
const riskTopic = findOrCreateSubject('Catastrophe Modelling', 'topic');
linkChampionToSubject(priya.id, riskTopic.id, 'Deep expertise in cat modelling — vocal about improving model accuracy');

// Interactions
addInteraction(priya.id, { type: 'Meeting', date: '2026-03-10', notes: 'QBR with Priya and two colleagues. Very happy with the product. Mentioned she\'s keen to expand usage to two more teams.' });
addInteraction(priya.id, { type: 'Call', date: '2026-02-05', notes: 'Check-in call — flagged a small UX issue which we resolved within the week. She was impressed with the turnaround.' });
addInteraction(priya.id, { type: 'Email', date: '2026-01-15', notes: 'Sent NPS survey — Priya scored 10/10 and left a glowing comment.' });

console.log('Done — demo champion profiles fully seeded');
