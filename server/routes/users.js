const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticateToken, requireAdmin, JWT_SECRET } = require('../middleware/auth');

// All endpoints in this router are restricted to Super Admin
router.use(authenticateToken, requireAdmin);

// GET /api/users - List all internal Staff & Admin accounts
router.get('/', (req, res) => {
  try {
    const { search = '' } = req.query;

    // Fetch Staff Accounts
    let staffQuery = `
      SELECT id, username, full_name, role, phone, 
             COALESCE(is_active, 1) as is_active, 
             last_login_at, must_change_password, created_at
      FROM users
    `;
    const staffParams = [];
    if (search) {
      staffQuery += ` WHERE username LIKE ? OR full_name LIKE ? OR phone LIKE ?`;
      const s = `%${search}%`;
      staffParams.push(s, s, s);
    }
    staffQuery += ` ORDER BY id ASC`;
    const staff = db.prepare(staffQuery).all(...staffParams);

    res.json({
      success: true,
      staff,
      users: staff
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/users/stats - Summary metrics for Super Admin User Management
router.get('/stats', (req, res) => {
  try {
    const totalStaff = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'employee'").get().count;
    const activeStaff = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'employee' AND COALESCE(is_active, 1) = 1").get().count;
    const totalCustomers = db.prepare("SELECT COUNT(*) as count FROM customers").get().count;

    res.json({
      success: true,
      stats: {
        totalStaff,
        activeStaff,
        totalCustomers
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/users/staff or POST /api/users - Create new staff account
router.post('/staff', handleCreateStaff);
router.post('/', handleCreateStaff);

function handleCreateStaff(req, res) {
  try {
    const { username, full_name, phone, password, role = 'employee' } = req.body;

    if (!username || !password || !full_name) {
      return res.status(400).json({ success: false, message: 'Username, password, and full name are required.' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(cleanUsername);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Username already exists. Please choose a different username.' });
    }

    const validRole = role === 'admin' ? 'admin' : 'employee';
    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(password, salt);

    const result = db.prepare(`
      INSERT INTO users (username, password_hash, full_name, role, phone, is_active, must_change_password)
      VALUES (?, ?, ?, ?, ?, 1, 0)
    `).run(cleanUsername, password_hash, full_name.trim(), validRole, phone ? phone.trim() : null);

    // Audit log
    try {
      db.prepare(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
        VALUES (?, 'CREATE_STAFF_USER', 'USER', ?, ?)
      `).run(req.user.id, String(result.lastInsertRowid), `Super Admin created staff account: ${cleanUsername} (${validRole})`);
    } catch(e){}

    const newUser = db.prepare('SELECT id, username, full_name, role, phone, is_active, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, message: `Staff account '${cleanUsername}' created successfully.`, user: newUser });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// PATCH /api/users/staff/:id/toggle or PATCH /api/users/:id/toggle - Toggle Staff account Active/Disabled
router.patch('/staff/:id/toggle', handleToggleStaff);
router.patch('/:id/toggle', handleToggleStaff);

function handleToggleStaff(req, res) {
  try {
    const targetId = parseInt(req.params.id);
    if (targetId === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot disable your own Super Admin account.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const newActiveState = user.is_active === 0 ? 1 : 0;
    db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(newActiveState, targetId);

    // Audit log
    try {
      db.prepare(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
        VALUES (?, 'TOGGLE_STAFF_STATUS', 'USER', ?, ?)
      `).run(req.user.id, String(targetId), `Super Admin ${newActiveState === 1 ? 'activated' : 'disabled'} staff user ${user.username}`);
    } catch(e){}

    res.json({
      success: true,
      message: `Staff member '${user.username}' is now ${newActiveState === 1 ? 'ACTIVE' : 'DISABLED'}.`,
      is_active: newActiveState
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// POST /api/users/staff/:id/reset-password or POST /api/users/:id/reset-password
router.post('/staff/:id/reset-password', handleResetStaffPassword);
router.post('/:id/reset-password', handleResetStaffPassword);

function handleResetStaffPassword(req, res) {
  try {
    const targetId = parseInt(req.params.id);
    const { new_password } = req.body;

    if (!new_password || new_password.trim().length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(new_password.trim(), salt);

    db.prepare('UPDATE users SET password_hash = ?, failed_attempts = 0 WHERE id = ?').run(password_hash, targetId);

    // Audit log
    try {
      db.prepare(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
        VALUES (?, 'ADMIN_RESET_STAFF_PASSWORD', 'USER', ?, ?)
      `).run(req.user.id, String(targetId), `Super Admin reset password for staff user ${user.username}`);
    } catch(e){}

    res.json({
      success: true,
      message: `Password for staff '${user.username}' has been successfully reset.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// PUT /api/users/staff/:id or PUT /api/users/:id - Edit Super Admin / Staff Name, Username, Phone & Role
router.put('/staff/:id', handleUpdateStaffUser);
router.put('/:id', handleUpdateStaffUser);

function handleUpdateStaffUser(req, res) {
  try {
    const targetId = parseInt(req.params.id);
    const { full_name, username, phone = '', role } = req.body;

    if (!full_name || !full_name.trim() || !username || !username.trim()) {
      return res.status(400).json({ success: false, message: 'Full Name and Username are required.' });
    }

    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const dup = db.prepare('SELECT id FROM users WHERE LOWER(username) = ? AND id != ?').get(cleanUsername, targetId);
    if (dup) {
      return res.status(400).json({ success: false, message: `Username '${cleanUsername}' is already taken.` });
    }

    const nextRole = (targetId === req.user.id)
      ? existing.role
      : (role === 'admin' ? 'admin' : role === 'employee' ? 'employee' : existing.role);

    db.prepare(`
      UPDATE users
      SET full_name = ?, username = ?, phone = ?, role = ?
      WHERE id = ?
    `).run(full_name.trim(), cleanUsername, phone ? String(phone).trim() : null, nextRole, targetId);

    try {
      db.prepare(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
        VALUES (?, 'UPDATE_STAFF_USER', 'USER', ?, ?)
      `).run(
        req.user.id,
        String(targetId),
        `Updated user profile: ${existing.username} -> ${cleanUsername} (${full_name.trim()})`
      );
    } catch (e) {}

    const updated = db.prepare(`
      SELECT id, username, full_name, role, phone, COALESCE(is_active, 1) as is_active, created_at
      FROM users WHERE id = ?
    `).get(targetId);

    const token = (targetId === req.user.id)
      ? jwt.sign(
          { id: updated.id, username: updated.username, role: updated.role, full_name: updated.full_name },
          JWT_SECRET,
          { expiresIn: '7d' }
        )
      : undefined;

    res.json({
      success: true,
      message: `Profile updated for '${updated.full_name}' (@${updated.username}).`,
      user: updated,
      ...(token ? { token } : {})
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = router;