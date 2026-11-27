const express = require('express');
const router = express.Router();
const db = require('../db');

const DEFAULT_MASTER_KEY = process.env.DEV_MASTER_KEY || 'SATENDRA_DEV_MASTER_2026';

// Helper to get or initialize lock setting
function getLockState() {
  try {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'commercial_lock_status'").get();
    return row ? row.value : 'UNLOCKED';
  } catch (e) {
    return 'UNLOCKED';
  }
}

function setLockState(status, reason = 'Commercial settlement pending') {
  try {
    db.prepare(`
      INSERT INTO settings (key, value) VALUES ('commercial_lock_status', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(status);

    db.prepare(`
      INSERT INTO settings (key, value) VALUES ('commercial_lock_reason', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(reason);

    db.prepare(`
      INSERT INTO settings (key, value) VALUES ('commercial_lock_updated_at', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(new Date().toISOString());

    return true;
  } catch (e) {
    console.error('Error updating lock state:', e);
    return false;
  }
}

// 1. GET /api/license/status - Check if system is locked
router.get('/status', (req, res) => {
  const status = getLockState();
  const reasonRow = db.prepare("SELECT value FROM settings WHERE key = 'commercial_lock_reason'").get();
  const updatedRow = db.prepare("SELECT value FROM settings WHERE key = 'commercial_lock_updated_at'").get();

  res.json({
    success: true,
    locked: status === 'LOCKED',
    status: status,
    reason: reasonRow ? reasonRow.value : 'Commercial settlement pending',
    updated_at: updatedRow ? updatedRow.value : null
  });
});

// 2. GET /api/license/toggle - Quick browser URL lock/unlock using master key
// Usage: https://your-domain.com/api/license/toggle?key=SATENDRA_DEV_MASTER_2026&action=lock
router.get('/toggle', (req, res) => {
  const { key, action, reason } = req.query;

  if (!key || key !== DEFAULT_MASTER_KEY) {
    return res.status(403).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Access Denied</title><style>body{font-family:sans-serif;background:#062319;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}</style></head>
      <body>
        <div style="text-align:center;background:#0d3527;padding:40px;border-radius:16px;border:1px solid #D4AF37;box-shadow:0 10px 30px rgba(0,0,0,0.5);">
          <h1 style="color:#ef4444;margin-top:0;">⛔ Access Denied</h1>
          <p>Invalid or missing Master Developer Key.</p>
        </div>
      </body>
      </html>
    `);
  }

  const newStatus = (action === 'lock') ? 'LOCKED' : 'UNLOCKED';
  setLockState(newStatus, reason || 'Payment / Commercial settlement pending');

  const isLocked = newStatus === 'LOCKED';
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>CRM Master License Control</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #062319; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
        .card { background: #0b3425; border: 2px solid ${isLocked ? '#ef4444' : '#10b981'}; border-radius: 20px; padding: 32px; max-width: 480px; width: 100%; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
        .badge { display: inline-block; padding: 6px 16px; border-radius: 999px; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px; background: ${isLocked ? '#7f1d1d' : '#064e3b'}; color: ${isLocked ? '#fca5a5' : '#6ee7b7'}; border: 1px solid ${isLocked ? '#ef4444' : '#10b981'}; }
        h1 { margin: 0 0 12px 0; font-size: 24px; color: ${isLocked ? '#f87171' : '#34d399'}; }
        p { color: #d1d5db; line-height: 1.6; font-size: 14px; margin: 8px 0; }
        .btn { display: inline-block; margin-top: 20px; padding: 12px 24px; border-radius: 10px; font-weight: bold; text-decoration: none; color: #fff; background: #D4AF37; transition: 0.2s; }
        .btn:hover { background: #c59f2e; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="badge">${isLocked ? '🔒 SYSTEM LOCKED' : '🔓 SYSTEM UNLOCKED'}</div>
        <h1>${isLocked ? 'CRM Application Locked Successfully' : 'CRM Application Unlocked'}</h1>
        <p>${isLocked ? 'All client, staff and customer access has been suspended. The lock screen is now displayed across all devices.' : 'Normal operation restored. All features and logins are now fully active.'}</p>
        <p style="font-size:12px;color:#9ca3af;margin-top:16px;">Timestamp: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>
        <a href="/" class="btn">Go to CRM Homepage &rarr;</a>
      </div>
    </body>
    </html>
  `);
});

// 3. POST /api/license/unlock - Unlock from frontend modal using master key
router.post('/unlock', (req, res) => {
  const { masterKey } = req.body;
  if (!masterKey || masterKey !== DEFAULT_MASTER_KEY) {
    return res.status(403).json({ success: false, message: 'Invalid Master Developer Key.' });
  }

  setLockState('UNLOCKED', 'Unlocked by developer via Master Key');
  res.json({ success: true, message: 'Application unlocked successfully!' });
});

// 4. POST /api/license/lock - Lock from frontend modal using master key
router.post('/lock', (req, res) => {
  const { masterKey, reason } = req.body;
  if (!masterKey || masterKey !== DEFAULT_MASTER_KEY) {
    return res.status(403).json({ success: false, message: 'Invalid Master Developer Key.' });
  }

  setLockState('LOCKED', reason || 'Commercial settlement pending');
  res.json({ success: true, message: 'Application locked successfully!' });
});

module.exports = {
  router,
  getLockState
};
