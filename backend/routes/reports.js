const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.get('/', (req, res) => {
  const { opp_process, client_type, opp_type, relationship, priority, date_from, date_to, sort } = req.query;

  let query = 'SELECT * FROM opportunities WHERE 1=1';
  const params = [];

  if (opp_process && opp_process !== 'all') { query += ' AND opp_process = ?'; params.push(opp_process); }
  if (client_type) { query += ' AND client_type = ?'; params.push(client_type); }
  if (opp_type) { query += ' AND opp_type = ?'; params.push(opp_type); }
  if (relationship) { query += ' AND relationship = ?'; params.push(relationship); }
  if (priority) { query += ' AND priority = ?'; params.push(priority); }
  if (date_from) { query += ' AND last_contact >= ?'; params.push(date_from); }
  if (date_to) { query += ' AND last_contact <= ?'; params.push(date_to); }

  const sortMap = {
    'name_asc': "COALESCE(institution_name, first_name || ' ' || last_name) ASC",
    'referred_by': 'referred_by ASC',
    'relationship': 'relationship ASC',
    'revenue_desc': 'potential_revenue DESC',
    'last_contact_desc': 'last_contact DESC'
  };
  query += ` ORDER BY ${sortMap[sort] || sortMap['name_asc']}`;

  const rows = db.prepare(query).all(...params);
  res.json(rows);
});

module.exports = router;
