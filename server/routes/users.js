const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// All endpoints in this router are restricted to Super Admin
router.use(authenticateToken, requireAdmin);

// Helper: Generate random 8-character temporary password
function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(crypto.randomInt(0, chars.length));
  }
  return `Client@${code}`;
}

// GET /api/users - List all users (Staff and Customer App Accounts)
router.get('/', (req, res) => {
  try {
    const { tab = 'all', search = '' } = req.query;

    // 1. Fetch Staff Accounts
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

    // 2. Fetch Customer App Accounts
    let custQuery = `
      SELECT c.id, c.customer_code, c.full_name, c.phone, c.email, c.login_id,
             COALESCE(c.app_access_enabled, 0) as app_access_enabled,
             COALESCE(c.app_access_status, 'NOT_CREATED') as app_access_status,
             COALESCE(c.access_type, 'PERMANENT') as access_type,
             c.first_login_at,
             c.expires_at,
             COALESCE(c.temp_access_hours, 48) as temp_access_hours,
             c.status as account_status,
             c.last_login_at,
             COALESCE(c.must_change_password, 0) as must_change_password,
             c.created_at,
             COUNT(fd.id) as total_fds,
             COALESCE(SUM(CASE WHEN fd.status = 'ACTIVE' THEN fd.principal_amount ELSE 0 END), 0) as total_active_investment
      FROM customers c
      LEFT JOIN fixed_deposits fd ON c.id = fd.customer_id
    `;
    const custParams = [];
    if (search) {
      custQuery += ` WHERE c.full_name LIKE ? OR c.phone LIKE ? OR c.customer_code LIKE ? OR c.login_id LIKE ?`;
      const s = `%${search}%`;
      custParams.push(s, s, s, s);
    }
    custQuery += ` GROUP BY c.id ORDER BY c.id ASC`;
    const customers = db.prepare(custQuery).all(...custParams);

    // Calculate dynamic 48-hour temporary status, remaining validity, and auto-expire if past expiry
    const now = Date.now();
    for (const c of customers) {
      c.access_type = c.access_type || 'PERMANENT';
      if (c.access_type === 'TEMPORARY') {
        if (c.expires_at) {
          const expiryMs = new Date(c.expires_at).getTime();
          if (now > expiryMs) {
            if (c.app_access_status !== 'EXPIRED' || c.app_access_enabled !== 0) {
              try {
                db.prepare("UPDATE customers SET app_access_status = 'EXPIRED', app_access_enabled = 0 WHERE id = ?").run(c.id);
                db.prepare(`
                  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
                  VALUES (?, 'CUSTOMER_APP_ACCESS_EXPIRED', 'CUSTOMER', ?, ?)
                `).run(req.user.id, String(c.id), `48-hour temporary app access for ${c.full_name} (${c.customer_code}) expired on ${c.expires_at}. Access auto-blocked.`);
              } catch(e){}
              c.app_access_status = 'EXPIRED';
              c.app_access_enabled = 0;
            }
            c.is_expired = true;
            c.remaining_formatted = 'Expired';
            c.remaining_seconds = 0;
          } else {
            const diffMs = expiryMs - now;
            const h = Math.floor(diffMs / (3600 * 1000));
            const m = Math.floor((diffMs % (3600 * 1000)) / (60 * 1000));
            c.is_expired = false;
            c.remaining_formatted = `${h}h ${m}m remaining`;
            c.remaining_seconds = Math.floor(diffMs / 1000);
          }
        } else {
          // Created, but customer hasn't logged in yet
          c.app_access_status = 'PENDING FIRST LOGIN';
          c.remaining_formatted = '48 Hours (Starts on First Login)';
          c.remaining_seconds = 48 * 3600;
        }
      } else {
        c.remaining_formatted = 'Permanent Access';
        c.remaining_seconds = null;
      }
    }

    res.json({
      success: true,
      staff,
      customers
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
    const appActiveCustomers = db.prepare("SELECT COUNT(*) as count FROM customers WHERE app_access_enabled = 1 AND app_access_status = 'ACTIVE'").get().count;
    const appPendingCustomers = db.prepare("SELECT COUNT(*) as count FROM customers WHERE app_access_status = 'PENDING'").get().count;
    const appSuspendedCustomers = db.prepare("SELECT COUNT(*) as count FROM customers WHERE app_access_status = 'SUSPENDED' OR (app_access_enabled = 0 AND login_id IS NOT NULL)").get().count;

    res.json({
      success: true,
      stats: {
        totalStaff,
        activeStaff,
        totalCustomers,
        appActiveCustomers,
        appPendingCustomers,
        appSuspendedCustomers,
        appNotCreatedCustomers: Math.max(0, totalCustomers - appActiveCustomers - appPendingCustomers - appSuspendedCustomers)
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

// ========================================================
// CUSTOMER APP USER MANAGEMENT (SUPER ADMIN)
// ========================================================

// POST /api/users/customer - Super Admin creates/activates Customer App Login
router.post('/customer', (req, res) => {
  try {
    const { customer_id, login_id, temp_password, temporary_password, access_type = 'PERMANENT' } = req.body;
    const providedPass = (temp_password && temp_password.trim()) || (temporary_password && temporary_password.trim());

    if (!customer_id) {
      return res.status(400).json({ success: false, message: 'Customer ID is required.' });
    }

    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customer_id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer record not found.' });
    }

    const isTemporary = access_type === 'TEMPORARY';

    // Determine Login ID (custom or customer code or phone)
    const cleanLoginId = (login_id && login_id.trim()) 
      ? login_id.trim() 
      : (customer.login_id || customer.customer_code);

    // Check for duplicate Login ID among OTHER customers
    const dupCheck = db.prepare('SELECT id, full_name FROM customers WHERE (login_id = ? OR customer_code = ?) AND id != ?').get(cleanLoginId, cleanLoginId, customer.id);
    if (dupCheck) {
      return res.status(400).json({ 
        success: false, 
        message: `Login ID '${cleanLoginId}' is already assigned to another customer (${dupCheck.full_name}).` 
      });
    }

    // Generate or use provided temporary password
    const plainTempPassword = providedPass || generateTempPassword();

    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(plainTempPassword, salt);

    const initialStatus = isTemporary ? 'PENDING FIRST LOGIN' : 'ACTIVE';

    db.prepare(`
      UPDATE customers 
      SET login_id = ?,
          password_hash = ?,
          login_password = ?,
          app_access_enabled = 1,
          app_access_status = ?,
          access_type = ?,
          first_login_at = NULL,
          expires_at = NULL,
          temp_access_hours = 48,
          must_change_password = 1,
          status = 'ACTIVE'
      WHERE id = ?
    `).run(cleanLoginId, password_hash, plainTempPassword, initialStatus, isTemporary ? 'TEMPORARY' : 'PERMANENT', customer.id);

    // Audit log
    const auditAction = isTemporary ? 'CREATE_TEMPORARY_CUSTOMER_APP_LOGIN' : 'CREATE_CUSTOMER_APP_LOGIN';
    const auditDetails = isTemporary
      ? `Super Admin created 48-Hour Temporary App Access for ${customer.full_name} (${customer.customer_code}) with Login ID: ${cleanLoginId}. Countdown starts on first login.`
      : `Super Admin activated Permanent App Access for ${customer.full_name} (${customer.customer_code}) with Login ID: ${cleanLoginId}`;

    try {
      db.prepare(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
        VALUES (?, ?, 'CUSTOMER', ?, ?)
      `).run(req.user.id, auditAction, String(customer.id), auditDetails);
    } catch(e){}

    const updatedCustomer = db.prepare(`
      SELECT id, customer_code, full_name, phone, email, login_id, 
             app_access_enabled, app_access_status, access_type, first_login_at, expires_at, temp_access_hours,
             last_login_at, must_change_password, status
      FROM customers WHERE id = ?
    `).get(customer.id);

    res.status(201).json({
      success: true,
      message: isTemporary
        ? `Temporary 48-Hour Customer App Access created for ${customer.full_name}. (Countdown begins upon first login).`
        : `Permanent Customer App Login activated for ${customer.full_name}.`,
      customer: updatedCustomer,
      temp_password: plainTempPassword,
      temporary_password: plainTempPassword
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/users/customer/:id/renew-temporary - Super Admin renews temporary access for another 48 hours
router.post('/customer/:id/renew-temporary', (req, res) => {
  try {
    const custId = parseInt(req.params.id);
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(custId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    // Set new expiry 48 hours from current time
    const newExpiresAt = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
    
    db.prepare(`
      UPDATE customers 
      SET expires_at = ?,
          app_access_enabled = 1,
          app_access_status = 'ACTIVE',
          access_type = 'TEMPORARY',
          status = 'ACTIVE'
      WHERE id = ?
    `).run(newExpiresAt, custId);

    // Audit log
    try {
      db.prepare(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
        VALUES (?, 'RENEW_TEMPORARY_CUSTOMER_APP_ACCESS', 'CUSTOMER', ?, ?)
      `).run(
        req.user.id, 
        String(custId), 
        `Super Admin renewed 48-Hour Temporary App Access for ${customer.full_name} (${customer.customer_code}). New Expiry: ${newExpiresAt}`
      );
    } catch(e){}

    const updated = db.prepare(`
      SELECT id, customer_code, full_name, phone, email, login_id, 
             app_access_enabled, app_access_status, access_type, first_login_at, expires_at, temp_access_hours,
             last_login_at, status
      FROM customers WHERE id = ?
    `).get(custId);

    res.json({
      success: true,
      message: `Temporary app access for '${customer.full_name}' renewed for 48 hours. Valid until: ${new Date(newExpiresAt).toLocaleString('en-IN')}`,
      customer: updated,
      app_access_status: updated.app_access_status,
      expires_at: newExpiresAt
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/users/customer/:id/toggle - Super Admin toggles Customer App Access (Active/Suspended)
router.patch('/customer/:id/toggle', (req, res) => {
  try {
    const custId = parseInt(req.params.id);
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(custId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    const currentActive = customer.app_access_enabled === 1;
    const newActiveState = currentActive ? 0 : 1;
    
    let newStatus = 'ACTIVE';
    if (newActiveState === 0) {
      newStatus = 'SUSPENDED';
    } else {
      if (customer.access_type === 'TEMPORARY') {
        if (!customer.first_login_at) {
          newStatus = 'PENDING FIRST LOGIN';
        } else if (customer.expires_at && new Date() > new Date(customer.expires_at)) {
          // If expired, reactivating extends it for 48 hours
          const newExp = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
          db.prepare("UPDATE customers SET expires_at = ? WHERE id = ?").run(newExp, custId);
          newStatus = 'ACTIVE';
        } else {
          newStatus = 'ACTIVE';
        }
      } else {
        newStatus = 'ACTIVE';
      }
    }

    db.prepare(`
      UPDATE customers 
      SET app_access_enabled = ?,
          app_access_status = ?,
          status = ?
      WHERE id = ?
    `).run(newActiveState, newStatus, newActiveState === 1 ? 'ACTIVE' : 'BLOCKED', custId);

    // Audit log
    const auditAction = newActiveState === 1 ? 'REACTIVATE_CUSTOMER_APP_ACCESS' : 'SUSPEND_CUSTOMER_APP_ACCESS';
    const auditDetails = `Super Admin ${newActiveState === 1 ? 'REACTIVATED' : 'SUSPENDED'} App Access for ${customer.full_name} (${customer.customer_code})`;

    try {
      db.prepare(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
        VALUES (?, ?, 'CUSTOMER', ?, ?)
      `).run(req.user.id, auditAction, String(custId), auditDetails);
    } catch(e){}

    res.json({
      success: true,
      message: `Customer App Access for '${customer.full_name}' is now ${newStatus}.`,
      app_access_enabled: newActiveState,
      app_access_status: newStatus
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/users/customer/:id/reset-password - Super Admin sets/generates temp password for customer
router.post('/customer/:id/reset-password', (req, res) => {
  try {
    const custId = parseInt(req.params.id);
    const { new_password } = req.body;

    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(custId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    const plainTempPassword = (new_password && new_password.trim().length >= 4) 
      ? new_password.trim() 
      : generateTempPassword();

    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(plainTempPassword, salt);

    db.prepare(`
      UPDATE customers 
      SET password_hash = ?,
          login_password = ?,
          must_change_password = 1,
          app_access_enabled = 1,
          app_access_status = 'ACTIVE'
      WHERE id = ?
    `).run(password_hash, plainTempPassword, custId);

    // Audit log
    try {
      db.prepare(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
        VALUES (?, 'RESET_CUSTOMER_APP_PASSWORD', 'CUSTOMER', ?, ?)
      `).run(
        req.user.id, 
        String(custId), 
        `Super Admin reset App Password for ${customer.full_name} (${customer.customer_code})`
      );
    } catch(e){}

    res.json({
      success: true,
      message: `Temporary password set for ${customer.full_name}. Customer must change password at next login.`,
      temp_password: plainTempPassword
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;