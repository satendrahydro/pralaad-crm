const express = require('express');
const router = express.Router();
const db = require('../db');
const { calculateRD, calculateRDPrematureClosure } = require('../calculator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

// GET /api/rd - List Recurring Deposits with filters
router.get('/', authenticateToken, (req, res) => {
  try {
    const { status, search, customer_id } = req.query;
    let query = `
      SELECT r.*, c.full_name as customer_name, c.phone as customer_phone, c.customer_code
      FROM recurring_deposits r
      JOIN customers c ON r.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'ALL') {
      query += ` AND r.status = ?`;
      params.push(status);
    }
    if (customer_id) {
      query += ` AND r.customer_id = ?`;
      params.push(customer_id);
    }
    if (search) {
      query += ` AND (r.rd_number LIKE ? OR c.full_name LIKE ? OR c.phone LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    query += ` ORDER BY r.id DESC`;
    const rds = db.prepare(query).all(...params);
    res.json({ success: true, rds });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/rd/:id/installments - Get list of installments for an RD
router.get('/:id/installments', authenticateToken, (req, res) => {
  try {
    const installments = db.prepare(`
      SELECT * FROM rd_installments
      WHERE rd_id = ?
      ORDER BY installment_no ASC
    `).all(req.params.id);
    res.json({ success: true, installments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/rd/:id - Details of single RD with installments schedule
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const rd = db.prepare(`
      SELECT r.*, c.full_name as customer_name, c.phone as customer_phone, c.email as customer_email,
             c.pan_card as customer_pan, c.customer_code, c.address as customer_address,
             c.bank_name, c.account_no, c.ifsc_code
      FROM recurring_deposits r
      JOIN customers c ON r.customer_id = c.id
      WHERE r.id = ?
    `).get(req.params.id);

    if (!rd) {
      return res.status(404).json({ success: false, message: 'Recurring deposit not found' });
    }

    const installments = db.prepare(`
      SELECT * FROM rd_installments
      WHERE rd_id = ?
      ORDER BY installment_no ASC
    `).all(req.params.id);

    res.json({
      success: true,
      rd,
      installments
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/rd - Propose or Create New RD (requires rd_creation)
router.post('/', authenticateToken, requirePermission('rd_creation'), (req, res) => {
  try {
    const {
      customer_id,
      monthly_installment,
      annual_rate,
      tenure_months,
      start_date,
      remarks
    } = req.body;

    if (!customer_id || !monthly_installment || !annual_rate || !tenure_months) {
      return res.status(400).json({ success: false, message: 'Missing required RD parameters' });
    }

    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customer_id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const calc = calculateRD({
      installmentAmount: monthly_installment,
      annualRate: annual_rate,
      tenureMonths: tenure_months,
      startDate: start_date || new Date().toISOString().split('T')[0],
      isSeniorCitizen: customer.is_senior_citizen === 1
    });

    const isEmployee = req.user.role === 'employee';

    // Maker-Checker: Employee must submit as approval request
    if (isEmployee) {
      const reqNumber = `REQ-RD-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
      const insReq = db.prepare(`
        INSERT INTO approval_requests (
          request_number, request_type, maker_id, customer_id, proposed_amount, request_data, status, decision_remarks
        ) VALUES (?, 'NEW_RD', ?, ?, ?, ?, 'PENDING_APPROVAL', ?)
      `).run(
        reqNumber,
        req.user.id,
        customer_id,
        calc.totalPrincipal,
        JSON.stringify({
          customerId: customer_id,
          monthlyInstallment: parseFloat(monthly_installment),
          annualRate: calc.annualRate,
          tenureMonths: parseInt(tenure_months),
          startDate: calc.startDate,
          maturityDate: calc.maturityDate,
          totalPrincipal: calc.totalPrincipal,
          totalInterest: calc.totalInterest,
          maturityAmount: calc.maturityAmount,
          remarks: remarks || 'RD booking submitted by staff'
        }),
        remarks || 'New RD entry awaiting Checker approval'
      );

      return res.status(201).json({
        success: true,
        makerApprovalRequired: true,
        requestId: insReq.lastInsertRowid,
        message: 'RD proposal submitted successfully. Pending Admin Checker authorization.'
      });
    }

    // Direct Admin Execution
    const countRow = db.prepare("SELECT count(*) as count FROM recurring_deposits").get();
    const rdNumber = `RD-${new Date().getFullYear()}-${String(countRow.count + 1).padStart(3, '0')}`;

    const insRd = db.prepare(`
      INSERT INTO recurring_deposits (
        rd_number, customer_id, branch_id, monthly_installment, annual_rate,
        tenure_months, start_date, maturity_date, total_principal, total_interest,
        maturity_amount, installments_paid, amount_deposited, status, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 'ACTIVE', ?)
    `).run(
      rdNumber, customer_id, customer.branch_id || null, parseFloat(monthly_installment),
      calc.annualRate, parseInt(tenure_months), calc.startDate, calc.maturityDate,
      calc.totalPrincipal, calc.totalInterest, calc.maturityAmount, remarks || 'RD Booked'
    );

    const rdId = insRd.lastInsertRowid;
    const instInsert = db.prepare(`
      INSERT INTO rd_installments (
        rd_id, installment_no, due_date, installment_amount, status
      ) VALUES (?, ?, ?, ?, 'PENDING')
    `);

    calc.schedule.forEach(s => {
      instInsert.run(rdId, s.installmentNo, s.dueDate, s.installmentAmount);
    });

    res.status(201).json({
      success: true,
      rdId,
      rdNumber,
      message: 'Recurring Deposit activated successfully'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/rd/:id/collect-installment - Direct alias for collecting installment by installment_id in body
router.post('/:id/collect-installment', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { installment_id, amount, payment_mode = 'CASH', reference_number, late_fee = 0 } = req.body;

    if (!installment_id) {
      return res.status(400).json({ success: false, message: 'installment_id is required' });
    }
    if (amount !== undefined && parseFloat(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Installment amount must be greater than zero' });
    }

    const rd = db.prepare('SELECT * FROM recurring_deposits WHERE id = ?').get(id);
    if (!rd) return res.status(404).json({ success: false, message: 'RD not found' });

    const inst = db.prepare('SELECT * FROM rd_installments WHERE id = ? AND rd_id = ?').get(installment_id, id);
    if (!inst) return res.status(404).json({ success: false, message: 'Installment not found' });
    if (inst.status === 'COLLECTED' || inst.status === 'PAID') {
      return res.status(400).json({ success: false, message: 'Installment already collected' });
    }

    const isEmployee = req.user.role === 'employee';
    const totalAmount = parseFloat(amount || inst.installment_amount) + parseFloat(late_fee || 0);

    if (isEmployee) {
      const reqNumber = `REQ-COLL-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
      const insReq = db.prepare(`
        INSERT INTO approval_requests (
          request_number, request_type, maker_id, customer_id, proposed_amount, request_data, status, decision_remarks
        ) VALUES (?, 'RD_INSTALLMENT', ?, ?, ?, ?, 'PENDING_APPROVAL', ?)
      `).run(
        reqNumber,
        req.user.id,
        rd.customer_id,
        totalAmount,
        JSON.stringify({
          rdId: parseInt(id),
          installmentId: parseInt(installment_id),
          installmentNo: inst.installment_no,
          installmentAmount: inst.installment_amount,
          lateFee: parseFloat(late_fee || 0),
          totalAmount: totalAmount,
          paymentMode: payment_mode,
          transactionRef: reference_number || `COLL-RD-${Date.now()}`,
          paid_date: req.body.paid_date || req.body.collection_date || new Date().toISOString().split('T')[0]
        }),
        `RD Installment #${inst.installment_no} collection submitted`
      );

      return res.status(200).json({
        success: true,
        makerApprovalRequired: true,
        requestId: insReq.lastInsertRowid,
        message: 'RD installment collection submitted for Admin approval.'
      });
    }

    const today = new Date().toISOString().split('T')[0];
    const effectivePaidDate = req.body.paid_date || req.body.collection_date || today;
    if (effectivePaidDate > today) {
      return res.status(400).json({ 
        success: false, 
        message: 'Collection date cannot be in the future. Deposit must be recorded on or before today.' 
      });
    }
    db.prepare(`
      UPDATE rd_installments
      SET status = 'COLLECTED', paid_date = ?, late_fee = ?, total_collected = ?,
          payment_mode = ?, transaction_ref = ?, collector_user_id = ?
      WHERE id = ?
    `).run(effectivePaidDate, parseFloat(late_fee || 0), totalAmount, payment_mode, reference_number || `COLL-RD-${Date.now()}`, req.user.id, installment_id);

    db.prepare(`
      UPDATE recurring_deposits
      SET installments_paid = installments_paid + 1,
          amount_deposited = amount_deposited + ?,
          total_late_fees = total_late_fees + ?
      WHERE id = ?
    `).run(inst.installment_amount, parseFloat(late_fee || 0), id);

    res.json({ success: true, message: 'Installment collected successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/rd/:id/installments/:instId/collect - Collect RD Installment
router.post('/:id/installments/:instId/collect', authenticateToken, (req, res) => {
  try {
    const { id, instId } = req.params;
    const { payment_mode = 'CASH', transaction_ref, late_fee = 0 } = req.body;

    const rd = db.prepare('SELECT * FROM recurring_deposits WHERE id = ?').get(id);
    if (!rd) return res.status(404).json({ success: false, message: 'RD not found' });

    const inst = db.prepare('SELECT * FROM rd_installments WHERE id = ? AND rd_id = ?').get(instId, id);
    if (!inst) return res.status(404).json({ success: false, message: 'Installment not found' });
    if (inst.status === 'COLLECTED' || inst.status === 'PAID') {
      return res.status(400).json({ success: false, message: 'Installment already collected' });
    }

    const isEmployee = req.user.role === 'employee';
    const amount = inst.installment_amount + parseFloat(late_fee || 0);

    if (isEmployee) {
      const reqNumber = `REQ-COLL-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
      const insReq = db.prepare(`
        INSERT INTO approval_requests (
          request_number, request_type, maker_id, customer_id, proposed_amount, request_data, status, decision_remarks
        ) VALUES (?, 'RD_INSTALLMENT', ?, ?, ?, ?, 'PENDING_APPROVAL', ?)
      `).run(
        reqNumber,
        req.user.id,
        rd.customer_id,
        amount,
        JSON.stringify({
          rdId: parseInt(id),
          installmentId: parseInt(instId),
          installmentNo: inst.installment_no,
          installmentAmount: inst.installment_amount,
          lateFee: parseFloat(late_fee || 0),
          totalAmount: amount,
          paymentMode: payment_mode,
          transactionRef: transaction_ref || `COLL-RD-${Date.now()}`,
          paid_date: req.body.paid_date || req.body.collection_date || new Date().toISOString().split('T')[0]
        }),
        `RD Installment #${inst.installment_no} collection submitted`
      );

      return res.status(201).json({
        success: true,
        makerApprovalRequired: true,
        requestId: insReq.lastInsertRowid,
        message: 'RD installment collection submitted for Admin approval.'
      });
    }

    // Direct Admin Execution
    const today = new Date().toISOString().split('T')[0];
    const effectivePaidDate = req.body.paid_date || req.body.collection_date || today;
    if (effectivePaidDate > today) {
      return res.status(400).json({ 
        success: false, 
        message: 'Collection date cannot be in the future. Deposit must be recorded on or before today.' 
      });
    }
    db.prepare(`
      UPDATE rd_installments
      SET status = 'COLLECTED', paid_date = ?, late_fee = ?, total_collected = ?,
          payment_mode = ?, transaction_ref = ?, collector_user_id = ?
      WHERE id = ?
    `).run(effectivePaidDate, parseFloat(late_fee || 0), amount, payment_mode, transaction_ref || `COLL-RD-${Date.now()}`, req.user.id, instId);

    db.prepare(`
      UPDATE recurring_deposits
      SET installments_paid = installments_paid + 1,
          amount_deposited = amount_deposited + ?,
          total_late_fees = total_late_fees + ?
      WHERE id = ?
    `).run(inst.installment_amount, parseFloat(late_fee || 0), id);

    res.json({ success: true, message: 'Installment collected successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/rd/:id/close - Premature / Normal Close RD
router.post('/:id/close', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;
    const rd = db.prepare('SELECT * FROM recurring_deposits WHERE id = ?').get(id);
    if (!rd) return res.status(404).json({ success: false, message: 'RD not found' });
    if (rd.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, message: 'Only active RDs can be closed' });
    }

    const today = new Date().toISOString().split('T')[0];
    db.prepare(`
      UPDATE recurring_deposits
      SET status = 'CLOSED_PREMATURE',
          premature_closed_date = ?,
          remarks = ?
      WHERE id = ?
    `).run(today, remarks || `Closed prematurely on ${today}`, id);

    // Cancel remaining pending installments
    db.prepare(`
      UPDATE rd_installments
      SET status = 'CANCELLED'
      WHERE rd_id = ? AND status = 'PENDING'
    `).run(id);

    res.json({ success: true, message: 'Recurring Deposit closed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
