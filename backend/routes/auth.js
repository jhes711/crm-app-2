const router = require('express').Router();
const crypto = require('crypto');
const { Resend } = require('resend');
const db = require('../db/database');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derived.toString('hex')}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const derived = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), derived);
}

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required' });

  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('password_hash');
  if (!row) return res.status(500).json({ error: 'Auth not configured' });

  try {
    const valid = verifyPassword(password, row.value);
    if (valid) {
      res.json({ success: true });
    } else {
      res.status(401).json({ error: 'Incorrect password' });
    }
  } catch {
    res.status(500).json({ error: 'Auth error' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  db.prepare('INSERT INTO reset_tokens (token, expires_at) VALUES (?, ?)').run(token, expiresAt);

  const appUrl = process.env.RESET_APP_URL || 'http://localhost:5173';
  const resetUrl = `${appUrl}/reset-password?token=${token}`;
  const userEmail = process.env.RESET_EMAIL || 'jhes711@gmail.com';

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({
      error: 'Email not configured. Please set RESEND_API_KEY in the environment.',
    });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: userEmail,
      subject: 'VO-CRM Password Reset',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
          <h2 style="color:#0f172a;margin-bottom:8px;">VO-CRM Password Reset</h2>
          <p style="color:#374151;">You requested a password reset. Click the button below to set a new password.</p>
          <p style="color:#374151;">This link expires in <strong>1 hour</strong>.</p>
          <a href="${resetUrl}"
             style="display:inline-block;background:#14b8a6;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0;font-size:15px;">
            Reset Password
          </a>
          <p style="color:#6b7280;font-size:12px;margin-top:16px;">Or copy this link into your browser:<br>
            <span style="color:#0d9488;">${resetUrl}</span>
          </p>
          <p style="color:#9ca3af;font-size:12px;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:12px;">
            If you didn't request this, you can safely ignore this email.
          </p>
        </div>
      `,
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Email send failed:', err.message);
    res.status(500).json({ error: 'Failed to send reset email. Check your RESEND_API_KEY configuration.' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and password required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const row = db.prepare('SELECT * FROM reset_tokens WHERE token = ? AND used = 0').get(token);
  if (!row) return res.status(400).json({ error: 'Invalid or expired reset link' });

  if (new Date(row.expires_at) < new Date()) {
    return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });
  }

  const hash = hashPassword(password);
  db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(hash, 'password_hash');
  db.prepare('UPDATE reset_tokens SET used = 1 WHERE token = ?').run(token);
  res.json({ success: true });
});

module.exports = router;
