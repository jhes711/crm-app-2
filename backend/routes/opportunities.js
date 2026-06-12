const express = require('express');
const router = express.Router();
const db = require('../db/database');

const getName = (row) => {
  if (row.client_type === 'Individual') {
    return [row.first_name, row.middle_initial, row.last_name].filter(Boolean).join(' ');
  }
  return row.institution_name || '';
};

router.get('/', (req, res) => {
  const { client_type, opp_process, opp_type, relationship, priority, search } = req.query;
  let query = 'SELECT * FROM opportunities WHERE 1=1';
  const params = [];

  if (client_type) { query += ' AND client_type = ?'; params.push(client_type); }
  if (opp_process) { query += ' AND opp_process = ?'; params.push(opp_process); }
  if (opp_type) { query += ' AND opp_type = ?'; params.push(opp_type); }
  if (relationship) { query += ' AND relationship = ?'; params.push(relationship); }
  if (priority) { query += ' AND priority = ?'; params.push(priority); }
  if (search) {
    query += ' AND (last_name LIKE ? OR first_name LIKE ? OR institution_name LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  query += ' ORDER BY updated_at DESC';
  const rows = db.prepare(query).all(...params);
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM opportunities WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.post('/', (req, res) => {
  const d = req.body;
  const result = db.prepare(`
    INSERT INTO opportunities (client_type, last_name, middle_initial, first_name, institution_name, referred_by, relationship, opp_process, opp_type, potential_revenue, aum, last_contact, notes, priority, next_followup)
    VALUES (@client_type, @last_name, @middle_initial, @first_name, @institution_name, @referred_by, @relationship, @opp_process, @opp_type, @potential_revenue, @aum, @last_contact, @notes, @priority, @next_followup)
  `).run({
    client_type: d.client_type,
    last_name: d.last_name || null,
    middle_initial: d.middle_initial || null,
    first_name: d.first_name || null,
    institution_name: d.institution_name || null,
    referred_by: d.referred_by || null,
    relationship: d.relationship || null,
    opp_process: d.opp_process || null,
    opp_type: d.opp_type || null,
    potential_revenue: d.potential_revenue || 0,
    aum: d.aum || 0,
    last_contact: d.last_contact || null,
    notes: d.notes || null,
    priority: d.priority || 'Medium',
    next_followup: d.next_followup || null
  });

  const id = result.lastInsertRowid;

  db.prepare('INSERT INTO stage_history (opportunity_id, from_stage, to_stage) VALUES (?, ?, ?)').run(id, null, d.opp_process);
  db.prepare('INSERT INTO activity_log (opportunity_id, action) VALUES (?, ?)').run(id, 'Created');

  res.json(db.prepare('SELECT * FROM opportunities WHERE id = ?').get(id));
});

router.put('/:id', (req, res) => {
  const id = req.params.id;
  const existing = db.prepare('SELECT * FROM opportunities WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const d = req.body;

  const logActivity = db.prepare('INSERT INTO activity_log (opportunity_id, action, field_name, old_value, new_value) VALUES (?, ?, ?, ?, ?)');
  const fields = ['last_name','middle_initial','first_name','institution_name','referred_by','relationship','opp_process','opp_type','potential_revenue','aum','last_contact','notes','priority','next_followup'];

  const logMany = db.transaction(() => {
    for (const field of fields) {
      const oldVal = String(existing[field] ?? '');
      const newVal = String(d[field] ?? '');
      if (oldVal !== newVal) {
        logActivity.run(id, 'Updated', field, oldVal, newVal);
      }
    }

    if (existing.opp_process !== d.opp_process) {
      db.prepare('INSERT INTO stage_history (opportunity_id, from_stage, to_stage) VALUES (?, ?, ?)').run(id, existing.opp_process, d.opp_process);
    }

    db.prepare(`
      UPDATE opportunities SET
        client_type=@client_type, last_name=@last_name, middle_initial=@middle_initial,
        first_name=@first_name, institution_name=@institution_name, referred_by=@referred_by,
        relationship=@relationship, opp_process=@opp_process, opp_type=@opp_type,
        potential_revenue=@potential_revenue, aum=@aum, last_contact=@last_contact,
        notes=@notes, priority=@priority, next_followup=@next_followup,
        updated_at=datetime('now')
      WHERE id=@id
    `).run({ ...d, id, potential_revenue: d.potential_revenue || 0, aum: d.aum || 0 });
  });

  logMany();
  res.json(db.prepare('SELECT * FROM opportunities WHERE id = ?').get(id));
});

router.delete('/:id', (req, res) => {
  const id = req.params.id;
  const existing = db.prepare('SELECT * FROM opportunities WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM opportunities WHERE id = ?').run(id);
  res.json({ success: true });
});

router.get('/:id/history', (req, res) => {
  const rows = db.prepare('SELECT * FROM stage_history WHERE opportunity_id = ? ORDER BY changed_at ASC').all(req.params.id);
  res.json(rows);
});

router.get('/:id/activity', (req, res) => {
  const rows = db.prepare('SELECT * FROM activity_log WHERE opportunity_id = ? ORDER BY changed_at DESC').all(req.params.id);
  res.json(rows);
});

module.exports = router;
