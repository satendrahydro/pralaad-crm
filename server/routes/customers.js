const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// GET /api/customers - List all customers with optional search & total active FD counts
router.get('/', authenticateToken, (req, res) => {
  const { search } = req.query;
  let query = `
    SELECT c.*, 
      COUNT(fd.id) as total_fds,
      COALESCE(SUM(CASE WHEN fd.status = 'ACTIVE' THEN fd.principal_amount ELSE 0 END), 0) as total_active_investment
    FROM customers c
    LEFT JOIN fixed_deposits fd ON c.id = fd.customer_id
  `;
  const params = [];

  if (search) {
    query += ` WHERE c.full_name LIKE ? OR c.phone LIKE ? OR c.customer_code LIKE ? OR c.pan_card LIKE ?`;
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }

  query += ` GROUP BY c.id ORDER BY c.id DESC`;

  const customers = db.prepare(query).all(...params);
  res.json({ success: true, customers });
});

// GET /api/customers/:id - Customer profile with all their FDs
router.get('/:id', authenticateToken, (req, res) => {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) {
    return res.status(404).json({ success: false, message: 'Customer not found' });
  }

  const fds = db.prepare(`
    SELECT * FROM fixed_deposits 
    WHERE customer_id = ? 
    ORDER BY id DESC
  `).all(customer.id);

  res.json({ success: true, customer, fds });
});

// POST /api/customers - Create new customer
router.post('/', authenticateToken, (req, res) => {
  const {
    full_name,
    phone,
    email,
    pan_card,
    aadhaar_no,
    address,
    bank_name,
    account_no,
    ifsc_code,
    nominee_name,
    nominee_relation,
    is_senior_citizen,
    login_id,
    login_password
  } = req.body;

  if (!full_name || !phone) {
    return res.status(400).json({ success: false, message: 'Full name and phone are required' });
  }

  // Generate unique customer code
  const lastCustomer = db.prepare('SELECT id FROM customers ORDER BY id DESC LIMIT 1').get();
  const nextId = (lastCustomer ? lastCustomer.id + 1 : 1);
  const customer_code = `CUST-${1000 + nextId}`;

  const stmt = db.prepare(`
    INSERT INTO customers (
      customer_code, login_id, login_password, app_access_enabled, status, full_name, phone, email, pan_card, aadhaar_no,
      address, bank_name, account_no, ifsc_code, nominee_name, nominee_relation, is_senior_citizen
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    customer_code,
    login_id ? login_id.trim() : customer_code,
    login_password ? login_password.trim() : 'client123',
    app_access_enabled !== undefined ? (app_access_enabled ? 1 : 0) : 1,
    'ACTIVE',
    full_name.trim(),
    phone.trim(),
    email ? email.trim() : null,
    pan_card ? pan_card.trim().toUpperCase() : null,
    aadhaar_no ? aadhaar_no.trim() : null,
    address || null,
    bank_name || null,
    account_no || null,
    ifsc_code ? ifsc_code.trim().toUpperCase() : null,
    nominee_name || null,
    nominee_relation || null,
    is_senior_citizen ? 1 : 0
  );

  const newCust = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ success: true, message: 'Customer created successfully', customer: newCust });
});

// PUT /api/customers/:id - Update customer (including Login ID, Password, and App Access)
router.put('/:id', authenticateToken, (req, res) => {
  const {
    full_name,
    phone,
    email,
    pan_card,
    aadhaar_no,
    address,
    bank_name,
    account_no,
    ifsc_code,
    nominee_name,
    nominee_relation,
    is_senior_citizen,
    login_id,
    login_password,
    app_access_enabled,
    status
  } = req.body;

  const stmt = db.prepare(`
    UPDATE customers SET
      full_name = COALESCE(?, full_name),
      phone = COALESCE(?, phone),
      email = COALESCE(?, email),
      pan_card = COALESCE(?, pan_card),
      aadhaar_no = COALESCE(?, aadhaar_no),
      address = COALESCE(?, address),
      bank_name = COALESCE(?, bank_name),
      account_no = COALESCE(?, account_no),
      ifsc_code = COALESCE(?, ifsc_code),
      nominee_name = COALESCE(?, nominee_name),
      nominee_relation = COALESCE(?, nominee_relation),
      is_senior_citizen = COALESCE(?, is_senior_citizen),
      login_id = COALESCE(?, login_id),
      login_password = COALESCE(?, login_password),
      app_access_enabled = COALESCE(?, app_access_enabled),
      status = COALESCE(?, status)
    WHERE id = ?
  `);

  stmt.run(
    full_name, phone, email,
    pan_card ? pan_card.toUpperCase() : null,
    aadhaar_no, address, bank_name, account_no,
    ifsc_code ? ifsc_code.toUpperCase() : null,
    nominee_name, nominee_relation,
    is_senior_citizen !== undefined ? (is_senior_citizen ? 1 : 0) : null,
    login_id ? login_id.trim() : null,
    login_password ? login_password.trim() : null,
    app_access_enabled !== undefined ? (app_access_enabled ? 1 : 0) : null,
    status || null,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  res.json({ success: true, message: 'Customer updated successfully', customer: updated });
});

// PATCH /api/customers/:id/toggle-access - 1-Click Toggle App Access from CRM
router.patch('/:id/toggle-access', authenticateToken, (req, res) => {
  const cust = db.prepare('SELECT id, app_access_enabled, full_name FROM customers WHERE id = ?').get(req.params.id);
  if (!cust) return res.status(404).json({ success: false, message: 'Customer not found' });

  const newStatus = cust.app_access_enabled === 1 ? 0 : 1;
  db.prepare('UPDATE customers SET app_access_enabled = ?, status = ? WHERE id = ?').run(
    newStatus, 
    newStatus === 1 ? 'ACTIVE' : 'BLOCKED', 
    req.params.id
  );

  res.json({ 
    success: true, 
    message: newStatus === 1 ? `Mobile app access enabled for ${cust.full_name}` : `Mobile app access BLOCKED for ${cust.full_name}`, 
    app_access_enabled: newStatus 
  });
});

// DELETE /api/customers/:id - Remove Customer from CRM & Instantly Block App Access
router.delete('/:id', authenticateToken, (req, res) => {
  const { force } = req.query;
  const cust = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!cust) {
    return res.status(404).json({ success: false, message: 'Customer not found' });
  }

  const activeFds = db.prepare('SELECT count(*) as count FROM fixed_deposits WHERE customer_id = ? AND status = "ACTIVE"').get(req.params.id);
  if (activeFds.count > 0 && force !== 'true') {
    return res.status(400).json({ 
      success: false, 
      hasActiveFds: true,
      message: `Customer ${cust.full_name} has ${activeFds.count} active FD(s). Please close active FDs first or block mobile app access.` 
    });
  }

  // Delete all schedules and FDs associated with customer
  db.prepare(`
    DELETE FROM fd_schedules WHERE fd_id IN (SELECT id FROM fixed_deposits WHERE customer_id = ?)
  `).run(req.params.id);
  db.prepare('DELETE FROM fixed_deposits WHERE customer_id = ?').run(req.params.id);
  db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);

  res.json({ success: true, message: `Customer ${cust.full_name} permanently deleted from CRM and Mobile App access revoked.` });
});

module.exports = router;
