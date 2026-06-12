const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM deals ORDER BY updated_at DESC').all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { name, sales_stage, total_revenue, referral_split, hig_revenue, target_premium, last_contact, sale_paid_date, is_paid } = req.body;
  const result = db.prepare(`
    INSERT INTO deals (name, sales_stage, total_revenue, referral_split, hig_revenue, target_premium, last_contact, sale_paid_date, is_paid)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name,
    sales_stage || 'UW',
    total_revenue || 0,
    referral_split || null,
    hig_revenue || 0,
    target_premium || 0,
    last_contact || null,
    sale_paid_date || null,
    is_paid ? 1 : 0
  );
  res.json(db.prepare('SELECT * FROM deals WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { name, sales_stage, total_revenue, referral_split, hig_revenue, target_premium, last_contact, sale_paid_date, is_paid } = req.body;
  db.prepare(`
    UPDATE deals SET name=?, sales_stage=?, total_revenue=?, referral_split=?, hig_revenue=?,
    target_premium=?, last_contact=?, sale_paid_date=?, is_paid=?, updated_at=datetime('now')
    WHERE id=?
  `).run(
    name,
    sales_stage || 'UW',
    total_revenue || 0,
    referral_split || null,
    hig_revenue || 0,
    target_premium || 0,
    last_contact || null,
    sale_paid_date || null,
    is_paid ? 1 : 0,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM deals WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM deals WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
