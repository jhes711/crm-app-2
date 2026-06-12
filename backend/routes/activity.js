const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT a.*,
      COALESCE(o.institution_name, o.first_name || ' ' || o.last_name) as opp_name,
      o.client_type
    FROM activity_log a
    JOIN opportunities o ON a.opportunity_id = o.id
    ORDER BY a.changed_at DESC
    LIMIT 100
  `).all();
  res.json(rows);
});

module.exports = router;
