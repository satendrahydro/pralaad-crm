const express = require('express');
const router = express.Router();
const db = require('../db');
const { calculateFD, calculatePrematureWithdrawal } = require('../calculator');
const { authenticateToken } = require('../middleware/auth');

// GET /api/fds - List all Fixed Deposits with customer info & filters
router.get('/', authenticateToken, (req, res) => {
  const { status, customer_id, search, upcoming_days } = req.query;
  let query = `
    SELECT fd.*, 
           c.full_name as customer_name, 
           c.customer_code, 
           c.phone as customer_phone,
           c.pan_card as customer_pan,
           c.is_senior_citizen
    FROM fixed_deposits fd
    JOIN customers c ON fd.customer_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (status && status !== 'ALL') {
    query += ` AND fd.status = ?`;
    params.push(status);
  }

  if (customer_id) {
    query += ` AND fd.customer_id = ?`;
    params.push(customer_id);
  }

  if (search) {
    query += ` AND (fd.fd_number LIKE ? OR c.full_name LIKE ? OR c.phone LIKE ?)`;
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  if (upcoming_days) {
    query += ` AND fd.status = 'ACTIVE' AND fd.maturity_date <= date('now', '+' || ? || ' days')`;
    params.push(upcoming_days);
  }

  query += ` ORDER BY fd.id DESC`;

  const fds = db.prepare(query).all(...params);
  res.json({ success: true, fds });
});

// GET /api/fds/:id - Full details with schedule
router.get('/:id', authenticateToken, (req, res) => {
  const fd = db.prepare(`
    SELECT fd.*, 
           c.full_name as customer_name, 
           c.customer_code, 
           c.phone as customer_phone,
           c.email as customer_email,
           c.pan_card as customer_pan,
           c.aadhaar_no as customer_aadhaar,
           c.address as customer_address,
           c.bank_name, c.account_no, c.ifsc_code,
           c.nominee_name, c.nominee_relation,
           c.is_senior_citizen
    FROM fixed_deposits fd
    JOIN customers c ON fd.customer_id = c.id
    WHERE fd.id = ?
  `).get(req.params.id);

  if (!fd) {
    return res.status(404).json({ success: false, message: 'Fixed Deposit not found' });
  }

  const schedule = db.prepare('SELECT * FROM fd_schedules WHERE fd_id = ? ORDER BY period_no ASC').all(fd.id);

  // Get company settings for certificate display
  const settingsRows = db.prepare('SELECT key, value FROM settings').all();
  const companySettings = {};
  settingsRows.forEach(r => { companySettings[r.key] = r.value; });

  res.json({ success: true, fd, schedule, companySettings });
});

// POST /api/fds/calculate - Live simulation without booking
router.post('/calculate', (req, res) => {
  const {
    principal,
    annualRate,
    tenureMonths,
    tenureDays,
    compoundingFrequency,
    startDate,
    isSeniorCitizen,
    seniorBonus
  } = req.body;

  const result = calculateFD({
    principal,
    annualRate,
    tenureMonths,
    tenureDays,
    compoundingFrequency,
    startDate,
    isSeniorCitizen,
    seniorBonus
  });

  res.json({ success: true, result });
});

// POST /api/fds - Book a new Fixed Deposit
router.post('/', authenticateToken, (req, res) => {
  const {
    customer_id,
    principal_amount,
    annual_rate,
    tenure_months,
    tenure_days = 0,
    compounding_frequency = 'quarterly',
    start_date = new Date().toISOString().split('T')[0],
    remarks
  } = req.body;

  if (!customer_id || !principal_amount || !annual_rate || !tenure_months) {
    return res.status(400).json({ success: false, message: 'Customer, Principal, Interest Rate, and Tenure are required.' });
  }

  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customer_id);
  if (!customer) {
    return res.status(404).json({ success: false, message: 'Customer not found' });
  }

  // Calculate FD figures
  const calculation = calculateFD({
    principal: principal_amount,
    annualRate: annual_rate,
    tenureMonths: tenure_months,
    tenureDays: tenure_days,
    compoundingFrequency: compounding_frequency,
    startDate: start_date,
    isSeniorCitizen: !!customer.is_senior_citizen
  });

  // Generate unique FD Number: FD-YYYY-XXXX
  const currentYear = new Date().getFullYear();
  const lastFd = db.prepare('SELECT id FROM fixed_deposits ORDER BY id DESC LIMIT 1').get();
  const nextFdSeq = (lastFd ? lastFd.id + 1 : 1);
  const fd_number = `FD-${currentYear}-${String(nextFdSeq).padStart(4, '0')}`;

  const insertStmt = db.prepare(`
    INSERT INTO fixed_deposits (
      fd_number, customer_id, principal_amount, annual_rate, tenure_months, tenure_days,
      compounding_frequency, is_cumulative, payout_amount, total_interest, maturity_amount,
      start_date, maturity_date, status, remarks
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
  `);

  const result = insertStmt.run(
    fd_number,
    customer_id,
    calculation.principal,
    calculation.annualRate,
    calculation.tenureMonths,
    calculation.tenureDays,
    calculation.compoundingFrequency,
    calculation.isCumulative ? 1 : 0,
    calculation.periodicPayout,
    calculation.totalInterest,
    calculation.maturityAmount,
    calculation.startDate,
    calculation.maturityDate,
    remarks || null
  );

  const fdId = result.lastInsertRowid;

  // Insert schedule entries if any
  if (calculation.schedule && calculation.schedule.length > 0) {
    const insertSchedule = db.prepare(`
      INSERT INTO fd_schedules (
        fd_id, period_no, payout_date, payout_amount, interest_accrued, cumulative_interest, balance, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')
    `);

    calculation.schedule.forEach(s => {
      insertSchedule.run(
        fdId,
        s.periodNo,
        s.payoutDate,
        s.payoutAmount,
        s.interestAccrued,
        s.cumulativeInterest,
        s.balance
      );
    });
  }

  const createdFd = db.prepare('SELECT * FROM fixed_deposits WHERE id = ?').get(fdId);
  res.status(201).json({
    success: true,
    message: `Fixed Deposit ${fd_number} booked successfully!`,
    fd: createdFd,
    calculation
  });
});

// POST /api/fds/:id/premature-preview - Preview premature withdrawal calculation
router.post('/:id/premature-preview', authenticateToken, (req, res) => {
  const fd = db.prepare('SELECT * FROM fixed_deposits WHERE id = ?').get(req.params.id);
  if (!fd) return res.status(404).json({ success: false, message: 'FD not found' });
  if (fd.status !== 'ACTIVE') {
    return res.status(400).json({ success: false, message: 'Only ACTIVE FDs can be withdrawn prematurely' });
  }

  const { withdrawalDate = new Date().toISOString().split('T')[0], penaltyRate = 1.0 } = req.body;

  // Check paid interest from schedules for non-cumulative
  const paidInterestRow = db.prepare(`
    SELECT COALESCE(SUM(payout_amount), 0) as paid
    FROM fd_schedules
    WHERE fd_id = ? AND status = 'PAID'
  `).get(fd.id);

  const calculation = calculatePrematureWithdrawal({
    principal: fd.principal_amount,
    annualRate: fd.annual_rate,
    startDate: fd.start_date,
    withdrawalDate,
    penaltyRate: parseFloat(penaltyRate) || 1.0,
    alreadyPaidInterest: paidInterestRow ? paidInterestRow.paid : 0
  });

  res.json({ success: true, preview: calculation });
});

// POST /api/fds/:id/premature-close - Execute premature closure
router.post('/:id/premature-close', authenticateToken, (req, res) => {
  const fd = db.prepare('SELECT * FROM fixed_deposits WHERE id = ?').get(req.params.id);
  if (!fd) return res.status(404).json({ success: false, message: 'FD not found' });
  if (fd.status !== 'ACTIVE') {
    return res.status(400).json({ success: false, message: 'Only ACTIVE FDs can be closed' });
  }

  const { withdrawalDate = new Date().toISOString().split('T')[0], penaltyRate = 1.0, remarks } = req.body;

  const paidInterestRow = db.prepare(`
    SELECT COALESCE(SUM(payout_amount), 0) as paid
    FROM fd_schedules
    WHERE fd_id = ? AND status = 'PAID'
  `).get(fd.id);

  const calculation = calculatePrematureWithdrawal({
    principal: fd.principal_amount,
    annualRate: fd.annual_rate,
    startDate: fd.start_date,
    withdrawalDate,
    penaltyRate: parseFloat(penaltyRate) || 1.0,
    alreadyPaidInterest: paidInterestRow ? paidInterestRow.paid : 0
  });

  db.prepare(`
    UPDATE fixed_deposits SET
      status = 'CLOSED_PREMATURE',
      premature_penalty_rate = ?,
      premature_interest_paid = ?,
      closed_date = ?,
      remarks = COALESCE(remarks || ' | ', '') || ?
    WHERE id = ?
  `).run(
    calculation.penaltyRate,
    calculation.eligibleInterest,
    withdrawalDate,
    remarks || `Prematurely closed on ${withdrawalDate}. Net paid: ₹${calculation.netPayable}`,
    fd.id
  );

  res.json({ success: true, message: 'Fixed Deposit closed prematurely successfully', result: calculation });
});

// POST /api/fds/:id/renew - Renew FD on maturity
router.post('/:id/renew', authenticateToken, (req, res) => {
  const oldFd = db.prepare('SELECT * FROM fixed_deposits WHERE id = ?').get(req.params.id);
  if (!oldFd) return res.status(404).json({ success: false, message: 'FD not found' });

  const {
    renew_type = 'PRINCIPAL_PLUS_INTEREST', // 'PRINCIPAL_ONLY' or 'PRINCIPAL_PLUS_INTEREST'
    new_rate,
    new_tenure_months,
    compounding_frequency
  } = req.body;

  const newPrincipal = (renew_type === 'PRINCIPAL_PLUS_INTEREST') ? oldFd.maturity_amount : oldFd.principal_amount;
  const rate = new_rate || oldFd.annual_rate;
  const tenure = new_tenure_months || oldFd.tenure_months;
  const freq = compounding_frequency || oldFd.compounding_frequency;

  const calculation = calculateFD({
    principal: newPrincipal,
    annualRate: rate,
    tenureMonths: tenure,
    compoundingFrequency: freq,
    startDate: oldFd.maturity_date
  });

  // Mark old FD as RENEWED
  db.prepare(`UPDATE fixed_deposits SET status = 'RENEWED' WHERE id = ?`).run(oldFd.id);

  // Create new FD
  const currentYear = new Date().getFullYear();
  const lastFd = db.prepare('SELECT id FROM fixed_deposits ORDER BY id DESC LIMIT 1').get();
  const nextFdSeq = (lastFd ? lastFd.id + 1 : 1);
  const newFdNumber = `FD-${currentYear}-${String(nextFdSeq).padStart(4, '0')}`;

  const result = db.prepare(`
    INSERT INTO fixed_deposits (
      fd_number, customer_id, principal_amount, annual_rate, tenure_months,
      compounding_frequency, is_cumulative, payout_amount, total_interest, maturity_amount,
      start_date, maturity_date, status, remarks
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
  `).run(
    newFdNumber,
    oldFd.customer_id,
    calculation.principal,
    calculation.annualRate,
    calculation.tenureMonths,
    calculation.compoundingFrequency,
    calculation.isCumulative ? 1 : 0,
    calculation.periodicPayout,
    calculation.totalInterest,
    calculation.maturityAmount,
    calculation.startDate,
    calculation.maturityDate,
    `Renewed from ${oldFd.fd_number}`
  );

  res.status(201).json({
    success: true,
    message: `Renewed successfully! New FD Number: ${newFdNumber}`,
    newFdId: result.lastInsertRowid
  });
});

// POST /api/fds/schedule/:scheduleId/mark-paid
router.post('/schedule/:scheduleId/mark-paid', authenticateToken, (req, res) => {
  const { payment_reference = 'BANK-TRF-' + Date.now(), paid_date = new Date().toISOString().split('T')[0] } = req.body;

  db.prepare(`
    UPDATE fd_schedules SET
      status = 'PAID',
      paid_date = ?,
      payment_reference = ?
    WHERE id = ?
  `).run(paid_date, payment_reference, req.params.scheduleId);

  res.json({ success: true, message: 'Interest payout recorded as PAID' });
});

module.exports = router;
