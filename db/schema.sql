-- Hey Buddy — SQLite Schema v0.2

CREATE TABLE IF NOT EXISTS champions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  initials TEXT NOT NULL,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'prospect',      -- prospect|customer|network
  stage TEXT NOT NULL DEFAULT 'identified',   -- identified|building|test|leverage|nurture
  deal_status TEXT NOT NULL DEFAULT 'pre-sfo', -- pre-sfo|post-sfo|closed-won|closed-lost|network
  health TEXT NOT NULL DEFAULT 'green',        -- green|amber|red
  linkedin_url TEXT,
  personal_contact TEXT,
  location_city TEXT,
  location_country TEXT,
  last_contact_date TEXT,
  last_contact_type TEXT,
  archived INTEGER NOT NULL DEFAULT 0,
  archived_at TEXT,
  owner_id TEXT,                              -- references bot_users.platform_user_id; NULL = unowned (legacy)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS personal_wins (
  id TEXT PRIMARY KEY,
  champion_id TEXT NOT NULL REFERENCES champions(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'other',  -- sport|hobby|ambition|family|other
  description TEXT NOT NULL,
  emoji TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS professional_wins (
  id TEXT PRIMARY KEY,
  champion_id TEXT NOT NULL REFERENCES champions(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  confirmed INTEGER NOT NULL DEFAULT 0,
  confirmed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stage_criteria (
  id TEXT PRIMARY KEY,
  champion_id TEXT NOT NULL REFERENCES champions(id) ON DELETE CASCADE,
  transition TEXT NOT NULL,        -- identified-building|building-test|test-leverage|leverage|nurture
  criterion_key TEXT NOT NULL,
  criterion_label TEXT NOT NULL,
  met INTEGER NOT NULL DEFAULT 0,
  met_at TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS interactions (
  id TEXT PRIMARY KEY,
  champion_id TEXT NOT NULL REFERENCES champions(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'Call',  -- Call|Email|Meeting|Dinner|Event|Gift|WhatsApp|Other
  notes TEXT,
  message_sent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS triggers (
  id TEXT PRIMARY KEY,
  champion_id TEXT NOT NULL REFERENCES champions(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL,   -- sports|cadence|calendar|news|custom
  title TEXT NOT NULL,
  description TEXT,
  suggested_message TEXT,
  schedule TEXT,                -- null|weekly|monthly|match_event (for custom triggers)
  status TEXT NOT NULL DEFAULT 'pending',  -- pending|acted|skipped|dismissed
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT,
  acted_at TEXT
);

-- ── Subject registry ────────────────────────────────────────
-- Normalised entities that champions care about (Chelsea FC, England Rugby, etc.)
CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'topic', -- sport|company|person|topic|industry
  aliases TEXT,                        -- JSON array of alternate names for fuzzy matching
  metadata TEXT,                       -- JSON: source URLs, API endpoints, etc.
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Champion to subject mappings with confidence tier
CREATE TABLE IF NOT EXISTS champion_subjects (
  id TEXT PRIMARY KEY,
  champion_id TEXT NOT NULL REFERENCES champions(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  confidence TEXT NOT NULL DEFAULT 'explicit', -- explicit|inferred|discovered
  evidence TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(champion_id, subject_id)
);

-- Pending trigger proposals awaiting user validation
CREATE TABLE IF NOT EXISTS pending_triggers (
  id TEXT PRIMARY KEY,
  champion_id TEXT NOT NULL REFERENCES champions(id) ON DELETE CASCADE,
  subject_name TEXT NOT NULL,
  subject_type TEXT DEFAULT 'topic',
  evidence TEXT NOT NULL,
  confidence TEXT DEFAULT 'high', -- high|medium|low
  proposed_by TEXT DEFAULT 'agent', -- agent|user
  status TEXT DEFAULT 'pending',    -- pending|approved|rejected
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Composite health score snapshots
CREATE TABLE IF NOT EXISTS health_scores (
  id TEXT PRIMARY KEY,
  champion_id TEXT NOT NULL REFERENCES champions(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,       -- 0–100
  recency_score INTEGER,        -- 0–40
  profile_score INTEGER,        -- 0–25
  momentum_score INTEGER,       -- 0–20
  stage_score INTEGER,          -- 0–15
  computed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Feedback / bug reports
CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'feature', -- bug|feature
  title TEXT NOT NULL,
  description TEXT,
  screenshot_path TEXT,
  submitted_by TEXT DEFAULT 'rich',
  status TEXT NOT NULL DEFAULT 'open', -- open|in_progress|done|wont_fix
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Approved bot users (allowlist)
CREATE TABLE IF NOT EXISTS bot_users (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL DEFAULT 'telegram',  -- telegram|teams
  platform_user_id TEXT NOT NULL,
  platform_username TEXT,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'user',          -- admin|user
  approved_by TEXT,                           -- platform_user_id of approver
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(platform, platform_user_id)
);

-- Telegram conversation history (per user, rolling 20 messages)
CREATE TABLE IF NOT EXISTS telegram_sessions (
  id TEXT PRIMARY KEY,
  telegram_user_id TEXT NOT NULL UNIQUE,
  telegram_username TEXT,
  messages TEXT NOT NULL DEFAULT '[]', -- JSON array of {role, content} pairs
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_telegram_sessions_user ON telegram_sessions(telegram_user_id);

-- User profiles (personalisation)
CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL UNIQUE,           -- references bot_users.platform_user_id
  display_name TEXT,
  role_title TEXT,                         -- e.g. "Senior Account Executive"
  home_city TEXT,
  sports_teams TEXT NOT NULL DEFAULT '[]', -- JSON array of strings
  interests TEXT NOT NULL DEFAULT '[]',    -- JSON array of strings
  comms_preference TEXT DEFAULT 'casual',  -- casual|formal
  preferred_channel TEXT DEFAULT 'short',  -- short|long
  onboarding_complete INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tone samples (writing style examples per user, per channel)
CREATE TABLE IF NOT EXISTS tone_samples (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  sample_text TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'short',   -- short (whatsapp/text) | long (email)
  source TEXT NOT NULL DEFAULT 'onboarding', -- onboarding|feedback
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Sent messages (feedback loop — actual vs suggested)
CREATE TABLE IF NOT EXISTS sent_messages (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  champion_id TEXT REFERENCES champions(id) ON DELETE SET NULL,
  suggested_text TEXT,
  actual_text TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'short',   -- short|long
  sent_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_owner ON user_profiles(owner_id);
CREATE INDEX IF NOT EXISTS idx_tone_samples_owner ON tone_samples(owner_id, channel);
CREATE INDEX IF NOT EXISTS idx_sent_messages_owner ON sent_messages(owner_id);
CREATE INDEX IF NOT EXISTS idx_champions_stage ON champions(stage);
CREATE INDEX IF NOT EXISTS idx_champions_type ON champions(type);
CREATE INDEX IF NOT EXISTS idx_champions_health ON champions(health);
CREATE INDEX IF NOT EXISTS idx_champions_archived ON champions(archived);
CREATE INDEX IF NOT EXISTS idx_champions_owner ON champions(owner_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_interactions_champion ON interactions(champion_id, date);
CREATE INDEX IF NOT EXISTS idx_triggers_champion ON triggers(champion_id);
CREATE INDEX IF NOT EXISTS idx_triggers_status ON triggers(status);
CREATE INDEX IF NOT EXISTS idx_pending_triggers_status ON pending_triggers(status);
CREATE INDEX IF NOT EXISTS idx_champion_subjects_champion ON champion_subjects(champion_id);
CREATE INDEX IF NOT EXISTS idx_health_scores_champion ON health_scores(champion_id, computed_at);
