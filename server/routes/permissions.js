const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { 
  PERMISSIONS_CATALOG, 
  DEFAULT_STAFF_PERMISSIONS, 
  getUserPermissions 
} = require('../middleware/permissions');

// Initialize dedicated audit table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS staff_permission_audits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER NOT NULL,
    admin_username TEXT NOT NULL,
    staff_id INTEGER NOT NULL,
    staff_username TEXT NOT NULL,
    permission_key TEXT NOT NULL,
    permission_label TEXT NOT NULL,
    old_value INTEGER NOT NULL,
    new_value INTEGER NOT NULL,
    action_type TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// -------------------------------------------------------------------------
// 1. PUBLIC / AUTHENTICATED STAFF ROUTES
// -------------------------------------------------------------------------

// GET /api/permissions/catalog - Get metadata catalog of all controls
router.get('/catalog', authenticateToken, (req, res) => {
  res.json({
    success: true,
    catalog: PERMISSIONS_CATALOG,
    defaults: DEFAULT_STAFF_PERMISSIONS
  });
});

// GET /api/permissions/my-permissions - Get live active permissions for currently logged-in user
router.get('/my-permissions', authenticateToken, (req, res) => {
  try {
    const permissions = getUserPermissions(req.user.id);
    if (!permissions) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      userId: req.user.id,
      role: req.user.role,
      permissions,
      isAdmin: req.user.role === 'admin'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------------------------------------------------------------
// 2. SUPER ADMIN ONLY ROUTES
// -------------------------------------------------------------------------
router.use(authenticateToken, requireAdmin);

// GET /api/permissions/staff - List all staff accounts with their current permissions
router.get('/staff', (req, res) => {
  try {
    const staffList = db.prepare(`
      SELECT id, username, full_name, role, phone, is_active, permissions, last_login_at, created_at
      FROM users
      WHERE role = 'employee'
      ORDER BY id ASC
    `).all();

    const staffWithPerms = staffList.map(s => {
      let perms = {};
      try {
        perms = s.permissions ? JSON.parse(s.permissions) : {};
      } catch (e) {
        perms = {};
      }

      // Merge with defaults
      const activePermissions = {};
      let disabledCount = 0;
      for (const key of Object.keys(DEFAULT_STAFF_PERMISSIONS)) {
        const val = perms[key] !== undefined ? Boolean(perms[key]) : DEFAULT_STAFF_PERMISSIONS[key];
        activePermissions[key] = val;
        if (!val) disabledCount++;
      }

      return {
        id: s.id,
        username: s.username,
        full_name: s.full_name,
        role: s.role,
        phone: s.phone,
        is_active: s.is_active,
        last_login_at: s.last_login_at,
        created_at: s.created_at,
        has_custom_permissions: s.permissions !== null,
        disabled_count: disabledCount,
        permissions: activePermissions
      };
    });

    res.json({
      success: true,
      count: staffWithPerms.length,
      catalog: PERMISSIONS_CATALOG,
      defaults: DEFAULT_STAFF_PERMISSIONS,
      staff: staffWithPerms
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/permissions/staff/:id - Get specific staff member's permissions
router.get('/staff/:id', (req, res) => {
  try {
    const staff = db.prepare(`
      SELECT id, username, full_name, role, permissions, is_active 
      FROM users WHERE id = ? AND role = 'employee'
    `).get(req.params.id);

    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    const activePermissions = getUserPermissions(staff.id);

    res.json({
      success: true,
      staff: {
        id: staff.id,
        username: staff.username,
        full_name: staff.full_name,
        permissions: activePermissions
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/permissions/staff/:id - Save & update permissions for a single staff account
router.put('/staff/:id', (req, res) => {
  try {
    const staff = db.prepare(`
      SELECT id, username, full_name, role, permissions, is_active 
      FROM users WHERE id = ? AND role = 'employee'
    `).get(req.params.id);

    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found or user is not a staff member' });
    }

    const newPermissionsInput = req.body.permissions;
    if (!newPermissionsInput || typeof newPermissionsInput !== 'object') {
      return res.status(400).json({ success: false, message: 'Invalid permissions payload. Object expected.' });
    }

    // Previous active permissions
    const oldPermissions = getUserPermissions(staff.id);

    // Validate and sanitize every key
    const sanitizedPermissions = {};
    const changes = [];

    for (const key of Object.keys(DEFAULT_STAFF_PERMISSIONS)) {
      const oldVal = oldPermissions[key] !== undefined ? oldPermissions[key] : DEFAULT_STAFF_PERMISSIONS[key];
      const newVal = newPermissionsInput[key] !== undefined ? Boolean(newPermissionsInput[key]) : oldVal;
      sanitizedPermissions[key] = newVal;

      if (oldVal !== newVal) {
        changes.push({
          key,
          label: PERMISSIONS_CATALOG[key]?.label || key,
          old_value: oldVal ? 1 : 0,
          new_value: newVal ? 1 : 0
        });
      }
    }

    // Persist to users table instantly
    db.prepare('UPDATE users SET permissions = ? WHERE id = ?').run(
      JSON.stringify(sanitizedPermissions),
      staff.id
    );

    // Log each individual permission change in audit tables
    const adminUser = db.prepare('SELECT username FROM users WHERE id = ?').get(req.user.id);
    const adminUsername = adminUser ? adminUser.username : `admin_${req.user.id}`;

    const insertAudit = db.prepare(`
      INSERT INTO staff_permission_audits (
        admin_id, admin_username, staff_id, staff_username, 
        permission_key, permission_label, old_value, new_value, action_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SINGLE_UPDATE')
    `);

    for (const c of changes) {
      insertAudit.run(
        req.user.id,
        adminUsername,
        staff.id,
        staff.username,
        c.key,
        c.label,
        c.old_value,
        c.new_value
      );
    }

    // Also record standard audit log entry
    if (changes.length > 0) {
      try {
        db.prepare(`
          INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
          VALUES (?, 'STAFF_PERMISSIONS_UPDATE', 'USER', ?, ?)
        `).run(
          req.user.id,
          String(staff.id),
          JSON.stringify({
            staff_username: staff.username,
            total_changes: changes.length,
            changes
          })
        );
      } catch (e) {}
    }

    res.json({
      success: true,
      message: `Permissions updated successfully for ${staff.full_name} (${changes.length} change(s) logged).`,
      staffId: staff.id,
      changesCount: changes.length,
      permissions: sanitizedPermissions
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/permissions/staff/bulk - Apply permissions to all staff or a selected list of staff IDs
router.post('/staff/bulk', (req, res) => {
  try {
    const { staff_ids, apply_to_all, permissions: newPermissionsInput } = req.body;

    if (!newPermissionsInput || typeof newPermissionsInput !== 'object') {
      return res.status(400).json({ success: false, message: 'Invalid permissions payload. Object expected.' });
    }

    let targetStaff = [];
    if (apply_to_all === true) {
      targetStaff = db.prepare("SELECT id, username, full_name, permissions FROM users WHERE role = 'employee'").all();
    } else if (Array.isArray(staff_ids) && staff_ids.length > 0) {
      const placeholders = staff_ids.map(() => '?').join(',');
      targetStaff = db.prepare(`SELECT id, username, full_name, permissions FROM users WHERE role = 'employee' AND id IN (${placeholders})`).all(...staff_ids);
    } else {
      return res.status(400).json({ success: false, message: 'Provide either apply_to_all: true or an array of staff_ids.' });
    }

    if (targetStaff.length === 0) {
      return res.status(404).json({ success: false, message: 'No matching staff members found.' });
    }

    const adminUser = db.prepare('SELECT username FROM users WHERE id = ?').get(req.user.id);
    const adminUsername = adminUser ? adminUser.username : `admin_${req.user.id}`;

    const updateStmt = db.prepare('UPDATE users SET permissions = ? WHERE id = ?');
    const insertAudit = db.prepare(`
      INSERT INTO staff_permission_audits (
        admin_id, admin_username, staff_id, staff_username, 
        permission_key, permission_label, old_value, new_value, action_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'BULK_UPDATE')
    `);

    let totalStaffUpdated = 0;
    let totalChangesLogged = 0;

    for (const staff of targetStaff) {
      const oldPermissions = getUserPermissions(staff.id);
      const sanitizedPermissions = {};
      const changes = [];

      for (const key of Object.keys(DEFAULT_STAFF_PERMISSIONS)) {
        const oldVal = oldPermissions[key] !== undefined ? oldPermissions[key] : DEFAULT_STAFF_PERMISSIONS[key];
        const newVal = newPermissionsInput[key] !== undefined ? Boolean(newPermissionsInput[key]) : oldVal;
        sanitizedPermissions[key] = newVal;

        if (oldVal !== newVal) {
          changes.push({
            key,
            label: PERMISSIONS_CATALOG[key]?.label || key,
            old_value: oldVal ? 1 : 0,
            new_value: newVal ? 1 : 0
          });
        }
      }

      updateStmt.run(JSON.stringify(sanitizedPermissions), staff.id);
      totalStaffUpdated++;

      for (const c of changes) {
        insertAudit.run(
          req.user.id,
          adminUsername,
          staff.id,
          staff.username,
          c.key,
          c.label,
          c.old_value,
          c.new_value
        );
        totalChangesLogged++;
      }
    }

    res.json({
      success: true,
      message: `Bulk permissions applied to ${totalStaffUpdated} staff account(s) (${totalChangesLogged} change(s) logged).`,
      staffCount: totalStaffUpdated,
      changesCount: totalChangesLogged
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/permissions/staff/:id/restore-defaults - Restore default permissions (all ON) for a specific staff member
router.post('/staff/:id/restore-defaults', (req, res) => {
  try {
    const staff = db.prepare(`
      SELECT id, username, full_name, permissions 
      FROM users WHERE id = ? AND role = 'employee'
    `).get(req.params.id);

    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    const oldPermissions = getUserPermissions(staff.id);
    const changes = [];

    for (const key of Object.keys(DEFAULT_STAFF_PERMISSIONS)) {
      const oldVal = oldPermissions[key];
      const newVal = DEFAULT_STAFF_PERMISSIONS[key];
      if (oldVal !== newVal) {
        changes.push({
          key,
          label: PERMISSIONS_CATALOG[key]?.label || key,
          old_value: oldVal ? 1 : 0,
          new_value: 1
        });
      }
    }

    // Set permissions to default JSON
    db.prepare('UPDATE users SET permissions = ? WHERE id = ?').run(
      JSON.stringify(DEFAULT_STAFF_PERMISSIONS),
      staff.id
    );

    const adminUser = db.prepare('SELECT username FROM users WHERE id = ?').get(req.user.id);
    const adminUsername = adminUser ? adminUser.username : `admin_${req.user.id}`;

    const insertAudit = db.prepare(`
      INSERT INTO staff_permission_audits (
        admin_id, admin_username, staff_id, staff_username, 
        permission_key, permission_label, old_value, new_value, action_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'RESTORE_DEFAULTS')
    `);

    for (const c of changes) {
      insertAudit.run(
        req.user.id,
        adminUsername,
        staff.id,
        staff.username,
        c.key,
        c.label,
        c.old_value,
        c.new_value
      );
    }

    res.json({
      success: true,
      message: `Default permissions restored for ${staff.full_name}. All ${Object.keys(DEFAULT_STAFF_PERMISSIONS).length} functions enabled.`,
      staffId: staff.id,
      permissions: DEFAULT_STAFF_PERMISSIONS
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/permissions/staff/restore-all-defaults - Restore default permissions for all staff
router.post('/staff/restore-all-defaults', (req, res) => {
  try {
    const staffList = db.prepare("SELECT id, username, full_name, permissions FROM users WHERE role = 'employee'").all();
    const adminUser = db.prepare('SELECT username FROM users WHERE id = ?').get(req.user.id);
    const adminUsername = adminUser ? adminUser.username : `admin_${req.user.id}`;

    const updateStmt = db.prepare('UPDATE users SET permissions = ? WHERE id = ?');
    const insertAudit = db.prepare(`
      INSERT INTO staff_permission_audits (
        admin_id, admin_username, staff_id, staff_username, 
        permission_key, permission_label, old_value, new_value, action_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'RESTORE_ALL_DEFAULTS')
    `);

    let changesLogged = 0;
    for (const staff of staffList) {
      const oldPermissions = getUserPermissions(staff.id);
      updateStmt.run(JSON.stringify(DEFAULT_STAFF_PERMISSIONS), staff.id);

      for (const key of Object.keys(DEFAULT_STAFF_PERMISSIONS)) {
        if (oldPermissions[key] !== true) {
          insertAudit.run(
            req.user.id,
            adminUsername,
            staff.id,
            staff.username,
            key,
            PERMISSIONS_CATALOG[key]?.label || key,
            0,
            1
          );
          changesLogged++;
        }
      }
    }

    res.json({
      success: true,
      message: `Default permissions restored for all ${staffList.length} staff members.`,
      staffCount: staffList.length,
      changesLogged
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/permissions/audit-logs - Retrieve immutable audit history of permission changes
router.get('/audit-logs', (req, res) => {
  try {
    const { limit = 50, staff_id } = req.query;
    let query = `
      SELECT id, admin_id, admin_username, staff_id, staff_username, 
             permission_key, permission_label, old_value, new_value, action_type, created_at
      FROM staff_permission_audits
    `;
    const params = [];
    if (staff_id) {
      query += ` WHERE staff_id = ?`;
      params.push(staff_id);
    }
    query += ` ORDER BY id DESC LIMIT ?`;
    params.push(parseInt(limit) || 50);

    const logs = db.prepare(query).all(...params);
    res.json({
      success: true,
      logs
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
