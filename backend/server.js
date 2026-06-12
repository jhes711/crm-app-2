require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Initialize DB and seed
require('./db/database');
try { require('./db/seed'); } catch(e) { /* already seeded */ }

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/opportunities', require('./routes/opportunities'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/activity', require('./routes/activity'));
app.use('/api/activity-tracker', require('./routes/activity-tracker'));
app.use('/api/deals', require('./routes/deals'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Serve React frontend if built dist exists
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`CRM API running on http://localhost:${PORT}`));
