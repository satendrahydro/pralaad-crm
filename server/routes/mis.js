const express = require('express');
const router = express.Router();
const db = require('../db');
const { calculateMIS, calculateMISPrematureClosure } = require('../calculator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

// GET /api/mis - List Monthly Income Scheme accounts
router.get('/', authenticateToken, (req, res) => {
  try {
    const { status, search, customer_id } = req.query;
    let query = `
      SELECT m.*, c.full_name as customer_name, c.phone as customer_phone, c.customer_code
      FROM mis_accounts m
      JOIN customers c ON m.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'ALL') {
      query += ` AND m.status = ?`;
      params.push(status);
    }
    if (customer_id) {
      query += ` AND m.customer_id = ?`;
      params.push(customer_id);
    }
    if (search) {
      query += ` AND (m.mis_number LIKE ? OR c.full_name LIKE ? OR c.phone LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    query += ` ORDER BY m.id DESC`;
    const accounts = db.prepare(query).all(...params);
    res.json({ success: true, accounts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/mis/:id/schedules - Payout schedules for single MIS account
router.get('/:id/schedules', authenticateToken, (req, res) => {
  try {
    const schedules = db.prepare(`
      SELECT * FROM mis_payout_schedules
      WHERE mis_id = ?
      ORDER BY month_no ASC
    `).all(req.params.id);
    res.json({ success: true, schedules });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/mis/:id - Details of single MIS account with payout schedule
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const mis = db.prepare(`
      SELECT m.*, c.full_name as customer_name, c.phone as customer_phone, c.email as customer_email,
             c.pan_card as customer_pan, c.customer_code, c.address as customer_address,
             c.bank_name, c.account_no, c.ifsc_code
      FROM mis_accounts m
      JOIN customers c ON m.customer_id = c.id
      WHERE m.id = ?
    `).get(req.params.id);

    if (!mis) {
      return res.status(404).json({ success: false, message: 'MIS account not found' });
    }

    const schedules = db.prepare(`
      SELECT * FROM mis_payout_schedules
      WHERE mis_id = ?
      ORDER BY month_no ASC
    `).all(req.params.id);

    res.json({
      success: true,
      mis,
      schedules
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/mis - Propose or Open New MIS (requires mis_creation)
router.post('/', authenticateToken, requirePermission('mis_creation'), (req, res) => {
  try {
    const {
      customer_id,
      deposit_amount,
      annual_rate,
      tenure_months = 60,
      start_date,
      payout_account_no,
      payout_bank_ifsc,
      remarks
    } = req.body;

    if (!customer_id || !deposit_amount || !annual_rate) {
      return res.status(400).json({ success: false, message: 'Missing required MIS parameters' });
    }

    if (parseFloat(deposit_amount) <= 0 || parseFloat(annual_rate) <= 0 || parseInt(tenure_months) <= 0) {
      return res.status(400).json({ success: false, message: 'Deposit amount, annual rate, and tenure must be positive numbers' });
    }

    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customer_id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const calc = calculateMIS({
      depositAmount: deposit_amount,
      annualRate: annual_rate,
      tenureMonths: tenure_months,
      startDate: start_date || new Date().toISOString().split('T')[0],
      isSeniorCitizen: customer.is_senior_citizen === 1
    });

    const isEmployee = req.user.role === 'employee';

    if (isEmployee) {
      const reqNumber = `REQ-MIS-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
      const insReq = db.prepare(`
        INSERT INTO approval_requests (
          request_number, request_type, maker_id, customer_id, proposed_amount, request_data, status, decision_remarks
        ) VALUES (?, 'NEW_MIS', ?, ?, ?, ?, 'PENDING_APPROVAL', ?)
      `).run(
        reqNumber,
        req.user.id,
        customer_id,
        parseFloat(deposit_amount),
        JSON.stringify({
          customerId: customer_id,
          depositAmount: parseFloat(deposit_amount),
          annualRate: calc.annualRate,
          tenureMonths: parseInt(tenure_months),
          monthlyPayout: calc.monthlyPayout,
          totalPayoutAmount: calc.totalPayoutAmount,
          startDate: calc.startDate,
          maturityDate: calc.maturityDate,
          payoutAccountNo: payout_account_no || customer.account_no,
          payoutBankIfsc: payout_bank_ifsc || customer.ifsc_code,
          remarks: remarks || 'MIS proposed by staff'
        }),
        remarks || 'New MIS booking awaiting Checker authorization'
      );

      return res.status(201).json({
        success: true,
        makerApprovalRequired: true,
        requestId: insReq.lastInsertRowid,
        message: 'MIS proposal submitted successfully. Pending Admin Checker authorization.'
      });
    }

    // Direct Admin Execution
    const countRow = db.prepare("SELECT count(*) as count FROM mis_accounts").get();
    const misNumber = `MIS-${new Date().getFullYear()}-${String(countRow.count + 1).padStart(3, '0')}`;

    const insMis = db.prepare(`
      INSERT INTO mis_accounts (
        mis_number, customer_id, branch_id, deposit_amount, annual_rate,
        tenure_months, monthly_payout, total_payout_amount, start_date,
        maturity_date, payout_account_no, payout_bank_ifsc, status, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
    `).run(
      misNumber, customer_id, customer.branch_id || null, parseFloat(deposit_amount),
      calc.annualRate, parseInt(tenure_months), calc.monthlyPayout, calc.totalPayoutAmount,
      calc.startDate, calc.maturityDate, payout_account_no || customer.account_no,
      payout_bank_ifsc || customer.ifsc_code, remarks || 'MIS Booked'
    );

    const misId = insMis.lastInsertRowid;
    const schedInsert = db.prepare(`
      INSERT INTO mis_payout_schedules (
        mis_id, month_no, payout_date, payout_amount, tds_deducted,
        net_payable, status
      ) VALUES (?, ?, ?, ?, 0, ?, 'PENDING')
    `);

    calc.schedule.forEach(s => {
      schedInsert.run(misId, s.monthNo, s.payoutDate, s.payoutAmount, s.netPayable);
    });

    res.status(201).json({
      success: true,
      misId,
      misNumber,
      message: 'Monthly Income Scheme activated successfully'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/mis/:id/payouts/:schedId/pay - Disburse Monthly Payout
router.post('/:id/payouts/:schedId/pay', authenticateToken, (req, res) => {
  try {
    const { id, schedId } = req.params;
    const { payment_reference = 'NEFT-' + Date.now() } = req.body;

    const mis = db.prepare('SELECT * FROM mis_accounts WHERE id = ?').get(id);
    if (!mis) return res.status(404).json({ success: false, message: 'MIS account not found' });

    const sched = db.prepare('SELECT * FROM mis_payout_schedules WHERE id = ? AND mis_id = ?').get(schedId, id);
    if (!sched) return res.status(404).json({ success: false, message: 'Payout schedule not found' });
    if (sched.status === 'PAID') {
      return res.status(400).json({ success: false, message: 'Payout already marked as paid' });
    }

    const isEmployee = req.user.role === 'employee';

    if (isEmployee) {
      const reqNumber = `REQ-MISPAY-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
      const insReq = db.prepare(`
        INSERT INTO approval_requests (
          request_number, request_type, maker_id, customer_id, proposed_amount, request_data, status, decision_remarks
        ) VALUES (?, 'MIS_PAYOUT', ?, ?, ?, ?, 'PENDING_APPROVAL', ?)
      `).run(
        reqNumber,
        req.user.id,
        mis.customer_id,
        sched.net_payable,
        JSON.stringify({
          misId: parseInt(id),
          scheduleId: parseInt(schedId),
          monthNo: sched.month_no,
          payoutAmount: sched.payout_amount,
          netPayable: sched.net_payable,
          paymentReference: payment_reference
        }),
        `MIS Month #${sched.month_no} payout proposed`
      );

      return res.status(201).json({
        success: true,
        makerApprovalRequired: true,
        requestId: insReq.lastInsertRowid,
        message: 'MIS payout proposed for Admin Checker authorization.'
      });
    }

    // Direct Admin Execution
    const today = new Date().toISOString().split('T')[0];
    db.prepare(`
      UPDATE mis_payout_schedules
      SET status = 'PAID', paid_date = ?, payment_reference = ?
      WHERE id = ?
    `).run(today, payment_reference, schedId);

    res.json({ success: true, message: 'MIS payout marked as paid successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
