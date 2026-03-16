import { randomUUID } from 'node:crypto';
import { getDb, listChampions } from '../server/db.js';

const db = getDb();

// Hide real champions' intelligence items
db.prepare(`UPDATE intelligence_items SET dismissed = 1 WHERE champion_id IN (
  'eee8168f-6413-4fe0-9a89-900a28b32fe7',
  '4493e14a-3b5f-4b05-a554-9ccc98e8661b',
  '70bea27f-f138-4040-9f4a-9367e254d251',
  '7d3c187d-95a8-4dd3-b49c-01ad60162707',
  'a4390f9d-7b5f-44f2-acc8-d35b7bca9ff1',
  '2ca4f53a-c209-4de7-970b-5bf7d815d735',
  '9c58746e-70b0-4946-bd53-67c508a077fa'
)`).run();

const demos = listChampions({ includeArchived: false });
const sarah = demos.find(c => c.name === 'Sarah Chen');
const james = demos.find(c => c.name === 'James Holloway');
const priya = demos.find(c => c.name === 'Priya Mehta');
const now = new Date().toISOString();

const insert = db.prepare('INSERT INTO intelligence_items (id, champion_id, champion_name, section, label, title, link, source, pub_date, scanned_at, dismissed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)');

insert.run(randomUUID(), sarah.id, sarah.name, 'interest', 'Arsenal FC',
  'Arsenal hold off Liverpool to go top of the Premier League',
  'https://bbc.co.uk/sport', 'BBC Sport', 'Sun, 15 Mar 2026 17:30:00 GMT', now);

insert.run(randomUUID(), sarah.id, sarah.name, 'company', 'Meridian Re',
  'Meridian Re expands US casualty book following strong Q4 results',
  'https://reinsurancenews.com', 'Reinsurance News', 'Fri, 13 Mar 2026 09:00:00 GMT', now);

insert.run(randomUUID(), james.id, james.name, 'interest', 'Digital Transformation',
  'Why insurers are doubling down on core system modernisation in 2026',
  'https://insurancejournal.com', 'Insurance Journal', 'Thu, 12 Mar 2026 11:00:00 GMT', now);

insert.run(randomUUID(), priya.id, priya.name, 'company', 'Atlas Capital',
  'Atlas Capital names new Head of Operations as growth strategy accelerates',
  'https://businesswire.com', 'Business Wire', 'Wed, 11 Mar 2026 14:00:00 GMT', now);

console.log('Done — real intelligence hidden, 4 demo items seeded');
