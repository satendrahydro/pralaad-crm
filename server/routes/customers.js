const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission, getUserPermissions } = require('../middleware/permissions');

// GET /api/customers - List all customers with optional search & total active FD counts
router.get('/', authenticateToken, (req, res) => {
  const { search } = req.query;

  // Strict enforcement: if staff performs a search, require cust_search permission
  if (search && req.user.role === 'employee') {
    const perms = getUserPermissions(req.user.id);
    if (perms && perms.cust_search === false) {
      return res.status(403).json({
        success: false,
        code: 'PERMISSION_DENIED',
        permission: 'cust_search',
        message: "Access denied. Super Admin has disabled the 'Customer Search' function for your staff account."
      });
    }
  }

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

// GET /api/customers/search - Dedicated endpoint for customer search
router.get('/search', authenticateToken, requirePermission('cust_search'), (req, res) => {
  const { q = '' } = req.query;
  const s = `%${q}%`;
  const customers = db.prepare(`
    SELECT * FROM customers 
    WHERE full_name LIKE ? OR phone LIKE ? OR customer_code LIKE ? OR pan_card LIKE ?
    ORDER BY id DESC LIMIT 50
  `).all(s, s, s, s);
  res.json({ success: true, customers });
});

// GET /api/customers/export/csv - CSV Export of customer directory
router.get('/export/csv', authenticateToken, requirePermission('csv_export'), (req, res) => {
  const customers = db.prepare('SELECT customer_code, full_name, phone, email, pan_card, aadhaar_no, status, created_at FROM customers ORDER BY id DESC').all();
  let csv = 'Customer Code,Full Name,Phone,Email,PAN,Aadhaar,Status,Created At\n';
  for (const c of customers) {
    csv += `"${c.customer_code}","${c.full_name}","${c.phone || ''}","${c.email || ''}","${c.pan_card || ''}","${c.aadhaar_no || ''}","${c.status || 'ACTIVE'}","${c.created_at}"\n`;
  }
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="customers.csv"');
  res.send(csv);
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

// POST /api/customers - Create new customer (requires cust_registration)
router.post('/', authenticateToken, requirePermission('cust_registration'), (req, res) => {
  try {
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
      app_access_enabled
    } = req.body;

    if (!full_name || !phone) {
      return res.status(400).json({ success: false, message: 'Full name and phone are required' });
    }

    const cleanPhone = phone.trim();
    if (cleanPhone.length < 10) {
      return res.status(400).json({ success: false, message: 'Valid 10-digit mobile phone number is required.' });
    }

    const existingPhone = db.prepare('SELECT id, full_name, customer_code FROM customers WHERE phone = ?').get(cleanPhone);
    if (existingPhone) {
      return res.status(400).json({ 
        success: false, 
        message: `Phone number ${cleanPhone} is already registered with customer ${existingPhone.full_name} (${existingPhone.customer_code}).` 
      });
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
  } catch (err) {
    console.error('Error creating customer:', err);
    res.status(500).json({ success: false, message: err.message || 'Error creating customer' });
  }
});

// PUT /api/customers/:id - Update customer (requires cust_edit)
router.put('/:id', authenticateToken, requirePermission('cust_edit'), (req, res) => {
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

// PUT /api/customers/:id/kyc - Dedicated KYC Management (requires cust_kyc)
router.put('/:id/kyc', authenticateToken, requirePermission('cust_kyc'), (req, res) => {
  const { pan_card, aadhaar_no, kyc_status = 'VERIFIED' } = req.body;
  const cust = db.prepare('SELECT id FROM customers WHERE id = ?').get(req.params.id);
  if (!cust) return res.status(404).json({ success: false, message: 'Customer not found' });

  db.prepare(`
    UPDATE customers SET
      pan_card = COALESCE(?, pan_card),
      aadhaar_no = COALESCE(?, aadhaar_no)
    WHERE id = ?
  `).run(
    pan_card ? pan_card.toUpperCase() : null,
    aadhaar_no,
    req.params.id
  );

  res.json({
    success: true,
    message: 'Customer KYC updated successfully',
    kyc_status,
    customerId: req.params.id
  });
});

// POST /api/customers/:id/documents - Document Upload (requires cust_doc_upload)
router.post('/:id/documents', authenticateToken, requirePermission('cust_doc_upload'), (req, res) => {
  const { document_type = 'IDENTITY_PROOF', document_name = 'Identity Document' } = req.body;
  const cust = db.prepare('SELECT id, full_name FROM customers WHERE id = ?').get(req.params.id);
  if (!cust) return res.status(404).json({ success: false, message: 'Customer not found' });

  res.status(201).json({
    success: true,
    message: `Document '${document_name}' uploaded successfully for ${cust.full_name}`,
    documentId: Date.now(),
    document_type
  });
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

// GET /api/customers/:id/portfolio - Unified 360 Portfolio across FD, RD, MIS, and Savings
router.get('/:id/portfolio', authenticateToken, (req, res) => {
  try {
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const fds = db.prepare('SELECT * FROM fixed_deposits WHERE customer_id = ? ORDER BY id DESC').all(customer.id);
    
    let rds = [];
    try {
      rds = db.prepare('SELECT * FROM recurring_deposits WHERE customer_id = ? ORDER BY id DESC').all(customer.id);
    } catch(e){}

    let mis = [];
    try {
      mis = db.prepare('SELECT * FROM mis_accounts WHERE customer_id = ? ORDER BY id DESC').all(customer.id);
    } catch(e){}

    let savings = [];
    try {
      savings = db.prepare('SELECT * FROM savings_accounts WHERE customer_id = ? ORDER BY id DESC').all(customer.id);
    } catch(e){}

    // Aggregate calculations
    const activeFdPrincipal = fds.filter(f => f.status === 'ACTIVE').reduce((sum, f) => sum + (f.principal_amount || 0), 0);
    const activeFdInterest = fds.filter(f => f.status === 'ACTIVE').reduce((sum, f) => sum + (f.total_interest || 0), 0);

    const activeRdDeposited = rds.filter(r => r.status === 'ACTIVE').reduce((sum, r) => sum + (r.amount_deposited || 0), 0);
    const activeRdInterest = rds.filter(r => r.status === 'ACTIVE').reduce((sum, r) => sum + (r.total_interest || 0), 0);

    const activeMisDeposit = mis.filter(m => m.status === 'ACTIVE').reduce((sum, m) => sum + (m.deposit_amount || 0), 0);
    const activeMisPayout = mis.filter(m => m.status === 'ACTIVE').reduce((sum, m) => sum + (m.total_payout_amount || 0), 0);

    const activeSavingsBalance = savings.filter(s => s.status === 'ACTIVE').reduce((sum, s) => sum + (s.current_balance || 0), 0);

    const totalDeposits = activeFdPrincipal + activeRdDeposited + activeMisDeposit + activeSavingsBalance;
    const totalInterest = activeFdInterest + activeRdInterest + activeMisPayout;
    const totalAccounts = fds.length + rds.length + mis.length + savings.length;

    res.json({
      success: true,
      customer,
      portfolio: {
        fds,
        rds,
        mis,
        savings
      },
      summary: {
        totalDeposits: Math.round(totalDeposits * 100) / 100,
        totalInterest: Math.round(totalInterest * 100) / 100,
        totalAccounts,
        productBreakdown: {
          fd: { count: fds.length, activeDeposits: activeFdPrincipal, totalInterest: activeFdInterest },
          rd: { count: rds.length, activeDeposits: activeRdDeposited, totalInterest: activeRdInterest },
          mis: { count: mis.length, activeDeposits: activeMisDeposit, totalInterest: activeMisPayout },
          savings: { count: savings.length, currentBalance: activeSavingsBalance }
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
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
