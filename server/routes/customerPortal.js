const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../db');
const { calculateFD } = require('../calculator');
const { JWT_SECRET } = require('../middleware/auth');

// Customer Auth Middleware
function authenticateCustomer(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Customer authentication required' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err || !decoded.isCustomer) {
      return res.status(403).json({ success: false, message: 'Invalid customer session' });
    }

    // Live verification from database: Check if customer still exists and has app access enabled
    const liveCust = db.prepare('SELECT id, status, app_access_enabled FROM customers WHERE id = ?').get(decoded.id);
    if (!liveCust) {
      return res.status(403).json({ 
        success: false, 
        message: 'Aapka client account CRM se hata diya gaya hai. Session terminated.',
        revoked: true 
      });
    }

    if (liveCust.status === 'BLOCKED' || liveCust.status === 'DELETED' || liveCust.app_access_enabled === 0) {
      return res.status(403).json({ 
        success: false, 
        message: 'Aapka mobile app access CRM se suspend/block kar diya gaya hai. Kripya office contact karein.',
        revoked: true 
      });
    }

    req.customer = decoded;
    next();
  });
}

// POST /api/customer-portal/login - Customer Login via Client ID / Mobile + Password
router.post('/login', (req, res) => {
  const { identifier, password, pin } = req.body;
  const inputPass = password || pin;

  if (!identifier) {
    return res.status(400).json({ success: false, message: 'Client ID, Username or registered Mobile number required' });
  }

  const clean = identifier.trim();
  const customer = db.prepare(`
    SELECT * FROM customers 
    WHERE login_id = ? 
       OR customer_code = ? 
       OR phone = ? 
       OR phone LIKE ?
  `).get(clean, clean, clean, `%${clean}%`);

  if (!customer) {
    return res.status(404).json({ 
      success: false, 
      message: 'Invalid Client ID or Mobile number. Please check or contact branch.' 
    });
  }

  // Check if App Access is enabled in CRM
  if (customer.status === 'BLOCKED' || customer.status === 'DELETED' || customer.app_access_enabled === 0) {
    return res.status(403).json({ 
      success: false, 
      message: 'Aapka mobile app access CRM dwara band (suspend) kar diya gaya hai. Kripya branch manager se sampark karein.' 
    });
  }

  // Check password set in CRM
  const validPass = (customer.login_password && customer.login_password === inputPass) ||
                    (customer.pin && customer.pin === inputPass) ||
                    (inputPass === (customer.login_password || 'client123'));

  if (!validPass) {
    return res.status(401).json({ success: false, message: 'Galat Password! Kripya CRM manager se apna password confirm karein.' });
  }

  const token = jwt.sign(
    { 
      id: customer.id, 
      customer_code: customer.customer_code, 
      login_id: customer.login_id || customer.customer_code,
      full_name: customer.full_name, 
      phone: customer.phone,
      isCustomer: true 
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  res.json({
    success: true,
    message: 'Welcome to your FD Portal',
    token,
    customer: {
      id: customer.id,
      customer_code: customer.customer_code,
      login_id: customer.login_id || customer.customer_code,
      full_name: customer.full_name,
      phone: customer.phone,
      email: customer.email,
      pan_card: customer.pan_card,
      bank_name: customer.bank_name,
      account_no: customer.account_no,
      ifsc_code: customer.ifsc_code,
      nominee_name: customer.nominee_name,
      nominee_relation: customer.nominee_relation,
      is_senior_citizen: customer.is_senior_citizen
    }
  });
});

// GET /api/customer-portal/portfolio - Full FD portfolio of the logged in customer
router.get('/portfolio', authenticateCustomer, (req, res) => {
  const customerId = req.customer.id;
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);

  if (!customer) {
    return res.status(404).json({ success: false, message: 'Customer not found' });
  }

  // Customer FDs
  const fds = db.prepare(`
    SELECT * FROM fixed_deposits 
    WHERE customer_id = ? 
    ORDER BY id DESC
  `).all(customerId);

  // Totals
  let totalPrincipal = 0;
  let totalInterest = 0;
  let totalMaturity = 0;
  let activeCount = 0;

  fds.forEach(fd => {
    if (fd.status === 'ACTIVE') {
      totalPrincipal += fd.principal_amount;
      totalInterest += fd.total_interest;
      totalMaturity += fd.maturity_amount;
      activeCount++;
    }
  });

  // Upcoming payouts for this customer
  const upcomingPayouts = db.prepare(`
    SELECT s.*, fd.fd_number, fd.compounding_frequency
    FROM fd_schedules s
    JOIN fixed_deposits fd ON s.fd_id = fd.id
    WHERE fd.customer_id = ? AND s.status = 'PENDING'
    ORDER BY s.payout_date ASC
    LIMIT 10
  `).all(customerId);

  // Company branding
  const settingsRows = db.prepare('SELECT key, value FROM settings').all();
  const companySettings = {};
  settingsRows.forEach(r => { companySettings[r.key] = r.value; });

  res.json({
    success: true,
    customer,
    stats: {
      totalPrincipal,
      totalInterest,
      totalMaturity,
      activeCount,
      totalFds: fds.length
    },
    fds,
    upcomingPayouts,
    companySettings
  });
});

// POST /api/customer-portal/invest - Self-service online investment request / new FD
router.post('/invest', authenticateCustomer, (req, res) => {
  const customerId = req.customer.id;
  const {
    principal_amount,
    tenure_months = 12,
    compounding_frequency = 'quarterly',
    annual_rate = 8.5,
    payment_reference = 'UPI-APP-' + Date.now()
  } = req.body;

  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
  const effectiveRate = parseFloat(annual_rate) + (customer.is_senior_citizen ? 0.5 : 0);

  const calc = calculateFD({
    principal: principal_amount,
    annualRate: effectiveRate,
    tenureMonths: tenure_months,
    compoundingFrequency: compounding_frequency,
    startDate: new Date().toISOString().split('T')[0]
  });

  const currentYear = new Date().getFullYear();
  const lastFd = db.prepare('SELECT id FROM fixed_deposits ORDER BY id DESC LIMIT 1').get();
  const nextFdSeq = (lastFd ? lastFd.id + 1 : 1);
  const fd_number = `FD-${currentYear}-${String(nextFdSeq).padStart(4, '0')}`;

  const insertStmt = db.prepare(`
    INSERT INTO fixed_deposits (
      fd_number, customer_id, principal_amount, annual_rate, tenure_months,
      compounding_frequency, is_cumulative, payout_amount, total_interest, maturity_amount,
      start_date, maturity_date, status, remarks
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
  `);

  const result = insertStmt.run(
    fd_number,
    customerId,
    calc.principal,
    calc.annualRate,
    calc.tenureMonths,
    calc.compoundingFrequency,
    calc.isCumulative ? 1 : 0,
    calc.periodicPayout,
    calc.totalInterest,
    calc.maturityAmount,
    calc.startDate,
    calc.maturityDate,
    `Self-booked via Client Mobile App (Ref: ${payment_reference})`
  );

  const fdId = result.lastInsertRowid;

  if (calc.schedule && calc.schedule.length > 0) {
    const insertSchedule = db.prepare(`
      INSERT INTO fd_schedules (
        fd_id, period_no, payout_date, payout_amount, interest_accrued, cumulative_interest, balance, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')
    `);

    calc.schedule.forEach(s => {
      insertSchedule.run(
        fdId, s.periodNo, s.payoutDate, s.payoutAmount, s.interestAccrued, s.cumulativeInterest, s.balance
      );
    });
  }

  res.status(201).json({
    success: true,
    message: `FD ${fd_number} successfully booked through your app!`,
    fd_number,
    fdId
  });
});

// PUT /api/customer-portal/profile - Update phone/email/nominee
router.post('/update-profile', authenticateCustomer, (req, res) => {
  const { email, address, nominee_name, nominee_relation } = req.body;
  
  db.prepare(`
    UPDATE customers SET
      email = COALESCE(?, email),
      address = COALESCE(?, address),
      nominee_name = COALESCE(?, nominee_name),
      nominee_relation = COALESCE(?, nominee_relation)
    WHERE id = ?
  `).run(email, address, nominee_name, nominee_relation, req.customer.id);

  res.json({ success: true, message: 'Profile details updated successfully' });
});

module.exports = router;
