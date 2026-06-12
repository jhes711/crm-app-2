const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const db = new Database(path.join(__dirname, 'crm.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS activity_tracker (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    week_start TEXT NOT NULL,
    activity_key TEXT NOT NULL,
    mon INTEGER DEFAULT 0,
    tue INTEGER DEFAULT 0,
    wed INTEGER DEFAULT 0,
    thu INTEGER DEFAULT 0,
    fri INTEGER DEFAULT 0,
    UNIQUE(week_start, activity_key)
  );

  CREATE TABLE IF NOT EXISTS deals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sales_stage TEXT DEFAULT 'UW',
    total_revenue REAL DEFAULT 0,
    referral_split TEXT,
    hig_revenue REAL DEFAULT 0,
    target_premium REAL DEFAULT 0,
    last_contact TEXT,
    sale_paid_date TEXT,
    is_paid INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS opportunities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_type TEXT NOT NULL CHECK(client_type IN ('Individual', 'Institution', 'Platform')),
    last_name TEXT,
    middle_initial TEXT,
    first_name TEXT,
    institution_name TEXT,
    referred_by TEXT,
    relationship TEXT,
    opp_process TEXT,
    opp_type TEXT,
    potential_revenue REAL DEFAULT 0,
    aum REAL DEFAULT 0,
    last_contact TEXT,
    notes TEXT,
    priority TEXT DEFAULT 'Medium',
    next_followup TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS stage_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    opportunity_id INTEGER NOT NULL,
    from_stage TEXT,
    to_stage TEXT NOT NULL,
    changed_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    opportunity_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    field_name TEXT,
    old_value TEXT,
    new_value TEXT,
    changed_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    used INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Add sun/sat columns to activity_tracker if they don't exist yet
const atCols = db.pragma('table_info(activity_tracker)').map(c => c.name);
if (!atCols.includes('sun')) db.exec('ALTER TABLE activity_tracker ADD COLUMN sun INTEGER DEFAULT 0');
if (!atCols.includes('sat')) db.exec('ALTER TABLE activity_tracker ADD COLUMN sat INTEGER DEFAULT 0');

// Initialize default password hash if not already set
const pwRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('password_hash');
if (!pwRow) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync('VerveONYX1', salt, 64);
  const hash = `${salt}:${derived.toString('hex')}`;
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('password_hash', hash);
}

module.exports = db;
