const express = require('express');
const router = express.Router();
const db = require('../db/database');

// /month must be declared before / to avoid any ambiguity
router.get('/month', (req, res) => {
  const { year, month } = req.query;
  if (!year || !month) return res.status(400).json({ error: 'year and month required' });
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
  // Include weeks that start up to 6 days before the 1st (Sun before month start)
  // through the last day of the month
  const rows = db.prepare(`
    SELECT * FROM activity_tracker
    WHERE week_start >= date(?, '-6 days')
      AND week_start <= date(?, '+1 month', '-1 day')
    ORDER BY week_start, activity_key
  `).all(monthStart, monthStart);
  res.json(rows);
});

router.get('/', (req, res) => {
  const { week_start } = req.query;
  if (!week_start) return res.status(400).json({ error: 'week_start required' });
  const rows = db.prepare('SELECT * FROM activity_tracker WHERE week_start = ?').all(week_start);
  res.json(rows);
});

router.put('/', (req, res) => {
  const { week_start, activity_key, sun = 0, mon = 0, tue = 0, wed = 0, thu = 0, fri = 0, sat = 0 } = req.body;
  if (!week_start || !activity_key) return res.status(400).json({ error: 'week_start and activity_key required' });
  // Store actual integers (not boolean-coerced) so Prospect counts > 1 are preserved
  db.prepare(`
    INSERT INTO activity_tracker (week_start, activity_key, sun, mon, tue, wed, thu, fri, sat)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(week_start, activity_key) DO UPDATE SET
      sun = excluded.sun, mon = excluded.mon, tue = excluded.tue, wed = excluded.wed,
      thu = excluded.thu, fri = excluded.fri, sat = excluded.sat
  `).run(
    week_start, activity_key,
    Math.max(0, parseInt(sun, 10) || 0),
    Math.max(0, parseInt(mon, 10) || 0),
    Math.max(0, parseInt(tue, 10) || 0),
    Math.max(0, parseInt(wed, 10) || 0),
    Math.max(0, parseInt(thu, 10) || 0),
    Math.max(0, parseInt(fri, 10) || 0),
    Math.max(0, parseInt(sat, 10) || 0)
  );
  res.json({ ok: true });
});

module.exports = router;
