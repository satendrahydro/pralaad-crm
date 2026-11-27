const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// GET /api/settings
router.get('/', authenticateToken, (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/settings
router.post('/', authenticateToken, (req, res) => {
  try {
    const { settings } = req.body || {};
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ success: false, message: 'Settings object required' });
    }

    const upsert = db.prepare(`
      INSERT INTO settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);

    const runAll = db.transaction((entries) => {
      for (const [key, value] of entries) {
        upsert.run(key, String(value));
      }
    });

    runAll(Object.entries(settings));

    const updatedRows = db.prepare('SELECT key, value FROM settings').all();
    const updatedSettings = {};
    updatedRows.forEach(r => { updatedSettings[r.key] = r.value; });

    res.json({ success: true, message: 'Settings updated successfully', settings: updatedSettings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
