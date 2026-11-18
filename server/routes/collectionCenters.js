const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /api/collection-centers - List collection centers / groups
router.get('/', authenticateToken, (req, res) => {
  try {
    const { branch_id, search } = req.query;
    let query = `
      SELECT 
        c.*,
        b.branch_name,
        a.full_name as advisor_name,
        a.agent_code,
        a.phone as advisor_phone
      FROM collection_centers c
      LEFT JOIN branches b ON c.branch_id = b.id
      LEFT JOIN agents a ON c.advisor_id = a.id
      WHERE 1=1
    `;
    const params = [];

    if (branch_id) {
      query += ` AND c.branch_id = ?`;
      params.push(branch_id);
    }
    if (search) {
      query += ` AND (c.center_name LIKE ? OR c.center_code LIKE ? OR a.full_name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY c.id ASC`;

    const centers = db.prepare(query).all(...params);
    const totalCollected = centers.reduce((sum, c) => sum + (c.total_collected || 0), 0);
    const totalMembers = centers.reduce((sum, c) => sum + (c.total_members || 0), 0);

    res.json({
      success: true,
      centers,
      total_centers: centers.length,
      total_collected: totalCollected,
      total_members: totalMembers
    });
  } catch (err) {
    console.error('Error fetching collection centers:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch centers', error: err.message });
  }
});

// POST /api/collection-centers - Create new collection center
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { 
      center_name, 
      branch_id, 
      advisor_id, 
      collection_day = 'DAILY', 
      meeting_time = '10:00 AM',
      total_members = 0 
    } = req.body;

    if (!center_name || !center_name.trim()) {
      return res.status(400).json({ success: false, message: 'Center name is required' });
    }

    const count = db.prepare('SELECT count(*) as count FROM collection_centers').get().count;
    const center_code = `CEN${String(count + 1).padStart(3, '0')}`;

    const branch = db.prepare('SELECT branch_name FROM branches WHERE id = ?').get(branch_id);
    const advisor = advisor_id ? db.prepare('SELECT full_name FROM agents WHERE id = ?').get(advisor_id) : null;

    const info = db.prepare(`
      INSERT INTO collection_centers (
        center_code, center_name, branch_id, branch_name, advisor_id, advisor_name,
        collection_day, meeting_time, total_members, total_collected, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'ACTIVE')
    `).run(
      center_code,
      center_name.trim(),
      branch_id || 1,
      branch?.branch_name || 'MAIN BRANCH',
      advisor_id || null,
      advisor?.full_name || null,
      collection_day,
      meeting_time,
      parseInt(total_members) || 0
    );

    res.json({
      success: true,
      message: `Collection center '${center_name}' created successfully`,
      centerId: info.lastInsertRowid,
      center_code
    });
  } catch (err) {
    console.error('Error creating collection center:', err);
    res.status(500).json({ success: false, message: 'Failed to create center', error: err.message });
  }
});

module.exports = router;
